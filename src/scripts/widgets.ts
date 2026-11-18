// Interactive widgets for lesson notes. A widget is any element with data-widget="name".
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/* ---------------- Truth tables ---------------- */
type Expr = { t: 'var'; v: string } | { t: 'const'; v: boolean } | { t: 'not'; a: Expr } | { t: 'bin'; op: string; a: Expr; b: Expr };

function tokenize(src: string): string[] {
  const s = src.replace(/<->|↔|<=>/g, ' IFF ').replace(/->|→|=>/g, ' IMP ').replace(/[∧&]+/g, ' AND ').replace(/[∨|]+/g, ' OR ')
    .replace(/\bxor\b|⊕/gi, ' XOR ').replace(/[¬~!]/g, ' NOT ').replace(/\(/g, ' ( ').replace(/\)/g, ' ) ')
    .replace(/\band\b/gi, ' AND ').replace(/\bor\b/gi, ' OR ').replace(/\bnot\b/gi, ' NOT ');
  return s.split(/\s+/).filter(Boolean);
}

function parse(src: string): Expr {
  const tk = tokenize(src);
  let i = 0;
  const peek = () => tk[i];
  const eat = (x?: string) => { const t = tk[i++]; if (x && t !== x) throw new Error(`expected "${x}" but found "${t ?? 'end'}"`); return t; };
  const prec: Record<string, number> = { IFF: 1, IMP: 2, OR: 3, XOR: 3, AND: 4 };
  function primary(): Expr {
    const t = peek();
    if (t === undefined) throw new Error('unexpected end of formula');
    if (t === 'NOT') { eat(); return { t: 'not', a: primary() }; }
    if (t === '(') { eat(); const n = expr(0); eat(')'); return n; }
    if (t === 'T' || t === '1') { eat(); return { t: 'const', v: true }; }
    if (t === 'F' || t === '0') { eat(); return { t: 'const', v: false }; }
    if (/^[a-z]$/.test(t)) { eat(); return { t: 'var', v: t }; }
    throw new Error(`unexpected "${t}" (use single lowercase letters for variables)`);
  }
  function expr(min: number): Expr {
    let left = primary();
    for (let op = peek(); op !== undefined && prec[op] !== undefined && prec[op] >= min; op = peek()) {
      eat();
      // IMP is right-associative; the others are left-associative
      const right = expr(op === 'IMP' ? prec[op] : prec[op] + 1);
      left = { t: 'bin', op, a: left, b: right };
    }
    return left;
  }
  const n = expr(1);
  if (i < tk.length) throw new Error(`unexpected "${tk[i]}"`);
  return n;
}

function evalNode(n: Expr, env: Record<string, boolean>): boolean {
  switch (n.t) {
    case 'var': return env[n.v];
    case 'const': return n.v;
    case 'not': return !evalNode(n.a, env);
    case 'bin': {
      const a = evalNode(n.a, env), b = evalNode(n.b, env);
      return n.op === 'AND' ? a && b : n.op === 'OR' ? a || b : n.op === 'XOR' ? a !== b : n.op === 'IMP' ? !a || b : a === b;
    }
  }
}
function vars(n: Expr, acc = new Set<string>()): Set<string> {
  if (n.t === 'var') acc.add(n.v);
  else if (n.t === 'not') vars(n.a, acc);
  else if (n.t === 'bin') { vars(n.a, acc); vars(n.b, acc); }
  return acc;
}

