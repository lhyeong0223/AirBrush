import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

const CanvasComponent = forwardRef(({ currentColor, currentHandPoint, drawnSegments, logicalWidth = 640, logicalHeight = 480, transparent = false }, ref) => {
  const strokesCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const prevLenRef = useRef(0);
  const rafRef = useRef(null);

  const drawPointer = useCallback((ctx, point, color) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }, []);

  useEffect(() => {
    const strokesCanvas = strokesCanvasRef.current;
    if (!strokesCanvas) return;
    const sctx = strokesCanvas.getContext('2d');
    if (!sctx) return;
    sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    if (!transparent) {
      sctx.fillStyle = 'white';
      sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
    }
    prevLenRef.current = 0;
    for (let i = 0; i < drawnSegments.length; i++) {
      const seg = drawnSegments[i];
      sctx.beginPath();
      sctx.setLineDash(Array.isArray(seg.dash) ? seg.dash : []);
      sctx.lineWidth = seg.width;
      sctx.lineCap = seg.cap;
      sctx.strokeStyle = seg.color;
      const prevAlpha = sctx.globalAlpha;
      const prevComposite = sctx.globalCompositeOperation;
      sctx.globalAlpha = seg.alpha;
      sctx.globalCompositeOperation = seg.composite;
      sctx.moveTo(seg.p1.x, seg.p1.y);
      sctx.lineTo(seg.p2.x, seg.p2.y);
      sctx.stroke();
      sctx.setLineDash([]);
      sctx.globalAlpha = prevAlpha;
      sctx.globalCompositeOperation = prevComposite;
      prevLenRef.current = i + 1;
    }
  }, [logicalWidth, logicalHeight, drawnSegments, transparent]);

  useEffect(() => {
    const strokesCanvas = strokesCanvasRef.current;
    if (!strokesCanvas) return;
    const sctx = strokesCanvas.getContext('2d');
    if (!sctx) return;

    const prevLen = prevLenRef.current;
    const currLen = drawnSegments.length;

    if (currLen > prevLen) {
      for (let i = prevLen; i < currLen; i++) {
        const seg = drawnSegments[i];
        sctx.beginPath();
        sctx.setLineDash(Array.isArray(seg.dash) ? seg.dash : []);
        sctx.lineWidth = seg.width;
        sctx.lineCap = seg.cap;
        sctx.strokeStyle = seg.color;
        const prevAlpha = sctx.globalAlpha;
        const prevComposite = sctx.globalCompositeOperation;
        sctx.globalAlpha = seg.alpha;
        sctx.globalCompositeOperation = seg.composite;
        sctx.moveTo(seg.p1.x, seg.p1.y);
        sctx.lineTo(seg.p2.x, seg.p2.y);
        sctx.stroke();
        sctx.setLineDash([]);
        sctx.globalAlpha = prevAlpha;
        sctx.globalCompositeOperation = prevComposite;
      }
      prevLenRef.current = currLen;
    } else if (currLen === 0 && prevLen !== 0) {
      sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      if (!transparent) {
        sctx.fillStyle = 'white';
        sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      }
      prevLenRef.current = 0;
    } else if (currLen < prevLen) {
      sctx.clearRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      if (!transparent) {
        sctx.fillStyle = 'white';
        sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
      }
      for (let i = 0; i < currLen; i++) {
        const seg = drawnSegments[i];
        sctx.beginPath();
        sctx.setLineDash(Array.isArray(seg.dash) ? seg.dash : []);
        sctx.lineWidth = seg.width;
        sctx.lineCap = seg.cap;
        sctx.strokeStyle = seg.color;
        const prevAlpha = sctx.globalAlpha;
        const prevComposite = sctx.globalCompositeOperation;
        sctx.globalAlpha = seg.alpha;
        sctx.globalCompositeOperation = seg.composite;
        sctx.moveTo(seg.p1.x, seg.p1.y);
        sctx.lineTo(seg.p2.x, seg.p2.y);
        sctx.stroke();
        sctx.setLineDash([]);
        sctx.globalAlpha = prevAlpha;
        sctx.globalCompositeOperation = prevComposite;
      }
      prevLenRef.current = currLen;
    }
  }, [drawnSegments, transparent]);

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
          if (!transparent) {
            sctx.fillStyle = 'white';
            sctx.fillRect(0, 0, strokesCanvas.width, strokesCanvas.height);
          }
        }
      }
      if (overlayCanvas) {
        const octx = overlayCanvas.getContext('2d');
        if (octx) {
          octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
      }
      prevLenRef.current = 0;
    },
    getStrokesCanvas: () => {
      return strokesCanvasRef.current;
    },
    getImageDataURL: () => {
      const strokesCanvas = strokesCanvasRef.current;
      if (!strokesCanvas) return null;
      return strokesCanvas.toDataURL('image/png');
    },
    downloadImage: (filename = 'airbrush.png') => {
      const dataUrl = (typeof window !== 'undefined' && ref && ref.current && ref.current.getImageDataURL)
        ? ref.current.getImageDataURL()
        : (strokesCanvasRef.current ? strokesCanvasRef.current.toDataURL('image/png') : null);
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }));

  return (
    <div className="absolute top-0 left-0 w-full h-full rounded-lg">
      <canvas
        ref={strokesCanvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        width={logicalWidth}
        height={logicalHeight}
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
        width={logicalWidth}
        height={logicalHeight}
      />
    </div>
  );
});

export default CanvasComponent;