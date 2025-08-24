export const drawLine = (
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
};
