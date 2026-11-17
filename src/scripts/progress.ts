type LessonMeta = { id: string; h: number; p: string; u: string };
type Store = { done: Record<string, string>; notes: Record<string, string> };

const KEY = 'cs2030-progress-v1';
const meta: LessonMeta[] = JSON.parse(document.getElementById('cs-data')?.textContent || '[]');

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { done: s.done || {}, notes: s.notes || {} };
  } catch {
    return { done: {}, notes: {} };
  }
}
function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

let store = load();

function toast(msg: string) {
  let t = document.querySelector<HTMLElement>('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t!.classList.remove('show'), 1600);
}

function sumHours(filter: (m: LessonMeta) => boolean) {
  let total = 0, done = 0, count = 0, doneCount = 0;
  for (const m of meta) {
    if (!filter(m)) continue;
    total += m.h; count++;
    if (store.done[m.id]) { done += m.h; doneCount++; }
  }
  return { total, done, count, doneCount, pct: total ? (done / total) * 100 : 0 };
}

function scopeFilter(scope: string) {
  if (scope === 'all') return () => true;
  if (/^\d$/.test(scope)) return (m: LessonMeta) => m.p === scope;
  return (m: LessonMeta) => m.u === scope;
}

function render() {
  document.querySelectorAll<HTMLElement>('[data-bar]').forEach((el) => {
    const s = sumHours(scopeFilter(el.dataset.bar!));
    const i = el.querySelector('i'); if (i) i.style.width = `${s.pct.toFixed(1)}%`;
  });
  document.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
    const [kind, scope = 'all'] = el.dataset.stat!.split(':');
    const s = sumHours(scopeFilter(scope));
    if (kind === 'hours') el.textContent = String(s.done);
    if (kind === 'pct') el.textContent = `${Math.round(s.pct)}%`;
    if (kind === 'lessons') el.textContent = String(s.doneCount);
  });
  document.querySelectorAll<HTMLElement>('[data-lesson-row]').forEach((el) => {
    el.classList.toggle('is-done', !!store.done[el.dataset.lessonRow!]);
  });
  document.querySelectorAll<HTMLInputElement>('input[data-lesson-check]').forEach((el) => {
    el.checked = !!store.done[el.dataset.lessonCheck!];
  });
  document.querySelectorAll<HTMLButtonElement>('button[data-toggle-lesson]').forEach((el) => {
    const done = !!store.done[el.dataset.toggleLesson!];
    el.classList.toggle('done', done); el.classList.toggle('primary', !done);
    el.textContent = done ? '✓ Completed' : 'Mark lesson complete';
  });
  document.dispatchEvent(new CustomEvent('cs-progress', { detail: { store, meta } }));
}

function setDone(id: string, value: boolean) {
  if (value) store.done[id] = new Date().toISOString();
  else delete store.done[id];
  save(store); render();
}

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.matches('input[data-lesson-check]')) setDone(t.dataset.lessonCheck!, t.checked);
});
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-toggle-lesson]');
  if (b) { const id = b.dataset.toggleLesson!; setDone(id, !store.done[id]); toast(store.done[id] ? 'Lesson completed' : 'Marked as not done'); }
  const c = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-copy]');
  if (c) {
    const src = document.getElementById(c.dataset.copy!);
    if (src) navigator.clipboard?.writeText(src.innerText.trim()).then(() => toast('Copied'), () => toast('Copy failed'));
  }
});

// Notes for after-reading questions
document.querySelectorAll<HTMLTextAreaElement>('textarea[data-note]').forEach((ta) => {
  ta.value = store.notes[ta.dataset.note!] || '';
  ta.addEventListener('input', () => {
    if (ta.value.trim()) store.notes[ta.dataset.note!] = ta.value; else delete store.notes[ta.dataset.note!];
    save(store);
  });
});

// Export / import / reset
document.querySelector('[data-export]')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cs2030-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
});
document.querySelector<HTMLInputElement>('[data-import]')?.addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (typeof s !== 'object' || !s.done) throw new Error('bad file');
    store = { done: s.done, notes: s.notes || {} }; save(store); render(); toast('Progress imported');
  } catch { toast('That file is not a CS2030 progress export'); }
});
document.querySelector('[data-reset]')?.addEventListener('click', () => {
  if (window.confirm('Delete all progress and notes stored in this browser?')) { store = { done: {}, notes: {} }; save(store); render(); }
});

render();
