import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

// forwardRef를 사용하여 부모 컴포넌트에서 canvasRef를 접근할 수 있도록 함!
const CanvasComponent = forwardRef(({ drawing, lastPoint, currentColor, webcamVideo, currentHandPoint, drawnSegments }, ref) => {
  const localCanvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const canvas = localCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white'; // 캔버스 배경
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }));

  // 캔버스에 선을 그리는 함수
  const drawLine = useCallback((ctx, p1, p2, color) => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, []);

  // 손끝 포인터를 그리는 함수
  const drawPointer = useCallback((ctx, point, color) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2, false); // 반지름 8px
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 매 프레임마다 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 캔버스 컨텍스트를 저장하고 좌우 반전 적용
    ctx.save();
    ctx.scale(-1, 1); // 좌우 반전
    ctx.translate(-canvas.width, 0);

    // 변환된 컨텍스트에서 그려지니까 자동으로 반전될거임.
    drawnSegments.forEach(segment => {
      drawLine(ctx, segment.p1, segment.p2, segment.color);
    });

    if (currentHandPoint) {
      drawPointer(ctx, currentHandPoint, currentColor);
    }

    ctx.restore();

  }, [drawnSegments, drawLine, currentHandPoint, currentColor, drawPointer]);

  return (
    <canvas
      ref={localCanvasRef}
      className="absolute top-0 left-0 w-full h-full rounded-lg"
      width="640"
      height="480"
    />
  );
});

export default CanvasComponent;
