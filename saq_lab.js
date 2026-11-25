/* SAQ v29: «ИИ-лаборатория» — 1) how to ask an AI (prompt builder), 2) compare 2–3 AI answers against the loaded Civil Code.
   Everything runs in this browser; nothing is sent anywhere and nothing is stored. */
(() => {
  'use strict';
  const lang = () => (window.saqI18n && ['ru', 'kk', 'en'].includes(window.saqI18n.language)) ? window.saqI18n.language : 'ru';
  const reduced = () => { try { return window.SAQA11y ? window.SAQA11y.reducedMotion() : matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (q, el) => (el || document).querySelector(q);
  const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));

  const OPTS = ['only', 'cite', 'quote', 'list', 'unsure', 'edition'];
  const S = {
    ru: {
      tab1: 'Как спросить ИИ', tab2: 'Сравнение ИИ', tabs: 'Инструменты лаборатории',
      b_lead: 'Соберите промпт, после которого ИИ отвечает проверяемо: со статьями, пунктами и цитатами. Затем вставьте ответ и проверьте его в сканере.',
      b_case: '1 — Кейс', b_case_ph: 'Опишите обстоятельства: стороны, договор, что произошло…',
      b_q: '2 — Что спросить у ИИ', b_q_ph: 'Например: может ли покупатель вернуть предоплату?',
      b_req: '3 — Требования к ответу', b_lang: '4 — Язык ответа',
      o: { only: 'Только ГК РК, Особенная часть', cite: 'Статья и пункт у каждого вывода', quote: 'Дословная цитата нормы', list: 'Одно утверждение — один пункт', unsure: 'Честно писать «не уверен»', edition: 'Учитывать действующую редакцию' },
      l: { ru: 'Русский', kk: 'Қазақша', en: 'English' }, l_note: 'Для сканера лучше ответ на русском: текст кодекса в SAQ — на русском.',
      strength: 'Сила промпта', st: ['Слабый', 'Средний', 'Сильный', 'Отличный'],
      tips: { case: 'Добавьте кейс — без обстоятельств ИИ отвечает общими словами.', q: 'Сформулируйте вопрос — так ответ будет по делу.', opt: 'Включите больше требований — ответ станет проверяемым.' },
      out: 'Готовый промпт', copy: 'Скопировать промпт', copied: 'Скопировано ✓', copyFail: 'Не удалось скопировать — выделите текст вручную.',
      steps: 'Вставьте промпт в ChatGPT, Gemini, Claude или другой ИИ, скопируйте его ответ и вставьте ниже.',
      b_ans: '5 — Ответ ИИ', b_ans_ph: 'Вставьте сюда ответ ИИ…', toScan: 'Проверить в сканере ↗', toCmp: 'Добавить в сравнение',
      needAns: 'Сначала вставьте ответ ИИ.', needCase: 'Сначала опишите кейс.', added: (n) => `Ответ добавлен в сравнение (слот ${n}).`, full: 'В сравнении уже три ответа — освободите слот.',
      p: {
        intro: 'Ты помогаешь студенту-юристу разобрать учебный кейс по гражданскому праву Республики Казахстан.',
        case: 'Кейс', q: 'Вопрос', qDefault: 'Какие права и обязанности есть у сторон и чем это подтверждается в законе?',
        req: 'Требования к ответу',
        only: 'Опирайся только на Гражданский кодекс Республики Казахстан (Особенная часть, статьи 406–1124). Не используй законы других стран и не придумывай статьи.',
        cite: 'После каждого вывода укажи статью и пункт ГК РК, например: (пункт 3 статьи 440 ГК РК).',
        quote: 'Для каждой статьи приведи дословную цитату нормы в кавычках.',
        list: 'Оформи ответ нумерованным списком: одно юридическое утверждение — один пункт.',
        unsure: 'Если не уверен в норме, прямо напиши «не уверен» — не угадывай.',
        edition: 'Учитывай действующую редакцию кодекса (её можно сверить в ИПС «Әділет»).',
        lang: { ru: 'Ответ дай на русском языке.', kk: 'Ответ дай на казахском языке.', en: 'Ответ дай на английском языке.' },
        empty: '(опишите кейс)',
      },
      c_lead: 'Вставьте один кейс и ответы двух-трёх ИИ. SAQ проверит каждый ответ по загруженному ГК РК и покажет, в каком меньше расхождений.',
      c_case: 'Кейс для всех ответов', c_case_ph: 'Опишите кейс, на который отвечали ИИ…',
      c_name: 'Название ИИ', c_name_ph: 'Например: ChatGPT', c_ans: 'Ответ', c_ans_ph: 'Вставьте ответ этого ИИ…', slot: (n) => `Ответ ${n}`,
      add: '+ Добавить третий ответ', remove: 'Убрать ответ', run: 'Сравнить ↗', example: 'Пример: три ответа', clear: 'Очистить',
      exNames: ['ИИ-1', 'ИИ-2', 'ИИ-3'], unnamed: (n) => `ИИ ${n}`,
      needTwo: 'Нужно минимум два ответа и кейс.', loading: 'Загружаю текст кодекса…', loadFail: 'Не удалось загрузить текст кодекса. Обновите страницу.',
      res: 'Результат сравнения', best: (n) => `Меньше всего расхождений с ГК РК — ${n}`, tie: 'Ответы получились равными по сверке с ГК РК',
      none: 'Сравнить не удалось: в ответах нет утверждений со статьями ГК РК.',
      score: 'Подтверждено законом', claims: (n) => `Утверждений: ${n}`, place: (n) => `${n} место`,
      st4: { confirmed: 'Подтверждено', partial: 'Частично', contradicts: 'Не соответствует', unverified: 'Не подтверждено' },
      flags: { missing: 'Несуществующие статьи', general_part: 'Ссылки на Общую часть', other_act: 'Ссылки на другие законы' },
      open: 'Открыть в сканере ↗', table: 'Таблица сравнения', metric: 'Показатель',
      note: 'Сравнение — только по совпадению с текстом ГК РК (Особенная часть). Это не оценка ИИ в целом и не юридическое заключение.',
      privacy: 'Кейс и ответы остаются в этом браузере и никуда не отправляются.',
    },
    kk: {
      tab1: 'ЖИ-ден қалай сұрау керек', tab2: 'ЖИ жауаптарын салыстыру', tabs: 'Зертхана құралдары',
      b_lead: 'ЖИ тексерілетін жауап беретін промпт құрастырыңыз: баптары, тармақтары және дәйексөздері бар. Содан кейін жауапты қойып, сканерде тексеріңіз.',
      b_case: '1 — Кейс', b_case_ph: 'Жағдайды сипаттаңыз: тараптар, шарт, не болды…',
      b_q: '2 — ЖИ-ден не сұрау керек', b_q_ph: 'Мысалы: сатып алушы алдын ала төлемді қайтара ала ма?',
      b_req: '3 — Жауапқа қойылатын талаптар', b_lang: '4 — Жауап тілі',
      o: { only: 'Тек ҚР АК, Ерекше бөлім', cite: 'Әр қорытындыда бап пен тармақ', quote: 'Норманың сөзбе-сөз дәйексөзі', list: 'Бір тұжырым — бір тармақ', unsure: '«Сенімді емеспін» деп адал жазу', edition: 'Қолданыстағы редакцияны ескеру' },
      l: { ru: 'Русский', kk: 'Қазақша', en: 'English' }, l_note: 'Сканер үшін орысша жауап жақсы: SAQ-тағы кодекс мәтіні орыс тілінде.',
      strength: 'Промпт күші', st: ['Әлсіз', 'Орташа', 'Күшті', 'Өте жақсы'],
      tips: { case: 'Кейсті қосыңыз — жағдайсыз ЖИ жалпы сөзбен жауап береді.', q: 'Сұрақты тұжырымдаңыз — жауап нақты болады.', opt: 'Көбірек талап қосыңыз — жауапты тексеру оңай болады.' },
      out: 'Дайын промпт', copy: 'Промптты көшіру', copied: 'Көшірілді ✓', copyFail: 'Көшіру мүмкін болмады — мәтінді қолмен белгілеңіз.',
      steps: 'Промптты ChatGPT, Gemini, Claude немесе басқа ЖИ-ге қойыңыз, оның жауабын көшіріп, төменге қойыңыз.',
      b_ans: '5 — ЖИ жауабы', b_ans_ph: 'ЖИ жауабын осында қойыңыз…', toScan: 'Сканерде тексеру ↗', toCmp: 'Салыстыруға қосу',
      needAns: 'Алдымен ЖИ жауабын қойыңыз.', needCase: 'Алдымен кейсті сипаттаңыз.', added: (n) => `Жауап салыстыруға қосылды (${n}-орын).`, full: 'Салыстыруда үш жауап бар — бір орынды босатыңыз.',
      p: {
        intro: 'Сен заңгер студентке Қазақстан Республикасының азаматтық құқығы бойынша оқу кейсін талдауға көмектесесің.',
        case: 'Кейс', q: 'Сұрақ', qDefault: 'Тараптардың қандай құқықтары мен міндеттері бар және бұл заңда немен расталады?',
        req: 'Жауапқа қойылатын талаптар',
        only: 'Тек Қазақстан Республикасының Азаматтық кодексіне (Ерекше бөлім, 406–1124-баптар) сүйен. Басқа елдердің заңдарын қолданба және баптарды ойдан шығарма.',
        cite: 'Әр қорытындыдан кейін ҚР АК бабы мен тармағын көрсет, мысалы: (ҚР АК 440-бабының 3-тармағы).',
        quote: 'Әр бап үшін норманың сөзбе-сөз дәйексөзін тырнақшада келтір.',
        list: 'Жауапты нөмірленген тізіммен жаз: бір заңдық тұжырым — бір тармақ.',
        unsure: 'Нормаға сенімді болмасаң, «сенімді емеспін» деп тура жаз — болжама.',
        edition: 'Кодекстің қолданыстағы редакциясын ескер (оны «Әділет» АҚЖ-да тексеруге болады).',
        lang: { ru: 'Жауапты орыс тілінде бер.', kk: 'Жауапты қазақ тілінде бер.', en: 'Жауапты ағылшын тілінде бер.' },
        empty: '(кейсті сипаттаңыз)',
      },
      c_lead: 'Бір кейсті және екі-үш ЖИ жауабын қойыңыз. SAQ әр жауапты жүктелген ҚР АК бойынша тексеріп, қайсысында сәйкессіздік аз екенін көрсетеді.',
      c_case: 'Барлық жауаптарға ортақ кейс', c_case_ph: 'ЖИ жауап берген кейсті сипаттаңыз…',
      c_name: 'ЖИ атауы', c_name_ph: 'Мысалы: ChatGPT', c_ans: 'Жауап', c_ans_ph: 'Осы ЖИ-дің жауабын қойыңыз…', slot: (n) => `${n}-жауап`,
      add: '+ Үшінші жауапты қосу', remove: 'Жауапты алып тастау', run: 'Салыстыру ↗', example: 'Мысал: үш жауап', clear: 'Тазалау',
      exNames: ['ЖИ-1', 'ЖИ-2', 'ЖИ-3'], unnamed: (n) => `ЖИ ${n}`,
      needTwo: 'Кемінде екі жауап және кейс керек.', loading: 'Кодекс мәтінін жүктеп жатырмын…', loadFail: 'Кодекс мәтіні жүктелмеді. Бетті жаңартыңыз.',
      res: 'Салыстыру нәтижесі', best: (n) => `ҚР АК-мен сәйкессіздігі ең аз — ${n}`, tie: 'Жауаптар ҚР АК-мен салыстыру бойынша тең шықты',
      none: 'Салыстыру мүмкін болмады: жауаптарда ҚР АК баптары бар тұжырымдар жоқ.',
      score: 'Заңмен расталды', claims: (n) => `Тұжырымдар: ${n}`, place: (n) => `${n}-орын`,
      st4: { confirmed: 'Расталды', partial: 'Ішінара', contradicts: 'Сәйкес емес', unverified: 'Расталмады' },
      flags: { missing: 'Жоқ баптар', general_part: 'Жалпы бөлімге сілтемелер', other_act: 'Басқа заңдарға сілтемелер' },
      open: 'Сканерде ашу ↗', table: 'Салыстыру кестесі', metric: 'Көрсеткіш',
      note: 'Салыстыру тек ҚР АК (Ерекше бөлім) мәтінімен сәйкестік бойынша. Бұл ЖИ-дің жалпы бағасы да, заңдық қорытынды да емес.',
      privacy: 'Кейс пен жауаптар осы браузерде қалады және ешқайда жіберілмейді.',
    },
    en: {
      tab1: 'How to ask an AI', tab2: 'Compare AI answers', tabs: 'Lab tools',
      b_lead: 'Build a prompt that makes an AI answer in a checkable way: with articles, clauses and quotes. Then paste the answer and check it in the scanner.',
      b_case: '1 — Case', b_case_ph: 'Describe the facts: the parties, the contract, what happened…',
      b_q: '2 — What to ask the AI', b_q_ph: 'For example: can the buyer get the prepayment back?',
      b_req: '3 — Requirements for the answer', b_lang: '4 — Answer language',
      o: { only: 'Only the Civil Code, Special Part', cite: 'Article and clause for every conclusion', quote: 'Verbatim quote of the norm', list: 'One statement per item', unsure: 'Say “not sure” honestly', edition: 'Use the current edition' },
      l: { ru: 'Русский', kk: 'Қазақша', en: 'English' }, l_note: 'For the scanner an answer in Russian works best: the Code text in SAQ is in Russian.',
      strength: 'Prompt strength', st: ['Weak', 'Fair', 'Strong', 'Excellent'],
      tips: { case: 'Add the case — without facts an AI answers in general terms.', q: 'Phrase a question — the answer will be to the point.', opt: 'Turn on more requirements — the answer becomes checkable.' },
      out: 'Ready prompt', copy: 'Copy the prompt', copied: 'Copied ✓', copyFail: 'Could not copy — select the text manually.',
      steps: 'Paste the prompt into ChatGPT, Gemini, Claude or another AI, copy its answer and paste it below.',
      b_ans: '5 — The AI answer', b_ans_ph: 'Paste the AI answer here…', toScan: 'Check in the scanner ↗', toCmp: 'Add to the comparison',
      needAns: 'Paste the AI answer first.', needCase: 'Describe the case first.', added: (n) => `The answer was added to the comparison (slot ${n}).`, full: 'The comparison already has three answers — free a slot.',
      p: {
        intro: 'You are helping a law student analyse a study case under the civil law of the Republic of Kazakhstan.',
        case: 'Case', q: 'Question', qDefault: 'What rights and obligations do the parties have, and what in the law supports this?',
        req: 'Requirements for the answer',
        only: 'Rely only on the Civil Code of the Republic of Kazakhstan (Special Part, Articles 406–1124). Do not use the laws of other countries and do not invent articles.',
        cite: 'After every conclusion give the article and clause of the Civil Code, for example: (Article 440, clause 3, Civil Code of Kazakhstan).',
        quote: 'For every article give a verbatim quote of the norm in quotation marks.',
        list: 'Format the answer as a numbered list: one legal statement per item.',
        unsure: 'If you are not sure about a norm, say “not sure” plainly — do not guess.',
        edition: 'Take into account the current edition of the Code (it can be checked on Adilet).',
        lang: { ru: 'Answer in Russian.', kk: 'Answer in Kazakh.', en: 'Answer in English.' },
        empty: '(describe the case)',
      },
      c_lead: 'Paste one case and the answers of two or three AIs. SAQ checks each answer against the loaded Civil Code and shows which one has fewer discrepancies.',
      c_case: 'Case for all answers', c_case_ph: 'Describe the case the AIs answered…',
      c_name: 'AI name', c_name_ph: 'For example: ChatGPT', c_ans: 'Answer', c_ans_ph: 'Paste this AI’s answer…', slot: (n) => `Answer ${n}`,
      add: '+ Add a third answer', remove: 'Remove the answer', run: 'Compare ↗', example: 'Example: three answers', clear: 'Clear',
      exNames: ['AI-1', 'AI-2', 'AI-3'], unnamed: (n) => `AI ${n}`,
      needTwo: 'At least two answers and a case are needed.', loading: 'Loading the text of the Code…', loadFail: 'Could not load the text of the Code. Reload the page.',
      res: 'Comparison result', best: (n) => `Fewest discrepancies with the Civil Code — ${n}`, tie: 'The answers came out equal against the Civil Code',
      none: 'Could not compare: the answers have no statements with Civil Code articles.',
      score: 'Confirmed by the law', claims: (n) => `Statements: ${n}`, place: (n) => `Place ${n}`,
      st4: { confirmed: 'Confirmed', partial: 'Partly', contradicts: 'Does not match', unverified: 'Not confirmed' },
      flags: { missing: 'Non-existent articles', general_part: 'General Part references', other_act: 'References to other laws' },
      open: 'Open in the scanner ↗', table: 'Comparison table', metric: 'Metric',
      note: 'The comparison is only by agreement with the text of the Civil Code (Special Part). It is not an overall rating of the AI and not a legal opinion.',
      privacy: 'The case and the answers stay in this browser and are never sent anywhere.',
    },
  };
  const T = () => S[lang()];

  const EX = {
    case: 'Покупатель перечислил продавцу 180 000 ₸ предварительной оплаты за оборудование. Срок передачи истёк, оборудование не передано. Покупатель хочет вернуть деньги.',
    answers: [
      'Продавец обязан передать покупателю товар, предусмотренный договором купли-продажи (статья 408 ГК РК). В случаях, когда продавец, получивший сумму предварительной оплаты, не исполняет обязанность по передаче товара в установленный срок, покупатель вправе потребовать передачи оплаченного товара или возврата суммы предварительной оплаты (пункт 3 статьи 440 ГК РК).',
      'Отношения сторон регулируются договором купли-продажи (статья 406 ГК РК). Продавец обязан передать покупателю товар, предусмотренный договором (статья 408 ГК РК). Возможность потребовать назад предоплату за непоставленный товар установлена пунктом 3 статьи 407 ГК РК. Если срок возврата займа договором не установлен, он должен быть возвращен в течение десяти дней со дня предъявления требования (статья 722 ГК РК).',
      'Согласно статье 1250 ГК РК продавец обязан вернуть предоплату в течение 3 дней. По статье 277 ГК РК обязательство должно исполняться надлежащим образом. В соответствии со статьей 487 ГК РФ покупатель вправе потребовать возврата предоплаты.',
    ],
  };

  const st = { tab: 1, opts: { only: true, cite: true, quote: true, list: true, unsure: true, edition: false }, alang: 'ru', slots: 2, result: null };
  let root;

  /* ---------------------------------------------------------- prompt */
  function buildPrompt() {
    const L = T().p; const c = $('#lab-case').value.trim(); const q = $('#lab-q').value.trim();
    const reqs = OPTS.filter((k) => st.opts[k]).map((k) => L[k]);
    reqs.push(L.lang[st.alang]);
    return `${L.intro}\n\n${L.case}: ${c || L.empty}\n${L.q}: ${q || L.qDefault}\n\n${L.req}:\n${reqs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }
  function strength() {
    const c = $('#lab-case').value.trim().length; const q = $('#lab-q').value.trim().length;
    const on = OPTS.filter((k) => st.opts[k]).length;
    const pts = (c >= 40 ? 2 : c > 0 ? 1 : 0) + (q >= 10 ? 1 : 0) + on; // max 2 + 1 + 6 = 9
    return { pts, max: 9, c, q, on };
  }
  function renderBuilder() {
    const L = T();
    $('#lab-prompt').textContent = buildPrompt();
    const s = strength(); const pct = Math.round(s.pts / s.max * 100);
    const lvl = !s.c ? 0 : pct >= 90 ? 3 : pct >= 66 ? 2 : pct >= 40 ? 1 : 0;
    const meter = $('#lab-strength');
    meter.querySelector('.lab-st-fill').style.width = pct + '%';
    meter.dataset.lvl = String(lvl);
    meter.querySelector('.lab-st-val').textContent = L.st[lvl];
    meter.querySelector('.lab-st-bar').setAttribute('aria-valuenow', String(pct));
    meter.querySelector('.lab-st-bar').setAttribute('aria-valuetext', `${L.st[lvl]}, ${pct}%`);
    const tip = !s.c ? L.tips.case : (s.q < 10 ? L.tips.q : (s.on < 5 ? L.tips.opt : ''));
    meter.querySelector('.lab-st-tip').textContent = tip;
    $$('.lab-opt', root).forEach((b) => b.setAttribute('aria-pressed', String(!!st.opts[b.dataset.opt])));
    $$('.lab-alang button', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.alang === st.alang)));
    $('.lab-lnote', root).hidden = st.alang === 'ru';
  }
  async function copyText(text, note) {
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext !== false) { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
    }
    note.textContent = ok ? T().copied : T().copyFail; note.classList.toggle('is-ok', ok);
    clearTimeout(note._t); note._t = setTimeout(() => { note.textContent = ''; }, 2600);
  }
  function toScanner(caseText, answer) {
    const c = $('#case'); const a = $('#ai'); if (!c || !a) return;
    if (location.hash !== '#scanner') location.hash = 'scanner';
    setTimeout(() => {
      c.value = caseText.slice(0, 5000); a.value = answer.slice(0, 10000);
      c.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('input'));
      const b = $('#scan-btn'); if (b) b.click();
    }, 60);
  }

  /* ---------------------------------------------------------- compare */
  function slotHtml(i) {
    const L = T(); const n = i + 1;
    return `<div class="lab-slot" data-slot="${i}"><div class="lab-slot-head"><span class="lab-slot-n" aria-hidden="true">${n}</span><b class="lab-slot-t" id="lab-slot-t${i}">${esc(L.slot(n))}</b>${i === 2 ? `<button type="button" class="lab-x" data-act="remove" aria-label="${esc(L.remove)}" title="${esc(L.remove)}">×</button>` : ''}</div>
      <div class="field"><label for="lab-n${i}" data-k="c_name">${esc(L.c_name)}</label><input id="lab-n${i}" class="lab-name" maxlength="40" placeholder="${esc(L.c_name_ph)}" data-ph="c_name_ph"></div>
      <div class="field"><label for="lab-a${i}" data-k="c_ans">${esc(L.c_ans)}</label><textarea id="lab-a${i}" class="lab-ans" maxlength="10000" placeholder="${esc(L.c_ans_ph)}" data-ph="c_ans_ph"></textarea></div></div>`;
  }
  function setSlots(n) {
    const box = $('#lab-slots'); const keep = $$('.lab-slot', box).map((s) => ({ name: s.querySelector('.lab-name').value, ans: s.querySelector('.lab-ans').value }));
    st.slots = n;
    box.innerHTML = Array.from({ length: n }, (_, i) => slotHtml(i)).join('');
    box.classList.toggle('has3', n === 3);
    $$('.lab-slot', box).forEach((s, i) => { if (keep[i]) { s.querySelector('.lab-name').value = keep[i].name; s.querySelector('.lab-ans').value = keep[i].ans; } });
    $('#lab-add').hidden = n >= 3;
  }
  function analyzeAll(law, caseText, items) {
    return items.map((it) => {
      const r = window.SAQScanner.analyze(law, caseText, it.answer);
      const c = { confirmed: 0, partial: 0, contradicts: 0, unverified: 0 }; const f = { missing: 0, general_part: 0, other_act: 0 };
      r.claims.forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; x.refs.forEach((ref) => { if (f[ref.state] != null) f[ref.state] += 1; }); });
      const n = r.claims.length;
      const score = n ? Math.round((c.confirmed + 0.5 * c.partial) / n * 100) : null;
      return { name: it.name, answer: it.answer, n, c, f, score };
    });
  }
  function rank(list) {
    const order = list.map((x, i) => i).filter((i) => list[i].score != null)
      .sort((a, b) => (list[b].score - list[a].score) || (list[a].c.contradicts - list[b].c.contradicts) || (list[a].f.missing - list[b].f.missing));
    const place = new Array(list.length).fill(null); let p = 0; let prev = null;
    order.forEach((i, k) => { const key = `${list[i].score}|${list[i].c.contradicts}|${list[i].f.missing}`; if (key !== prev) { p = k + 1; prev = key; } place[i] = p; });
    return place;
  }
  function renderResult(animate) {
    const out = $('#lab-result'); const R = st.result; const L = T();
    if (!R) { out.innerHTML = ''; out.hidden = true; return; }
    out.hidden = false;
    const place = rank(R.list);
    const ranked = R.list.filter((x) => x.score != null);
    let head;
    if (!ranked.length) head = `<p class="lab-verdict is-none">${esc(L.none)}</p>`;
    else {
      const firsts = R.list.filter((x, i) => place[i] === 1);
      head = firsts.length > 1 && firsts.length === ranked.length ? `<p class="lab-verdict">${esc(L.tie)}</p>` : `<p class="lab-verdict"><span class="lab-crown" aria-hidden="true">✦</span>${esc(L.best(firsts.map((x) => x.name).join(', ')))}</p>`;
    }
    const cards = R.list.map((x, i) => {
      const seg = ['confirmed', 'partial', 'contradicts', 'unverified'].map((s) => `<i class="lab-seg lab-seg--${s}" style="--w:${x.n ? (x.c[s] / x.n * 100).toFixed(2) : 0}%"></i>`).join('');
      const flags = Object.keys(x.f).filter((k) => x.f[k]).map((k) => `<li class="lab-flag lab-flag--${k}">${esc(L.flags[k])}: <b>${x.f[k]}</b></li>`).join('');
      return `<article class="lab-card${place[i] === 1 ? ' is-best' : ''}" style="--d:${i}">
        <header><span class="lab-place${place[i] ? '' : ' is-none'}">${place[i] ? esc(L.place(place[i])) : '—'}</span><h4>${esc(x.name)}</h4></header>
        <div class="lab-score"><strong data-to="${x.score == null ? '' : x.score}">${x.score == null ? '—' : (animate && !reduced() ? '0' : x.score)}</strong>${x.score == null ? '' : '<span>%</span>'}<small>${esc(L.score)}</small></div>
        <div class="lab-bar" aria-hidden="true">${seg}</div>
        <ul class="lab-counts">${['confirmed', 'partial', 'contradicts', 'unverified'].map((s) => `<li class="lab-cnt lab-cnt--${s}"><i></i>${esc(L.st4[s])}: <b>${x.c[s]}</b></li>`).join('')}</ul>
        ${flags ? `<ul class="lab-flags">${flags}</ul>` : ''}
        <p class="lab-claims">${esc(L.claims(x.n))}</p>
        <button type="button" class="lab-btn" data-act="open" data-i="${i}">${esc(L.open)}</button>
      </article>`;
    }).join('');
    const metrics = [[L.score, (x) => (x.score == null ? '—' : x.score + '%')], [L.st4.confirmed, (x) => x.c.confirmed], [L.st4.partial, (x) => x.c.partial], [L.st4.contradicts, (x) => x.c.contradicts], [L.st4.unverified, (x) => x.c.unverified],
      [L.flags.missing, (x) => x.f.missing], [L.flags.other_act, (x) => x.f.other_act]];
    const table = `<details class="lab-tablewrap"><summary>${esc(L.table)}</summary><div class="lab-tscroll"><table class="lab-table"><thead><tr><th scope="col">${esc(L.metric)}</th>${R.list.map((x) => `<th scope="col">${esc(x.name)}</th>`).join('')}</tr></thead><tbody>${metrics.map(([m, fn]) => `<tr><th scope="row">${esc(m)}</th>${R.list.map((x) => `<td>${esc(fn(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
    out.innerHTML = `<h3 class="lab-res-h" tabindex="-1">${esc(L.res)}</h3>${head}<div class="lab-cards${R.list.length === 3 ? ' has3' : ''}${animate && !reduced() ? ' is-anim' : ''}">${cards}</div>${table}<p class="lab-note">${esc(L.note)}</p>`;
    if (animate && !reduced()) {
      $$('.lab-score strong', out).forEach((el, k) => {
        const to = Number(el.dataset.to); if (!el.dataset.to) return;
        const t0 = performance.now() + k * 140; const dur = 1100;
        const step = (now) => { const p = Math.max(0, Math.min(1, (now - t0) / dur)); el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }
  }
  async function runCompare() {
    const L = T(); const info = $('#lab-cinfo');
    const caseText = $('#lab-ccase').value.trim();
    const items = $$('.lab-slot', root).map((s, i) => ({ name: s.querySelector('.lab-name').value.trim() || L.unnamed(i + 1), answer: s.querySelector('.lab-ans').value.trim() })).filter((x) => x.answer);
    if (!caseText || items.length < 2) { info.textContent = L.needTwo; return; }
    info.textContent = L.loading;
    try {
      const law = await window.SAQLaw.load();
      st.result = { list: analyzeAll(law, caseText, items), caseText };
      info.textContent = '';
      renderResult(true);
      const h = $('.lab-res-h', root);
      if (h) { try { h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (_) { h.scrollIntoView(); } h.focus({ preventScroll: true }); }
    } catch (_) { info.textContent = L.loadFail; }
  }

  /* ---------------------------------------------------------- shell */
  function build() {
    root = $('#saq-lab'); if (!root || root.dataset.built) return; root.dataset.built = '1';
    root.innerHTML = `<div class="lab-tabs" role="tablist" data-aria="tabs">
        <button type="button" role="tab" id="lab-t1" aria-controls="lab-p1" aria-selected="true"><span aria-hidden="true">✎</span> <span data-k="tab1"></span></button>
        <button type="button" role="tab" id="lab-t2" aria-controls="lab-p2" aria-selected="false" tabindex="-1"><span aria-hidden="true">⇄</span> <span data-k="tab2"></span></button>
      </div>
      <section class="lab-panel" id="lab-p1" role="tabpanel" aria-labelledby="lab-t1">
        <p class="lab-lead" data-k="b_lead"></p>
        <div class="lab-grid">
          <div class="lab-form card">
            <div class="field"><label for="lab-case" data-k="b_case"></label><textarea id="lab-case" maxlength="5000" data-ph="b_case_ph"></textarea></div>
            <div class="field"><label for="lab-q" data-k="b_q"></label><input id="lab-q" maxlength="300" data-ph="b_q_ph"></div>
            <div class="lab-group" role="group" aria-labelledby="lab-req-l"><span class="lab-glabel" id="lab-req-l" data-k="b_req"></span><div class="lab-opts">${OPTS.map((k) => `<button type="button" class="lab-opt" data-opt="${k}" aria-pressed="false"><i aria-hidden="true"></i><span data-k="o.${k}"></span></button>`).join('')}</div></div>
            <div class="lab-group" role="group" aria-labelledby="lab-lang-l"><span class="lab-glabel" id="lab-lang-l" data-k="b_lang"></span><div class="lab-alang">${['ru', 'kk', 'en'].map((k) => `<button type="button" data-alang="${k}" aria-pressed="false" data-k="l.${k}"></button>`).join('')}</div><p class="lab-lnote" data-k="l_note" hidden></p></div>
          </div>
          <div class="lab-outcol">
            <div class="lab-strength" id="lab-strength" data-lvl="0"><div class="lab-st-top"><span data-k="strength"></span><b class="lab-st-val"></b></div><div class="lab-st-bar" role="progressbar" aria-labelledby="lab-st-l" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="lab-st-fill"></span></div><span id="lab-st-l" class="lab-sr" data-k="strength"></span><p class="lab-st-tip"></p></div>
            <div class="lab-prompt-card"><div class="lab-pc-head"><b data-k="out"></b><button type="button" class="lab-btn lab-copy" data-act="copy" data-k="copy"></button></div><pre class="lab-prompt" id="lab-prompt" tabindex="0" aria-labelledby="lab-prompt-l"></pre><span id="lab-prompt-l" class="lab-sr" data-k="out"></span><p class="lab-copied" role="status"></p></div>
            <p class="lab-steps"><span aria-hidden="true">→</span> <span data-k="steps"></span></p>
            <div class="field"><label for="lab-answer" data-k="b_ans"></label><textarea id="lab-answer" maxlength="10000" data-ph="b_ans_ph"></textarea></div>
            <div class="actions lab-actions"><button type="button" class="btn primary" data-act="toScan" data-k="toScan"></button><button type="button" class="lab-btn" data-act="toCmp" data-k="toCmp"></button></div>
            <p class="lab-binfo" role="status"></p>
          </div>
        </div>
      </section>
      <section class="lab-panel" id="lab-p2" role="tabpanel" aria-labelledby="lab-t2" hidden>
        <p class="lab-lead" data-k="c_lead"></p>
        <div class="field"><label for="lab-ccase" data-k="c_case"></label><textarea id="lab-ccase" class="lab-ccase" maxlength="5000" data-ph="c_case_ph"></textarea></div>
        <div class="lab-slots" id="lab-slots"></div>
        <button type="button" class="lab-btn lab-add" id="lab-add" data-act="add" data-k="add"></button>
        <div class="actions lab-actions"><button type="button" class="btn primary" data-act="run" data-k="run"></button><button type="button" class="lab-btn lab-ex" data-act="example"><span aria-hidden="true">✦</span> <span data-k="example"></span></button><button type="button" class="lab-btn" data-act="clear" data-k="clear"></button></div>
        <p class="lab-cinfo" id="lab-cinfo" role="status"></p>
        <section class="lab-result" id="lab-result" aria-live="polite" hidden></section>
      </section>
      <p class="lab-privacy" data-k="privacy"></p>`;
    setSlots(2);
    texts();
    wire();
  }
  function getK(L, k) { return k.split('.').reduce((o, p) => (o ? o[p] : ''), L); }
  function texts() {
    const L = T();
    $$('[data-k]', root).forEach((el) => { const v = getK(L, el.dataset.k); if (typeof v === 'string') el.textContent = v; });
    $$('[data-ph]', root).forEach((el) => { el.placeholder = getK(L, el.dataset.ph); });
    $('.lab-tabs', root).setAttribute('aria-label', L.tabs);
    $$('.lab-slot', root).forEach((s, i) => { s.querySelector('.lab-slot-t').textContent = L.slot(i + 1); const x = s.querySelector('.lab-x'); if (x) { x.setAttribute('aria-label', L.remove); x.title = L.remove; } });
    root.setAttribute('lang', lang());
    renderBuilder();
    renderResult(false);
  }
  function setTab(n, focus) {
    st.tab = n;
    [1, 2].forEach((k) => { const t = $('#lab-t' + k); const p = $('#lab-p' + k); const on = k === n; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; p.hidden = !on; });
    if (n === 2 && !$('#lab-ccase').value.trim() && $('#lab-case').value.trim()) $('#lab-ccase').value = $('#lab-case').value;
    if (focus) $('#lab-t' + n).focus();
  }
  function wire() {
    const tabs = $('.lab-tabs', root);
    tabs.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) setTab(t.id === 'lab-t2' ? 2 : 1, false); });
    tabs.addEventListener('keydown', (e) => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const cur = document.activeElement && document.activeElement.id === 'lab-t2' ? 2 : 1; setTab(e.key === 'Home' ? 1 : e.key === 'End' ? 2 : (cur === 1 ? 2 : 1), true); } });
    ['#lab-case', '#lab-q'].forEach((q) => $(q, root).addEventListener('input', renderBuilder));
    root.addEventListener('click', (e) => {
      const opt = e.target.closest('.lab-opt'); if (opt) { st.opts[opt.dataset.opt] = !st.opts[opt.dataset.opt]; renderBuilder(); return; }
      const al = e.target.closest('[data-alang]'); if (al) { st.alang = al.dataset.alang; renderBuilder(); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const L = T(); const act = b.dataset.act; const binfo = $('.lab-binfo', root);
      if (act === 'copy') copyText($('#lab-prompt').textContent, $('.lab-copied', root));
      else if (act === 'toScan') {
        const a = $('#lab-answer').value.trim(); const c = $('#lab-case').value.trim();
        if (!c) { binfo.textContent = L.needCase; return; } if (!a) { binfo.textContent = L.needAns; return; }
        binfo.textContent = ''; toScanner(c, a);
      } else if (act === 'toCmp') {
        const a = $('#lab-answer').value.trim(); if (!a) { binfo.textContent = L.needAns; return; }
        let slots = $$('.lab-slot', root); let free = slots.findIndex((s) => !s.querySelector('.lab-ans').value.trim());
        if (free < 0 && st.slots < 3) { setSlots(3); slots = $$('.lab-slot', root); free = 2; }
        if (free < 0) { binfo.textContent = L.full; return; }
        slots[free].querySelector('.lab-ans').value = a; binfo.textContent = L.added(free + 1);
        if (!$('#lab-ccase').value.trim()) $('#lab-ccase').value = $('#lab-case').value;
        setTab(2, false); slots[free].querySelector('.lab-name').focus();
      } else if (act === 'add') { setSlots(3); $('#lab-n2').focus(); }
      else if (act === 'remove') { const s = $$('.lab-slot', root)[2]; if (s) { s.querySelector('.lab-name').value = ''; s.querySelector('.lab-ans').value = ''; } setSlots(2); $('#lab-add').focus(); }
      else if (act === 'example') {
        setSlots(3); $('#lab-ccase').value = EX.case;
        $$('.lab-slot', root).forEach((s, i) => { s.querySelector('.lab-name').value = L.exNames[i]; s.querySelector('.lab-ans').value = EX.answers[i]; });
        runCompare();
      } else if (act === 'clear') {
        $('#lab-ccase').value = ''; setSlots(2); $$('.lab-slot', root).forEach((s) => { s.querySelector('.lab-name').value = ''; s.querySelector('.lab-ans').value = ''; });
        st.result = null; renderResult(false); $('#lab-cinfo').textContent = '';
      } else if (act === 'run') runCompare();
      else if (act === 'open') { const x = st.result && st.result.list[Number(b.dataset.i)]; if (x) toScanner(st.result.caseText, x.answer); }
    });
    document.querySelectorAll('[data-saq-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(texts, 0)));
    const warm = () => { if (window.SAQLaw) window.SAQLaw.load().catch(() => {}); };
    if (location.hash === '#lab') warm();
    window.addEventListener('hashchange', () => { if (location.hash === '#lab') warm(); });
  }
  window.SAQLab = { buildPrompt: () => buildPrompt(), strings: S, analyzeAll, rank };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
