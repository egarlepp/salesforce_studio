import type { NumberRangeConfig } from "./types";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Given a set of parent ids, a requested total child count, and a min/max
 * children-per-parent ratio, produces a flat list of parent ids (one entry
 * per child to create) whose length matches the requested count as closely
 * as possible without ever giving any parent fewer than `min` or more than
 * `max` children.
 *
 * If `parentIds` is empty, returns an empty list (caller is responsible for
 * skipping the dependent stage).
 */
export function distributeChildren(
  parentIds: string[],
  requestedCount: number,
  ratio: NumberRangeConfig
): string[] {
  if (parentIds.length === 0 || requestedCount <= 0) return [];

  const min = Math.max(0, Math.min(ratio.min, ratio.max));
  const max = Math.max(ratio.min, ratio.max);

  const counts = parentIds.map(() => randomInt(min, max));
  const minTotal = min * parentIds.length;
  const maxTotal = max * parentIds.length;
  const target = Math.max(minTotal, Math.min(requestedCount, maxTotal));

  let diff = target - counts.reduce((sum, c) => sum + c, 0);

  // Randomize adjustment order so the same few parents don't always absorb
  // the remainder.
  const order = [...counts.keys()].sort(() => Math.random() - 0.5);

  while (diff > 0) {
    let madeProgress = false;
    for (const i of order) {
      if (diff <= 0) break;
      if (counts[i] < max) {
        counts[i]++;
        diff--;
        madeProgress = true;
      }
    }
    if (!madeProgress) break;
  }

  while (diff < 0) {
    let madeProgress = false;
    for (const i of order) {
      if (diff >= 0) break;
      if (counts[i] > min) {
        counts[i]--;
        diff++;
        madeProgress = true;
      }
    }
    if (!madeProgress) break;
  }

  const assignments: string[] = [];
  parentIds.forEach((parentId, i) => {
    for (let n = 0; n < counts[i]; n++) {
      assignments.push(parentId);
    }
  });

  // Shuffle so children aren't grouped strictly by parent order.
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }

  return assignments;
}

/** Returns up to `count` distinct random items from `pool`, without replacement. */
export function sampleDistinct<T>(pool: T[], count: number): T[] {
  const n = Math.max(0, Math.min(count, pool.length));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}