function truthTable(el: HTMLElement) {
  const a0 = el.dataset.a || 'p -> q', b0 = el.dataset.b || '!p | q';
  el.innerHTML = `<div class="w-title">Truth-table lab</div>
    <div class="small muted">Operators: <code>!</code> not, <code>&amp;</code> and, <code>|</code> or, <code>-&gt;</code> implies, <code>&lt;-&gt;</code> iff, <code>xor</code>. Variables are single letters.</div>
    <div class="row"><input type="text" data-a value="${esc(a0)}" aria-label="Formula A"><input type="text" data-b value="${esc(b0)}" aria-label="Formula B (optional)" placeholder="Formula B (optional, to compare)"></div>
    <div class="chips">${[['p -> q', '!q -> !p'], ['p -> q', 'q -> p'], ['!(p & q)', '!p | !q'], ['p & (q | r)', '(p & q) | (p & r)'], ['(p -> q) & p', 'q'], ['p | !p', '']].map(([x, y]) => `<button type="button" data-x="${esc(x)}" data-y="${esc(y)}">${esc(x)}${y ? ' vs ' + esc(y) : ''}</button>`).join('')}</div>
    <div class="out"></div>`;
  const ia = el.querySelector<HTMLInputElement>('[data-a]')!, ib = el.querySelector<HTMLInputElement>('[data-b]')!, out = el.querySelector<HTMLElement>('.out')!;
  const run = () => {
    try {
      const fa = parse(ia.value);
      const fb = ib.value.trim() ? parse(ib.value) : null;
      const vs = [...vars(fa)].concat(fb ? [...vars(fb)] : []).filter((v, i, arr) => arr.indexOf(v) === i).sort();
      if (vs.length > 5) throw new Error('use at most 5 variables');
      const rows: string[] = [];
      let allA = true, noneA = true, equiv = true, firstDiff = -1;
      const n = 1 << vs.length;
      for (let r = 0; r < n; r++) {
        const env: Record<string, boolean> = {};
        vs.forEach((v, k) => (env[v] = !((r >> (vs.length - 1 - k)) & 1)));
        const va = evalNode(fa, env), vb = fb ? evalNode(fb, env) : null;
        allA &&= va; noneA &&= !va;
        if (fb && va !== vb) { equiv = false; if (firstDiff < 0) firstDiff = r + 1; }
        rows.push(`<tr>${vs.map((v) => `<td class="${env[v] ? 't' : 'f'}">${env[v] ? 'T' : 'F'}</td>`).join('')}<td class="${va ? 't' : 'f'}">${va ? 'T' : 'F'}</td>${fb ? `<td class="${vb ? 't' : 'f'}">${vb ? 'T' : 'F'}</td>` : ''}</tr>`);
      }
      const kind = allA ? 'A is a <b>tautology</b> (true in every row).' : noneA ? 'A is a <b>contradiction</b> (false in every row).' : 'A is <b>contingent</b> (true in some rows, false in others).';
      const cmp = fb ? (equiv ? '<span class="ok">A and B are logically equivalent.</span>' : `<span class="err">Not equivalent: they differ first in row ${firstDiff}.</span>`) : '';
      out.innerHTML = `<table><thead><tr>${vs.map((v) => `<th>${v}</th>`).join('')}<th>A</th>${fb ? '<th>B</th>' : ''}</tr></thead><tbody>${rows.join('')}</tbody></table><p>${kind} ${cmp}</p>`;
    } catch (e) { out.innerHTML = `<p class="err">${esc((e as Error).message)}</p>`; }
  };
  ia.addEventListener('input', run); ib.addEventListener('input', run);
  el.querySelectorAll<HTMLButtonElement>('.chips button').forEach((b) => b.addEventListener('click', () => { ia.value = b.dataset.x!; ib.value = b.dataset.y!; run(); }));
  run();
}

