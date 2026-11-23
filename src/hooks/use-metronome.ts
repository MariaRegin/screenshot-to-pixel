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
      let cursor = { ...initialPosition };
      let nextTime = ctx.currentTime + 0.06;
      function tone(time: number, frequency: number, length: number, level: number, shape: OscillatorType = 'sine') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = shape;
        osc.frequency.setValueAtTime(frequency, time);
        gain.gain.setValueAtTime(Math.max(0.00001, level), time);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + length);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(time); osc.stop(time + length);
      }
      function tick() {
        const opt = latest.current;
        while (nextTime < ctx.currentTime + 0.12) {
          const block = opt.blocks[cursor.block];
          if (!block) return;
          const cues = cueFor(cursor, opt.blocks);
          const level = opt.volume / 100 * 0.45;
          tone(nextTime, cues.downbeat && opt.accent ? 1450 : 900, 0.035, level, 'triangle');
          if (cues.transition && opt.transition) tone(nextTime, 2200, 0.11, level * 0.7);
          if (cues.cycle && opt.cycleCue) {
            tone(nextTime, 2600, 0.22, level * 0.7);
            tone(nextTime, 3300, 0.17, level * 0.35);
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