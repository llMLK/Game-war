'use strict';
// Save compatibility is checked before campaign normalization. Backups keep exact bytes.
const SaveSafety = {
  legacyIndex: 'swords-kingdoms-legacy:v1:index',
  message: 'هذا الحفظ تابع لسيناريو غير مدعوم في هذه النسخة؛ لن يُحذف تلقائيًا. صدّره كملف JSON للاحتفاظ به والعودة إلى إصدار سابق.',
  problem(S, meta) {
    if (!S || typeof S !== 'object' || Array.isArray(S)) return 'بيانات الحملة ناقصة أو تالفة';
    if (S.scenario !== 'umayyad') return this.message;
    if (meta && meta.scenario !== undefined && meta.scenario !== S.scenario) return 'بيانات عنوان الحفظ لا تطابق الحملة؛ بقي الحفظ دون تعديل';
    if (meta && meta.player !== undefined && meta.player !== S.player) return 'الفصيل في عنوان الحفظ لا يطابق الحملة؛ بقي الحفظ دون تعديل';
    if (S.v !== undefined && (!Number.isInteger(S.v) || S.v < 1 || S.v > 5)) return 'نسخة الحفظ غير مدعومة؛ احتفظ بملف JSON';
    if (S.schemaVersion !== undefined && (!Number.isInteger(S.schemaVersion) || S.schemaVersion < 1 || S.schemaVersion > 5)) return 'نسخة بنية الحفظ غير مدعومة؛ احتفظ بملف JSON';
    if (S.rec !== undefined || S.cid !== undefined) return 'بنية الإصدار الرابع الملغى غير مدعومة؛ احتفظ بملف JSON';
    const obj = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!Number.isInteger(S.turn) || S.turn < 0 || !obj(S.factions) || typeof S.player !== 'string' || !Object.hasOwn(S.factions, S.player) || !obj(S.factions[S.player]) ||
        !Object.hasOwn(SCENARIOS.umayyad.factions, S.player) || !Array.isArray(S.nodes) || !S.nodes.length || !Array.isArray(S.armies) ||
        (S.v > 1 && !obj(S.gens)) || (S.difficulty && !['easy', 'normal', 'hard'].includes(S.difficulty))) return 'بيانات الحملة ناقصة أو تالفة؛ بقي الحفظ دون تعديل';
    if (Object.values(S.factions).some(f => !obj(f)) ||
        S.nodes.some(n => !obj(n) || typeof n.id !== 'string' || !obj(S.factions[n.owner])) ||
        S.armies.some(a => !obj(a) || !obj(S.factions[a.fid]) || !Array.isArray(a.regs)) ||
        (S.gens && Object.values(S.gens).some(g => !obj(g)))) return 'بيانات المدن أو القوات ناقصة؛ بقي الحفظ دون تعديل';
    return null;
  },
  readKey(key) {
    const r = store.readText(key);
    if (!r.ok) return { bad: 'تعذّر الوصول إلى التخزين؛ لا يمكن التحقق من الحفظ', raw: null, key };
    if (r.raw === null) return null;
    let data;
    try { data = JSON.parse(r.raw); } catch { return { bad: 'ملف الحفظ تالف؛ يمكنك تصدير بياناته دون تعديلها', raw: r.raw, key }; }
    const S = data && (data.S || (data.v === 1 ? data : null));
    const meta = data && data.meta;
    const bad = data?.S && (!meta || typeof meta !== 'object' || Array.isArray(meta))
      ? 'عنوان الحفظ مفقود أو تالف؛ بقيت بياناته دون تعديل ويمكن تصديرها'
      : this.problem(S, meta);
    // A missing old title is derived from validated campaign data, never the reverse.
    return { S, meta: !bad ? { scenario: S.scenario, player: S.player, fname: S.factions[S.player].name || SCENARIOS.umayyad.factions[S.player].name,
      turn: S.turn, time: Number.isFinite(meta?.time) ? meta.time : 0, over: S.over || null } : null, bad, raw: r.raw, key };
  },
  readSlot(slot) {
    const current = this.readKey(SAVE_PREFIX + slot);
    return current || (slot === 'auto' ? this.readKey(SAVE_KEY_V1) : null);
  },
  writeVerified(key, raw) {
    if (!store.writeText(key, raw)) return false;
    const check = store.readText(key);
    return check.ok && check.raw === raw;
  },
  backup(key, raw) {
    const indexRead = store.readText(this.legacyIndex);
    if (!indexRead.ok) return false;
    let index;
    try { index = indexRead.raw === null ? [] : JSON.parse(indexRead.raw); } catch { return false; }
    if (!Array.isArray(index) || index.some(e => !e || typeof e.key !== 'string')) return false;
    const backupKey = 'swords-kingdoms-legacy:v1:' + hashStr(key) + ':' + hashStr(raw) + ':' + raw.length;
    const existing = store.readText(backupKey);
    if (!existing.ok) return false;
    let payload;
    if (existing.raw !== null) {
      try { payload = JSON.parse(existing.raw); } catch { return false; }
      // Never replace an existing different backup, including a hash collision.
      if (payload.schema !== 1 || payload.sourceKey !== key || payload.raw !== raw) return false;
    } else {
      payload = { schema: 1, sourceKey: key, raw, created: Date.now() };
      if (!this.writeVerified(backupKey, JSON.stringify(payload))) return false;
    }
    if (!index.some(e => e.key === backupKey)) {
      index.push({ key: backupKey, sourceKey: key, created: payload.created });
      if (!this.writeVerified(this.legacyIndex, JSON.stringify(index))) return false;
    }
    // Re-check both records even on retries after an interrupted first attempt.
    const check = store.readText(backupKey), manifest = store.readText(this.legacyIndex);
    return check.ok && check.raw === JSON.stringify(payload) && manifest.ok && manifest.raw === JSON.stringify(index);
  },
  beforeAutosave() {
    for (const key of [SAVE_PREFIX + 'auto', SAVE_KEY_V1]) {
      const d = this.readKey(key);
      if (d?.bad && (d.raw === null || !this.backup(key, d.raw))) return 'لم تبدأ الحملة ولم يُستبدل الحفظ: تعذّر التحقق من النسخة الاحتياطية. أتح مساحة تخزين أو صدّر الحفظ ثم أعد المحاولة.';
    }
    return null;
  },
  backups() {
    const index = store.get(this.legacyIndex);
    if (!Array.isArray(index)) return [];
    return index.map(e => {
      if (!e || typeof e.key !== 'string' || !e.key.startsWith('swords-kingdoms-legacy:v1:')) return null;
      const r = store.get(e.key);
      return r?.schema === 1 && typeof r.raw === 'string' ? { ...e, raw: r.raw } : null;
    }).filter(Boolean);
  },
};
