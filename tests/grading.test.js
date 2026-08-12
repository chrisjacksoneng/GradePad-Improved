import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumber,
  lostPoints,
  courseMark,
  weightedAverage,
} from '../gradepad/jsScripts/grading.js';

test('parseNumber reads marks and rejects junk', () => {
  assert.equal(parseNumber('84.32'), 84.32);
  assert.equal(parseNumber('84.32%'), 84.32, 'the mark cell renders a percent sign');
  assert.equal(parseNumber('0'), 0);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('   '), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(undefined), null);
  assert.equal(parseNumber(Infinity), null);
});

test('lostPoints measures the gap from full marks against the weight', () => {
  assert.equal(lostPoints(80, 10), -2);
  assert.equal(lostPoints(100, 20), 0);
  assert.equal(lostPoints(110, 10), 1, 'bonus marks read as a gain');
});

test('lostPoints treats an unscorable row as nothing', () => {
  assert.equal(lostPoints(null, 10), null);
  assert.equal(lostPoints(80, null), null);
  assert.equal(lostPoints(80, 0), null, 'a zero-weight row cannot move a mark');
});

test('courseMark averages over the weight entered so far', () => {
  assert.equal(courseMark([{ grade: 80, weight: 50 }]), 80);
  assert.equal(
    courseMark([{ grade: 80, weight: 50 }, { grade: 90, weight: 50 }]),
    85,
  );
  assert.equal(
    courseMark([{ grade: 90, weight: 30 }]),
    90,
    'a course only 30% graded reads 90, not 27',
  );
});

test('courseMark ignores rows that are not scorable', () => {
  assert.equal(courseMark([]), null);
  assert.equal(courseMark([{ grade: null, weight: 50 }]), null);
  assert.equal(courseMark([{ grade: 80, weight: null }]), null);
  assert.equal(
    courseMark([{ grade: 80, weight: 50 }, { grade: 0, weight: 0 }]),
    80,
    'a zero-weight row must not drag the mark down',
  );
});

test('courseMark keeps a zero grade in the average', () => {
  assert.equal(courseMark([{ grade: 0, weight: 50 }, { grade: 100, weight: 50 }]), 50);
});

test('weightedAverage weights each course by its units', () => {
  assert.equal(
    weightedAverage([{ mark: 90, units: 0.5 }, { mark: 80, units: 0.5 }]),
    85,
  );
  const mixed = weightedAverage([{ mark: 90, units: 0.5 }, { mark: 80, units: 1 }]);
  assert.ok(Math.abs(mixed - 83.3333) < 0.001, `expected ~83.33, got ${mixed}`);
});

test('weightedAverage reports nothing when no course carries a mark', () => {
  assert.equal(weightedAverage([]), null);
  assert.equal(weightedAverage([{ mark: null, units: 0.5 }]), null);
  assert.equal(weightedAverage([{ mark: 90, units: null }]), null);
});
