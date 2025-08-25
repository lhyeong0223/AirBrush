import React, { useRef, useState, useEffect, useMemo } from "react";
import WebcamComponent from "./components/WebcamComponent";
import CanvasComponent from "./components/CanvasComponent";
import useHandTracking from "./hooks/useHandTracking";
import TopBar from "./components/TopBar";
import LeftSidebar from "./components/LeftSidebar";
import BrushSettingsModal from "./components/BrushSettingsModal";

function App() {
  const ASPECTS = useMemo(
    () => ({
      "4:3": [4, 3],
      "16:9": [16, 9],
      "1:1": [1, 1],
      "9:16": [9, 16],
    }),
    []
  );

  const RES_PRESETS = useMemo(
    () => ({
      Low: {
        "4:3": [640, 480],
        "16:9": [640, 360],
        "1:1": [640, 640],
        "9:16": [480, 854],
      },
      Mid: {
        "4:3": [960, 720],
        "16:9": [1280, 720],
        "1:1": [960, 960],
        "9:16": [720, 1280],
      },
      High: {
        "4:3": [1280, 960],
        "16:9": [1920, 1080],
        "1:1": [1280, 1280],
        "9:16": [1080, 1920],
      },
    }),
    []
  );

  const [aspectRatio, setAspectRatio] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    return w < 768 ? "9:16" : w < 1280 ? "4:3" : "16:9";
  });
  const [resolutionTier, setResolutionTier] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    return w < 768 ? "Low" : w < 1440 ? "Mid" : "High";
  });

  const [logicalWidth, logicalHeight] = useMemo(() => {
    const tier = RES_PRESETS[resolutionTier] ?? RES_PRESETS.Mid;
    const pair = tier[aspectRatio] ?? RES_PRESETS.Mid["4:3"];
    return pair;
  }, [RES_PRESETS, resolutionTier, aspectRatio]);

  const canvasRef = useRef(null);

  const {
    webcamRef,
    currentHandPoint,
    drawnSegments,
    setDrawnSegments,
    loading,
    drawing,
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
  } = useHandTracking("#000000", logicalWidth, logicalHeight, canvasRef);

  const [activeBrush, setActiveBrush] = useState("pen");
  const [mode, setMode] = useState("camera");
  const [showIndicator, setShowIndicator] = useState(false);
  const [brushSettings, setBrushSettings] = useState({
    pen: {
      w: 3,
      cap: "round",
      dash: [],
      a: 1.0,
      comp: "source-over",
      c: "#000000",
    },
    marker: {
      w: 10,
      cap: "round",
      dash: [],
      a: 0.9,
      comp: "source-over",
      c: "#000000",
    },
    highlighter: {
      w: 18,
      cap: "butt",
      dash: [],
      a: 0.35,
      comp: "source-over",
      c: "#ffff00",
    },
    dashed: {
      w: 6,
      cap: "butt",
      dash: [12, 8],
      a: 1.0,
      comp: "source-over",
      c: "#000000",
    },
    dotted: {
      w: 6,
      cap: "round",
      dash: [2, 6],
      a: 1.0,
      comp: "source-over",
      c: "#000000",
    },
    eraser: {
      w: 20,
      cap: "round",
      dash: [],
      a: 1.0,
      comp: "destination-out",
      c: "#000000",
    },
  });

  const brushes = [
    "pen",
    "marker",
    "highlighter",
    "dashed",
    "dotted",
    "eraser",
  ];

  useEffect(() => {
    if (brushCycleTrigger > 0) {
      const currentIndex = brushes.indexOf(activeBrush);
      const nextIndex = (currentIndex + 1) % brushes.length;
      const nextBrush = brushes[nextIndex];
      setActiveBrush(nextBrush);
      applyBrush(nextBrush);
    }
  }, [brushCycleTrigger]);

  const applyBrush = (key) => {
    const s = brushSettings[key];
    if (!s) return;
    setActiveBrush(key);
    setCurrentWidth(s.w);
    setCurrentCap(s.cap);
    setCurrentDash(s.dash);
    setCurrentAlpha(s.a);
    setCurrentComposite(s.comp);
    if (key === "eraser") {
      setCurrentColor("#000000");
    } else {
      setCurrentColor(s.c || currentColor);
    }
  };

  useEffect(() => {
    applyBrush("pen");
  }, []);

  const strokeStartIndexRef = useRef(0);
  const prevDrawingRef = useRef(false);
  const isRedoingRef = useRef(false);
  const [strokeGroups, setStrokeGroups] = useState([]);
  const [redoGroups, setRedoGroups] = useState([]);

  const handleClearCanvas = () => {
    if (canvasRef.current && canvasRef.current.clearCanvas) {
      canvasRef.current.clearCanvas();
    }
    setDrawnSegments([]);
    setStrokeGroups([]);
    setRedoGroups([]);
  };

  const handleUndo = () => {
    if (strokeGroups.length === 0) return;
    const lastGroup = strokeGroups[strokeGroups.length - 1];
    setDrawnSegments(
      drawnSegments.slice(
        0,
        Math.max(0, drawnSegments.length - lastGroup.length)
      )
    );
    setStrokeGroups((prev) => prev.slice(0, -1));
    setRedoGroups((prev) => [...prev, lastGroup]);
  };

  const handleRedo = () => {
    if (redoGroups.length === 0) return;
    const lastRedo = redoGroups[redoGroups.length - 1];
    isRedoingRef.current = true;
    setRedoGroups((prev) => prev.slice(0, -1));
    setDrawnSegments((prev) => [...prev, ...lastRedo]);
    setStrokeGroups((prev) => [...prev, lastRedo]);
    isRedoingRef.current = false;
  };

  useEffect(() => {
    if (isRedoingRef.current) return;
    const prevDrawing = prevDrawingRef.current;
    if (!prevDrawing && drawing) {
      strokeStartIndexRef.current = drawnSegments.length;
    } else if (prevDrawing && !drawing) {
      const start = strokeStartIndexRef.current;
      const group = drawnSegments.slice(start);
      if (group.length > 0) {
        setStrokeGroups((prev) => [...prev, group]);
        setRedoGroups([]);
      }
    }
    prevDrawingRef.current = drawing;
  }, [drawing, drawnSegments]);

  const handleSaveImage = (formatOverride) => {
    const format = (formatOverride || "png").toLowerCase();
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const base = `airbrush_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(
      ts.getDate()
    )}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}`;
    const ext = format === "jpeg" || format === "jpg" ? "jpg" : "png";
    const mime = ext === "jpg" ? "image/jpeg" : "image/png";
    const filename = `${base}.${ext}`;

    const strokesCanvas =
      canvasRef.current && canvasRef.current.getStrokesCanvas
        ? canvasRef.current.getStrokesCanvas()
        : null;
    const videoEl =
      webcamRef.current && webcamRef.current.video
        ? webcamRef.current.video
        : null;

    if (!strokesCanvas) return;

    if (mode === "canvas" || !videoEl) {
      const dataUrl =
        ext === "jpg"
          ? strokesCanvas.toDataURL(mime, 0.92)
          : strokesCanvas.toDataURL(mime);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const w = logicalWidth;
      const h = logicalHeight;
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d");
      if (!tctx) return;
      tctx.drawImage(videoEl, 0, 0, w, h);
      tctx.drawImage(strokesCanvas, 0, 0);
      const dataUrl =
        ext === "jpg" ? tmp.toDataURL(mime, 0.92) : tmp.toDataURL(mime);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCapChange = (val) => {
    setCurrentCap(val);
    setBrushSettings((prev) => ({
      ...prev,
      [activeBrush]: { ...prev[activeBrush], cap: val },
    }));
  };

  const handleDashChange = (dash) => {
    setCurrentDash(dash);
    setBrushSettings((prev) => ({
      ...prev,
      [activeBrush]: { ...prev[activeBrush], dash },
    }));
  };

  const [isBrushSettingsModalOpen, setIsBrushSettingsModalOpen] =
    useState(false);

  useEffect(() => {
    if (isBrushSettingsModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [isBrushSettingsModalOpen]);

  const topBarProps = {
    handleUndo,
    handleRedo,
    strokeGroups,
    redoGroups,
    mode,
    setMode,
    aspectRatio,
    setAspectRatio,
    resolutionTier,
    setResolutionTier,
    showIndicator,
    setShowIndicator,
    handleSaveImage,
    handleClearCanvas,
    ASPECTS,
    RES_PRESETS,
    logicalWidth,
    logicalHeight,
  };

  const leftSidebarProps = {
    activeBrush,
    applyBrush,
    brushSettings,
    setBrushSettings,
    currentColor,
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    currentAlpha,
    setCurrentAlpha,
    setIsBrushSettingsModalOpen,
  };

  const brushSettingsModalProps = {
    isBrushSettingsModalOpen,
    setIsBrushSettingsModalOpen,
    activeBrush,
    brushSettings,
    setBrushSettings,
    currentColor,
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    currentAlpha,
    setCurrentAlpha,
    currentCap,
    setCurrentCap,
    currentDash,
    setCurrentDash,
    handleCapChange,
    handleDashChange,
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white font-inter flex flex-col">
      <TopBar {...topBarProps} />
      <div className="flex flex-1 p-4 sm:p-6 lg:p-8">
        <LeftSidebar {...leftSidebarProps} />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div
            className="w-full relative bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-md overflow-hidden"
            style={{ aspectRatio: `${logicalWidth}/${logicalHeight}` }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-lg z-10 rounded-lg">
                Webcam loading... Please allow camera access.
              </div>
            )}
            {showIndicator && (
              <div className="absolute top-4 left-4 z-20 text-xs bg-white/15 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-md">
                <div>Mode: {mode}</div>
                <div>Tracking: {currentHandPoint ? "On" : "Off"}</div>
                <div>Brush: {activeBrush}</div>
                <div>
                  Pointer:{" "}
                  {currentHandPoint
                    ? `${Math.round(currentHandPoint.x)}, ${Math.round(
                        currentHandPoint.y
                      )}`
                    : "-"}
                </div>
              </div>
            )}
            <div
              className={`absolute inset-0 ${
                mode === "camera" ? "" : "opacity-0"
              }`}
            >
              <WebcamComponent
                ref={webcamRef}
                logicalWidth={logicalWidth}
                logicalHeight={logicalHeight}
              />
            </div>
            <CanvasComponent
              ref={canvasRef}
              currentColor={currentColor}
              currentHandPoint={currentHandPoint}
              drawnSegments={drawnSegments}
              logicalWidth={logicalWidth}
              logicalHeight={logicalHeight}
              transparent={mode === "camera"}
            />
          </div>
        </main>
      </div>
      {isBrushSettingsModalOpen && (
        <BrushSettingsModal {...brushSettingsModalProps} />
      )}
    </div>
  );
}

export default App;
