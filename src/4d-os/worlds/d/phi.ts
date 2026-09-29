/**
 * Exact decimal digits of φ = (1 + √5)/2: the integer √(5·10^(2n)) by Newton's method with BigInt. No
 * tables copied by hand: the page shows the real number.
 */
export function phiDigits(count: number): string {
  const n = BigInt(count);
  const scale = 10n ** (2n * n);
  const target = 5n * scale;
  let x = 3n * 10n ** n;
  for (;;) {
    const next = (x + target / x) / 2n;
    if (next >= x) break;
    x = next;
  }
  while (x * x > target) x--;
  const phi = (10n ** n + x) / 2n;
  const text = phi.toString();
  return `${text[0]}.${text.slice(1, count)}`;
}
