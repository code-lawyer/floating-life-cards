export function nextRandom(state: number): [number, number] {
  let value = state | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  const next = value >>> 0 || 0x9e3779b9;
  return [next / 4294967296, next];
}

export function takeOne<T>(items: readonly T[], state: number): [T, number] {
  const [value, next] = nextRandom(state);
  return [items[Math.floor(value * items.length)]!, next];
}

export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const result = [...items];
  let next = state;
  for (let index = result.length - 1; index > 0; index -= 1) {
    let value: number;
    [value, next] = nextRandom(next);
    const swap = Math.floor(value * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return [result, next];
}
