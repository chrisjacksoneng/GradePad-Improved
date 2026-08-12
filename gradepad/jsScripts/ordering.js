// Pure evaluation-ordering helpers, free of storage and the DOM so they can be
// tested directly. db.js applies them inside its read-modify-write.

// Renumber evaluations so each one named in orderedIds takes its position in
// that list. Anything not named keeps the index it already had.
//
// Callers pass the whole on-screen order rather than one row's position: saving
// a single index leaves a row inserted between two others sharing an index with
// its neighbour, and it then moves on the next load.
export function applyOrder(evaluations, orderedIds) {
  if (!Array.isArray(evaluations) || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return evaluations;
  }

  const position = new Map(orderedIds.map((id, i) => [id, i]));
  evaluations.forEach((evaluation) => {
    if (position.has(evaluation.id)) evaluation.index = position.get(evaluation.id);
  });
  return evaluations;
}

// Display order: by stored index, treating a legacy record without one as 0.
// Array.prototype.sort is stable, so equal indexes keep their stored order.
export function sortByIndex(evaluations) {
  return [...evaluations].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}
