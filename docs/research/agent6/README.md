# Agent6 — بحث أنظمة الاستراتيجية
**مكتمل وثائقيًا، متوقف لمراجعة المالك.** فرع codex/agent6-strategy-systems-research؛ أساس PhaseR:
29f34b333ff4c424e0b0a987838138a4bf697d94. تغييرات بحث فقط؛ السيناريو الأموي715م وحده.

ابدأ بـ[الملخص العربي](12-executive-summary-ar.md)، ثم[الترشيحات](07-recommendation-backlog.md) و[قرارات المالك](11-owner-decisions-and-conflicts.md). كل ترشيح PROPOSED، بلا تنفيذ أو اعتماد مستقل.

## خريطة التسليم
- [الحالة والاستئناف](00-status-and-scope.md) · [المنهج](01-methodology-and-evidence-standards.md)
- [12محور مقارنة](03-cross-game-system-matrix.md) · [تصنيف الفشل](04-failure-mode-taxonomy.md)
- [أواخر الحملة و3نماذج](05-late-game-and-snowball-analysis.md) · [الكود مقابل الخطة](06-suyuf-current-code-vs-roadmap.md)
- [مذكرةBattleV2](08-battlev2-advisory.md) · [REA/Ghidra](09-rea-ghidra-status-and-requests.md)
- [18اختبارًا ورقيًا](10-tests-and-falsification.md) · [التدقيق الثلاثي](13-three-audits.md)
- [سجل المصادر](evidence/sources.csv) · [الادعاءات](evidence/claims.md) · [الأدوات](evidence/tooling-log.md)

## مصفوفة تغطية الألعاب
COMPLETE يعني تغطيةA–I بأدلة وفجوات معلنة، لا تحققًا تجريبيًا من أحدثbuild. جميعها بحث وثائقي، ولم تُلعب في هذا التكليف. كل ملف يربط المصادر مباشرة ويصنف أثر التصحيح.

|اللعبة/الملف|أدلة أساسية|الثقة|التغطية|حدود الإصلاح|
|---|---|---|---|---|
|[Old World](02-games/old-world.md)|OW1 مصمم/OW2 نقد/OW3 update151|متوسطة–عالية|COMPLETE|UI الحالي UNKNOWN؛ نقد2021 منفصل|
|[CKIII](02-games/crusader-kings-iii.md)|CK2/3 مطور؛ CK4/6 مراجعات؛ CK5 لاعب|متوسطة|COMPLETE|توازن الإدارة الحالي UNKNOWN|
|[TW Three Kingdoms](02-games/total-war-three-kingdoms.md)|TW1/4 دليل/patch؛TW2/3 نقد؛TW5 لاعبين|متوسطة|COMPLETE|فخ العهود UNKNOWN؛ لا ادعاء أحدث1.7.1|
|[EUV](02-games/europa-universalis-v.md)|EU1/3/4 مطور؛EU2 نقد؛EU5 feedback|متوسطة|COMPLETE|أثر1.2/1.2.2 الحالي UNKNOWN|
|[CivVI](02-games/civilization-vi.md)|CV1–4 قواعد/patch؛CV5/8 نقد؛CV6/7 لاعبين|متوسطة|COMPLETE|شكاوى2024 باقية في العينة؛ لا تعميم|
|[FoGII Medieval](02-games/field-of-glory-ii-medieval.md)|FG1–3 مطور؛FG4 نقد؛FG5 نقاش|متوسطة–عالية للقواعد|COMPLETE|تحسن الفهم UNKNOWN؛ PDF مفهرس جزئيًا|
|[Dominions6](02-games/dominions-6.md)|DO1/5/6 مطور؛DO3 نقد؛DO4 feedback|متوسطة|COMPLETE|QoL جزئي؛ عبء النهاية الحالي UNKNOWN|
|[Battle Brothers](02-games/battle-brothers.md)|BB1–3/6 مطور؛BB4 نقد؛BB5 feedback|متوسطة|COMPLETE|retreat معلن؛ لم يُعد اختباره|
|[Anno1800](02-games/anno-1800.md)|AN1/2 مطور؛AN3 نقد؛AN4/5 feedback|متوسطة–عالية للتسلسل|COMPLETE|stats PARTIALLY_FIXED؛ ليس كل العبء|
|[Against the Storm](02-games/against-the-storm.md)|AS1–3 مطور؛AS4/5 نقد؛AS6 feedback|متوسطة|COMPLETE|تحكم موارد موثق؛ repetition UNKNOWN|

## حقيقة الاختبار
الفحوص المنفذة في Agent6 تخص الوثائق ونطاق Git وحالة الأداة؛ اختبارات اللعبة المستقبلية NOT EXECUTED. أدلةPhaseR السابقة ليست تشغيلًا جديدًا. لا POC ثنائي تجاري. النواقص المعرفية لا تُحوّل إلى نجاح؛ فحصها مستقبلًا يحتاج نطاقًا جديدًا.

**التوقف إلزامي:** لا تنفيذ أو PR للدمج أو نشر أو تعديل أعمال Agent4/5. استئناف بعد موافقة المالك على مهمة لاحقة محددة.
