# العقود المؤجلة: التفويض والتكامل والحفظ والأداء

**الحالة: DESIGN ONLY / DEFERRED.** هذا ملف G0 للمراجعة، وليس إذنًا لتنفيذ G1B أو G2 أو تعديل اللعبة. `LOCKED` أدناه متطلب منصوص عليه؛ كل خوارزمية أو اسم حقل إضافي أو عتبة أو ترتيب تنفيذ مقترح موسوم `PROPOSED`. لا يوجد اختبار BattleV2 منفذ أو قياس أداء أو قبول بشري ضمن هذا الملف.

المراجع: V3 §5.6 كاملًا، خصوصًا §5.6.3-أ/1–9 و§5.6.4/7–12 وQA07–11/19–23؛ V3.3 §§2–4؛ V3.4 §§1 و5 و7؛ برنامج التسليم V3.4 §§2–7؛ تكليف G0 §§10–11 و16–18 و20–22. تحكم نسخة المالك الحالية بوابة G0 بدل عبارة «F فقط الآن» التاريخية. متطلبات الصين القديمة في V3.3 §4 وبوابة تفويض الحملة ضمن G1 في V3 §5.6.4 متجاوزة صراحة وفق V3.4 وبرنامج التسليم. راجع [السلطة](01-authority-and-requirements.md)، [المحرك](03-engine-architecture.md)، [الحالة](04-state-and-commands.md)، [النتائج](06-objectives-and-results.md)، [QA](11-qa-and-failure-matrix.md)، [القرارات](12-decisions-and-risks.md).

<a id="future-g1b"></a>
## 1. G1B — تفويض تكتيكي داخل النموذج المستقل فقط

**LOCKED / DEFERRED:** لا يبدأ G1B إلا بعد قبول المالك تجربة G1A. يظهر «أقُد المعركة بنفسي» و«فوّض القائد» على الساحة المستقلة نفسها. النمط يحدد مصدر الأوامر؛ لا يحدد معادلة الإصابة أو الضرر أو النصر. العرض المسرّع أو headless خيار عرض/تنفيذ للمحرك نفسه. لا بريد حملة، مسير مدن، طلب تعزيز استراتيجي، شاشة إعداد بعثة أو تغيير نمط أثناء المعركة شرط في هذه المرحلة.

**PROPOSED decision-rule brief:** يأخذ مخطط القائد `observe(side)` وتكليفًا تكتيكيًا وهوية القائد وحالة تشكيلاته المعروفة فقط. يعيد الأوامر التفصيلية عبر `validateOrder` ثم `commitOrders` المشتركين. يتخذ قراره من لقطة ما قبل التنفيذ نفسها المتاحة للطرف المقابل، ويغلق مجموعته قبل الكشف عن أوامر اللاعب. لا يطالع أوامر الخصم المودعة أو وحداته المخفية.

| أولوية مقترحة | شرط من المعلومات المتاحة | فعل تكتيكي مقترح | سبب قابل للعرض والاختبار |
|---|---|---|---|
| 1 | شرط انسحاب معلن متحقق، وطريق معروف صالح | سحب تدريجي مع ساتر إن أمكن | `withdrawal_condition_met` مع معرف الشرط والرايات والطريق |
| 2 | خطر معلوم يهدد الهدف أو خط الانسحاب | تغطية/اعتراض أو تحريك احتياط عبر طريق صالح | `detected_route_threat`؛ آخر مشاهدة ومدة الوصول المقدرة |
| 3 | فرصة تقدم يجيزها سقف المخاطرة | التفاف أو احتلال نقطة مع إبقاء بديل | `objective_opportunity`؛ دليل الفجوة وحدود التقدير |
| 4 | لا معلومات أو قدرة كافية لهجوم | استمرار الأمر الصالح/تمركز/استطلاع | `insufficient_intelligence` أو `hold_existing_order` |
| 5 | الأمر غير قابل للوصول أو القائد عاجز | تنفيذ البديل المصرح به أو خلافة القيادة | `order_unreachable` أو `succession_activated`؛ لا تجميد للمحرك |

ترتيب الأولويات ليس قرار مالك نهائيًا: تعارض حفظ القوة وإنجاز الهدف يحتكم إلى تكليف اللاعب ويعرض السبب. لا تعني «حذر» انسحابًا آليًا عند رقم قوة أكبر؛ يستخدم تقديرًا معلنًا بحدود ثقة. كفاءة القائد تغيّر تقييم المرشحين، اختيار الطريق، توقيت الطلب وتأخر التبليغ طبقًا لقواعد الأوامر؛ لا تضاعف ضرر التشكيل لأن مصدر القرار delegated. عند حقن **الأوامر التفصيلية ذاتها** في الحالة والبذرة نفسيهما تتطابق الأحداث الفيزيائية والنتيجة في manual/delegated/visible/headless. سجل سبب اختيار الأمر منفصل عن حقائق القتال؛ يطبّع حقل مصدر الأمر/العرض عند المقارنة، دون إسقاط أي حدث فيزيائي أو توقيت تسليم أمر.

**PROPOSED succession:** نائب معلوم في بيانات البداية، ثم ترتيب ثابت للبدلاء المؤهلين عند الإصابة/الأسر/الموت. إن لم يوجد نائب، تستمر الأوامر الصالحة ويطبق كل تشكيل بديله المحلي. لا تنشأ شخصية أو قوة حرس مجانية. يعلن ما عرفه الجانب عن الإصابة، أثر انقطاع الاتصال ومتى تسلم البديل؛ لا يخبر الخصم بمصير لم يكتشفه. ترتيب الخلافة وحدود استقلال الضباط مقترحان للمراجعة، وليسا منظومات I/J.

**أدلة G1B المطلوبة لاحقًا — PENDING:** parity للأوامر المحقونة نفسها؛ التزام القائد الحذر بالمخاطرة والانسحاب؛ قائدان بخطتين مختلفتين وأسباب مسجلة؛ تغيير اسم النمط فقط لا يغير الفيزياء؛ إصابة القائد لا تجمد الجولة ولا تضيف وحدة. يجرب المالك النمطين على الساحة نفسها ويجيب نعم/لا مع تعليق حر ومعرف الحالة والبذرة:

