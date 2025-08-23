import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Undo2, Redo2, Trash2, Save, PenLine, Highlighter, Eraser, Minus, Ellipsis, Circle, Square, Droplet } from 'lucide-react';
import WebcamComponent from './components/WebcamComponent';
import CanvasComponent from './components/CanvasComponent';
import useHandTracking from './hooks/useHandTracking';

function App() {
  const ASPECTS = useMemo(() => ({
    '4:3': [4, 3],
    '16:9': [16, 9],
    '1:1': [1, 1],
    '9:16': [9, 16],
  }), []);

  const RES_PRESETS = useMemo(() => ({
    Low: {
      '4:3': [640, 480],
      '16:9': [640, 360],
      '1:1': [640, 640],
      '9:16': [480, 854],
    },
    Mid: {
      '4:3': [960, 720],
      '16:9': [1280, 720],
      '1:1': [960, 960],
      '9:16': [720, 1280],
    },
    High: {
      '4:3': [1280, 960],
      '16:9': [1920, 1080],
      '1:1': [1280, 1280],
      '9:16': [1080, 1920],
    },
  }), []);

  const [aspectRatio, setAspectRatio] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return w < 768 ? '9:16' : (w < 1280 ? '4:3' : '16:9');
  });
  const [resolutionTier, setResolutionTier] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return w < 768 ? 'Low' : (w < 1440 ? 'Mid' : 'High');
  });

  const [logicalWidth, logicalHeight] = useMemo(() => {
    const tier = RES_PRESETS[resolutionTier] ?? RES_PRESETS.Mid;
    const pair = tier[aspectRatio] ?? RES_PRESETS.Mid['4:3'];
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
    setCurrentComposite
  } = useHandTracking('#000000', logicalWidth, logicalHeight, canvasRef);

  const [activeBrush, setActiveBrush] = useState('pen');
  const [mode, setMode] = useState('canvas');
  const [saveFormat, setSaveFormat] = useState('png');
  const [showIndicator, setShowIndicator] = useState(false);
  const [brushSettings, setBrushSettings] = useState({
    pen: { w: 3, cap: 'round', dash: [], a: 1.0, comp: 'source-over', c: '#000000' },
    marker: { w: 10, cap: 'round', dash: [], a: 0.9, comp: 'source-over', c: '#000000' },
    highlighter: { w: 18, cap: 'butt', dash: [], a: 0.35, comp: 'source-over', c: '#ffff00' },
    dashed: { w: 6, cap: 'butt', dash: [12, 8], a: 1.0, comp: 'source-over', c: '#000000' },
    dotted: { w: 6, cap: 'round', dash: [2, 6], a: 1.0, comp: 'source-over', c: '#000000' },
    eraser: { w: 20, cap: 'round', dash: [], a: 1.0, comp: 'destination-out', c: '#ffffff' },
  });

  const applyBrush = (key) => {
    const s = brushSettings[key];
    if (!s) return;
    setActiveBrush(key);
    setCurrentWidth(s.w);
    setCurrentCap(s.cap);
    setCurrentDash(s.dash);
    setCurrentAlpha(s.a);
    setCurrentComposite(s.comp);
    if (key === 'eraser') {
      setCurrentColor('#ffffff');
    } else {
      setCurrentColor(s.c || currentColor);
    }
  };

  const handleSaveImage = (formatOverride) => {
    const format = (formatOverride || saveFormat || 'png').toLowerCase();
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const base = `airbrush_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}`;
    const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png';
    const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
    const filename = `${base}.${ext}`;

    if (mode === 'canvas') {
      const strokesCanvas = canvasRef.current && canvasRef.current.getStrokesCanvas ? canvasRef.current.getStrokesCanvas() : null;
      if (!strokesCanvas) return;
      const dataUrl = ext === 'jpg' ? strokesCanvas.toDataURL(mime, 0.92) : strokesCanvas.toDataURL(mime);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const strokesCanvas = canvasRef.current && canvasRef.current.getStrokesCanvas ? canvasRef.current.getStrokesCanvas() : null;
    const videoEl = webcamRef.current && webcamRef.current.video ? webcamRef.current.video : null;
    if (!strokesCanvas || !videoEl) return;

    const w = logicalWidth;
    const h = logicalHeight;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    try {
      tctx.drawImage(videoEl, 0, 0, w, h);
    } catch (e) {
      console.error('Failed to draw video frame:', e);
    }
    tctx.drawImage(strokesCanvas, 0, 0);
    const dataUrl = ext === 'jpg' ? tmp.toDataURL(mime, 0.92) : tmp.toDataURL(mime);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    applyBrush('pen');
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
    setDrawnSegments(drawnSegments.slice(0, Math.max(0, drawnSegments.length - lastGroup.length)));
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

  return (
    <div className="min-h-screen bg-gray-100 font-inter">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      <div className="flex">
        <aside className="hidden sm:flex sm:flex-col w-64 border-r bg-white p-3 gap-4 overflow-y-auto sticky top-0 h-screen">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-800">AirBrush</h1>
          </div>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Brush</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'pen', label: 'Pen', icon: <PenLine size={18} /> },
                { key: 'marker', label: 'Marker', icon: <PenLine size={18} /> },
                { key: 'highlighter', label: 'Highlighter', icon: <Highlighter size={18} /> },
                { key: 'dashed', label: 'Dashed', icon: <Minus size={18} /> },
                { key: 'dotted', label: 'Dotted', icon: <Ellipsis size={18} /> },
                { key: 'eraser', label: 'Eraser', icon: <Eraser size={18} /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => applyBrush(key)}
                  className={`flex flex-col items-center justify-center gap-1 h-16 rounded-md border text-xs transition-colors ${
                    activeBrush === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  {icon}
                  <span className="leading-none">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 inline-flex items-center gap-1"><Droplet size={14} /> Color</h2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Pick color"
                value={currentColor}
                onChange={(e) => {
                  const color = e.target.value;
                  setCurrentColor(color);
                  if (activeBrush !== 'eraser') {
                    setBrushSettings(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], c: color }
                    }));
                  }
                }}
                className="w-10 h-10 border-none rounded-md cursor-pointer"
                disabled={activeBrush === 'eraser'}
              />
              <div className="grid grid-cols-8 gap-2">
                {['#000000','#ff0000','#00a152','#1976d2','#9c27b0','#ff9800','#795548','#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      if (activeBrush === 'eraser') return;
                      setCurrentColor(c);
                      setBrushSettings(prev => ({
                        ...prev,
                        [activeBrush]: { ...prev[activeBrush], c }
                      }));
                    }}
                    className={`w-5 h-5 rounded-full border ${c === '#ffffff' ? 'border-gray-300' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Width</h2>
            <div className="flex items-center gap-3">
              <input
                id="brushWidth"
                type="range"
                min="1"
                max="30"
                step="1"
                value={currentWidth}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setCurrentWidth(v);
                  setBrushSettings(prev => ({
                    ...prev,
                    [activeBrush]: { ...prev[activeBrush], w: v }
                  }));
                }}
                className="w-full"
              />
              <span className="w-10 text-right text-xs text-gray-600">{currentWidth}</span>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Opacity</h2>
            <div className="flex items-center gap-3">
              <input
                id="opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentAlpha}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setCurrentAlpha(v);
                  setBrushSettings(prev => ({
                    ...prev,
                    [activeBrush]: { ...prev[activeBrush], a: v }
                  }));
                }}
                className="w-full"
              />
              <span className="w-12 text-right text-xs text-gray-600">{Math.round(currentAlpha*100)}%</span>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cap</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'round', icon: <Circle size={18} />, label: 'Round' },
                { val: 'butt', icon: <Minus size={18} />, label: 'Butt' },
                { val: 'square', icon: <Square size={18} />, label: 'Square' },
              ].map(({ val, icon, label }) => (
                <button
                  key={val}
                  onClick={() => {
                    setCurrentCap(val);
                    setBrushSettings(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], cap: val }
                    }));
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-12 rounded-md border text-xs transition-colors ${
                    currentCap === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  {icon}
                  <span className="leading-none">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Stroke</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'solid', icon: <Minus size={18} />, label: 'Solid', dash: [] },
                { val: 'dashed', icon: <Minus size={18} />, label: 'Dashed', dash: [12,8] },
                { val: 'dotted', icon: <Ellipsis size={18} />, label: 'Dotted', dash: [2,6] },
              ].map(({ val, icon, label, dash }) => (
                <button
                  key={val}
                  onClick={() => {
                    setCurrentDash(dash);
                    setBrushSettings(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], dash }
                    }));
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-12 rounded-md border text-xs transition-colors ${
                    (currentDash && currentDash.length) ? ((currentDash[0] <= 3 && val==='dotted') || (currentDash[0] > 3 && val==='dashed')) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100' : (val==='solid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100')
                  }`}
                  title={label}
                >
                  {icon}
                  <span className="leading-none">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Canvas Size</h2>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {Object.keys(ASPECTS).map(key => (
                <button
                  key={key}
                  onClick={() => setAspectRatio(key)}
                  className={`h-8 rounded-md border text-xs ${aspectRatio===key ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                  title={`Aspect ${key}`}
                >{key}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Low','Mid','High'].map(tier => (
                <button
                  key={tier}
                  onClick={() => setResolutionTier(tier)}
                  className={`h-8 rounded-md border text-xs ${resolutionTier===tier ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                  title={`${tier} resolution`}
                >{tier}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">{logicalWidth}×{logicalHeight}</p>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('canvas')}
                className={`h-8 rounded-md border text-xs ${mode==='canvas' ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                title="Canvas mode (white background)"
              >Canvas</button>
              <button
                onClick={() => setMode('camera')}
                className={`h-8 rounded-md border text-xs ${mode==='camera' ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                title="Camera mode (draw over live feed)"
              >Camera</button>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Indicator</h2>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setShowIndicator(v => !v)}
                className={`h-8 rounded-md border text-xs ${showIndicator ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                title="Toggle on-screen indicator"
              >{showIndicator ? 'On' : 'Off'}</button>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Actions</h2>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleUndo}
                disabled={strokeGroups.length === 0}
                className={`flex items-center justify-center gap-2 h-10 rounded-md border text-xs ${strokeGroups.length === 0 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                title="Undo"
              >
                <Undo2 size={16} /> Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={redoGroups.length === 0}
                className={`flex items-center justify-center gap-2 h-10 rounded-md border text-xs ${redoGroups.length === 0 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                title="Redo"
              >
                <Redo2 size={16} /> Redo
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleClearCanvas}
                className="flex items-center justify-center gap-2 h-10 rounded-md border text-xs text-white bg-blue-600 hover:bg-blue-700"
                title="Clear All"
              >
                <Trash2 size={16} /> Clear
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Export</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveImage('png')}
                className="flex items-center justify-center gap-2 h-10 rounded-md border text-xs text-white bg-emerald-500 hover:bg-emerald-600"
                title={mode==='camera' ? 'Save camera+drawing as PNG' : 'Save drawing as PNG'}
              >
                <Save size={16} /> PNG
              </button>
              <button
                onClick={() => handleSaveImage('jpeg')}
                className="flex items-center justify-center gap-2 h-10 rounded-md border text-xs text-white bg-emerald-500 hover:bg-emerald-600"
                title={mode==='camera' ? 'Save camera+drawing as JPEG' : 'Save drawing as JPEG'}
              >
                <Save size={16} /> JPG
              </button>
            </div>
          </section>
        </aside>

        <main className="flex-1 ml-0 p-4">
          <div className="mx-auto max-w-9/10">
            <div className="relative w-full bg-white rounded-lg shadow-xl overflow-hidden" style={{ aspectRatio: `${logicalWidth}/${logicalHeight}` }}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 text-white text-lg z-10 rounded-lg">
                  Webcam loading... Please allow camera access.
                </div>
              )}
              {showIndicator && (
                <div className="absolute top-2 right-2 z-20 text-[11px] bg-black/60 text-white px-2 py-1 rounded">
                  <div>Mode: {mode}</div>
                  <div>Tracking: {currentHandPoint ? 'On' : 'Off'}</div>
                  <div>
                    Pointer: {currentHandPoint ? `${Math.round(currentHandPoint.x)}, ${Math.round(currentHandPoint.y)}` : '-'}
                  </div>
                </div>
              )}
              <div className={`absolute inset-0 ${mode==='camera' ? '' : 'opacity-0'}`}>
                <WebcamComponent ref={webcamRef} logicalWidth={logicalWidth} logicalHeight={logicalHeight} />
              </div>
              <CanvasComponent
                ref={canvasRef}
                currentColor={currentColor}
                currentHandPoint={currentHandPoint}
                drawnSegments={drawnSegments}
                logicalWidth={logicalWidth}
                logicalHeight={logicalHeight}
                transparent={mode==='camera'}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;