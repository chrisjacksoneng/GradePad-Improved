import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOrder, sortByIndex } from '../gradepad/jsScripts/ordering.js';

const rows = () => [
  { id: 'a', index: 0 },
  { id: 'b', index: 1 },
  { id: 'c', index: 2 },
];

test('applyOrder renumbers to the given order', () => {
  const evaluations = rows();
  applyOrder(evaluations, ['c', 'b', 'a']);
  assert.deepEqual(
    sortByIndex(evaluations).map((e) => e.id),
    ['c', 'b', 'a'],
  );
});

test('a row inserted in the middle keeps its place', () => {
  // The regression this exists for: saving only the new row's index left it
  // sharing index 1 with b, and the stable sort then rendered a, b, new, c.
  const evaluations = [...rows(), { id: 'new', index: 1 }];
  applyOrder(evaluations, ['a', 'new', 'b', 'c']);
  assert.deepEqual(
    sortByIndex(evaluations).map((e) => e.id),
    ['a', 'new', 'b', 'c'],
  );
  assert.deepEqual(
    evaluations.map((e) => e.index).sort((x, y) => x - y),
    [0, 1, 2, 3],
    'every position is used exactly once',
  );
});

test('applyOrder leaves rows it was not told about alone', () => {
  const evaluations = [...rows(), { id: 'untouched', index: 9 }];
  applyOrder(evaluations, ['c', 'a']);
  assert.equal(evaluations.find((e) => e.id === 'untouched').index, 9);
  assert.equal(evaluations.find((e) => e.id === 'b').index, 1);
});

test('applyOrder ignores an empty or missing order', () => {
  const evaluations = rows();
  applyOrder(evaluations, []);
  applyOrder(evaluations, null);
  applyOrder(null, ['a']);
  assert.deepEqual(evaluations.map((e) => e.index), [0, 1, 2]);
});

test('sortByIndex does not mutate its input', () => {
  const evaluations = [{ id: 'b', index: 1 }, { id: 'a', index: 0 }];
  const sorted = sortByIndex(evaluations);
  assert.deepEqual(sorted.map((e) => e.id), ['a', 'b']);
  assert.deepEqual(evaluations.map((e) => e.id), ['b', 'a']);
});

test('sortByIndex treats a legacy record with no index as first', () => {
  const sorted = sortByIndex([{ id: 'b', index: 1 }, { id: 'legacy' }]);
  assert.deepEqual(sorted.map((e) => e.id), ['legacy', 'b']);
});

test('sortByIndex keeps stored order when indexes tie', () => {
  const sorted = sortByIndex([
    { id: 'first', index: 1 },
    { id: 'second', index: 1 },
  ]);
  assert.deepEqual(sorted.map((e) => e.id), ['first', 'second']);
});
