import { describe, expect, it } from 'vitest';
import { advancePosition, beatDuration, clampInteger, cueFor, formDuration, initialPosition, parseSavedForms, presets, type Block } from '@/lib/rhythm';

const blocks: Block[] = [{ id: 'a', bars: 4, numerator: 4, denominator: 4 }, { id: 'b', bars: 3, numerator: 3, denominator: 4 }, { id: 'c', bars: 5, numerator: 11, denominator: 16 }, { id: 'd', bars: 2, numerator: 5, denominator: 2 }];
describe('Universal rhythm rules', () => {
  it('supports the requested 30–300 BPM range', () => { expect(clampInteger(20, 30, 300)).toBe(30); expect(clampInteger(400, 30, 300)).toBe(300); });
  it('supports integer numerator and denominator values 1–64', () => { expect(clampInteger(0)).toBe(1); expect(clampInteger(65)).toBe(64); expect(clampInteger(13)).toBe(13); });
  it('scales denominator-relative clicks from quarter-note BPM', () => { expect(beatDuration(120, 4)).toBe(0.5); expect(beatDuration(120, 8)).toBe(0.25); expect(beatDuration(120, 16)).toBe(0.125); expect(beatDuration(120, 2)).toBe(1); });
  it('supports irrational/nonstandard denominators without rounding the duration', () => { expect(beatDuration(120, 13)).toBeCloseTo(2 / 13, 12); expect(beatDuration(120, 64)).toBe(0.03125); });
  it('equal beat mode always uses 60/BPM regardless of denominator', () => { for (const d of [2,4,8,13,16,64]) expect(beatDuration(120, d, true)).toBe(0.5); });
  it('advances beats and bars according to the active numerator', () => { expect(advancePosition(initialPosition, blocks)).toEqual({ block: 0, bar: 1, beat: 2, cycle: 1 }); expect(advancePosition({ block: 2, bar: 1, beat: 11, cycle: 1 }, blocks)).toEqual({ block: 2, bar: 2, beat: 1, cycle: 1 }); });
  it('changes section on the last beat of its final bar', () => { expect(advancePosition({ block: 0, bar: 4, beat: 4, cycle: 1 }, blocks)).toEqual({ block: 1, bar: 1, beat: 1, cycle: 1 }); });
  it('continuously loops to the top after the final section', () => { expect(advancePosition({ block: 3, bar: 2, beat: 5, cycle: 3 }, blocks)).toEqual({ block: 0, bar: 1, beat: 1, cycle: 4 }); });
  it('accents beat one in every meter', () => { expect(cueFor({ block: 2, bar: 2, beat: 1, cycle: 1 }, blocks).downbeat).toBe(true); expect(cueFor({ block: 2, bar: 2, beat: 2, cycle: 1 }, blocks).downbeat).toBe(false); });
  it('signals the last beat of a block, not every last beat of a bar', () => { expect(cueFor({ block: 2, bar: 5, beat: 11, cycle: 1 }, blocks).transition).toBe(true); expect(cueFor({ block: 2, bar: 4, beat: 11, cycle: 1 }, blocks).transition).toBe(false); });
  it('signals beat one of the new cycle only', () => { expect(cueFor({ ...initialPosition, cycle: 2 }, blocks).cycle).toBe(true); expect(cueFor(initialPosition, blocks).cycle).toBe(false); expect(cueFor({ ...initialPosition, beat: 2, cycle: 2 }, blocks).cycle).toBe(false); });
  it('ships the exact mixed-meter example form', () => { expect(presets[0]?.blocks).toEqual(blocks); expect(formDuration(blocks, 120)).toBe(29.375); });
  it('roundtrips custom forms through local storage serialization', () => { const form = { id: 'custom', name: '13 over 17', blocks: [{ id: 'x', bars: 2, numerator: 13, denominator: 17 }] }; expect(parseSavedForms(JSON.stringify([form]))).toEqual([form]); expect(parseSavedForms('broken')).toEqual([]); expect(parseSavedForms('[{"id":"x","name":"bad","blocks":[{"id":"b","bars":1,"numerator":65,"denominator":4}]}]')).toEqual([]); });
});