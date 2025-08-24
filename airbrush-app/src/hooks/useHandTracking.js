import { useRef, useEffect, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

const useHandTracking = (initialColor, logicalWidth = 640, logicalHeight = 480, canvasRef) => {
  const webcamRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [currentHandPoint, setCurrentHandPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawnSegments, setDrawnSegments] = useState([]);
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [currentWidth, setCurrentWidth] = useState(5);
  const [currentCap, setCurrentCap] = useState('round');
  const [currentDash, setCurrentDash] = useState([]);
  const [currentAlpha, setCurrentAlpha] = useState(1.0);
  const [currentComposite, setCurrentComposite] = useState('source-over');
  const [brushCycleTrigger, setBrushCycleTrigger] = useState(0);

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
  const smoothIndexRef = useRef({ x: null, y: null });
  const smoothThumbRef = useRef({ x: null, y: null });
  const fistClosedCountRef = useRef(0);
  const pinchClosedCountRef = useRef(0);
  const gestureStateRef = useRef('open');

  // Sync states with refs
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

  const drawLine = useCallback((ctx, p1, p2, color, width = 5, cap = 'round', dash = [], alpha = 1.0, composite = 'source-over') => {
    ctx.beginPath();
    ctx.setLineDash(Array.isArray(dash) ? dash : []);
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.strokeStyle = color;
    const prevAlpha = ctx.globalAlpha;
    const prevComposite = ctx.globalCompositeOperation;
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = composite;
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevComposite;
  }, []);

  // 간단화된 주먹 판정: tip이 pip보다 아래쪽인지 확인
  const isFist = (landmarks) => {
    const fingerPairs = [
      [8, 6],   // index tip vs pip
      [12, 10], // middle
      [16, 14], // ring
      [20, 18], // pinky
    ];
    let foldedCount = 0;
    for (const [tip, pip] of fingerPairs) {
      if (landmarks[tip].y > landmarks[pip].y) foldedCount++;
    }
    return foldedCount >= 3;
  };

  const onResults = useCallback((results) => {
    const canvasWidth = logicalWidthRef.current;
    const canvasHeight = logicalHeightRef.current;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      const rawIx = indexTip.x, rawIy = indexTip.y;
      const rawTx = thumbTip.x, rawTy = thumbTip.y;

      // EMA smoothing
      const EMA_KEEP = 0.7;
      const EMA_APPLY = 1 - EMA_KEEP;
      const prevI = smoothIndexRef.current;
      const prevT = smoothThumbRef.current;
      const smIx = (prevI.x === null) ? rawIx : (prevI.x * EMA_KEEP + rawIx * EMA_APPLY);
      const smIy = (prevI.y === null) ? rawIy : (prevI.y * EMA_KEEP + rawIy * EMA_APPLY);
      const smTx = (prevT.x === null) ? rawTx : (prevT.x * EMA_KEEP + rawTx * EMA_APPLY);
      const smTy = (prevT.y === null) ? rawTy : (prevT.y * EMA_KEEP + rawTy * EMA_APPLY);
      smoothIndexRef.current = { x: smIx, y: smIy };
      smoothThumbRef.current = { x: smTx, y: smTy };

      const normDist = Math.hypot(smIx - smTx, smIy - smTy);
      const PINCH_ON = 0.05;
      const PINCH_OFF = 0.07;
      const threshold = drawingRef.current ? PINCH_OFF : PINCH_ON;

      const canvasX_index = smIx * canvasWidth;
      const canvasY_index = smIy * canvasHeight;
      const mirroredX_index = canvasWidth - canvasX_index;
      const newCurrentHandPoint = { x: mirroredX_index, y: canvasY_index };
      setCurrentHandPoint(newCurrentHandPoint);

      // Pinch detection
      const isPinch = normDist < threshold;
      if (isPinch) {
        pinchClosedCountRef.current++;
        if (pinchClosedCountRef.current >= 3) {
          if (!drawingRef.current) {
            setDrawing(true);
            setLastPoint(newCurrentHandPoint);
          } else if (lastPointRef.current) {
            const strokesCanvas = canvasRef.current?.getStrokesCanvas?.();
            if (strokesCanvas) {
              const sctx = strokesCanvas.getContext('2d');
              if (sctx) {
                drawLine(
                  sctx,
                  lastPointRef.current,
                  newCurrentHandPoint,
                  currentColorRef.current,
                  currentWidthRef.current,
                  currentCapRef.current,
                  currentDashRef.current,
                  currentAlphaRef.current,
                  currentCompositeRef.current
                );
              }
            }
            setDrawnSegments(prevSegments => [
              ...prevSegments,
              {
                p1: lastPointRef.current,
                p2: newCurrentHandPoint,
                color: currentColorRef.current,
                width: currentWidthRef.current,
                cap: currentCapRef.current,
                dash: currentDashRef.current,
                alpha: currentAlphaRef.current,
                composite: currentCompositeRef.current
              }
            ]);
            setLastPoint(newCurrentHandPoint);
          }
          fistClosedCountRef.current = 0;
          gestureStateRef.current = 'open';
          return;
        }
      } else {
        setDrawing(false);
        pinchClosedCountRef.current = 0;
      }

      // Fist detection
      const isCurrentFist = isFist(landmarks);
      if (gestureStateRef.current === 'open' && isCurrentFist) {
        gestureStateRef.current = 'closed';
        fistClosedCountRef.current = 1;
      } else if (gestureStateRef.current === 'closed') {
        if (isCurrentFist) {
          fistClosedCountRef.current++;
        } else {
          if (fistClosedCountRef.current >= 3) {
            setBrushCycleTrigger(prev => prev + 1);
            setDrawing(false);
            setLastPoint(null);
          }
          fistClosedCountRef.current = 0;
          gestureStateRef.current = 'open';
        }
      }
    } else {
      if (drawingRef.current) {
        setDrawing(false);
      }
      setLastPoint(null);
      setCurrentHandPoint(null);
      fistClosedCountRef.current = 0;
      pinchClosedCountRef.current = 0;
      gestureStateRef.current = 'open';
    }
  }, [drawLine, canvasRef]);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.8,
    });

    hands.onResults(onResults);

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
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    currentCap,
    setCurrentCap,
    currentDash,
    setCurrentDash,
    currentAlpha,
    setCurrentAlpha,
    currentComposite,
    setCurrentComposite,
    brushCycleTrigger
  };
};

export default useHandTracking;