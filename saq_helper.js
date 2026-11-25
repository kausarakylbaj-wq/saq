/* SAQ — «✦ Помощник SAQ» (v27).
 * Not AI: answers come from a fixed list of questions about the site. Works in the browser only — no API, no key,
 * nothing is sent anywhere. It does not solve cases or give legal advice.
 */
(function () {
  'use strict';
  const ADILET = 'https://adilet.zan.kz/rus/docs/K990000409_';
  const lang = () => (window.saqI18n && ['ru', 'kk', 'en'].includes(window.saqI18n.language)) ? window.saqI18n.language : 'ru';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------ interface */
  const UI = {
    ru: { launch: 'Помощник SAQ', sub: 'Отвечаю по базе вопросов о сайте · не ИИ', typing: 'Помощник печатает…', title: 'Помощник SAQ', close: 'Закрыть помощника', input: 'Ваш вопрос о сайте', placeholder: 'Спросите о сайте SAQ…', send: 'Отправить',
      chips: 'Частые вопросы', you: 'Вы', bot: 'Помощник',
      greet: 'Я отвечаю по готовой базе вопросов о сайте SAQ. Это не ИИ и не юридическая консультация. Выберите частый вопрос ниже или напишите свой.',
      thanks: 'Пожалуйста! Если появятся вопросы о сайте — пишите.', none: 'Не нашёл ответа на этот вопрос. Вот темы, по которым я могу помочь:', related: 'Похожие вопросы:',
      legal: 'Я не решаю кейсы и не даю юридических советов. Чтобы проверить ответ ИИ по вашему вопросу, вставьте его в «Правовой сканер», а выводы сверьте с официальным текстом ГК РК в «Әділет». В своей ситуации обратитесь к юристу.',
      go: { home: 'Открыть главную', check: 'Открыть экспресс-проверку', scanner: 'Открыть сканер', practice: 'Открыть Юрпрактику', lab: 'Открыть ИИ-лабораторию', atlas: 'Открыть Атлас ГК', about: 'Открыть «О проекте»', settings: 'Открыть настройки ⚙' },
      adilet: 'ГК РК в «Әділет» ↗', article: (n) => `Статья ${n} в «Әділет» ↗` },
    kk: { launch: 'SAQ көмекшісі', sub: 'Сайт туралы сұрақтар базасы бойынша жауап беремін · ЖИ емес', typing: 'Көмекші жазып жатыр…', title: 'SAQ көмекшісі', close: 'Көмекшіні жабу', input: 'Сайт туралы сұрағыңыз', placeholder: 'SAQ сайты туралы сұраңыз…', send: 'Жіберу',
      chips: 'Жиі қойылатын сұрақтар', you: 'Сіз', bot: 'Көмекші',
      greet: 'Мен SAQ сайты туралы дайын сұрақтар базасы бойынша жауап беремін. Бұл ЖИ емес және заң кеңесі емес. Төменнен жиі қойылатын сұрақты таңдаңыз немесе өз сұрағыңызды жазыңыз.',
      thanks: 'Оқасы жоқ! Сайт туралы сұрақтарыңыз болса, жазыңыз.', none: 'Бұл сұраққа жауап таппадым. Мына тақырыптар бойынша көмектесе аламын:', related: 'Ұқсас сұрақтар:',
      legal: 'Мен кейстерді шешпеймін және заң кеңесін бермеймін. ЖИ жауабын тексеру үшін оны «Құқықтық сканерге» қойыңыз, ал қорытындыларды «Әділет»-тегі ҚР АК ресми мәтінімен салыстырыңыз. Өз жағдайыңыз бойынша заңгерге жүгініңіз.',
      go: { home: 'Басты бетті ашу', check: 'Жедел тексеруді ашу', scanner: 'Сканерді ашу', practice: 'Құқықтық тәжірибені ашу', lab: 'ЖИ зертханасын ашу', atlas: 'АК атласын ашу', about: '«Жоба туралы» ашу', settings: 'Баптауларды ашу ⚙' },
      adilet: 'ҚР АК «Әділет»-те ↗', article: (n) => `${n}-бап «Әділет»-те ↗` },
    en: { launch: 'SAQ Helper', sub: 'Answers from a fixed list of questions about the site · not AI', typing: 'The helper is typing…', title: 'SAQ Helper', close: 'Close the helper', input: 'Your question about the site', placeholder: 'Ask about the SAQ website…', send: 'Send',
      chips: 'Common questions', you: 'You', bot: 'Helper',
      greet: 'I answer from a ready-made list of questions about the SAQ website. This is not AI and not legal advice. Pick a common question below or type your own.',
      thanks: 'You’re welcome! Ask me anything about the site.', none: 'I couldn’t find an answer to that. Here are the topics I can help with:', related: 'Related questions:',
      legal: 'I don’t solve cases or give legal advice. To check an AI answer on your question, paste it into the Legal Scanner and compare the conclusions with the official text of the Civil Code on Adilet. For your own situation, talk to a lawyer.',
      go: { home: 'Open Home', check: 'Open Quick Check', scanner: 'Open the scanner', practice: 'Open Legal Practice', lab: 'Open the AI Lab', atlas: 'Open the Code Atlas', about: 'Open About', settings: 'Open settings ⚙' },
      adilet: 'Civil Code on Adilet ↗', article: (n) => `Article ${n} on Adilet ↗` },
  };
  const U = () => UI[lang()];

  /* ------------------------------------------------- questions and answers
   * k: word stems (RU / KK / EN, any spelling) with weights; p: phrases. go: buttons; adilet: link to the Code.
   */
  const FAQ = [
    { id: 'scanner', go: ['scanner'],
      p: [['не работает', .6], ['не проверяет', .6], ['doesn t work', .6], ['not working', .6], ['истемеиди', .6]],
      k: [['сканер', .9], ['scanner', .9], ['scan', .8], ['пользова', .6], ['польза', .5], ['встав', .9], ['поле', .3], ['ответ', .3], ['answer', .3], ['нейросет', .2], ['пайдалан', .6], ['колдан', .6], ['кою', .6], ['use', .5], ['using', .5], ['paste', .9], ['правов', .3], ['кукык', .3], ['legal', .2]],
      ru: { q: 'Как пользоваться сканером?', a: 'Откройте «Правовой сканер». В поле 01 опишите учебный кейс, в поле 02 вставьте ответ ИИ и нажмите «Проверить». SAQ найдёт в ответе юридические утверждения и ссылки на статьи и сверит их с текстом ГК РК (Особенная часть). Для каждого утверждения вы увидите статус, норму из базы с дословной цитатой и ссылку на «Әділет». Начать можно с готового примера под кнопками.' },
      kk: { q: 'Сканерді қалай пайдаланамын?', a: '«Құқықтық сканерді» ашыңыз. 01-өріске оқу кейсін сипаттаңыз, 02-өріске ЖИ жауабын қойып, «Тексеру» батырмасын басыңыз. SAQ жауаптағы заңдық тұжырымдар мен баптарға сілтемелерді тауып, оларды ҚР АК (Ерекше бөлім) мәтінімен салыстырады. Әр тұжырым үшін мәртебе, базадағы норманың сөзбе-сөз дәйексөзі және «Әділет» сілтемесі көрсетіледі. Батырмалардың астындағы дайын мысалдан бастауға болады.' },
      en: { q: 'How do I use the scanner?', a: 'Open the Legal Scanner. Describe a study case in field 01, paste the AI answer into field 02 and press Verify. SAQ finds the legal claims and article references in the answer and compares them with the text of the Civil Code of Kazakhstan (Special Part). For each claim you see a status, the provision from the database with a verbatim quotation and a link to Adilet. You can start with a ready-made example under the buttons.' } },
    { id: 'statuses', go: ['scanner'],
      k: [['статус', 1.2], ['мартебе', 1.2], ['status', 1.2], ['значат', .6], ['значит', .6], ['означа', .6], ['подтвержд', .8], ['частичн', .8], ['соответств', .6], ['удалось', .6], ['растал', .8], ['ишинара', .8], ['сайкес', .5], ['билдир', .6], ['confirm', .8], ['partial', .8], ['contradict', .8], ['verify', .4], ['mean', .6], ['meaning', .6], ['four', .3], ['четыр', .3], ['торт', .3]],
      ru: { q: 'Что значат четыре статуса?', a: '«Подтверждено» — в норме есть выдержка, которая говорит то же самое. «Частично подтверждено» — совпадает только часть утверждения. «Не соответствует норме» — норма говорит другое (другой срок, сторона, обязанность) или указана не та статья. «Не удалось подтвердить» — статьи нет в базе (несуществующая, из Общей части или из другого закона) или ничего похожего не нашлось. Статус — подсказка программы, а не вывод юриста.' },
      kk: { q: 'Төрт мәртебе нені білдіреді?', a: '«Расталды» — нормада дәл осыны айтатын үзінді бар. «Ішінара расталды» — тұжырымның бір бөлігі ғана сәйкес келеді. «Нормаға сәйкес емес» — норма басқаны айтады (басқа мерзім, тарап, міндет) немесе бап қате көрсетілген. «Растау мүмкін болмады» — бап базада жоқ (ойдан шығарылған, Жалпы бөлімнен немесе басқа заңнан) не ұқсас ештеңе табылмады. Мәртебе — бағдарламаның кеңесі, заңгердің қорытындысы емес.' },
      en: { q: 'What do the four statuses mean?', a: 'Confirmed — the provision contains an excerpt that says the same thing. Partially confirmed — only part of the claim matches. Contradicts the provision — the provision says something else (another time limit, party or duty) or the wrong article is cited. Could not verify — the article is not in the database (made up, from the General Part or from another law) or nothing similar was found. The status is a hint from the program, not a lawyer’s conclusion.' } },
    { id: 'special', adilet: true, go: ['about'],
      k: [['особенн', 1.2], ['ерекше', 1.2], ['special', 1.2], ['только', .6], ['тек', .5], ['only', .6], ['406', 1], ['1124', 1], ['общ', .6], ['жалпы', .6], ['general', .6], ['загруж', .5], ['жуктел', .5], ['loaded', .5], ['почему', .3], ['неге', .3], ['why', .3], ['част', .4], ['болим', .4], ['part', .4]],
      ru: { q: 'Почему только Особенная часть ГК РК (ст. 406–1124)?', a: 'В SAQ загружен только Гражданский кодекс РК, Особенная часть: статьи 406–1124 (744 статьи) в редакции на 21.10.2026. Это учебный проект о договорах и обязательствах, а сверять можно только с тем текстом, который реально загружен. Ссылки на Общую часть (статьи 1–405) и на другие законы сканер честно помечает: подтвердить их он не может.' },
      kk: { q: 'Неге тек ҚР АК Ерекше бөлімі (406–1124-баптар)?', a: 'SAQ-қа тек Қазақстан Республикасы Азаматтық кодексінің Ерекше бөлімі жүктелген: 406–1124-баптар (744 бап), 21.10.2026 жағдайы бойынша редакция. Бұл шарттар мен міндеттемелер туралы оқу жобасы, ал салыстыруды тек нақты жүктелген мәтінмен жүргізуге болады. Жалпы бөлімге (1–405-баптар) және басқа заңдарға сілтемелерді сканер ашық белгілейді: оларды растай алмайды.' },
      en: { q: 'Why only the Special Part (Art. 406–1124)?', a: 'SAQ contains only the Civil Code of the Republic of Kazakhstan, Special Part: Articles 406–1124 (744 articles), as amended on 21.10.2026. It is a study project about contracts and obligations, and a comparison can only be made with the text that is actually loaded. References to the General Part (Articles 1–405) and to other laws are clearly marked by the scanner: it cannot confirm them.' } },
    { id: 'adilet', adilet: true,
      k: [['адилет', 1.3], ['adilet', 1.3], ['официальн', 1], ['ресми', 1], ['official', 1], ['первоисточник', 1], ['источник', .7], ['дерекко', .7], ['source', .7], ['текст', .4], ['матин', .4], ['text', .4], ['где', .2], ['каида', .2], ['where', .2], ['найти', .4], ['табу', .3], ['find', .3]],
      ru: { q: 'Где официальный текст?', a: 'Официальный текст — в ИПС «Әділет»: Гражданский кодекс Республики Казахстан (Особенная часть) от 1 июля 1999 года № 409-I. В сканере у каждой статьи есть ссылка «↗», которая открывает её в «Әділет» в действующей редакции. Перед выводами всегда сверяйтесь с ним.' },
      kk: { q: 'Ресми мәтін қайда?', a: 'Ресми мәтін — «Әділет» АҚЖ-да: Қазақстан Республикасының Азаматтық кодексі (Ерекше бөлім), 1999 жылғы 1 шілдедегі № 409-I. Сканерде әр баптың «↗» сілтемесі бар, ол бапты «Әділет»-те қолданыстағы редакцияда ашады. Қорытынды жасамас бұрын әрдайым соны тексеріңіз.' },
      en: { q: 'Where is the official text?', a: 'The official text is on Adilet, the legal information system: Civil Code of the Republic of Kazakhstan (Special Part) of 1 July 1999 No. 409-I. In the scanner every article has a “↗” link that opens it on Adilet in the current edition. Always check it before drawing conclusions.' } },
    { id: 'express', go: ['check'],
      k: [['экспресс', 1.3], ['express', 1.3], ['жедел', 1.3], ['quick', 1.1], ['чеклист', 1], ['чек', .6], ['checklist', 1], ['критери', .8], ['criteria', .8], ['семь', .5], ['жети', .5], ['seven', .5], ['самооцен', .8], ['self', .6]],
      ru: { q: 'Что такое экспресс-проверка?', a: '«Экспресс-проверка» — чек-лист из семи вопросов к ответу ИИ: указан ли акт, существует ли он, верна ли статья, совпадает ли содержание, актуальна ли редакция, верны ли толкование и применение к кейсу. Вы отмечаете «Да», «Частично» или «Нет» по результатам своей проверки, а SAQ показывает итог и что перепроверить. Это самооценка, а не экспертиза.' },
      kk: { q: 'Жедел тексеру деген не?', a: '«Жедел тексеру» — ЖИ жауабына қойылатын жеті сұрақтан тұратын тексеру парағы: акт көрсетілген бе, ол бар ма, бап дұрыс па, мазмұны сәйкес пе, редакция өзекті ме, түсіндіру мен кейске қолдану дұрыс па. Өз тексеруіңіздің нәтижесі бойынша «Иә», «Ішінара» немесе «Жоқ» деп белгілейсіз, ал SAQ қорытындыны және нені қайта тексеру керегін көрсетеді. Бұл сараптама емес, өзін-өзі бағалау.' },
      en: { q: 'What is the Quick Check?', a: 'The Quick Check is a checklist of seven questions about an AI answer: is a legal act named, does it exist, is the article right, does the content match, is the edition current, are the interpretation and the application to the case correct. You mark Yes, Partly or No based on your own check, and SAQ shows the result and what to re-check. It is a self-assessment, not an expert review.' } },
    { id: 'practice', go: ['practice'],
      k: [['юрпрактик', 1.3], ['практик', 1], ['practice', 1.2], ['тажириб', 1.2], ['упражнен', 1], ['exercise', 1], ['жаттыгу', 1], ['учебн', .4], ['study', .3], ['оку', .3], ['задани', .6], ['тапсырма', .6], ['task', .5], ['разбор', .5], ['кейсы', .4], ['cases', .4]],
      ru: { q: 'Как работает Юрпрактика?', a: 'В «Юрпрактике» — учебные кейсы с ошибочными ответами ИИ. Выберите кейс, определите тип ошибки, найдите статью из базы, объясните, что нужно проверить, и предложите решение. После отправки откроется разбор с дословным текстом нормы. Автоматически оцениваются только тип ошибки и выбранная статья.' },
      kk: { q: 'Құқықтық тәжірибе қалай жұмыс істейді?', a: '«Құқықтық тәжірибеде» ЖИ-дің қате жауаптары бар оқу кейстері берілген. Кейсті таңдап, қате түрін анықтаңыз, базадан бапты табыңыз, нені тексеру керегін түсіндіріп, шешім ұсыныңыз. Жібергеннен кейін норманың сөзбе-сөз мәтіні бар талдау ашылады. Автоматты түрде тек қате түрі мен таңдалған бап бағаланады.' },
      en: { q: 'How does Legal Practice work?', a: 'Legal Practice has study cases with wrong AI answers. Pick a case, identify the type of error, find the article in the database, explain what needs checking and propose a solution. After you submit, a review opens with the verbatim text of the provision. Only the error type and the chosen article are scored automatically.' } },
    { id: 'lab', go: ['lab', 'atlas'],
      k: [['лаборатор', 1.4], ['laborat', 1.2], ['зертхан', 1.4], ['промпт', 1.4], ['prompt', 1.4], ['спросит', .9], ['сурау', .9], ['ask', .5], ['сравнит', 1.1], ['сравнен', .7], ['compare', 1.1], ['comparison', .7], ['салыстыр', 1.1], ['chatgpt', 1], ['gemini', 1], ['нейросет', .8], ['разных', .5], ['different', .5], ['әртүрлі', .5], ['арттурли', .5], ['атлас', 1.5], ['atlas', 1.5], ['созвезд', 1.4], ['constellat', 1.4], ['шокжулдыз', 1.4], ['шкал', 1.1], ['scale', .7], ['угада', 1.2], ['guess', 1.1], ['срок', .7], ['deadline', .7], ['мерзим', .7], ['связ', .6], ['силтеме', .5], ['links', .5], ['поиск', .5], ['search', .5], ['издеу', .5], ['карт', .6], ['map', .5]],
      p: [['ai lab', 1.2], ['разных ии', 1], ['how to ask', .8], ['как спросить', .9], ['шкала сроков', 1.4], ['угадай срок', 1.5], ['созвездие ссылок', 1.5], ['поиск по кодексу', 1.2], ['search the code', 1.1], ['карта гк', 1], ['карта статей', 1.2], ['найти в кодексе', 1.1], ['найти слово', 1], ['term scale', 1.2], ['guess the term', 1.4], ['мерзимди тап', 1.4]],
      ru: { q: 'Что такое ИИ-лаборатория и Атлас ГК?', a: 'Это два учебных инструмента. В «ИИ-лаборатории» раздел «Как спросить ИИ» собирает промпт: опираться только на ГК РК, указывать статью и пункт, цитировать норму и честно писать «не уверен»; ответ ChatGPT, Gemini или Claude затем проверяется в сканере. «Сравнение ИИ» сверяет два-три ответа на один кейс с загруженным ГК РК — это сравнение по совпадению с кодексом, а не оценка ИИ в целом. В «Атласе ГК» — шкала сроков, игра «Угадай срок» и созвездие ссылок между статьями; сроки и ссылки найдены автоматически, сверяйте их с «Әділет». А на карте статей в сканере есть поиск по тексту кодекса — по слову или номеру статьи.' },
      kk: { q: 'ЖИ зертханасы және АК атласы деген не?', a: 'Бұл — екі оқу құралы. «ЖИ зертханасындағы» «ЖИ-ден қалай сұрау керек» бөлімі промпт құрастырады: тек ҚР АК-ге сүйену, бап пен тармақты көрсету, норманы келтіру және «сенімді емеспін» деп адал жазу; ChatGPT, Gemini немесе Claude жауабы содан кейін сканерде тексеріледі. «ЖИ жауаптарын салыстыру» бір кейске берілген екі-үш жауапты жүктелген ҚР АК-мен салыстырады — бұл кодекспен сәйкестік бойынша салыстыру, ЖИ-дің жалпы бағасы емес. «АК атласында» — мерзімдер шкаласы, «Мерзімді тап» ойыны және баптар арасындағы сілтемелер шоқжұлдызы; мерзімдер мен сілтемелер автоматты түрде табылған, оларды «Әділет»-пен салыстырыңыз. Ал сканердегі баптар картасында кодекс мәтіні бойынша іздеу бар — сөз немесе бап нөмірі бойынша.' },
      en: { q: 'What are the AI Lab and the Code Atlas?', a: 'They are two learning tools. In the AI Lab, “How to ask an AI” builds a prompt: rely only on the Civil Code, give the article and clause, quote the norm and say “not sure” honestly; the answer of ChatGPT, Gemini or Claude is then checked in the scanner. “Compare AI answers” checks two or three answers to one case against the loaded Civil Code — it compares agreement with the Code, it is not an overall rating of the AI. The Code Atlas has a scale of terms, the «Guess the term» game and a constellation of links between articles; terms and links were found automatically, so check them on Adilet. The map of articles in the scanner also has a search of the text of the Code — by a word or an article number.' } },
    { id: 'trust', adilet: true, go: ['scanner'],
      k: [['довер', 1.2], ['trust', 1.2], ['сену', 1.2], ['сенуг', 1.2], ['верит', 1], ['надежн', 1], ['reliab', 1], ['rely', 1], ['точн', 1], ['accura', 1], ['ошиба', 1], ['ошибк', .6], ['кателес', 1], ['mistake', 1], ['wrong', .6], ['полност', .6], ['толык', .5], ['fully', .5], ['гарант', .8], ['guarant', .8], ['результат', .5], ['натиже', .5], ['result', .5]],
      p: [['make mistakes', .6], ['может ошибаться', .6]],
      ru: { q: 'Можно ли полностью доверять результату?', a: 'Нет. SAQ — учебный инструмент: он сопоставляет текст ответа с текстом кодекса по программе и может ошибаться — например, не понять перефразированную мысль. База обновляется вручную, а законы меняются. Используйте результат как подсказку, что перепроверить, и всегда сверяйтесь с официальным текстом в «Әділет». Информация носит справочный характер и не заменяет консультацию юриста.' },
      kk: { q: 'Нәтижеге толық сенуге бола ма?', a: 'Жоқ. SAQ — оқу құралы: ол жауап мәтінін кодекс мәтінімен бағдарлама арқылы салыстырады және қателесуі мүмкін, мысалы, басқаша айтылған ойды түсінбеуі мүмкін. База қолмен жаңартылады, ал заңдар өзгереді. Нәтижені нені қайта тексеру керегі туралы кеңес ретінде пайдаланыңыз және әрдайым «Әділет»-тегі ресми мәтінмен салыстырыңыз. Ақпарат анықтамалық сипатта және заңгердің кеңесін алмастырмайды.' },
      en: { q: 'Can I fully trust the result?', a: 'No. SAQ is a study tool: it compares the answer with the Code by a program and can make mistakes — for example, it may miss a paraphrased idea. The database is updated by hand, and laws change. Use the result as a hint about what to re-check, and always compare with the official text on Adilet. This information is for reference only and does not replace a consultation with a lawyer.' } },
    { id: 'data', go: ['scanner'], settings: true,
      k: [['истори', 1], ['history', 1], ['тарих', 1], ['данн', 1.1], ['деректер', 1.1], ['data', 1.1], ['хран', 1], ['сакта', 1], ['stored', 1], ['store', 1], ['storage', 1], ['сохран', .7], ['приватн', 1], ['privacy', 1], ['конфиденц', 1], ['отправля', .8], ['отправит', .6], ['жибер', .6], ['sent', .8], ['send', .5], ['сервер', .7], ['server', .7], ['браузер', .6], ['browser', .6], ['личн', .6], ['personal', .6]],
      ru: { q: 'Где хранятся мои данные?', a: 'Проверка по базе идёт прямо в вашем браузере: кейс и ответ ИИ не отправляются на сервер. Если в настройках ⚙ включено «Сохранять историю проверок», последние 10 проверок хранятся только в этом браузере — их можно удалить по одной или кнопкой «Очистить историю», а запись выключить. Ещё браузер запоминает настройки: язык, тему, цветовую схему и доступность. Этот помощник тоже работает без интернета и ничего не отправляет.' },
      kk: { q: 'Деректерім қайда сақталады?', a: 'Базамен тексеру тікелей браузеріңізде жүреді: кейс пен ЖИ жауабы серверге жіберілмейді. ⚙ баптауларында «Тексерулер тарихын сақтау» қосулы болса, соңғы 10 тексеру тек осы браузерде сақталады — оларды бір-бірлеп немесе «Тарихты тазалау» батырмасымен жоюға, ал жазуды өшіруге болады. Браузер баптауларды да есте сақтайды: тіл, тақырып, түс үйлесімі және қолжетімділік. Бұл көмекші де интернетсіз жұмыс істейді және ештеңе жібермейді.' },
      en: { q: 'Where is my data stored?', a: 'The database check runs right in your browser: the case and the AI answer are not sent to a server. If “Save check history” is on in the ⚙ settings, your last 10 checks are kept only in this browser — you can delete them one by one or with “Clear history”, and turn saving off. The browser also remembers your settings: language, theme, colour palette and accessibility. This helper also works offline and sends nothing.' } },
    { id: 'look', settings: true,
      k: [['язык', 1.2], ['тил', 1.2], ['language', 1.2], ['тема', 1], ['темн', .9], ['theme', 1.1], ['dark', .8], ['светл', .8], ['light', .7], ['каранги', .8], ['ашык', .5], ['такырып', .9], ['цвет', .8], ['тус', .6], ['color', .8], ['colour', .8], ['схем', .7], ['палитр', .7], ['palette', .7], ['смени', .4], ['поменя', .4], ['переключ', .4], ['ауыстыр', .5], ['change', .4], ['switch', .4], ['казах', .8], ['английск', .8], ['перевест', .6], ['перевод', .6], ['translat', .6], ['аудар', .6], ['english', .8], ['kazakh', .8], ['русск', .6], ['орыс', .6], ['russian', .6]],
      ru: { q: 'Как сменить язык и тему?', a: 'Язык — кнопки RU / ҚАЗ / EN в шапке сайта. Тема (светлая или тёмная) и цветовая схема — в настройках ⚙ справа вверху. Выбор запоминается в этом браузере.' },
      kk: { q: 'Тіл мен тақырыпты қалай ауыстырамын?', a: 'Тіл — сайттың жоғарғы жағындағы RU / ҚАЗ / EN батырмалары. Тақырып (ашық не қараңғы) және түс үйлесімі — оң жақ жоғарғы бұрыштағы ⚙ баптауларында. Таңдауыңыз осы браузерде сақталады.' },
      en: { q: 'How do I change language and theme?', a: 'Language — the RU / ҚАЗ / EN buttons at the top of the site. Theme (light or dark) and colour palette — in the ⚙ settings at the top right. Your choice is remembered in this browser.' } },
    { id: 'report', go: ['scanner'],
      k: [['отчет', 1.3], ['есеп', 1.3], ['report', 1.3], ['pdf', 1.2], ['пдф', 1.2], ['скача', 1], ['скачив', 1], ['жукте', .9], ['download', 1], ['печат', .8], ['распечат', .9], ['print', .8], ['копир', .8], ['коширу', .8], ['copy', .8], ['сохрани', .5], ['save', .5], ['результат', .3], ['result', .3], ['проверк', .2]],
      ru: { q: 'Как скачать отчёт?', a: 'Сначала проверьте ответ в «Правовом сканере». Под результатом появятся кнопки «Скачать отчёт (PDF)» — откроется окно печати, выберите «Сохранить как PDF» — и «Копировать отчёт», чтобы вставить текст в документ. В отчёте кейс, ответ ИИ, статусы, нормы с цитатами, ссылки на «Әділет», источник и оговорка.' },
      kk: { q: 'Есепті қалай жүктеймін?', a: 'Алдымен жауапты «Құқықтық сканерде» тексеріңіз. Нәтиженің астында «Есепті жүктеу (PDF)» батырмасы пайда болады — басып шығару терезесі ашылады, «PDF ретінде сақтау» таңдаңыз — және мәтінді құжатқа қою үшін «Есепті көшіру» батырмасы. Есепте кейс, ЖИ жауабы, мәртебелер, дәйексөздері бар нормалар, «Әділет» сілтемелері, дереккөз және ескертпе бар.' },
      en: { q: 'How do I download the report?', a: 'First check the answer in the Legal Scanner. Under the result you will see “Download report (PDF)” — a print window opens, choose “Save as PDF” — and “Copy report” to paste the text into a document. The report contains the case, the AI answer, statuses, provisions with quotations, Adilet links, the source and the disclaimer.' } },
    { id: 'halluc', go: ['scanner', 'check'],
      k: [['галлюц', 1.3], ['hallucin', 1.3], ['галлюцинац', 1.3], ['выдум', 1.1], ['придум', 1.05], ['ойдан', 1], ['invent', 1], ['made', .4], ['fake', .8], ['врет', .8], ['обманыв', .6], ['lie', .6], ['lies', .6], ['несуществ', .6], ['nonexist', .6]],
      ru: { q: 'Что такое «галлюцинации» ИИ?', a: '«Галлюцинации» — когда ИИ уверенно пишет то, чего нет: выдумывает статьи и пункты, путает их номера, приписывает норме чужое содержание или ссылается на закон другой страны. Текст при этом звучит убедительно. Поэтому каждую ссылку нужно сверять с первоисточником — именно этому и учит SAQ.' },
      kk: { q: 'ЖИ «галлюцинациясы» деген не?', a: '«Галлюцинация» — ЖИ жоқ нәрсені сенімді түрде жазуы: баптар мен тармақтарды ойдан шығарады, нөмірлерін шатастырады, нормаға басқа мазмұн таңады немесе басқа елдің заңына сілтеме жасайды. Мәтін сенімді естіледі. Сондықтан әр сілтемені бастапқы дереккөзбен салыстыру керек — SAQ дәл осыған үйретеді.' },
      en: { q: 'What are AI “hallucinations”?', a: 'A “hallucination” is when AI confidently writes something that is not true: it invents articles and clauses, mixes up their numbers, attributes the wrong content to a provision or cites a law of another country. The text still sounds convincing. That is why every reference has to be checked against the primary source — exactly what SAQ teaches.' } },
    { id: 'missing', adilet: true,
      k: [['помечен', 1], ['помечает', 1], ['отмечен', .8], ['пишет', .3], ['marked', 1], ['label', .6], ['белгилен', 1], ['missing', 1], ['отсутств', .9], ['несуществ', .9], ['nonexist', .9], ['нет', .5], ['жок', .5], ['гк', .4], ['ак', .3], ['code', .3]],
      p: [['нет в гк', 1.2], ['нет в гк рк', 1.4], ['not in the civil code', 1.5], ['not in civil code', 1.4], ['ак де жок', 1.4], ['акде жок', 1.4], ['ерекше болим жок', 1]],
      ru: { q: 'Почему статья помечена «нет в ГК РК (Особенная часть)»?', a: 'Так помечается статья, которой нет в загруженном тексте ГК РК (Особенная часть, статьи 406–1124). Причины: статьи не существует (ИИ её выдумал), она из Общей части (статьи 1–405) или ответ ссылается на другой закон, например на ГК РФ. Проверьте номер и акт в «Әділет».' },
      kk: { q: 'Неге бап «ҚР АК-де (Ерекше бөлім) жоқ» деп белгіленген?', a: 'Бұлай ҚР АК-нің жүктелген мәтінінде (Ерекше бөлім, 406–1124-баптар) жоқ бап белгіленеді. Себептері: мұндай бап жоқ (ЖИ ойдан шығарған), ол Жалпы бөлімнен (1–405-баптар) немесе жауап басқа заңға, мысалы, РФ АК-ге сілтеме жасайды. Нөмір мен актіні «Әділет»-тен тексеріңіз.' },
      en: { q: 'Why is an article marked “not in the Civil Code (Special Part)”?', a: 'That is how SAQ marks an article that is not in the loaded text of the Civil Code (Special Part, Articles 406–1124). The reasons: the article does not exist (AI made it up), it is from the General Part (Articles 1–405), or the answer refers to another law, for example the Civil Code of Russia. Check the number and the act on Adilet.' } },
    { id: 'a11y', settings: true,
      k: [['доступн', 1.2], ['колжетим', 1.2], ['accessib', 1.2], ['крупн', 1], ['ири', .8], ['large', 1], ['bigger', .8], ['шрифт', 1], ['font', 1], ['контраст', 1], ['contrast', 1], ['анимац', 1], ['animation', 1], ['интервал', .9], ['аралык', .9], ['spacing', .9], ['подчерк', .9], ['underline', .9], ['зрени', .8], ['слабовид', 1], ['vision', .8], ['диктор', .8], ['screen', .5], ['reader', .5]],
      ru: { q: 'Где настройки доступности?', a: 'В настройках ⚙ есть раздел «Доступность»: крупный текст, высокий контраст, отключение анимаций, увеличенные интервалы и подчёркнутые ссылки. Настройки действуют на всех страницах и сохраняются в браузере; кнопка «Сбросить настройки доступности» вернёт всё как было.' },
      kk: { q: 'Қолжетімділік баптаулары қайда?', a: '⚙ баптауларында «Қолжетімділік» бөлімі бар: ірі мәтін, жоғары контраст, анимацияны өшіру, кең аралықтар және сілтемелердің астын сызу. Баптаулар барлық беттерде әрекет етеді және браузерде сақталады; «Қолжетімділік баптауларын қалпына келтіру» батырмасы бәрін бастапқы күйге қайтарады.' },
      en: { q: 'Where are the accessibility settings?', a: 'The ⚙ settings have an Accessibility section: large text, high contrast, turn off animations, wider spacing and underlined links. The settings work on every page and are saved in the browser; “Reset accessibility settings” brings everything back.' } },
    { id: 'about', go: ['about'],
      k: [['проект', 1], ['жоба', 1], ['project', 1], ['кого', .6], ['кому', .6], ['who', .5], ['студент', .8], ['student', .8], ['legaltech', 1], ['цель', .7], ['максат', .7], ['purpose', .7], ['инструмент', .4], ['tool', .4], ['сайт', .2], ['site', .2], ['website', .2], ['автор', .9], ['author', .9], ['создал', .7], ['сделал', .6], ['зачем', .5]],
      p: [['что такое saq', 1.4], ['saq деген', 1.4], ['what is saq', 1.4], ['для кого', 1], ['кимге арнал', 1], ['who is it for', 1], ['кто сделал', 1], ['кто создал', 1], ['who made', 1], ['who created', 1], ['ким жасаган', 1]],
      ru: { q: 'Что такое SAQ и для кого он?', a: 'SAQ — учебная LegalTech-платформа для студентов-юристов: учит проверять ответы ИИ по гражданскому праву Казахстана по первоисточнику. Три инструмента: «Экспресс-проверка», «Правовой сканер» и «Юрпрактика». Это учебный проект, он не заменяет консультацию юриста.' },
      kk: { q: 'SAQ деген не және ол кімге арналған?', a: 'SAQ — заңгер студенттерге арналған оқу LegalTech-платформасы: Қазақстанның азаматтық құқығы бойынша ЖИ жауаптарын бастапқы дереккөз арқылы тексеруге үйретеді. Үш құрал бар: «Жедел тексеру», «Құқықтық сканер» және «Құқықтық тәжірибе». Бұл оқу жобасы, заңгердің кеңесін алмастырмайды.' },
      en: { q: 'What is SAQ and who is it for?', a: 'SAQ is a study LegalTech platform for law students: it teaches how to check AI answers on Kazakh civil law against the primary source. It has three tools: Quick Check, Legal Scanner and Legal Practice. It is a study project and does not replace a lawyer’s advice.' } },
  ];
  const HINTS = ['scanner', 'statuses', 'report', 'trust', 'halluc'];
  const byId = new Map(FAQ.map((f) => [f.id, f]));

  /* --------------------------------------------------------------- search */
  const FOLD = { 'ә': 'а', 'ғ': 'г', 'қ': 'к', 'ң': 'н', 'ө': 'о', 'ұ': 'у', 'ү': 'у', 'һ': 'х', 'і': 'и', 'ё': 'е', 'й': 'и' };
  const norm = (s) => String(s || '').toLowerCase().replace(/[әғқңөұүһіёй]/g, (c) => FOLD[c]).replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const STOP = new Set(('как что где это ли а и в во на по с со для мне меня я ты вы можно есть такое такой мой мои моя мое ваш о об у к от до из за же бы да ' +
    'калаи не каида ма ме ба бе па пе бул мен сен деген кандаи кашан ушин жане менин онын ' +
    'how what where is are the a an do does i my me can to of in on for it this that and or with about be you your').split(' '));
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function tokenScore(t, stem, known) {
    if (t === stem) return 1;
    if (stem.length >= 3 && t.startsWith(stem)) return 0.95;
    if (t.length >= 4 && stem.startsWith(t)) return 0.7;
    if (known) return 0; // a real word of another topic is not a typo (ответ ≠ отчёт)
    const max = stem.length >= 7 ? 2 : stem.length >= 4 ? 1 : 0;
    if (!max || t.length < 4) return 0;
    for (let n = stem.length - 1; n <= stem.length + 1; n++) if (n > 2 && lev(t.slice(0, n), stem, max) <= max) return 0.75;
    return 0;
  }
  const STEMS = FAQ.map((f) => ({ f, k: f.k.map(([s, w]) => [norm(s), w]), p: (f.p || []).map(([s, w]) => [norm(s), w]) }));
  const ALL_STEMS = [...new Set(STEMS.flatMap((x) => x.k.map(([s]) => s)))];
  const isKnown = (t) => ALL_STEMS.some((s) => t === s || (s.length >= 3 && t.startsWith(s)));
  // «статья 300» — General Part, «статья 1250» — not in the Code at all
  const ART_WORD = /(стат|ст |бап|article|art )/;
  function articleBoost(q) {
    const out = {}; if (!ART_WORD.test(q + ' ')) return out;
    for (const m of q.match(/\b\d{1,4}\b/g) || []) { const v = Number(m); if (v >= 1 && v <= 405) out.special = 1.2; if (v > 1124 && v < 3000) out.missing = 1.2; }
    return out;
  }
  function rank(query) {
    const q = norm(query); const tokens = q.split(' ').filter((t) => t.length >= 2 && !STOP.has(t));
    const boost = articleBoost(q);
    return STEMS.map(({ f, k, p }) => {
      let score = boost[f.id] || 0;
      for (const t of tokens) { const known = isKnown(t); let best = 0; for (const [s, w] of k) { const v = tokenScore(t, s, known) * w; if (v > best) best = v; } score += best; }
      for (const [s, w] of p) if ((' ' + q + ' ').includes(' ' + s + ' ')) score += w;
      return { id: f.id, score };
    }).sort((a, b) => b.score - a.score);
  }
  // Questions about a person's own case or legal advice: the helper does not answer them.
  const LEGAL = [
    /(имею|имеет|имеем|имеют) ли (я |мы |он |она )?прав/, /могу ли (я|мы) (потреб|верну|вернут|расторг|подат|взыск|отказ|получ|не плат|не верну)/,
    /что (мне|нам) делать/, /как (мне|нам) (быть|поступить)/, /(должен|обязан|должна|обязана) ли (я|продав|покупат|арендод|арендат|работод|заемщик|займодав)/,
    /законно ли/, /(^| )в суд( |$)/, /(^| )исков/, /(^| )иск( |$)/, /(^| )мо(и|е|я|его) (случа|ситуац|договор|арендод|работод|продав|сосед|дело)/,
    /меня (обманул|уволил|кинул|не пуска)/, /верн(уть|ут|ет) (мне )?деньг/, /реши(ть|те)? (мои|мою|мой|этот|задач|кейс|дело)/, /помогите (решить|с делом|разобраться с договор)/,
    /(какую|какая) статья (подходит|применяется|применить)/, /кто прав( |$)/,
    /кукыгым (бар|жок)/, /не истеуим керек/, /сотка (беру|жугин|бере)/, /менин (жагдаиым|шартым|исим)/, /акшамды (каитар|алу)/, /кеиси(ми)?ди шеш/,
    /\bcan (i|we) (sue|get|return|claim|cancel|refuse|stop paying)/, /\bam i entitled/, /\bwhat should (i|we) do/, /\bis it legal/, /\bsue\b/, /\blawsuit/,
    /\bmy (landlord|employer|seller|buyer|contract|case|situation|tenant|lender)/, /\bsolve (my|this|the) (case|problem)/, /\bwho is right/,
  ];
  const LEGAL_SOFT = [/что делать/, /что делать если/, /(^| )кто (платит|виноват|отвечает|должен)/, /(^| )мне (продали|не вернули|не платят|не отдают|отказали)/, /бракован/, /компенсац/, /неустойк/, /возмещ/, /(^| )штраф/,
    /не истеу керек/, /ким толеиди/, /\bwhat to do\b/, /\bwho (pays|is liable|should pay)/, /\bcompensation/, /\brefund/, /\bdamages\b/];
  const HELLO = /^(привет|здравствуи(те)?|добрыи (день|вечер)|салем|салеметсиз бе|сәлем|hello|hi|hey)( |$)/;
  const THANKS = /^(спасибо|благодарю|рахмет|thanks|thank you)( |$)/;
  function articleIn(query) {
    const m = String(query).match(/(?:^|[^\d])(\d{3,4})(?:-\d{1,2})?(?!\d)/g) || [];
    for (const x of m) { const n = x.replace(/^\D/, '').split('-')[0]; const v = Number(n); if (v >= 406 && v <= 1124) return n; }
    return null;
  }
  function answer(query) {
    const ranked = rank(query); const top = ranked[0];
    const q = norm(query);
    if (HELLO.test(q) && top.score < 0.9) return { kind: 'greet' };
    if (THANKS.test(q) && top.score < 0.9) return { kind: 'thanks' };
    const legal = LEGAL.some((re) => re.test(q)) || (top.score < 0.9 && LEGAL_SOFT.some((re) => re.test(q)));
    const art = articleIn(query);
    if (top.score >= 1.8 && !legal) return { kind: 'faq', id: top.id, related: ranked.slice(1, 3).filter((r) => r.score >= 0.9 && r.score >= top.score * 0.6).map((r) => r.id) };
    if (legal || (art && top.score < 0.9)) return { kind: 'legal', article: art };
    if (top.score >= 0.9) return { kind: 'faq', id: top.id, related: ranked.slice(1, 3).filter((r) => r.score >= 0.9 && r.score >= top.score * 0.6).map((r) => r.id) };
    return { kind: 'none' };
  }

  /* --------------------------------------------------------------- render */
  const state = { open: false, messages: [], built: false };
  let launch, panel, log, chips, form, input, title, closeBtn;
  const adiletArticle = (n) => { const A = window.SAQ_ADILET; return A && A.anchors && A.anchors[String(n)] ? (A.url || ADILET) + '#' + A.anchors[String(n)] : null; };
  const goBtn = (to) => `<button type="button" class="saq-helper-go" data-go="${to}">${esc(U().go[to])}</button>`;
  const link = (url, text) => `<a class="saq-helper-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
  const chip = (id) => `<button type="button" class="saq-helper-chip" data-ask="${id}">${esc(byId.get(id)[lang()].q)}</button>`;
  function botHtml(m) {
    const L = U();
    if (m.kind === 'greet') return `<p>${esc(L.greet)}</p>`;
    if (m.kind === 'thanks') return `<p>${esc(L.thanks)}</p>`;
    if (m.kind === 'none') return `<p>${esc(L.none)}</p><div class="saq-helper-related">${FAQ.map((f) => chip(f.id)).join('')}</div>`;
    if (m.kind === 'legal') {
      const url = m.article && adiletArticle(m.article);
      return `<p>${esc(L.legal)}</p><div class="saq-helper-actions">${goBtn('scanner')}${url ? link(url, L.article(m.article)) : ''}${link(ADILET, L.adilet)}</div>`;
    }
    const f = byId.get(m.id); const acts = (f.go || []).map(goBtn);
    if (f.settings) acts.push(goBtn('settings'));
    if (f.adilet) acts.push(link(ADILET, L.adilet));
    return `<p>${esc(f[lang()].a)}</p>${acts.length ? `<div class="saq-helper-actions">${acts.join('')}</div>` : ''}`
      + (m.related && m.related.length ? `<div class="saq-helper-related"><span>${esc(L.related)}</span>${m.related.map(chip).join('')}</div>` : '');
  }
  function msgHtml(m) {
    const L = U();
    return m.from === 'user'
      ? `<div class="saq-helper-msg is-user"><span class="saq-helper-who">${esc(L.you)}</span><p>${esc(m.text)}</p></div>`
      : `<div class="saq-helper-msg is-bot"><span class="saq-helper-who">${esc(L.bot)}</span>${botHtml(m)}</div>`;
  }
  const reduced = () => { try { return window.SAQA11y ? window.SAQA11y.reducedMotion() : matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  function scrollLog() { log.scrollTo({ top: log.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' }); }
  function renderAll() {
    const L = U();
    launch.querySelector('.saq-helper-launch-text').textContent = L.launch;
    launch.setAttribute('aria-label', '✦ ' + L.launch);
    title.textContent = L.title; closeBtn.setAttribute('aria-label', L.close); closeBtn.title = L.close;
    panel.querySelector('.saq-helper-sub').textContent = L.sub;
    input.placeholder = L.placeholder; input.setAttribute('aria-label', L.input);
    form.querySelector('.saq-helper-send').textContent = L.send;
    chips.setAttribute('aria-label', L.chips);
    chips.innerHTML = HINTS.map(chip).join('');
    panel.setAttribute('lang', lang());
    if (typingMsg) flushTyping();
    log.innerHTML = state.messages.map(msgHtml).join('');
    log.scrollTop = log.scrollHeight;
  }
  function push(m) { state.messages.push(m); log.insertAdjacentHTML('beforeend', msgHtml(m)); scrollLog(); }
  let typingTimer = 0; let typingMsg = null;
  function flushTyping() {
    if (!typingMsg) return;
    clearTimeout(typingTimer); typingTimer = 0;
    const t = log.querySelector('.saq-helper-typing'); if (t) t.remove();
    const m = typingMsg; typingMsg = null; push(m);
  }
  function ask(text, id) {
    const q = String(text || '').trim(); if (!q) return;
    flushTyping();
    push({ from: 'user', text: q });
    const res = id ? { kind: 'faq', id, related: [] } : answer(q);
    const msg = Object.assign({ from: 'bot' }, res);
    if (reduced()) { push(msg); return; }
    typingMsg = msg;
    log.insertAdjacentHTML('beforeend', `<div class="saq-helper-msg is-bot saq-helper-typing" aria-hidden="true" title="${esc(U().typing)}"><i></i><i></i><i></i></div>`);
    scrollLog();
    typingTimer = setTimeout(flushTyping, 520);
  }
  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
  function setOpen(open, viaKeyboard) {
    state.open = open; panel.hidden = !open; launch.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('saq-helper-open', open);
    if (open) {
      if (!state.messages.length) { state.messages.push({ from: 'bot', kind: 'greet' }); renderAll(); }
      syncViewport();
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      (viaKeyboard || !coarse ? input : title).focus({ preventScroll: true });
      scrollLog();
    } else { launch.focus({ preventScroll: true }); }
    checkOverlap();
  }
  function go(to) {
    if (to === 'settings') {
      if (isPhone()) setOpen(false);
      const t = document.getElementById('saq-settings-toggle'); const p = document.getElementById('saq-settings-panel');
      if (t && p && p.hidden) t.click();
      return;
    }
    const nav = document.querySelector(`.navlink[data-route="${to}"]`) || document.querySelector(`[data-route="${to}"]`);
    if (nav) nav.click(); else location.hash = '#' + to;
    if (isPhone()) setOpen(false);
  }

  /* -------- phone: keep the chat input above the on-screen keyboard */
  function syncViewport() {
    const vv = window.visualViewport; if (!vv || !panel) return;
    const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.setProperty('--saq-kb', kb + 'px'); panel.style.setProperty('--saq-vvh', vv.height + 'px');
  }
  /* -------- the round button never sits on top of the site's own buttons, links or fields */
  const INTERACTIVE = 'a[href],button,input,textarea,select,label,summary,[role="button"],[role="switch"],[tabindex]:not([tabindex="-1"])';
  let raf = 0;
  function checkOverlap() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; if (!launch) return;
      if (state.open) { launch.classList.remove('is-tucked'); return; }
      const x0 = launch.offsetLeft, y0 = launch.offsetTop, w = launch.offsetWidth, h = launch.offsetHeight;
      const pts = []; // a grid under the whole button, so even a short inline link is noticed
      for (let x = x0 + 3; x <= x0 + w - 3; x += Math.max(6, (w - 6) / 16)) for (let y = y0 + 3; y <= y0 + h - 3; y += Math.max(6, (h - 6) / 4)) pts.push([x, y]);
      let covered = false;
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        for (const el of document.elementsFromPoint(x, y)) {
          if (el === launch || launch.contains(el) || (panel && panel.contains(el))) continue;
          if (el === document.body || el === document.documentElement) break;
          if (el.closest && el.closest(INTERACTIVE)) { covered = true; }
          break;
        }
        if (covered) break;
      }
      launch.classList.toggle('is-tucked', covered);
    });
  }

  function build() {
    if (state.built || !document.body) return; state.built = true;
    launch = document.createElement('button');
    launch.type = 'button'; launch.id = 'saq-helper-launch'; launch.className = 'saq-helper-launch saq-orb-launch';
    launch.setAttribute('aria-controls', 'saq-helper'); launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('data-saq-no-translate', '');
    launch.innerHTML = '<span class="saq-orb" aria-hidden="true"><span class="saq-orb-halo"></span><span class="saq-orb-sheen"></span><span class="saq-orb-star">✦</span><span class="saq-orb-spark"></span><span class="saq-orb-spark"></span><span class="saq-orb-spark"></span></span><span class="saq-helper-launch-text"></span>';
    panel = document.createElement('section');
    panel.id = 'saq-helper'; panel.className = 'saq-helper'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'saq-helper-title'); panel.setAttribute('data-saq-no-translate', '');
    panel.innerHTML = '<header class="saq-helper-head"><div class="saq-helper-id"><span class="saq-orb saq-orb--mini" aria-hidden="true"><span class="saq-orb-sheen"></span><span class="saq-orb-star">✦</span></span><div><h2 id="saq-helper-title" tabindex="-1"></h2><p class="saq-helper-sub"></p></div></div><button type="button" class="saq-helper-close">×</button></header>'
      + '<div class="saq-helper-log" role="log" aria-live="polite" aria-relevant="additions"></div>'
      + '<div class="saq-helper-chips" role="group"></div>'
      + '<form class="saq-helper-form" autocomplete="off"><input class="saq-helper-input" type="text" maxlength="300" enterkeyhint="send"><button type="submit" class="saq-helper-send"></button></form>';
    document.body.appendChild(launch); document.body.appendChild(panel);
    try {
      if (!reduced() && !window.matchMedia('(max-width: 760px)').matches && !sessionStorage.getItem('saq-helper-peek')) {
        sessionStorage.setItem('saq-helper-peek', '1');
        setTimeout(() => { launch.classList.add('is-peek'); setTimeout(() => launch.classList.remove('is-peek'), 3800); }, 1600);
      }
    } catch (_) { /* storage off: no peek */ }
    log = panel.querySelector('.saq-helper-log'); chips = panel.querySelector('.saq-helper-chips'); form = panel.querySelector('.saq-helper-form');
    input = panel.querySelector('.saq-helper-input'); title = panel.querySelector('#saq-helper-title'); closeBtn = panel.querySelector('.saq-helper-close');
    renderAll();
    let keyOpen = false;
    launch.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') keyOpen = true; });
    launch.addEventListener('click', () => { setOpen(!state.open, keyOpen); keyOpen = false; });
    closeBtn.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
    panel.addEventListener('click', (e) => {
      const c = e.target.closest('[data-ask]'); if (c) { const f = byId.get(c.dataset.ask); ask(f[lang()].q, f.id); return; }
      const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.open) { e.stopPropagation(); setOpen(false); } }, true);
    document.querySelectorAll('[data-saq-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(renderAll, 0)));
    let settle = 0; // re-check once scrolling and the cards' entrance animations have finished
    const onMove = () => { checkOverlap(); clearTimeout(settle); settle = setTimeout(checkOverlap, 380); };
    ['scroll', 'resize'].forEach((ev) => window.addEventListener(ev, onMove, { passive: true }));
    document.addEventListener('animationend', onMove, true); document.addEventListener('transitionend', onMove, true);
    setInterval(() => { if (!document.hidden) checkOverlap(); }, 1000);
    window.addEventListener('hashchange', () => setTimeout(checkOverlap, 60));
    document.addEventListener('click', () => setTimeout(checkOverlap, 80));
    document.addEventListener('input', checkOverlap, true);
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', syncViewport); window.visualViewport.addEventListener('scroll', syncViewport); }
    setTimeout(checkOverlap, 300);
  }
  window.SAQHelper = { answer, rank, norm, ask: (q) => { if (!state.open) setOpen(true); ask(q); }, faq: FAQ };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
