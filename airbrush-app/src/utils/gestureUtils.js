export const isFist = (landmarks) => {
  const fingerPairs = [
    [8, 6], // index tip vs pip
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ];
  let foldedCount = 0;
  for (const [tip, pip] of fingerPairs) {
    if (landmarks[tip].y > landmarks[pip].y) foldedCount++;
  }
  return foldedCount >= 3;
};