/* ---------------- Relation properties ---------------- */
function relation(el: HTMLElement) {
  el.innerHTML = `<div class="w-title">Relation inspector</div>
    <div class="small muted">A relation on the set {1, …, n}. Type pairs like <code>(1,2) (2,3)</code>.</div>
    <div class="row"><label style="flex:0 0 120px">n = <input type="number" min="1" max="8" value="${el.dataset.n || 3}" data-n style="width:70px"></label><input type="text" data-r value="${esc(el.dataset.r || '(1,1) (2,2) (3,3) (1,2) (2,1)')}" aria-label="Pairs"></div>
    <div class="chips"><button type="button" data-p="(1,1) (2,2) (3,3) (1,2) (2,1)">equivalence</button><button type="button" data-p="(1,1) (2,2) (3,3) (1,2) (2,3) (1,3)">partial order (≤)</button><button type="button" data-p="(1,2) (2,3)">not transitive</button><button type="button" data-p="(1,2) (2,1) (1,1)">symmetric, not reflexive</button></div>
    <div class="out"></div>`;
  const nI = el.querySelector<HTMLInputElement>('[data-n]')!, rI = el.querySelector<HTMLInputElement>('[data-r]')!, out = el.querySelector<HTMLElement>('.out')!;
  const run = () => {
    const n = Math.max(1, Math.min(8, +nI.value || 1));
    const pairs = [...rI.value.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)].map((m) => [+m[1], +m[2]] as [number, number]);
    const bad = pairs.find(([a, b]) => a < 1 || b < 1 || a > n || b > n);
    if (bad) { out.innerHTML = `<p class="err">(${bad[0]},${bad[1]}) is outside {1,…,${n}}.</p>`; return; }
    const R = new Set(pairs.map(([a, b]) => `${a},${b}`));
    const has = (a: number, b: number) => R.has(`${a},${b}`);
    const U = Array.from({ length: n }, (_, i) => i + 1);
    let refl = '', sym = '', anti = '', trans = '';
    for (const a of U) if (!refl && !has(a, a)) refl = `(${a},${a}) is missing`;
    for (const a of U) for (const b of U) {
      if (!sym && has(a, b) && !has(b, a)) sym = `(${a},${b}) is in R but (${b},${a}) is not`;
      if (!anti && a !== b && has(a, b) && has(b, a)) anti = `both (${a},${b}) and (${b},${a}) are in R`;
      for (const c of U) if (!trans && has(a, b) && has(b, c) && !has(a, c)) trans = `(${a},${b}) and (${b},${c}) are in R but (${a},${c}) is not`;
    }
    const line = (name: string, why: string) => `<div class="prop">${why ? '✗' : '✓'} <b>${name}</b>${why ? ` <span class="muted">— ${why}</span>` : ''}</div>`;
    let extra = '';
    if (!refl && !sym && !trans) {
      const seen = new Set<number>(); const classes: number[][] = [];
      for (const a of U) if (!seen.has(a)) { const c = U.filter((b) => has(a, b)); c.forEach((x) => seen.add(x)); classes.push(c); }
      extra = `<p class="ok">Equivalence relation. Classes: ${classes.map((c) => `{${c.join(', ')}}`).join(', ')}</p>`;
    } else if (!refl && !anti && !trans) extra = '<p class="ok">Partial order.</p>';
    const matrix = `<table><tr><th></th>${U.map((b) => `<th>${b}</th>`).join('')}</tr>${U.map((a) => `<tr><th>${a}</th>${U.map((b) => `<td class="${has(a, b) ? 't' : 'f'}">${has(a, b) ? '1' : '0'}</td>`).join('')}</tr>`).join('')}</table>`;
    out.innerHTML = `${line('reflexive', refl)}${line('symmetric', sym)}${line('antisymmetric', anti)}${line('transitive', trans)}${extra}<div class="small muted" style="margin-top:8px">Matrix (row a, column b is 1 when a R b):</div>${matrix}`;
  };
  nI.addEventListener('input', run); rI.addEventListener('input', run);
  el.querySelectorAll<HTMLButtonElement>('.chips button').forEach((b) => b.addEventListener('click', () => { nI.value = '3'; rI.value = b.dataset.p!; run(); }));
  run();
}

/* ---------------- Birthday paradox ---------------- */
function birthday(el: HTMLElement) {
  el.innerHTML = `<div class="w-title">Birthday paradox simulator</div>
    <div class="row"><label>People (k): <input type="number" data-k min="2" max="200" value="23"></label><label>Days (N): <input type="number" data-d min="2" max="100000" value="365"></label><button type="button" class="btn" data-run style="flex:0 0 auto">Run 20,000 trials</button></div>
    <div class="out"></div>`;
  const kI = el.querySelector<HTMLInputElement>('[data-k]')!, dI = el.querySelector<HTMLInputElement>('[data-d]')!, out = el.querySelector<HTMLElement>('.out')!;
  const exact = (k: number, N: number) => { let p = 1; for (let i = 0; i < k; i++) p *= (N - i) / N; return 1 - p; };
  const run = (sim: boolean) => {
    const k = Math.max(2, Math.min(200, +kI.value || 2)), N = Math.max(2, +dI.value || 365);
    let html = `<p>Exact probability that at least two of ${k} share a day: <b>${(exact(k, N) * 100).toFixed(2)}%</b>. Approximation 1 − e<sup>−k(k−1)/2N</sup> = ${((1 - Math.exp((-k * (k - 1)) / (2 * N))) * 100).toFixed(2)}%.</p>`;
    if (sim) {
      let hits = 0; const T = 20000; const seen = new Uint32Array(N);
      for (let t = 1; t <= T; t++) { for (let i = 0; i < k; i++) { const d = Math.floor(Math.random() * N); if (seen[d] === t) { hits++; break; } seen[d] = t; } }
      html += `<p>Simulation: ${hits} of ${T} trials had a shared day → <b>${((hits / T) * 100).toFixed(2)}%</b>.</p>`;
    }
    out.innerHTML = html;
  };
  kI.addEventListener('input', () => run(false)); dI.addEventListener('input', () => run(false));
  el.querySelector('[data-run]')!.addEventListener('click', () => run(true));
  run(false);
}

