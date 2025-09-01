
export function cents(n: number): number {
  return Math.round(n * 100);
}

export function formatCents(c: number): string {
  const dollars = c / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
