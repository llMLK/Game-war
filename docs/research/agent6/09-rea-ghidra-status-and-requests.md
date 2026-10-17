# REA/Ghidra — حالة مثبتة وطلب مؤجل
**NOT RUN / BLOCKED لتحليل هدف بعينه:** لا ملف محلي مصرح بمساره، ولا سؤال تقني يستلزم تفكيكًا الآن. الأدوات متصلة؛ هذا ليس عائقًا للبحث الوثائقي. لا ملفات تجارية مفتوحة أو hashes/offsets/symbols خاصة بألعاب.

## التشخيص الحقيقي
[rea-status.json](evidence/rea-status.json) يحفظ خلاصة read-only من binary_session({}):
- server/package rea-agents/rea6.5.0؛ open:false وanalysis_provider_binding:null.
- Ghidra candidate متاح، selected:false؛ diagnostics version12.1.4، Java21.0.12.1، Windows11 amd64. فحوص configuration/platform/architecture/installation/version/headless/decompiler/java المعلنة ناجحة.
- المسار الذي أرجعه المزود: C:/tools/ghidra_12.1.4_PUBLIC_20260921/ghidra_12.1.4_PUBLIC. لا تخمين مسارات أو تعديل إعدادات.
- profile Windows يعلن قبول native x86/x64 PE وraw6502 محدد؛ mutation لقاعدة البيانات غير متاح. readiness لا يثبت import/decompile ناجحًا، أو قانونية هدف.
- لا تثبيت/تنزيل أو doctor/config repair أو scan أو hooking أو DRM أو أسرار أو أصول. مصدر مشروعناJS قرئ مباشرة.

## Analysis Request Card A6-REA-01 — DEFERRED، غير مصرح بالتشغيل
Technical details are English to make the admission boundary precise.
1. **Question/value:** Does an officially published Dominions6 replay/order format expose seed and rules identity tied to initial state/orders? Potential G1B/G2 evidence organization reference only; it cannot establish our determinism or fun.
2. **Prior evidence/gap:** DO1/DO3 establish preparation and resolution. The official docs page advertises file-format documentation; its full technical contents were not read. Begin with sanctioned documentation, not decompilation.
3. **Target:** Dominions6 exact build UNVERIFIED; authorized local path NOT SUPPLIED. No file selected, searched for or opened.
4. **Minimum capability:** Read one public format document or an owner-supplied permitted synthetic replay. No Ghidra needed if documentation answers the question. Native call graphs would require a different material unresolved question and admitted local target.
5. **Proposed bound:** One named document/file, at most30 minutes and five focused read calls. Stop when fields/version support are established or remain undocumented. This research budget grants no permission.
6. **Falsification:** A seed alone does not prove deterministic execution. Missing expected metadata falsifies only this format hypothesis, not the existence of internal state elsewhere.
7. **Permission/limitations:** CONNECTED; TARGET/PERMISSION UNRESOLVED. A lawful local copy, exact path/build and permissible scope are absent. No permission request is needed to complete the public-source study; any future binary analysis needs that explicit admission.
8. **If later approved:** Record artifact identity/hash where allowed, tool/provider versions, bounded evidence IDs/offsets and uncertainty. Do not copy proprietary code. Stop for owner review before a second title or deeper scope.

**قيمة المحاولة الآن منخفضة (ANALYST-INFERENCE):** تنسيق لعبة أخرى لا يثبت أن نظامنا ممتع أو عادل. لذلك لا POC منفذ ولا ادعاء reverse engineering. يستأنف هذا الطلب فقط إذا ظهر سؤال جوهري وهدف مصرح.