/* ---------------- Graph analyser ---------------- */
function graph(el: HTMLElement) {
  el.innerHTML = `<div class="w-title">Graph analyser (undirected)</div>
    <div class="small muted">One edge per line, e.g. <code>a b</code>. A single name on a line adds an isolated vertex.</div>
    <textarea data-g aria-label="Edges">${esc((el.dataset.g || 'a b\nb c\nc d\nd a\nb d').replace(/\\n/g, '\n'))}</textarea>
    <div class="chips"><button type="button" data-p="A B\nA B\nA C\nA C\nA D\nB D\nC D">Königsberg</button><button type="button" data-p="1 2\n1 3\n2 4\n2 5\n3 6">a tree</button><button type="button" data-p="a b\nb c\nc a\nd e">triangle + edge</button><button type="button" data-p="1 2\n2 3\n3 4\n4 5\n5 6\n6 1">even cycle C6</button></div>
    <div class="out"></div>`;
  const ta = el.querySelector<HTMLTextAreaElement>('[data-g]')!, out = el.querySelector<HTMLElement>('.out')!;
  const run = () => {
    const V = new Map<string, string[]>(); const E: [string, string][] = []; let loops = 0;
    for (const line of ta.value.split('\n')) {
      const p = line.trim().split(/[\s,\-]+/).filter(Boolean);
      if (p.length === 0) continue;
      for (const v of p.slice(0, 2)) if (!V.has(v)) V.set(v, []);
      if (p.length >= 2) { E.push([p[0], p[1]]); V.get(p[0])!.push(p[1]); V.get(p[1])!.push(p[0]); if (p[0] === p[1]) loops++; }
    }
    if (!V.size) { out.innerHTML = '<p class="muted">Add some edges.</p>'; return; }
    const deg = [...V].map(([v, nb]) => [v, nb.length] as [string, number]);
    const sum = deg.reduce((s, [, d]) => s + d, 0);
    const odd = deg.filter(([, d]) => d % 2).map(([v]) => v);
    // components and bipartiteness by BFS
    const color = new Map<string, number>(); const comps: string[][] = []; let bip = true, oddEdge = '';
    for (const s of V.keys()) {
      if (color.has(s)) continue;
      const comp = [s]; color.set(s, 0); const q = [s];
      while (q.length) { const u = q.shift()!; for (const w of V.get(u)!) { if (!color.has(w)) { color.set(w, 1 - color.get(u)!); comp.push(w); q.push(w); } else if (color.get(w) === color.get(u)) { bip = false; oddEdge ||= `${u}–${w}`; } } }
      comps.push(comp);
    }
    const nV = V.size, nE = E.length, c = comps.length;
    const multi = new Set(E.map(([a, b]) => [a, b].sort().join('|'))).size < nE;
    const acyclic = nE === nV - c && !loops && !multi;
    const nonIso = comps.filter((cc) => cc.some((v) => V.get(v)!.length > 0));
    const euler = nonIso.length > 1 ? 'no Euler path (edges lie in more than one component)' : odd.length === 0 ? 'has an Euler circuit (all degrees even)' : odd.length === 2 ? `has an Euler path from ${odd[0]} to ${odd[1]}, but no circuit` : `no Euler path (${odd.length} odd-degree vertices)`;
    out.innerHTML = `<p><b>${nV}</b> vertices, <b>${nE}</b> edges${multi ? ' (multigraph: repeated edges)' : ''}${loops ? `, ${loops} loop(s)` : ''}.</p>
      <p>Degrees: ${deg.map(([v, d]) => `${esc(v)}:${d}`).join(', ')}. Sum of degrees = ${sum} = 2 × ${nE} ✓ (handshake lemma). Odd-degree vertices: ${odd.length} ${odd.length ? `(${odd.map(esc).join(', ')})` : ''}.</p>
      <p>Connected components: ${c} — ${comps.map((cc) => `{${cc.map(esc).join(', ')}}`).join(', ')}.</p>
      <p>${c === 1 && acyclic ? '<span class="ok">It is a tree</span> (connected, n − 1 edges, no cycles).' : acyclic ? 'It is a forest (no cycles).' : 'It contains a cycle.'} ${bip ? 'Bipartite: yes.' : `Bipartite: no (odd cycle through edge ${esc(oddEdge)}).`}</p>
      <p>Euler: ${euler}.</p>`;
  };
  ta.addEventListener('input', run);
  el.querySelectorAll<HTMLButtonElement>('.chips button').forEach((b) => b.addEventListener('click', () => { ta.value = b.dataset.p!.replace(/\\n/g, '\n'); run(); }));
  run();
}

const registry: Record<string, (el: HTMLElement) => void> = { 'truth-table': truthTable, relation, birthday, graph };
document.querySelectorAll<HTMLElement>('[data-widget]').forEach((el) => { el.classList.add('widget'); registry[el.dataset.widget!]?.(el); });
export {};
