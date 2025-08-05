import React, { useRef } from 'react';
import WebcamComponent from './components/WebcamComponent.jsx';
import CanvasComponent from './components/CanvasComponent.jsx';
import useHandTracking from './hooks/useHandTracking'; // 커스텀 훅으로 뻄

function App() {
  // useHandTracking 훅에서 필요한 모든 상태와 함수를 가져옴.
  const {
    webcamRef,
    currentHandPoint,
    drawing,
    lastPoint,
    drawnSegments,
    setDrawnSegments,
    loading,
    currentColor,
    setCurrentColor
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
          drawing={drawing}
          lastPoint={lastPoint}
          currentColor={currentColor}
          currentHandPoint={currentHandPoint}
          webcamVideo={webcamRef.current ? webcamRef.current.video : null}
          drawnSegments={drawnSegments}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-6">
        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-md">
          <label htmlFor="colorPicker" className="text-gray-700 font-semibold">
            Color:
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
          Clear All
        </button>
      </div>
    </div>
  );
}

export default App;