1. هل فهمت المهمة التي منحتها للقائد؟
2. هل تصرف بحسب شخصيته وتعليماتك؟
3. هل فهمت سبب تغيير خطته أو انسحابه؟
4. هل كان التفويض على المحرك الحقيقي نفسه؟
5. هل شعرت أن اختيار القائد مهم؟

عدم الإجابة أو نجاح اختبارات آلية لا يفتح G2. المعاينة العامة تحتاج إذنها المنفصل في حينه.

<a id="future-g2a"></a>
## 2. G2A — عقد النتيجة والترحيل والإزالة الكاملة

**LOCKED / DEFERRED:** دمج المصدر الموحد للقتال مع إنشاء المواجهة وتطبيق نتيجتها والحصار/فكه والانسحاب والأسر والجرحى والحفظ والتقرير وAI×AI. تنقل G2A كل مسار إنتاج نشط إلى BattleV2، دون WarSim احتياطي عند صعوبة أداء أو حفظ غير متوافق. يتوسع عمق الساحات في G2C؛ هذا لا يجيز إطلاق G2A بمسار حصار نشط يرجع للقديم. إذا لم توفر الحزمة الحد الأدنى الصحيح لعقود الحصار/المهام القائمة، يبقى إصدارها التجريبي منفصلًا حتى اكتمالها.

المقصود إزالة الاستدعاء النشط والاعتماد على الفائز الثنائي، ثم إزالة تحميل الكود القتالي القديم عند النقل الكامل. لا تحذف وظائف الجاهزية والقادة والاستسلام السلمي لمجرد مجاورتها WarSim؛ تراجع وتربط بالعقد المناسب. يحتفظ Git بالتاريخ، وليس الإصدار بمحرك بديل. لا حاجة في G0/G1 إلى تعديل الإنتاج.

العقد الكامل في [06](06-objectives-and-results.md). يستعمل **`outcome` فقط**: `attacker_objective | defender_objective | mutual_withdrawal | unresolved`؛ `objectiveOutcome` تعبير مفهومي في V3.4، وليس حقلًا ثانيًا. `fieldControl` مستقل: `attacker | defender | contested | vacated`. `status`: `completed | suspended | interrupted`. التعادل الحقيقي نهاية `completed` مع `unresolved`؛ الانقطاع التقني `interrupted` لا يصبح تعادلًا أو فوزًا. `suspended` فقط حين تدعم النسخة الاستئناف فعليًا. `getResult()` يعيد `null` قبل النهاية؛ checkpoint منفصل يحمل التوقف والاسترداد دون اختلاق نتيجة أثناء الجولة.

**G2A exit / PENDING:** خسائر محفوظة في التعادل، ناجون بعد الانسحاب، ثغرة غير محتلة لا تفتح مدينة، تطبيق مرة واحدة عند reload/retry، محرك واحد لكل مسار، نسخ وحفظ آمنان، ومقارنة أداء على جهاز محدد. انتهاء دفعة CPU لا يغير outcome ولا يولد أثر حملة.

<a id="future-g2b"></a>
## 3. G2B — التكليف قبل الإرسال والمراجعة قبل الاشتباك

**LOCKED / DEFERRED:** يحدد اللاعب النمط قبل خروج الجيش أو قبل المواجهة. يحفظ الجيش/البعثة افتراضًا، مهمة، هدفًا جغرافيًا، أولوية، مخاطر، انسحابًا، مؤنًا/تعزيزات مسموحة، استقلالًا وتعليمات بديلة. يسير القائد وفق الطرق والوقت والإمداد الفعلي ويطلب قرارًا خارج صلاحياته. البريد الأولي رسالة محفوظة وتأخر اتصال ظاهر عند الحاجة؛ المجلس والدواوين والتوترات في I/J. المراجعة قبل الاشتباك اختيارية للمفوض، فلا يتوقف كل قتال لاستخراج تدخل بشري.

**PROPOSED campaign-order brief:** JSON وثائقي صحيح البنية، لا schema منفذة أو قيم توازن معتمدة. الأسماء ووقت أدوار الحملة مقترحة؛ ليس سجل بعثة تاريخية.

```json
{
  "schemaVersion": "campaign-order-proposal-1",
  "missionOrderId": "fixture-order-um-001",
  "armyId": "fixture-army-a",
  "commanderId": "fixture-commander-a",
  "issuerId": "fixture-player",
  "issuedAt": { "campaignTurn": 8, "sequence": 3 },
  "commandMode": "delegated",
  "mission": { "type": "relieve_siege", "targetNodeId": "fixture-city", "objectiveTemplateId": "relief-open-supply-proposal-1" },
  "priority": "preserve_force",
  "generalPlan": "secure_supply_route",
  "route": { "waypointIds": ["fixture-home", "fixture-bridge", "fixture-city"], "alternativeAllowed": true },
  "riskCeiling": { "band": "cautious", "policyId": "risk-policy-proposed-1" },
  "withdrawalCondition": { "predicateId": "supply_route_untenable", "parameters": { "mustBeObserved": true } },
  "suppliesPolicy": { "useAllocatedStores": true, "requestAdditionalAllowed": true },
  "reinforcementPolicy": { "requestAllowed": true, "automaticGrant": false },
  "initiative": { "allowRouteChange": true, "allowNewWar": false, "allowNewObjective": false },
  "fallback": { "action": "hold_at_last_safe_node_and_report" },
  "communication": { "messageId": "fixture-message-003", "status": "pending", "deliveredAt": null },
  "revision": 1,
  "supersedes": null
}
```

`riskCeiling` سياسة مفهومة بدليل معرفة القائد، وليس احتمال فوز سريًا. `policyId` و`predicateId` لا ينفذان حتى يربطا بتعريفات قابلة للاختبار في حزمة G2B المعتمدة. كل مرجع مدينة/جيش/قائد/طريق يحقق وجوده وانتماءه وتوافقه مع الأموي 715م. طلب التعزيز لا يمنح تعزيزًا؛ يحتاج حركة مورد/جيش موجود بإذن الحملة وتكلفة ووقت ومسار. لا يضيف هذا العقد حركة حملة إلى G1A/G1B.

