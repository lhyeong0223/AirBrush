import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

// forwardRef를 사용하여 부모 컴포넌트에서 canvasRef를 접근할 수 있도록 함
// 성능 최적화:
// - strokesCanvas: 누적 선분을 한 번만 그림(점진적 렌더링)
// - overlayCanvas: 포인터만 rAF로 매 프레임 갱신(배경은 건드리지 않음)
// - 좌표 반전은 훅에서 처리하여 여기서는 변환 불필요
const CanvasComponent = forwardRef(({ currentColor, currentHandPoint, drawnSegments }, ref) => {
  const strokesCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const prevLenRef = useRef(0);
  const rafRef = useRef(null);

  // 선분 그리기 (단일 세그먼트)
  const drawLine = useCallback((ctx, p1, p2, color) => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, []);

  // 포인터 그리기 (overlay 전용)
  const drawPointer = useCallback((ctx, point, color) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }, []);

  // 초기 배경(흰색) 채우기
  useEffect(() => {
    const strokesCanvas = strokesCanvasRef.current;
    if (!strokesCanvas) return;
    const sctx = strokesCanvas.getContext('2d');
    if (!sctx) return;
    sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    sctx.fillStyle = 'white';
    sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
  }, []);

  // 새로 추가된 선분만 누적 캔버스에 그림
  useEffect(() => {
    const strokesCanvas = strokesCanvasRef.current;
    if (!strokesCanvas) return;
    const sctx = strokesCanvas.getContext('2d');
    if (!sctx) return;

    const prevLen = prevLenRef.current;
    if (drawnSegments.length > prevLen) {
      for (let i = prevLen; i < drawnSegments.length; i++) {
        const seg = drawnSegments[i];
        drawLine(sctx, seg.p1, seg.p2, seg.color);
      }
      prevLenRef.current = drawnSegments.length;
    } else if (drawnSegments.length === 0 && prevLen !== 0) {
      // 외부에서 전체 지우기 수행 시 초기화
      sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      sctx.fillStyle = 'white';
      sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      prevLenRef.current = 0;
    }
  }, [drawnSegments, drawLine]);

  // rAF로 포인터만 매 프레임 렌더링 (overlay 캔버스만 지움)
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    const octx = overlayCanvas.getContext('2d');
    if (!octx) return;

    const render = () => {
      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (currentHandPoint) {
        drawPointer(octx, currentHandPoint, currentColor);
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentHandPoint, currentColor, drawPointer]);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      const strokesCanvas = strokesCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (strokesCanvas) {
        const sctx = strokesCanvas.getContext('2d');
        if (sctx) {
          sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
          sctx.fillStyle = 'white';
          sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
        }
      }
      if (overlayCanvas) {
        const octx = overlayCanvas.getContext('2d');
        if (octx) {
          octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
      }
      prevLenRef.current = 0;
    }
  }));

  return (
    <div className="absolute top-0 left-0 w-full h-full rounded-lg">
      {/* 누적 선분 캔버스 */}
      <canvas
        ref={strokesCanvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        width="640"
        height="480"
      />
      {/* 포인터 오버레이 캔버스 */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
        width="640"
        height="480"
      />
    </div>
  );
});

export default CanvasComponent;
