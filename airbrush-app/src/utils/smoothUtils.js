export const smoothPoint = (prev, raw, keep = 0.7) => {
  const apply = 1 - keep;
  return {
    x: prev.x === null ? raw.x : prev.x * keep + raw.x * apply,
    y: prev.y === null ? raw.y : prev.y * keep + raw.y * apply,
  };
};