**PROPOSED communication:** `pending → in_transit → delivered`، أو `failed` بدليل انقطاع، أو `superseded` بإصدار أحدث. يبقى التكليف المسلم السابق نافذًا إلى تسلم البديل؛ لا تنفيذ رجعي. يسجل كل تعديل وهوية مصدره وتاريخه وقيد إمكان تسلم القيادة. إن حجب الاتصال تغييرًا قبل الاشتباك يظهر سببه والبديل؛ لا تلغى رغبة manual المحددة عند الإرسال بلا سبب معلن.

**PROPOSED encounter binding:** عند وقوع الاشتباك يولد adapter `encounterId` واحدًا ويربطه بالتكليف المطبق والقائد والجيش ونسخ القواعد/المحتوى والبذرة وsnapshot المسير/التعب/المؤن/الأعداد/المواقع. يسمح بتغيير `commandMode` قبل أول التزام تكتيكي إذا سمحت الاتصالات؛ لا يعيد إنشاء seed أو القوات أو الاستخبارات. بعد البدء لا تحويل تحكم مفروض ولا ميزة جديدة لتبديل النمط وسط الجولة. يحفظ سجل الرحلة والقرارات القديمة كما حدثا.

**G2B exit / PENDING:** QA20 بعثة كاملة دون تدخل تكتيكي إجباري؛ QA22 تغيير قبل الاشتباك مع تطابق hash الحالة الفيزيائية والبذرة والسجل السابق؛ QA23 حذر ملتزم بالانسحاب دون مضاعفات سرية؛ انقطاع رسالة أو تغيير قائد لا يمحو التكليف ولا يعيد الموارد.

<a id="future-g2c"></a>
## 4. G2C — بقية الساحات والمهام والمتانة

**LOCKED / DEFERRED:** استكمال البيئات المفتوحة والممر والحصار والمهام الست: السيطرة على الميدان، اعتراض جيش، حفظ الممر حتى شرط معلوم، كمين/حماية قافلة، فك حصار لفتح إمداد، اقتحام مدينة. أول ميدان فقط هدف G1A و4–6 رايات لكل طرف نطاقه. لا يؤجل عقد النتيجة إلى G2C بل عمق المحتوى والتكامل المتبقي واختبارات الإطلاق. آثار التجارة/المخازن/تمويل القوافل التزام QA11؛ ينسق عمق السوق مع H دون تنفيذ H هنا.

دراسة G2C تشمل **1,000+** معركة من بذور موثقة، دورات حملة طويلة، وضعًا خفيفًا ومزدحمًا، RTL، هاتفًا فعليًا، p95، replay ومراجعة المتعة. ≥1000 متطلب مصدر؛ توزيع العينة اقتراح لا دليل تنفيذ. توزع طبقيًا على المهام/الأرض/الأعداد/التعب/الذخيرة/المعلومات/القادة/أمراض الحفظ مع بذور مزدوجة لمقارنة تغيير واحد. لا يكفي معدل فوز إجمالي؛ تفصل أخطاء الحفظ والاستحالة الفيزيائية والنتائج غير المفسرة عن التوازن. زيادة الجيش ليست ضمان فوز، والاتجاه الإحصائي لا يلغي أثر ازدحام/إمداد يفسر نتيجة عكسية.

الإطلاق ينتظر اكتمال المسارات وتفسير النهايات والاختبارات والأداء وقبول المالك المطلوب وأي إذن نشر منفصل. فشل الأداء يؤخر الإصدار ولا يعيد `runAuto` إلى BattleV2.

<a id="future-seams"></a>
## 5. جرد R الملاحظ ومسار الاستبدال في G2

فُحص الكود قراءة فقط عند R المعتمد `29f34b333ff4c424e0b0a987838138a4bf697d94`. المسارات والأسطر مثبتة في هذه النسخة؛ تعاد مراجعتها عند G2. الروابط إلى ملفات الإنتاج للقراءة، وليست ادعاء تنفيذ تغيير. لا تستنتج علة معركة المالك الفعلية دون سجلها.

### 5.1 مسار الاستدعاء الملاحظ

```text
CampaignAI movement / human campaign action
  → Game.executeMove → Game.makeEnc → Game.resolveEnc
      player involved + hook → Panels.encounter
        → lead → launchBattle → new BattleScene → new WarSim
          → manual ticks / quickResolve → runAuto (legacy)
          → showReport → onEnd → Game.applySim
        → auto → Game.autoResolve → new WarSim.runAuto → Game.applySim
      AI×AI / no player hook → Game.autoResolve → new WarSim.runAuto → Game.applySim
  → Game.finishEncounter wrappers → aftermath / capture / retreat
  → Game.save
```

