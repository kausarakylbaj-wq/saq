/* SAQ — правовой сканер без ИИ.
 * Сопоставляет утверждения из ответа ИИ с загруженным текстом ГК РК (Особенная часть).
 * Работает целиком в браузере (и в Node для тестов): без сети, без платных сервисов.
 * Ничего не придумывает: статус ставится только по тому, что реально найдено в тексте кодекса,
 * а цитата — всегда точный фрагмент загруженного текста.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SAQScanner = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ text */
  const normalize = (s) => String(s || '')
    .replace(/ | /g, ' ')
    .replace(/ё/g, 'е').replace(/Ё/g, 'Е')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/[«»“”„‟″]/g, '"');
  const lower = (s) => normalize(s).toLowerCase();
  const WORD_RE = /[a-zа-яәғқңөұүһі0-9]+/g;
  const words = (s) => lower(s).match(WORD_RE) || [];

  /* Russian Snowball (Porter) stemmer */
  // No look-behind (unsupported in Safari before 16.4): the preceding а/я is captured and put back.
  const PERFECTIVE = /(?:ив|ивши|ившись|ыв|ывши|ывшись|([ая])(?:в|вши|вшись))$/;
  const REFLEXIVE = /(с[яь])$/;
  const ADJECTIVE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
  const PARTICIPLE = /(?:ивш|ывш|ующ|([ая])(?:ем|нн|вш|ющ|щ))$/;
  const VERB = /(?:ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю|([ая])(?:ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно))$/;
  const keepA = (m, a) => a || '';
  const NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
  const RVRE = /^(.*?[аеиоуыэюя])(.*)$/;
  const DERIVATIONAL = /.*[^аеиоуыэюя]+[аеиоуыэюя].*ость?$/;
  const stemCache = new Map();
  function stem(word) {
    let w = String(word).toLowerCase().replace(/ё/g, 'е');
    if (stemCache.has(w)) return stemCache.get(w);
    let out = w;
    if (/^[а-я]+$/.test(w)) {
      const m = RVRE.exec(w);
      if (m) {
        const pre = m[1];
        let rv = m[2];
        let t = rv.replace(PERFECTIVE, keepA);
        if (t === rv) {
          rv = rv.replace(REFLEXIVE, '');
          t = rv.replace(ADJECTIVE, '');
          if (t !== rv) rv = t.replace(PARTICIPLE, keepA);
          else { t = rv.replace(VERB, keepA); rv = t === rv ? rv.replace(NOUN, '') : t; }
        } else rv = t;
        rv = rv.replace(/и$/, '');
        if (DERIVATIONAL.test(rv)) rv = rv.replace(/ость?$/, '');
        t = rv.replace(/ь$/, '');
        if (t === rv) rv = rv.replace(/(ейше|ейш)$/, '').replace(/нн$/, 'н'); else rv = t;
        out = pre + rv;
      }
    }
    stemCache.set(w, out);
    return out;
  }

  const STOP_WORDS = ('и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по ее мне было вот от меня еще нет о из ему ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец об другой хоть после над больше тот через эти нас про всего них какая много разве эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это также который которая которое которые которых которым которой случае случаях данный данной данного указанный указанного является являются либо иной иного иное иные соответствующий соответствующего соответственно т е д п др лишь только даже весь вся всё свой своего своей').split(' ');
  const STOP = new Set(STOP_WORDS);
  // Words that describe the act of citing rather than the content of a rule.
  const META_WORDS = 'статья статьи статье статьей пункт пункта пункту пунктом подпункт часть гк рк кодекс кодекса гражданский гражданского республика республики казахстан закон закона согласно соответствии предусмотрено предусматривает предусмотрен устанавливает установлено установлен регулирует говорится сказано указано закреплено норма нормы нормой настоящего ответ ии искусственный возможность ст п пп рф российской федерации'.split(' ');
  const META = new Set(META_WORDS.map(stem));
  const NEG_WORDS = new Set(['не', 'нет', 'ни', 'нельзя', 'только', 'лишь', 'исключительно']);

  // Everyday words mapped to the wording the Code uses.
  const SYNONYM_PAIRS = [
    ['предоплата', 'предварительная оплата'], ['предоплату', 'предварительная оплата'], ['аванс', 'предварительная оплата'],
    ['вернуть', 'возврат'], ['возвратить', 'возврат'], ['вернет', 'возврат'], ['назад', 'возврат'], ['деньги', 'денежная сумма'],
    ['бесплатный', 'безвозмездный'], ['бесплатно', 'безвозмездно'], ['бесплатного', 'безвозмездного'], ['ремонт', 'устранение недостатков'],
    ['брак', 'недостаток'], ['дефект', 'недостаток'], ['поломка', 'недостаток'], ['компенсация', 'возмещение'], ['компенсировать', 'возместить'],
    ['арендатор', 'наниматель'], ['арендодатель', 'наймодатель'], ['аренда', 'имущественный наем'], ['съемщик', 'наниматель'],
    ['штраф', 'неустойка'], ['пеня', 'неустойка'], ['расторгнуть', 'расторжение'], ['поставить', 'передать'], ['доставить', 'передать'],
    ['непоставленный', 'не переданный'], ['непереданный', 'не переданный'], ['кредит', 'заем'], ['займ', 'заем'], ['замена', 'заменить'],
    ['деньгами', 'денежная сумма'], ['уценка', 'уменьшение цены'], ['скидка', 'уменьшение цены'],
    ['обязан', 'обязан обязуется'], ['обязана', 'обязан обязуется'], ['обязаны', 'обязан обязуется'],
  ];

  /* ------------------------------------------------------------- numbers */
  const NUM_WORDS = (() => {
    const m = {};
    const add = (v, list) => list.split(' ').forEach((w) => { m[w] = v; });
    add(1, 'один одного одному одним одном одна одной одну одно');
    add(2, 'два две двух двум двумя'); add(3, 'три трех трем тремя'); add(4, 'четыре четырех четырем четырьмя');
    add(5, 'пять пяти пятью'); add(6, 'шесть шести шестью'); add(7, 'семь семи семью'); add(8, 'восемь восьми восемью');
    add(9, 'девять девяти девятью'); add(10, 'десять десяти десятью'); add(11, 'одиннадцать одиннадцати'); add(12, 'двенадцать двенадцати');
    add(13, 'тринадцать тринадцати'); add(14, 'четырнадцать четырнадцати'); add(15, 'пятнадцать пятнадцати'); add(16, 'шестнадцать шестнадцати');
    add(17, 'семнадцать семнадцати'); add(18, 'восемнадцать восемнадцати'); add(19, 'девятнадцать девятнадцати'); add(20, 'двадцать двадцати');
    add(30, 'тридцать тридцати'); add(40, 'сорок сорока'); add(50, 'пятьдесят пятидесяти'); add(60, 'шестьдесят шестидесяти');
    add(70, 'семьдесят семидесяти'); add(80, 'восемьдесят восьмидесяти'); add(90, 'девяносто девяноста'); add(100, 'сто ста');
    add(1.5, 'полтора полутора');
    return m;
  })();
  const PREFIX_NUM = { одно: 1, двух: 2, дву: 2, трех: 3, четырех: 4, пяти: 5, шести: 6, семи: 7, восьми: 8, девяти: 9, десяти: 10, двенадцати: 12, пятнадцати: 15, двадцати: 20, тридцати: 30, сорока: 40, шестидесяти: 60, девяностo: 90, ста: 100 };
  const COMPOUND_RE = /^(одно|двух|дву|трех|четырех|пяти|шести|семи|восьми|девяти|десяти|двенадцати|пятнадцати|двадцати|тридцати|сорока|шестидесяти|ста)(дневн|суточн|недельн|месячн|летн|годичн|годов|кратн|процентн)/;
  const UNIT_OF = (w, next) => {
    if (/^(день|дня|дней|дн|сутки|суток|днями|дням)$/.test(w)) return 'd';
    if (/^недел/.test(w)) return 'w';
    if (/^месяц/.test(w)) return 'm';
    if (/^месячн/.test(w)) return next && /^расчетн/.test(next) ? 'mrp' : 'm';
    if (/^(год|года|году|годом|годах|лет|годы|годичн)$/.test(w)) return 'y';
    if (/^(час|часа|часов|часам)$/.test(w)) return 'h';
    if (/^процент/.test(w) || w === '%') return 'pct';
    if (/^мрп$/.test(w)) return 'mrp';
    if (/^(тенге|тг)$/.test(w)) return 'kzt';
    if (/^(раз|раза)$/.test(w)) return 'x';
    return null;
  };
  const SKIP_BETWEEN = /^(календарн|рабоч|банковск|полн|последовательн|месячн|годовых|дополнительн|календарный)/;
  const COMPOUND_UNIT = { дневн: 'd', суточн: 'd', недельн: 'w', месячн: 'm', летн: 'y', годичн: 'y', годов: 'y', кратн: 'x', процентн: 'pct' };
  const canonical = (q) => {
    switch (q.unit) {
      case 'd': return { dim: 'day', v: q.value };
      case 'w': return { dim: 'day', v: q.value * 7 };
      case 'm': return { dim: 'month', v: q.value };
      case 'y': return { dim: 'month', v: q.value * 12 };
      default: return { dim: q.unit, v: q.value };
    }
  };
  const UNIT_LABEL = { d: 'дн.', w: 'нед.', m: 'мес.', y: 'г.', h: 'ч.', pct: '%', mrp: 'МРП', kzt: 'тенге', x: '×' };
  function quantities(text) {
    const src = lower(text).replace(/(\d)\s*%/g, '$1 %');
    const toks = [];
    const re = /[a-zа-яәғқңөұүһі]+|\d+(?:[.,]\d+)?|%/g;
    let m;
    while ((m = re.exec(src))) toks.push({ w: m[0], i: m.index });
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i].w;
      const cm = COMPOUND_RE.exec(w);
      if (cm) {
        out.push({ value: PREFIX_NUM[cm[1]], unit: COMPOUND_UNIT[cm[2]], raw: w, at: toks[i].i });
        continue;
      }
      if (/^(месячн|годичн|недельн|суточн)/.test(w) && !(toks[i + 1] && /^расчетн/.test(toks[i + 1].w))) {
        const prev = toks[i - 1] && toks[i - 1].w;
        if (!(prev && (NUM_WORDS[prev] !== undefined || /^\d/.test(prev)))) {
          out.push({ value: 1, unit: COMPOUND_UNIT[w.match(/^(месячн|годичн|недельн|суточн)/)[1]], raw: w, at: toks[i].i });
        }
        continue;
      }
      if (/^(полгода|полугода|полугодие)$/.test(w)) { out.push({ value: 6, unit: 'm', raw: w, at: toks[i].i }); continue; }
      let value = null; let j = i;
      if (/^\d/.test(w)) value = parseFloat(w.replace(',', '.'));
      else if (NUM_WORDS[w] !== undefined) {
        value = NUM_WORDS[w];
        const nx = toks[i + 1] && toks[i + 1].w;
        if (value >= 20 && value % 10 === 0 && value < 100 && nx && NUM_WORDS[nx] !== undefined && NUM_WORDS[nx] < 10) { value += NUM_WORDS[nx]; j = i + 1; }
        else if (value === 100 && nx && NUM_WORDS[nx] !== undefined && NUM_WORDS[nx] < 100) { value += NUM_WORDS[nx]; j = i + 1; }
      }
      if (value === null) continue;
      let k = j + 1; let skipped = 0;
      while (k < toks.length && skipped < 2 && SKIP_BETWEEN.test(toks[k].w) && !/^месячн/.test(toks[k].w)) { k++; skipped++; }
      const unitWord = toks[k] && toks[k].w;
      const unit = unitWord ? UNIT_OF(unitWord, toks[k + 1] && toks[k + 1].w) : null;
      if (unit) { out.push({ value, unit, raw: src.slice(toks[i].i, toks[k].i + unitWord.length), at: toks[i].i }); i = k; }
    }
    return out;
  }
  const qLabel = (q) => q.raw || (q.value + ' ' + (UNIT_LABEL[q.unit] || q.unit));

  /* --------------------------------------------------------- references */
  const ART = '(?:стать(?:я|и|е|ю|ей|ёй|ями|ях|ям)|ст\\.?|article|art\\.?)';
  const CL = '(?:(?:под)?пункт(?:а|у|ом|е|ы|ов|ами|ах)?|пп?\\.|paragraph|para\\.?|clause|part)';
  const NUM = '(\\d{1,4}(?:-\\d{1,2}(?!\\d))?)';
  const OTHER_ACT_RE = /^[\s,.;:()"-]*(?:гк\s*рф|гражданск\w*\s+кодекс\w*\s+(?:рф|российск\w*)|трудов\w*|налогов\w*|уголовн\w*|административн\w*|процессуальн\w*|гпк|упк|апк|коап|тк\s*рк|нк\s*рк|ук\s*рк|жилищн\w*|земельн\w*|семейн\w*|кодекс\w*\s+о\s+|кодекс\w*\s+(?:рк|республики\s+казахстан)\s+о\s+|предпринимательск\w*\s+кодекс\w*|бюджетн\w*|экологическ\w*|закон\w*|конституц\w*|постановлен\w*|указ\w*|labou?r|tax|criminal|law\b|еңбек|салық|заң)/i;
  const RF_RE = /^[\s,.;:()"-]*(?:гк\s*рф|гражданск\w*\s+кодекс\w*\s+(?:рф|российск\w*))/i;
  const ACT_NAMES = [
    [/гк\s*рф|гражданск\w*\s+кодекс\w*\s+(рф|российск)/i, 'ГК РФ (закон другой страны)'],
    [/трудов|тк\s*рк|labou?r|еңбек/i, 'Трудовой кодекс'], [/налогов|нк\s*рк|tax|салық/i, 'Налоговый кодекс'],
    [/уголовн|ук\s*рк|упк|criminal/i, 'уголовное законодательство'], [/административн|коап/i, 'КоАП'],
    [/процессуальн|гпк|апк/i, 'процессуальный кодекс'], [/жилищн/i, 'жилищное законодательство'], [/земельн/i, 'Земельный кодекс'],
    [/семейн/i, 'Кодекс о браке и семье'], [/предпринимательск/i, 'Предпринимательский кодекс'], [/конституц/i, 'Конституция'],
    [/закон|law|заң/i, 'другой закон'],
  ];
  function actAfter(text, pos) {
    const tail = lower(text.slice(pos, pos + 70));
    // "ГК РК" / "Гражданского кодекса РК" right after the number means our Code.
    if (/^[\s,.;:()"-]*(гк\s*рк|гражданск\w*\s+кодекс\w*\s*(рк|республики|казахстан))/i.test(tail)) return null;
    const m = OTHER_ACT_RE.exec(tail);
    if (!m) return null;
    const near = tail.slice(0, m[0].length + 25);
    for (const [re, name] of ACT_NAMES) if (re.test(near)) return { name, foreign: RF_RE.test(near) };
    return { name: 'другой нормативный акт', foreign: false };
  }
  function parseRefs(text) {
    const src = normalize(text);
    const refs = [];
    const push = (article, clause, sub, idx, endIdx) => {
      const key = article + '|' + (clause || '');
      if (refs.some((r) => r.key === key)) return;
      const act = actAfter(src, endIdx);
      refs.push({ key, article, clause: clause || null, sub: sub || null, at: idx, act });
    };
    let m;
    // "подпункт 1) пункта 2 статьи 413", "пункт 3 статьи 407", "п. 3 ст. 407", "п.п. 1, 2 ст. 407"
    const reClauseArt = new RegExp(CL + '\\s*' + NUM + '\\)?(?:\\s*(?:,|и)\\s*\\d{1,3}\\)?)*\\s*(?:' + CL + '\\s*' + NUM + '\\s*)?(?:,\\s*)?' + ART + '\\s*' + NUM, 'gi');
    while ((m = reClauseArt.exec(src))) {
      const hasSub = /подпункт|пп\./i.test(m[0].slice(0, 9)) && m[2];
      if (hasSub) push(m[3], m[2], m[1], m.index, m.index + m[0].length);
      else push(m[3], m[2] || m[1], null, m.index, m.index + m[0].length);
    }
    // "статья 407", "ст. 407 п. 3", "статьи 407 и 409", "статьями 406-410"
    const reArt = new RegExp(ART + '\\s*' + NUM + '((?:\\s*(?:,|и|-)\\s*\\d{1,4}(?:-\\d{1,2})?)*)(?:\\s*(?:,\\s*)?\\(?' + CL + '\\s*(\\d{1,3}))?', 'gi');
    while ((m = reArt.exec(src))) {
      const first = m[1];
      const tail = m[2] || '';
      const end = m.index + m[0].length;
      if (refs.some((r) => r.article === first && r.at < m.index && m.index - r.at < 40)) continue;
      push(first, m[3] || null, null, m.index, end);
      const range = /^\s*-\s*(\d{3,4})$/.exec(tail);
      if (range && +range[1] > +first && +range[1] - +first <= 10) {
        for (let n = +first + 1; n <= +range[1]; n++) push(String(n), null, null, m.index, end);
      } else {
        (tail.match(/\d{1,4}(?:-\d{1,2})?/g) || []).forEach((n) => push(n, null, null, m.index, end));
      }
    }
    // "407 статья", "в 407-й статье", Kazakh "407-бап", "3-тармағы"
    const reNumFirst = /(\d{3,4}(?:-\d{1,2})?)(?:-?(?:я|й|ой|ей))?\s+стать(?:я|и|е|ю|ей)/gi;
    while ((m = reNumFirst.exec(src))) push(m[1], null, null, m.index, m.index + m[0].length);
    const reKz = /(?:(\d{1,3})\s*-?\s*тармақ\w*\s*)?(\d{3,4}(?:-\d{1,2})?)\s*-?\s*ба[пб]\w*(?:\s*(\d{1,3})\s*-?\s*тармақ)?/gi;
    while ((m = reKz.exec(src))) push(m[2], m[1] || m[3] || null, null, m.index, m.index + m[0].length);
    return refs.sort((a, b) => a.at - b.at);
  }

  /* ----------------------------------------------------- claims (sentences) */
  const ABBR = /\b(ст|п|пп|ч|г|гг|т|д|др|см|руб|тг|им|рис|напр|т\.е|т\.к|т\.д|т\.п|art|para|no|№)\.$/i;
  function splitSentences(text) {
    const src = normalize(text).replace(/\r/g, '');
    const out = [];
    src.split(/\n+/).forEach((line) => {
      let buf = '';
      const parts = line.replace(/([.!?…;])\s+/g, '$1\u0001').split('\u0001');
      parts.forEach((p) => {
        buf = buf ? buf + ' ' + p : p;
        const trimmed = buf.trim();
        const endsAbbr = ABBR.test(trimmed) || /\d\.$/.test(trimmed) && trimmed.length < 6;
        if (!endsAbbr) { out.push(trimmed); buf = ''; }
      });
      if (buf.trim()) out.push(buf.trim());
    });
    return out
      .map((s) => s.replace(/^[\s"'*•\-–—]+|[\s"']+$/g, '').replace(/^\d{1,2}[.)]\s+/, '').trim())
      .filter((s) => s.length >= 12 && /[а-яa-zәғқңөұүһі]{3}/i.test(s));
  }
  const LEGAL_CUE = /(?:^|[^а-яәғқңөұүһіa-z])(вправе|обязан|должен|должн|может|могут|не может|запрещ|допуска|подлежит|несет|ответственн|договор|покупател|продав|кредитор|должник|арендат|нанимател|наймодат|подрядчик|заказчик|исполнител|заемщик|заимодат|страхов|наслед|завещ|срок|неустойк|возмещ|убытк|требован|расторж|отказ|оплат|цен|товар|имуществ|сделк|право|обязательств|гарант|недостатк|иск|суд|залог|комисс|поручен|хранен|перевоз|бап|құқ|міндет|article|right|obligat)/i;
  const CONTINUATION = /^(при этом|также|кроме того|в этом случае|в таком случае|однако|но|это|такой|такое|такая|такие|данн|указанн|он|она|оно|они|его|ее|их|там же|при таких|в силу этого|следовательно|поэтому)\b/i;
  function extractClaims(answer, maxClaims) {
    const sents = splitSentences(answer);
    const claims = [];
    let lastRef = null;
    for (const s of sents) {
      const refs = parseRefs(s);
      const legal = refs.length > 0 || LEGAL_CUE.test(s);
      if (!legal) continue;
      if (claims.length >= (maxClaims || 15)) { claims.truncated = true; break; }
      let inherited = null;
      if (!refs.length && lastRef && CONTINUATION.test(lower(s))) inherited = lastRef;
      if (refs.length) lastRef = refs[0];
      claims.push({ text: s, refs: refs.length ? refs : (inherited ? [Object.assign({}, inherited, { inherited: true })] : []) });
    }
    return claims;
  }

  /* ------------------------------------------------------------- the index */
  function splitUnitSentences(text) {
    const res = [];
    const re = /[^.!?;\n]+(?:[.!?;]+|$)/g;
    let m;
    while ((m = re.exec(text))) {
      const s = m[0];
      const lead = s.length - s.trimStart().length;
      const t = s.trim();
      if (t.length > 3) res.push({ text: t, start: m.index + lead });
    }
    return res;
  }
  function stemSet(text) {
    const set = new Set();
    for (const w of words(text)) {
      if (STOP.has(w) || /^\d+$/.test(w) || w.length < 3) continue;
      const s = stem(w);
      if (s.length > 2) set.add(s);
    }
    return set;
  }
  function buildIndex(law) {
    const articles = law.articles.map((a) => {
      const lines = a.t.split('\n');
      const lineStart = [];
      let pos = 0;
      lines.forEach((l) => { lineStart.push(pos); pos += l.length + 1; });
      const units = [];
      const covered = new Array(lines.length).fill(false);
      (a.c || []).forEach(([num, s, e]) => {
        const text = lines.slice(s, e).join('\n');
        units.push({ clause: num, start: lineStart[s], text });
        for (let i = s; i < e; i++) covered[i] = true;
      });
      lines.forEach((l, i) => { if (!covered[i] && l.trim()) units.push({ clause: null, start: lineStart[i], text: l }); });
      units.sort((x, y) => x.start - y.start);
      units.forEach((u) => { u.stems = stemSet(u.text); u.prefixes = new Set([...u.stems].filter((s) => s.length >= 6).map((s) => s.slice(0, 5))); u.qty = quantities(u.text); });
      const all = new Set(stemSet(a.ti));
      units.forEach((u) => u.stems.forEach((s) => all.add(s)));
      const titleStems = stemSet(a.ti);
      const tf = new Map();
      for (const w of words(a.ti + '\n' + a.t)) {
        if (STOP.has(w) || /^\d+$/.test(w) || w.length < 3) continue;
        const s = stem(w);
        tf.set(s, (tf.get(s) || 0) + 1);
      }
      titleStems.forEach((s) => tf.set(s, (tf.get(s) || 0) + 3));
      let len = 0; tf.forEach((v) => { len += v; });
      return { n: a.n, title: a.ti, chapter: a.ch, section: a.se, text: a.t, clauses: new Map((a.c || []).map(([num, s, e]) => [num, { s, e }])), clauseOrder: (a.c || []).map((c) => c[0]), units, all, tf, len, prefixes: new Set([...all].filter((s) => s.length >= 6).map((s) => s.slice(0, 5))) };
    });
    const byNumber = new Map(articles.map((a) => [a.n, a]));
    const df = new Map();
    articles.forEach((a) => a.all.forEach((s) => df.set(s, (df.get(s) || 0) + 1)));
    const N = articles.length;
    const avgLen = articles.reduce((t, a) => t + a.len, 0) / N;
    const idf = (s) => { const d = df.get(s) || 0; return d ? Math.log(1 + (N - d + 0.5) / (d + 0.5)) : 0; };
    const syn = new Map();
    SYNONYM_PAIRS.forEach(([a, b]) => {
      const key = stem(a);
      const list = syn.get(key) || [];
      words(b).forEach((w) => { if (!STOP.has(w)) list.push(stem(w)); });
      syn.set(key, list);
    });
    const nums = articles.map((a) => a.n);
    return { meta: law.meta, articles, byNumber, idf, df, avgLen, syn, first: nums[0], last: nums[nums.length - 1] };
  }

  /* Query terms of a claim with weights; case-specific words (names, objects) that never occur in the Code are kept aside. */
  const UNITISH = /^(дн|день|дня|дней|сутк|месяц|месячн|год|года|лет|недел|календарн|рабоч|процент|час)/;
  function queryTerms(ix, text) {
    const terms = new Map();
    const display = new Map();
    const foreign = [];
    for (const w of words(text)) {
      if (STOP.has(w) || /^\d+$/.test(w) || w.length < 3) continue;
      if (NUM_WORDS[w] !== undefined || COMPOUND_RE.test(w) || UNITISH.test(w)) continue;
      const s = stem(w);
      if (META.has(s) || s.length < 3) continue;
      if (!display.has(s)) display.set(s, w);
      const alts = ix.syn.get(s);
      if (alts && alts.length) {
        alts.forEach((a) => { const wt = ix.idf(a); if (wt > 0 && !terms.has(a)) { terms.set(a, { w: Math.min(wt, 6), via: s, group: s }); if (!display.has(a)) display.set(a, w); } });
        continue;
      }
      const wt = ix.idf(s);
      if (wt > 0) { if (!terms.has(s)) terms.set(s, { w: Math.min(wt, 6) }); }
      else if (!foreign.includes(w)) foreign.push(w);
    }
    return { terms, display, foreign };
  }
  function matchWeight(s, stems, prefixes) {
    if (stems.has(s)) return 1;
    if (s.length >= 6 && prefixes.has(s.slice(0, 5))) return 0.6;
    return 0;
  }
  function coverage(q, stems, prefixes) {
    let tot = 0; let got = 0;
    const matched = []; const missing = [];
    q.terms.forEach((info, s) => {
      tot += info.w;
      const m = matchWeight(s, stems, prefixes);
      got += info.w * m;
      const label = q.display.get(info.via || s) || s;
      if (m > 0) { if (!matched.includes(label)) matched.push(label); } else if (!missing.includes(label)) missing.push(label);
    });
    return { score: tot ? got / tot : 0, matched, missing, weight: tot };
  }
  function rank(ix, q, limit) {
    const k1 = 1.2; const b = 0.75;
    const scores = [];
    for (const a of ix.articles) {
      let sc = 0;
      q.terms.forEach((info, s) => {
        let f = a.tf.get(s) || 0;
        if (!f && s.length >= 6 && a.prefixes.has(s.slice(0, 5))) f = 0.5;
        if (!f) return;
        sc += info.w * (f * (k1 + 1)) / (f + k1 * (1 - b + b * a.len / ix.avgLen));
      });
      if (sc > 0) scores.push({ a, sc });
    }
    scores.sort((x, y) => y.sc - x.sc);
    return scores.slice(0, limit || 5);
  }
  function bestUnit(a, q, clause) {
    let units = a.units;
    if (clause && a.clauses.has(clause)) units = a.units.filter((u) => u.clause === clause);
    let best = null;
    for (const u of units) {
      const c = coverage(q, u.stems, u.prefixes);
      if (!best || c.score > best.cov.score) best = { u, cov: c };
    }
    return best;
  }
  function articleCoverage(a, q) { return coverage(q, a.all, a.prefixes); }
  /* Share of the article title that the claim talks about (title words found among the claim terms). */
  function titleCoverage(ix, a, q) {
    const ts = [...stemSet(a.title)].filter((s) => !META.has(s));
    if (!ts.length) return 0;
    const qs = new Set(q.terms.keys());
    const qp = new Set([...qs].filter((s) => s.length >= 6).map((s) => s.slice(0, 5)));
    let got = 0; let tot = 0;
    ts.forEach((s) => { const w = Math.max(ix.idf(s), 0.3); tot += w; got += w * matchWeight(s, qs, qp); });
    return tot ? got / tot : 0;
  }
  /* Words of the claim that occur nowhere in the Code and are not facts of the case or proper names. */
  function unknownTerms(q, claimText, caseText) {
    const caseStems = stemSet(caseText || '');
    // Capitalised words that do not start a sentence (proper names). Written without look-behind for older Safari.
    const caps = new Set();
    { const src = normalize(claimText); const re = /[А-ЯA-ZӘҒҚҢӨҰҮҺІ][а-яa-zәғқңөұүһі]+/g; let m;
      while ((m = re.exec(src))) { const i = m.index; if (i >= 2 && /\s/.test(src[i - 1]) && !/[.!?]/.test(src[i - 2])) caps.add(m[0].toLowerCase()); } }
    const quoted = new Set((lower(claimText).match(/"[^"]{1,40}"/g) || []).flatMap((x) => words(x)));
    return q.foreign.filter((w) => w.length >= 5 && !caseStems.has(stem(w)) && !caps.has(w) && !quoted.has(w) && !/^[a-z]+$/.test(w));
  }

  /* The sentence of a clause that matches the claim best (exact substring of the clause). */
  function focusSentence(unit, q) {
    const sents = splitUnitSentences(unit.text);
    if (sents.length <= 1) return { text: unit.text, start: 0 };
    let best = null;
    for (const s of sents) {
      const st = stemSet(s.text);
      const pf = new Set([...st].filter((x) => x.length >= 6).map((x) => x.slice(0, 5)));
      const sc = coverage(q, st, pf).score;
      if (!best || sc > best.sc + 1e-9) best = { s, sc };
    }
    return best.s;
  }
  function qtyAgainst(unit, focus, claimQty) {
    const fq = quantities(focus.text);
    const uq = unit.qty;
    // Prefer the sentence that matches the claim; fall back to the whole clause for units it does not mention.
    return compareQuantities(claimQty, fq).map((x) => {
      if (x.t !== 'qty_missing') return x;
      const alt = compareQuantities([claimQty.find((c) => qLabel(c) === x.claim)], uq)[0];
      return alt && alt.t === 'qty_match' ? alt : x;
    });
  }

  /* Quote: always an exact substring of the article text. Long clauses are cut to their best sentences. */
  function makeQuote(a, unit, q, preferQty) {
    const text = unit.text;
    if (text.length <= 650) return { text, fragment: false, start: unit.start };
    const sents = splitUnitSentences(text);
    let best = null;
    for (const s of sents) {
      const st = stemSet(s.text);
      const pf = new Set([...st].filter((x) => x.length >= 6).map((x) => x.slice(0, 5)));
      let sc = coverage(q, st, pf).score;
      if (preferQty && quantities(s.text).some((x) => canonical(x).dim === preferQty)) sc += 0.5;
      if (!best || sc > best.sc) best = { s, sc };
    }
    if (!best) return { text: text.slice(0, 650), fragment: true, start: unit.start };
    let quote = best.s.text;
    let start = unit.start + best.s.start;
    // Keep the clause number visible when the best sentence is the first one.
    if (quote.length > 650) quote = quote.slice(0, 650);
    return { text: quote, fragment: quote !== text, start };
  }

  /* ---------------------------------------------- meaning checks (heuristic) */
  const MODAL_RE = /(не\s+)?(вправе|обязан[аоы]?|должн[аоы]?|должен|может|могут|имеет право|имеют право|допускается|запрещается|подлежит|подлежат)(\s+не)?(?:\s+(?:быть|бы))?(?:\s+([а-яәғқңөұүһі]+))?/g;
  // "не вправе без согласия поклажедателя пользоваться" → the verb is "пользоваться", not "без".
  const SKIP_WORD = /^(без|с|со|по|в|во|при|за|на|от|до|также|лишь|только|самостоятельно|своему|своей|своим)$/;
  const INFINITIVE = /(ть|ться|ти|тись|чь|чься)$/;
  function verbAfter(src, from, first) {
    if (!first || !SKIP_WORD.test(first)) return first || '';
    const words = src.slice(from).split(/[^а-яё]+/).filter(Boolean).slice(0, 7);
    return words.find((w) => INFINITIVE.test(w)) || first;
  }
  function modals(text) {
    const out = [];
    const src = lower(text);
    let m;
    while ((m = MODAL_RE.exec(src))) {
      let kind = /вправе|может|могут|имеет|имеют|допускается/.test(m[2]) ? 'may' : 'must';
      let negModal = !!m[1];
      if (m[2] === 'запрещается') { kind = 'may'; negModal = !negModal; }
      const vw = verbAfter(src, m.index + m[0].length - (m[4] || '').length, m[4]);
      out.push({ kind, negModal, negVerb: !!m[3], verb: vw ? stem(vw) : '', raw: m[0].trim() });
    }
    return out;
  }
  const STRONG_EXCL = /(не\s+имеет\s+значени\w*|не\s+имеют\s+значени\w*|значени\w*\s+не\s+име\w+|не\s+требуется|не\s+нужн\w*|не\s+обязательн\w*|не\s+важн\w*|полностью\s+исключ\w*|исключ(ен|ена|ено|ены)\b|не\s+допускается|нельзя|ни\s+при\s+каких)/;
  const LIMITER = /(^|[^а-я])(только|лишь|исключительно)([^а-я]|$)/;
  const NORM_NEG = /(^|[^а-я])(не\s+(вправе|может|могут|допускается|обязан\w*|требуется|имеет|имеют|подлежит|подлежат|применя\w*|несет|несут|влеч\w*|допуска\w*)|только|лишь|исключительно|нельзя|запрещ[а-я]*|исключ[а-я]*)([^а-я]|$)/;
  /* Who acts: the party named right before "обязан / вправе / должен …" (продавец vs покупатель etc.). */
  const PARTY_CANON = { 'займодатель': 'заимодатель' };
  const PARTY_RE = /(^|[^а-яё])(продавец|покупатель|заимодатель|займодатель|заемщик|наймодатель|наниматель|арендодатель|арендатор|хранитель|поклажедатель|подрядчик|субподрядчик|заказчик|исполнитель|перевозчик|грузоотправитель|грузополучатель|даритель|одаряемый|поставщик|ссудодатель|ссудополучатель|страховщик|страхователь|выгодоприобретатель|кредитор|должник|поверенный|доверитель|комиссионер|комитент|лизингодатель|лизингополучатель|агент|принципал|рентополучатель|плательщик|экспедитор|банк|клиент|вкладчик|гарант|бенефициар|поручитель|правообладатель|пользователь|франчайзер|концессионер|концедент|залогодатель|залогодержатель)(?=[^а-яё]|$)/g;
  const ROLE_ACT_RE = /(вправе|обязан[аоы]?|обязу[ею]тся|должн[аоы]?|должен|может|могут|имеет\s+право|несет|несут|отвечает)(\s+не)?(?:\s+(?:быть|бы))?(?:\s+([а-я]+))?/g;
  function roleActs(text) {
    const out = [];
    const re = new RegExp(ROLE_ACT_RE.source, 'g');
    let m;
    while ((m = re.exec(text))) {
      const head = text.slice(0, m.index);
      const cut = Math.max(head.lastIndexOf('.'), head.lastIndexOf(';'), head.lastIndexOf(':'), head.lastIndexOf('\n'), head.search(/,\s*(а|но)\s[^,]*$/));
      const seg = head.slice(cut + 1);
      let party = null; let pm; const pre = new RegExp(PARTY_RE.source, 'g');
      while ((pm = pre.exec(seg))) party = PARTY_CANON[pm[2]] || pm[2];
      const vw = verbAfter(text, m.index + m[0].length - (m[3] || '').length, m[3]);
      if (party && vw) out.push({ party, verb: stem(vw), neg: !!m[2] });
    }
    return out;
  }
  function meaningChecks(claimText, normText, unitText) {
    const issues = [];
    const cl = lower(claimText); const nt = lower(normText);
    const cm = modals(cl); const nm = modals(nt);
    const verbEq = (a, b) => a && b && (a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)));
    for (const c of cm) {
      const consistent = nm.some((n) => n.kind === c.kind && n.negModal === c.negModal && n.negVerb === c.negVerb && (!c.verb || !n.verb || verbEq(c.verb, n.verb)));
      if (consistent) continue;
      for (const n of nm) {
        const sameVerb = verbEq(c.verb, n.verb);
        if (!sameVerb && (cm.length > 1 || nm.length > 1)) continue;
        if (c.kind === 'may' && c.negVerb && n.kind === 'must' && !n.negModal && !n.negVerb) issues.push({ t: 'modal_conflict', claim: c.raw, norm: n.raw, strong: true });
        else if (c.negModal !== n.negModal && c.kind === n.kind && sameVerb) issues.push({ t: 'modal_conflict', claim: c.raw, norm: n.raw, strong: true });
        else if (c.kind === 'must' && n.kind === 'may' && !c.negModal && !n.negModal && sameVerb) issues.push({ t: 'duty_vs_right', claim: c.raw, norm: n.raw, strong: false });
      }
    }
    const nr = roleActs(lower(unitText || normText));
    for (const c of roleActs(cl)) {
      const sameAct = nr.filter((n) => verbEq(c.verb, n.verb));
      if (sameAct.length && !sameAct.some((n) => n.party === c.party)) issues.push({ t: 'role_conflict', claim: c.party, norm: sameAct[0].party, strong: true });
    }
    // "без согласия" in the answer vs "с согласия" in the norm (and the reverse) flips the meaning.
    const withWithout = (t) => { const out = []; const re = /(^|[^а-я])(без|со|с)\s+([а-я]{5,})/g; let m; while ((m = re.exec(t))) out.push({ neg: m[2] === 'без', stem: m[3].slice(0, 6), raw: m[2] + ' ' + m[3] }); return out; };
    const nw = withWithout(nt);
    for (const c of withWithout(cl)) {
      const same = nw.filter((n) => n.stem === c.stem);
      if (same.length && !same.some((n) => n.neg === c.neg)) issues.push({ t: 'modal_conflict', claim: c.raw, norm: same[0].raw, strong: true });
    }
    const ex = STRONG_EXCL.exec(cl);
    const lim = LIMITER.exec(cl);
    const normHasNeg = NORM_NEG.test(nt);
    if ((ex || lim) && !normHasNeg) issues.push({ t: 'exclusion_conflict', claim: (ex ? ex[0] : lim[2]).trim(), strong: true });
    else if ((ex || lim) && normHasNeg) issues.push({ t: 'negation_unclear', claim: (ex ? ex[0] : lim[2]).trim(), strong: false });
    else if (!issues.length && /(^|[^а-я])не\s+[а-я]/.test(cl) && !/(^|[^а-я])не\s+[а-я]/.test(nt)) {
      const m = /(^|[^а-я])(не\s+[а-я]+)/.exec(cl);
      issues.push({ t: 'negation_unclear', claim: m ? m[2] : 'не', strong: false });
    }
    const seen = new Set();
    return issues.filter((i) => { const k = i.t + i.claim; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  function compareQuantities(claimQ, normQ) {
    const res = [];
    for (const q of claimQ) {
      const cq = canonical(q);
      const same = normQ.filter((n) => canonical(n).dim === cq.dim);
      if (!same.length) { res.push({ t: 'qty_missing', claim: qLabel(q), dim: cq.dim }); continue; }
      const eq = same.find((n) => Math.abs(canonical(n).v - cq.v) < 1e-9);
      if (eq) res.push({ t: 'qty_match', claim: qLabel(q), norm: qLabel(eq), dim: cq.dim });
      else res.push({ t: 'qty_mismatch', claim: qLabel(q), norm: [...new Set(same.map(qLabel))].slice(0, 3).join(', '), dim: cq.dim });
    }
    return res;
  }

  /* ------------------------------------------------------------- analysis */
  const STATUS = { OK: 'confirmed', PART: 'partial', BAD: 'contradicts', NONE: 'unverified' };
  function articleLabel(ix, n) { const a = ix.byNumber.get(n); return a ? { article: n, title: a.title, chapter: a.chapter } : { article: n }; }
  const isGkRange = (ix, n) => { const v = parseInt(n, 10); return v >= parseInt(ix.first, 10) && v <= parseInt(ix.last, 10); };

  function analyzeClaim(ix, claim, caseText) {
    const q = queryTerms(ix, claim.text);
    const unknown = unknownTerms(q, claim.text, caseText);
    const claimQty = quantities(claim.text);
    const findings = [];
    const result = { text: claim.text, refs: [], status: STATUS.NONE, target: null, alternatives: [], findings, method: 'base' };
    if (claim.refs.some((r) => r.inherited)) findings.push({ t: 'inherited_ref', article: claim.refs[0].article });
    if (q.terms.size < 2 && !claim.refs.length) { findings.push({ t: 'too_vague' }); return result; }

    // 1. Check every reference.
    const gkRefs = [];
    for (const r of claim.refs) {
      const ref = { article: r.article, clause: r.clause, sub: r.sub, act: r.act ? r.act.name : null, foreign: r.act ? r.act.foreign : false };
      result.refs.push(ref);
      if (r.act) { ref.state = 'other_act'; findings.push({ t: 'other_act', article: r.article, act: r.act.name, foreign: r.act.foreign }); continue; }
      const base = parseInt(r.article, 10);
      if (base < parseInt(ix.first, 10)) { ref.state = 'general_part'; findings.push({ t: 'general_part', article: r.article }); continue; }
      const art = ix.byNumber.get(r.article);
      if (!art) { ref.state = 'missing'; findings.push({ t: 'article_missing', article: r.article, beyond: base > parseInt(ix.last, 10), last: ix.last }); continue; }
      ref.state = 'ok'; ref.title = art.title;
      if (r.clause && !art.clauses.has(r.clause)) {
        ref.state = 'clause_missing';
        findings.push({ t: 'clause_missing', article: r.article, clause: r.clause, available: art.clauseOrder.join(', ') });
      }
      gkRefs.push({ r, art, ref });
    }

    // 2. Global search by meaning (independent of the citation).
    const ranked = rank(ix, q, 8);
    // The action of the claim ("пользоваться", "передать"…): a clause that regulates the same action is a better match
    // than one that merely shares many nouns.
    const actVerbs = modals(claim.text).map((m) => m.verb).filter((v) => v && v.length >= 4);
    const verbHit = (u) => actVerbs.length && modals(u.text).some((m) => m.verb && actVerbs.some((v) => v === m.verb || (v.length >= 5 && m.verb.length >= 5 && v.slice(0, 5) === m.verb.slice(0, 5))));
    const scoredAlt = ranked.map(({ a, sc }) => {
      let bu = bestUnit(a, q, null);
      let act = false;
      if (bu && actVerbs.length) {
        for (const u of a.units) {
          if (!verbHit(u)) continue;
          const c = coverage(q, u.stems, u.prefixes);
          if (c.score >= 0.35 && c.score >= bu.cov.score - 0.3 && (!act || c.score > bu.cov.score)) { bu = { u, cov: c }; act = true; }
        }
      }
      return { a, sc, bu, act, cov: bu ? bu.cov.score : 0, artCov: articleCoverage(a, q).score, titleCov: titleCoverage(ix, a, q) };
    }).sort((x, y) => (y.cov + y.artCov * 0.5 + y.titleCov * 0.35 + (y.act ? 0.45 : 0)) - (x.cov + x.artCov * 0.5 + x.titleCov * 0.35 + (x.act ? 0.45 : 0)));
    result.alternatives = scoredAlt.slice(0, 3).map((x) => ({ article: x.a.n, title: x.a.title, coverage: Math.round(x.cov * 100) }));

    const finalize = (art, bu, opts) => {
      const preferQty = claimQty.length ? canonical(claimQty[0]).dim : null;
      const quote = makeQuote(art, bu.u, q, preferQty);
      result.target = { article: art.n, title: art.title, chapter: art.chapter, clause: bu.u.clause, quote: quote.text, fragment: quote.fragment, quoteStart: quote.start, coverage: Math.round(bu.cov.score * 100), matched: bu.cov.matched.slice(0, 8), missing: bu.cov.missing.slice(0, 6), viaRef: !!(opts && opts.viaRef) };
    };

    // 3. Claims that cite an existing article of the Special Part.
    if (gkRefs.length) {
      let main = null;
      for (const g of gkRefs) {
        const clause = g.ref.state === 'clause_missing' ? null : g.r.clause;
        const bu = bestUnit(g.art, q, clause);
        const artCov = articleCoverage(g.art, q).score;
        const item = Object.assign({}, g, { bu, artCov, clause });
        if (!main || (bu && bu.cov.score) > (main.bu && main.bu.cov.score)) main = item;
      }
      const { art, bu } = main;
      finalize(art, bu, { viaRef: true });
      const cov = bu.cov.score;
      const focus = focusSentence(bu.u, q);
      const qty = main.clause ? qtyAgainst(bu.u, focus, claimQty) : qtyAgainst({ qty: quantities(art.text) }, focus, claimQty);
      qty.forEach((x) => findings.push(x));
      const meaning = cov >= 0.3 ? meaningChecks(claim.text, focus.text, bu.u.text) : [];
      meaning.forEach((x) => findings.push(x));
      const bestOther = scoredAlt.find((x) => x.a.n !== art.n);
      const qtyBad = qty.some((x) => x.t === 'qty_mismatch');
      const qtyMissing = qty.some((x) => x.t === 'qty_missing');
      const strongMeaning = meaning.some((x) => x.strong);
      const weakMeaning = meaning.some((x) => !x.strong);
      const clauseMissing = main.ref.state === 'clause_missing';

      const citedOnSubject = titleCoverage(ix, art, q) >= 0.6 && cov >= 0.25;
      if (bestOther && !citedOnSubject && ((cov < 0.3 && main.artCov < 0.4 && bestOther.cov >= 0.5) || (cov < 0.45 && main.artCov < 0.5 && bestOther.cov >= 0.6 && bestOther.cov - cov >= 0.25))) {
        findings.push({ t: 'topic_mismatch', article: art.n, title: art.title, alt: bestOther.a.n, altTitle: bestOther.a.title });
        result.status = STATUS.BAD;
        const altClaimQ = compareQuantities(claimQty, quantities(bestOther.bu.u.text));
        result.suggested = { article: bestOther.a.n, title: bestOther.a.title, clause: bestOther.bu.u.clause, quote: makeQuote(bestOther.a, bestOther.bu.u, q, null).text, coverage: Math.round(bestOther.cov * 100) };
        altClaimQ.filter((x) => x.t === 'qty_mismatch').forEach((x) => findings.push(Object.assign({}, x, { inSuggested: true })));
      } else if (cov < 0.3) {
        findings.push({ t: 'low_overlap', article: art.n, title: art.title });
        result.status = clauseMissing ? STATUS.BAD : STATUS.NONE;
      } else if (clauseMissing) {
        result.status = STATUS.BAD;
      } else if (qtyBad || strongMeaning) {
        result.status = STATUS.BAD;
      } else if (cov >= 0.6 && !qtyMissing && !weakMeaning && !unknown.length) {
        result.status = STATUS.OK;
      } else {
        result.status = STATUS.PART;
        if (cov < 0.6) findings.push({ t: 'partial_overlap' });
        if (unknown.length) findings.push({ t: 'unknown_terms', words: unknown.slice(0, 5) });
      }
      return result;
    }

    // 4. Citation exists but cannot be checked here (other act / General Part / missing article).
    const top = scoredAlt[0];
    if (claim.refs.length) {
      result.status = STATUS.NONE;
      // A suggestion here is only a hint ("maybe look at…"), so it must be clearly on-topic:
      // either the claim is almost fully covered or the article title shares the claim's subject.
      const tcov = top ? titleCoverage(ix, top.a, q) : 0;
      // …and specific enough: "покупатель вправе потребовать замены товара" fits a dozen articles, so no hint.
      const content = [...q.terms.keys()].filter((t) => !/^(вправ|должн|долж|обяз|обяза|обязу|может|могут|мож|имеет|прав)$/.test(t)).length;
      if (top && content >= 5 && ((top.cov >= 0.85) || (top.cov >= 0.6 && tcov >= 0.34))) {
        result.suggested = { article: top.a.n, title: top.a.title, clause: top.bu.u.clause, quote: makeQuote(top.a, top.bu.u, q, null).text, coverage: Math.round(top.cov * 100) };
        findings.push({ t: 'maybe_in_special_part', article: top.a.n, title: top.a.title });
      }
      return result;
    }

    // 5. No citation: look for the rule by its content.
    if (!top || top.cov < 0.45) { findings.push({ t: 'no_match' }); return result; }
    finalize(top.a, top.bu, { viaRef: false });
    findings.push({ t: 'found_without_ref', article: top.a.n, title: top.a.title });
    const focus = focusSentence(top.bu.u, q);
    const qty = qtyAgainst(top.bu.u, focus, claimQty);
    qty.forEach((x) => findings.push(x));
    const meaning = meaningChecks(claim.text, focus.text, top.bu.u.text);
    meaning.forEach((x) => findings.push(x));
    const qtyBad = qty.some((x) => x.t === 'qty_mismatch');
    const qtyMissing = qty.some((x) => x.t === 'qty_missing');
    const strong = meaning.some((x) => x.strong);
    const onSubject = top.titleCov >= 0.5 || top.cov >= 0.85;
    if (unknown.length) findings.push({ t: 'unknown_terms', words: unknown.slice(0, 5) });
    // The clause regulates exactly this action and says the opposite (right ↔ prohibition, wrong party).
    const sameActConflict = top.act && meaning.some((x) => x.t === 'modal_conflict' || x.t === 'role_conflict');
    if ((qtyBad || strong) && top.cov >= 0.7 && onSubject) result.status = STATUS.BAD;
    else if (sameActConflict && top.cov >= 0.5) result.status = STATUS.BAD;
    else if (qtyMissing && !qtyBad) result.status = STATUS.NONE;
    else if ((qtyBad || strong) || top.cov < 0.6) result.status = STATUS.PART;
    else if (top.cov >= 0.8 && !meaning.length && q.terms.size >= 4 && !unknown.length) result.status = STATUS.OK;
    else result.status = STATUS.PART;
    return result;
  }

  function detectLanguage(text) {
    const t = String(text || '');
    const kz = (t.match(/[әғқңөұүһі]/gi) || []).length;
    const cyr = (t.match(/[а-яё]/gi) || []).length;
    const lat = (t.match(/[a-z]/gi) || []).length;
    if (kz >= 3 && kz / Math.max(cyr, 1) > 0.02) return 'kk';
    if (lat > cyr) return 'en';
    return 'ru';
  }

  let cachedIndex = null; let cachedLaw = null;
  function index(law) {
    if (!law || !law.articles) throw new Error('Нормативная база не загружена.');
    if (cachedLaw !== law) { cachedIndex = buildIndex(law); cachedLaw = law; }
    return cachedIndex;
  }

  function analyze(law, caseText, answerText, options) {
    const ix = index(law);
    const opts = options || {};
    const claims = extractClaims(answerText, opts.maxClaims || 15);
    const caseQ = queryTerms(ix, caseText || '');
    const results = claims.map((c, i) => Object.assign({ id: i + 1 }, analyzeClaim(ix, c, caseText || '')));
    const caseNorms = caseQ.terms.size >= 2 ? rank(ix, caseQ, 3).map(({ a }) => ({ article: a.n, title: a.title })) : [];
    const stats = { confirmed: 0, partial: 0, contradicts: 0, unverified: 0 };
    results.forEach((r) => { stats[r.status]++; });
    return {
      claims: results, caseNorms, stats, truncated: !!claims.truncated, maxClaims: opts.maxClaims || 15,
      answerLanguage: detectLanguage(answerText),
      meta: ix.meta, articleCount: ix.articles.length, first: ix.first, last: ix.last,
      method: 'base',
    };
  }

  /* Candidate articles to send to the AI step (it only sees texts the server loads itself). */
  function aiCandidates(report, perClaim) {
    return report.claims.map((c) => {
      const list = [];
      const add = (n) => { if (n && !list.includes(n) && list.length < (perClaim || 4)) list.push(n); };
      (c.refs || []).forEach((r) => { if (r.state === 'ok' || r.state === 'clause_missing') add(r.article); });
      if (c.target) add(c.target.article);
      if (c.suggested) add(c.suggested.article);
      (c.alternatives || []).forEach((a) => add(a.article));
      return { id: c.id, text: c.text, articles: list, precheck: c.refs.map((r) => ({ article: r.article, clause: r.clause, state: r.state, act: r.act })) };
    });
  }

  /* Verbatim check used before showing any quote. */
  const squash = (s) => normalize(s).replace(/\s+/g, ' ').trim();
  function isVerbatim(law, article, quote) {
    const ix = index(law);
    const a = ix.byNumber.get(String(article));
    if (!a || !quote || squash(quote).length < 12) return false;
    return squash(a.text).includes(squash(quote));
  }

  return { analyze, aiCandidates, isVerbatim, parseRefs, quantities, extractClaims, stem, normalize, STATUS, _index: index };
});
