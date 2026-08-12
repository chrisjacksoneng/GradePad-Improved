// Pure grade maths, deliberately free of the DOM and of storage so it can be
// tested directly. gradeCalc.js keeps the element reading and writing.

// parseFloat that reports "not a number" as null instead of NaN, so callers can
// use a plain null check. Tolerates the trailing % the mark cell displays.
export function parseNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// Percentage points lost (negative) or gained (positive) on one evaluation,
// measured against full marks. Null when the row is not scorable: a row with no
// mark, no weight, or zero weight contributes nothing.
export function lostPoints(grade, weight) {
  if (grade === null || weight === null || !(weight > 0)) return null;
  return ((grade - 100) / 100) * weight;
}

// A course's mark as a percentage of the weight entered so far, so a
// half-finished course reads as the average of what has been graded rather than
// being dragged down by work not yet done. Null when nothing is scorable.
export function courseMark(entries) {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const { grade, weight } of entries) {
    if (grade === null || weight === null || !(weight > 0)) continue;
    weightedScore += grade * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return null;
  return weightedScore / totalWeight;
}

// Units-weighted average across courses. Null when no course carries a mark.
export function weightedAverage(courses) {
  let weightedSum = 0;
  let totalUnits = 0;

  for (const { mark, units } of courses) {
    if (mark === null || units === null) continue;
    weightedSum += mark * units;
    totalUnits += units;
  }

  if (totalUnits <= 0) return null;
  return weightedSum / totalUnits;
}
