// Fisher-Yates shuffle: returns a new array with the same items in a
// uniformly random order (doesn't mutate the input). Used to randomize
// both the question order and each question's 4 answer positions.
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Picks `n` random, distinct items from `array`, optionally excluding a set
// of items first (e.g. excluding the correct answer when picking
// distractors). Comparison is by reference, so callers must pass the exact
// object instances to exclude, not copies.
export function sample(array, n, exclude = []) {
  const excludeSet = new Set(exclude);
  const pool = array.filter((item) => !excludeSet.has(item));
  return shuffle(pool).slice(0, n);
}
