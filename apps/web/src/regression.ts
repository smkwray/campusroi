/** Simple OLS linear regression: y = slope * x + intercept */
export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
}

export function ols(points: { x: number; y: number }[]): RegressionResult | null {
  const n = points.length;
  if (n < 3) return null;

  let sumX = 0, sumY = 0;
  for (const p of points) { sumX += p.x; sumY += p.y; }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0, ssXY = 0, ssYY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  if (ssXX === 0) return null;

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;

  // R² = (SSxy)² / (SSxx * SSyy)
  const r2 = ssYY === 0 ? 0 : (ssXY * ssXY) / (ssXX * ssYY);

  return { slope, intercept, r2, n };
}
