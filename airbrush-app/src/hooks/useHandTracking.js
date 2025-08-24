import { useRef, useEffect, useState, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import * as cam from "@mediapipe/camera_utils";

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

  // Sync states with refs
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

  const drawLine = useCallback(
    (
      ctx,
      p1,
      p2,
      color,
      width = 5,
      cap = "round",
      dash = [],
      alpha = 1.0,
      composite = "source-over"
    ) => {
      if (!ctx || !p1 || !p2) return;
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
    },
    []
  );

  const isFist = (landmarks) => {
    console.log("Checking isFist");
    const fingerPairs = [
      [8, 6], // index tip vs pip
      [12, 10], // middle
      [16, 14], // ring
      [20, 18], // pinky
    ];
    let foldedCount = 0;
    for (const [tip, pip] of fingerPairs) {
      const isFolded = landmarks[tip].y > landmarks[pip].y;
      console.log(
        `Finger ${tip} vs ${pip}, TIP y: ${landmarks[tip].y.toFixed(
          3
        )}, PIP y: ${landmarks[pip].y.toFixed(3)}, Folded: ${isFolded}`
      );
      if (isFolded) foldedCount++;
    }
    console.log(`Folded count: ${foldedCount}, Is fist: ${foldedCount >= 3}`);
    return foldedCount >= 3;
  };

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
          console.log(
            `Processing hand ${handIndex}, Handedness: ${handedness}, Interpreted as: ${
              isRightHand ? "Right" : isLeftHand ? "Left" : "Unknown"
            }`
          );

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const rawIx = indexTip.x,
            rawIy = indexTip.y;
          const rawTx = thumbTip.x,
            rawTy = thumbTip.y;

          const EMA_KEEP = 0.7;
          const EMA_APPLY = 1 - EMA_KEEP;
          const prevI = smoothIndexRef.current[handIndex];
          const prevT = smoothThumbRef.current[handIndex];
          const smIx =
            prevI.x === null ? rawIx : prevI.x * EMA_KEEP + rawIx * EMA_APPLY;
          const smIy =
            prevI.y === null ? rawIy : prevI.y * EMA_KEEP + rawIy * EMA_APPLY;
          const smTx =
            prevT.x === null ? rawTx : prevT.x * EMA_KEEP + rawTx * EMA_APPLY;
          const smTy =
            prevT.y === null ? rawTy : prevT.y * EMA_KEEP + rawTy * EMA_APPLY;
          smoothIndexRef.current[handIndex] = { x: smIx, y: smIy };
          smoothThumbRef.current[handIndex] = { x: smTx, y: smTy };

          const normDist = Math.hypot(smIx - smTx, smIy - smTy);
          const PINCH_ON = 0.05;
          const PINCH_OFF = 0.07;
          const threshold = drawingRef.current ? PINCH_OFF : PINCH_ON;

          const canvasX_index = smIx * canvasWidth;
          const canvasY_index = smIy * canvasHeight;
          const mirroredX_index = canvasWidth - canvasX_index;
          const newPoint = { x: mirroredX_index, y: canvasY_index };

          if (isRightHand) {
            setCurrentHandPoint(newPoint);
            const isPinch = normDist < threshold;
            console.log(
              `Right hand pinch distance: ${normDist.toFixed(
                3
              )}, Threshold: ${threshold.toFixed(3)}, Is pinch: ${isPinch}`
            );
            if (isPinch) {
              pinchClosedCountRef.current[handIndex]++;
              if (pinchClosedCountRef.current[handIndex] >= 2) {
                console.log(`Right hand: Pinch detected after debouncing`);
                if (!drawingRef.current) {
                  setDrawing(true);
                  setLastPoint(newPoint);
                  console.log(
                    `Drawing started at: ${newPoint.x.toFixed(
                      0
                    )}, ${newPoint.y.toFixed(0)}`
                  );
                } else if (lastPointRef.current) {
                  const strokesCanvas = canvasRef.current?.getStrokesCanvas?.();
                  if (strokesCanvas) {
                    const sctx = strokesCanvas.getContext("2d");
                    if (sctx) {
                      console.log(
                        `Drawing line from ${lastPointRef.current.x.toFixed(
                          0
                        )},${lastPointRef.current.y.toFixed(
                          0
                        )} to ${newPoint.x.toFixed(0)},${newPoint.y.toFixed(0)}`
                      );
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
              if (drawingRef.current) {
                setDrawing(false);
                console.log("Right hand: Pinch released, drawing stopped");
              }
            }
          } else if (isLeftHand) {
            const isPinch = normDist < threshold;
            console.log(
              `Left hand pinch distance: ${normDist.toFixed(
                3
              )}, Threshold: ${threshold.toFixed(3)}, Is pinch: ${isPinch}`
            );
            if (isPinch) {
              pinchClosedCountRef.current[handIndex]++;
              if (pinchClosedCountRef.current[handIndex] >= 2) {
                if (leftPinchStartYRef.current === null) {
                  leftPinchStartYRef.current = smIy;
                  console.log(
                    `Left hand pinch started at y: ${smIy.toFixed(3)}`
                  );
                } else {
                  const deltaY = leftPinchStartYRef.current - smIy;
                  const sensitivity = 5;
                  const newWidth = Math.max(
                    1,
                    Math.min(
                      100,
                      currentWidthRef.current + deltaY * sensitivity
                    )
                  );
                  setCurrentWidth(newWidth);
                  console.log(
                    `Left hand: Width changed to ${newWidth.toFixed(
                      1
                    )} (deltaY: ${deltaY.toFixed(3)})`
                  );
                }
              }
            } else {
              pinchClosedCountRef.current[handIndex] = 0;
              leftPinchStartYRef.current = null;
              console.log(
                "Left hand: Pinch released, width adjustment stopped"
              );
            }

            const isCurrentFist = isFist(landmarks);
            if (gestureStateRef.current === "open" && isCurrentFist) {
              gestureStateRef.current = "closed";
              fistClosedCountRef.current = 1;
              console.log("Left hand: Transition to closed state");
            } else if (gestureStateRef.current === "closed") {
              if (isCurrentFist) {
                fistClosedCountRef.current++;
              } else {
                if (fistClosedCountRef.current >= 2) {
                  console.log("Left hand: Fist opened, triggering brush cycle");
                  setBrushCycleTrigger((prev) => prev + 1);
                }
                fistClosedCountRef.current = 0;
                gestureStateRef.current = "open";
                console.log("Left hand: Transition to open state");
              }
            }
          }
        }
      } else {
        if (drawingRef.current) {
          setDrawing(false);
          console.log("No hands detected, drawing stopped");
        }
        setLastPoint(null);
        setCurrentHandPoint(null);
        fistClosedCountRef.current = 0;
        pinchClosedCountRef.current = [0, 0];
        gestureStateRef.current = "open";
        leftPinchStartYRef.current = null;
        console.log("No hands detected, reset state");
      }
    },
    [drawLine, canvasRef]
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
