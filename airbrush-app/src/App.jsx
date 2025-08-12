import React, { useRef } from 'react';
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

  const canvasRef = useRef(null); // CanvasComponent의 ref

  // 캔버스를 지우는 함수
  const handleClearCanvas = () => {
    // CanvasComponent의 clearCanvas 함수 호출
    if (canvasRef.current && canvasRef.current.clearCanvas) {
      canvasRef.current.clearCanvas();
    }
    setDrawnSegments([]); // 그려진 모든 선 세그먼트들도 지웁니다.
  };

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

      <div className="flex flex-wrap items-center gap-3 w-full max-w-2xl mt-4">
        {/* 색상 선택 + 팔레트 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <span className="text-gray-700 font-semibold">Color</span>
          <input
            type="color"
            aria-label="Pick color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-10 h-10 border-none rounded-md cursor-pointer"
          />
          <div className="flex items-center gap-2">
            {['#000000','#ff0000','#00a152','#1976d2','#9c27b0','#ff9800','#795548','#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className={`w-6 h-6 rounded-full border ${c === '#ffffff' ? 'border-gray-300' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

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
            onChange={(e) => setCurrentWidth(parseInt(e.target.value, 10))}
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
            onChange={(e) => setCurrentCap(e.target.value)}
            className="border rounded-md px-2 py-1"
          >
            <option value="round">round</option>
            <option value="butt">butt</option>
            <option value="square">square</option>
          </select>
        </div>

        {/* 브러시 종류 (프리셋) */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-md">
          <span className="text-gray-700 font-semibold">Brush</span>
          <div className="flex items-center gap-2">
            {[
              {key:'pen', w:3, cap:'round', dash:[], a:1.0, comp:'source-over'},
              {key:'marker', w:10, cap:'round', dash:[], a:0.9, comp:'source-over'},
              {key:'highlighter', w:18, cap:'butt', dash:[], a:0.35, comp:'multiply'},
              {key:'dashed', w:6, cap:'butt', dash:[12,8], a:1.0, comp:'source-over'},
              {key:'dotted', w:6, cap:'round', dash:[2,6], a:1.0, comp:'source-over'},
            ].map(p => (
              <button
                key={p.key}
                onClick={() => {
                  setCurrentWidth(p.w);
                  setCurrentCap(p.cap);
                  setCurrentDash(p.dash);
                  setCurrentAlpha(p.a);
                  setCurrentComposite(p.comp);
                }}
                className="h-8 px-2 rounded-md border text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 whitespace-nowrap"
              >
                {p.key}
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
