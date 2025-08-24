import { useRef, useEffect, useState, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import * as cam from "@mediapipe/camera_utils";
import { drawLine } from "../utils/drawUtils";
import { isFist } from "../utils/gestureUtils";
import { smoothPoint } from "../utils/smoothUtils";

const useHandTracking = (
  initialColor,
  logicalWidth = 640,
  logicalHeight = 480,
  canvasRef
) => {
  const webcamRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [currentHandPoint, setCurrentHandPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawnSegments, setDrawnSegments] = useState([]);
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [currentWidth, setCurrentWidth] = useState(5);
  const [currentCap, setCurrentCap] = useState("round");
  const [currentDash, setCurrentDash] = useState([]);
  const [currentAlpha, setCurrentAlpha] = useState(1.0);
  const [currentComposite, setCurrentComposite] = useState("source-over");
  const [brushCycleTrigger, setBrushCycleTrigger] = useState(0);

  // refs
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
  const smoothIndexRef = useRef([
    { x: null, y: null },
    { x: null, y: null },
  ]);
  const smoothThumbRef = useRef([
    { x: null, y: null },
    { x: null, y: null },
  ]);
  const fistClosedCountRef = useRef(0);
  const pinchClosedCountRef = useRef([0, 0]);
  const gestureStateRef = useRef("open");
  const leftPinchStartYRef = useRef(null);

  // sync states with refs
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
  useEffect(() => {
    currentWidthRef.current = currentWidth;
  }, [currentWidth]);
  useEffect(() => {
    currentCapRef.current = currentCap;
  }, [currentCap]);
  useEffect(() => {
    currentDashRef.current = currentDash;
  }, [currentDash]);
  useEffect(() => {
    currentAlphaRef.current = currentAlpha;
  }, [currentAlpha]);
  useEffect(() => {
    currentCompositeRef.current = currentComposite;
  }, [currentComposite]);
  useEffect(() => {
    logicalWidthRef.current = logicalWidth;
  }, [logicalWidth]);
  useEffect(() => {
    logicalHeightRef.current = logicalHeight;
  }, [logicalHeight]);

  const onResults = useCallback(
    (results) => {
      const canvasWidth = logicalWidthRef.current;
      const canvasHeight = logicalHeightRef.current;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (
          let handIndex = 0;
          handIndex < results.multiHandLandmarks.length;
          handIndex++
        ) {
          if (handIndex >= 2) break;
          const landmarks = results.multiHandLandmarks[handIndex];
          const handedness = results.multiHandedness[handIndex].label;
          const isRightHand = handedness === "Left";
          const isLeftHand = handedness === "Right";

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];

          const prevI = smoothIndexRef.current[handIndex];
          const prevT = smoothThumbRef.current[handIndex];

          const smI = smoothPoint(prevI, indexTip);
          const smT = smoothPoint(prevT, thumbTip);

          smoothIndexRef.current[handIndex] = smI;
          smoothThumbRef.current[handIndex] = smT;

          const normDist = Math.hypot(smI.x - smT.x, smI.y - smT.y);
          const PINCH_ON = 0.05;
          const PINCH_OFF = 0.07;
          const threshold = drawingRef.current ? PINCH_OFF : PINCH_ON;

          const canvasX_index = smI.x * canvasWidth;
          const canvasY_index = smI.y * canvasHeight;
          const mirroredX_index = canvasWidth - canvasX_index;
          const newPoint = { x: mirroredX_index, y: canvasY_index };

          // Right hand: drawing
          if (isRightHand) {
            setCurrentHandPoint(newPoint);
            const isPinch = normDist < threshold;
            if (isPinch) {
              pinchClosedCountRef.current[handIndex]++;
              if (pinchClosedCountRef.current[handIndex] >= 2) {
                if (!drawingRef.current) {
                  setDrawing(true);
                  setLastPoint(newPoint);
                } else if (lastPointRef.current) {
                  const strokesCanvas = canvasRef.current?.getStrokesCanvas?.();
                  if (strokesCanvas) {
                    const sctx = strokesCanvas.getContext("2d");
                    if (sctx) {
                      drawLine(
                        sctx,
                        lastPointRef.current,
                        newPoint,
                        currentColorRef.current,
                        currentWidthRef.current,
                        currentCapRef.current,
                        currentDashRef.current,
                        currentAlphaRef.current,
                        currentCompositeRef.current
                      );
                      setDrawnSegments((prevSegments) => [
                        ...prevSegments,
                        {
                          p1: lastPointRef.current,
                          p2: newPoint,
                          color: currentColorRef.current,
                          width: currentWidthRef.current,
                          cap: currentCapRef.current,
                          dash: currentDashRef.current,
                          alpha: currentAlphaRef.current,
                          composite: currentCompositeRef.current,
                        },
                      ]);
                    }
                  }
                  setLastPoint(newPoint);
                }
              }
            } else {
              pinchClosedCountRef.current[handIndex] = 0;
              if (drawingRef.current) setDrawing(false);
            }
          }

          // Left hand: width & brush cycle
          else if (isLeftHand) {
            const isPinch = normDist < threshold;
            if (isPinch) {
              pinchClosedCountRef.current[handIndex]++;
              if (pinchClosedCountRef.current[handIndex] >= 2) {
                if (leftPinchStartYRef.current === null) {
                  leftPinchStartYRef.current = smI.y;
                } else {
                  const deltaY = leftPinchStartYRef.current - smI.y;
                  const sensitivity = 5;
                  const newWidth = Math.max(
                    1,
                    Math.min(
                      100,
                      currentWidthRef.current + deltaY * sensitivity
                    )
                  );
                  setCurrentWidth(newWidth);
                }
              }
            } else {
              pinchClosedCountRef.current[handIndex] = 0;
              leftPinchStartYRef.current = null;
            }

            const isCurrentFist = isFist(landmarks);
            if (gestureStateRef.current === "open" && isCurrentFist) {
              gestureStateRef.current = "closed";
              fistClosedCountRef.current = 1;
            } else if (gestureStateRef.current === "closed") {
              if (isCurrentFist) {
                fistClosedCountRef.current++;
              } else {
                if (fistClosedCountRef.current >= 2) {
                  setBrushCycleTrigger((prev) => prev + 1);
                }
                fistClosedCountRef.current = 0;
                gestureStateRef.current = "open";
              }
            }
          }
        }
      } else {
        if (drawingRef.current) setDrawing(false);
        setLastPoint(null);
        setCurrentHandPoint(null);
        fistClosedCountRef.current = 0;
        pinchClosedCountRef.current = [0, 0];
        gestureStateRef.current = "open";
        leftPinchStartYRef.current = null;
      }
    },
    [canvasRef]
  );

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
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
    brushCycleTrigger,
  };
};

export default useHandTracking;
