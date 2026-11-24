/* SAQ — интерфейс правового сканера.
 * 1) Проверка по базе — всегда, прямо в браузере (saq_scanner.js + law/gk_rk_special.js), бесплатно.
 * 2) Анализ ИИ — только если на сервере есть ключ API (/api/status → ai_enabled). Цитаты ИИ проверяются на сервере.
 * Отчёт строится на трёх языках; текст закона и утверждения не переводятся.
 */
(function () {
  'use strict';
  const LAW_FILE = 'law/gk_rk_special.js';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => (window.saqI18n && ['ru', 'kk', 'en'].includes(window.saqI18n.language)) ? window.saqI18n.language : 'ru';

  /* ----------------------------------------------------------- strings */
  const T = {
    ru: {
      status: { confirmed: 'Подтверждено', partial: 'Частично подтверждено', contradicts: 'Не соответствует норме', unverified: 'Не удалось подтвердить' },
      report: 'Отчёт по утверждениям', claim: 'Утверждение', checked: (n) => `Проверено утверждений: ${n}`,
      modeBase: 'Режим: поиск и сопоставление по тексту ГК РК', modeAi: (m) => `Режим: поиск по базе + анализ ИИ (${m}), цитаты ИИ сверены с базой`,
      modeAiPending: 'Анализ ИИ выполняется…', aiFailed: (why) => `Анализ ИИ не выполнен (${why}). Показан результат проверки по базе.`,
      refInAnswer: 'Ссылка в ответе', noRef: 'не указана', normInBase: 'Норма в загруженной базе', noNorm: 'не найдена',
      quoteLabel: (ed) => `Дословно из ГК РК (Особенная часть), ред. на ${ed}:`, fragment: '(фрагмент пункта)',
      suggested: 'Подходящая норма по содержанию', maybe: 'Норма с похожими словами (не факт, что она о том же — сверьте)', why: 'Почему такой статус', ai: 'Анализ ИИ', aiDiff: 'Расхождение', baseDetails: 'Проверка по базе без ИИ',
      method: 'Метод: программное сопоставление ссылок, ключевых понятий, сроков и отрицаний с текстом кодекса.',
      methodAi: 'Статус и объяснение — от ИИ; цитата проверена программой на дословное совпадение с базой.',
      art: (n) => `статья ${n}`, clause: (c) => `пункт ${c}`, sub: (s) => `подпункт ${s})`, gk: 'ГК РК',
      refState: { ok: 'есть в базе', missing: 'нет в загруженной базе', general_part: 'Общая часть ГК — не загружена', other_act: 'другой нормативный акт', clause_missing: 'такого пункта нет' },
      truncated: (n) => `Проверены первые ${n} юридических утверждений ответа. Остальную часть вставьте отдельно.`,
      caseNorms: 'Нормы, связанные с кейсом (по совпадению понятий)', langNote: 'Ответ написан не на русском. Текст кодекса в SAQ — на русском, поэтому сопоставление по словам почти ничего не находит. Для надёжной проверки вставьте ответ на русском языке.',
      empty: 'В ответе не найдено юридических утверждений для проверки. Вставьте ответ ИИ с выводами о правах, обязанностях, сроках или статьях.',
      fill: 'Заполните оба поля: кейс и ответ ИИ.', loading: 'Загружаю текст ГК РК…', running: 'Сопоставляю утверждения с текстом кодекса…',
      done: (ed) => `Готово. Проверка выполнена по ГК РК (Особенная часть), редакция по состоянию на ${ed}.`, loadFail: 'Не удалось загрузить текст кодекса. Обновите страницу.',
      source: (m) => `<b>Нормативная база:</b> Гражданский кодекс Республики Казахстан (Особенная часть), статьи ${m.article_start}–${m.article_end}, всего ${m.article_count}.`,
      sourceShort: 'Нормативная база: ГК РК (Особенная часть) — загрузка сведений…',
      aiOn: (m) => `Анализ ИИ включён (${m}).`, aiOff: '',
      errors: { ai_disabled: 'ИИ не подключён', rate_limited: 'превышен лимит проверок в час', api_key: 'неверный ключ API', api_billing: 'нет средств на счёте API', api_rate: 'лимит запросов API', bad_model_output: 'ИИ вернул ответ в неверном формате', api_unreachable: 'сервис ИИ недоступен', empty: 'нет утверждений для ИИ', too_large: 'слишком длинный текст', network: 'нет связи с сервером', server_error: 'ошибка сервера' },
      aiFallback: 'ИИ не дал вывода, подтверждённого цитатой, поэтому статус выставлен по проверке базы.', aiFlags: { quote_rejected: 'Цитата ИИ не совпала с текстом кодекса и отброшена.', no_verbatim_support: 'ИИ не подтвердил вывод точной цитатой.', citation_differs: 'ИИ подтвердил смысл по другой статье, чем указано в ответе — статус понижен до «частично».', article_not_in_base: 'ИИ назвал статью, которой нет среди проверенных норм — ссылка отброшена.', clause_missing: 'В ответе указан несуществующий пункт.' },
      ex: { errors: 'Пример: ответ с ошибками', missing: 'Пример: несуществующие статьи', good: 'Пример: верный ответ' },
      f: {
        inherited_ref: (f) => `Ссылка взята из предыдущего предложения ответа (статья ${f.article}).`,
        too_vague: () => 'Утверждение слишком общее: в нём нет понятий, которые можно сверить с кодексом.',
        other_act: (f) => f.foreign ? `Статья ${f.article} — ссылка на ${actName(f.act)}. В SAQ загружен только ГК Республики Казахстан, поэтому эту норму проверить нельзя.` : `Статья ${f.article} относится к другому акту (${actName(f.act)}). В SAQ загружен только ГК РК (Особенная часть), поэтому эту норму проверить нельзя.`,
        general_part: (f) => `Статья ${f.article} относится к Общей части ГК РК (статьи 1–405). В SAQ загружена только Особенная часть, поэтому текст этой статьи проверить нельзя.`,
        article_missing: (f) => f.beyond ? `Статьи ${f.article} нет в загруженной редакции: ГК РК заканчивается статьёй ${f.last}. Ссылка, скорее всего, выдумана или ошибочна.` : `Статьи ${f.article} нет в загруженной редакции ГК РК (Особенная часть). Ссылка ошибочна или относится к другому акту.`,
        clause_missing: (f) => `В статье ${f.article} нет пункта ${f.clause}. В загруженном тексте пункты: ${f.available || 'без нумерации'}.`,
        topic_mismatch: (f) => `Статья ${f.article} («${f.title}») не содержит ключевых понятий утверждения. По содержанию оно соответствует статье ${f.alt} («${f.altTitle}») — вероятно, в ответе указана неверная статья.`,
        low_overlap: (f) => `В статье ${f.article} («${f.title}») не найдено формулировок, которые подтверждали бы утверждение.`,
        partial_overlap: () => 'С нормой совпадает только часть ключевых понятий утверждения.',
        qty_match: (f) => `Значение «${f.claim}» совпадает с текстом нормы.`,
        qty_missing: (f) => `Значение «${f.claim}» в тексте нормы не найдено.`,
        qty_mismatch: (f) => `В ответе указано «${f.claim}», а в норме${f.inSuggested ? ' подходящей статьи' : ''} — «${f.norm}».`,
        modal_conflict: (f) => `Смысл противоположный: в ответе «${f.claim}», в норме «${f.norm}».`,
        role_conflict: (f) => `Перепутаны стороны: в ответе это делает «${f.claim}», а по норме — «${f.norm}».`,
        duty_vs_right: (f) => `В ответе — обязанность («${f.claim}»), а в норме — право («${f.norm}»).`,
        exclusion_conflict: (f) => `В ответе есть ограничение или исключение («${f.claim}»), которого в тексте нормы нет.`,
        negation_unclear: (f) => `В ответе есть отрицание или ограничение («${f.claim}»); по тексту нормы его не удалось подтвердить — проверьте смысл.`,
        unknown_terms: (f) => `В тексте кодекса нет понятий из ответа: ${f.words.map((w) => '«' + w + '»').join(', ')}.`,
        maybe_in_special_part: (f) => `В Особенной части есть норма с похожими словами — статья ${f.article} («${f.title}»). Она не подтверждает утверждение и может регулировать другое — сверьте текст сами.`,
        no_match: () => 'В загруженном ГК РК (Особенная часть) не найдено нормы, которая подтверждала бы это утверждение.',
        found_without_ref: (f) => `В ответе нет ссылки на статью; норма найдена по содержанию — статья ${f.article} («${f.title}»).`,
        matched: (list) => `Совпадают понятия: ${list.map((w) => '«' + w + '»').join(', ')}.`,
      },
    },
    kk: {
      status: { confirmed: 'Расталды', partial: 'Ішінара расталды', contradicts: 'Нормаға сәйкес емес', unverified: 'Растау мүмкін болмады' },
      report: 'Тұжырымдар бойынша есеп', claim: 'Тұжырым', checked: (n) => `Тексерілген тұжырымдар: ${n}`,
      modeBase: 'Режим: ҚР АК мәтінімен іздеу және салыстыру', modeAi: (m) => `Режим: базадан іздеу + ЖИ талдауы (${m}), ЖИ дәйексөздері базамен салыстырылды`,
      modeAiPending: 'ЖИ талдауы орындалып жатыр…', aiFailed: (why) => `ЖИ талдауы орындалмады (${why}). Базамен тексеру нәтижесі көрсетілді.`,
      refInAnswer: 'Жауаптағы сілтеме', noRef: 'көрсетілмеген', normInBase: 'Жүктелген базадағы норма', noNorm: 'табылмады',
      quoteLabel: (ed) => `ҚР АК (Ерекше бөлім) мәтіні сөзбе-сөз, ${ed} жағдай бойынша редакция (орысша):`, fragment: '(тармақтың үзіндісі)',
      suggested: 'Мазмұны бойынша сәйкес норма', maybe: 'Сөздері ұқсас норма (дәл сол туралы болмауы мүмкін — салыстырыңыз)', why: 'Неліктен осындай мәртебе', ai: 'ЖИ талдауы', aiDiff: 'Сәйкессіздік', baseDetails: 'ЖИ-сіз базамен тексеру',
      method: 'Әдіс: сілтемелерді, негізгі ұғымдарды, мерзімдер мен терістеулерді кодекс мәтінімен бағдарламалық салыстыру.',
      methodAi: 'Мәртебе мен түсіндірме — ЖИ-ден; дәйексөзді бағдарлама базамен сөзбе-сөз тексерді.',
      art: (n) => `${n}-бап`, clause: (c) => `${c}-тармақ`, sub: (s) => `${s})-тармақша`, gk: 'ҚР АК',
      refState: { ok: 'базада бар', missing: 'жүктелген базада жоқ', general_part: 'АК-нің Жалпы бөлімі — жүктелмеген', other_act: 'басқа нормативтік акт', clause_missing: 'мұндай тармақ жоқ' },
      truncated: (n) => `Жауаптың алғашқы ${n} құқықтық тұжырымы тексерілді. Қалған бөлігін бөлек қойыңыз.`,
      caseNorms: 'Жағдайға қатысты нормалар (ұғымдардың сәйкестігі бойынша)', langNote: 'Жауап орыс тілінде жазылмаған. SAQ-тағы кодекс мәтіні орысша, сондықтан сөздер бойынша салыстыру нәтиже бермейді. Сенімді тексеру үшін жауапты орыс тілінде қойыңыз.',
      empty: 'Жауаптан тексеруге болатын құқықтық тұжырымдар табылмады. Құқықтар, міндеттер, мерзімдер немесе баптар туралы қорытындысы бар ЖИ жауабын қойыңыз.',
      fill: 'Екі өрісті де толтырыңыз: жағдай және ЖИ жауабы.', loading: 'ҚР АК мәтіні жүктелуде…', running: 'Тұжырымдарды кодекс мәтінімен салыстырып жатырмын…',
      done: (ed) => `Дайын. Тексеру ҚР АК (Ерекше бөлім) бойынша, ${ed} жағдай бойынша редакциямен орындалды.`, loadFail: 'Кодекс мәтінін жүктеу мүмкін болмады. Бетті жаңартыңыз.',
      source: (m) => `<b>Нормативтік база:</b> Қазақстан Республикасының Азаматтық кодексі (Ерекше бөлім), ${m.article_start}–${m.article_end}-баптар, барлығы ${m.article_count}.`,
      sourceShort: 'Нормативтік база: ҚР АК (Ерекше бөлім) — мәліметтер жүктелуде…',
      aiOn: (m) => `ЖИ талдауы қосылған (${m}).`, aiOff: '',
      errors: { ai_disabled: 'ЖИ қосылмаған', rate_limited: 'сағаттық тексеру лимиті асып кетті', api_key: 'API кілті қате', api_billing: 'API шотында қаражат жоқ', api_rate: 'API сұраныс лимиті', bad_model_output: 'ЖИ жауабы дұрыс емес форматта', api_unreachable: 'ЖИ қызметі қолжетімсіз', empty: 'ЖИ үшін тұжырым жоқ', too_large: 'мәтін тым ұзын', network: 'сервермен байланыс жоқ', server_error: 'сервер қатесі' },
      aiFallback: 'ЖИ дәйексөзбен расталған қорытынды бермеді, сондықтан мәртебе базамен тексеру бойынша қойылды.', aiFlags: { quote_rejected: 'ЖИ дәйексөзі кодекс мәтінімен сәйкес келмеді және алынып тасталды.', no_verbatim_support: 'ЖИ қорытындыны нақты дәйексөзбен растамады.', citation_differs: 'ЖИ мағынаны жауапта көрсетілгеннен басқа баппен растады — мәртебе «ішінара» деңгейіне төмендетілді.', article_not_in_base: 'ЖИ тексерілген нормалар арасында жоқ бапты атады — сілтеме алынып тасталды.', clause_missing: 'Жауапта жоқ тармақ көрсетілген.' },
      ex: { errors: 'Мысал: қателері бар жауап', missing: 'Мысал: жоқ баптар', good: 'Мысал: дұрыс жауап' },
      f: {
        inherited_ref: (f) => `Сілтеме жауаптың алдыңғы сөйлемінен алынды (${f.article}-бап).`,
        too_vague: () => 'Тұжырым тым жалпы: онда кодекспен салыстыруға болатын ұғымдар жоқ.',
        other_act: (f) => `${f.article}-бап басқа актіге жатады (${actName(f.act)}). SAQ-қа тек ҚР АК (Ерекше бөлім) жүктелген, сондықтан бұл норманы тексеру мүмкін емес.`,
        general_part: (f) => `${f.article}-бап ҚР АК-нің Жалпы бөліміне жатады (1–405-баптар). SAQ-қа тек Ерекше бөлім жүктелген, сондықтан бұл баптың мәтінін тексеру мүмкін емес.`,
        article_missing: (f) => f.beyond ? `${f.article}-бап жүктелген редакцияда жоқ: ҚР АК ${f.last}-баппен аяқталады. Сілтеме ойдан шығарылған немесе қате болуы мүмкін.` : `${f.article}-бап жүктелген ҚР АК (Ерекше бөлім) редакциясында жоқ. Сілтеме қате немесе басқа актіге жатады.`,
        clause_missing: (f) => `${f.article}-бапта ${f.clause}-тармақ жоқ. Жүктелген мәтіндегі тармақтар: ${f.available || 'нөмірсіз'}.`,
        topic_mismatch: (f) => `${f.article}-бапта («${f.title}») тұжырымның негізгі ұғымдары жоқ. Мазмұны бойынша ол ${f.alt}-бапқа («${f.altTitle}») сәйкес келеді — жауапта бап қате көрсетілген болуы мүмкін.`,
        low_overlap: (f) => `${f.article}-бапта («${f.title}») тұжырымды растайтын тұжырымдамалар табылмады.`,
        partial_overlap: () => 'Нормамен тұжырымның негізгі ұғымдарының бір бөлігі ғана сәйкес келеді.',
        qty_match: (f) => `«${f.claim}» мәні норма мәтінімен сәйкес келеді.`,
        qty_missing: (f) => `«${f.claim}» мәні норма мәтінінде табылмады.`,
        qty_mismatch: (f) => `Жауапта «${f.claim}» көрсетілген, ал нормада — «${f.norm}».`,
        modal_conflict: (f) => `Мағынасы қарама-қарсы: жауапта «${f.claim}», нормада «${f.norm}».`,
        role_conflict: (f) => `Тараптар шатастырылған: жауапта мұны «${f.claim}» жасайды, ал нормада — «${f.norm}».`,
        duty_vs_right: (f) => `Жауапта — міндет («${f.claim}»), ал нормада — құқық («${f.norm}»).`,
        exclusion_conflict: (f) => `Жауапта норма мәтінінде жоқ шектеу немесе ерекшелік бар («${f.claim}»).`,
        negation_unclear: (f) => `Жауапта терістеу немесе шектеу бар («${f.claim}»); оны норма мәтіні бойынша растау мүмкін болмады — мағынасын тексеріңіз.`,
        unknown_terms: (f) => `Кодекс мәтінінде жауаптағы мына ұғымдар жоқ: ${f.words.map((w) => '«' + w + '»').join(', ')}.`,
        maybe_in_special_part: (f) => `Ерекше бөлімде сөздері ұқсас норма бар — ${f.article}-бап («${f.title}»). Ол тұжырымды растамайды және басқа қатынасты реттеуі мүмкін — мәтінін өзіңіз салыстырыңыз.`,
        no_match: () => 'Жүктелген ҚР АК-де (Ерекше бөлім) бұл тұжырымды растайтын норма табылмады.',
        found_without_ref: (f) => `Жауапта бапқа сілтеме жоқ; норма мазмұны бойынша табылды — ${f.article}-бап («${f.title}»).`,
        matched: (list) => `Сәйкес ұғымдар: ${list.map((w) => '«' + w + '»').join(', ')}.`,
      },
    },
    en: {
      status: { confirmed: 'Confirmed', partial: 'Partially confirmed', contradicts: 'Contradicts the provision', unverified: 'Could not verify' },
      report: 'Report by claim', claim: 'Claim', checked: (n) => `Claims checked: ${n}`,
      modeBase: 'Mode: search and comparison with the Civil Code text', modeAi: (m) => `Mode: database search + AI analysis (${m}); AI quotes checked against the database`,
      modeAiPending: 'AI analysis in progress…', aiFailed: (why) => `AI analysis did not run (${why}). Showing the database check.`,
      refInAnswer: 'Reference in the answer', noRef: 'none', normInBase: 'Provision in the uploaded database', noNorm: 'not found',
      quoteLabel: (ed) => `Verbatim from the Civil Code of Kazakhstan (Special Part), edition as of ${ed} (Russian original):`, fragment: '(excerpt of the clause)',
      suggested: 'Matching provision by content', maybe: 'Provision with similar wording (it may be about something else — compare)', why: 'Why this status', ai: 'AI analysis', aiDiff: 'Discrepancy', baseDetails: 'Database check without AI',
      method: 'Method: the program compares references, key terms, time limits and negations with the Code text.',
      methodAi: 'Status and explanation come from AI; the quote was checked by the program for an exact match with the database.',
      art: (n) => `Article ${n}`, clause: (c) => `clause ${c}`, sub: (s) => `subclause ${s})`, gk: 'Civil Code of Kazakhstan',
      refState: { ok: 'in the database', missing: 'not in the uploaded database', general_part: 'General Part — not uploaded', other_act: 'another legal act', clause_missing: 'no such clause' },
      truncated: (n) => `The first ${n} legal claims of the answer were checked. Paste the rest separately.`,
      caseNorms: 'Provisions related to the case (by matching terms)', langNote: 'The answer is not in Russian. The Code text in SAQ is Russian, so word matching finds almost nothing. For a reliable check, paste the answer in Russian.',
      empty: 'No legal claims were found in the answer. Paste an AI answer that states rights, duties, time limits or articles.',
      fill: 'Fill in both fields: the case and the AI answer.', loading: 'Loading the Civil Code text…', running: 'Comparing claims with the Code text…',
      done: (ed) => `Done. Checked against the Civil Code of Kazakhstan (Special Part), edition as of ${ed}.`, loadFail: 'Could not load the Code text. Reload the page.',
      source: (m) => `<b>Legal database:</b> Civil Code of the Republic of Kazakhstan (Special Part), articles ${m.article_start}–${m.article_end}, ${m.article_count} in total.`,
      sourceShort: 'Legal database: Civil Code of Kazakhstan (Special Part) — loading details…',
      aiOn: (m) => `AI analysis is on (${m}).`, aiOff: '',
      errors: { ai_disabled: 'AI is not connected', rate_limited: 'hourly check limit reached', api_key: 'invalid API key', api_billing: 'no funds on the API account', api_rate: 'API rate limit', bad_model_output: 'AI returned an invalid format', api_unreachable: 'AI service unreachable', empty: 'no claims for the AI', too_large: 'text too long', network: 'no connection to the server', server_error: 'server error' },
      aiFallback: 'The AI gave no conclusion backed by a quote, so the status comes from the database check.', aiFlags: { quote_rejected: 'The AI quote did not match the Code text and was discarded.', no_verbatim_support: 'The AI did not support its conclusion with an exact quote.', citation_differs: 'The AI confirmed the meaning with a different article than the answer cites — status lowered to partial.', article_not_in_base: 'The AI named an article outside the checked provisions — reference discarded.', clause_missing: 'The answer cites a clause that does not exist.' },
      ex: { errors: 'Example: answer with errors', missing: 'Example: non-existent articles', good: 'Example: correct answer' },
      f: {
        inherited_ref: (f) => `Reference taken from the previous sentence of the answer (Article ${f.article}).`,
        too_vague: () => 'The claim is too general: it has no terms that can be checked against the Code.',
        other_act: (f) => `Article ${f.article} belongs to another act (${actName(f.act)}). Only the Civil Code of Kazakhstan (Special Part) is uploaded, so this provision cannot be checked.`,
        general_part: (f) => `Article ${f.article} is in the General Part of the Civil Code (Articles 1–405). Only the Special Part is uploaded, so its text cannot be checked.`,
        article_missing: (f) => f.beyond ? `Article ${f.article} does not exist in the uploaded edition: the Code ends with Article ${f.last}. The reference is likely invented or wrong.` : `Article ${f.article} is not in the uploaded edition of the Civil Code (Special Part). The reference is wrong or belongs to another act.`,
        clause_missing: (f) => `Article ${f.article} has no clause ${f.clause}. Clauses in the uploaded text: ${f.available || 'unnumbered'}.`,
        topic_mismatch: (f) => `Article ${f.article} (“${f.title}”) does not contain the key terms of the claim. By content it matches Article ${f.alt} (“${f.altTitle}”) — the answer probably cites the wrong article.`,
        low_overlap: (f) => `No wording in Article ${f.article} (“${f.title}”) supports the claim.`,
        partial_overlap: () => 'Only some of the key terms of the claim match the provision.',
        qty_match: (f) => `The value “${f.claim}” matches the provision.`,
        qty_missing: (f) => `The value “${f.claim}” was not found in the provision.`,
        qty_mismatch: (f) => `The answer says “${f.claim}”, the provision says “${f.norm}”.`,
        modal_conflict: (f) => `Opposite meaning: the answer says “${f.claim}”, the provision says “${f.norm}”.`,
        role_conflict: (f) => `The parties are swapped: in the answer it is the “${f.claim}”, in the provision the “${f.norm}”.`,
        duty_vs_right: (f) => `The answer states a duty (“${f.claim}”), the provision grants a right (“${f.norm}”).`,
        exclusion_conflict: (f) => `The answer adds a restriction or exclusion (“${f.claim}”) that the provision does not contain.`,
        negation_unclear: (f) => `The answer contains a negation or restriction (“${f.claim}”) that could not be confirmed by the provision — check the meaning.`,
        unknown_terms: (f) => `The Code text does not contain these terms from the answer: ${f.words.map((w) => '“' + w + '”').join(', ')}.`,
        maybe_in_special_part: (f) => `The Special Part has a provision with similar wording — Article ${f.article} (“${f.title}”). It does not confirm the claim and may govern something else — compare the text yourself.`,
        no_match: () => 'No provision in the uploaded Civil Code (Special Part) supports this claim.',
        found_without_ref: (f) => `The answer cites no article; the provision was found by content — Article ${f.article} (“${f.title}”).`,
        matched: (list) => `Matching terms: ${list.map((w) => '“' + w + '”').join(', ')}.`,
      },
    },
  };
  const t = () => T[lang()];

  const ACTS = {
    kk: { 'ГК РФ (закон другой страны)': 'РФ АК (басқа елдің заңы)', 'Трудовой кодекс': 'Еңбек кодексі', 'Налоговый кодекс': 'Салық кодексі', 'уголовное законодательство': 'қылмыстық заңнама', 'КоАП': 'ӘҚБтК', 'процессуальный кодекс': 'процестік кодекс', 'жилищное законодательство': 'тұрғын үй заңнамасы', 'Земельный кодекс': 'Жер кодексі', 'Кодекс о браке и семье': 'Неке және отбасы туралы кодекс', 'Предпринимательский кодекс': 'Кәсіпкерлік кодекс', 'Конституция': 'Конституция', 'другой закон': 'басқа заң', 'другой акт': 'басқа акт', 'другой нормативный акт': 'басқа нормативтік акт' },
    en: { 'ГК РФ (закон другой страны)': 'Civil Code of the Russian Federation (another country)', 'Трудовой кодекс': 'Labour Code', 'Налоговый кодекс': 'Tax Code', 'уголовное законодательство': 'criminal legislation', 'КоАП': 'Code of Administrative Offences', 'процессуальный кодекс': 'procedural code', 'жилищное законодательство': 'housing legislation', 'Земельный кодекс': 'Land Code', 'Кодекс о браке и семье': 'Code on Marriage and Family', 'Предпринимательский кодекс': 'Entrepreneurial Code', 'Конституция': 'Constitution', 'другой закон': 'another law', 'другой акт': 'another act', 'другой нормативный акт': 'another legal act' },
  };
  const actName = (name) => (ACTS[lang()] && ACTS[lang()][name]) || name;

  /* ------------------------------------------------ links to «Әділет» */
  // Anchors of every article of the Special Part on adilet.zan.kz (law/adilet_anchors.js, checked 18.11.2026).
  const ADILET_DOC = 'https://adilet.zan.kz/rus/docs/K990000409_';
  function adiletUrl(n) {
    const A = window.SAQ_ADILET;
    const key = String(n);
    if (!A || !A.anchors || !A.anchors[key]) return null; // only articles that exist in the Special Part
    return (A.url || ADILET_DOC) + '#' + A.anchors[key];
  }
  function artLink(n, label) {
    const url = adiletUrl(n);
    const text = esc(label || t().art(n));
    return url ? `<a class="saq-adilet" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(C().adiletTitle)}">${text}<span class="saq-adilet-arrow" aria-hidden="true">↗</span></a>` : text;
  }

  // Every mention of a Special Part article in rendered text («статья 428», «ст. 500-1», «статьями 1095–1098 настоящего Кодекса»,
  // «428-бабы», «Article 428») becomes a link to that article on «Әділет». Mentions of other acts are left as text.
  const NUM_RE = '\\d{3,4}(?:-\\d{1,2}(?!\\d))?';
  const MENTION_RE = new RegExp('(?:стат(?:ья|ьи|ье|ью|ьей|ьям|ьями|ьях)|ст\\.|articles?|arts?\\.)\\s*(' + NUM_RE + ')((?:\\s*(?:,|или|и|and|or|–|—|-)\\s*' + NUM_RE + ')*)'
    + '|(' + NUM_RE + ')(?:-?(?:я|й|ой|ей))?\\s+стать(?:я|и|е|ю|ей)'
    + '|(' + NUM_RE + ')\\s*-\\s*ба[пб][А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]*', 'gi');
  const LETTER = /[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
  function otherActAfter(after) {
    const s = after.slice(0, 80).split(/[.;!?\n]/)[0];
    const gk = s.search(/настоящ\S*\s+[Кк]одекс|Гражданск\S*\s+[Кк]одекс(?!\S*\s+Российск)|ГК(?![А-Яа-яЁё])(?!\s*(?:РФ|Российск|РБ|КР|Кыргыз|Украин|Узбек))|Азаматтық\s+кодекс|Civil\s+Code(?!\s+of\s+(?:the\s+)?Russia)/);
    const other = s.search(/ГК\s*(?:РФ|Российск|РБ|КР|Кыргыз|Украин|Узбек)|Российск|друг(?:ой|ого|ая)\s+(?:стран|акт|закон|нормативн)|басқа|another\s+country|other\s+(?:act|law)|Russia|процессуальн|[Кк]одекс\S*\s+Республики\s+Казахстан\s*[«"]|[Кк]одекс\S*\s+(?:РК\s+)?об?\s|[Зз]акон|[Тт]рудов|[Нн]алогов|[Уу]головн|Конституц|Заң|Tax|Labou?r|Criminal|Procedure|Law(?![a-z])/);
    return other >= 0 && (gk < 0 || other < gk);
  }
  function mentionLinks(text) {
    const out = [];
    const S = window.SAQScanner;
    MENTION_RE.lastIndex = 0;
    let m;
    while ((m = MENTION_RE.exec(text))) {
      if (m.index > 0 && LETTER.test(text[m.index - 1])) continue;
      const refs = S && S.parseRefs ? S.parseRefs(text.slice(m.index, m.index + m[0].length + 80)) : [];
      const numRe = new RegExp(NUM_RE, 'g');
      let k; let first = true;
      while ((k = numRe.exec(m[0]))) {
        const n = k[0];
        const start = m.index + k.index; const end = start + n.length;
        const ref = refs.find((r) => r.article === n);
        const url = adiletUrl(n);
        if (url && !(ref && ref.act) && !otherActAfter(text.slice(end))) {
          // the first number takes the whole «статья 428» / «428-бабы» phrase, so the tap target is not a lone digit
          const numFirst = !!(m[3] || m[4]);
          const from = first ? m.index : start;
          const to = first && numFirst ? m.index + m[0].length : end;
          out.push({ from, to, url });
        }
        first = false;
      }
    }
    return out;
  }
  function linkArticles(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (/\d{3}/.test(node.nodeValue) && !(node.parentElement && node.parentElement.closest('a,button,textarea,input,select,option,script,style,[data-no-artlink]')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    const title = C().adiletTitle;
    for (const node of nodes) {
      const text = node.nodeValue;
      const links = mentionLinks(text);
      if (!links.length) continue;
      const frag = document.createDocumentFragment();
      let at = 0;
      for (const l of links) {
        if (l.from < at) continue;
        if (l.from > at) frag.appendChild(document.createTextNode(text.slice(at, l.from)));
        const a = document.createElement('a');
        a.className = 'saq-adilet saq-adilet--inline'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener'; a.title = title;
        a.textContent = text.slice(l.from, l.to);
        frag.appendChild(a); at = l.to;
      }
      if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
      node.parentNode.replaceChild(frag, node);
    }
  }
  window.SAQLinkArticles = linkArticles;
  // Articles of the Civil Code cited in the AI answer, each with its «Әділет» link.
  function answerRefsHtml() {
    const S = window.SAQScanner; const K = C();
    if (!S || !S.parseRefs || !state.answer) return '';
    const seen = new Set(); const items = [];
    for (const r of S.parseRefs(state.answer)) {
      if (r.act || seen.has(r.article)) continue;
      seen.add(r.article);
      const url = adiletUrl(r.article);
      items.push(url
        ? `<a class="saq-adilet saq-cmp-ref" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(K.adiletTitle)}">${esc(K.tabMain(r.article))}<span class="saq-adilet-arrow" aria-hidden="true">↗</span></a>`
        : `<span class="saq-cmp-ref saq-cmp-ref--miss" title="${esc(K.refMissing)}">${esc(K.tabMain(r.article))} — ${esc(K.refMissing)}</span>`);
    }
    return items.length ? `<div class="saq-cmp-refs" data-saq-no-translate><span class="saq-cmp-refs-label">${esc(K.refsLabel)}</span>${items.join('')}</div>` : '';
  }

  /* -------------------------------------- comparison «AI answer ↔ law» */
  const CMP = {
    ru: { title: 'Сравнение «Ответ ИИ ↔ Закон»', hint: 'Нажмите на утверждение в ответе — справа откроется статья ГК РК с подсвеченной выдержкой.', answer: 'Ответ ИИ', law: 'ГК РК (Особенная часть)', pick: 'Выберите утверждение слева.',
      none: 'Достаточного подтверждения в ГК РК (Особенная часть) не найдено.', noQuote: 'Текст указанной статьи: выдержки, которая подтверждала бы утверждение, в нём нет.',
      tabMain: (n) => `ст. ${n}`, tabCited: (n) => `Указана в ответе: ст. ${n}`, tabBetter: (n) => `Подходящая норма: ст. ${n}`, tabMaybe: (n) => `Похожие слова: ст. ${n}`,
      adilet: 'Открыть в «Әділет»', adiletTitle: 'Открыть статью в ИПС «Әділет» — действующая редакция, новая вкладка', refsLabel: 'Статьи из ответа в «Әділет»:', refMissing: 'нет в ГК РК (Особенная часть)',
      ok: 'Подтверждающая выдержка подсвечена.', diff: 'Расхождение', partial: 'Подтверждается частично', maybeNote: 'Это не подтверждение: норма лишь содержит похожие слова — сверьте сами.',
      notFound: 'Выдержку не удалось подсветить автоматически — сверьте текст вручную.', claim: (n) => `Утверждение ${n}`, goto: 'Сравнить с законом ↑', other: 'Другие утверждения' },
    kk: { title: 'Салыстыру «ЖИ жауабы ↔ Заң»', hint: 'Жауаптағы тұжырымды басыңыз — оң жақта үзіндісі белгіленген ҚР АК бабы ашылады.', answer: 'ЖИ жауабы', law: 'ҚР АК (Ерекше бөлім)', pick: 'Сол жақтан тұжырымды таңдаңыз.',
      none: 'ҚР АК-де (Ерекше бөлім) жеткілікті растау табылмады.', noQuote: 'Көрсетілген баптың мәтіні: онда тұжырымды растайтын үзінді жоқ.',
      tabMain: (n) => `${n}-бап`, tabCited: (n) => `Жауапта көрсетілген: ${n}-бап`, tabBetter: (n) => `Сәйкес норма: ${n}-бап`, tabMaybe: (n) => `Ұқсас сөздер: ${n}-бап`,
      adilet: '«Әділет»-те ашу', adiletTitle: 'Бапты «Әділет» АҚЖ-да ашу — қолданыстағы редакция, жаңа қойынды', refsLabel: 'Жауаптағы баптар «Әділет»-те:', refMissing: 'ҚР АК-де (Ерекше бөлім) жоқ',
      ok: 'Растайтын үзінді белгіленді.', diff: 'Сәйкессіздік', partial: 'Ішінара расталады', maybeNote: 'Бұл растау емес: нормада тек ұқсас сөздер бар — өзіңіз салыстырыңыз.',
      notFound: 'Үзіндіні автоматты түрде белгілеу мүмкін болмады — мәтінді қолмен салыстырыңыз.', claim: (n) => `Тұжырым ${n}`, goto: 'Заңмен салыстыру ↑', other: 'Басқа тұжырымдар' },
    en: { title: 'Comparison “AI answer ↔ Law”', hint: 'Click a claim in the answer — the Civil Code article opens on the right with the matching excerpt highlighted.', answer: 'AI answer', law: 'Civil Code of Kazakhstan (Special Part)', pick: 'Pick a claim on the left.',
      none: 'No sufficient confirmation was found in the Civil Code (Special Part).', noQuote: 'Text of the cited article: it has no excerpt that supports the claim.',
      tabMain: (n) => `Art. ${n}`, tabCited: (n) => `Cited in the answer: Art. ${n}`, tabBetter: (n) => `Matching provision: Art. ${n}`, tabMaybe: (n) => `Similar wording: Art. ${n}`,
      adilet: 'Open on Adilet', adiletTitle: 'Open the article on Adilet — current edition, new tab', refsLabel: 'Articles from the answer on Adilet:', refMissing: 'not in the Civil Code (Special Part)',
      ok: 'The supporting excerpt is highlighted.', diff: 'Discrepancy', partial: 'Partly supported', maybeNote: 'This is not a confirmation: the provision only has similar wording — compare it yourself.',
      notFound: 'The excerpt could not be highlighted automatically — compare the text manually.', claim: (n) => `Claim ${n}`, goto: 'Compare with the law ↑', other: 'Other claims' },
  };
  const C = () => CMP[lang()];

  /* ------------------------------------------- report: PDF and copy (v26) */
  const REP = {
    ru: { title: 'Отчёт SAQ о проверке ответа ИИ', checkedAt: 'Дата и время проверки', caseH: 'Кейс', answerH: 'Ответ ИИ', summaryH: 'Сводка', total: (n) => `Всего утверждений: ${n}`,
      claimsH: 'Утверждения', status: 'Статус', cited: 'Статья из ответа ИИ', norm: 'Норма из базы', noQuote: 'Цитаты нет: подтверждающая норма в ГК РК (Особенная часть) не найдена.',
      links: 'Ссылки на «Әділет»', linkWord: '«Әділет»', missingH: 'Статьи из ответа, которых нет в ГК РК (Особенная часть)', missingNone: 'Таких статей нет: все статьи из ответа есть в ГК РК (Особенная часть).',
      pdf: 'Скачать отчёт (PDF)', copy: 'Копировать отчёт', copied: 'Скопировано', copyFail: 'Не удалось скопировать. Откройте отчёт PDF и скопируйте текст оттуда.', file: 'SAQ_отчёт',
      srcFallback: 'Источник для сверки: Гражданский кодекс Республики Казахстан (Особенная часть) от 1 июля 1999 года № 409-I — ИПС «Әділет»' },
    kk: { title: 'SAQ: ЖИ жауабын тексеру есебі', checkedAt: 'Тексерілген күні мен уақыты', caseH: 'Жағдай (кейс)', answerH: 'ЖИ жауабы', summaryH: 'Қорытынды', total: (n) => `Барлық тұжырым: ${n}`,
      claimsH: 'Тұжырымдар', status: 'Мәртебе', cited: 'ЖИ жауабындағы бап', norm: 'Базадағы норма', noQuote: 'Дәйексөз жоқ: ҚР АК-де (Ерекше бөлім) растайтын норма табылмады.',
      links: '«Әділет» сілтемелері', linkWord: '«Әділет»', missingH: 'Жауаптағы ҚР АК-де (Ерекше бөлім) жоқ баптар', missingNone: 'Ондай бап жоқ: жауаптағы барлық баптар ҚР АК-де (Ерекше бөлім) бар.',
      pdf: 'Есепті жүктеу (PDF)', copy: 'Есепті көшіру', copied: 'Көшірілді', copyFail: 'Көшіру мүмкін болмады. PDF есепті ашып, мәтінді сол жерден көшіріңіз.', file: 'SAQ_есеп',
      srcFallback: 'Салыстыру көзі: Қазақстан Республикасының Азаматтық кодексі (Ерекше бөлім), 1999 жылғы 1 шілдедегі № 409-I — «Әділет» АҚЖ' },
    en: { title: 'SAQ report: checking an AI answer', checkedAt: 'Date and time of the check', caseH: 'Case', answerH: 'AI answer', summaryH: 'Summary', total: (n) => `Claims checked: ${n}`,
      claimsH: 'Claims', status: 'Status', cited: 'Article cited in the AI answer', norm: 'Provision in the database', noQuote: 'No quotation: no supporting provision was found in the Civil Code (Special Part).',
      links: 'Links to Adilet', linkWord: 'Adilet', missingH: 'Articles from the answer that are not in the Civil Code (Special Part)', missingNone: 'None: every article cited in the answer is in the Civil Code (Special Part).',
      pdf: 'Download report (PDF)', copy: 'Copy report', copied: 'Copied', copyFail: 'Could not copy. Open the PDF report and copy the text from there.', file: 'SAQ_report',
      srcFallback: 'Source for checking: Civil Code of the Republic of Kazakhstan (Special Part) of 1 July 1999 No. 409-I — Adilet legal information system' },
  };
  const R = () => REP[lang()];
  const STATUS_MARK = { confirmed: '✓', partial: '◐', contradicts: '✗', unverified: '?' };
  const two = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}`;
  const plain = (html) => { const el = document.createElement('div'); el.innerHTML = html; return el.textContent.replace(/\s+/g, ' ').trim(); };
  function refText(r) {
    const L = t(); const parts = [];
    if (r.sub) parts.push(L.sub(r.sub));
    if (r.clause) parts.push(L.clause(r.clause));
    parts.push(L.art(r.article));
    return `${parts.join(' ')} ${r.act ? actName(r.act) : L.gk} — ${L.refState[r.state] || ''}`;
  }
  function normOf(article, clause, title, quote, fragment) {
    const L = t();
    return { head: `${L.art(article)}${clause ? ', ' + L.clause(clause) : ''} — ${title || ''}`, quote: quote || '', fragment: !!fragment, article: String(article), url: adiletUrl(article) };
  }
  // The footer as it is on the page right now (already in the chosen language).
  function footerInfo() {
    const box = document.querySelector('footer .saq-footer-src');
    const a = box && box.querySelector('a');
    const first = box && box.firstElementChild;
    const source = first ? first.textContent.replace(/\s*↗\s*$/, '').replace(/\s+/g, ' ').trim() : R().srcFallback;
    const notes = box ? Array.from(box.querySelectorAll('.saq-footer-note')).map((n) => n.textContent.replace(/\s+/g, ' ').trim()) : [];
    return { source, url: (a && a.href) || ADILET_DOC, notes };
  }
  function reportModel(ctx) {
    ctx = ctx || state;
    const r = ctx.report; if (!r) return null;
    const L = t(); const K = C(); const m = sourceMeta();
    const aiById = new Map((ctx.ai && ctx.ai.results || []).map((x) => [x.id, x]));
    const claims = r.claims.map((c) => {
      const ai = aiById.get(c.id); const useAi = aiUsable(ai);
      const status = useAi ? ai.status : c.status;
      let norm = null;
      if (useAi && ai.quote) norm = normOf(ai.article, ai.clause, ai.title, ai.quote, false);
      else if (c.target) norm = normOf(c.target.article, c.target.clause, c.target.title, c.target.quote, c.target.fragment);
      let suggested = null;
      if (c.suggested && !(ai && ai.article === c.suggested.article)) {
        suggested = normOf(c.suggested.article, c.suggested.clause, c.suggested.title, c.suggested.quote, false);
        suggested.label = status === 'unverified' ? L.maybe : L.suggested;
      }
      const links = []; const seen = new Set();
      const addLink = (n) => { const u = adiletUrl(n); if (u && !seen.has(String(n))) { seen.add(String(n)); links.push({ label: K.tabMain(n), url: u }); } };
      if (norm) addLink(norm.article);
      c.refs.forEach((x) => { if (!x.act && (x.state === 'ok' || x.state === 'clause_missing')) addLink(x.article); });
      if (suggested) addLink(suggested.article);
      return { id: c.id, text: c.text, status, statusLabel: L.status[status], cited: c.refs.length ? c.refs.map(refText) : [L.noRef], norm, suggested, links,
        why: useAi ? (ai.explanation || '') : reasonText(c, status) };
    });
    // Articles of the answer that are not in the Special Part: from the claims and from the whole answer text.
    const missing = []; const seenMiss = new Set();
    const addMiss = (article, act, st) => { const key = article + '|' + (act || ''); if (seenMiss.has(key)) return; seenMiss.add(key);
      missing.push(`${L.art(article)}${act ? ' ' + actName(act) : ''} — ${act ? L.refState.other_act : st === 'general_part' ? L.refState.general_part : K.refMissing}`); };
    r.claims.forEach((c) => c.refs.forEach((x) => { if (['missing', 'general_part', 'other_act'].includes(x.state)) addMiss(x.article, x.act, x.state); }));
    if (window.SAQScanner && window.SAQScanner.parseRefs && ctx.answer) {
      window.SAQScanner.parseRefs(ctx.answer).forEach((x) => {
        const act = x.act ? (x.act.name || x.act) : null;
        if (act) addMiss(x.article, act, 'other_act'); else if (!adiletUrl(x.article)) addMiss(x.article, null, Number(x.article) < 406 ? 'general_part' : 'missing');
      });
    }
    const counts = ['confirmed', 'partial', 'contradicts', 'unverified'].map((s) => ({ s, label: L.status[s], n: claims.filter((c) => c.status === s).length }));
    const notes = [];
    if (r.truncated) notes.push(L.truncated(r.maxClaims));
    if (r.answerLanguage !== 'ru' && !ctx.ai) notes.push(L.langNote);
    return { when: stamp(ctx.checkedAt || new Date()), date: ctx.checkedAt || new Date(), mode: ctx.ai ? L.modeAi(ctx.ai.model) : L.modeBase,
      source: m ? plain(L.source(m)) : '', caseText: ctx.caseText || '', answer: ctx.answer || '', counts, total: claims.length, claims, missing, notes,
      empty: claims.length ? '' : L.empty, quoteLabel: L.quoteLabel(m ? m.edition : ''), fragment: L.fragment, why: L.why, foot: footerInfo() };
  }
  function reportHtml(d) {
    const P = R();
    const claim = (c) => `<article class="pr-claim"><h3>${esc(t().claim)} ${c.id} — ${STATUS_MARK[c.status]} ${esc(c.statusLabel)}</h3>`
      + `<p class="pr-claim-text">«${esc(c.text)}»</p><dl>`
      + `<dt>${esc(P.cited)}</dt><dd>${c.cited.map(esc).join('<br>')}</dd>`
      + `<dt>${esc(P.norm)}</dt><dd>${c.norm ? esc(c.norm.head) : esc(t().noNorm)}</dd>`
      + (c.norm && c.norm.quote ? `<dt>${esc(d.quoteLabel)}</dt><dd class="pr-quote">${esc(c.norm.quote)}${c.norm.fragment ? ' <i>' + esc(d.fragment) + '</i>' : ''}</dd>` : `<dt>${esc(d.quoteLabel)}</dt><dd>${esc(P.noQuote)}</dd>`)
      + (c.suggested ? `<dt>${esc(c.suggested.label)}</dt><dd>${esc(c.suggested.head)}${c.suggested.quote ? `<div class="pr-quote">${esc(c.suggested.quote)}</div>` : ''}</dd>` : '')
      + (c.links.length ? `<dt>${esc(P.links)}</dt><dd>${c.links.map((l) => `${esc(l.label)}: <a href="${esc(l.url)}">${esc(l.url)}</a>`).join('<br>')}</dd>` : '')
      + (c.why ? `<dt>${esc(d.why)}</dt><dd>${esc(c.why)}</dd>` : '')
      + `</dl></article>`;
    return `<header class="pr-head"><div class="pr-brand">SAQ ✦</div><h1>${esc(P.title)}</h1>`
      + `<p><b>${esc(P.checkedAt)}:</b> ${esc(d.when)}</p><p>${esc(d.mode)}</p>${d.source ? `<p>${esc(d.source)}</p>` : ''}${d.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</header>`
      + `<section><h2>${esc(P.caseH)}</h2><div class="pr-text">${esc(d.caseText)}</div></section>`
      + `<section><h2>${esc(P.answerH)}</h2><div class="pr-text">${esc(d.answer)}</div></section>`
      + `<section><h2>${esc(P.summaryH)}</h2><table class="pr-summary"><tbody>${d.counts.map((x) => `<tr><td>${STATUS_MARK[x.s]} ${esc(x.label)}</td><td>${x.n}</td></tr>`).join('')}<tr><td><b>${esc(P.total(d.total))}</b></td><td></td></tr></tbody></table></section>`
      + `<section><h2>${esc(P.claimsH)}</h2>${d.empty ? `<p>${esc(d.empty)}</p>` : d.claims.map(claim).join('')}</section>`
      + `<section><h2>${esc(P.missingH)}</h2>${d.missing.length ? `<ul>${d.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(P.missingNone)}</p>`}</section>`
      + `<footer class="pr-foot"><p>${esc(d.foot.source)}: <a href="${esc(d.foot.url)}">${esc(d.foot.url)}</a></p>${d.foot.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</footer>`;
  }
  function reportText(d) {
    const P = R(); const out = []; const H = (s) => { out.push('', s.toUpperCase()); };
    out.push(P.title, `${P.checkedAt}: ${d.when}`, d.mode);
    if (d.source) out.push(d.source);
    d.notes.forEach((n) => out.push(n));
    H(P.caseH); out.push(d.caseText);
    H(P.answerH); out.push(d.answer);
    H(P.summaryH); d.counts.forEach((x) => out.push(`${x.label}: ${x.n}`)); out.push(P.total(d.total));
    H(P.claimsH);
    if (d.empty) out.push(d.empty);
    d.claims.forEach((c) => {
      out.push('', `${t().claim} ${c.id} — ${c.statusLabel}`, `«${c.text}»`, `${P.cited}: ${c.cited.join('; ')}`, `${P.norm}: ${c.norm ? c.norm.head : t().noNorm}`);
      out.push(c.norm && c.norm.quote ? `${d.quoteLabel} «${c.norm.quote}»${c.norm.fragment ? ' ' + d.fragment : ''}` : `${d.quoteLabel} ${P.noQuote}`);
      if (c.suggested) out.push(`${c.suggested.label}: ${c.suggested.head}${c.suggested.quote ? ' «' + c.suggested.quote + '»' : ''}`);
      c.links.forEach((l) => out.push(`${P.linkWord} ${l.label}: ${l.url}`));
      if (c.why) out.push(`${d.why}: ${c.why}`);
    });
    H(P.missingH);
    if (d.missing.length) d.missing.forEach((x) => out.push('— ' + x)); else out.push(P.missingNone);
    out.push('', '—', `${d.foot.source}: ${d.foot.url}`);
    d.foot.notes.forEach((n) => out.push(n));
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  function printReport(ctx) {
    const d = reportModel(ctx); if (!d) return;
    let box = document.getElementById('saq-print-report');
    if (!box) { box = document.createElement('section'); box.id = 'saq-print-report'; box.setAttribute('data-saq-no-translate', ''); box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box); }
    box.setAttribute('lang', lang());
    box.innerHTML = reportHtml(d);
    const root = document.documentElement; const oldTitle = document.title;
    const x = d.date;
    document.title = `${R().file}_${x.getFullYear()}-${two(x.getMonth() + 1)}-${two(x.getDate())}_${two(x.getHours())}-${two(x.getMinutes())}`;
    root.classList.add('saq-printing');
    const done = () => { root.classList.remove('saq-printing'); document.title = oldTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (_) { done(); }
  }
  async function copyReport() {
    const d = reportModel(); if (!d) return;
    const text = reportText(d); const note = $('#scan-report .saq-report-copied');
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext !== false) { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove();
    }
    if (note) {
      note.textContent = ok ? R().copied : R().copyFail;
      note.classList.toggle('is-error', !ok);
      clearTimeout(copyReport.timer); copyReport.timer = setTimeout(() => { if (note.isConnected) note.textContent = ''; }, ok ? 3500 : 8000);
    }
  }
  const reportActionsHtml = () => `<div class="saq-report-actions" data-no-artlink><button type="button" class="btn primary small" data-saq-report="pdf">${esc(R().pdf)}</button><button type="button" class="btn secondary small" data-saq-report="copy">${esc(R().copy)}</button><span class="saq-report-copied" role="status" aria-live="polite"></span></div>`;
  window.SAQReport = { model: () => reportModel(), text: () => { const d = reportModel(); return d ? reportText(d) : ''; }, html: () => { const d = reportModel(); return d ? reportHtml(d) : ''; } };

  /* ------------------------------------------- history of checks (v28) */
  // Only in this browser (localStorage). Nothing is sent anywhere. The last HMAX checks are kept.
  const HIST = {
    ru: { title: 'История проверок', note: 'История хранится только в этом браузере и никуда не отправляется.', empty: 'Здесь появятся ваши проверки',
      off: 'Запись истории выключена в настройках ⚙ — новые проверки не сохраняются.', open: 'Открыть', pdf: 'Скачать отчёт', del: 'Удалить', clear: 'Очистить историю',
      ask: 'Удалить все проверки из истории? Это действие нельзя отменить.', yes: 'Да, очистить', no: 'Отмена', cleared: 'История очищена.', deleted: 'Запись удалена.',
      opened: 'Проверка из истории открыта — результат ниже под полями.', count: (n, max) => `Сохранено: ${n} из ${max}`, noCase: '(кейс не заполнен)', list: 'Сохранённые проверки' },
    kk: { title: 'Тексерулер тарихы', note: 'Тарих тек осы браузерде сақталады және ешқайда жіберілмейді.', empty: 'Мұнда сіздің тексерулеріңіз пайда болады',
      off: 'Тарихты жазу ⚙ баптауларында өшірілген — жаңа тексерулер сақталмайды.', open: 'Ашу', pdf: 'Есепті жүктеу', del: 'Жою', clear: 'Тарихты тазалау',
      ask: 'Тарихтағы барлық тексерулерді жою керек пе? Бұл әрекетті қайтару мүмкін емес.', yes: 'Иә, тазалау', no: 'Болдырмау', cleared: 'Тарих тазаланды.', deleted: 'Жазба жойылды.',
      opened: 'Тарихтағы тексеру ашылды — нәтиже өрістердің астында.', count: (n, max) => `Сақталды: ${n} / ${max}`, noCase: '(кейс толтырылмаған)', list: 'Сақталған тексерулер' },
    en: { title: 'Check history', note: 'The history is stored only in this browser and is never sent anywhere.', empty: 'Your checks will appear here',
      off: 'Saving history is turned off in ⚙ settings — new checks are not saved.', open: 'Open', pdf: 'Download report', del: 'Delete', clear: 'Clear history',
      ask: 'Delete all checks from the history? This cannot be undone.', yes: 'Yes, clear', no: 'Cancel', cleared: 'History cleared.', deleted: 'Entry deleted.',
      opened: 'The check from the history is open — the result is below the fields.', count: (n, max) => `Saved: ${n} of ${max}`, noCase: '(no case text)', list: 'Saved checks' },
  };
  const HI = () => HIST[lang()];
  const HKEY = 'saq-history'; const HON = 'saq-history-on'; const HMAX = 10;
  const histMem = { list: [], on: true }; // used when the browser refuses storage (private mode)
  function histLoad() {
    try {
      const raw = localStorage.getItem(HKEY); if (raw === null) return histMem.list.slice();
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a.filter((x) => x && typeof x.id === 'string' && typeof x.caseText === 'string' && typeof x.answer === 'string' && x.at).slice(0, HMAX) : [];
    } catch (_) { return histMem.list.slice(); }
  }
  function histSave(list) {
    histMem.list = list.slice(0, HMAX);
    try { if (list.length) localStorage.setItem(HKEY, JSON.stringify(histMem.list)); else localStorage.removeItem(HKEY); } catch (_) { /* kept for this visit only */ }
  }
  function histOn() { try { const v = localStorage.getItem(HON); return v === null ? histMem.on : v !== '0'; } catch (_) { return histMem.on; } }
  function setHistOn(on) { histMem.on = on; try { if (on) localStorage.removeItem(HON); else localStorage.setItem(HON, '0'); } catch (_) { /* this visit only */ } }
  const STATUS_KEYS = ['confirmed', 'partial', 'contradicts', 'unverified'];
  function histAdd() {
    if (!histOn() || !state.report) return;
    const d = reportModel(state); if (!d) return;
    const counts = {}; d.counts.forEach((x) => { counts[x.s] = x.n; });
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), at: (state.checkedAt || new Date()).toISOString(),
      caseText: state.caseText || '', answer: state.answer || '', counts, total: d.total };
    // The same case and answer checked again moves to the top instead of appearing twice.
    const list = histLoad().filter((x) => !(x.caseText === entry.caseText && x.answer === entry.answer));
    list.unshift(entry);
    histSave(list.slice(0, HMAX));
  }
  const hstate = { confirm: false, msg: '' };
  function histItemHtml(x) {
    const H = HI(); const L = t();
    const when = stamp(new Date(x.at));
    const snippet = x.caseText.trim() ? x.caseText.trim().replace(/\s+/g, ' ').slice(0, 80) + (x.caseText.trim().length > 80 ? '…' : '') : H.noCase;
    const meta = `hist-${x.id}-meta`;
    const stats = STATUS_KEYS.map((s) => `<li class="saq-hist-stat saq-hist-stat--${s}">${STATUS_MARK[s]} ${esc(L.status[s])}: <b>${Number((x.counts || {})[s]) || 0}</b></li>`).join('');
    return `<li class="saq-history-item"><div class="saq-history-meta" id="${meta}"><time datetime="${esc(x.at)}">${esc(when)}</time>`
      + `<p class="saq-history-case">${esc(snippet)}</p><ul class="saq-history-stats">${stats}</ul></div>`
      + `<div class="saq-history-actions"><button type="button" class="btn secondary small" data-hist-open="${esc(x.id)}" aria-describedby="${meta}">${esc(H.open)}</button>`
      + `<button type="button" class="btn secondary small" data-hist-pdf="${esc(x.id)}" aria-describedby="${meta}">${esc(H.pdf)}</button>`
      + `<button type="button" class="btn ghost small saq-history-del" data-hist-del="${esc(x.id)}" aria-describedby="${meta}">${esc(H.del)}</button></div></li>`;
  }
  function renderHistory(focus) {
    const box = $('#scan-history'); if (!box) return;
    const H = HI(); const list = histLoad();
    const foot = !list.length ? '' : hstate.confirm
      ? `<div class="saq-history-confirm"><p id="hist-ask" tabindex="-1">${esc(H.ask)}</p><div class="saq-history-confirm-actions"><button type="button" class="btn primary small" data-hist-yes>${esc(H.yes)}</button><button type="button" class="btn secondary small" data-hist-no>${esc(H.no)}</button></div></div>`
      : `<button type="button" class="btn ghost small saq-history-clear" data-hist-clear>${esc(H.clear)}</button>`;
    box.innerHTML = `<div class="saq-history-head"><h3 id="scan-history-title" tabindex="-1">${esc(H.title)}</h3>${list.length ? `<span class="pill">${esc(H.count(list.length, HMAX))}</span>` : ''}</div>`
      + `<p class="saq-history-note">${esc(H.note)}</p>`
      + (histOn() ? '' : `<p class="saq-history-off">${esc(H.off)}</p>`)
      + (list.length ? `<ol class="saq-history-list" aria-label="${esc(H.list)}">${list.map(histItemHtml).join('')}</ol>` : `<p class="saq-history-empty">${esc(H.empty)}</p>`)
      + `<div class="saq-history-foot">${foot}</div><p class="saq-history-status" role="status" aria-live="polite">${esc(hstate.msg)}</p>`;
    box.setAttribute('aria-labelledby', 'scan-history-title');
    if (focus) { const el = box.querySelector(focus); if (el) el.focus({ preventScroll: false }); }
  }
  function histSay(msg) { hstate.msg = msg; clearTimeout(histSay.t); histSay.t = setTimeout(() => { hstate.msg = ''; const st = $('#scan-history .saq-history-status'); if (st) st.textContent = ''; }, 5000); }
  async function histEntryContext(x) {
    const law = await loadLaw();
    return { report: window.SAQScanner.analyze(law, x.caseText, x.answer), ai: null, answer: x.answer, caseText: x.caseText, checkedAt: new Date(x.at) };
  }
  function histOpen(x) {
    $('#case').value = x.caseText; $('#ai').value = x.answer;
    $('#case').dispatchEvent(new Event('input')); $('#ai').dispatchEvent(new Event('input'));
    return run({ fromHistory: x });
  }
  function histClick(e) {
    const list = histLoad(); const find = (id) => list.find((x) => x.id === id);
    let b;
    if ((b = e.target.closest('[data-hist-open]'))) { const x = find(b.dataset.histOpen); if (x) histOpen(x); return; }
    if ((b = e.target.closest('[data-hist-pdf]'))) { const x = find(b.dataset.histPdf); if (x) histEntryContext(x).then(printReport).catch(() => { $('#scan-info').textContent = t().loadFail; }); return; }
    if ((b = e.target.closest('[data-hist-del]'))) {
      const i = list.findIndex((x) => x.id === b.dataset.histDel); if (i < 0) return;
      list.splice(i, 1); histSave(list); hstate.confirm = false; histSay(HI().deleted);
      const next = list[i] || list[i - 1];
      renderHistory(next ? `[data-hist-open="${next.id}"]` : '#scan-history-title'); return;
    }
    if (e.target.closest('[data-hist-clear]')) { hstate.confirm = true; hstate.msg = ''; renderHistory('#hist-ask'); return; }
    if (e.target.closest('[data-hist-yes]')) { histSave([]); hstate.confirm = false; histSay(HI().cleared); renderHistory('#scan-history-title'); return; }
    if (e.target.closest('[data-hist-no]')) { hstate.confirm = false; renderHistory('[data-hist-clear]'); }
  }
  function initHistory() {
    const box = $('#scan-history'); if (!box) return;
    box.addEventListener('click', histClick);
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hstate.confirm) { e.stopPropagation(); hstate.confirm = false; renderHistory('[data-hist-clear]'); } });
    const tg = document.getElementById('saq-history-toggle');
    const syncToggle = () => { if (tg) tg.setAttribute('aria-checked', String(histOn())); };
    if (tg) tg.addEventListener('click', () => { setHistOn(!histOn()); syncToggle(); renderHistory(); });
    window.addEventListener('storage', (e) => { if (e.key === HKEY || e.key === HON || e.key === null) { syncToggle(); renderHistory(); } });
    syncToggle(); renderHistory();
  }
  const REASON = {
    contradicts: ['qty_mismatch', 'modal_conflict', 'role_conflict', 'duty_vs_right', 'exclusion_conflict', 'clause_missing', 'topic_mismatch', 'low_overlap'],
    partial: ['partial_overlap', 'qty_missing', 'negation_unclear', 'unknown_terms', 'clause_missing', 'low_overlap'],
    unverified: ['article_missing', 'general_part', 'other_act', 'no_match', 'low_overlap', 'too_vague', 'qty_missing', 'maybe_in_special_part'],
    confirmed: ['qty_match', 'found_without_ref'],
  };
  function reasonText(c, status) {
    const L = t();
    for (const k of REASON[status] || []) {
      const f = c.findings.find((x) => x.t === k);
      if (f && L.f[k]) return L.f[k](f);
    }
    return '';
  }
  function articleOf(n) {
    if (!state.law) return null;
    if (!state.artMap) state.artMap = new Map(state.law.articles.map((a) => [a.n, a]));
    return state.artMap.get(String(n)) || null;
  }
  // Find a quote inside the article text. normalize() keeps string length, so indices map back 1:1.
  function locate(hay, needle, start) {
    if (!needle) return null;
    if (typeof start === 'number' && hay.substr(start, needle.length) === needle) return [start, start + needle.length];
    const N = window.SAQScanner.normalize;
    const H = N(hay); const Q = N(needle).trim();
    const i = H.indexOf(Q);
    if (i >= 0) return [i, i + Q.length];
    try {
      const re = new RegExp(Q.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
      const m = re.exec(H);
      return m ? [m.index, m.index + m[0].length] : null;
    } catch (_) { return null; }
  }
  function evidenceOf(c, ai) {
    const useAi = aiUsable(ai);
    const status = useAi ? ai.status : c.status;
    const tabs = [];
    if (useAi && ai.article) tabs.push({ article: ai.article, clause: ai.clause, quote: status === 'unverified' ? '' : ai.quote, kind: status === 'unverified' ? 'cited' : 'main' });
    else if (c.target) tabs.push({ article: c.target.article, clause: c.target.clause, quote: status === 'unverified' ? '' : c.target.quote, start: c.target.quoteStart, kind: status === 'unverified' ? 'cited' : (c.findings.some((f) => f.t === 'topic_mismatch') ? 'cited' : 'main') });
    if (c.suggested && !tabs.some((x) => x.article === c.suggested.article)) tabs.push({ article: c.suggested.article, clause: c.suggested.clause, quote: c.suggested.quote, kind: status === 'unverified' ? 'maybe' : 'better' });
    let active = 0;
    if (c.findings.some((f) => f.t === 'topic_mismatch') && tabs.length > 1) active = tabs.length - 1;
    return { status, tabs, active, useAi };
  }
  function compareAnswerHtml(r, aiById) {
    const src = state.answer || '';
    const N = window.SAQScanner.normalize(src);
    const pieces = []; const lost = [];
    let pos = 0;
    for (const c of r.claims) {
      const i = N.indexOf(c.text, pos);
      if (i < 0) { lost.push(c); continue; }
      pieces.push({ c, i, j: i + c.text.length });
      pos = i + c.text.length;
    }
    const btn = (c, text) => {
      const a = aiById.get(c.id); const st = aiUsable(a) ? a.status : c.status;
      return `<button type="button" class="saq-cmp-claim saq-cmp-claim--${st}" data-claim="${c.id}" aria-pressed="${state.sel === c.id}" title="${esc(t().status[st])}"><sup>${c.id}</sup>${esc(text)}</button>`;
    };
    let html = ''; let at = 0;
    for (const p of pieces) { html += esc(src.slice(at, p.i)) + btn(p.c, src.slice(p.i, p.j)); at = p.j; }
    html += esc(src.slice(at));
    if (lost.length) html += `\n\n<span class="saq-cmp-other">${esc(C().other)}:</span> ` + lost.map((c) => btn(c, c.text)).join(' ');
    return html;
  }
  function compareLawHtml(c, ai) {
    const L = t(); const K = C();
    if (!c) return `<p class="saq-cmp-empty">${esc(K.pick)}</p>`;
    const ev = evidenceOf(c, ai);
    if (state.tab != null && ev.tabs[state.tab]) ev.active = state.tab;
    const tab = ev.tabs[ev.active];
    let html = `<div class="saq-cmp-law-head"><span class="saq-cmp-claimno">${esc(K.claim(c.id))}</span>${statusPill(ev.status)}</div>`;
    // what the check says
    const why = ev.useAi ? (ai.discrepancy || ai.explanation || '') : reasonText(c, ev.status);
    if (ev.status === 'unverified') html += `<div class="saq-cmp-note saq-cmp-note--none"><b>${esc(K.none)}</b>${why ? `<br>${esc(why)}` : ''}</div>`;
    else if (ev.status === 'contradicts') html += `<div class="saq-cmp-note saq-cmp-note--diff"><b>${esc(K.diff)}:</b> ${esc(why || L.status.contradicts)}</div>`;
    else if (ev.status === 'partial') html += `<div class="saq-cmp-note saq-cmp-note--partial"><b>${esc(K.partial)}:</b> ${esc(why || '')}</div>`;
    else html += `<div class="saq-cmp-note saq-cmp-note--ok">${esc(K.ok)}${why ? ' ' + esc(why) : ''}</div>`;
    if (!tab) return html;
    if (ev.tabs.length > 1) {
      const label = (x) => x.kind === 'better' ? K.tabBetter(x.article) : x.kind === 'maybe' ? K.tabMaybe(x.article) : x.kind === 'cited' ? K.tabCited(x.article) : K.tabMain(x.article);
      html += `<div class="saq-cmp-tabs" role="tablist">${ev.tabs.map((x, i) => `<button type="button" role="tab" class="saq-cmp-tab" data-cmp-tab="${i}" aria-selected="${i === ev.active}">${esc(label(x))}</button>`).join('')}</div>`;
    }
    const art = articleOf(tab.article);
    if (!art) return html;
    const url = adiletUrl(art.n);
    const artName = L.art(art.n); const cap = artName.charAt(0).toUpperCase() + artName.slice(1);
    html += `<div class="saq-cmp-art-title"><span data-saq-no-translate>${esc(cap)}. ${esc(art.ti || '')}</span>${tab.clause ? ` <span class="saq-cmp-chip">${esc(L.clause(tab.clause))}</span>` : ''}</div>`;
    if (url) html += `<a class="saq-adilet saq-cmp-adilet" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(K.adiletTitle)}">${esc(K.adilet)}<span class="saq-adilet-arrow" aria-hidden="true">↗</span></a>`;
    if (tab.kind === 'maybe') html += `<p class="saq-cmp-small">${esc(K.maybeNote)}</p>`;
    let body;
    const span = tab.quote ? locate(art.t, tab.quote, tab.start) : null;
    if (span) body = esc(art.t.slice(0, span[0])) + `<mark class="saq-cmp-mark saq-cmp-mark--${tab.kind === 'maybe' ? 'maybe' : ev.status}" id="saq-cmp-mark">${esc(art.t.slice(span[0], span[1]))}</mark>` + esc(art.t.slice(span[1]));
    else body = esc(art.t);
    if (!tab.quote && ev.status === 'unverified' && tab.kind === 'cited') html += `<p class="saq-cmp-small">${esc(K.noQuote)}</p>`;
    if (tab.quote && !span) html += `<p class="saq-cmp-small">${esc(K.notFound)}</p>`;
    html += `<div class="saq-cmp-article" data-saq-no-translate tabindex="0">${body}</div>`;
    return html;
  }
  function compareHtml(r, aiById) {
    const K = C();
    if (!r.claims.length) return '';
    if (state.sel == null || !r.claims.some((c) => c.id === state.sel)) {
      const st = (c) => { const a = aiById.get(c.id); return aiUsable(a) ? a.status : c.status; };
      const pick = r.claims.find((c) => st(c) === 'contradicts') || r.claims.find((c) => st(c) === 'partial') || r.claims.find((c) => st(c) === 'unverified') || r.claims[0];
      state.sel = pick.id; state.tab = null;
    }
    const c = r.claims.find((x) => x.id === state.sel);
    return `<section class="saq-cmp" id="saq-cmp" aria-label="${esc(K.title)}">
      <header class="saq-cmp-headline"><h4>${esc(K.title)}</h4><p>${esc(K.hint)}</p></header>
      <div class="saq-cmp-grid">
        <div class="saq-cmp-col"><div class="saq-cmp-label">${esc(K.answer)}</div><div class="saq-cmp-text" data-saq-no-translate>${compareAnswerHtml(r, aiById)}</div>${answerRefsHtml()}</div>
        <div class="saq-cmp-col saq-cmp-lawcol" aria-live="polite"><div class="saq-cmp-label">${esc(K.law)}</div><div class="saq-cmp-law">${compareLawHtml(c, aiById.get(state.sel))}</div></div>
      </div></section>`;
  }
  function refreshCompare(scrollToLaw) {
    const r = state.report; const box = $('#saq-cmp');
    if (!r || !box) return;
    const aiById = new Map((state.ai && state.ai.results || []).map((x) => [x.id, x]));
    box.querySelectorAll('.saq-cmp-claim').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.claim) === state.sel)));
    const c = r.claims.find((x) => x.id === state.sel);
    box.querySelector('.saq-cmp-law').innerHTML = compareLawHtml(c, aiById.get(state.sel));
    linkArticles(box.querySelector('.saq-cmp-law'));
    focusMark();
    if (scrollToLaw) {
      const law = box.querySelector('.saq-cmp-lawcol'); const rect = law.getBoundingClientRect();
      if (rect.top < 60 || rect.top > innerHeight * 0.6) {
        try { law.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (_) { law.scrollIntoView(); }
      }
    }
  }
  const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  // Scroll the article box (not the page) so the highlighted excerpt is in view.
  function focusMark() {
    const mark = document.getElementById('saq-cmp-mark');
    if (!mark) return;
    const box = mark.closest('.saq-cmp-article');
    if (box) box.scrollTop = Math.max(0, mark.offsetTop - box.offsetTop - 24);
  }

  /* ------------------------------------------------------------ examples */
  const EXAMPLES = {
    errors: {
      case: 'Покупатель перечислил продавцу 180 000 ₸ предварительной оплаты за оборудование. Срок передачи истёк, оборудование не передано. Покупатель хочет вернуть деньги.',
      answer: 'Отношения сторон регулируются договором купли-продажи (статья 406 ГК РК). Продавец обязан передать покупателю товар, предусмотренный договором (статья 408 ГК РК). Возможность потребовать назад предоплату за непоставленный товар установлена пунктом 3 статьи 407 ГК РК. Если срок возврата займа договором не установлен, он должен быть возвращен в течение десяти дней со дня предъявления требования (статья 722 ГК РК).',
    },
    missing: {
      case: 'Продавец магазина продал покупателю неисправный телефон. Покупатель требует замены.',
      answer: 'Согласно статье 1250 ГК РК продавец обязан заменить телефон в течение 3 дней. По статье 277 ГК РК обязательство должно исполняться надлежащим образом. В соответствии со статьей 503 ГК РФ покупатель вправе потребовать замены товара. Работодатель может уволить продавца по статье 52 Трудового кодекса РК.',
    },
    good: {
      case: 'Гражданин дал знакомому деньги в долг, срок возврата в договоре займа не указан. Заимодатель потребовал вернуть деньги.',
      answer: 'Если срок возврата предмета займа договором не установлен, он должен быть возвращен заемщиком в течение тридцати дней со дня предъявления требования об этом заимодателем (статья 722 ГК РК).',
    },
  };

  /* --------------------------------------------------------------- state */
  const state = { law: null, lawPromise: null, status: null, report: null, ai: null, aiError: null, aiPending: false };
  const httpOrigin = /^https?:$/.test(location.protocol);
  const fmtDate = (iso) => (iso || '').split('-').reverse().join('.');

  function loadLaw() {
    if (state.law) return Promise.resolve(state.law);
    if (window.SAQ_LAW) { state.law = window.SAQ_LAW; return Promise.resolve(state.law); }
    if (!state.lawPromise) {
      state.lawPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = LAW_FILE; s.async = true;
        s.onload = () => { if (window.SAQ_LAW) { state.law = window.SAQ_LAW; resolve(state.law); renderSource(); } else reject(new Error('law')); };
        s.onerror = () => { state.lawPromise = null; reject(new Error('law')); };
        document.head.appendChild(s);
      });
    }
    return state.lawPromise;
  }
  async function loadStatus() {
    if (!httpOrigin) return;
    try {
      const r = await fetch('api/status', { cache: 'no-store' });
      if (r.ok) state.status = await r.json();
    } catch (_) { /* static hosting or file: the database check still works */ }
    renderSource();
  }
  const aiOn = () => !!(state.status && state.status.ai_enabled);
  const sourceMeta = () => {
    const m = (state.law && state.law.meta) || (state.status && state.status.database) || null;
    return m ? { article_start: m.article_start, article_end: m.article_end, article_count: m.article_count, edition: fmtDate(m.edition_date) } : null;
  };

  /* -------------------------------------------------------------- render */
  function renderSource() {
    const box = $('#scan-source-panel');
    if (!box) return;
    const L = t(); const m = sourceMeta();
    box.querySelector('.saq-src-text').innerHTML = m ? L.source(m) : esc(L.sourceShort);
    const modeEl = box.querySelector('.saq-src-mode');
    modeEl.textContent = aiOn() ? L.aiOn(state.status.model) : '';
    modeEl.hidden = !aiOn();
    box.classList.toggle('is-ai', aiOn());
  }
  // An AI answer counts only if it kept verbatim support after the server-side check; otherwise the database result stands.
  const aiUsable = (ai) => !!ai && !(ai.flags || []).some((f) => f === 'no_answer' || f === 'no_verbatim_support');
  const statusPill = (s) => `<span class="saq-status saq-status--${s}">${esc(t().status[s])}</span>`;
  function refLabel(r) {
    const L = t();
    const parts = [];
    if (r.sub) parts.push(L.sub(r.sub));
    if (r.clause) parts.push(L.clause(r.clause));
    const linkable = !r.act && (r.state === 'ok' || r.state === 'clause_missing');
    parts.push(linkable ? artLink(r.article) : esc(L.art(r.article)));
    const act = r.act ? actName(r.act) : L.gk;
    return `${parts.map((x, i) => (i === parts.length - 1 ? x : esc(x))).join(' ')} ${esc(act)} — <span class="saq-ref-state saq-ref-state--${esc(r.state)}">${esc(L.refState[r.state] || '')}</span>`;
  }
  function quoteBlock(article, title, clause, quote, fragment, label) {
    const L = t(); const m = sourceMeta();
    if (!quote) return '';
    return `<div class="saq-quote"><div class="saq-quote-label">${esc(label || L.quoteLabel(m ? m.edition : ''))}</div>`
      + `<div class="saq-quote-ref">${artLink(article)}${clause ? ', ' + esc(L.clause(clause)) : ''} — <span data-saq-no-translate>${esc(title || '')}</span> ${fragment ? '<small>' + esc(L.fragment) + '</small>' : ''}</div>`
      + `<div class="normtext" data-saq-no-translate>${esc(quote)}</div></div>`;
  }
  function findingsList(c) {
    const L = t();
    const items = c.findings.map((f) => (L.f[f.t] ? L.f[f.t](f) : '')).filter(Boolean);
    if (c.target && c.target.matched && c.target.matched.length && ['confirmed', 'partial'].includes(c.status)) items.push(L.f.matched(c.target.matched.slice(0, 6)));
    return items.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  }
  function claimCard(c, ai) {
    const L = t();
    const useAi = aiUsable(ai);
    const status = useAi ? ai.status : c.status;
    const refs = c.refs.length ? c.refs.map(refLabel).join('<br>') : esc(L.noRef);
    const norm = c.target ? `${artLink(c.target.article)}${c.target.clause ? ', ' + esc(L.clause(c.target.clause)) : ''} — <span data-saq-no-translate>${esc(c.target.title)}</span>` : esc(L.noNorm);
    let quoteHtml = '';
    if (useAi && ai.quote) quoteHtml = quoteBlock(ai.article, ai.title, ai.clause, ai.quote, false);
    else if (c.target) quoteHtml = quoteBlock(c.target.article, c.target.title, c.target.clause, c.target.quote, c.target.fragment);
    const suggested = c.suggested && !(ai && ai.article === c.suggested.article) ? `<div class="saq-suggested"><b>${esc(status === 'unverified' ? L.maybe : L.suggested)}:</b>${quoteBlock(c.suggested.article, c.suggested.title, c.suggested.clause, c.suggested.quote, false, ' ')}</div>` : '';
    const baseWhy = `<div class="saq-why"><b>${esc(useAi ? L.baseDetails : L.why)}</b>${useAi ? statusPill(c.status) : ''}${findingsList(c)}<p class="saq-method">${esc(L.method)}</p></div>`;
    const aiBlock = ai ? `<div class="saq-ai"><b>${esc(L.ai)}</b><p>${esc(ai.explanation)}</p>${ai.discrepancy ? `<p><b>${esc(L.aiDiff)}:</b> ${esc(ai.discrepancy)}</p>` : ''}${(ai.flags || []).map((f) => L.aiFlags[f] ? `<p class="saq-ai-flag">${esc(L.aiFlags[f])}</p>` : '').join('')}${useAi ? '' : `<p class="saq-ai-flag">${esc(L.aiFallback)}</p>`}<p class="saq-method">${esc(L.methodAi)}</p></div>` : '';
    return `<article class="card saq-claim saq-claim--${status}">
      <header class="saq-claim-head"><span class="saq-claim-num">${esc(L.claim)} ${c.id}</span><span class="saq-claim-headright"><button type="button" class="saq-cmp-goto" data-claim-goto="${c.id}">${esc(C().goto)}</button>${statusPill(status)}</span></header>
      <blockquote class="saq-claim-text" data-saq-no-translate>${esc(c.text)}</blockquote>
      <dl class="saq-claim-facts"><div><dt>${esc(L.refInAnswer)}</dt><dd>${refs}</dd></div><div><dt>${esc(L.normInBase)}</dt><dd>${norm}</dd></div></dl>
      ${quoteHtml}${suggested}${aiBlock}${useAi ? `<details class="saq-base-details"><summary>${esc(L.baseDetails)}</summary>${baseWhy}</details>` : baseWhy}
    </article>`;
  }
  function renderReport() {
    const out = $('#scan-report');
    const r = state.report;
    if (!out || !r) return;
    const L = t(); const m = sourceMeta();
    const aiById = new Map((state.ai && state.ai.results || []).map((x) => [x.id, x]));
    const statuses = r.claims.map((c) => { const a = aiById.get(c.id); return aiUsable(a) ? a.status : c.status; });
    const count = (s) => statuses.filter((x) => x === s).length;
    let mode = L.modeBase;
    if (state.ai) mode = L.modeAi(state.ai.model);
    else if (state.aiPending) mode = L.modeAiPending;
    const aiErr = state.aiError ? `<p class="saq-scan-warn">${esc(L.aiFailed(L.errors[state.aiError] || (L.errors.server_error + ': ' + String(state.aiError).slice(0, 40))))}</p>` : '';
    const langNote = r.answerLanguage !== 'ru' && !state.ai ? `<p class="saq-scan-warn">${esc(L.langNote)}</p>` : '';
    const caseNorms = r.caseNorms && r.caseNorms.length ? `<div class="saq-case-norms"><b>${esc(L.caseNorms)}:</b> ${r.caseNorms.map((n) => `${artLink(n.article)} — <span data-saq-no-translate>${esc(n.title)}</span>`).join('; ')}</div>` : '';
    const stats = ['confirmed', 'partial', 'contradicts', 'unverified'].map((s) => `<div class="stat saq-stat saq-stat--${s}"><strong>${count(s)}</strong><small>${esc(L.status[s])}</small></div>`).join('');
    out.innerHTML = `<div class="saq-scan-head"><div><h3>${esc(L.report)}</h3><p class="saq-scan-mode${state.aiPending ? ' is-pending' : ''}">${esc(mode)}</p></div><span class="pill">${esc(L.checked(r.claims.length))}</span></div>`
      + (m ? `<p class="saq-scan-src" data-no-artlink>${L.source(m)}</p>` : '')
      + aiErr + langNote + (r.truncated ? `<p class="saq-scan-warn">${esc(L.truncated(r.maxClaims))}</p>` : '')
      + (r.claims.length ? `<div class="resultstats saq-scan-stats">${stats}</div>${compareHtml(r, aiById)}${caseNorms}${r.claims.map((c) => claimCard(c, aiById.get(c.id))).join('')}` : `<p>${esc(L.empty)}</p>${caseNorms}`);
    out.insertAdjacentHTML('beforeend', reportActionsHtml());
    linkArticles(out);
    out.classList.add('show');
    focusMark();
  }

  /* ---------------------------------------------------------------- run */
  async function runAi(caseText, answer, runId) {
    state.aiPending = true; state.ai = null; state.aiError = null;
    renderReport();
    try {
      const claims = window.SAQScanner.aiCandidates(state.report);
      const res = await fetch('api/ai-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ case: caseText, answer, lang: lang(), claims }) });
      const data = await res.json().catch(() => ({ error: 'server_error' }));
      if (runId !== state.runId) return;
      if (!res.ok || !data.results) state.aiError = data.error || 'server_error';
      else state.ai = data;
    } catch (_) {
      if (runId !== state.runId) return;
      state.aiError = 'network';
    }
    state.aiPending = false;
    renderReport();
  }
  async function run(opts) {
    const L = t();
    const fromHist = opts && opts.fromHistory ? opts.fromHistory : null;
    const caseText = $('#case').value.trim(); const answer = $('#ai').value.trim();
    const info = $('#scan-info'); const btn = $('#scan-btn');
    if (!caseText || !answer) { info.textContent = L.fill; return; }
    const runId = (state.runId || 0) + 1; state.runId = runId;
    btn.disabled = true;
    info.textContent = state.law ? L.running : L.loading;
    try {
      const law = await loadLaw();
      info.textContent = L.running;
      await new Promise((r) => setTimeout(r, 30));
      state.report = window.SAQScanner.analyze(law, caseText, answer);
      state.answer = answer; state.caseText = caseText; state.checkedAt = fromHist ? new Date(fromHist.at) : new Date(); state.sel = null; state.tab = null;
      state.ai = null; state.aiError = null; state.aiPending = false;
      renderReport();
      info.textContent = L.done(fmtDate(law.meta.edition_date));
      if (fromHist) {
        info.textContent = HI().opened + ' ' + info.textContent;
        const out = $('#scan-report');
        if (out) { out.setAttribute('tabindex', '-1'); try { out.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (_) { out.scrollIntoView(); } out.focus({ preventScroll: true }); }
      } else { histAdd(); renderHistory(); }
      if (aiOn() && state.report.claims.length) runAi(caseText, answer, runId);
    } catch (e) {
      info.textContent = L.loadFail;
    } finally {
      btn.disabled = false;
    }
  }
  function clear() {
    $('#case').value = ''; $('#ai').value = '';
    $('#scan-info').textContent = '';
    const out = $('#scan-report'); out.classList.remove('show'); out.innerHTML = '';
    state.report = null; state.ai = null; state.aiError = null; state.answer = ''; state.caseText = ''; state.checkedAt = null; state.sel = null; state.tab = null; state.runId = (state.runId || 0) + 1;
    $('#case').dispatchEvent(new Event('input')); $('#ai').dispatchEvent(new Event('input'));
  }
  function useExample(key) {
    const ex = EXAMPLES[key];
    $('#case').value = ex.case; $('#ai').value = ex.answer;
    $('#case').dispatchEvent(new Event('input')); $('#ai').dispatchEvent(new Event('input'));
    run();
  }

  function init() {
    if (!$('#scanner') || !window.SAQScanner) return;
    const report = $('#scan-report');
    report.setAttribute('data-saq-no-translate', '');
    report.addEventListener('click', (e) => {
      const rep = e.target.closest('[data-saq-report]');
      if (rep) { if (rep.dataset.saqReport === 'pdf') printReport(); else copyReport(); return; }
      const claim = e.target.closest('[data-claim]');
      if (claim) { state.sel = Number(claim.dataset.claim); state.tab = null; refreshCompare(true); return; }
      const tab = e.target.closest('[data-cmp-tab]');
      if (tab) { state.tab = Number(tab.dataset.cmpTab); refreshCompare(false); return; }
      const go = e.target.closest('[data-claim-goto]');
      if (go) {
        state.sel = Number(go.dataset.claimGoto); state.tab = null; refreshCompare(false);
        const box = $('#saq-cmp');
        if (box) { try { box.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (_) { box.scrollIntoView(); } }
      }
    });
    $('#scan-btn').onclick = () => run();
    $('#scan-clear').onclick = clear;
    document.querySelectorAll('[data-saq-example]').forEach((b) => b.addEventListener('click', () => useExample(b.dataset.saqExample)));
    document.querySelectorAll('[data-saq-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(() => { renderSource(); renderReport(); renderHistory(); }, 0)));
    initHistory();
    renderSource();
    loadStatus();
    const warm = () => { loadLaw().catch(() => {}); };
    if (location.hash === '#scanner') warm();
    window.addEventListener('hashchange', () => { if (location.hash === '#scanner') warm(); });
    ['focus', 'pointerenter'].forEach((ev) => { $('#case').addEventListener(ev, warm, { once: true }); $('#ai').addEventListener(ev, warm, { once: true }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
