/* SAQ v29: «Атлас ГК РК» — шкала сроков, игра «Угадай срок», созвездие ссылок между статьями,
   а также поиск по тексту кодекса для карты Особенной части.
   Всё вычисляется в браузере из загруженного текста ГК РК (Особенная часть); ничего никуда не отправляется.
   Сроки и ссылки находятся автоматически по формулировкам текста — это учебная визуализация, нормы сверяются с «Әділет». */
(() => {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;

  /* =================================================================== text helpers */
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const LETTER = /[а-яёa-z0-9]/i;

  /* =================================================================== 1. terms («в течение десяти дней») */
  const NUM = {};
  [
    [1, 'один одного одному одним одном одна одну одной одно'], [2, 'два две двух двум двумя'], [3, 'три трех трем тремя'],
    [4, 'четыре четырех четырем четырьмя'], [5, 'пять пяти пятью'], [6, 'шесть шести шестью'], [7, 'семь семи семью'],
    [8, 'восемь восьми восемью'], [9, 'девять девяти девятью'], [10, 'десять десяти десятью'], [11, 'одиннадцать одиннадцати'],
    [12, 'двенадцать двенадцати'], [13, 'тринадцать тринадцати'], [14, 'четырнадцать четырнадцати'], [15, 'пятнадцать пятнадцати'],
    [16, 'шестнадцать шестнадцати'], [17, 'семнадцать семнадцати'], [18, 'восемнадцать восемнадцати'], [19, 'девятнадцать девятнадцати'],
    [20, 'двадцать двадцати'], [30, 'тридцать тридцати'], [40, 'сорок сорока'], [50, 'пятьдесят пятидесяти'], [60, 'шестьдесят шестидесяти'],
    [70, 'семьдесят семидесяти'], [80, 'восемьдесят восьмидесяти'], [90, 'девяносто девяноста'], [100, 'сто ста'], [200, 'двести двухсот'], [300, 'триста трехсот'],
  ].forEach(([v, ws]) => ws.split(' ').forEach((w) => { NUM[w] = v; }));
  const MODS = { 'рабочих': 'work', 'рабочие': 'work', 'рабочий': 'work', 'календарных': 'cal', 'календарные': 'cal', 'календарный': 'cal', 'банковских': 'bank', 'банковские': 'bank' };
  // words after which a bare «года / месяца» means «один год / месяц»
  const IMPLIED_ONE = new Set(['течение', 'истечении', 'истечения', 'менее', 'более', 'позднее', 'пределах', 'превышающий', 'превышающем']);
  const UNIT_RE = /(^|[^а-яё])(час(?:а|ов)?|сут(?:ок|ки)|д(?:ень|ня|ней|ням|нями)|недел(?:я|и|ь|ю|ями?)|месяц(?:а|ев|у|ам|ами)?|год(?:а|у)?|лет)(?=[^а-яё]|$)/g;
  const UNIT_OF = (w) => (w.startsWith('час') ? 'h' : w.startsWith('сут') ? 'd' : w[0] === 'д' ? 'd' : w.startsWith('недел') ? 'w' : w.startsWith('месяц') ? 'm' : 'y');
  const SINGULAR = new Set(['года', 'год', 'месяца', 'месяц', 'недели', 'неделю', 'суток']);
  const DAYS = { h: 1 / 24, d: 1, w: 7, m: 30.44, y: 365.25 };
  const COMPOUND_RE = /(^|[^а-яё])([а-яё]*?)(дневн|месячн|летн|недельн|годичн|суточн)(?:ый|ого|ом|ому|ым|ая|ой|ую|ое)\s+срок/g;
  const COMPOUND_UNIT = { 'дневн': 'd', 'суточн': 'd', 'месячн': 'm', 'недельн': 'w', 'летн': 'y', 'годичн': 'y' };
  const COMPOUND_PREFIX = { '': 1, 'одно': 1, 'двух': 2, 'трех': 3, 'четырех': 4, 'пяти': 5, 'шести': 6, 'семи': 7, 'восьми': 8, 'девяти': 9, 'десяти': 10, 'пятнадцати': 15, 'двадцати': 20, 'тридцати': 30, 'сорока': 40, 'девяноста': 90, 'полу': 0.5 };

  function clauseAt(text, pos) {
    // number of the clause («2.» at the start of the line), looking up to 6 paragraphs back
    let ls = text.lastIndexOf('\n', pos - 1) + 1;
    for (let k = 0; k < 6; k++) {
      const m = /^\s*(\d+(?:-\d+)?)\.\s/.exec(text.slice(ls, ls + 12));
      if (m) return m[1];
      if (ls === 0) return '';
      ls = text.lastIndexOf('\n', ls - 2) + 1;
    }
    return '';
  }
  function sentence(text, a, b) {
    // a readable fragment around [a,b): the sentence, cut to ~120 chars before and ~160 after
    let s = a; const minS = Math.max(0, a - 400);
    while (s > minS) {
      const ch = text[s - 1];
      if (ch === '\n' || ch === ';') break;
      if (ch === ' ' && text[s - 2] === '.' && /[А-ЯЁA-Z0-9«(]/.test(text[s] || '')) break;
      s--;
    }
    let e = b; const maxE = Math.min(text.length, b + 400);
    while (e < maxE) {
      const ch = text[e];
      if (ch === '\n' || ch === ';') break;
      if (ch === '.' && (text[e + 1] === ' ' || text[e + 1] === '\n' || e + 1 >= text.length) && /[А-ЯЁA-Z0-9«(\n]/.test(text[e + 2] || '\n')) { e++; break; }
      e++;
    }
    let pre = ''; let post = '';
    if (a - s > 130) { s = text.lastIndexOf(' ', a - 110); if (s < 0) s = a - 110; s++; pre = '…'; }
    if (e - b > 170) { e = text.indexOf(' ', b + 150); if (e < 0) e = b + 150; post = '…'; }
    const head = text.slice(s, a); const mid = text.slice(a, b); const tail = text.slice(b, e);
    return { s: pre + head + mid + tail + post, a: pre.length + head.length, b: pre.length + head.length + mid.length };
  }

  function wordsBefore(lower, pos, max) {
    // up to `max` words that end right before pos (skips spaces only)
    const out = []; let i = pos;
    while (out.length < max) {
      let j = i; while (j > 0 && lower[j - 1] === ' ') j--;
      if (j === 0 || !/[а-яё0-9]/.test(lower[j - 1])) break;
      let k = j; while (k > 0 && /[а-яё0-9]/.test(lower[k - 1])) k--;
      out.push({ w: lower.slice(k, j), start: k }); i = k;
    }
    return out; // nearest first
  }

  function parseQty(words) {
    // words: nearest first, modifier already removed. Returns {qty, used} or null.
    if (!words.length) return null;
    const w0 = words[0].w;
    if (/^\d{1,3}$/.test(w0)) return { qty: Number(w0), used: 1 };
    if (w0 === 'полутора') return { qty: 1.5, used: 1 };
    const v0 = NUM[w0]; if (v0 == null) return null;
    let qty = v0; let used = 1;
    if (v0 < 10 && words[1] && NUM[words[1].w] >= 20 && NUM[words[1].w] < 100) { qty += NUM[words[1].w]; used = 2; } // «двадцати четырех»
    const hw = words[used] && NUM[words[used].w];
    if (hw >= 100 && qty < 100) { qty += hw; used += 1; }
    return { qty, used };
  }

  const AGE_CTX = /(возраст|достиг|достижени|несовершеннолет)[а-яё]*[^.;]{0,40}$/;

  function extractTerms(arts) {
    const items = []; let reasonable = 0; const reasonableArts = new Set();
    arts.forEach((art, ai) => {
      const text = art.t || ''; const lower = norm(text);
      let m; UNIT_RE.lastIndex = 0;
      while ((m = UNIT_RE.exec(lower))) {
        const uStart = m.index + m[1].length; const uEnd = uStart + m[2].length; const uw = m[2];
        let ws = wordsBefore(lower, uStart, 5);
        let mod = null;
        if (ws[0] && MODS[ws[0].w]) { mod = MODS[ws[0].w]; ws = ws.slice(1); }
        let q = parseQty(ws); let start;
        if (q) start = ws[q.used - 1].start;
        else if (ws[0] && (IMPLIED_ONE.has(ws[0].w) || (ws[0].w === 'за' && ws[1] && ['чем', 'позднее', 'менее'].includes(ws[1].w))) && SINGULAR.has(uw) && !mod) { q = { qty: 1, used: 0 }; start = mod ? ws[0].start : uStart; }
        else continue;
        if (q.qty >= 1000) continue; // a year in a date
        const unit = UNIT_OF(uw);
        const before = lower.slice(Math.max(0, start - 70), start);
        if (unit === 'y' && AGE_CTX.test(before)) continue; // age, not a period
        if (unit === 'y' && /(^|\s)до\s*$/.test(before) && [14, 16, 18, 21, 23].includes(q.qty) && /обучени|форме/.test(before)) continue;
        const trigW = wordsBefore(lower, start, 3).map((x) => x.w).reverse().join(' ');
        const sn = sentence(text, start, uEnd);
        items.push({ i: ai, n: String(art.n), cl: clauseAt(text, start), qty: q.qty, unit, mod, days: q.qty * DAYS[unit], phrase: text.slice(start, uEnd), pre: trigW, s: sn.s, a: sn.a, b: sn.b, pos: start });
      }
      COMPOUND_RE.lastIndex = 0;
      while ((m = COMPOUND_RE.exec(lower))) {
        const pfx = m[2]; const qty = COMPOUND_PREFIX[pfx]; if (qty == null) continue;
        const start = m.index + m[1].length; const end = start + m[0].length - m[1].length;
        const unit = COMPOUND_UNIT[m[3]];
        const sn = sentence(text, start, end);
        items.push({ i: ai, n: String(art.n), cl: clauseAt(text, start), qty, unit, mod: null, days: qty * DAYS[unit], phrase: text.slice(start, end), pre: wordsBefore(lower, start, 3).map((x) => x.w).reverse().join(' '), s: sn.s, a: sn.a, b: sn.b, pos: start, compound: true });
      }
      const rr = lower.match(/разумн[а-яе]*\s+срок/g);
      if (rr) { reasonable += rr.length; reasonableArts.add(ai); }
    });
    items.sort((x, y) => x.days - y.days || x.i - y.i || x.pos - y.pos);
    // groups: same wording of the period
    const groups = []; const byKey = new Map();
    items.forEach((it) => {
      const key = `${it.qty}|${it.unit}|${it.mod || ''}`; it.key = key;
      if (!byKey.has(key)) { const g = { key, qty: it.qty, unit: it.unit, mod: it.mod, days: it.days, items: [] }; byKey.set(key, g); groups.push(g); }
      byKey.get(key).items.push(it);
    });
    groups.forEach((g) => { g.arts = new Set(g.items.map((x) => x.i)).size; });
    return { items, groups, reasonable, reasonableArts: reasonableArts.size, arts: new Set(items.map((x) => x.i)).size };
  }

  /* =================================================================== 2. references («статьей 412 настоящего Кодекса») */
  const REF_RE = /стать(?:я|и|е|ю|ей|ями|ях|ям)\s+(\d+(?:-\d+)?(?:(?:\s*[-–]\s*|\s*,\s*|\s+и\s+|\s+или\s+)\d+(?:-\d+)?)*)/gi;
  function extractRefs(arts) {
    const idx = new Map(); arts.forEach((a, i) => idx.set(String(a.n), i));
    const base = (n) => String(n).split('-')[0];
    const nodes = arts.map(() => ({ out: [], inn: [], inRange: [] }));
    const refs = [];
    arts.forEach((art, ai) => {
      const text = art.t || ''; let m; REF_RE.lastIndex = 0;
      const seen = new Set();
      while ((m = REF_RE.exec(text))) {
        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 170);
        const stop = after.search(/[.;]/); const win = stop >= 0 ? after.slice(0, stop) : after;
        const k = win.indexOf('настоящего Кодекса'); if (k < 0) continue;
        if (/закон|кодекс|конвенц|правил|указ|постановл|договор[а-яё]* о/i.test(win.slice(0, k))) continue; // another act is named in between
        const parts = m[1].split(/\s*,\s*|\s+и\s+|\s+или\s+/);
        parts.forEach((p) => {
          const r = p.split(/\s*[-–]\s*/);
          // «статьи 616 - 639»: spaced dash or a long span = range; «500-1» = article number
          const isRange = r.length === 2 && (/\s[-–]\s|–/.test(p) || (Number(r[1]) - Number(r[0]) > 1 && !idx.has(p.trim()))) && Number(r[1]) > Number(r[0]);
          if (isRange) {
            const a = r[0]; const b = r[1]; const key = 'r' + a + '-' + b; if (seen.has(key)) return; seen.add(key);
            const na = Number(a); const nb = Number(b);
            if (na >= 406 && idx.has(a) && idx.has(b)) refs.push({ from: ai, kind: 'range', a, b, ai: idx.get(a), bi: idx.get(b) });
            else if (nb <= 405) refs.push({ from: ai, kind: 'gprange', a, b });
            else refs.push({ from: ai, kind: 'mixrange', a, b, bi: idx.has(b) ? idx.get(b) : -1 });
            return;
          }
          const n = p.trim(); if (!n) return;
          if (idx.has(n) || idx.has(base(n))) {
            const to = idx.has(n) ? idx.get(n) : idx.get(base(n)); if (to === ai || seen.has('a' + to)) return; seen.add('a' + to);
            refs.push({ from: ai, kind: 'art', to });
          } else if (Number(base(n)) >= 1 && Number(base(n)) <= 405) {
            if (seen.has('g' + n)) return; seen.add('g' + n);
            refs.push({ from: ai, kind: 'gp', n });
          }
        });
      }
    });
    refs.forEach((r) => {
      nodes[r.from].out.push(r);
      if (r.kind === 'art') nodes[r.to].inn.push(r);
      if (r.kind === 'range') for (let j = r.ai; j <= r.bi; j++) if (j !== r.from) nodes[j].inRange.push(r);
    });
    const linked = nodes.map((nd, i) => (nd.out.length || nd.inn.length ? i : -1)).filter((i) => i >= 0);
    const gpArts = new Set(refs.filter((r) => r.kind === 'gp').map((r) => r.n));
    return { refs, nodes, linked, counts: { refs: refs.length, art: refs.filter((r) => r.kind === 'art').length, range: refs.filter((r) => r.kind === 'range').length, gp: refs.filter((r) => r.kind === 'gp' || r.kind === 'gprange').length, gpArts: gpArts.size, linked: linked.length } };
  }

  /* =================================================================== 3. search (map of the Special Part) */
  const ENDINGS = ['иями', 'ями', 'ами', 'ых', 'их', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ией', 'ость', 'ости', 'ах', 'ях', 'ам', 'ям', 'ов', 'ев', 'ей', 'ой', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ом', 'ем', 'ию', 'ия', 'ии', 'ью', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь'];
  function stem(w) {
    if (w.length === 4 && /[аяоеыиую]$/.test(w)) return w.slice(0, 3); // «сила» → «сил», «цена» → «цен»
    if (w.length < 5 || /\d/.test(w)) return w;
    for (const e of ENDINGS) if (w.length - e.length >= 4 && w.endsWith(e)) return w.slice(0, -e.length);
    return w;
  }
  function searchIndex(arts) { return arts.map((a) => ({ ti: norm(a.ti), t: norm(a.t) })); }
  function parseQuery(q) {
    const nq = norm(q).trim();
    const num = /^(?:ст(?:атья|\.)?\s*)?(\d{3,4}(?:-\d+)?)$/.exec(nq.replace(/\s+/g, ' '));
    if (num) return { num: num[1], stems: [] };
    const words = nq.split(/[^а-яa-z0-9-]+/).filter((w) => w.length >= 2);
    return { num: null, stems: Array.from(new Set(words.map(stem))) };
  }
  function search(arts, index, q, limit) {
    const P = parseQuery(q);
    if (P.num) {
      const i = arts.findIndex((a) => String(a.n) === P.num);
      return { num: P.num, stems: [], hits: i >= 0 ? [{ i, score: 99, title: true, pos: -1 }] : [] };
    }
    if (!P.stems.length || P.stems.join('').length < 3) return { num: null, stems: P.stems, hits: [] };
    const hits = [];
    index.forEach((x, i) => {
      let score = 0; let pos = -1; let inTitle = 0;
      for (const s of P.stems) {
        const ti = x.ti.indexOf(s); const tt = x.t.indexOf(s);
        if (ti < 0 && tt < 0) return;
        if (ti >= 0) { inTitle++; score += 10; }
        if (tt >= 0) { let c = 0; let p = tt; while (p >= 0 && c < 8) { c++; p = x.t.indexOf(s, p + s.length); } score += c; if (pos < 0 || tt < pos) pos = tt; }
      }
      hits.push({ i, score, title: inTitle > 0, pos });
    });
    hits.sort((a, b) => b.score - a.score || a.i - b.i);
    return { num: null, stems: P.stems, hits: limit ? hits.slice(0, limit) : hits };
  }
  function snippet(text, stems, pos) {
    // ~70 chars before the first match, ~120 after; returns [{t, mark}] pieces
    const lower = norm(text);
    let at = pos; if (at < 0) at = 0;
    let s = Math.max(0, at - 70); if (s > 0) { const sp = text.indexOf(' ', s); s = sp >= 0 && sp < at ? sp + 1 : s; }
    let e = Math.min(text.length, at + 130); if (e < text.length) { const sp = text.lastIndexOf(' ', e); e = sp > at ? sp : e; }
    const marks = [];
    stems.forEach((st) => { if (!st) return; let p = lower.indexOf(st, s); while (p >= 0 && p < e) { let q = p + st.length; while (q < e && /[а-яёa-z0-9]/i.test(text[q])) q++; let r = p; while (r > s && /[а-яёa-z0-9]/i.test(text[r - 1])) r--; marks.push([r, q]); p = lower.indexOf(st, q); } });
    marks.sort((a, b) => a[0] - b[0]);
    const pieces = []; let cur = s;
    marks.forEach(([a, b]) => { if (a < cur) return; if (a > cur) pieces.push({ t: text.slice(cur, a) }); pieces.push({ t: text.slice(a, b), mark: true }); cur = b; });
    if (cur < e) pieces.push({ t: text.slice(cur, e) });
    if (s > 0) pieces.unshift({ t: '…' }); if (e < text.length) pieces.push({ t: '…' });
    return pieces.map((p) => ({ t: p.t.replace(/\n+/g, ' '), mark: p.mark }));
  }

  const Atlas = Object.assign(G.SAQAtlas || {}, { extractTerms, extractRefs, search, searchIndex, snippet, stem, parseQuery, _num: NUM, ready: false });
  G.SAQAtlas = Atlas;
  if (typeof document === 'undefined') return;
  /* =================================================================== UI */
  const lang = () => (G.saqI18n && ['ru', 'kk', 'en'].includes(G.saqI18n.language)) ? G.saqI18n.language : 'ru';
  const reduced = () => { try { return G.SAQA11y ? G.SAQA11y.reducedMotion() : matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const ruPl = (n, one, few, many) => { if (n % 1) return few; const a = Math.abs(n) % 100; const b = a % 10; if (a > 10 && a < 20) return many; if (b === 1) return one; if (b > 1 && b < 5) return few; return many; };
  const fmtNum = (n, lg) => (n % 1 ? String(n).replace('.', lg === 'en' ? '.' : ',') : String(n));
  const fmtDate = (iso) => String(iso || '').split('-').reverse().join('.');

  const RU_U = { h: ['час', 'часа', 'часов'], d: ['день', 'дня', 'дней'], w: ['неделя', 'недели', 'недель'], m: ['месяц', 'месяца', 'месяцев'], y: ['год', 'года', 'лет'] };
  const RU_M = { work: ['рабочий', 'рабочих', 'рабочих'], cal: ['календарный', 'календарных', 'календарных'], bank: ['банковский', 'банковских', 'банковских'] };
  const KK_U = { h: 'сағат', d: 'күн', w: 'апта', m: 'ай', y: 'жыл' };
  const KK_M = { work: 'жұмыс күні', cal: 'күнтізбелік күн', bank: 'банк күні' };
  const EN_U = { h: ['hour', 'hours'], d: ['day', 'days'], w: ['week', 'weeks'], m: ['month', 'months'], y: ['year', 'years'] };
  const EN_M = { work: 'working', cal: 'calendar', bank: 'banking' };
  function fmtTerm(g, lg) {
    lg = lg || lang(); const n = g.qty; const num = fmtNum(n, lg);
    if (lg === 'kk') return g.mod && g.unit === 'd' ? `${num} ${KK_M[g.mod]}` : `${num} ${KK_U[g.unit]}`;
    if (lg === 'en') { const pl = n === 1 ? 0 : 1; return `${num} ${g.mod && g.unit === 'd' ? EN_M[g.mod] + ' ' : ''}${EN_U[g.unit][pl]}`; }
    const f = (arr) => ruPl(n, arr[0], arr[1], arr[2]);
    return `${num} ${g.mod && g.unit === 'd' ? f(RU_M[g.mod]) + ' ' : ''}${f(RU_U[g.unit])}`;
  }

  const S = {
    ru: {
      tabs: ['Шкала сроков', 'Угадай срок', 'Созвездие ссылок'], tabsLabel: 'Разделы атласа',
      auto: (d) => `Сроки и ссылки найдены автоматически по тексту ГК РК (Особенная часть, ред. ${d}). Это учебная визуализация: перед использованием сверяйте нормы с «Әділет».`,
      loading: 'Загружаю текст кодекса…', loadFail: 'Не удалось загрузить текст кодекса. Обновите страницу.',
      art: (n) => `ст. ${n}`, artFull: (n) => `Статья ${n}`, cl: (c) => `п. ${c}`, open: 'Открыть в «Әділет» ↗', quoteNote: '',
      tlTitle: 'Шкала сроков ГК РК',
      tlLead: 'Все сроки, которые Особенная часть называет числом, — от суток до семидесяти лет. Нажмите на отметку шкалы или выберите срок в списке, чтобы увидеть нормы.',
      tlStats: [(n) => ruPl(n, 'упоминание срока', 'упоминания срока', 'упоминаний срока'), (n) => ruPl(n, 'статья', 'статьи', 'статей'), (n) => `${ruPl(n, 'раз', 'раза', 'раз')} «разумный срок»`],
      ticks: ['1 день', 'неделя', 'месяц', 'год', '10 лет'], shorter: '← короче', longer: 'длиннее →', scrollHint: 'Шкалу можно листать вбок',
      chipsLabel: 'Все сроки', norms: (n) => `${n} ${ruPl(n, 'упоминание', 'упоминания', 'упоминаний')}`, inArts: (k) => `${k} ${ruPl(k, 'статья', 'статьи', 'статей')}`,
      showAll: (n) => `Показать все (${n})`, fShort: 'Самый короткий', fLong: 'Самый длинный', fFreq: 'Чаще всего', fReason: 'Без цифр',
      fReasonText: (n, k) => `${n} ${ruPl(n, 'раз', 'раза', 'раз')} в ${k} ${ruPl(k, 'статье', 'статьях', 'статьях')}: срок не назван числом`,
      gTitle: 'Угадай срок', gLead: 'Мы убрали срок из нормы ГК РК — выберите правильный. ИИ часто путает именно сроки: пишет «десять дней» вместо «тридцати». 5 вопросов в раунде.',
      qOf: (k, n) => `Вопрос ${k} из ${n}`, optsLabel: 'Варианты ответа', right: 'Верно!', wrong: 'Не совсем.', inNorm: 'В норме:',
      next: 'Следующий вопрос →', finish: 'Узнать результат →', score: 'Верно', of: (k, n) => `${k} из ${n}`,
      resTitle: 'Раунд окончен', resMsg: (k, n) => (k === n ? 'Безупречно: сроки вы знаете как по кодексу.' : k >= n - 2 ? 'Хороший результат — пара сроков ещё ускользает.' : 'Сроки — частая ошибка и у людей, и у ИИ. Загляните в шкалу сроков и попробуйте ещё раз.'),
      again: 'Сыграть ещё раунд', toScale: 'Открыть шкалу сроков', best: (k, n) => `Лучший результат за этот визит: ${k} из ${n}`, blank: 'пропущенный срок',
      skyTitle: 'Созвездие ссылок', skyLead: 'Статьи Особенной части ссылаются друг на друга. Каждая звезда на круге — статья со ссылками. Выберите её, чтобы увидеть, на какие нормы она опирается и какие нормы опираются на неё.',
      skyStats: [(n) => `${ruPl(n, 'ссылка', 'ссылки', 'ссылок')} между статьями`, (n) => `${ruPl(n, 'статья', 'статьи', 'статей')} со связями`, (n) => `${ruPl(n, 'ссылка', 'ссылки', 'ссылок')} на Общую часть`],
      find: 'Статья №', show: 'Показать', random: '✶ Случайная звезда', clear: 'Сбросить выбор',
      notFound: (n) => `Статьи ${n} нет в Особенной части (ст. 406–1124).`, notFoundGp: (n) => `Статья ${n} — из Общей части ГК (ст. 1–405), её текста в базе SAQ нет.`,
      help: 'Выберите звезду на круге, введите номер статьи или, когда круг в фокусе, листайте звёзды стрелками ← →.',
      topIn: 'Чаще всего ссылаются на:', topOut: 'Больше всего ссылок делают:',
      out: 'Ссылается на', inn: 'На неё ссылаются', none: 'нет', inRange: 'Также входит в группы статей:', fromArt: (n) => `из ст. ${n}`,
      isolated: 'У этой статьи нет ссылок на другие статьи кодекса, и на неё нет прямых ссылок.',
      range: (a, b, k) => `ст. ${a}–${b} · ${k} ${ruPl(k, 'статья', 'статьи', 'статей')}`, gp: 'Общая часть', gpRange: (a, b) => `ст. ${a}–${b} · Общая часть`,
      lgOut: 'ссылается на', lgIn: 'на неё ссылаются', lgGp: 'Общая часть (ст. 1–405) — тень: её текста в базе SAQ нет',
      cLinks: 'ссылок', cBetween: 'между статьями', sec: (n) => `Раздел ${n}`, counts: (o, i) => `→ ${o} · ← ${i}`,
      svgTitle: 'Созвездие ссылок между статьями ГК РК, Особенная часть',
      svgDesc: (c) => `${c.art} прямых ссылок между статьями, ${c.range} ссылок на группы статей и ${c.gp} ссылок на Общую часть. Сведения о выбранной статье — в панели рядом.`,
      selected: (n, o, i) => `Выбрана статья ${n}: ссылается на ${o}, на неё ссылаются ${i}.`,
    },
    kk: {
      tabs: ['Мерзімдер шкаласы', 'Мерзімді тап', 'Сілтемелер шоқжұлдызы'], tabsLabel: 'Атлас бөлімдері',
      auto: (d) => `Мерзімдер мен сілтемелер ҚР АК мәтінінен (Ерекше бөлім, ${d} редакциясы) автоматты түрде табылды. Бұл — оқу визуализациясы: қолданар алдында нормаларды «Әділет»-пен салыстырыңыз.`,
      loading: 'Кодекс мәтінін жүктеп жатырмын…', loadFail: 'Кодекс мәтіні жүктелмеді. Бетті жаңартыңыз.',
      art: (n) => `${n}-бап`, artFull: (n) => `${n}-бап`, cl: (c) => `${c}-тармақ`, open: '«Әділет»-те ашу ↗', quoteNote: 'Нормалардан үзінділер SAQ базасындағыдай орыс тілінде берілген.',
      tlTitle: 'ҚР АК мерзімдер шкаласы',
      tlLead: 'Ерекше бөлім санмен атайтын барлық мерзім — бір тәуліктен жетпіс жылға дейін. Нормаларды көру үшін шкаладағы белгіні басыңыз немесе тізімнен мерзімді таңдаңыз.',
      tlStats: [() => 'мерзім аталады', () => 'бап', () => 'рет «ақылға қонымды мерзім»'],
      ticks: ['1 күн', 'апта', 'ай', 'жыл', '10 жыл'], shorter: '← қысқарақ', longer: 'ұзағырақ →', scrollHint: 'Шкаланы көлденең жылжытуға болады',
      chipsLabel: 'Барлық мерзім', norms: (n) => `${n} рет аталады`, inArts: (k) => `${k} бап`,
      showAll: (n) => `Барлығын көрсету (${n})`, fShort: 'Ең қысқа', fLong: 'Ең ұзақ', fFreq: 'Ең жиі', fReason: 'Сансыз',
      fReasonText: (n, k) => `${k} бапта ${n} рет: мерзім санмен аталмайды`,
      gTitle: 'Мерзімді тап', gLead: 'ҚР АК нормасынан мерзімді алып тастадық — дұрысын таңдаңыз. ЖИ көбіне дәл мерзімдерді шатастырады: «отыз» орнына «он күн» деп жазады. Бір раундта 5 сұрақ.',
      qOf: (k, n) => `${n} сұрақтың ${k}-сі`, optsLabel: 'Жауап нұсқалары', right: 'Дұрыс!', wrong: 'Дұрыс емес.', inNorm: 'Нормада:',
      next: 'Келесі сұрақ →', finish: 'Нәтижені көру →', score: 'Дұрыс', of: (k, n) => `${k} / ${n}`,
      resTitle: 'Раунд аяқталды', resMsg: (k, n) => (k === n ? 'Мінсіз: мерзімдерді кодекстегідей білесіз.' : k >= n - 2 ? 'Жақсы нәтиже — бір-екі мерзім әлі есте қалмаған.' : 'Мерзімдер — адамдар да, ЖИ де жиі қателесетін тұс. Мерзімдер шкаласын қарап, қайта көріңіз.'),
      again: 'Тағы бір раунд', toScale: 'Мерзімдер шкаласын ашу', best: (k, n) => `Осы кірудегі ең жақсы нәтиже: ${k} / ${n}`, blank: 'түсіп қалған мерзім',
      skyTitle: 'Сілтемелер шоқжұлдызы', skyLead: 'Ерекше бөлімнің баптары бір-біріне сілтеме жасайды. Шеңбердегі әр жұлдыз — сілтемесі бар бап. Ол қай нормаларға сүйенетінін және қай нормалар оған сүйенетінін көру үшін таңдаңыз.',
      skyStats: [() => 'баптар арасындағы сілтеме', () => 'байланысы бар бап', () => 'Жалпы бөлімге сілтеме'],
      find: 'Бап №', show: 'Көрсету', random: '✶ Кездейсоқ жұлдыз', clear: 'Таңдауды тазарту',
      notFound: (n) => `Ерекше бөлімде (406–1124-баптар) ${n}-бап жоқ.`, notFoundGp: (n) => `${n}-бап — АК Жалпы бөлімінен (1–405-баптар), оның мәтіні SAQ базасында жоқ.`,
      help: 'Шеңбердегі жұлдызды таңдаңыз, бап нөмірін енгізіңіз немесе шеңбер фокуста болғанда жұлдыздарды ← → пернелерімен ауыстырыңыз.',
      topIn: 'Ең жиі сілтеме жасалатын баптар:', topOut: 'Ең көп сілтеме жасайтын баптар:',
      out: 'Сілтеме жасайды', inn: 'Оған сілтеме жасайды', none: 'жоқ', inRange: 'Сондай-ақ мына бап топтарына кіреді:', fromArt: (n) => `${n}-баптан`,
      isolated: 'Бұл бап кодекстің басқа баптарына сілтеме жасамайды, оған тікелей сілтеме де жоқ.',
      range: (a, b, k) => `${a}–${b}-баптар · ${k} бап`, gp: 'Жалпы бөлім', gpRange: (a, b) => `${a}–${b}-баптар · Жалпы бөлім`,
      lgOut: 'сілтеме жасайды', lgIn: 'оған сілтеме жасайды', lgGp: 'Жалпы бөлім (1–405-баптар) — көлеңке: оның мәтіні SAQ базасында жоқ',
      cLinks: 'сілтеме', cBetween: 'баптар арасында', sec: (n) => `${n}-бөлім`, counts: (o, i) => `→ ${o} · ← ${i}`,
      svgTitle: 'ҚР АК Ерекше бөлімі баптары арасындағы сілтемелер шоқжұлдызы',
      svgDesc: (c) => `Баптар арасындағы ${c.art} тікелей сілтеме, бап топтарына ${c.range} сілтеме және Жалпы бөлімге ${c.gp} сілтеме. Таңдалған бап туралы мәлімет — жанындағы панельде.`,
      selected: (n, o, i) => `${n}-бап таңдалды: ${o} сілтеме жасайды, оған ${i} сілтеме жасайды.`,
    },
    en: {
      tabs: ['Term scale', 'Guess the term', 'Constellation of links'], tabsLabel: 'Atlas sections',
      auto: (d) => `Terms and links were found automatically in the text of the Civil Code (Special Part, edition of ${d}). This is a learning visualisation: check the provisions on Adilet before relying on them.`,
      loading: 'Loading the text of the Code…', loadFail: 'Could not load the text of the Code. Reload the page.',
      art: (n) => `Art. ${n}`, artFull: (n) => `Article ${n}`, cl: (c) => `cl. ${c}`, open: 'Open on Adilet ↗', quoteNote: 'Quotes from the provisions are in Russian, as in the SAQ database.',
      tlTitle: 'Scale of terms in the Civil Code',
      tlLead: 'Every term the Special Part states as a number — from one day to seventy years. Click a mark on the scale or pick a term in the list to see the provisions.',
      tlStats: [(n) => (n === 1 ? 'mention of a term' : 'mentions of terms'), (n) => (n === 1 ? 'article' : 'articles'), (n) => (n === 1 ? 'time «a reasonable time»' : 'times «a reasonable time»')],
      ticks: ['1 day', 'week', 'month', 'year', '10 years'], shorter: '← shorter', longer: 'longer →', scrollHint: 'You can scroll the scale sideways',
      chipsLabel: 'All terms', norms: (n) => `${n} ${n === 1 ? 'mention' : 'mentions'}`, inArts: (k) => `${k} ${k === 1 ? 'article' : 'articles'}`,
      showAll: (n) => `Show all (${n})`, fShort: 'Shortest', fLong: 'Longest', fFreq: 'Most frequent', fReason: 'No number',
      fReasonText: (n, k) => `${n} times in ${k} articles: no number is given`,
      gTitle: 'Guess the term', gLead: 'We removed the term from a provision of the Civil Code — pick the right one. AI often gets exactly the terms wrong, writing «ten days» instead of «thirty». 5 questions per round.',
      qOf: (k, n) => `Question ${k} of ${n}`, optsLabel: 'Answer options', right: 'Correct!', wrong: 'Not quite.', inNorm: 'The provision says:',
      next: 'Next question →', finish: 'See the result →', score: 'Correct', of: (k, n) => `${k} of ${n}`,
      resTitle: 'Round complete', resMsg: (k, n) => (k === n ? 'Flawless: you know the terms like the Code itself.' : k >= n - 2 ? 'Good result — a couple of terms still slip away.' : 'Terms are a frequent mistake for people and AI alike. Look at the term scale and try again.'),
      again: 'Play another round', toScale: 'Open the term scale', best: (k, n) => `Best result this visit: ${k} of ${n}`, blank: 'missing term',
      skyTitle: 'Constellation of links', skyLead: 'Articles of the Special Part refer to one another. Every star on the circle is an article with links. Pick one to see which provisions it relies on and which provisions rely on it.',
      skyStats: [(n) => `${n === 1 ? 'link' : 'links'} between articles`, (n) => `${n === 1 ? 'article' : 'articles'} with links`, (n) => `${n === 1 ? 'link' : 'links'} to the General Part`],
      find: 'Article No.', show: 'Show', random: '✶ Random star', clear: 'Clear selection',
      notFound: (n) => `There is no Article ${n} in the Special Part (Arts. 406–1124).`, notFoundGp: (n) => `Article ${n} belongs to the General Part (Arts. 1–405); its text is not in the SAQ database.`,
      help: 'Pick a star on the circle, type an article number or, when the circle has focus, move between stars with ← →.',
      topIn: 'Most referred to:', topOut: 'Make the most references:',
      out: 'Refers to', inn: 'Referred to by', none: 'none', inRange: 'Also part of groups of articles:', fromArt: (n) => `from Art. ${n}`,
      isolated: 'This article does not refer to other articles of the Code, and no article refers to it directly.',
      range: (a, b, k) => `Arts. ${a}–${b} · ${k} ${k === 1 ? 'article' : 'articles'}`, gp: 'General Part', gpRange: (a, b) => `Arts. ${a}–${b} · General Part`,
      lgOut: 'refers to', lgIn: 'referred to by', lgGp: 'General Part (Arts. 1–405) — shadow: its text is not in the SAQ database',
      cLinks: 'links', cBetween: 'between articles', sec: (n) => `Section ${n}`, counts: (o, i) => `→ ${o} · ← ${i}`,
      svgTitle: 'Constellation of links between articles of the Civil Code, Special Part',
      svgDesc: (c) => `${c.art} direct links between articles, ${c.range} links to groups of articles and ${c.gp} links to the General Part. Details of the selected article are in the panel next to it.`,
      selected: (n, o, i) => `Article ${n} selected: refers to ${o}, referred to by ${i}.`,
    },
  };
  const T = () => S[lang()];

  const st = { law: null, arts: [], terms: null, refs: null, tab: 1, group: null, showAll: false, game: null, best: 0, sel: -1, hover: -1, mounted: false, built: false, pending: null };
  let host = null;

  /* ------------------------------------------------------------------ mount */
  function mount() {
    host = $('#saq-atlas'); if (!host || st.mounted) return; st.mounted = true;
    host.innerHTML = `<div class="at-tabs" role="tablist">${[1, 2, 3].map((k) => `<button type="button" role="tab" id="at-t${k}" aria-controls="at-p${k}" aria-selected="${k === 1}"${k === 1 ? '' : ' tabindex="-1"'}><span aria-hidden="true">${['⟡', '?', '✶'][k - 1]}</span> <span data-k="tab${k}"></span></button>`).join('')}</div>
      <p class="at-auto"></p><p class="at-loading" role="status"></p>
      <div class="at-panel" id="at-p1" role="tabpanel" aria-labelledby="at-t1"></div>
      <div class="at-panel" id="at-p2" role="tabpanel" aria-labelledby="at-t2" hidden></div>
      <div class="at-panel" id="at-p3" role="tabpanel" aria-labelledby="at-t3" hidden></div>`;
    const tabs = $('.at-tabs', host);
    tabs.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) setTab(Number(t.id.slice(4)), false); });
    tabs.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const cur = Number((document.activeElement && document.activeElement.id || 'at-t1').slice(4)) || st.tab;
      const k = e.key === 'Home' ? 1 : e.key === 'End' ? 3 : e.key === 'ArrowRight' ? (cur % 3) + 1 : ((cur + 1) % 3) + 1;
      setTab(k, true);
    });
    host.addEventListener('click', onClick);
    host.addEventListener('submit', onSubmit);
    texts();
    const go = () => load();
    if ('IntersectionObserver' in G) { const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px 0px' }); io.observe(host); } else go();
  }
  function load() {
    if (st.built || st.loading) return st.loading;
    if (!G.SAQLaw) return null;
    st.loading = G.SAQLaw.load().then((law) => { build(law); }).catch(() => { $('.at-loading', host).textContent = T().loadFail; st.loading = null; });
    return st.loading;
  }
  function build(law) {
    if (st.built) return;
    st.law = law; st.arts = law.articles || [];
    st.terms = extractTerms(st.arts); st.refs = extractRefs(st.arts);
    st.built = true; Atlas.ready = true; Atlas.data = { terms: st.terms, refs: st.refs };
    const g = st.terms.groups.slice().sort((a, b) => b.items.length - a.items.length || a.days - b.days)[0];
    st.group = g ? g.key : null;
    renderAll(false);
    if (st.pending != null) { const n = st.pending; st.pending = null; selectByNum(n, true); }
  }
  function setTab(k, focus) {
    st.tab = k;
    [1, 2, 3].forEach((j) => { const t = $('#at-t' + j, host); const p = $('#at-p' + j, host); const on = j === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; p.hidden = !on; });
    if (focus) $('#at-t' + k, host).focus();
    if (k === 2 && st.built && !st.game) newRound();
    if (k === 3 && st.built) requestAnimationFrame(sizeSky);
  }
  function texts() {
    const L = T();
    $('.at-tabs', host).setAttribute('aria-label', L.tabsLabel);
    $$('.at-tabs [data-k]', host).forEach((el, i) => { el.textContent = L.tabs[i]; });
    $('.at-auto', host).textContent = L.auto(fmtDate((st.law && st.law.meta && st.law.meta.edition_date) || '2026-10-21'));
    const ld = $('.at-loading', host); ld.textContent = st.built ? '' : L.loading; ld.hidden = st.built;
  }
  function renderAll(again) { texts(); renderTimeline(); renderGame(); renderSky(again); }

  function stats(vals, units) {
    const still = reduced() || st.noAnim; // a re-render (language switch) shows the final numbers at once
    return `<div class="at-stats">${vals.map((v, i) => `<div class="at-stat"><strong data-at-count="${v}"${still ? ' data-done="1"' : ''}>${still ? v : 0}</strong><span>${esc(units[i](v))}</span></div>`).join('')}</div>`;
  }
  function countUp(box) {
    $$('[data-at-count]', box).forEach((el) => {
      const v = Number(el.dataset.atCount);
      if (reduced() || el.dataset.done) { el.textContent = String(v); return; }
      el.dataset.done = '1'; const t0 = performance.now(); const D = 900;
      const f = (now) => { const p = Math.min(1, (now - t0) / D); el.textContent = String(Math.round(v * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
  }
  const watch = (box) => { if (!('IntersectionObserver' in G) || reduced()) { countUp(box); return; } const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); countUp(box); } }, { threshold: 0.3 }); io.observe(box); };
  const artLink = (n, cl) => {
    const L = T(); const u = G.SAQLaw && G.SAQLaw.adiletUrl(n); const label = L.art(n) + (cl ? ', ' + L.cl(cl) : '');
    return u ? `<a class="at-art" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(L.open)}">${esc(label)}<span aria-hidden="true"> ↗</span></a>` : `<span class="at-art">${esc(label)}</span>`;
  };
  const quote = (it, blank, marks) => {
    if (blank) return `${esc(it.s.slice(0, it.a))}<span class="at-blank" role="img" aria-label="${esc(T().blank)}">${blank}</span>${esc(it.s.slice(it.b))}`;
    const ms = (marks || [[it.a, it.b]]).slice().sort((x, y) => x[0] - y[0]); let out = ''; let cur = 0;
    ms.forEach(([a, b]) => { if (a < cur) return; out += esc(it.s.slice(cur, a)) + `<mark>${esc(it.s.slice(a, b))}</mark>`; cur = b; });
    return out + esc(it.s.slice(cur));
  };

  /* ------------------------------------------------------------------ timeline */
  const LO = Math.log10(0.6); const HI = Math.log10(36525 * 0.9);
  const xOf = (days) => ((Math.log10(days) - LO) / (HI - LO)) * 100;
  const tone = (d) => (d < 28 ? 'c1' : d < 360 ? 'c2' : 'c3');
  function renderTimeline() {
    const p = $('#at-p1', host); if (!p) return; const L = T();
    if (!st.built) { p.innerHTML = ''; return; }
    const tr = st.terms; const groups = tr.groups;
    // columns: positioned on a log scale; neighbours closer than 2.1% are nudged apart
    let last = -99; const cols = groups.map((g) => { let x = xOf(g.days); if (x - last < 2.1) x = last + 2.1; last = x; return { g, x }; });
    const shortest = groups[0]; const longest = groups[groups.length - 1];
    const freq = groups.slice().sort((a, b) => b.items.length - a.items.length || a.days - b.days)[0];
    const fact = (k, g, lab, extra) => `<button type="button" class="at-fact" data-g="${esc(g.key)}"><span class="at-fact-k">${esc(lab)}</span><b>${esc(fmtTerm(g))}</b><small>${esc(extra)}</small></button>`;
    p.innerHTML = `<div class="at-card at-tl">
      <div class="at-head"><div><h3 class="at-h">${esc(L.tlTitle)}</h3><p class="at-lead">${esc(L.tlLead)}</p></div>${stats([tr.items.length, tr.arts, tr.reasonable], L.tlStats)}</div>
      <div class="at-facts">${fact(1, shortest, L.fShort, L.art(shortest.items[0].n))}${fact(2, freq, L.fFreq, L.norms(freq.items.length))}${fact(3, longest, L.fLong, L.art(longest.items[0].n))}<div class="at-fact at-fact--plain"><span class="at-fact-k">${esc(L.fReason)}</span><b lang="ru">«разумный срок»</b><small>${esc(L.fReasonText(tr.reasonable, tr.reasonableArts))}</small></div></div>
      <div class="at-tl-scroll"><div class="at-tl-plot" aria-hidden="true">
        <div class="at-tl-cols">${cols.map(({ g, x }) => { const n = g.items.length; const vis = Math.min(n, 10); return `<button type="button" tabindex="-1" class="at-tl-col ${tone(g.days)}${g.key === st.group ? ' is-on' : ''}" data-g="${esc(g.key)}" style="left:${x.toFixed(2)}%;--n:${vis}" title="${esc(fmtTerm(g))} · ${esc(L.norms(n))}">${n > vis ? `<em>+${n - vis}</em>` : ''}${'<i></i>'.repeat(vis)}</button>`; }).join('')}</div>
        <div class="at-tl-axis">${[1, 7, 30.44, 365.25, 3652.5].map((d, i) => `<span class="at-tl-tick" style="left:${xOf(d).toFixed(2)}%"><span>${esc(L.ticks[i])}</span></span>`).join('')}</div>
        <div class="at-tl-dir"><span>${esc(L.shorter)}</span><span>${esc(L.longer)}</span></div>
      </div></div>
      <p class="at-tl-scrollhint">${esc(L.scrollHint)}</p>
      <div class="at-chips" role="group" aria-label="${esc(L.chipsLabel)}">${groups.map((g) => `<button type="button" class="at-chip ${tone(g.days)}" data-g="${esc(g.key)}" aria-pressed="${g.key === st.group}"><span>${esc(fmtTerm(g))}</span><b>${g.items.length}</b></button>`).join('')}</div>
      <div class="at-tl-detail" aria-live="polite"></div>
    </div>`;
    renderDetail(false);
    watch($('.at-tl .at-stats', p));
  }
  function renderDetail(announce) {
    const box = $('#at-p1 .at-tl-detail', host); if (!box) return; const L = T();
    const g = st.terms.groups.find((x) => x.key === st.group); if (!g) { box.innerHTML = ''; return; }
    // one card per quote: two terms of the same group in one sentence are marked together
    const cards = []; const byQ = new Map();
    g.items.forEach((it) => { const k = it.i + '|' + it.s; if (byQ.has(k)) byQ.get(k).marks.push([it.a, it.b]); else { const c = { it, marks: [[it.a, it.b]] }; byQ.set(k, c); cards.push(c); } });
    const lim = st.showAll ? cards.length : 6; const items = cards.slice(0, lim);
    box.setAttribute('aria-live', announce ? 'polite' : 'off');
    box.innerHTML = `<div class="at-dhead"><b class="at-dval ${tone(g.days)}">${esc(fmtTerm(g))}</b><span>${esc(L.norms(g.items.length))} · ${esc(L.inArts(g.arts))}</span></div>
      ${L.quoteNote ? `<p class="at-qnote">${esc(L.quoteNote)}</p>` : ''}
      <ol class="at-norms">${items.map(({ it, marks }) => `<li><div class="at-norm-top">${artLink(it.n, it.cl)}<span class="at-norm-ti" lang="ru">${esc(st.arts[it.i].ti || '')}</span></div><blockquote lang="ru">${quote(it, null, marks)}</blockquote></li>`).join('')}</ol>
      ${cards.length > lim ? `<button type="button" class="at-btn at-more">${esc(L.showAll(cards.length))}</button>` : ''}`;
  }
  function pickGroup(key, from) {
    st.group = key; st.showAll = false;
    $$('#at-p1 .at-chip', host).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.g === key)));
    $$('#at-p1 .at-tl-col', host).forEach((c) => c.classList.toggle('is-on', c.dataset.g === key));
    renderDetail(true);
    if (from === 'col' || from === 'fact') { const c = $(`#at-p1 .at-chip[data-g="${CSS.escape(key)}"]`, host); if (c && from === 'fact') c.focus({ preventScroll: true }); }
  }

  /* ------------------------------------------------------------------ game */
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function poolItems() {
    return st.terms.items.filter((it) => {
      if (it.s.length < 70) return false;
      const rest = (it.s.slice(0, it.a) + ' ' + it.s.slice(it.b)).toLowerCase();
      return !rest.includes(it.phrase.toLowerCase()); // the same term elsewhere in the quote would give the answer away
    });
  }
  function optionsFor(it) {
    const groups = st.terms.groups; const own = groups.find((g) => g.key === it.key);
    const far = groups.filter((g) => g.key !== it.key && Math.abs(Math.log(g.days / it.days)) > Math.log(1.25) && fmtTerm(g) !== fmtTerm(own));
    const same = shuffle(far.filter((g) => g.unit === it.unit)).sort((a, b) => Math.abs(Math.log(a.days / it.days)) - Math.abs(Math.log(b.days / it.days))).slice(0, 4);
    const pick = shuffle(same).slice(0, 2);
    const rest = shuffle(far.filter((g) => !pick.includes(g)));
    while (pick.length < 3 && rest.length) pick.push(rest.shift());
    return shuffle([own].concat(pick));
  }
  function newRound() {
    const pool = shuffle(poolItems()); const round = []; const keys = new Set(); const arts = new Set();
    for (const it of pool) { if (round.length >= 5) break; if (keys.has(it.key) && pool.length > 20) continue; if (arts.has(it.i)) continue; round.push(it); keys.add(it.key); arts.add(it.i); }
    st.game = { round, k: 0, answers: [], opts: round.map(optionsFor), picked: null, done: false };
    renderGame();
  }
  function renderGame(focusSel) {
    const p = $('#at-p2', host); if (!p) return; const L = T();
    if (!st.built) { p.innerHTML = ''; return; }
    if (!st.game) { p.innerHTML = `<div class="at-card at-game"><div class="at-head"><div><h3 class="at-h">${esc(L.gTitle)}</h3><p class="at-lead">${esc(L.gLead)}</p></div></div></div>`; return; }
    const g = st.game; const n = g.round.length; const right = g.answers.filter(Boolean).length;
    const ring = (k) => `<div class="at-gscore" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><circle class="at-gs-track" cx="32" cy="32" r="27"/><circle class="at-gs-arc${k ? '' : ' is-zero'}" cx="32" cy="32" r="27" style="--p:${(k / n).toFixed(3)}"/></svg><b>${k}<small>/${n}</small></b><span>${esc(L.score)}</span></div>`;
    const prog = `<ol class="at-gprog" aria-hidden="true">${g.round.map((_, i) => `<li class="${i < g.answers.length ? (g.answers[i] ? 'ok' : 'no') : i === g.k ? 'cur' : ''}"></li>`).join('')}</ol>`;
    let body = '';
    if (g.done) {
      st.best = Math.max(st.best, right);
      body = `<div class="at-gres"><h4>${esc(L.resTitle)}</h4><p class="at-gres-big">${esc(L.of(right, n))}</p><p>${esc(L.resMsg(right, n))}</p><p class="at-gbest">${esc(L.best(st.best, n))}</p>
        <div class="at-gnav"><button type="button" class="at-btn primary at-again">${esc(L.again)}</button><button type="button" class="at-btn at-toscale">${esc(L.toScale)}</button></div></div>`;
    } else {
      const it = g.round[g.k]; const opts = g.opts[g.k]; const answered = g.picked != null;
      const correct = opts.findIndex((o) => o.key === it.key);
      body = `<div class="at-gq"><div class="at-gmeta"><span>${esc(L.qOf(g.k + 1, n))}</span><span lang="ru">${esc(st.arts[it.i].ch || '')}</span></div>
        ${L.quoteNote ? `<p class="at-qnote">${esc(L.quoteNote)}</p>` : ''}
        <blockquote class="at-gtext${answered ? ' is-revealed' : ''}" lang="ru">${answered ? quote(it) : quote(it, '?')}</blockquote>
        <div class="at-gopts" role="group" aria-label="${esc(L.optsLabel)}">${opts.map((o, i) => {
          const cls = answered ? (i === correct ? ' is-right' : i === g.picked ? ' is-wrong' : ' is-dim') : '';
          return `<button type="button" class="at-gopt${cls}" data-o="${i}"${answered ? ' aria-disabled="true"' : ''}><i aria-hidden="true">${answered && i === correct ? '✓' : answered && i === g.picked ? '✗' : String.fromCharCode(65 + i)}</i><span>${esc(fmtTerm(o))}</span></button>`;
        }).join('')}</div>
        <div class="at-gfb" role="status">${answered ? `<p><b class="${g.answers[g.k] ? 'ok' : 'no'}">${esc(g.answers[g.k] ? L.right : L.wrong)}</b> ${esc(L.inNorm)} <q lang="ru">${esc(it.phrase)}</q> — ${artLink(it.n, it.cl)} <span class="at-gti" lang="ru">${esc(st.arts[it.i].ti || '')}</span></p>` : ''}</div>
        ${answered ? `<div class="at-gnav"><button type="button" class="at-btn primary at-next">${esc(g.k + 1 < n ? L.next : L.finish)}</button></div>` : ''}</div>`;
    }
    p.innerHTML = `<div class="at-card at-game"><div class="at-head"><div><h3 class="at-h">${esc(L.gTitle)}</h3><p class="at-lead">${esc(L.gLead)}</p></div>${ring(right)}</div>${prog}${body}</div>`;
    if (focusSel) { const el = $(focusSel, p); if (el) el.focus(); }
  }
  function answer(i) {
    const g = st.game; if (!g || g.done || g.picked != null) return;
    const it = g.round[g.k]; const o = g.opts[g.k][i]; if (!o) return;
    g.picked = i; g.answers[g.k] = o.key === it.key;
    renderGame('.at-next');
  }
  function nextQ() {
    const g = st.game; if (!g) return;
    if (g.k + 1 >= g.round.length) { g.done = true; renderGame('.at-again'); return; }
    g.k += 1; g.picked = null; renderGame('.at-gopt');
  }

  /* ------------------------------------------------------------------ constellation */
  const SKY = { C: 400, R: 304, gap: 4, spShare: 0.68 };
  function angles() {
    const total = 360 - 2 * SKY.gap; const sp = total * SKY.spShare; const gp = total - sp;
    const sp0 = -90 + SKY.gap / 2; const gp0 = sp0 + sp + SKY.gap;
    return { sp0, sp, gp0, gp };
  }
  const rad = (d) => (d * Math.PI) / 180;
  function angOfIdx(i) { const A = angles(); return A.sp0 + (st.arts.length > 1 ? (i / (st.arts.length - 1)) * A.sp : 0); }
  function angOfGp(n) { const A = angles(); return A.gp0 + ((Math.min(405, Math.max(1, Number(String(n).split('-')[0]))) - 1) / 404) * A.gp; }
  const pt = (deg, r) => [SKY.C + r * Math.cos(rad(deg)), SKY.C + r * Math.sin(rad(deg))];
  function curve(a1, a2) {
    const [x1, y1] = pt(a1, SKY.R); const [x2, y2] = pt(a2, SKY.R);
    let d = Math.abs(a1 - a2) % 360; if (d > 180) d = 360 - d;
    let mid = (a1 + a2) / 2; if (Math.abs(a1 - a2) > 180) mid += 180;
    const k = Math.pow(1 - d / 180, 1.4) * 0.92;
    const [cx, cy] = pt(mid, SKY.R * k);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  function arcPath(a1, a2, r) {
    const [x1, y1] = pt(a1, r); const [x2, y2] = pt(a2, r); const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  function edgeTarget(r) {
    if (r.kind === 'art') return angOfIdx(r.to);
    if (r.kind === 'range') return (angOfIdx(r.ai) + angOfIdx(r.bi)) / 2;
    if (r.kind === 'gp') return angOfGp(r.n);
    if (r.kind === 'gprange') return (angOfGp(r.a) + angOfGp(r.b)) / 2;
    return r.bi >= 0 ? (angOfGp(r.a) + angOfIdx(r.bi)) / 2 : angOfGp(r.a);
  }
  function rng(seed) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
  function sectionsOf() {
    const out = []; st.arts.forEach((a, i) => { const last = out[out.length - 1]; if (!last || last.name !== a.se) out.push({ name: a.se, from: i, to: i }); else last.to = i; });
    return out;
  }
  function renderSky(again) {
    const p = $('#at-p3', host); if (!p) return; const L = T();
    if (!st.built) { p.innerHTML = ''; return; }
    const R = st.refs; const C = R.counts; const secs = sectionsOf(); const A = angles();
    const rnd = rng(42); let stars = '';
    for (let k = 0; k < 110; k++) { const a = rnd() * 360; const r = Math.sqrt(rnd()) * 395; const [x, y] = pt(a, r); const s = 0.35 + rnd() * 1.1; stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(2)}"${k % 4 === 0 ? ` class="tw" style="--d:${(rnd() * 5).toFixed(2)}s"` : ''}/>`; }
    const ring = secs.map((s, k) => `<path class="at-sec s${k}" pathLength="1" d="${arcPath(angOfIdx(s.from) - 0.6, angOfIdx(s.to) + 0.6, SKY.R + 16)}"/>`).join('')
      + `<path class="at-sec-gp" d="${arcPath(A.gp0, A.gp0 + A.gp, SKY.R + 16)}"/>`;
    const dots = st.arts.map((a, i) => { const [x, y] = pt(angOfIdx(i), SKY.R); return `<circle class="at-dot s${secs.findIndex((s) => i >= s.from && i <= s.to)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5"/>`; }).join('');
    let gpDots = ''; for (let n = 1; n <= 405; n += 4) { const [x, y] = pt(angOfGp(n), SKY.R); gpDots += `<circle class="at-gpdot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1"/>`; }
    const edges = R.refs.map((r, k) => `<path class="at-e k-${r.kind}" data-k="${k}" pathLength="1" d="${curve(angOfIdx(r.from), edgeTarget(r))}"/>`).join('');
    const nodes = R.linked.map((i) => { const nd = R.nodes[i]; const deg = nd.out.length + nd.inn.length; const [x, y] = pt(angOfIdx(i), SKY.R); const r0 = (2.4 + Math.sqrt(deg) * 1.15).toFixed(2); return `<circle class="at-node" data-i="${i}" data-r="${r0}" style="--j:${Math.round((angOfIdx(i) + 90) * 2)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r0}"/>`; }).join('');
    const gpTargets = Array.from(new Set(R.refs.filter((r) => r.kind === 'gp').map((r) => r.n))).map((n) => { const [x, y] = pt(angOfGp(n), SKY.R); return `<circle class="at-gpnode" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`; }).join('');
    // labels outside the ring: anchored away from the circle on the sides, centred at the top and bottom
    const lab = (deg, r0, text, cls) => { const c = Math.cos(rad(deg)); const anchor = c > 0.45 ? 'start' : c < -0.45 ? 'end' : 'middle'; const [x, y] = pt(deg, anchor === 'middle' ? r0 + 10 : r0); return `<text class="at-lab ${cls || ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" data-x="${x.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(text)}</text>`; };
    const labels = lab(A.sp0 + 1.5, SKY.R + 34, '406') + lab(A.sp0 + A.sp - 1.5, SKY.R + 34, '1124') + lab(A.gp0 + A.gp / 2, SKY.R + 30, L.gp, 'gp')
      + secs.map((s) => { const no = (s.name.match(/Раздел\s+(\d+)/) || [])[1]; return no ? lab((angOfIdx(s.from) + angOfIdx(s.to)) / 2, SKY.R + 30, L.sec(no), 'sec') : ''; }).join('');
    const topIn = R.linked.slice().sort((a, b) => R.nodes[b].inn.length - R.nodes[a].inn.length || a - b).slice(0, 5);
    const topOut = R.linked.slice().sort((a, b) => R.nodes[b].out.length - R.nodes[a].out.length || a - b).slice(0, 4);
    const secLegend = secs.map((s, k) => `<span class="at-lg"><i class="at-sw s${k}"></i><span lang="ru">${esc(s.name.replace(/^Раздел\s+\d+\.\s*/, ''))}</span></span>`).join('');
    p.innerHTML = `<div class="at-card at-sky-card">
      <div class="at-head"><div><h3 class="at-h">${esc(L.skyTitle)}</h3><p class="at-lead">${esc(L.skyLead)}</p></div>${stats([C.art + C.range, C.linked, C.gp], L.skyStats)}</div>
      <div class="at-sky-grid">
        <div class="at-sky-wrap">
          <svg class="at-sky${again ? '' : ' is-intro'}" viewBox="0 0 800 800" role="group" tabindex="0" focusable="true" aria-labelledby="at-sky-t" aria-describedby="at-sky-d">
            <title id="at-sky-t">${esc(L.svgTitle)}</title><desc id="at-sky-d">${esc(L.svgDesc({ art: C.art, range: C.range, gp: C.gp }))}</desc>
            <defs><radialGradient id="atNebula" cx="50%" cy="46%" r="55%"><stop offset="0" class="at-neb0"/><stop offset=".55" class="at-neb1"/><stop offset="1" class="at-neb2"/></radialGradient>
              <filter id="atGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <rect class="at-sky-bg" x="0" y="0" width="800" height="800" rx="36" fill="url(#atNebula)"/>
            <g class="at-stars">${stars}</g>
            <g class="at-ring">${ring}${dots}${gpDots}</g>
            <g class="at-edges">${edges}</g>
            <path class="at-rangearc" d=""/>
            <g class="at-nodes" filter="url(#atGlow)">${gpTargets}${nodes}</g>
            <g class="at-labels" aria-hidden="true">${labels}</g>
            <g class="at-center" aria-hidden="true"><text class="at-c-big" x="400" y="392" text-anchor="middle"></text><text class="at-c-sm" x="400" y="430" text-anchor="middle"></text><text class="at-c-sm2" x="400" y="458" text-anchor="middle"></text></g>
          </svg>
          <div class="at-sky-tip" hidden></div>
        </div>
        <div class="at-sky-side">
          <form class="at-sky-find" novalidate><label for="at-sky-n">${esc(L.find)}</label><div class="at-sky-frow"><input id="at-sky-n" type="text" inputmode="numeric" autocomplete="off" maxlength="7" pattern="[0-9-]*"><button type="submit" class="at-btn primary">${esc(L.show)}</button></div>
            <div class="at-sky-frow2"><button type="button" class="at-btn at-rand">${esc(L.random)}</button><button type="button" class="at-btn at-clear" hidden>${esc(L.clear)}</button></div><p class="at-sky-ferr" role="alert"></p></form>
          <div class="at-sky-info" aria-live="polite"></div>
          <div class="at-sky-legend"><span class="at-lg"><i class="at-ln out"></i>${esc(L.lgOut)}</span><span class="at-lg"><i class="at-ln in"></i>${esc(L.lgIn)}</span><span class="at-lg"><i class="at-sw gp"></i>${esc(L.lgGp)}</span>${secLegend}</div>
        </div>
      </div>
    </div>`;
    st.topIn = topIn; st.topOut = topOut;
    st.order = R.linked.slice().sort((a, b) => a - b);
    wireSky(p);
    if (st.sel >= 0) select(st.sel, false, true); else info(false);
    center();
    watch($('.at-sky-card .at-stats', p));
    requestAnimationFrame(sizeSky);
    if (!again && !reduced()) { const svg = $('.at-sky', p); const io = 'IntersectionObserver' in G ? new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); svg.classList.add('is-play'); } }, { threshold: 0.25 }) : null; if (io) io.observe(svg); else svg.classList.add('is-play'); }
    else $('.at-sky', p).classList.remove('is-intro');
  }
  function sizeSky() {
    // strokes, labels and stars keep a readable size on screen whatever the width of the circle
    const svg = $('#at-p3 .at-sky', host); if (!svg) return;
    const w = svg.getBoundingClientRect().width; if (!w) return;
    const u = 800 / w; svg.style.setProperty('--u', u.toFixed(3)); svg.style.setProperty('--cs', Math.max(1, Math.min(1.9, u / 1.45)).toFixed(3));
    const f = w < 460 ? 1.9 : w < 620 ? 1.35 : 1;
    svg.classList.toggle('is-small', w < 460); // section names move to the legend on phones
    if (svg.dataset.f !== String(f)) { svg.dataset.f = String(f); $$('.at-node', svg).forEach((c) => c.setAttribute('r', (Number(c.dataset.r) * f).toFixed(2))); }
    // keep every label inside the picture
    $$('.at-lab', svg).forEach((t) => {
      t.setAttribute('x', t.dataset.x);
      try { const bb = t.getBBox(); const dx = bb.x < 10 ? 10 - bb.x : bb.x + bb.width > 790 ? 790 - bb.x - bb.width : 0; if (dx) t.setAttribute('x', (Number(t.dataset.x) + dx).toFixed(1)); } catch (_) { /* not rendered yet */ }
    });
  }
  function center() {
    const svg = $('#at-p3 .at-sky', host); if (!svg) return; const L = T(); const R = st.refs;
    const [big, sm, sm2] = $$('.at-center text', svg);
    if (st.sel >= 0) { const nd = R.nodes[st.sel]; big.textContent = L.art(st.arts[st.sel].n); sm.textContent = L.counts(nd.out.length, nd.inn.length); sm2.textContent = ''; }
    else { big.textContent = String(R.counts.art + R.counts.range); sm.textContent = L.cLinks; sm2.textContent = L.cBetween; }
  }
  function chipFor(r, dir) {
    const L = T();
    if (dir === 'in') return `<button type="button" class="at-schip in" data-i="${r.from}">${esc(L.art(st.arts[r.from].n))}</button>`;
    if (r.kind === 'art') return `<button type="button" class="at-schip out" data-i="${r.to}">${esc(L.art(st.arts[r.to].n))}</button>`;
    if (r.kind === 'range') return `<button type="button" class="at-schip out range" data-i="${r.ai}">${esc(L.range(r.a, r.b, r.bi - r.ai + 1))}</button>`;
    if (r.kind === 'gp') return `<span class="at-schip gp">${esc(L.art(r.n))} · ${esc(L.gp)}</span>`;
    return `<span class="at-schip gp">${esc(L.gpRange(r.a, r.b))}</span>`;
  }
  function info(announce) {
    const box = $('#at-p3 .at-sky-info', host); if (!box) return; const L = T(); const R = st.refs;
    box.setAttribute('aria-live', announce ? 'polite' : 'off');
    $('#at-p3 .at-clear', host).hidden = st.sel < 0;
    if (st.sel < 0) {
      box.innerHTML = `<p class="at-sky-help">${esc(L.help)}</p>
        <h4>${esc(L.topIn)}</h4><div class="at-schips">${st.topIn.map((i) => `<button type="button" class="at-schip" data-i="${i}">${esc(L.art(st.arts[i].n))} <b>← ${R.nodes[i].inn.length}</b></button>`).join('')}</div>
        <h4>${esc(L.topOut)}</h4><div class="at-schips">${st.topOut.map((i) => `<button type="button" class="at-schip" data-i="${i}">${esc(L.art(st.arts[i].n))} <b>→ ${R.nodes[i].out.length}</b></button>`).join('')}</div>`;
      return;
    }
    const a = st.arts[st.sel]; const nd = R.nodes[st.sel]; const u = G.SAQLaw && G.SAQLaw.adiletUrl(a.n);
    const ranges = nd.inRange.filter((r, k, arr) => arr.findIndex((x) => x.from === r.from && x.a === r.a) === k);
    box.innerHTML = `<p class="at-sr">${esc(L.selected(a.n, nd.out.length, nd.inn.length))}</p><div class="at-sel-head"><span class="at-sel-n">${esc(L.artFull(a.n))}</span><b lang="ru">${esc(a.ti || '')}</b><small lang="ru">${esc(a.ch || '')}</small></div>
      ${!nd.out.length && !nd.inn.length ? `<p class="at-sky-help">${esc(L.isolated)}</p>` : ''}
      <h4><i class="at-ln out" aria-hidden="true"></i>${esc(L.out)} · ${nd.out.length}</h4><div class="at-schips">${nd.out.length ? nd.out.map((r) => chipFor(r, 'out')).join('') : `<span class="at-none">${esc(L.none)}</span>`}</div>
      <h4><i class="at-ln in" aria-hidden="true"></i>${esc(L.inn)} · ${nd.inn.length}</h4><div class="at-schips">${nd.inn.length ? nd.inn.map((r) => chipFor(r, 'in')).join('') : `<span class="at-none">${esc(L.none)}</span>`}</div>
      ${ranges.length ? `<p class="at-sel-range">${esc(L.inRange)} ${ranges.map((r) => `<button type="button" class="at-schip in range" data-i="${r.from}">${esc(L.range(r.a, r.b, r.bi - r.ai + 1))} · ${esc(L.fromArt(st.arts[r.from].n))}</button>`).join('')}</p>` : ''}
      ${u ? `<a class="at-btn at-adilet" href="${esc(u)}" target="_blank" rel="noopener">${esc(L.open)}</a>` : ''}`;
  }
  function highlight(i) {
    const svg = $('#at-p3 .at-sky', host); if (!svg) return; const R = st.refs;
    $$('.at-e.is-out,.at-e.is-in,.at-e.is-hov', svg).forEach((e) => e.classList.remove('is-out', 'is-in', 'is-hov'));
    $$('.at-node.is-sel,.at-node.is-peer,.at-node.is-hov', svg).forEach((n) => n.classList.remove('is-sel', 'is-peer', 'is-hov'));
    const arc = $('.at-rangearc', svg); arc.setAttribute('d', '');
    const act = st.sel >= 0 ? st.sel : i;
    svg.classList.toggle('is-on', act >= 0);
    if (act < 0) return;
    const edges = $$('.at-e', svg); const peers = new Set(); const arcs = [];
    R.refs.forEach((r, k) => {
      if (r.from === act) { edges[k].classList.add('is-out'); if (r.kind === 'art') peers.add(r.to); if (r.kind === 'range') arcs.push(arcPath(angOfIdx(r.ai), angOfIdx(r.bi), SKY.R - 9)); }
      else if (r.kind === 'art' && r.to === act) { edges[k].classList.add('is-in'); peers.add(r.from); }
    });
    arc.setAttribute('d', arcs.join(''));
    $$('.at-node', svg).forEach((c) => { const j = Number(c.dataset.i); if (j === act) c.classList.add(st.sel >= 0 ? 'is-sel' : 'is-hov'); else if (peers.has(j)) c.classList.add('is-peer'); });
    // the selected star and its peers are drawn above the others
    const g = $('.at-nodes', svg); $$('.at-node.is-peer,.at-node.is-sel,.at-node.is-hov', svg).forEach((c) => g.appendChild(c));
  }
  function select(i, announce, quiet) {
    st.sel = i; st.hover = -1;
    const svg = $('#at-p3 .at-sky', host);
    if (svg && !quiet && !reduced()) { svg.classList.remove('is-draw'); void svg.getBoundingClientRect(); svg.classList.add('is-draw'); }
    highlight(i); info(announce); center(); hideTip();
  }
  function clearSel() { st.sel = -1; highlight(-1); info(true); center(); }
  function selectByNum(n, scroll) {
    const L = T(); const err = $('#at-p3 .at-sky-ferr', host); const v = String(n || '').trim().replace(/^ст\.?\s*/i, '');
    const i = st.arts.findIndex((a) => String(a.n) === v);
    if (i < 0) { const b = Number(v.split('-')[0]); if (err) err.textContent = v ? (b >= 1 && b <= 405 ? L.notFoundGp(v) : L.notFound(v)) : ''; return false; }
    if (err) err.textContent = '';
    select(i, true);
    if (scroll) { const wrap = $('#at-p3 .at-sky-wrap', host); if (wrap && wrap.scrollIntoView) { try { wrap.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } catch (_) { wrap.scrollIntoView(); } } }
    return true;
  }
  function svgPoint(svg, e) { const r = svg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 800, ((e.clientY - r.top) / r.height) * 800]; }
  function nearest(svg, e) {
    const [x, y] = svgPoint(svg, e); const dx = x - SKY.C; const dy = y - SKY.C; const r = Math.hypot(dx, dy);
    if (r < SKY.R - 70 || r > SKY.R + 46) return -1;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI; let best = -1; let bd = 99;
    st.refs.linked.forEach((i) => { let d = Math.abs(angOfIdx(i) - a) % 360; if (d > 180) d = 360 - d; if (d < bd) { bd = d; best = i; } });
    return bd <= 3.2 ? best : -1;
  }
  function showTip(i) {
    const tip = $('#at-p3 .at-sky-tip', host); const svg = $('#at-p3 .at-sky', host); if (!tip || !svg) return; const L = T();
    const a = st.arts[i]; const nd = st.refs.nodes[i];
    tip.innerHTML = `<b>${esc(L.artFull(a.n))}. <span lang="ru">${esc(a.ti || '')}</span></b><small>${esc(L.counts(nd.out.length, nd.inn.length))}</small>`;
    tip.hidden = false;
    const wr = svg.parentElement.getBoundingClientRect(); const sr = svg.getBoundingClientRect(); const [px, py] = pt(angOfIdx(i), SKY.R);
    const x = sr.left - wr.left + (px / 800) * sr.width; const y = sr.top - wr.top + (py / 800) * sr.height;
    const tw = tip.offsetWidth; const th = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(wr.width - tw - 4, x - tw / 2)) + 'px';
    tip.style.top = (y - th - 12 < 0 ? y + 14 : y - th - 12) + 'px';
  }
  function hideTip() { const tip = $('#at-p3 .at-sky-tip', host); if (tip) tip.hidden = true; }
  function wireSky(p) {
    const svg = $('.at-sky', p); let touch = false;
    svg.addEventListener('pointerdown', (e) => { touch = e.pointerType !== 'mouse'; });
    svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const i = nearest(svg, e); if (i === st.hover) return; st.hover = i;
      svg.style.cursor = i >= 0 ? 'pointer' : '';
      if (i < 0) { hideTip(); if (st.sel < 0) highlight(-1); else highlight(st.sel); return; }
      showTip(i); if (st.sel < 0) highlight(i);
    });
    svg.addEventListener('pointerleave', () => { st.hover = -1; hideTip(); highlight(st.sel); });
    svg.addEventListener('click', (e) => { const i = nearest(svg, e); if (i >= 0) { select(i, true); if (touch) showTip(i); } });
    svg.addEventListener('keydown', (e) => {
      const ord = st.order; if (!ord.length) return; let k = ord.indexOf(st.sel);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = k < 0 ? 0 : (k + 1) % ord.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = k < 0 ? ord.length - 1 : (k - 1 + ord.length) % ord.length;
      else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = ord.length - 1;
      else if (e.key === 'Escape') { if (st.sel >= 0) { e.preventDefault(); clearSel(); } return; }
      else return;
      e.preventDefault(); select(ord[k], true); showTip(ord[k]);
    });
    svg.addEventListener('blur', hideTip);
    if (!st.resizeWired) { st.resizeWired = true; G.addEventListener('resize', () => { sizeSky(); hideTip(); }, { passive: true }); }
  }

  /* ------------------------------------------------------------------ events */
  function onClick(e) {
    const t = e.target;
    const col = t.closest('.at-tl-col,.at-chip,.at-fact[data-g]'); if (col) { pickGroup(col.dataset.g, col.classList.contains('at-fact') ? 'fact' : col.classList.contains('at-tl-col') ? 'col' : 'chip'); return; }
    if (t.closest('.at-more')) { st.showAll = true; renderDetail(false); const li = $$('#at-p1 .at-norms li', host)[6]; const a = li && li.querySelector('a'); if (a) a.focus(); return; }
    const opt = t.closest('.at-gopt'); if (opt) { answer(Number(opt.dataset.o)); return; }
    if (t.closest('.at-next')) { nextQ(); return; }
    if (t.closest('.at-again')) { newRound(); const f = $('#at-p2 .at-gopt', host); if (f) f.focus(); return; }
    if (t.closest('.at-toscale')) { setTab(1, true); return; }
    const sc = t.closest('.at-schip[data-i]'); if (sc) { select(Number(sc.dataset.i), true); const inp = $('#at-sky-n', host); if (inp) inp.value = st.arts[st.sel].n; const h = $('#at-p3 .at-sel-n', host); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } return; }
    if (t.closest('.at-rand')) { const ord = st.order; const i = ord[Math.floor(Math.random() * ord.length)]; select(i, true); const inp = $('#at-sky-n', host); if (inp) inp.value = st.arts[i].n; return; }
    if (t.closest('.at-clear')) { clearSel(); const inp = $('#at-sky-n', host); if (inp) { inp.value = ''; inp.focus(); } }
  }
  function onSubmit(e) {
    if (!e.target.closest('.at-sky-find')) return;
    e.preventDefault(); selectByNum($('#at-sky-n', host).value, false);
  }
  function onLang() {
    if (!host) return;
    if (!st.built) { texts(); return; }
    const tab = st.tab; st.noAnim = true; renderAll(true); st.noAnim = false; setTab(tab, false);
  }

  /* ------------------------------------------------------------------ public */
  Atlas.fmtTerm = fmtTerm;
  Atlas.state = st;
  Atlas.focus = (n) => {
    if (location.hash !== '#atlas') location.hash = 'atlas';
    setTimeout(() => {
      setTab(3, false);
      if (st.built) selectByNum(n, true);
      else { st.pending = n; load(); }
    }, 60);
  };
  Atlas.newRound = () => newRound();
  function init() {
    mount();
    document.querySelectorAll('[data-saq-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(onLang, 0)));
    G.addEventListener('hashchange', () => { if (location.hash === '#atlas') load(); });
    if (location.hash === '#atlas') load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
