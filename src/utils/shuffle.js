export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sample(array, n, exclude = []) {
  const excludeSet = new Set(exclude);
  const pool = array.filter((item) => !excludeSet.has(item));
  return shuffle(pool).slice(0, n);
}
