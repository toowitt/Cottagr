export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

export function formatShare(basisPoints: number, digits = 2): string {
  return `${basisPointsToPercent(basisPoints).toFixed(digits)}%`;
}
