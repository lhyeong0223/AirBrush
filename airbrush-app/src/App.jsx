import React, { useRef, useState, useEffect } from 'react';
import WebcamComponent from './components/WebcamComponent.jsx';
import CanvasComponent from './components/CanvasComponent.jsx';
import useHandTracking from './hooks/useHandTracking'; // 커스텀 훅으로 뻄

function App() {
  // useHandTracking 훅에서 필요한 모든 상태와 함수를 가져옴.
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
  } = useHandTracking('#000000'); // 초기 색상 설정

  // 브러쉬 전환 및 브러쉬별 설정 저장
  const [activeBrush, setActiveBrush] = useState('pen');
  const [brushSettings, setBrushSettings] = useState({
    pen:         { w: 3,  cap: 'round',  dash: [],       a: 1.0,  comp: 'source-over', c: '#000000' },
    marker:      { w: 10, cap: 'round',  dash: [],       a: 0.9,  comp: 'source-over', c: '#000000' },
    highlighter: { w: 18, cap: 'butt',   dash: [],       a: 0.35, comp: 'source-over', c: '#ffff00' },
    dashed:      { w: 6,  cap: 'butt',   dash: [12, 8],  a: 1.0,  comp: 'source-over', c: '#000000' },
    dotted:      { w: 6,  cap: 'round',  dash: [2, 6],   a: 1.0,  comp: 'source-over', c: '#000000' },
    eraser:      { w: 20, cap: 'round',  dash: [],       a: 1.0,  comp: 'source-over', c: '#ffffff' },
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
    // 브러쉬별 색상 적용 (지우개는 흰색 고정)
    if (key === 'eraser') {
      setCurrentColor('#ffffff');
    } else {
      setCurrentColor(s.c || currentColor);
    }
  };

  // 이미지 저장 (PNG 다운로드)
  const handleSaveImage = () => {
    if (!canvasRef.current || !canvasRef.current.downloadImage) return;
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `airbrush_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}-${pad(ts.getSeconds())}.png`;
    canvasRef.current.downloadImage(filename);
  };

  // 초기 브러쉬 적용
  useEffect(() => {
    applyBrush('pen');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 배경색은 흰색 고정이므로 추가 동기화 불필요

  const canvasRef = useRef(null); // CanvasComponent의 ref
  // 그룹(스트로크) 단위 Undo/Redo
  const strokeStartIndexRef = useRef(0);
  const prevDrawingRef = useRef(false);
  const isRedoingRef = useRef(false);
  const [strokeGroups, setStrokeGroups] = useState([]); // Array<Array<segment>>
  const [redoGroups, setRedoGroups] = useState([]);     // Array<Array<segment>>

  // 캔버스를 지우는 함수
  const handleClearCanvas = () => {
    // CanvasComponent의 clearCanvas 함수 호출
    if (canvasRef.current && canvasRef.current.clearCanvas) {
      canvasRef.current.clearCanvas();
    }
    setDrawnSegments([]); // 그려진 모든 선 세그먼트들도 지웁니다.
    setStrokeGroups([]);
    setRedoGroups([]);
  };

  // Undo/Redo 핸들러 (그룹 단위)
  const handleUndo = () => {
    if (strokeGroups.length === 0) return;
    const lastGroup = strokeGroups[strokeGroups.length - 1];
    // drawnSegments에서 마지막 그룹 길이만큼 제거
    setDrawnSegments(drawnSegments.slice(0, Math.max(0, drawnSegments.length - lastGroup.length)));
    setStrokeGroups((prev) => prev.slice(0, -1));
    setRedoGroups((prev) => [...prev, lastGroup]);
  };

  const handleRedo = () => {
    if (redoGroups.length === 0) return;
    const lastRedo = redoGroups[redoGroups.length - 1];
    isRedoingRef.current = true;
    setRedoGroups((prev) => prev.slice(0, -1));
    // 그룹 전체를 다시 추가
    setDrawnSegments([...drawnSegments, ...lastRedo]);
    setStrokeGroups((prev) => [...prev, lastRedo]);
    // isRedoingRef는 아래 드로잉 상태 감시에서 해제되지 않지만,
    // redo는 핀치를 수반하지 않으므로 그룹 감시 로직과 충돌 없음
    isRedoingRef.current = false;
  };

  // 드로잉 상태 변화 감시하여 스트로크 그룹 경계 기록
  useEffect(() => {
    const prevDrawing = prevDrawingRef.current;
    if (!prevDrawing && drawing) {
      // 스트로크 시작: 현재까지 그려진 개수를 시작 인덱스로 기록
      strokeStartIndexRef.current = drawnSegments.length;
    } else if (prevDrawing && !drawing) {
      // 스트로크 종료: 시작~현재까지를 하나의 그룹으로 저장
      const start = strokeStartIndexRef.current;
      const end = drawnSegments.length;
      if (end > start) {
        const group = drawnSegments.slice(start, end);
        setStrokeGroups((prev) => [...prev, group]);
        if (!isRedoingRef.current) {
          // 새로운 실제 드로잉이 끝났을 때만 redo 그룹 초기화
          setRedoGroups([]);
        }
      }
    }
    prevDrawingRef.current = drawing;
  }, [drawing, drawnSegments.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-inter">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      <h1 className="text-4xl font-bold text-gray-800 mb-6 rounded-lg p-2 bg-white shadow-md">
        AirBrush
      </h1>

      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 text-white text-lg z-10 rounded-lg">
            Webcam loading... Please allow camera access.
          </div>
        )}
        <WebcamComponent
          ref={webcamRef}
        />
        <CanvasComponent
          ref={canvasRef}
          currentColor={currentColor}
          currentHandPoint={currentHandPoint}
          drawnSegments={drawnSegments}
        />
      </div>

      {/* 단일 툴바: 넘침 방지, 줄바꿈 허용 */}
      <div className="flex flex-wrap items-center gap-3 w-full max-w-2xl mt-4">
        {/* 편집 도구: Undo / Redo / Clear All / Save */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-md">
          <button
            onClick={handleUndo}
            disabled={strokeGroups.length === 0}
            className={`h-9 px-3 rounded-md border text-sm ${strokeGroups.length === 0 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
            title="Undo"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={redoGroups.length === 0}
            className={`h-9 px-3 rounded-md border text-sm ${redoGroups.length === 0 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
            title="Redo"
          >
            Redo
          </button>
          <button
            onClick={handleClearCanvas}
            className="h-9 px-3 rounded-md border text-sm text-white bg-blue-600 hover:bg-blue-700"
            title="Clear All"
          >
            Clear All
          </button>
          <button
            onClick={handleSaveImage}
            className="h-9 px-3 rounded-md border text-sm text-white bg-emerald-600 hover:bg-emerald-700"
            title="Save as PNG"
          >
            Save PNG
          </button>
        </div>
        {/* 색상 선택 + 팔레트 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <span className="text-gray-700 font-semibold">Color</span>
          <input
            type="color"
            aria-label="Pick color"
            value={currentColor}
            onChange={(e) => {
              const color = e.target.value;
              setCurrentColor(color);
              // 지우개 외 현재 브러쉬의 색상 저장
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
          <div className="flex items-center gap-2">
            {['#000000','#ff0000','#00a152','#1976d2','#9c27b0','#ff9800','#795548','#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  if (activeBrush === 'eraser') return; // 지우개는 배경색 동기화
                  setCurrentColor(c);
                  setBrushSettings(prev => ({
                    ...prev,
                    [activeBrush]: { ...prev[activeBrush], c }
                  }));
                }}
                className={`w-6 h-6 rounded-full border ${c === '#ffffff' ? 'border-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* 배경색은 흰색으로 고정 */}

        {/* 브러시 굵기 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="brushWidth" className="text-gray-700 font-semibold">Width</label>
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
            className="w-40"
          />
          <span className="w-8 text-center text-sm text-gray-600">{currentWidth}</span>
        </div>

        {/* 브러시 끝 모양 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="brushCap" className="text-gray-700 font-semibold">Cap</label>
          <select
            id="brushCap"
            value={currentCap}
            onChange={(e) => {
              const v = e.target.value;
              setCurrentCap(v);
              setBrushSettings(prev => ({
                ...prev,
                [activeBrush]: { ...prev[activeBrush], cap: v }
              }));
            }}
            className="border rounded-md px-2 py-1"
          >
            <option value="round">round</option>
            <option value="butt">butt</option>
            <option value="square">square</option>
          </select>
        </div>

        {/* 스트로크 스타일 (Solid/Dashed/Dotted) */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="strokeStyle" className="text-gray-700 font-semibold">Stroke</label>
          <select
            id="strokeStyle"
            className="border rounded-md px-2 py-1"
            value={(currentDash && currentDash.length) ? (currentDash[0] <= 3 ? 'dotted' : 'dashed') : 'solid'}
            onChange={(e) => {
              const val = e.target.value;
              let dash = [];
              if (val === 'dashed') dash = [12, 8];
              if (val === 'dotted') dash = [2, 6];
              setCurrentDash(dash);
              setBrushSettings(prev => ({
                ...prev,
                [activeBrush]: { ...prev[activeBrush], dash }
              }));
            }}
          >
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
            <option value="dotted">dotted</option>
          </select>
        </div>

        {/* 불투명도 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="opacity" className="text-gray-700 font-semibold">Opacity</label>
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
            className="w-32"
          />
          <span className="w-10 text-center text-sm text-gray-600">{Math.round(currentAlpha*100)}%</span>
        </div>

        {/* 브러시 종류 전환 버튼 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <span className="text-gray-700 font-semibold">Brush</span>
          <div className="flex items-center gap-2">
            {['pen','marker','highlighter','dashed','dotted','eraser'].map(key => (
              <button
                key={key}
                onClick={() => applyBrush(key)}
                className={`h-8 px-3 rounded-md border text-xs whitespace-nowrap transition-colors ${
                  activeBrush === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                title={key}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleClearCanvas}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

export default App;
