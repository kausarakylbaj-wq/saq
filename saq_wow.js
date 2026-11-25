/* SAQ v29: live scan, scales «AI answer ↔ Civil Code», map of the Special Part with search, counters, card glow.
   Works in the browser only, sends nothing anywhere. All motion stops with «Отключить анимации» / prefers-reduced-motion. */
(() => {
  'use strict';
  const lang = () => (window.saqI18n && ['ru', 'kk', 'en'].includes(window.saqI18n.language)) ? window.saqI18n.language : 'ru';
  const reduced = () => { try { return window.SAQA11y ? window.SAQA11y.reducedMotion() : matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
  const ruPl = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return many; if (b === 1) return one; if (b > 1 && b < 5) return few; return many; };

  const S = {
    ru: {
      scanning: 'Сканирую ответ ИИ…', progress: (k, n) => `Проверено ${k} из ${n}`, done: 'Проверка завершена', skip: 'Показать сразу',
      scalesTitle: 'Весы: ответ ИИ и закон', ai: 'Ответ ИИ', law: 'ГК РК', stampOk: 'Сверено с ГК РК', stampBad: 'Есть расхождения',
      verdictOk: (n) => (n === 1 ? 'Весы в равновесии: утверждение подтверждено текстом ГК РК.' : `Весы в равновесии: все ${n} ${ruPl(n, 'утверждение', 'утверждения', 'утверждений')} подтверждены текстом ГК РК.`),
      verdictBad: (k, n) => `Чашу ИИ тянут вниз ${k} из ${n} ${ruPl(n, 'утверждения', 'утверждений', 'утверждений')} — сверьте их с законом.`,
      note: 'Наглядная схема по результатам сверки с текстом ГК РК, а не юридическая оценка.',
      why: { contradicts: 'не соответствует', partial: 'частично', unverified: 'не подтверждено', missing: 'нет в ГК РК', general_part: 'Общая часть', other_act: 'другой акт', clause_missing: 'нет такого пункта', noref: 'без ссылки' },
      art: (n) => `ст. ${n}`, artFull: (n) => `Статья ${n}`, claim: (id) => `утв. ${id}`, more: (n) => `ещё ${n}`,
      mapTitle: 'Карта Особенной части ГК РК',
      mapLead: 'Каждая клетка — статья. Наведите на клетку или выберите её стрелками, чтобы увидеть название; нажмите — статья откроется в «Әділет».',
      units: [(n) => ruPl(n, 'статья', 'статьи', 'статей'), (n) => ruPl(n, 'глава', 'главы', 'глав'), (n) => ruPl(n, 'раздел', 'раздела', 'разделов')],
      loading: 'Загружаю текст кодекса…', loadFail: 'Не удалось загрузить текст кодекса. Обновите страницу.',
      hint: 'Проверьте ответ ИИ в сканере выше — его статьи загорятся на карте.',
      last: 'Последняя проверка:', outside: 'Вне карты:',
      ghost: { missing: 'нет в Особенной части', general_part: 'Общая часть ГК (ст. 1–405)', other_act: 'другой нормативный акт' },
      open: 'Открыть в «Әділет» ↗', inLast: 'В последней проверке:',
      gridLabel: 'Карта статей 406–1124. Стрелки — выбор статьи, Enter — открыть в «Әділет».',
      sLabel: 'Поиск по тексту кодекса', sPh: 'Слово, фраза или номер статьи — например, неустойка или 722', sClear: 'Очистить поиск', sTry: 'Попробуйте:', sNote: '',
      sShort: 'Введите хотя бы 3 буквы.', sNone: (q) => `По запросу «${q}» в Особенной части ничего не нашлось.`,
      sNoneGp: 'Возможно, это понятие из Общей части ГК (ст. 1–405) — её текста в базе SAQ нет.', sSyn: 'В кодексе это называется:',
      sFound: (n, k) => `Найдено в ${n} ${ruPl(n, 'статье', 'статьях', 'статьях')} · ${k} ${ruPl(k, 'глава', 'главы', 'глав')}`, sTop: 'Чаще всего:',
      sMore: (n) => `Показать ещё ${n}`, sOnMap: 'На карте', sTitleHit: 'в названии',
      sNum: (n) => `Статья ${n} подсвечена на карте.`, sNumGp: (n) => `Статья ${n} — из Общей части ГК (ст. 1–405), её текста в базе SAQ нет.`, sNumNo: (n) => `Статьи ${n} нет в Особенной части (ст. 406–1124).`,
      links: '✶ Связи статьи', listLabel: 'Результаты поиска',
    },
    kk: {
      scanning: 'ЖИ жауабын сканерлеп жатырмын…', progress: (k, n) => `Тексерілді: ${k} / ${n}`, done: 'Тексеру аяқталды', skip: 'Бірден көрсету',
      scalesTitle: 'Таразы: ЖИ жауабы және заң', ai: 'ЖИ жауабы', law: 'ҚР АК', stampOk: 'ҚР АК-мен салыстырылды', stampBad: 'Сәйкессіздіктер бар',
      verdictOk: (n) => (n === 1 ? 'Таразы тепе-теңдікте: тұжырым ҚР АК мәтінімен расталды.' : `Таразы тепе-теңдікте: барлық ${n} тұжырым ҚР АК мәтінімен расталды.`),
      verdictBad: (k, n) => `ЖИ табағын төмен тартатын тұжырымдар: ${k} / ${n} — оларды заңмен салыстырыңыз.`,
      note: 'Бұл — ҚР АК мәтінімен салыстыру нәтижесінің көрнекі сызбасы, заңдық баға емес.',
      why: { contradicts: 'сәйкес емес', partial: 'ішінара', unverified: 'расталмады', missing: 'ҚР АК-де жоқ', general_part: 'Жалпы бөлім', other_act: 'басқа акт', clause_missing: 'тармақ жоқ', noref: 'сілтемесіз' },
      art: (n) => `${n}-бап`, artFull: (n) => `${n}-бап`, claim: (id) => `${id}-тұжырым`, more: (n) => `тағы ${n}`,
      mapTitle: 'ҚР АК Ерекше бөлімінің картасы',
      mapLead: 'Әр шаршы — бір бап. Атауын көру үшін меңзерді апарыңыз немесе бағыт пернелерімен таңдаңыз; басыңыз — бап «Әділет»-те ашылады.',
      units: [() => 'бап', () => 'тарау', () => 'бөлім'],
      loading: 'Кодекс мәтінін жүктеп жатырмын…', loadFail: 'Кодекс мәтіні жүктелмеді. Бетті жаңартыңыз.',
      hint: 'Жоғарыдағы сканерде ЖИ жауабын тексеріңіз — оның баптары картада жанады.',
      last: 'Соңғы тексеру:', outside: 'Картадан тыс:',
      ghost: { missing: 'Ерекше бөлімде жоқ', general_part: 'АК Жалпы бөлімі (1–405-баптар)', other_act: 'басқа нормативтік акт' },
      open: '«Әділет»-те ашу ↗', inLast: 'Соңғы тексеруде:',
      gridLabel: '406–1124-баптар картасы. Бағыт пернелері — бапты таңдау, Enter — «Әділет»-те ашу.',
      sLabel: 'Кодекс мәтіні бойынша іздеу', sPh: 'Сөз, тіркес немесе бап нөмірі — мысалы, неустойка немесе 722', sClear: 'Іздеуді тазарту', sTry: 'Байқап көріңіз:', sNote: 'Кодекс мәтіні SAQ базасында орыс тілінде, сондықтан орысша іздеңіз.',
      sShort: 'Кемінде 3 әріп енгізіңіз.', sNone: (q) => `«${q}» сұрауы бойынша Ерекше бөлімнен ештеңе табылмады.`,
      sNoneGp: 'Бұл ұғым АК Жалпы бөлімінде (1–405-баптар) болуы мүмкін — оның мәтіні SAQ базасында жоқ.', sSyn: 'Кодексте бұл былай аталады:',
      sFound: (n, k) => `${n} бапта табылды · ${k} тарау`, sTop: 'Ең жиі:',
      sMore: (n) => `Тағы ${n} көрсету`, sOnMap: 'Картадан', sTitleHit: 'атауында',
      sNum: (n) => `${n}-бап картада белгіленді.`, sNumGp: (n) => `${n}-бап — АК Жалпы бөлімінен (1–405-баптар), оның мәтіні SAQ базасында жоқ.`, sNumNo: (n) => `Ерекше бөлімде (406–1124-баптар) ${n}-бап жоқ.`,
      links: '✶ Бап байланыстары', listLabel: 'Іздеу нәтижелері',
    },
    en: {
      scanning: 'Scanning the AI answer…', progress: (k, n) => `Checked ${k} of ${n}`, done: 'Check complete', skip: 'Show now',
      scalesTitle: 'Scales: the AI answer and the law', ai: 'AI answer', law: 'Civil Code', stampOk: 'Matched with the Civil Code', stampBad: 'Discrepancies found',
      verdictOk: (n) => (n === 1 ? 'The scales are balanced: the statement is confirmed by the text of the Civil Code.' : `The scales are balanced: all ${n} statements are confirmed by the text of the Civil Code.`),
      verdictBad: (k, n) => `${k} of ${n} statements pull the AI side down — check them against the law.`,
      note: 'A visual summary of the comparison with the text of the Civil Code, not a legal assessment.',
      why: { contradicts: 'does not match', partial: 'partly', unverified: 'not confirmed', missing: 'not in the Code', general_part: 'General Part', other_act: 'other act', clause_missing: 'no such clause', noref: 'no reference' },
      art: (n) => `Art. ${n}`, artFull: (n) => `Article ${n}`, claim: (id) => `Claim ${id}`, more: (n) => `${n} more`,
      mapTitle: 'Map of the Special Part of the Civil Code',
      mapLead: 'Each cell is an article. Hover over a cell or pick it with the arrow keys to see its title; click to open the article on Adilet.',
      units: [(n) => (n === 1 ? 'article' : 'articles'), (n) => (n === 1 ? 'chapter' : 'chapters'), (n) => (n === 1 ? 'section' : 'sections')],
      loading: 'Loading the text of the Code…', loadFail: 'Could not load the text of the Code. Reload the page.',
      hint: 'Check an AI answer in the scanner above — its articles will light up on the map.',
      last: 'Latest check:', outside: 'Off the map:',
      ghost: { missing: 'not in the Special Part', general_part: 'General Part (Arts. 1–405)', other_act: 'another legal act' },
      open: 'Open on Adilet ↗', inLast: 'In the latest check:',
      gridLabel: 'Map of Articles 406–1124. Arrow keys pick an article, Enter opens it on Adilet.',
      sLabel: 'Search the text of the Code', sPh: 'A word, phrase or article number, e.g. неустойка or 722', sClear: 'Clear search', sTry: 'Try:', sNote: 'The text of the Code in SAQ is in Russian, so search in Russian.',
      sShort: 'Type at least 3 letters.', sNone: (q) => `Nothing found in the Special Part for «${q}».`,
      sNoneGp: 'This may be a concept of the General Part (Arts. 1–405); its text is not in the SAQ database.', sSyn: 'In the Code this is called:',
      sFound: (n, k) => `Found in ${n} ${n === 1 ? 'article' : 'articles'} · ${k} ${k === 1 ? 'chapter' : 'chapters'}`, sTop: 'Most often:',
      sMore: (n) => `Show ${n} more`, sOnMap: 'On the map', sTitleHit: 'in the title',
      sNum: (n) => `Article ${n} is highlighted on the map.`, sNumGp: (n) => `Article ${n} belongs to the General Part (Arts. 1–405); its text is not in the SAQ database.`, sNumNo: (n) => `There is no Article ${n} in the Special Part (Arts. 406–1124).`,
      links: '✶ Article links', listLabel: 'Search results',
    },
  };
  const T = () => S[lang()];
  // search terms are Russian in every language: the text of the Code in SAQ is Russian
  const SUGG = ['неустойка', 'аренда', 'гарантийный срок', 'залог', 'непреодолимая сила'];
  const SYN = [[/предоплат/, 'предварительная оплата'], [/форс.?мажор/, 'непреодолимая сила'], [/ипотек/, 'залог'], [/франчайз|франшиз/, 'комплексная предпринимательская лицензия'], [/депозит/, 'банковский вклад'], [/завещател.*отказ|легат/, 'завещательный отказ']];
  const STATUSES = ['confirmed', 'partial', 'contradicts', 'unverified'];
  const RANK = { contradicts: 4, partial: 3, unverified: 2, confirmed: 1 };
  const W_ERR = { contradicts: 1, unverified: 0.7, partial: 0.5 };

  const W = { claims: null, labels: null, live: null };

  /* ======================================================== counters */
  const countIO = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { countIO.unobserve(e.target); countUp(e.target); } });
  }, { threshold: 0.4 }) : null;
  function countUp(el) {
    const to = Number(el.dataset.saqCount) || 0;
    if (reduced() || !to) { el.textContent = String(to); return; }
    const t0 = performance.now(); const dur = 1300;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur); const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = String(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function watchCount(el) { if (!countIO || reduced()) { el.textContent = el.dataset.saqCount; return; } el.textContent = '0'; countIO.observe(el); }

  /* ======================================================== scales */
  // Geometry in source pixels of the Themis images (beam: themis_sc_beam.webp, pans: themis_sc_pan_l/r.webp)
  const G = { SW: 560, SH: 590, top: 16, beam: { w: 279, h: 275, px: 139, py: 222 }, hook: { x: 115, y: 52 },
    pan: { ai: { w: 176, h: 228, ax: 85.5, rim: 186 }, law: { w: 181, h: 227, ax: 88, rim: 192 } }, seal: { x: 462, y: 132 } };
  function weightsOf(claims) {
    const T0 = T(); const out = [];
    claims.forEach((c) => {
      if (c.status === 'confirmed') return;
      const ref = c.refs.find((r) => r.state !== 'ok') || c.refs[0];
      let why = T0.why[c.status] || T0.why.unverified;
      if (ref && ref.state && ref.state !== 'ok' && T0.why[ref.state]) why = T0.why[ref.state];
      if (!ref && c.status === 'unverified') why = T0.why.noref;
      const name = ref ? ((ref.state === 'other_act' && ref.act ? ref.act + ', ' : '') + T0.art(ref.article)) : T0.claim(c.id);
      out.push({ status: c.status, text: `${name} · ${why}`, w: W_ERR[c.status] || 0.6 });
    });
    return out;
  }
  const angleFor = (sumW, n) => (sumW <= 0 || !n ? 0 : 3 + 8 * Math.min(1, sumW / n));
  function scalesHtml(claims) {
    const L = T(); const n = claims.length;
    const ws = weightsOf(claims); const bad = ws.length;
    const shown = ws.slice(0, 4);
    const verdict = bad ? L.verdictBad(bad, n) : L.verdictOk(n);
    const chips = shown.map((w, i) => `<span class="saq-sc-w saq-sc-w--${w.status}" style="--i:${i}"><i aria-hidden="true"></i>${esc(w.text)}</span>`).join('')
      + (ws.length > 4 ? `<span class="saq-sc-w saq-sc-w--more" style="--i:4">${esc(L.more(ws.length - 4))}</span>` : '');
    const pct = (v, of) => (v / of * 100).toFixed(3) + '%';
    const bx = G.SW / 2 - G.beam.px;
    return `<section class="saq-scales${bad ? ' is-bad' : ' is-ok'}" id="saq-scales" aria-labelledby="saq-scales-h">
      <h4 id="saq-scales-h">${esc(L.scalesTitle)}</h4>
      <div class="saq-sc-stage" role="img" aria-label="${esc(verdict)}" style="aspect-ratio:${G.SW}/${G.SH}">
        <div class="saq-sc-aura" aria-hidden="true"></div><div class="saq-sc-rays" aria-hidden="true"></div>
        <div class="saq-sc-pan" data-side="ai" aria-hidden="true" style="width:${pct(G.pan.ai.w, G.SW)};aspect-ratio:${G.pan.ai.w}/${G.pan.ai.h}"><i class="saq-sc-sheen"></i></div>
        <div class="saq-sc-pan" data-side="law" aria-hidden="true" style="width:${pct(G.pan.law.w, G.SW)};aspect-ratio:${G.pan.law.w}/${G.pan.law.h}"><i class="saq-sc-sheen"></i></div>
        <div class="saq-sc-beam" aria-hidden="true" style="left:${pct(bx, G.SW)};top:${pct(G.top, G.SH)};width:${pct(G.beam.w, G.SW)};aspect-ratio:${G.beam.w}/${G.beam.h};transform-origin:${pct(G.beam.px, G.beam.w)} ${pct(G.beam.py, G.beam.h)}"><i class="saq-sc-sheen"></i></div>
        <div class="saq-sc-load" data-side="ai">${chips}</div>
        <div class="saq-sc-load" data-side="law"><span class="saq-sc-medal" aria-hidden="true">§</span></div>
        <div class="saq-sc-label" data-side="ai">${esc(L.ai)}</div>
        <div class="saq-sc-label" data-side="law">${esc(L.law)}</div>
        <div class="saq-sc-seal" aria-hidden="true" style="left:${pct(G.seal.x, G.SW)};top:${pct(G.seal.y, G.SH)}"><b>${bad ? '!' : '✓'}</b><span>${esc(bad ? L.stampBad : L.stampOk)}</span></div>
      </div>
      <p class="saq-sc-verdict">${esc(verdict)}</p>
      <p class="saq-sc-note">${esc(L.note)}</p>
    </section>`;
  }
  function placeScales(box, deg) {
    if (!box) return;
    const ph = -deg * Math.PI / 180; const c = Math.cos(ph), s = Math.sin(ph);
    const P = { x: G.SW / 2, y: G.top + G.beam.py };
    const rot = (x, y) => ({ x: P.x + x * c - y * s, y: P.y + x * s + y * c });
    const hooks = { ai: rot(-G.hook.x, G.hook.y), law: rot(G.hook.x, G.hook.y) };
    const beam = box.querySelector('.saq-sc-beam'); if (beam) beam.style.transform = `rotate(${(-deg).toFixed(3)}deg)`;
    const X = (v) => (v / G.SW * 100) + '%'; const Y = (v) => (v / G.SH * 100) + '%';
    Object.keys(hooks).forEach((side) => {
      const H = hooks[side]; const pan = G.pan[side];
      const el = box.querySelector(`.saq-sc-pan[data-side="${side}"]`); if (el) { el.style.left = X(H.x - pan.ax); el.style.top = Y(H.y - 2); }
      const load = box.querySelector(`.saq-sc-load[data-side="${side}"]`); if (load) { load.style.left = X(H.x); load.style.top = Y(H.y + pan.rim - 6); }
      const lab = box.querySelector(`.saq-sc-label[data-side="${side}"]`); if (lab) { lab.style.left = X(H.x); lab.style.top = Y(H.y + pan.h + 8); }
    });
    box.dataset.deg = String(deg);
  }
  function finalAngle(claims) { const ws = weightsOf(claims); return angleFor(ws.reduce((a, w) => a + w.w, 0), claims.length); }
  // damped spring towards a target angle; returns a controller
  function spring(box, from, onSettle) {
    const sp = { a: from, v: 0, target: from, raf: 0, done: false };
    const tick = (() => {
      let last = performance.now();
      return function frame(now) {
        const dt = Math.min(0.032, (now - last) / 1000); last = now;
        const acc = -70 * (sp.a - sp.target) - 6.5 * sp.v;
        sp.v += acc * dt; sp.a += sp.v * dt;
        placeScales(box, sp.a);
        if (Math.abs(sp.a - sp.target) < 0.02 && Math.abs(sp.v) < 0.05) { sp.a = sp.target; placeScales(box, sp.a); sp.raf = 0; if (onSettle) onSettle(); return; }
        sp.raf = requestAnimationFrame(frame);
      };
    })();
    sp.to = (target) => { sp.target = target; if (!sp.raf) sp.raf = requestAnimationFrame((n) => { tick(n); }); };
    sp.stop = () => { if (sp.raf) cancelAnimationFrame(sp.raf); sp.raf = 0; };
    return sp;
  }
  function mountScales() {
    const out = $('#scan-report'); if (!out) return;
    const old = $('#saq-scales', out); if (old) old.remove();
    if (!W.claims || !W.claims.length) return;
    const stats = $('.saq-scan-stats', out); if (!stats) return;
    stats.insertAdjacentHTML('afterend', scalesHtml(W.claims));
    const box = $('#saq-scales', out);
    placeScales(box, finalAngle(W.claims));
    box.classList.add('is-final');
  }

  /* ======================================================== live scan */
  function stopLive(final) {
    const L = W.live; if (!L) return;
    L.timers.forEach(clearTimeout); L.timers = [];
    if (L.io) L.io.disconnect();
    if (L.spring) L.spring.stop();
    if (L.onKey) document.removeEventListener('keydown', L.onKey, true);
    W.live = null;
    if (L.out) L.out.classList.remove('saq-live', 'saq-live-run', 'saq-live-cards');
    if (final) finishVisual(L);
  }
  function finishVisual(L) {
    const out = L.out; if (!out || !out.isConnected) return;
    out.classList.remove('saq-live', 'saq-live-run', 'saq-live-cards');
    $$('.saq-scan-stats strong', out).forEach((el, i) => { if (L.finals[i] != null) el.textContent = L.finals[i]; });
    const beam = $('.saq-live-beam', out); if (beam) beam.remove();
    const bar = $('.saq-live-bar', out); if (bar) bar.remove();
    const box = $('#saq-scales', out);
    if (box) { box.classList.add('is-final'); placeScales(box, finalAngle(W.claims || [])); }
    if (GK.ready) GK.highlight(W.claims, false);
  }
  function startLive() {
    stopLive(false);
    const out = $('#scan-report'); const claims = W.claims;
    if (!out || !claims || !claims.length || reduced()) return;
    const L0 = T();
    const L = { out, timers: [], finals: [], io: null, spring: null, onKey: null };
    W.live = L;
    // initial state
    out.classList.add('saq-live');
    $$('.saq-scan-stats strong', out).forEach((el) => { L.finals.push(el.textContent); el.textContent = '0'; });
    const box = $('#saq-scales', out);
    if (box) { box.classList.remove('is-final', 'is-stamped'); placeScales(box, 0); }
    const bar = document.createElement('div');
    bar.className = 'saq-live-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<span class="saq-live-dot" aria-hidden="true"></span><span class="saq-live-text">${esc(L0.scanning)}</span><span class="saq-live-count"></span><button type="button" class="saq-live-skip">${esc(L0.skip)}</button>`;
    const head = $('.saq-scan-head', out); if (head) head.insertAdjacentElement('afterend', bar); else out.prepend(bar);
    bar.querySelector('.saq-live-skip').addEventListener('click', () => stopLive(true));
    L.onKey = (e) => { if (e.key === 'Escape' && W.live === L) stopLive(true); };
    document.addEventListener('keydown', L.onKey, true);
    if (GK.ready) GK.highlight(null, false);
    // play when the comparison block is on screen
    const target = $('#saq-cmp', out) || out;
    const play = () => { if (W.live !== L) return; if (L.io) { L.io.disconnect(); L.io = null; } runLive(L, claims); };
    if ('IntersectionObserver' in window) {
      L.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) play(); }, { threshold: 0.2 });
      L.io.observe(target);
    } else play();
  }
  function runLive(L, claims) {
    const out = L.out; const L0 = T();
    out.classList.add('saq-live-run');
    const n = claims.length;
    const per = Math.max(260, Math.min(520, 2600 / n));
    const text = $('.saq-cmp-text', out);
    let beam = null;
    if (text) { beam = document.createElement('div'); beam.className = 'saq-live-beam'; beam.setAttribute('aria-hidden', 'true'); text.appendChild(beam); }
    const countEl = $('.saq-live-count', out);
    const statEls = {}; $$('.saq-scan-stats .saq-stat', out).forEach((el) => { const s = STATUSES.find((x) => el.classList.contains('saq-stat--' + x)); if (s) statEls[s] = el.querySelector('strong'); });
    const tally = { confirmed: 0, partial: 0, contradicts: 0, unverified: 0 };
    const at = (ms, fn) => L.timers.push(setTimeout(() => { if (W.live === L) fn(); }, ms));
    claims.forEach((c, i) => {
      at(180 + i * per, () => {
        const btn = $(`.saq-cmp-claim[data-claim="${c.id}"]`, out);
        if (btn && text && beam) {
          const tr = text.getBoundingClientRect(); const br = btn.getBoundingClientRect();
          beam.style.top = (br.top - tr.top + text.scrollTop - 4) + 'px'; beam.style.height = (br.height + 8) + 'px'; beam.classList.add('is-on');
        }
        if (btn) { btn.classList.add('is-lit'); }
        tally[c.status] = (tally[c.status] || 0) + 1;
        if (statEls[c.status]) { statEls[c.status].textContent = String(tally[c.status]); statEls[c.status].parentElement.classList.remove('saq-bump'); void statEls[c.status].offsetWidth; statEls[c.status].parentElement.classList.add('saq-bump'); }
        if (countEl) countEl.textContent = L0.progress(i + 1, n);
        if (GK.ready) GK.lightClaim(c, true);
      });
    });
    const tEnd = 180 + n * per;
    at(tEnd, () => {
      if (beam) beam.classList.add('is-gone');
      const tx = $('.saq-live-text', out); if (tx) tx.textContent = L0.done;
      out.classList.add('saq-live-cards');
      $$('.saq-claim', out).forEach((el, i) => { el.style.setProperty('--saq-i', String(i)); });
      const box = $('#saq-scales', out);
      if (!box) { at(900, () => stopLive(true)); return; }
      const ws = weightsOf(claims); const chips = $$('.saq-sc-load[data-side="ai"] .saq-sc-w', box);
      L.spring = spring(box, 0, null);
      if (!ws.length) {
        box.classList.add('is-landing');
        at(350, () => { box.classList.add('is-stamped'); });
        at(1500, () => stopLive(true));
        return;
      }
      let sum = 0;
      chips.forEach((ch, i) => {
        at(260 + i * 260, () => {
          ch.classList.add('is-dropped');
          const pan = box.querySelector('.saq-sc-pan[data-side="ai"]'); if (pan) { pan.classList.remove('is-hit'); void pan.offsetWidth; pan.classList.add('is-hit'); }
          const w = ws[i] ? ws[i].w : 0;
          sum += w; if (i === chips.length - 1) sum = ws.reduce((a, x) => a + x.w, 0);
          L.spring.v += 26; L.spring.to(angleFor(sum, n));
        });
      });
      const tStamp = 260 + chips.length * 260 + 700;
      at(tStamp, () => box.classList.add('is-stamped'));
      at(tStamp + 1400, () => stopLive(true));
    });
  }

  /* ======================================================== map of the Special Part */
  const GK = {
    ready: false, el: null, grid: null, tip: null, cells: [], arts: [], chapters: [], sections: [], byNum: new Map(), active: -1, lit: new Map(),
    mount() {
      const host = $('#saq-gkmap'); if (!host || this.el) return;
      this.el = host;
      host.innerHTML = `<div class="saq-gk-head"><div><h3 class="saq-gk-title" id="saq-gk-title"></h3><p class="saq-gk-lead"></p></div><div class="saq-gk-stats"></div></div>
        <div class="saq-gk-search" role="search"><label class="saq-gk-slab" for="saq-gk-q"></label>
          <div class="saq-gk-sbox"><span class="saq-gk-sicon" aria-hidden="true">⌕</span><input id="saq-gk-q" type="search" autocomplete="off" spellcheck="false" maxlength="80" aria-describedby="saq-gk-snote" aria-controls="saq-gk-res" lang="ru" disabled><button type="button" class="saq-gk-sx" hidden><span aria-hidden="true">×</span></button></div>
          <div class="saq-gk-sugg"><span class="saq-gk-tryl"></span></div><p class="saq-gk-snote" id="saq-gk-snote"></p></div>
        <div class="saq-gk-legend" aria-hidden="true"></div>
        <div class="saq-gk-wrap"><div class="saq-gk-grid" tabindex="0" role="listbox"></div><div class="saq-gk-tip" hidden></div></div>
        <div class="saq-gk-res" id="saq-gk-res" hidden><div class="saq-gk-rsum"></div><ol class="saq-gk-rlist"></ol><button type="button" class="saq-gk-rmore" hidden></button></div>
        <div class="saq-gk-foot"><p class="saq-gk-hint"></p><div class="saq-gk-lastrow" hidden><span class="saq-gk-lastlab"></span><span class="saq-gk-lastchips"></span></div><div class="saq-gk-out" hidden><span class="saq-gk-outlab"></span><span class="saq-gk-outchips"></span></div></div>
        <p class="saq-gk-sr" aria-live="polite"></p>`;
      this.grid = $('.saq-gk-grid', host); this.tip = $('.saq-gk-tip', host);
      $('.saq-gk-stats', host).innerHTML = [744, 38, 4].map((v) => `<div class="saq-gk-stat"><strong data-saq-count="${v}">${v}</strong><span></span></div>`).join('');
      $$('.saq-gk-stats [data-saq-count]', host).forEach(watchCount);
      this.texts();
      const load = () => {
        if (!window.SAQLaw) return;
        $('.saq-gk-grid', host).setAttribute('aria-busy', 'true');
        window.SAQLaw.load().then((law) => this.build(law)).catch(() => { $('.saq-gk-hint', host).textContent = T().loadFail; });
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '400px 0px' });
        io.observe(host);
      } else load();
    },
    texts() {
      const host = this.el; if (!host) return; const L = T();
      $('.saq-gk-title', host).textContent = L.mapTitle;
      $('.saq-gk-lead', host).textContent = L.mapLead;
      this.grid.setAttribute('aria-label', L.gridLabel);
      $$('.saq-gk-stat', host).forEach((st, i) => { const v = Number(st.querySelector('strong').dataset.saqCount); st.querySelector('span').textContent = L.units[i](v); });
      $('.saq-gk-hint', host).textContent = this.ready ? (this.lit.size || this.ghosts ? '' : L.hint) : L.loading;
      $('.saq-gk-outlab', host).textContent = L.outside; $('.saq-gk-lastlab', host).textContent = L.last;
      $('.saq-gk-slab', host).textContent = L.sLabel; $('#saq-gk-q', host).placeholder = L.sPh;
      $('.saq-gk-sx', host).setAttribute('aria-label', L.sClear); $('.saq-gk-sx', host).title = L.sClear;
      $('.saq-gk-tryl', host).textContent = L.sTry; $('.saq-gk-snote', host).textContent = L.sNote; $('.saq-gk-snote', host).hidden = !L.sNote;
      $('.saq-gk-rlist', host).setAttribute('aria-label', L.listLabel);
      if (this.sr) this.renderResults(false);
      if (this.ready) { this.renderLegend(); this.renderLast(); if (this.ghostData) this.renderGhosts(this.ghostData, false); if (this.active >= 0) this.showTip(this.active, false); }
    },
    build(law) {
      if (this.ready) return;
      const arts = law.articles || []; this.arts = arts;
      const chIdx = new Map(); const seIdx = new Map();
      arts.forEach((a, i) => {
        if (!seIdx.has(a.se)) seIdx.set(a.se, seIdx.size);
        if (!chIdx.has(a.ch)) { chIdx.set(a.ch, chIdx.size); this.chapters.push({ name: a.ch, se: seIdx.get(a.se), cells: [] }); }
        this.chapters[chIdx.get(a.ch)].cells.push(i);
        this.byNum.set(String(a.n), i);
      });
      this.sections = Array.from(seIdx.keys());
      [arts.length, this.chapters.length, this.sections.length].forEach((v, i) => { const el = $$('.saq-gk-stat strong', this.el)[i]; if (el && Number(el.dataset.saqCount) !== v) { el.dataset.saqCount = String(v); if (el.textContent !== '0') el.textContent = String(v); } });
      const url = (n) => (window.SAQLaw && window.SAQLaw.adiletUrl(n)) || null;
      this.grid.innerHTML = arts.map((a, i) => {
        const k = chIdx.get(a.ch); const s = seIdx.get(a.se); const u = url(a.n);
        return `<a class="saq-gk-c s${s}${k % 2 ? ' alt' : ''}" id="saq-gk-c${i}" role="option" aria-selected="false" data-i="${i}" tabindex="-1"${u ? ` href="${esc(u)}" target="_blank" rel="noopener"` : ''}></a>`;
      }).join('');
      this.cells = Array.from(this.grid.children);
      this.grid.removeAttribute('aria-busy');
      this.ready = true;
      this.wire();
      this.wireSearch();
      this.texts();
      if (W.claims && !W.live) this.highlight(W.claims, false);
    },
    renderLegend() {
      const lg = $('.saq-gk-legend', this.el);
      lg.innerHTML = this.sections.map((s, i) => `<span class="saq-gk-lg"><i class="saq-gk-sw s${i}"></i>${esc(s.replace(/^Раздел\s+\d+\.\s*/, ''))}</span>`).join('');
    },
    cols() {
      const c = this.cells; if (c.length < 2) return 1; const top = c[0].offsetTop; let n = 1;
      while (n < c.length && c[n].offsetTop === top) n++;
      return n;
    },
    showTip(i, announce) {
      const a = this.arts[i]; const cell = this.cells[i]; if (!a || !cell) return;
      const L = T(); const st = this.lit.get(i);
      this.tip.innerHTML = `<b>${esc(L.artFull(a.n))}. <span>${esc(a.ti || '')}</span></b><small>${esc(a.ch || '')}</small>`
        + (st ? `<em class="saq-gk-tipst saq-gk-tipst--${st}">${esc(L.inLast)} ${esc((W.labels && W.labels[st]) || st)}</em>` : '')
        + ((cell.getAttribute('href') || this.atlasOk()) ? `<span class="saq-gk-tipacts">${cell.getAttribute('href') ? `<a class="saq-gk-open" href="${esc(cell.getAttribute('href'))}" target="_blank" rel="noopener" tabindex="-1">${esc(L.open)}</a>` : ''}${this.atlasOk() ? `<a class="saq-gk-open saq-gk-links" href="#atlas" data-n="${esc(a.n)}" tabindex="-1">${esc(L.links)}</a>` : ''}</span>` : '');
      this.tip.hidden = false;
      const wrap = this.tip.parentElement.getBoundingClientRect(); const r = cell.getBoundingClientRect();
      const tw = this.tip.offsetWidth; const th = this.tip.offsetHeight;
      let x = r.left - wrap.left + r.width / 2 - tw / 2; x = Math.max(0, Math.min(wrap.width - tw, x));
      let y = r.top - wrap.top - th - 10; if (y < 0) y = r.bottom - wrap.top + 10;
      this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px';
      this.chapterOn(i);
      if (announce) { cell.setAttribute('aria-label', `${L.artFull(a.n)}. ${a.ti || ''}`); }
    },
    hideTip() { this.tip.hidden = true; this.chapterOn(-1); },
    chapterOn(i) {
      const k = i >= 0 ? this.chapters.findIndex((c) => c.cells.includes(i)) : -1;
      if (k === this.hlCh) return;
      if (this.hlCh >= 0 && this.chapters[this.hlCh]) this.chapters[this.hlCh].cells.forEach((j) => this.cells[j].classList.remove('is-ch'));
      this.hlCh = k; this.grid.classList.toggle('has-ch', k >= 0);
      if (k >= 0) this.chapters[k].cells.forEach((j) => this.cells[j].classList.add('is-ch'));
    },
    setActive(i) {
      i = Math.max(0, Math.min(this.cells.length - 1, i));
      if (this.active >= 0 && this.cells[this.active]) { this.cells[this.active].classList.remove('is-active'); this.cells[this.active].setAttribute('aria-selected', 'false'); }
      this.active = i; const c = this.cells[i];
      c.classList.add('is-active'); c.setAttribute('aria-selected', 'true');
      this.showTip(i, true);
      this.grid.setAttribute('aria-activedescendant', c.id);
    },
    wire() {
      const g = this.grid; this.hlCh = -1;
      let touch = false; let tapped = -1;
      g.addEventListener('pointerdown', (e) => { touch = e.pointerType === 'touch' || e.pointerType === 'pen'; });
      g.addEventListener('pointerover', (e) => { if (touch) return; const c = e.target.closest('.saq-gk-c'); if (c) this.showTip(Number(c.dataset.i), false); });
      g.addEventListener('click', (e) => {
        const c = e.target.closest('.saq-gk-c'); if (!c || !touch) return;
        const i = Number(c.dataset.i);
        if (tapped !== i) { e.preventDefault(); tapped = i; this.showTip(i, false); }
      });
      document.addEventListener('pointerdown', (e) => { if (touch && !this.el.contains(e.target)) { tapped = -1; this.hideTip(); } }, { passive: true });
      g.addEventListener('pointerleave', (e) => { if (touch || (e.relatedTarget && this.tip.contains(e.relatedTarget))) return; if (document.activeElement !== g) this.hideTip(); else if (this.active >= 0) this.showTip(this.active, false); });
      this.tip.addEventListener('pointerleave', (e) => { if (!touch && !(e.relatedTarget && g.contains(e.relatedTarget)) && document.activeElement !== g) this.hideTip(); });
      g.addEventListener('focus', () => { this.setActive(this.active >= 0 ? this.active : (this.firstLit() >= 0 ? this.firstLit() : 0)); });
      g.addEventListener('blur', () => { this.hideTip(); if (this.active >= 0) this.cells[this.active].classList.remove('is-active'); });
      g.addEventListener('keydown', (e) => {
        const k = e.key; let i = this.active < 0 ? 0 : this.active;
        if (k === 'ArrowRight') i += 1; else if (k === 'ArrowLeft') i -= 1;
        else if (k === 'ArrowDown') i += this.cols(); else if (k === 'ArrowUp') i -= this.cols();
        else if (k === 'Home') i = 0; else if (k === 'End') i = this.cells.length - 1;
        else if (k === 'Enter' || k === ' ') { const c = this.cells[i]; if (c && c.getAttribute('href')) { e.preventDefault(); c.click(); } return; }
        else if (k === 'Escape') { this.hideTip(); return; }
        else return;
        e.preventDefault(); this.setActive(i);
        const c = this.cells[this.active]; if (c && c.scrollIntoView) { try { c.scrollIntoView({ block: 'nearest' }); } catch (_) { /* old browsers */ } }
      });
      window.addEventListener('resize', () => { if (!this.tip.hidden && this.active >= 0) this.showTip(this.active, false); }, { passive: true });
    },
    atlasOk() { return !!(window.SAQAtlas && window.SAQAtlas.focus); },
    wireSearch() {
      const host = this.el; const inp = $('#saq-gk-q', host); const x = $('.saq-gk-sx', host);
      const sugg = $('.saq-gk-sugg', host);
      if (!window.SAQAtlas || !window.SAQAtlas.search) { $('.saq-gk-search', host).hidden = true; return; }
      sugg.insertAdjacentHTML('beforeend', SUGG.map((w) => `<button type="button" class="saq-gk-schip" lang="ru" data-q="${esc(w)}">${esc(w)}</button>`).join(''));
      inp.disabled = false;
      let tm = 0;
      inp.addEventListener('input', () => { clearTimeout(tm); x.hidden = !inp.value; tm = setTimeout(() => this.runSearch(inp.value), 180); });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && inp.value) { e.preventDefault(); e.stopPropagation(); inp.value = ''; x.hidden = true; this.runSearch(''); }
        else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(tm); this.runSearch(inp.value); }
      });
      x.addEventListener('click', () => { inp.value = ''; x.hidden = true; this.runSearch(''); inp.focus(); });
      host.addEventListener('click', (e) => {
        const chip = e.target.closest('.saq-gk-schip,.saq-gk-syn');
        if (chip) { inp.value = chip.dataset.q; x.hidden = false; this.runSearch(inp.value); inp.focus(); return; }
        const onMap = e.target.closest('.saq-gk-rmap');
        if (onMap) { this.pointTo(Number(onMap.dataset.i)); return; }
        const more = e.target.closest('.saq-gk-rmore');
        if (more && this.sr) { const first = this.sr.shown; this.sr.shown += 6; this.renderResults(false); const li = $$('.saq-gk-rlist li', host)[first]; const a = li && li.querySelector('a'); if (a) a.focus(); }
        const lk = e.target.closest('.saq-gk-links');
        if (lk && this.atlasOk()) { e.preventDefault(); window.SAQAtlas.focus(lk.dataset.n); }
      });
      if (inp.value) this.runSearch(inp.value);
    },
    runSearch(q) {
      q = String(q || '').trim();
      this.found = new Set();
      if (!q) { this.sr = null; this.applyFound(); this.renderResults(false); return; }
      if (!this.sIndex) this.sIndex = window.SAQAtlas.searchIndex(this.arts);
      const r = window.SAQAtlas.search(this.arts, this.sIndex, q);
      this.sr = { q, r, shown: 6 };
      r.hits.forEach((h) => this.found.add(h.i));
      this.applyFound();
      this.renderResults(true);
      if (r.num && r.hits.length) { this.pointTo(r.hits[0].i, true); }
    },
    applyFound() {
      const on = this.found && this.found.size > 0;
      this.cells.forEach((c, i) => c.classList.toggle('is-found', !!(on && this.found.has(i))));
      this.grid.classList.toggle('has-found', !!on);
    },
    pointTo(i, quiet) {
      const c = this.cells[i]; if (!c) return;
      if (!quiet && c.scrollIntoView) { try { c.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch (_) { c.scrollIntoView(); } }
      const show = () => { this.showTip(i, false); if (!reduced()) { c.classList.remove('is-pop'); void c.offsetWidth; c.classList.add('is-pop'); } };
      if (quiet || reduced()) show(); else setTimeout(show, 320);
    },
    renderResults(announce) {
      const host = this.el; const box = $('#saq-gk-res', host); const sum = $('.saq-gk-rsum', box); const list = $('.saq-gk-rlist', box); const more = $('.saq-gk-rmore', box);
      const L = T(); const st = this.sr;
      if (!st) { box.hidden = true; list.innerHTML = ''; sum.innerHTML = ''; more.hidden = true; return; }
      const { r, q } = st; let msg = '';
      const url = (n) => (window.SAQLaw && window.SAQLaw.adiletUrl(n)) || null;
      if (r.num) {
        const n = Number(String(r.num).split('-')[0]);
        msg = r.hits.length ? L.sNum(r.num) : (n >= 1 && n <= 405 ? L.sNumGp(r.num) : L.sNumNo(r.num));
        sum.innerHTML = `<p class="saq-gk-rmsg">${esc(msg)}</p>`;
      } else if (!r.hits.length) {
        const nq = q.toLowerCase().replace(/ё/g, 'е');
        if (r.stems.join('').length < 3) { msg = L.sShort; sum.innerHTML = `<p class="saq-gk-rmsg">${esc(msg)}</p>`; }
        else {
          msg = L.sNone(q);
          const syn = SYN.find(([re]) => re.test(nq));
          sum.innerHTML = `<p class="saq-gk-rmsg">${esc(msg)}</p>` + (syn ? `<p class="saq-gk-rsyn">${esc(L.sSyn)} <button type="button" class="saq-gk-syn" lang="ru" data-q="${esc(syn[1])}">${esc(syn[1])}</button></p>` : `<p class="saq-gk-rhint">${esc(L.sNoneGp)}</p>`);
        }
      } else {
        const ch = new Map(); r.hits.forEach((h) => { const c = this.arts[h.i].ch; ch.set(c, (ch.get(c) || 0) + 1); });
        const top = Array.from(ch.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
        msg = L.sFound(r.hits.length, ch.size);
        sum.innerHTML = `<p class="saq-gk-rmsg"><b>${esc(msg)}</b></p>` + (ch.size > 1 ? `<p class="saq-gk-rtop"><span>${esc(L.sTop)}</span> ${top.map(([c, k]) => `<span class="saq-gk-rch" lang="ru">${esc(c.replace(/^Глава\s+/, 'Гл. '))} — ${k}</span>`).join('')}</p>` : '');
      }
      const hits = r.hits.slice(0, st.shown);
      list.innerHTML = hits.map((h) => {
        const a = this.arts[h.i]; const u = url(a.n);
        const pieces = window.SAQAtlas.snippet(a.t || '', r.stems, h.pos);
        const sn = r.num ? esc((a.t || '').slice(0, 180).replace(/\n+/g, ' ')) + ((a.t || '').length > 180 ? '…' : '') : pieces.map((p) => (p.mark ? `<mark>${esc(p.t)}</mark>` : esc(p.t))).join('');
        const num = `${esc(L.art(a.n))}${u ? '<span aria-hidden="true"> ↗</span>' : ''}`;
        return `<li class="saq-gk-r"><div class="saq-gk-rhead">${u ? `<a class="saq-gk-rn" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(L.open)}">${num}</a>` : `<span class="saq-gk-rn">${num}</span>`}<b class="saq-gk-rti" lang="ru">${esc(a.ti || '')}</b>${h.title && !r.num ? `<span class="saq-gk-rtag">${esc(L.sTitleHit)}</span>` : ''}<button type="button" class="saq-gk-rmap" data-i="${h.i}"><span aria-hidden="true">◎</span> ${esc(L.sOnMap)}<span class="saq-gk-sr-only"> — ${esc(L.art(a.n))}</span></button></div><p class="saq-gk-rsn" lang="ru">${sn}</p></li>`;
      }).join('');
      const rest = r.hits.length - hits.length;
      more.hidden = rest <= 0; if (rest > 0) more.textContent = L.sMore(Math.min(6, rest));
      box.hidden = false;
      if (announce) $('.saq-gk-sr', host).textContent = msg;
    },
    firstLit() { let best = -1; this.lit.forEach((_, i) => { if (best < 0 || i < best) best = i; }); return best; },
    worst(a, b) { return !a ? b : (RANK[b] > RANK[a] ? b : a); },
    claimArts(c) {
      const arts = []; const ghosts = [];
      c.refs.forEach((r) => {
        if (r.state === 'ok' || r.state === 'clause_missing') { if (this.byNum.has(String(r.article))) arts.push(this.byNum.get(String(r.article))); }
        else ghosts.push(r);
      });
      if (c.target && this.byNum.has(String(c.target))) arts.push(this.byNum.get(String(c.target)));
      return { arts: Array.from(new Set(arts)), ghosts };
    },
    highlight(claims, animate) {
      if (!this.ready) return;
      this.lit.forEach((_, i) => { const c = this.cells[i]; if (c) { c.classList.remove('is-lit', 'is-pop'); STATUSES.forEach((x) => c.classList.remove('lit--' + x)); } });
      this.lit = new Map(); this.ghostData = []; this.ghosts = 0;
      (claims || []).forEach((c) => this.lightClaim(c, animate, true));
      this.renderLast(); this.renderGhosts(this.ghostData, animate);
      $('.saq-gk-hint', this.el).textContent = claims && claims.length ? '' : T().hint;
    },
    lightClaim(c, animate, batch) {
      if (!this.ready) return;
      const { arts, ghosts } = this.claimArts(c);
      arts.forEach((i) => {
        const st = this.worst(this.lit.get(i), c.status); this.lit.set(i, st);
        const cell = this.cells[i]; if (!cell) return;
        STATUSES.forEach((x) => cell.classList.remove('lit--' + x)); cell.classList.add('is-lit', 'lit--' + st);
        if (animate && !reduced()) { cell.classList.remove('is-pop'); void cell.offsetWidth; cell.classList.add('is-pop'); }
      });
      ghosts.forEach((r) => { if (!this.ghostData.some((g) => g.article === r.article && g.state === r.state && g.act === r.act)) this.ghostData.push(Object.assign({ status: c.status }, r)); });
      if (!batch) { this.renderLast(); this.renderGhosts(this.ghostData, animate); $('.saq-gk-hint', this.el).textContent = ''; }
    },
    renderLast() {
      const row = $('.saq-gk-lastrow', this.el); const box = $('.saq-gk-lastchips', this.el);
      if (!this.lit.size) { row.hidden = true; box.innerHTML = ''; return; }
      const cnt = {}; this.lit.forEach((s) => { cnt[s] = (cnt[s] || 0) + 1; });
      box.innerHTML = STATUSES.filter((s) => cnt[s]).map((s) => `<span class="saq-gk-lchip saq-gk-lchip--${s}"><i></i>${esc((W.labels && W.labels[s]) || s)}: ${cnt[s]}</span>`).join('');
      row.hidden = false;
    },
    renderGhosts(list, animate) {
      const row = $('.saq-gk-out', this.el); const box = $('.saq-gk-outchips', this.el);
      this.ghosts = list.length;
      if (!list.length) { row.hidden = true; box.innerHTML = ''; return; }
      const L = T();
      box.innerHTML = list.map((g, i) => {
        const name = (g.state === 'other_act' && g.act ? g.act + ', ' : '') + L.art(g.article);
        return `<span class="saq-gk-ghost saq-gk-ghost--${esc(g.state)}${animate && !reduced() ? ' is-fly' : ''}" style="--i:${i}"><b>${esc(name)}</b> · ${esc(L.ghost[g.state] || L.ghost.missing)}</span>`;
      }).join('');
      row.hidden = false;
    },
  };

  /* ======================================================== card glow (mouse only) */
  function initGlow() {
    let fine = false; try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (_) { /* no media queries */ }
    if (!fine) return;
    document.documentElement.classList.add('saq-glow');
    let raf = 0; let last = null;
    document.addEventListener('pointermove', (e) => {
      last = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const ev = last; if (!ev || !ev.target || !ev.target.closest) return;
        const card = ev.target.closest('.card'); if (!card) return;
        if (!card.dataset.saqGlow) {
          // only cards that are already positioned and have a free ::after — the page layout stays exactly as it was
          const free = (pe) => { const c = getComputedStyle(card, pe).content; return !c || c === 'none' || c === 'normal'; };
          const abs = (st) => st.position === 'absolute' || st.position === 'fixed';
          const isStatic = getComputedStyle(card).position === 'static';
          // a static card may become position:relative only if nothing inside depends on an outer containing block
          const safe = !isStatic || ((free('::before') || !abs(getComputedStyle(card, '::before'))) && !Array.from(card.querySelectorAll('*')).some((el) => abs(getComputedStyle(el))));
          const ok = free('::after') && safe;
          card.dataset.saqGlow = ok ? '1' : '0';
          if (ok) { card.classList.add('saq-glow-card'); if (isStatic) card.classList.add('saq-glow-rel'); }
        }
        if (card.dataset.saqGlow !== '1') return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--saq-mx', (ev.clientX - r.left).toFixed(0) + 'px');
        card.style.setProperty('--saq-my', (ev.clientY - r.top).toFixed(0) + 'px');
      });
    }, { passive: true });
  }

  /* ======================================================== wiring */
  document.addEventListener('saq:report-render', (e) => {
    const d = e.detail || {};
    const wasLive = !!W.live; stopLive(false);
    W.claims = d.claims || []; W.labels = d.labels || null;
    mountScales();
    if (wasLive) { /* re-render during the show (e.g. language switch): final state */ }
    if (GK.ready) GK.highlight(W.claims, false);
  });
  document.addEventListener('saq:scan-done', () => { if (!reduced()) startLive(); });
  document.addEventListener('saq:report-clear', () => { stopLive(false); W.claims = null; if (GK.ready) GK.highlight(null, false); });
  function onLang() { if (GK.el) GK.texts(); }
  function init() {
    GK.mount();
    initGlow();
    document.querySelectorAll('[data-saq-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(onLang, 0)));
  }
  window.SAQWow = { weightsOf, angleFor, map: GK, strings: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
