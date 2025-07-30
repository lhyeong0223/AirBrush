// airbrush-app/src/components/Canvas.js
import React, { useRef, useEffect, useState } from 'react';

const Canvas = ({ handPosition, isDrawing }) => {
  const canvasRef = useRef(null);
  const [color, setColor] = useState('black');
  const [lineWidth, setLineWidth] = useState(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    let lastPosition = null;

    // 마우스 이벤트
    canvas.addEventListener('mousedown', (e) => {
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
      lastPosition = { x: e.offsetX, y: e.offsetY };
    });
    canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) { // 마우스 왼쪽 버튼 눌림
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        lastPosition = { x: e.offsetX, y: e.offsetY };
      }
    });
    canvas.addEventListener('mouseup', () => {
      lastPosition = null;
    });

    // 손동작 이벤트
    if (handPosition && isDrawing) {
      if (lastPosition) {
        ctx.beginPath();
        ctx.moveTo(lastPosition.x, lastPosition.y);
      }
      ctx.lineTo(handPosition.x, handPosition.y);
      ctx.stroke();
      lastPosition = handPosition;
    }

    return () => {
      canvas.removeEventListener('mousedown', () => {});
      canvas.removeEventListener('mousemove', () => {});
      canvas.removeEventListener('mouseup', () => {});
    };
  }, [color, lineWidth, isDrawing, handPosition]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div>
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />
      <input
        type="range"
        min="1"
        max="20"
        step="1"
        value={lineWidth}
        onChange={(e) => setLineWidth(e.target.value)}
      />
      <button onClick={clearCanvas}>Clear Canvas</button>
      <canvas ref={canvasRef} width={640} height={480} />
    </div>
  );
};

export default Canvas;