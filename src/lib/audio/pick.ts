/** Pure variant picker: random index, never equal to `last` when more than one item. No imports so node can load it. */
export function pickVariant<T>(list: readonly T[], last: number | undefined, rand: () => number = Math.random): number {
  if (list.length <= 1) return 0;
  const i = Math.floor(rand() * (list.length - 1));
  return last !== undefined && i >= last ? i + 1 : i;
}
