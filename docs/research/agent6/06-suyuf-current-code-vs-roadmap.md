# كود Phase R مقابل الخطة
فحص ساكن عند **29f34b333ff4c424e0b0a987838138a4bf697d94**؛ لا يعني تشغيلًا أو قبولًا بشريًا. CODE هو evidence ID؛ الروابط إلى SHA ثابت. لم نفحص ملفات حية في مساحات الآخرين.

## مصادر السلطة
حزمة Downloads: Suyuf_AlMamalik_V3_4_Complete_Execution_Package.zip؛ SHA256:
AD16C8545B3C11B0404E9A241CC0E16EE751FA66A5E676F578C55751B1D48321.
تكليف Agent6 SHA256:
09A14928BBA394B4211462750705C1532A997D840E9D06082E6A6CCBDD467EC2.

فُحص handoff§§2–5/7؛ V3§§5.3–5.10 وQA07–11/19–23؛ V3.3§§2–4/8؛ V3.4§§1–4/6–7، وتقرير R وacceptance-results. عبارة «F فقط الآن» تاريخية؛ المهمة الحالية تجيز البحث فقط. النص القديم عن الصين أو تفويض حملة فيG1 متجاوز بالتسلسل الأحدث.

| ID / التصنيف | الواقع والدليل | حدود الاستنتاج / الخطة |
|---|---|---|
|CODE01 CONFIRMED-IN-OUR-CODE|[campaign.save/load L112](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign.js#L112) يسلسل meta,S مع SaveSafety وحراسة الخانة وload rollback|لا يثبت استئناف جلسة تكتيكية محفوظة|
|CODE02 CONFIRMED-IN-OUR-CODE|[normalizeState L189](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign.js#L189) يحدّث المدن ثم يرشح غير الموجودة بتعريف السيناريو|H يحتاج mapping صريحًا لحفظ الاستثمارات|
|CODE03 CONFIRMED-IN-OUR-CODE|[warsim L1243](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/warsim.js#L1243) يحسم field بمقارنة نقاط؛ nextPhase L566 وrunAuto L1711 يستدعيانه عند نهاية المسار|ليس BattleV2؛ لم نعد تشغيل شكوى المالك هنا|
|CODE04 CONFIRMED-IN-OUR-CODE|[campaign L1250](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign.js#L1250): applySim يتجاهل winner=null؛ autoResolve يستدعي WarSim.runAuto ويعيد cancel؛ finishEncounter L1282 ثنائي الفائز|G2 يحتاج نتائج مستقلة وتطبيق الخسائر مرة واحدة؛ لا ترقيع R هنا|
|CODE05 CONFIRMED-IN-OUR-CODE|[battle-scene L596](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/battle-scene.js#L596) تقرير ثنائي وquickResolve؛ [launchBattle L870](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign-ui.js#L870) يعيد cancel عند winner=null|تتبع كل المسارات لازم فيG2، لا تغيير resolver وحده|
|CODE06 CONFIRMED-IN-OUR-CODE|[economy L127](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/economy.js#L127) previewBuild يقارن قبل/بعد، ويعرض net/upkeep/payback ومكونات وملاحظة تغير التقدير|شرح الصافي موجود؛ جدواه البشرية لم تُختبر هنا؛ مركز H الإقليمي ليس منفذًا بمجرد ذلك|
|CODE07 CONFIRMED-IN-OUR-CODE|[incomeSteps L608](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign.js#L608) يعتمد السوق والسكان والولاء والاضطراب والمسافة؛ [economy L51](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/economy.js#L51) صيانة بنية|0.78 ليس زيادة صافي78٪؛ لم نغيّر التوازن أو نفترض مستوى3 أفضل دائمًا|
|CODE08 CONFIRMED-IN-OUR-CODE|[economy-trade L2](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/economy-trade.js#L2) يفسر حصارًا وحربًا وميناءً وخطرًا؛ routeStatus L41 يصف قافلة آلية بمسار ثابت؛ tradeBreakdown L68 يربط الدخل بالاتصال|ليس محاسبة كل حمولة محدودة أو مدير مسارات يدويًا؛ ذلك PROPOSED/H|
|CODE09 CONFIRMED-IN-OUR-CODE|[economy L18](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/economy.js#L18) وصول إداري وكلفة محلية؛ adminCosts L38 يغطي ستة مكاتب أولى؛ expansionPressure يعيد0|لا يصح القول لا كلفة إدارة؛ لا نعيد عقوبة عدد مدن خفية|
|CODE10 CONFIRMED-IN-OUR-CODE|[realm L226](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/realm.js#L226) تعيين واستدعاء حاكم وgovTick|لا يثبت دواوين أو مجلسJ كاملًا؛ التفصيل السياسيI/J مستقبل|
|CODE11 CONFIRMED-IN-OUR-CODE|[politics L70](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/politics.js#L70) قوة وجبهات وذاكرة وأسباب politicalAssessment؛ التحالف يلحظ قوة مهيمنة|لا يصح ادعاء غياب استجابة للهيمنة؛ لا ضمان معرفة عادلة دون instrumentation|
|CODE12 CONFIRMED-IN-OUR-CODE|[campaign-ai L120](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign-ai.js#L120) planGoals يزن السكان والعاصمة والمطالب والدفاع والقرب والمهيمن|strategicValue المفسرة الموحدة فيH لم تثبت؛ هذا لا يغطي كل سياسة AI|
|CODE13 CONFIRMED-IN-OUR-CODE|[capture L1410](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/campaign.js#L1410)، applyOccupation L1458، [occupation preview L140](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/economy.js#L140) موجودة|لا نعلن أن الفتح بلا غنائم؛ محاسبة المكاسب الصافية موضوعH|
|CODE14 CONFIRMED-IN-OUR-CODE|[leader-system L123](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/js/leader-system.js#L123) override replaceCand محدود مرة، يضيف الاسم retiredNames ويخصم draft؛ [index L57](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/index.html#L57) يحمله بعد commanders|قراءة الدالة الأصلية وحدها ناقصة. الاستبدال مدفوع في المسار المقروء؛ قرار V3.4 المجاني فيI لم ينفذ هنا|
|CODE15 EXTERNAL-EVIDENCE (سجلrepo)|[acceptance-results](https://github.com/llMLK/Game-war/blob/29f34b333ff4c424e0b0a987838138a4bf697d94/artifacts/phase-r/acceptance-results.json) يميز دفعات32/33 و21/21 و7/7؛34 suite لها دليل نجاح|نتائج سابقة لا اختباراتAgent6؛ pending owner حالة تاريخية لا تلغي اختيار المستخدم للأساس المعتمد|
|G0DOC EXTERNAL-EVIDENCE (مقترح)|[G0 عندf39af99](https://github.com/llMLK/Game-war/blob/f39af991964db4f5e0443ad661066a2765a1edb1/docs/battlev2/g0/README.md) و06/12: هدف وميدان وناجون مستقلة؛ chunk ليس نهاية؛ sunset فيfixture مقترح|ليس تنفيذًا أو اعتمادًا. لا تناقض ملزم مثبت في المقاطع المفحوصة؛ لا تعديل أو مراسلة|

## الحفظ — الاستنتاج المحدود
**ANALYST-INFERENCE:** Game.save يسلسلS، وlaunchBattle ينشئ BattleScene خارجS في المسار المقروء. بحث الملفات المحدد لم يجد battleState/rulesVersion/appliedEncounterIds. لا أساس لادعاء ترحيل جلسة BattleV2 جارية؛ يلزم جرد كامل وعينات اصطناعية فيG2. هذا نفي محدود لا إثبات غياب كل serializer. لم نقرأ حفظًا حقيقيًا للمالك.

## واجهات H/I/J — APPROVED-ROADMAP
|الطور|قرار باقٍ|مساهمة البحث والاعتماديات|
|---|---|---|
|H|سوق محلي ومركز إقليمي، مراكز وتوابع معmapping، غنائم واقعية وAI|R03/06/08/10 تشرح العائد الهامشي والاختناق والهدف؛ تعتمد الطرق والحفظ وكلفة الحرب؛30–36 نطاق تجربة لا إذن حذف|
|I|قادة وأسر وذاكرة، ولاة ودواوين وعطاء ومراجعة715|R07/09؛ HI1/HI2 سياق مؤسسات عام، التفاصيل الإقليمية والأعداد OPEN؛ لا تفسير نهائي لطاقة البطاقة|
|J|مجلس متصل بالخريطة وتطور بصري من حالة المدينة وواجهة جوال|R08/11/12؛ ملخص استثناءات ومشروعات؛ لا تعديل فنAgent4 أو فرض تعليمات عليه|

**UNVERIFIED:** متعة50–100 ساعة، الأداء والبطارية على جهاز، العدالة الشاملة، وآخر حالة إصلاح لكل لعبة. البحث لا يعيد ترتيب أي مرحلة.
