export type Block = { id: string; bars: number; numerator: number; denominator: number };
export type Position = { block: number; bar: number; beat: number; cycle: number };
export type Form = { id: string; name: string; blocks: Block[] };
export const initialPosition: Position = { block: 0, bar: 1, beat: 1, cycle: 1 };
export const clampInteger = (value: number, min = 1, max = 64) => Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));
export function beatDuration(bpm: number, denominator: number, equal = false) {
  return (60 / clampInteger(bpm, 30, 300)) * (equal ? 1 : 4 / denominator);
}
export function advancePosition(position: Position, blocks: Block[]): Position {
  const current = blocks[position.block];
  if (!current) return { ...initialPosition };
  if (position.beat < current.numerator) return { ...position, beat: position.beat + 1 };
  if (position.bar < current.bars) return { ...position, beat: 1, bar: position.bar + 1 };
  if (position.block < blocks.length - 1) return { ...position, beat: 1, bar: 1, block: position.block + 1 };
  return { ...initialPosition, cycle: position.cycle + 1 };
}
export function cueFor(position: Position, blocks: Block[]) {
  const current = blocks[position.block];
  return {
    downbeat: position.beat === 1,
    transition: Boolean(current && position.block > 0 && position.bar === 1 && position.beat === 1),
    cycle: position.block === 0 && position.bar === 1 && position.beat === 1 && position.cycle > 1,
  };
}
export function formDuration(blocks: Block[], bpm: number, equal = false) {
  return blocks.reduce((sum, b) => sum + b.bars * b.numerator * beatDuration(bpm, b.denominator, equal), 0);
}
export const presets: Form[] = [
  { id: 'mixed', name: 'Mixed Meter Journey', blocks: [
    { id: 'a', bars: 4, numerator: 4, denominator: 4 },
    { id: 'b', bars: 3, numerator: 3, denominator: 4 },
    { id: 'c', bars: 5, numerator: 11, denominator: 16 },
    { id: 'd', bars: 2, numerator: 5, denominator: 2 },
  ] },
  { id: 'jazz', name: 'Jazz · 32-bar AABA', blocks: ['a','b','c','d'].map(id => ({ id, bars: 8, numerator: 4, denominator: 4 })) },
  { id: 'odd', name: 'Odd Pocket · 7 & 5', blocks: [{ id: 'a', bars: 4, numerator: 7, denominator: 8 }, { id: 'b', bars: 4, numerator: 5, denominator: 4 }] },
  { id: 'waltz', name: 'Waltz · 3/4', blocks: [{ id: 'a', bars: 8, numerator: 3, denominator: 4 }] },
];
export function parseSavedForms(raw: string | null): Form[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((f): f is Form => {
      if (!f || typeof f !== 'object' || typeof f.id !== 'string' || typeof f.name !== 'string' || !Array.isArray(f.blocks) || !f.blocks.length) return false;
      return f.blocks.every((b: Block) => b && typeof b.id === 'string' && [b.bars, b.numerator, b.denominator].every(n => Number.isInteger(n) && n >= 1 && n <= 64));
    });
  } catch { return []; }
}