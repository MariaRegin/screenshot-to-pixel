import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, AudioLines, Check, ChevronRight, Copy, GripVertical, HardDrive, Infinity as InfinityIcon, Minus, Music2, Play, Plus, RotateCcw, Save, Square, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMetronome } from '@/hooks/use-metronome';
import { clampInteger, formDuration, parseSavedForms, presets, type Block, type Form } from '@/lib/rhythm';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Form & Groove — Practice workspace' },
    { name: 'description', content: 'Practice musical form with a precise looping metronome, custom time signatures, mixed-meter sequences, and audible section cues.' },
    { property: 'og:title', content: 'Form & Groove — Practice workspace' },
    { property: 'og:description', content: 'Find your pulse. Keep your form. A mixed-meter practice workspace for drummers and musicians.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

function Stepper({ value, onChange, label, min = 1, max = 64 }: { value: number; onChange: (value: number) => void; label: string; min?: number; max?: number }) {
  return <div className="stepper">
    <Button variant="ghost" size="icon" aria-label={`Decrease ${label}`} title={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus /></Button>
    <input type="number" aria-label={label} min={min} max={max} value={value} onChange={e => onChange(clampInteger(Number(e.target.value), min, max))} />
    <Button variant="ghost" size="icon" aria-label={`Increase ${label}`} title={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus /></Button>
  </div>;
}

function Index() {
  const [blocks, setBlocks] = useState<Block[]>(() => presets[0]?.blocks.map(b => ({ ...b })) ?? []);
  const [name, setName] = useState('Mixed Meter Journey');
  const [formId, setFormId] = useState('mixed');
  const [bpm, setBpm] = useState(120);
  const [equal, setEqual] = useState(false);
  const [volume, setVolume] = useState(75);
  const [accent, setAccent] = useState(true);
  const [transition, setTransition] = useState(true);
  const [cycleCue, setCycleCue] = useState(true);
  const [saved, setSaved] = useState<Form[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const engine = useMetronome({ blocks, bpm, equal, volume, accent, transition, cycleCue });
  const active = blocks[engine.position.block] ?? blocks[0];
  const totalBars = blocks.reduce((sum, b) => sum + b.bars, 0);
  const duration = formDuration(blocks, bpm, equal);
  const roundedDuration = Math.round(duration);
  const durationLabel = `${Math.floor(roundedDuration / 60)}:${String(roundedDuration % 60).padStart(2, '0')}`;
  useEffect(() => {
    try { setSaved(parseSavedForms(localStorage.getItem('form-groove-forms'))); }
    catch { setNotice('Device storage is unavailable. Forms will not be saved.'); }
  }, []);

  function edit(next: Block[]) {
    engine.reset();
    setBlocks(next);
    setDirty(true);
    setNotice('');
  }
  function update(id: string, patch: Partial<Block>) { edit(blocks.map(b => b.id === id ? { ...b, ...patch } : b)); }
  function move(index: number, direction: number) {
    const next = [...blocks];
    const first = next[index];
    const second = next[index + direction];
    if (!first || !second) return;
    next[index] = second; next[index + direction] = first;
    edit(next);
  }
  function load(id: string) {
    const form = [...presets, ...saved].find(f => f.id === id);
    if (!form) return;
    engine.reset(); setBlocks(form.blocks.map(b => ({ ...b }))); setName(form.name); setFormId(id); setDirty(false); setNotice('');
  }
  function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!saveName.trim()) return;
    const id = formId.startsWith('saved-') ? formId : `saved-${crypto.randomUUID()}`;
    const form = { id, name: saveName.trim(), blocks: blocks.map(b => ({ ...b })) };
    const next = [...saved.filter(f => f.id !== id), form];
    try {
      localStorage.setItem('form-groove-forms', JSON.stringify(next));
      setSaved(next); setFormId(id); setName(form.name); setDirty(false); setSaveOpen(false); setNotice('Form saved on this device');
    } catch { setNotice('Unable to save. Device storage may be full or unavailable.'); }
  }
  function deleteSaved() {
    if (!window.confirm(`Delete “${name}” from this device?`)) return;
    const next = saved.filter(f => f.id !== formId);
    try { localStorage.setItem('form-groove-forms', JSON.stringify(next)); setSaved(next); load('mixed'); }
    catch { setNotice('Unable to delete the saved form.'); }
  }

  return <main className="workspace">
    <header className="app-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span><span>Form <span className="text-primary">&</span> Groove</span></div>
      <div className="header-meta"><span className="status-dot" /><span className="desktop-meta">IN THE POCKET</span><span className="desktop-meta mx-2 text-border">/</span><span>Practice workspace</span></div>
    </header>

    <section className="page-heading">
      <div><div className="eyebrow">Your practice, in sequence</div><h1>{name}{dirty && <span className="text-muted-foreground"> *</span>}</h1></div>
      <div className="heading-actions">
        <select aria-label="Choose a form" className="form-select" value={formId} onChange={e => load(e.target.value)}>
          <optgroup label="Built-in forms">{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
          {saved.length > 0 && <optgroup label="Your saved forms">{saved.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
        </select>
        <Button variant="outline" onClick={() => { setSaveName(name); setSaveOpen(true); }}><Save />Save form</Button>
        {formId.startsWith('saved-') && <Button variant="ghost" size="icon" title="Delete saved form" aria-label="Delete saved form" onClick={deleteSaved}><Trash2 /></Button>}
      </div>
    </section>

    <section className="practice-grid" aria-label="Metronome">
      <div className="stage">
        <div className="stage-top"><div className="live-label"><span className="status-dot" />{engine.playing ? 'Playing' : 'Ready to groove'}<ChevronRight size={12} /><span>Block {engine.position.block + 1}</span></div><div className="cycle-label"><InfinityIcon size={15} />Cycle {engine.position.cycle}</div></div>
        <div className="counter-area">
          <div className={`beat-counter ${(active?.numerator ?? 4) > 9 ? 'multi-digit' : ''}`} aria-label={`Beat ${engine.position.beat} of ${active?.numerator ?? 4}`}><span className="beat-number">{engine.position.beat}</span><span className="beat-total">/ {active?.numerator}</span></div>
          <div className="meter-readout"><div className="eyebrow">Time signature</div><strong>{active?.numerator}/{active?.denominator}</strong><div className="eyebrow">Current bar</div><p><b>{engine.position.bar}</b> &nbsp;of {active?.bars}</p></div>
        </div>
        <div className="beat-leds" aria-hidden="true">{active && active.numerator <= 16 ? Array.from({ length: active.numerator }, (_, i) => <span key={i} className={`beat-led ${i + 1 === engine.position.beat ? 'is-on' : ''} ${i === 0 ? 'is-downbeat' : ''}`} />) : <progress className="large-progress" value={engine.position.beat} max={active?.numerator ?? 1} />}</div>
        <div className="transport">
          <Button variant="outline" size="icon" className="reset-button" onClick={engine.reset} title="Reset to the top" aria-label="Reset to the top"><RotateCcw /></Button>
          <Button className="play-button" onClick={() => { if (engine.playing) engine.stop(); else void engine.start(); }}>{engine.playing ? <Square fill="currentColor" /> : <Play fill="currentColor" />}{engine.playing ? 'Stop playback' : 'Start playback'}</Button>
        </div>
        <div className="stage-bottom"><div className="cue-legend"><span className="legend-item"><i className="legend-dot regular" />Beat</span><span className="legend-item"><i className="legend-dot transition" />Block end</span><span className="legend-item"><i className="legend-dot" />Cycle start</span></div><span>{durationLabel} per cycle</span></div>
        {engine.error && <p className="mt-4 text-sm text-destructive" role="alert">{engine.error}</p>}
      </div>

      <aside className="settings" aria-label="Tempo and audio settings">
        <div className="eyebrow">Tempo</div>
        <div className="tempo-value"><div className="flex items-baseline gap-1"><input className="tempo-input" type="number" min={30} max={300} aria-label="Tempo BPM" value={bpm} onChange={e => setBpm(clampInteger(Number(e.target.value), 30, 300))} /><span className="tempo-unit">BPM</span></div><div className="tempo-controls"><Button variant="outline" size="icon" title="Decrease tempo" aria-label="Decrease tempo" disabled={bpm <= 30} onClick={() => setBpm(b => b - 1)}><Minus /></Button><Button variant="outline" size="icon" title="Increase tempo" aria-label="Increase tempo" disabled={bpm >= 300} onClick={() => setBpm(b => b + 1)}><Plus /></Button></div></div>
        <input className="range-input" type="range" aria-label="Tempo slider" min={30} max={300} value={bpm} onChange={e => setBpm(Number(e.target.value))} /><div className="range-labels"><span>30</span><span>300 BPM</span></div>
        <div className="setting-divider" />
        <div className="setting-row"><label htmlFor="equal-mode">Equal beat mode</label><Switch id="equal-mode" checked={equal} onCheckedChange={setEqual} /></div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AudioLines size={13} />{equal ? 'One beat = one quarter-note pulse' : 'Quarter-note pulse · meter-scaled beats'}</div>
        <div className="setting-divider" />
        <div className="eyebrow">Audio cues</div>
        <div className="setting-row"><label htmlFor="accent">Accent first beat</label><Switch id="accent" checked={accent} onCheckedChange={setAccent} /></div>
        <div className="setting-row"><label htmlFor="transition">Block transition</label><Switch id="transition" checked={transition} onCheckedChange={setTransition} /></div>
        <div className="setting-row"><label htmlFor="cycle-cue">Cycle reset</label><Switch id="cycle-cue" checked={cycleCue} onCheckedChange={setCycleCue} /></div>
        <div className="volume-row"><Volume2 size={17} /><input type="range" className="range-input" aria-label="Click volume" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} /><span className="text-[10px] tabular-nums">{volume}%</span></div>
      </aside>
    </section>

    <section className="sequence-section" aria-label="Form sequence">
      <div className="section-heading"><div className="section-title"><h2>Form sequence</h2><span className="section-summary">{blocks.length} blocks <span className="mx-1">·</span> {totalBars} bars <span className="mx-1">·</span> <InfinityIcon size={12} className="inline" /> Loop</span></div><Button variant="ghost" size="sm" onClick={() => edit([...blocks, { id: crypto.randomUUID(), bars: 4, numerator: 4, denominator: 4 }])}><Plus />Add block</Button></div>
      <div className="sequence-grid">{blocks.map((block, index) => <article key={block.id} className={`block-card ${index === engine.position.block ? 'active' : ''}`} aria-label={`Block ${index + 1}`}>
        <div className="block-heading"><div className="block-label"><GripVertical size={13} />BLOCK {String(index + 1).padStart(2, '0')}</div><div className="block-actions"><Button variant="ghost" size="icon" disabled={index === 0} aria-label={`Move block ${index + 1} earlier`} title="Move earlier" onClick={() => move(index, -1)}><ArrowUp /></Button><Button variant="ghost" size="icon" disabled={index === blocks.length - 1} aria-label={`Move block ${index + 1} later`} title="Move later" onClick={() => move(index, 1)}><ArrowDown /></Button><Button variant="ghost" size="icon" aria-label={`Duplicate block ${index + 1}`} title="Duplicate block" onClick={() => { const next = [...blocks]; next.splice(index + 1, 0, { ...block, id: crypto.randomUUID() }); edit(next); }}><Copy /></Button></div></div>
        <div className="block-meter">{block.numerator}<span className="text-muted-foreground">/</span>{block.denominator}</div>
        <div className="quick-meters">{[[4,4],[3,4],[5,4],[7,8]].map(([n,d]) => <Button key={`${n}/${d}`} variant={block.numerator === n && block.denominator === d ? 'secondary' : 'ghost'} title={`Set block ${index + 1} to ${n}/${d}`} onClick={() => { if (n && d) update(block.id, { numerator: n, denominator: d }); }}>{n}/{d}</Button>)}</div>
        <div className="block-editor"><div className="editor-row"><label>Bars</label><Stepper value={block.bars} label={`Block ${index + 1} bars`} onChange={bars => update(block.id, { bars })} /></div><div className="editor-row"><label>Numerator</label><Stepper value={block.numerator} label={`Block ${index + 1} numerator`} onChange={numerator => update(block.id, { numerator })} /></div><div className="editor-row"><label>Denominator</label><Stepper value={block.denominator} label={`Block ${index + 1} denominator`} onChange={denominator => update(block.id, { denominator })} /></div></div>
        <div className="block-footer"><span>{block.bars * block.numerator} beats <span className="mx-1">·</span> {index === engine.position.block ? 'Current block' : `Section ${index + 1}`}</span><Button variant="ghost" size="icon" title="Delete block" aria-label={`Delete block ${index + 1}`} disabled={blocks.length <= 1} onClick={() => edit(blocks.filter(b => b.id !== block.id))}><Trash2 /></Button></div>
      </article>)}</div>
    </section>
    <footer className="app-footer"><span className="footer-note"><Music2 size={14} />Find your pulse. Keep your form.</span><span className="footer-note"><HardDrive size={13} />Saved on your device <span className="mx-1">·</span> Made for the woodshed</span></footer>
    {notice && <p role="status" className="save-message pb-5 flex items-center gap-2"><Check size={14} />{notice}</p>}
    <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent><DialogHeader><DialogTitle>Save your form</DialogTitle><DialogDescription>Your form stays on this device, ready for your next session.</DialogDescription></DialogHeader><form onSubmit={saveForm} className="flex flex-col gap-4"><label className="text-sm" htmlFor="form-name">Form name</label><input autoFocus id="form-name" className="save-input" value={saveName} maxLength={80} onChange={e => setSaveName(e.target.value)} required /><Button type="submit" disabled={!saveName.trim()}><Save />Save form</Button>{notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}</form></DialogContent></Dialog>
  </main>;
}
