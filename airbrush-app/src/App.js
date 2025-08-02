import React, { useRef, useEffect, useState, useCallback } from 'react';
import WebcamComponent from './components/Webcam';
import CanvasComponent from './components/Canvas';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [lastPoint, setLastPoint] = useState(null);
  const [currentHandPoint, setCurrentHandPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawnSegments, setDrawnSegments] = useState([]);

  const drawingRef = useRef(drawing);
  const lastPointRef = useRef(lastPoint);
  const currentHandPointRef = useRef(currentHandPoint);
  const currentColorRef = useRef(currentColor);
  const drawnSegmentsRef = useRef(drawnSegments);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    lastPointRef.current = lastPoint;
  }, [lastPoint]);

  useEffect(() => {
    currentHandPointRef.current = currentHandPoint;
  }, [currentHandPoint]);

  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    drawnSegmentsRef.current = drawnSegments;
  }, [drawnSegments]);


  // MediaPipe Hands에서 결과가 나올 때마다 호출되는 함수
  const onResults = useCallback((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0]; // 첫 번째 손만 사용
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];

      // 캔버스 크기에 맞게 좌표 스케일링 (CanvasComponent의 고정된 크기 640x480 사용)
      const canvasWidth = 640;
      const canvasHeight = 480;

      const canvasX_index = indexTip.x * canvasWidth;
      const canvasY_index = indexTip.y * canvasHeight;

      const canvasX_thumb = thumbTip.x * canvasWidth;
      const canvasY_thumb = thumbTip.y * canvasHeight;

      // 핀치 감지: 엄지와 검지 손가락 끝 사이의 거리 계산
      const distance = Math.sqrt(
        Math.pow(canvasX_index - canvasX_thumb, 2) +
        Math.pow(canvasY_index - canvasY_thumb, 2)
      );

      const pinchThreshold = 30; // 핀치 감지 임계값 (테스트 해보면서 조정할거임)

      const newCurrentHandPoint = { x: canvasX_index, y: canvasY_index };
      setCurrentHandPoint(newCurrentHandPoint); // 손이 감지되면 항상 포인터 위치 업데이트

      if (distance < pinchThreshold) { // 핀치 감지돰
        if (!drawingRef.current) { // 그리기 시작
          setDrawing(true);
          setLastPoint(newCurrentHandPoint);
        } else {
          if (lastPointRef.current) { // lastPoint가 유효한 경우에만
            setDrawnSegments(prevSegments => [
              ...prevSegments,
              {
                p1: lastPointRef.current,
                p2: newCurrentHandPoint,
                color: currentColorRef.current
              }
            ]);
          }
          setLastPoint(newCurrentHandPoint); // lastPoint를 현재 점으로 업데이트
        }
      } else {
        // 그리기 중지
        if (drawingRef.current) {
          setDrawing(false);
          setLastPoint(null);
        }
      }
    } else {
      if (drawingRef.current) {
        setDrawing(false);
      }
      setLastPoint(null);
      setCurrentHandPoint(null);
    }
  }, []);

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
        width: 640,
        height: 480,
      });
      camera.start();
      setLoading(false);
    }

    return () => {
      hands.close();
    };
  }, [onResults]);

  // 캔버스를 지우는 함수
  const handleClearCanvas = () => {
    // CanvasComponent의 clearCanvas 함수 호출
    if (canvasRef.current && canvasRef.current.clearCanvas) {
      canvasRef.current.clearCanvas();
    }
    setLastPoint(null); // 마지막 지점 초기화
    setDrawing(false); // 드로잉 상태 초기화
    setCurrentHandPoint(null); // 현재 손 위치도 초기화
    setDrawnSegments([]); // 그려진 모든 선 세그먼트들도 지우
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <style>
        {` @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); body { font-family: 'Inter', sans-serif; } `}
      </style>
      <h1 className="text-4xl font-bold text-gray-800 mb-6 rounded-lg p-2 bg-white shadow-md">
        AirBrush
      </h1>
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 text-white text-lg z-10 rounded-lg">
            웹캠 로딩 중... 카메라 접근을 허용해주세요.
          </div>
        )}
        <WebcamComponent ref={webcamRef} />
        <CanvasComponent
          ref={canvasRef}
          drawing={drawing}
          lastPoint={lastPoint}
          currentColor={currentColor}
          currentHandPoint={currentHandPoint} // 현재 손 위치 전달
          webcamVideo={webcamRef.current ? webcamRef.current.video : null} // 웹캠 비디오 전달
          drawnSegments={drawnSegments} // 그려진 선 세그먼트들 전달
        />
      </div>

      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-6">
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="colorPicker" className="text-gray-700 font-semibold">
            color:
          </label>
          <input
            type="color"
            id="colorPicker"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-10 h-10 border-none rounded-md cursor-pointer"
          />
        </div>
        <button
          onClick={handleClearCanvas}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          clear
        </button>
      </div>
    </div>
  );
}

export default App;
