import { useEffect, useRef, useState } from 'react';
import { advancePosition, beatDuration, cueFor, initialPosition, type Block, type Position } from '@/lib/rhythm';

type Options = { blocks: Block[]; bpm: number; equal: boolean; volume: number; accent: boolean; transition: boolean; cycleCue: boolean };
export function useMetronome(options: Options) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<Position>({ ...initialPosition });
  const [error, setError] = useState('');
  const latest = useRef(options);
  const audio = useRef<AudioContext | null>(null);
  const scheduler = useRef<ReturnType<typeof setInterval> | null>(null);
  const visuals = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const generation = useRef(0);
  useEffect(() => { latest.current = options; }, [options]);

  function stop() {
    generation.current += 1;
    if (scheduler.current) clearInterval(scheduler.current);
    scheduler.current = null;
    visuals.current.forEach(clearTimeout);
    visuals.current.clear();
    const ctx = audio.current;
    audio.current = null;
    if (ctx) void ctx.close();
    setPlaying(false);
  }
  function reset() { stop(); setPosition({ ...initialPosition }); }
  async function start() {
    stop();
    const token = generation.current;
    setError('');
    try {
      const ctx = new AudioContext();
      audio.current = ctx;
      await ctx.resume();
      if (token !== generation.current) return;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, ctx.currentTime);
      compressor.knee.setValueAtTime(6, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.001, ctx.currentTime);
      compressor.release.setValueAtTime(0.08, ctx.currentTime);
      compressor.connect(ctx.destination);

      let cursor = { ...initialPosition };
      let nextTime = ctx.currentTime + 0.06;
      function tone(time: number, frequency: number, length: number, level: number, shape: OscillatorType = 'triangle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = shape;
        osc.frequency.setValueAtTime(frequency, time);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.75, time + length);
        gain.gain.setValueAtTime(Math.max(0.00001, level), time);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + length);
        osc.connect(gain);
        gain.connect(compressor);
        osc.start(time);
        osc.stop(time + length);
      }
      function tick() {
        const opt = latest.current;
        while (nextTime < ctx.currentTime + 0.12) {
          const block = opt.blocks[cursor.block];
          if (!block) return;
          const cues = cueFor(cursor, opt.blocks);
          const level = (opt.volume / 100) * 1.15;
          tone(nextTime, cues.downbeat && opt.accent ? 1500 : 950, 0.055, level, 'square');
          if (cues.transition && opt.transition) {
            tone(nextTime, 2200, 0.14, level * 1.1, 'triangle');
          }
          if (cues.cycle && opt.cycleCue) {
            tone(nextTime, 2600, 0.25, level * 1.2, 'triangle');
            tone(nextTime, 3300, 0.20, level * 0.75, 'square');
          }
          const display = { ...cursor };
          const timer = setTimeout(() => { visuals.current.delete(timer); setPosition(display); }, Math.max(0, (nextTime - ctx.currentTime) * 1000));
          visuals.current.add(timer);
          nextTime += beatDuration(opt.bpm, block.denominator, opt.equal);
          cursor = advancePosition(cursor, opt.blocks);
        }
      }
      setPlaying(true);
      tick();
      scheduler.current = setInterval(tick, 25);
    } catch { stop(); setError('Audio could not start. Try starting playback again.'); }
  }
  useEffect(() => () => {
    generation.current += 1;
    if (scheduler.current) clearInterval(scheduler.current);
    visuals.current.forEach(clearTimeout);
    if (audio.current) void audio.current.close();
  }, []);
  return { playing, position, error, start, stop, reset };
}
