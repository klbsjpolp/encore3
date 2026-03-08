import { describe, expect, it } from 'vitest';
import { getSelectionLimit, MAX_SELECTABLE_CELLS } from './game-rules';

describe('game-rules', () => {
  it('returns the die value when number die is 1 to 5', () => {
    expect(getSelectionLimit(1)).toBe(1);
    expect(getSelectionLimit(5)).toBe(5);
  });

  it('caps selection to 5 when number die is wild', () => {
    expect(getSelectionLimit('wild')).toBe(MAX_SELECTABLE_CELLS);
  });

  it('defaults to 5 when no number die is selected', () => {
    expect(getSelectionLimit(undefined)).toBe(MAX_SELECTABLE_CELLS);
  });
});