| نقطة ملاحظة R | الوظيفة الفعلية ودليلها | التزام G2A وسبب عدم الاكتفاء بتغيير اسم |
|---|---|---|
| [campaign-ai.js:6](../../../js/campaign-ai.js#L6)، [50](../../../js/campaign-ai.js#L50) | `executeMove` يطبق الحركة، يبني assault/relief ثم `resolveEnc`. الأخير يختار hook للاعب أو `autoResolve` ثم `finishEncounter` و`save` في 59–60 | creation/result transaction؛ cancel قبل القتال غير unresolved؛ لا إعادة مسير وقع فعلًا |
| [campaign-ui.js:867](../../../js/campaign-ui.js#L867)، [panels.js:1385](../../../js/panels.js#L1385) | hook إلى `Panels.encounter`؛ lead يستدعي `launchBattle`، auto يستدعي `Game.autoResolve` ثم نافذة التقرير | استبدال خياري القديم بالنمطين؛ لا إعادة تسمية «حسم سريع» |
| [campaign-ui.js:870](../../../js/campaign-ui.js#L870) | `launchBattle` يبني cfg، يحتفظ بمشهد الحملة في closure، يفتح BattleScene؛ 875 يعتبر `winner == null` cancel ثم `applySim` في 876 | نتيجة مستقلة عن winner وتعامل صحيح مع standoff/withdrawal/interruption |
| [battle-scene.js:9](../../../js/battle-scene.js#L9)، [596](../../../js/battle-scene.js#L596)، [607](../../../js/battle-scene.js#L607) | `this.sim = new WarSim(cfg)`؛ `showReport` يأخذ النتيجة ويرجعها بزر العودة؛ `quickResolve` يشغّل `runAuto` ثم التقرير وstarve يعيد cancel | عرض أحداث BattleV2 فقط؛ السرعة لا تقرر نتيجة؛ التقرير يميز المهمة والسيطرة والناجين |
| [campaign.js:1113](../../../js/campaign.js#L1113)، [1137](../../../js/campaign.js#L1137)، [1216](../../../js/campaign.js#L1216) | `makeEnc/encSides/simConfig` يجمع الجيوش والحامية وassault/sally/relief وterrain وseed والقادة وregs بمراجع مباشرة | stable IDs وsnapshot مستقل ومهمة معلنة وحقوق رؤية وبذرة واحدة دون تحويل المراجع إلى موارد جديدة |
| [campaign.js:1250](../../../js/campaign.js#L1250)، [1271](../../../js/campaign.js#L1271) | `applySim` يرفض null winner، يكتب men عبر `u.ref` ويطبق خبرة/ولاء؛ `autoResolve` يضبط player=false ويشغّل WarSim؛ fallback محلي يفترض defender winner إذا عاد applySim فارغًا | إزالة binary-winner assumptions والافتراض التعويضي؛ validation ثم transaction بمحاسبة كاملة |
| [readiness.js:156](../../../js/readiness.js#L156)، [184](../../../js/readiness.js#L184) | wrapper يخلط الجاهزية ويرسل صفات القائد؛ التطبيق يحفظ menBefore ويعيد held men ويطبق Ready.after ويضع `_campaignApplied` على كائن النتيجة | حفظ التعب/الذخيرة/المؤن والقوة الملتزمة/المتبقية؛ حارس محفوظ transaction-wide |
| [campaign.js:1282](../../../js/campaign.js#L1282) | `finishEncounter` مصائر قائد/خبرة/تصفية أفواج صغيرة/mood/report؛ assault attacker win يستدعي capture في 1329؛ خسارته قد تبقي الحصار وفق power في 1335؛ relief winner ينسحب المحاصرون 1340 | كل أثر بدليل المهمة والسيطرة والطريق لا side index؛ لا تحويل الجرحى/الفارين لقتلى أو إسقاط رجال أثناء تحويل الأفواج |
| [campaign.js:1370](../../../js/campaign.js#L1370)، [1410](../../../js/campaign.js#L1410) | `retreatHome` يبحث نحو صديق حتى 3 حواف؛ لا وجهة تؤدي إزالة الجيش وأسر القائد عند وجود آسر. `capture` يغير المالك ويجدد الحامية/المخازن ويطبق آثارًا أخرى | فصل التراجع التكتيكي عن مسار الحملة؛ محاسبة الأسرى والناجين؛ لا خلق حامية/موارد مجاني من adapter؛ سياسة التعافي/الفتح تحتاج اعتمادًا |
| [campaign-ai.js:455](../../../js/campaign-ai.js#L455)، [478](../../../js/campaign-ai.js#L478)، [489](../../../js/campaign-ai.js#L489) | AI يبني assault للحصار، يستخدم encPower لاختيار بدء هجوم ثم resolveEnc؛ sally كذلك. رفع الحصار يستدعي retreatHome في 480 | تمييز التقدير الاستراتيجي لاختيار الاشتباك عن حسمه؛ كل اشتباك headless بنفس الفيزياء، لا جدول encPower بديل |
| [readiness.js:61](../../../js/readiness.js#L61)، [135](../../../js/readiness.js#L135)، [207](../../../js/readiness.js#L207) | إبقاء الطوق يحدد commit/held؛ فكه يغير انضمام الحامية ويصفر تقدم الحصار عند finish | مكان كل رجل دون عد القوات مرتين؛ استمرار/رفع الحصار مستقل عن fieldControl |
| [siegecraft.js:65](../../../js/siegecraft.js#L65)، [105](../../../js/siegecraft.js#L105)، [campaign.js:1568](../../../js/campaign.js#L1568) | احتمالات/طلب استسلام ثابت بنفس المدينة/الدور؛ `surrenderAccepted` يصل capture أو فك الطوق دون قتال | لا حذف التفاوض السلمي خطأ؛ سجل surrender evidence ولا تصنع نتيجة تكتيكية وهمية |
| [battlecmd.js:459](../../../js/battlecmd.js#L459)، [567](../../../js/battlecmd.js#L567)، [792](../../../js/battlecmd.js#L792) | أوامر legacy/CP وwrapper نتيجة يضيف after/held/breached وwrapper تقرير | لا نسخ بطاقات القديم أو after المختزل كعقد جديد؛ المحافظة على وظائف الجاهزية اللازمة |
| [battle-narrative.js:6](../../../js/battle-narrative.js#L6)، [255](../../../js/battle-narrative.js#L255) | predicates تختار فقرات وتحفظ narrativeEvidence؛ override لـstoryParts؛ التنويع لا يستهلك RNG القتال | السرد من أحداث BattleV2 ومعرفاتها، لا قصة فائز/خاسر لا تمثل المهمة |
| [commanders.js:477](../../../js/commanders.js#L477)، [512](../../../js/commanders.js#L512)، [531](../../../js/commanders.js#L531) | مصائر/ذكريات/recordBattle/vows/opportunities/recordCapture؛ [commander-data.js:4](../../../js/commander-data.js#L4) كتالوج الهويات | حفظ ID والجرح/الأسر والتاريخ بلا تعويض مجاني؛ لا إعادة تصميم الاستقطاب/المجلس |
| [main.js:181](../../../js/main.js#L181) | معركة مستقلة تفتح BattleScene أيضًا | يشمل الجرد كل نقطة دخول، وليس campaign فقط |

التنفيذ اليدوي المرئي نفسه يمر عبر [battle-scene.js:431](../../../js/battle-scene.js#L431): `playTicks` يستدعي `commitPhase` في 434 و`step` في 441، ثم `phaseDone` في 449؛ `phaseBreak` يستدعي `endPhase` في 466 و`nextPhase` في 477. مؤقت العرض يحدد موعد عرض النبضة القديمة، وليس عقد BattleV2 المقترح.

**Wrappers ليست حاشية:** ترتيب [index.html:38](../../../index.html#L38) حتى 62 يجعل سلسلة `applySim` الخارجية: political-allies → readiness → campaign. وسلسلة `finishEncounter`: political-allies → politics → commanders → statecraft → readiness → campaign. [statecraft.js:663](../../../js/statecraft.js#L663) يسجل خسائر الحرب، [politics.js:437](../../../js/politics.js#L437) يحفظ أثر صد الهجوم، [political-allies.js:192](../../../js/political-allies.js#L192) يجمع مشاركة الحلفاء و[212](../../../js/political-allies.js#L212) يمنع finish مكررًا على كائن enc ويسجل مساهمة سياسية. يمتد capture عبر statecraft:676 وcommanders:531 وpolitical-allies:232. يجب إحصاء هذه الآثار ومنع تكرارها والمحافظة على وظائفها، لا تجاوزها دون بديل.

### 5.2 حد النظام القديم وقضية الجناح

[WarSim:1201](../../../js/warsim.js#L1201) يكسر قطاعًا ويطبق مطاردة وصدمة معنوية؛ ليس هناك حكم عام بأن جناحًا واحدًا يعني دائمًا النهاية. [checkEnd:1225](../../../js/warsim.js#L1225) حتى 1240 يحسم عند broken sectors `>= min(2, had.length)`، أو قلب منهار بلا احتياط في field، أو live men أقل من 25%، أو morale أقل من 8، مع شرط live men أقل من 97%. قد يؤدي جناح منهار لنهاية بحسب بقية الحالة، لكن لا نختلق السبب التاريخي لشكوى المالك.

الملاحظة التي يجب أن يرفضها oracle الجديد: [endPhase:566](../../../js/warsim.js#L566) يستدعي `decideByScore` بعد آخر مرحلة؛ [runAuto:1695](../../../js/warsim.js#L1695) حتى 1711 يفرضه بعد guard=60 أيضًا. [decideByScore:1243](../../../js/warsim.js#L1243) يختار فائز field من الرجال والمعنويات/front، وفي siege من ثغرة ونسبة live men لا احتلال هندسي حقيقي. [finish:1257](../../../js/warsim.js#L1257) قد يضيف مطاردة بعد الحكم. [commitReserve:1279](../../../js/warsim.js#L1279) ينقل sector فورًا وليس رحلة هندسية. هذه ملاحظات كود وليست اختبارًا حديثًا أو تشخيصًا مؤكدًا لمعركة المالك. انظر [oracle الجناح](07-wing-collapse-regression.md).

### 5.3 قائمة إزالة G2A — كلها PENDING

- [ ] جرد محدث لكل `WarSim`, `runAuto`, `autoResolve`, `applySim`, `finishEncounter`, `quickResolve`, `showReport` وكل constructor/call/override/load/import؛ اللاعب وAI×AI والمستقلة والحصار/relief/sally.
- [ ] إنشاء encounter بعقد identity/snapshot دون مراجع موارد مباشرة؛ تمييز الدخول في قتال عن التسوية التفاوضية.
- [ ] إزالة `winner == null → cancel` وdefender fallback؛ لا إعادة موارد عند unresolved.
- [ ] وصل casualty/resource ledger ومصائر القادة والجاهزية والتاريخ والسياسة/الحلفاء مرة واحدة لكل نتيجة مكتملة.
- [ ] assault/capture/retreat/relief لا يستنتج فتحًا أو أسر جيش من winner؛ إثبات الاحتلال/الاستسلام والطريق والقدرة.
- [ ] UI/التقرير/السرد من أحداث مثبتة؛ لا quick-resolve قديم باسم جديد ولا تقرير winner مختزل.
- [ ] إزالة تحميل الكود القتالي المتقاعد بعد اكتمال النقل؛ لا legacy combat call في production dependency graph أو عند فشل الحفظ/الأداء. التاريخ في Git فقط.
- [ ] نقل تغطية الاختبارات اللازمة دون إضعافها؛ اختبارات legacy ليست معيارًا يفرض آلياته على BattleV2.
- [ ] إثبات كل مسار بـstate/orders/seed/events/result، وفحص save/reload/retry والفشل المحقون، ثم مراجعة تقنية وأداء قبل أي إطلاق مأذون.

<a id="future-save"></a>
## 6. الحفظ وتطبيق الأثر مرة واحدة والمحافظة على الموارد

**OBSERVED:** [campaign.js:112](../../../js/campaign.js#L112) حتى 120 يسلسل `{meta, S: this.S}`؛ [load:138](../../../js/campaign.js#L138) حتى 154 ينسخ S ثم migrate/normalize/validate ويسترجع previous عند الخطأ. لا serializer لـBattleScene أو WarSim ولا حقل active battle في S ضمن المسار المفحوص. `BattleScene.sim`, `stage`, `pos`, `timer` في المشهد/الذاكرة، وlaunchBattle يحتفظ بالمشهد السابق في closure. الاستنتاج المحدود: **R لا يخزن جلسة BattleScene الجارية في slots المفحوصة**؛ لا ندعي ترحيل حالة تكتيكية قديمة غير محفوظة. آخر save قد يسبق دخول المعركة؛ لا نعد أن reload اليوم يعيد نقطة دخولها الدقيقة أو كل نشاط غير محفوظ. جاهزية الجيوش في S تُحفظ، وهذا غير استئناف التكتيك.

**OBSERVED:** حارس `res._campaignApplied` في readiness:185/203 محلي على كائن نتيجة وغير enumerable، وليس ledger دائمًا. `enc.alliedFinished` و`enc.alliedId` في political-allies:213–217 يحميان بعض الاستدعاء المتكرر مع sequence محفوظ، لكن لا يثبتان transaction ذرية لكل encounter عبر reload. هذا توصيف نطاق، لا خلل تكرار مثبت في R.

**PROPOSED G2A transaction:** encounter ID فريد وprebattle checkpoint موثق محفوظ **قبل** تنفيذ قتال يغير الحملة. snapshot يحدد مصدر كل رجل ومورد والجزء غير الملتزم في الطوق. لا تكتب نتائج جزئية إلى Game.S أثناء المحاكاة. `campaignEffects` اقتراحات مشتقة من حقائق نهائية وهوية؛ المحرك وUI لا يطبقانها مباشرة.

```text
applyCompletedEncounter(result, currentCampaign):
  validate schema, supported rules/content, terminal evidence and all IDs
  require result.status == completed
  if appliedEncounterIds[encounterId] exists:
      require stored fullResultDigest == digest(canonical authoritative result)
      return stored receipt without any effect
  require snapshot / encounter / campaign revision match
  candidate = copy(currentCampaign)
  verify original men partition and army / held-garrison provenance
  derive authorized effects from outcome + control + withdrawal evidence
  apply losses, wounded, routed, captives, resources, commander fates and positions
  apply permitted siege / ownership / political effects with evidence and unique IDs
  assert conservation and references; never count one man twice
  candidate.appliedEncounterIds[encounterId] = receipt(fullResultDigest, effect IDs, campaign revision)
  write and read-verify one versioned envelope containing effects AND ledger
  only after verified commit: publish candidate to UI and notify once
```

هذه pseudocode مقترحة وليست إثبات atomicity لـlocalStorage. تختبر نقاط الانقطاع والتخزين/read-back والتبويبات المتزامنة/reentrancy. `appliedEncounterIds` هنا خريطة encounter إلى receipt وليست مجرد قائمة booleans. receipt داخل envelope المصدر الدائم؛ الإشعار ليس أثرًا جديدًا. encounter نفسه ببصمة مختلفة تعارض لا تطبيق ثانٍ. البصمة تغطي كامل النتيجة الموثوقة ونسخها ومعانيها، لا finalStateHash وحده. suspended/interrupted لا يطبقان completed effects؛ يحتفظ بالcheckpoint للاستئناف أو replay المدعوم مع رسالة. إذا تعذر الاستئناف، يسترد checkpoint آمن متحقق؛ إن غاب يمنع التحويل ويحفظ الأصل للتصدير بدل اختلاق فائز أو محو تقدم.

**المحاسبة الملزمة:** الأصل = مجموع فئات أشخاص متنافية: قادرون/جرحى/فارون أو مشتتون/أسرى/قتلى/مفقودون إن دعمهم العقد. `routing` و`engaged` و`fatigue` أوصاف متداخلة لا أعداد إضافية. شفاء الجرحى وتجميع الفارين نقل بين حسابات بوقت وموارد ومكان آمن حسب سياسة لاحقة معتمدة؛ ليس خلقًا من العدد الأصلي. غير الملتزمين لا يضافون فوق ناجين يشملونهم. نهاية المخزون = البداية + تحويل مثبت − استهلاك − فقد، بمصدر/وجهة متطابقين. لا سهام/ذهب/حامية/عتاد/قائد من تبديل النمط أو الحفظ. لا يبقى الأسير في عداد الجيش القتالي وهو في سجل أسر الخصم. التعادل يحتفظ بالأثر، والانسحاب لا يعيد الخسائر.

**PROPOSED migration:** صنف الملف قبل normalize؛ نسخة أصلية قابلة للاسترداد والتصدير ثم تحققها؛ ترحيل copy-only بزوج نسخ معلن؛ تحقق IDs/الموارد/hash؛ كتابة envelope جديد وقراءة للتحقق؛ التحويل مرة ثانية لا يغير الحالة. فصل schemaVersion عن rulesVersion/content revision؛ unsupported tactical version لا يجيز تغيير القواعد أو seed. G2 يدعم فقط النسخ المعلنة في مصفوفة ترحيله المستقبلية. من R يرحل حفظ حملة إن لزم، لا جلسة WarSim غير محفوظة.

**LOCKED:** حماية الصين غير المدعومة في [save-safety.js:6](../../../js/save-safety.js#L6) و[48](../../../js/save-safety.js#L48) حتى 79 تبقى: رفض قبل normalize وعدم استبدال bytes دون backup verified وحماية slots اليدوية/التصدير. لا حملة صينية ولا اختبارات BattleV2 صينية. لا حفظ مالك حقيقي في الاختبارات؛ fixtures اصطناعية منفصلة، ونقله إلى preview يحتاج موافقته. لا يُفترض اختلاف origin لمجرد اختلاف مسار GitHub Pages؛ يفحص origin ومفاتيح التخزين فعليًا قبل أي معاينة مأذونة.

<a id="future-performance"></a>
## 7. خطة الأداء والحتمية والإتاحة — بلا benchmark مختلق

**LOCKED:** Canvas 2D/2.5D، renderer منفصل عن الانتقالات، headless بنفس الفيزياء، لا تخفيف تكتيك خاص بالـAI. الأداء غير مقاس في G0. fixed-point/worker/batch/chunk/culling مقترحات في [03](03-engine-architecture.md)، وليست حد p95 أو وعد سرعة معتمدًا.

| المرحلة المستقبلية | القياس المطلوب | العينة والأداة المقترحتان | دليل التسليم |
|---|---|---|---|
| قبل دمج G2A | خط أساس R على جهاز متوسط محدد + نموذج G1A الحقيقي | الطراز/SoC/RAM/OS/browser/build/SHA، viewport والدقة وحالة الطاقة/الحرارة؛ حملة خفيفة ومزدحمة معلومة عدد المواجهات | أزمنة raw، تكرارات warm/cold معلنة، median/p95 وmax مع طريقة الحساب |
| G1A/G1B | frame stalls، زمن الإدخال/feedback، microtick/round، ذاكرة الذروة | هاتف فعلي ومحاكاة متصفح موسومان منفصلين؛ 320×568 و390×844 وأفقي وساحات مستهدفة | trace وbuild، RTL/إتاحة، نتيجة المالك مستقلة عن perf |
| G2A | زمن turn كله وتجمد الواجهة، وقت encounter ومجموع headless، memory/storage | الحملتان نفسيهما والأوامر والبذور نفسها renderer off/on؛ قياس الدفعات لا يدخل قرار المحاكاة | مساواة event/final hashes مع اختلاف السرعة، تكلفة كل encounter |
| G2C | ≥1000 معركة ودورات طويلة، replay bytes ونمو ledger/logs | مصفوفة معلنة، قائمة seeds/versions/orders، حفظ failures/repro مصغر | توزيع لا متوسط فقط؛ p95 حسب الفئة واختبار ثبات/تسرب الذاكرة |

قبل القياس تعلن warm-up وحجم التكرار وعدد التشغيلات المستبعدة وسببها؛ لا يحذف outlier لأنه سيئ. أي ميزانية تعرض **PROPOSED / OWNER DECISION REQUIRED** بعد المقارنة الفعلية، ولا تصبح ادعاء اعتماد. لا قيمة p95 إنتاجية مثبتة هنا.

**PROPOSED optimization order:** profile أولًا؛ تقليل الرسم خارج الكاميرا والمؤثرات؛ طبقات ورايات تقرأ بسهولة؛ reuse لهياكل العمل؛ spatial indexing وتخزين هندسة ثابتة دون تخزين نتائج معارك متوقعة؛ دفعات deterministic تعيد التحكم للواجهة أو worker بعقد انتقال واضح. chunk لا يبدل microticks أو RNG أو ترتيب hits. لا cached predicted winner، لا اختزال احتمالي، لا قفز لإبادة أو تعادل حين تطول المعالجة. ضغط replay lossless يحفظ initial state/hash والأوامر والبذرة/القواعد وevent hashes. سياسة الاحتفاظ والمساحة قرار مقترح للمراجعة؛ لا تمحُ ما يلزم تدقيق النتيجة أو الاسترداد.

**Cross-device PENDING:** fixtures ثابتة مع تغيير viewport/سرعة العرض وترتيب مفاتيح JSON وتوقيت frames وإخفاء التبويب واستئنافه؛ hashes على serialization canonical. مصفوفة هاتف فعلي ومحركات متصفحات في G2؛ نجاح Node لا يثبت Safari. عند اختلاف، يتوقف اعتماد rulesVersion وتُصغّر الحالة؛ لا إصلاح بتبديل seed أو إسقاط أحداث. الساعة تقيس الأداء فقط ولا تدخل الفيزياء.

**إتاحة PENDING:** المجموعات الأربع عن الرجال/المعنويات والتماسك والتعب/المواقع والخطوط/المهمة ظاهرة؛ نص وأيقونة ولون، تمييز لعمى الألوان، سرعة وحركة مخفضة، حجم لمس وخط مقترحان يختبران عند phone zoom. لا عكس جغرافية الخريطة بسبب RTL. التقرير يفسر خسارة مهمة مع 900 ناجٍ إن كانت حالة الاختبار كذلك، دون كشف معلومات عدو كانت مخفية أثناء القرار. انظر [09](09-mobile-ux-ar.md).

<a id="future-faults"></a>
## 8. احتواء الفشل واختبارات التسليم المستقبلية

كل صف `DESIGNED / PENDING IMPLEMENTATION`؛ لم ينفذ في G0. لا نتيجة مختلفة ولا استعادة موارد لجعل الفشل يبدو محلولًا. تربط [QA](11-qa-and-failure-matrix.md) هذه الحالات بالـfixtures والبوابات.

| ID | إدخال عدائي/خطأ | السلوك الآمن المقترح وما يراه اللاعب | الفحص القابل للرصد / المرحلة |
|---|---|---|---|
| FUT-01 | حفظ تالف/غير مدعوم أو checksum مختلف | الأصل محفوظ، تفسير، لا normalize أو أثر تخميني | bytes ثابتة وbackup verified؛ G2A + حماية R |
| FUT-02 | نسخة BattleV2 لا يمكن استئنافها | checkpoint موثق أو منع التحميل مع export؛ interrupted ليس draw | لا outcome جديد ولا موارد جديدة؛ G2A |
| FUT-03 | قائد مفقود عند إنشاء encounter | رفض مرجع غير صالح أو خلافة معلنة قبل freeze؛ لا قائد مجاني | ID/history مصون وسبب ظاهر؛ G1B/G2A |
| FUT-04 | موت قائد متأخر أو أسر مزدوج | حدث مصير واحد وخلافة ثابتة؛ لا إلغاء أمر منفذ | unique fate/event ID وreplay مطابق؛ G1B/G2A |
| FUT-05 | event تالف/مكرر/تسلسل خطأ | رفض الحزمة دون commit؛ آخر checkpoint محفوظ | أثر campaign مرة واحدة؛ G2A |
| FUT-06 | تطبيق result مرتين أو reload أثناء commit | receipt محفوظ يمنع تكرار خسائر/ذهب/أسر/خبرة/سياسة | crash قبل/بعد كل write/read-back وreentrant call؛ G2A |
| FUT-07 | تبويبان لنفس encounter أو revision قديم | تعارض revision ظاهر؛ لا last-write-wins صامت | receipt واحد دون دمج متعارض؛ G2A |
| FUT-08 | missing asset/فونت/Canvas | بديل عرض بسيط مفهوم؛ لا تغيير نتيجة | headless/render hashes متطابقة والتقرير متاح؛ G1A/G2C |
| FUT-09 | صفر ذخيرة/مؤن أو كل الرايات عاجزة | رفض shoot بلا سهم؛ fallback/نهاية فقط بقاعدة معلنة | لا قيم سالبة/موارد جديدة/فائز cutoff؛ G1A/G2A |
| FUT-10 | انسحاب مسدود/بوابة غير قابلة للوصول | توضيح العائق، hold/بديل/استسلام بدليل فقط | لا teleport أو اختفاء ناجين؛ G1A/G2A |
| FUT-11 | أمر غير قانوني/هدف اختفى/رسالة لا تصل | rejected أو pending/failed ثم fallback؛ أمر صالح سابق يستمر | لا تنفيذ مرتين أو هدف stale سري؛ G1A/G1B |
| FUT-12 | app background/إغلاق/انقطاع تقني | pause/checkpoint عند حد حتمي معلن؛ لا تقدم بالساعة | RNG/round/microtick/orders نفسها؛ G1A إن دعم resume/G2A |
| FUT-13 | طول CPU أو نهاية دفعة | تقدم معالجة وyield؛ القتال مستمر ما لم تنته مهمة | getResult null ولا hidden winner؛ G1A/G2A |
| FUT-14 | نهار/موعد دفاع معلن انتهى | evaluateObjectives بقاعدة البداية؛ unresolved إن لا هدف ناجح | simulation-time ودليل الهدف الظاهر مسبقًا؛ G1A لغروب fixture المقترح في07/08، والتوسعة G2C؛ لا موعد عام معتمد |
| FUT-15 | ثغرة بلا احتلال/قافلة هربت مع خسارة أرض | ملكية مصونة؛ نجاح قافلة مستقل عن fieldControl | QA08/QA11 وموارد صحيحة؛ G2A/G2C |
| FUT-16 | انهيار متزامن أو انسحاب الطرفين | snapshot مشترك؛ unresolved/mutual withdrawal بدليل | لا أفضلية ترتيب جانب؛ G1A/G2A |
| FUT-17 | reserve متأخر/تعزيز أو سلاح غير موجود | وصول بزمن ومسار؛ لا يشترك ما لم يصل | conservation + دخول وإمداد مشروع؛ G1A/G2C |
| FUT-18 | AI يقرأ fog أو أوامر بشرية مودعة | observation فقط، التزام قبل الكشف | تغيير hidden order/unit دون كشف لا يغير القرار؛ G1A/G1B |
| FUT-19 | دفاع سلبي بلا نهاية أو إلغاء هجوم متكرر | استمرار متاح، انسحاب/موعد معلوم/إرهاق معلن؛ لا reset losses | لا infinite UI busy أو نهاية اعتباطية؛ G1A/G2C |
| FUT-20 | حفظ صيني/اختيار campaign غير مدعوم | حماية R دون BattleV2 صيني | رفض قبل normalize وexport/backup bytes ثابتة؛ G2A |

## 9. أدلة R التاريخية وحدود جرد G0

هذه **أدلة ملتزمة في R ومقروءة الآن**، وليست اختبارات أُعيد تشغيلها في G0:

| المصدر | ما يسجله | حدود الاستدلال |
|---|---|---|
| [tests/battles.cjs](../../../tests/battles.cjs) و[سجله](../../../artifacts/phase-r/targeted-logs/battles.log) | 31 مجموعة legacy؛ parity عبر 40 بذرة، readiness/save، once-only على كائن النتيجة، ammo، انسحاب/حصار/سرد | لا يثبت BattleV2 أو منع score winner أو استئناف active battle |
| [battle-balance.cjs](../../../tests/battle-balance.cjs) و[balance.json](../../../artifacts/phase-r/suite-evidence/battles/balance.json) | 5,824 محاكاة legacy، seeds=160 للكتل الأساسية وtacticSeeds=64 | ليست ≥1000 BattleV2 المطلوبة ولا قياس هاتف/متعة |
| [battle-preview.cjs](../../../tests/battle-preview.cjs) و[سجله](../../../artifacts/phase-r/final-logs/battle-preview.log) | محاكاة Edge لمس/تقارير/حفظ جاهزية في أحجام متعددة | ليست هاتفًا فعليًا أو prototype BattleV2 |
| [phase-f-campaign.cjs](../../../tests/phase-f-campaign.cjs) و[سجله](../../../artifacts/phase-r/final-save-logs/phase-f-campaign.log) | خمس مجموعات parity للحملة حول دورة الحالة والتصرفات | لا يعني اكتمال adapter جديد |
| [acceptance-results.json](../../../artifacts/phase-r/acceptance-results.json) | دفعة 32/33؛ إعادة منفصلة 21/21؛ نهائية 7/7؛ 34 suite مختلفة لها دليل نجاح عبر الدفعات | ليست دفعة واحدة 34/34؛ فشل إطلاق Edge التاريخي محفوظ |
| [final-save-regression-results.json](../../../artifacts/phase-r/final-save-regression-results.json) | 39 implementation-save، 45 independent-save، 14 identity، 6 content groups، campaign 5 وpreview isolation؛ الدليل التجميعي يسجل 60 R UI checks | sourceCommit `f13ea76…` قبل مرحلة الدليل، runtimeBlobs يصف محتوى working-tree المختبر تاريخيًا |

**فحص قراءة G0 المنفذ:** `git hash-object` دون كتابة لكل 51 ملف runtime في manifest النهائي أعاد **51 مطابقًا وصفر مختلف** عند R المعتمد. فحص تطابق ملفات فقط؛ لم يشغل suite أو يكتب artifacts/saves. لا اختبارات لعب/أداء جديدة. `docs/phase-r.md` يذكر قبول R pending لأنه تاريخي؛ تكليف المالك الحالي يثبت اعتماده R، فلا نعيد فتح البوابة بسبب وثيقة قديمة.

**Push/deployment:** لا `.github/workflows` ملتزمة عند R بحسب `git ls-tree -r --name-only HEAD .github`؛ لا workflow مستودع مرئي ينشر فرع الوثائق في هذه الشجرة. هذا وحده لا يثبت إعداد GitHub Pages أو خدمة خارجية؛ يفحص remote قراءة فقط قبل push. رفع docs branch ليس إذن Pages أو preview أو main؛ لا تعديل نشر هنا.

تنتهي G0 بمراجعة هذه العقود والقرارات المقترحة. التنفيذ والترحيل والقياس واختبار الجهاز مؤجل إلى مرحلته وبوابته، ولا يبدأ تلقائيًا بعد التسليم.
