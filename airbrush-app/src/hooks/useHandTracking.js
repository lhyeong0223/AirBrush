import { useRef, useEffect, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

/**
  @returns {{
    webcamRef: React.RefObject<HTMLVideoElement>,
    currentHandPoint: {x: number, y: number} | null,
    drawing: boolean,
    lastPoint: {x: number, y: number} | null,
    drawnSegments: Array<{p1: {x: number, y: number}, p2: {x: number, y: number}, color: string}>,
    setDrawnSegments: React.Dispatch<React.SetStateAction<Array<{p1: {x: number, y: number}, p2: {x: number, y: number}, color: string}>>>,
    loading: boolean,
    currentColor: string // 현재 그리기 색상 (App.jsx에서 설정)
  }}
 */
const useHandTracking = (initialColor, logicalWidth = 640, logicalHeight = 480) => {
  const webcamRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [currentHandPoint, setCurrentHandPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawnSegments, setDrawnSegments] = useState([]);
  const [currentColor, setCurrentColor] = useState(initialColor); // App.jsx에서 초기 색상 가져옴
  // 브러시 옵션: 굵기, 끝 모양, 패턴(대시)
  const [currentWidth, setCurrentWidth] = useState(5);
  const [currentCap, setCurrentCap] = useState('round'); // 'round' | 'butt' | 'square'
  const [currentDash, setCurrentDash] = useState([]); // 예: [] | [10,6]
  const [currentAlpha, setCurrentAlpha] = useState(1.0); // 투명도 (0~1)
  const [currentComposite, setCurrentComposite] = useState('source-over'); // 합성 모드

  const drawingRef = useRef(drawing);
  const lastPointRef = useRef(lastPoint);
  const currentHandPointRef = useRef(currentHandPoint);
  const currentColorRef = useRef(currentColor);
  const drawnSegmentsRef = useRef(drawnSegments);
  const currentWidthRef = useRef(currentWidth);
  const currentCapRef = useRef(currentCap);
  const currentDashRef = useRef(currentDash);
  const currentAlphaRef = useRef(currentAlpha);
  const currentCompositeRef = useRef(currentComposite);
  const logicalWidthRef = useRef(logicalWidth);
  const logicalHeightRef = useRef(logicalHeight);
  // 핀치 안정화를 위한 좌표 평활화(EMA)용 저장소 (정규화 좌표 0~1)
  const smoothIndexRef = useRef({ x: null, y: null });
  const smoothThumbRef = useRef({ x: null, y: null });

  // 상태가 변경될 때마다 useRef 값을 업데이트
  useEffect(() => { drawingRef.current = drawing; }, [drawing]);
  useEffect(() => { lastPointRef.current = lastPoint; }, [lastPoint]);
  useEffect(() => { currentHandPointRef.current = currentHandPoint; }, [currentHandPoint]);
  useEffect(() => { currentColorRef.current = currentColor; }, [currentColor]);
  useEffect(() => { drawnSegmentsRef.current = drawnSegments; }, [drawnSegments]);
  useEffect(() => { currentWidthRef.current = currentWidth; }, [currentWidth]);
  useEffect(() => { currentCapRef.current = currentCap; }, [currentCap]);
  useEffect(() => { currentDashRef.current = currentDash; }, [currentDash]);
  useEffect(() => { currentAlphaRef.current = currentAlpha; }, [currentAlpha]);
  useEffect(() => { currentCompositeRef.current = currentComposite; }, [currentComposite]);
  useEffect(() => { logicalWidthRef.current = logicalWidth; }, [logicalWidth]);
  useEffect(() => { logicalHeightRef.current = logicalHeight; }, [logicalHeight]);


  // MediaPipe Hands에서 결과가 나올 때마다 호출되는 함수
  const onResults = useCallback((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]; // 첫 번째 손만 사용
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      // 정규화 좌표(0~1) 기반으로 EMA 평활화
      const rawIx = indexTip.x, rawIy = indexTip.y;
      const rawTx = thumbTip.x, rawTy = thumbTip.y;
      const EMA_KEEP = 0.6; // 이전값 가중치 (0.0~1.0), 높을수록 더 부드럽게
      const EMA_APPLY = 1 - EMA_KEEP;

      const prevI = smoothIndexRef.current;
      const prevT = smoothThumbRef.current;
      const smIx = (prevI.x === null) ? rawIx : (prevI.x * EMA_KEEP + rawIx * EMA_APPLY);
      const smIy = (prevI.y === null) ? rawIy : (prevI.y * EMA_KEEP + rawIy * EMA_APPLY);
      const smTx = (prevT.x === null) ? rawTx : (prevT.x * EMA_KEEP + rawTx * EMA_APPLY);
      const smTy = (prevT.y === null) ? rawTy : (prevT.y * EMA_KEEP + rawTy * EMA_APPLY);
      smoothIndexRef.current = { x: smIx, y: smIy };
      smoothThumbRef.current = { x: smTx, y: smTy };

      // 해상도 독립적인 정규화 거리 (0~1 범위)
      const normDist = Math.hypot(smIx - smTx, smIy - smTy);
      // 히스테리시스: on/off 임계값 분리로 토글 안정화
      const PINCH_ON = 0.09;  // 약 화면의 5%
      const PINCH_OFF = 0.11; // 해제는 조금 더 널널하게
      const threshold = drawingRef.current ? PINCH_OFF : PINCH_ON;

      // 캔버스 크기에 맞게 좌표 스케일링 (논리 캔버스 크기 사용) + 미러링
      const canvasWidth = logicalWidthRef.current;
      const canvasHeight = logicalHeightRef.current;
      const canvasX_index = smIx * canvasWidth;
      const canvasY_index = smIy * canvasHeight;
      const mirroredX_index = canvasWidth - canvasX_index;

      // 표시/그리기는 미러링된 좌표 사용 (Y는 미러링하지 않음)
      const newCurrentHandPoint = { x: mirroredX_index, y: canvasY_index };
      setCurrentHandPoint(newCurrentHandPoint); // 손이 감지되면 항상 포인터 위치 업데이트

      if (normDist < threshold) { // 핀치 감지됨 (정규화 임계값 기반)
        if (!drawingRef.current) { // 그리기 시작
          setDrawing(true);
          setLastPoint(newCurrentHandPoint);
        } else { // 그리기 계속
          if (lastPointRef.current) {
            setDrawnSegments(prevSegments => [
              ...prevSegments,
              {
                p1: lastPointRef.current, // 이미 미러링된 좌표
                p2: newCurrentHandPoint,  // 이미 미러링된 좌표
                color: currentColorRef.current,
                width: currentWidthRef.current,
                cap: currentCapRef.current,
                dash: currentDashRef.current,
                alpha: currentAlphaRef.current,
                composite: currentCompositeRef.current
              }
            ]);
          }
          setLastPoint(newCurrentHandPoint);
        }
      } else { // 핀치 아님
        if (drawingRef.current) {
          setDrawing(false);
          setLastPoint(null);
        }
      }
    } else {
      // 손이 감지되지 않으면 그리기 및 포인터 표시 모두 중지
      if (drawingRef.current) {
        setDrawing(false);
      }
      setLastPoint(null);
      setCurrentHandPoint(null);
    }
  }, []); // onResults는 이제 어떤 React 상태에도 직접 의존하지 않으므로 빈 의존성 배열을 가집니다.

  // MediaPipe Hands 모델 초기화 및 웹캠 스트림 설정
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);

    // 웹캠 스트림을 MediaPipe Hands 모델로 전송
    if (webcamRef.current) {
      const camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await hands.send({ image: webcamRef.current.video });
          }
        },
        width: logicalWidthRef.current,
        height: logicalHeightRef.current,
      });
      camera.start();
      setLoading(false);
    }

    return () => {
      hands.close();
    };
  }, [onResults, logicalWidth, logicalHeight]);

  return {
    webcamRef,
    currentHandPoint,
    drawing,
    lastPoint,
    drawnSegments,
    setDrawnSegments,
    loading,
    currentColor,
    setCurrentColor, // App.jsx에서 색상 변경을 위해 노출
    currentWidth,
    setCurrentWidth,
    currentCap,
    setCurrentCap,
    currentDash,
    setCurrentDash,
    currentAlpha,
    setCurrentAlpha,
    currentComposite,
    setCurrentComposite
  };
};

export default useHandTracking;
