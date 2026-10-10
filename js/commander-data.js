'use strict';
// Period-relative biographies. References and simulation assumptions: docs/leader-research.md.
// Legacy entries only identify older saves and never enter new recruitment.
const CMD_CATALOG = {
  "threeKingdoms": [
    {
      "n": "ليو باي",
      "trait": "merchant",
      "flaw": null,
      "lead": 3,
      "fame": 55,
      "src": "hist",
      "wiki": "Liu_Bei",
      "ar": "ليو باي",
      "bio": "أمير حرب نشأ بعيداً عن قصور البلاط. جمعت حوله سنوات الترحال رجالاً يثقون به، لكنه ما زال يبحث عن أرض تحفظ لأتباعه مقاماً.",
      "born": 161,
      "at": "shu",
      "ruler": true,
      "died": 223,
      "skills": {
        "diplomacy": 3,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "جامع الرجال",
      "personality": "يحفظ الرفقة ويحتاج إلى رجال يديرون المال",
      "persona": "loyal",
      "aptitudes": {
        "command": 3,
        "logistics": 2,
        "stewardship": 2,
        "influence": 5,
        "scouting": 2,
        "resolve": 4
      },
      "ties": [
        "قوان يو",
        "جانغ في",
        "جاو يون"
      ]
    },
    {
      "n": "قوان يو",
      "trait": "brave",
      "flaw": "arrogant",
      "lead": 4,
      "fame": 48,
      "src": "hist",
      "wiki": "Guan_Yu",
      "ar": "كوان يو",
      "bio": "رفيق ليو باي منذ البدايات. يعرفه الجنود بثباته وعزة نفسه؛ صلته بسيده أمتن من صلته برجال البلاط.",
      "at": "shu",
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "معتد بنفسه",
      "identity": "رفيق العهد",
      "personality": "يثق بالعهد ويغضب من الإهانة",
      "persona": "proud",
      "aptitudes": {
        "command": 4,
        "logistics": 2,
        "stewardship": 1,
        "influence": 4,
        "scouting": 2,
        "resolve": 5
      },
      "ties": [
        "ليو باي",
        "جانغ في"
      ]
    },
    {
      "n": "جانغ في",
      "trait": "brave",
      "flaw": "harsh",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhang_Fei",
      "ar": "جانغ فاي",
      "bio": "من أقدم رجال ليو باي وأشدهم بأساً. يبعث حضوره الجرأة في المقدمة، وتثقل شدته على صغار الجند.",
      "at": "shu",
      "died": 221,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": "صوت المقدمة",
      "personality": "يريد القيادة في الميدان ويكره الانتظار",
      "persona": "bold",
      "aptitudes": {
        "command": 3,
        "logistics": 1,
        "stewardship": 1,
        "influence": 2,
        "scouting": 3,
        "resolve": 5
      },
      "ties": [
        "ليو باي",
        "قوان يو"
      ]
    },
    {
      "n": "جاو يون",
      "trait": "cavalier",
      "flaw": null,
      "lead": 4,
      "fame": 32,
      "src": "hist",
      "wiki": "Zhao_Yun",
      "ar": "جاو يون",
      "bio": "فارس شمالي خدم غونغسون زان قبل أن يلتحق بليو باي. يميل إلى الانضباط وحماية الرجال عند اضطراب الصفوف.",
      "at": "shu",
      "died": 229,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "حارس الرجال",
      "personality": "يريد نجاة رجاله قبل مجد اسمه",
      "persona": "loyal",
      "aptitudes": {
        "command": 4,
        "logistics": 3,
        "stewardship": 2,
        "influence": 2,
        "scouting": 4,
        "resolve": 5
      },
      "ties": [
        "ليو باي"
      ]
    },
    {
      "n": "جوغه ليانغ",
      "trait": "elite",
      "flaw": null,
      "lead": 3,
      "fame": 18,
      "src": "hist",
      "wiki": "Zhuge_Liang",
      "ar": "تشوغ ليانغ",
      "bio": "وافد شاب من بيت علم إلى مجلس ليو باي. أمضى أعواماً في جينغ يدرس أحوال الأقاليم؛ يرى في التحالف وحسن التدبير طريقاً لبناء دولة.",
      "born": 181,
      "at": "shu",
      "died": 234,
      "skills": {
        "diplomacy": 2,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "صاحب الخطة",
      "personality": "يعد الموارد والتحالفات قبل أن يطلب معركة",
      "persona": "careful",
      "aptitudes": {
        "command": 3,
        "logistics": 5,
        "stewardship": 4,
        "influence": 3,
        "scouting": 3,
        "resolve": 3
      }
    },
    {
      "n": "هوانغ جونغ",
      "trait": "archer",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Huang_Zhong",
      "ar": null,
      "bio": "قائد مخضرم من رجال جينغ، له خبرة طويلة في حاميات الجنوب. يفضّل الصبر وثبات الموقع على الاندفاع.",
      "at": "cand",
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aff": "shu",
      "from": 209,
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "وي يان",
      "trait": "mountaineer",
      "flaw": "arrogant",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Wei_Yan",
      "ar": null,
      "bio": "جندي طموح من محيط جينغ، يبحث عن قيادة تُظهر قدرته. صريح في رأيه، قليل الصبر على التردد.",
      "at": "cand",
      "aff": "shu",
      "from": 209,
      "to": 234,
      "died": 234,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "معتد بنفسه",
      "identity": null,
      "personality": "معتد بنفسه؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "ambitious",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ما ليانغ",
      "trait": "logistician",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ma_Liang_(Three_Kingdoms)",
      "ar": null,
      "bio": "من أسرة متعلمة في جينغ، وله سمعة حسنة في الفهم والمشورة. يرى أن كسب أهل المدينة يسبق جباية مالها.",
      "born": 187,
      "at": "cand",
      "aff": "shu",
      "from": 208,
      "to": 222,
      "died": 222,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 2,
        "influence": 1
      }
    },
    {
      "n": "بانغ تونغ",
      "trait": "tactician",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Pang_Tong",
      "ar": "بانغ تونغ",
      "bio": "رجل من شيانغيانغ معروف في مجالس العلم بحسن تقديره للرجال. لا يلفت مظهره الأنظار بقدر ما تفعل مشورته.",
      "born": 179,
      "at": "cand",
      "aff": "shu",
      "from": 209,
      "to": 214,
      "died": 214,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "فا جنغ",
      "trait": "tactician",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Fa_Zheng",
      "ar": null,
      "bio": "من أسرة عريقة في الشمال الغربي، رحل إلى إقليم يي في خدمة ليو جانغ. يعرف دهاليز بلاطه ويبحث عن سيد يثق بمشورته.",
      "born": 176,
      "at": "cand",
      "aff": "shu",
      "from": 211,
      "to": 220,
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "chengdu",
        "jiangzhou",
        "yongan"
      ]
    },
    {
      "n": "ما تشاو",
      "trait": "cavalier",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Ma_Chao",
      "ar": null,
      "bio": "ابن ما تنغ، نشأ بين فرسان الحدود الغربية. له أتباع واسم عائلي ثقيل؛ استقلال رأيه يجعل قيادته مكسباً ومسؤولية.",
      "born": 176,
      "at": "cand",
      "aff": "shu",
      "from": 214,
      "to": 222,
      "died": 222,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "proud",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "hanzhong",
        "tianshui",
        "wuwei"
      ]
    },
    {
      "n": "وانغ بينغ",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Wang_Ping_(Three_Kingdoms)",
      "ar": null,
      "bio": "رجل من جند هانزونغ، قليل الكتابة شديد العناية بشؤون الجند. يعرف قيمة الطريق الآمن والموقع الذي لا ينكشف.",
      "at": "cand",
      "aff": "shu",
      "from": 219,
      "to": 248,
      "died": 248,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "hanzhong"
      ]
    },
    {
      "n": "جيانغ وي",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Jiang_Wei",
      "ar": null,
      "bio": "ضابط من تيانشوي في الشمال الغربي، نشأ في أسرة عسكرية. يجمع الطموح إلى دراسة الحرب والانضباط.",
      "born": 202,
      "at": "cand",
      "aff": "shu",
      "from": 228,
      "to": 264,
      "died": 264,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "tianshui",
        "hanzhong"
      ]
    },
    {
      "n": "ما داي",
      "trait": "cavalier",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ma_Dai",
      "ar": null,
      "bio": "فارس من عشيرة ما في الشمال الغربي. يعرف طرق الحدود وخدمة جيوش الخيل، ويعوّل على روابط أهله.",
      "at": "cand",
      "aff": "shu",
      "from": 214,
      "to": 235,
      "died": 235,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "hanzhong",
        "tianshui",
        "wuwei"
      ]
    },
    {
      "n": "لي يان",
      "trait": "logistician",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Li_Yan_(Three_Kingdoms)",
      "ar": null,
      "bio": "صاحب خبرة في الإدارة والجند بإقليم يي. يعتد بمكانته ويطلب صلاحيات واضحة قبل قبول المسؤولية.",
      "at": "cand",
      "aff": "shu",
      "from": 214,
      "to": 231,
      "died": 231,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 2,
        "influence": 1
      }
    },
    {
      "n": "منغ دا",
      "trait": "swift",
      "flaw": "disloyal",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Meng_Da",
      "ar": null,
      "bio": "ضابط من رجال إقليم يي. يصغي إلى موازين القوة ويبحث عن موضع يضمن له النفوذ والاستقلال.",
      "at": "cand",
      "from": 211,
      "to": 228,
      "died": 228,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "حسابي",
      "identity": null,
      "personality": "حسابي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "chengdu",
        "jiangzhou",
        "yongan"
      ]
    },
    {
      "n": "هوانغ تشيوان",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Huang_Quan_(general)",
      "ar": null,
      "bio": "موظف وقائد من إقليم يي، معروف بتقدير المخاطر قبل الحركة. لا يخفي رأيه حين يرى الخطة تهدد الجيش.",
      "at": "cand",
      "from": 214,
      "to": 240,
      "died": 240,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "chengdu",
        "jiangzhou",
        "yongan"
      ]
    },
    {
      "n": "ليو با",
      "trait": "merchant",
      "flaw": null,
      "lead": 1,
      "fame": 30,
      "src": "hist",
      "wiki": "Liu_Ba",
      "ar": null,
      "bio": "رجل من لينغلينغ ذو خبرة في الدواوين. تشغله سلامة الخزينة وتوزيع الموارد أكثر مما تشغله أبهة القيادة.",
      "at": "cand",
      "aff": "shu",
      "from": 214,
      "to": 222,
      "died": 222,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "austere",
      "aptitudes": {
        "command": 1,
        "logistics": 4,
        "stewardship": 5,
        "influence": 3,
        "scouting": 1,
        "resolve": 3
      },
      "region": [
        "chengdu",
        "jiangzhou",
        "changsha"
      ]
    },
    {
      "n": "تساو تساو",
      "trait": "tactician",
      "flaw": "harsh",
      "lead": 5,
      "fame": 70,
      "src": "hist",
      "wiki": "Cao_Cao",
      "ar": "تساو تساو",
      "bio": "يسيطر على بلاط هان ويقود أقوى تجمع للجند في الشمال. شاعر وإداري وقائد يقدّر الكفاءة، ويطالب رجاله بالطاعة والحسم.",
      "born": 155,
      "at": "wei",
      "ruler": true,
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 2
      },
      "temperament": "صارم",
      "identity": "منظم الشمال",
      "personality": "يريد الكفاءة والحسم ويضيق بالتردد",
      "persona": "ambitious",
      "aptitudes": {
        "command": 5,
        "logistics": 4,
        "stewardship": 4,
        "influence": 5,
        "scouting": 3,
        "resolve": 4
      },
      "ties": [
        "شياهو دون",
        "شياهو يوان"
      ]
    },
    {
      "n": "شياهو دون",
      "trait": "brave",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Xiahou_Dun",
      "ar": null,
      "bio": "من أقدم رجال تساو تساو، يجمع القيادة إلى إدارة الأقاليم. فقد عيناً في القتال وبقيت صلته بسيده وثيقة.",
      "at": "wei",
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "loyal",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 4,
        "influence": 3,
        "scouting": 1,
        "resolve": 5
      },
      "ties": [
        "تساو تساو"
      ]
    },
    {
      "n": "شياهو يوان",
      "trait": "swift",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Xiahou_Yuan",
      "ar": null,
      "bio": "قريب تساو تساو وصاحب خبرة في الحشد والإمداد. يتحرك بسرعة لنجدة المواضع المهددة قبل أن يستقر العدو فيها.",
      "at": "wei",
      "died": 219,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "bold",
      "aptitudes": {
        "command": 3,
        "logistics": 4,
        "stewardship": 2,
        "influence": 2,
        "scouting": 5,
        "resolve": 4
      },
      "ties": [
        "تساو تساو"
      ]
    },
    {
      "n": "جانغ لياو",
      "trait": "cavalier",
      "flaw": null,
      "lead": 4,
      "fame": 40,
      "src": "hist",
      "wiki": "Zhang_Liao",
      "ar": null,
      "bio": "خدم قادة عدة قبل أن يستقر في خدمة تساو تساو. برز في حملات الشمال، ويحب المبادرة حين يرى خصمه مرتبكاً.",
      "born": 169,
      "at": "wei",
      "died": 222,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "bold",
      "aptitudes": {
        "command": 4,
        "logistics": 2,
        "stewardship": 1,
        "influence": 3,
        "scouting": 4,
        "resolve": 5
      }
    },
    {
      "n": "سيما يي",
      "trait": "defender",
      "flaw": "disloyal",
      "lead": 2,
      "fame": 12,
      "src": "hist",
      "wiki": "Sima_Yi",
      "ar": "سيما يي",
      "bio": "رجل متعلم من أسرة ذات مكانة في هني. يدخل الخدمة بعين حذرة وطموح لا يعلنه بسهولة؛ سمعته أوسع في المشورة منها في الميدان.",
      "born": 179,
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 251,
      "died": 251,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 3
      },
      "temperament": "حسابي",
      "identity": "قارئ المجلس",
      "personality": "يصبر وينتظر حتى يتضح ميزان القوة",
      "persona": "ambitious",
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 4,
        "influence": 2,
        "scouting": 3,
        "resolve": 4
      }
    },
    {
      "n": "تساو رن",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Cao_Ren",
      "ar": null,
      "bio": "قريب تساو تساو ومن رجاله الموثوقين. تعلّم قيادة المشاة والفرسان في حملات طويلة، ويشد الصف حين يتراجع غيره.",
      "born": 168,
      "at": "wei",
      "died": 223,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شو هوانغ",
      "trait": "siege",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Xu_Huang",
      "ar": null,
      "bio": "بدأ في جند الأقاليم ثم التحق بتساو تساو. يعرفه رجاله بالانضباط وإبقاء المعسكر منظماً حتى في الطريق.",
      "at": "wei",
      "died": 227,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "جانغ خه",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhang_He",
      "ar": "تشانغ هي (ضابط)",
      "bio": "قائد مخضرم انتقل من معسكر يوان شاو إلى تساو تساو. يحسن قراءة الأرض وتغيير موضع الجيش قبل الاشتباك.",
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 231,
      "died": 231,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تساو تشون",
      "trait": "elite",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Cao_Chun",
      "ar": null,
      "bio": "من عشيرة تساو، ويتولى فرسان النمر والفهد. يحسن جمع رجال الخيل واختيار من يصلح للخدمة القريبة من القائد.",
      "born": 170,
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 210,
      "died": 210,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شون يو",
      "trait": "merchant",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Xun_Yu",
      "ar": null,
      "bio": "مستشار تساو تساو في شؤون الدولة والرجال. يدافع عن انتظام الدواوين ومكانة بلاط هان، ولا يزن كل قرار بالغنيمة.",
      "born": 163,
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 212,
      "died": 212,
      "skills": {
        "diplomacy": 1,
        "administration": 3,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "ميزان الديوان",
      "personality": "يربط خدمة الحاكم بانتظام الدولة",
      "aptitudes": {
        "command": 2,
        "stewardship": 4,
        "influence": 2
      }
    },
    {
      "n": "يو جين",
      "trait": "logistician",
      "flaw": "disloyal",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Yu_Jin",
      "ar": null,
      "bio": "خدم تساو تساو منذ بدايات الحروب. يرى النظام والقانون عماد الجيش ولو أثقلت شدته على الجنود.",
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 221,
      "died": 221,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "حسابي",
      "identity": null,
      "personality": "حسابي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 2,
        "influence": 1
      }
    },
    {
      "n": "شو تشو",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Xu_Chu",
      "ar": null,
      "bio": "رجل شديد القوة من ريف تشياو، صار من حرس تساو تساو. قليل الكلام، يقدم حماية سيده على طلب المجد لنفسه.",
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 230,
      "died": 230,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "دنغ آي",
      "trait": "mountaineer",
      "flaw": "cautious",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Deng_Ai",
      "ar": null,
      "bio": "رجل من أصول متواضعة عُني بأعمال الزراعة والإدارة. يدرس الأرض ومسالكها كما يدرس حساب المحاصيل والمؤن.",
      "born": 197,
      "at": "cand",
      "aff": "wei",
      "from": 230,
      "to": 264,
      "died": 264,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "متأنٍ",
      "identity": null,
      "personality": "متأنٍ؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بانغ دي",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Pang_De",
      "ar": null,
      "bio": "فارس من رجال ليانغ، خدم عشيرة ما في الغرب. صلب في القتال ويطلب أن يحكم عليه الناس بفعله.",
      "at": "cand",
      "from": 211,
      "to": 219,
      "died": 219,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تساو جانغ",
      "trait": "cavalier",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Cao_Zhang",
      "ar": null,
      "bio": "ابن تساو تساو، يميل إلى الرمي والخيل أكثر من شؤون الدواوين. يطلب قيادة ميدانية تثبت قدرته بعيداً عن اسم أبيه.",
      "at": "cand",
      "aff": "wei",
      "from": 216,
      "to": 223,
      "died": 223,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تساو شيو",
      "trait": "swift",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Cao_Xiu",
      "ar": null,
      "bio": "من عشيرة تساو، نشأ في رعاية قريبِه تساو تساو. خبرته متصلة بالخيل والمرافقة العسكرية، وله طموح إلى قيادة مستقلة.",
      "at": "cand",
      "aff": "wei",
      "from": 217,
      "to": 228,
      "died": 228,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شو شو",
      "trait": "tactician",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Xu_Shu",
      "ar": null,
      "bio": "رجل من يينغتشوان انتقل من حياة السلاح إلى طلب العلم. يعرف ليو باي ومجالس جينغ، ويقدّر الروابط الشخصية في اختياره.",
      "at": "cand",
      "from": 208,
      "to": 234,
      "died": 234,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "لي ديان",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Li_Dian",
      "ar": "لي ديان",
      "bio": "قائد من يانتشو خدم تساو تساو في حملات الشمال. يقبل المشورة ويعنى بتوفير حاجات الجند قبل القتال.",
      "at": "cand",
      "aff": "wei",
      "from": 200,
      "to": 217,
      "died": 217,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "مان تشونغ",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Man_Chong",
      "ar": null,
      "bio": "موظف وقائد في خدمة تساو تساو. له خبرة في القضاء وضبط المدن، ولا يتساهل مع من يعبث بالنظام.",
      "at": "cand",
      "aff": "wei",
      "from": 208,
      "to": 242,
      "died": 242,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "سون تشوان",
      "trait": "merchant",
      "flaw": "cautious",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Sun_Quan",
      "ar": "سون تشوان",
      "bio": "ورث سلطة أسرته في جيانغدونغ وهو شاب. يستند إلى أسر محلية وقادة مخضرمين، ويحتاج إلى الموازنة بينهم لحفظ استقلاله.",
      "born": 182,
      "at": "wu",
      "ruler": true,
      "died": 252,
      "skills": {
        "diplomacy": 2,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "متأنٍ",
      "identity": "وازن البيوت",
      "personality": "يوازن بين كبار الرجال ويحتاج إلى مشورة صريحة",
      "persona": "pragmatic",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 4,
        "influence": 5,
        "scouting": 2,
        "resolve": 3
      },
      "ties": [
        "جو يو",
        "لو سو"
      ]
    },
    {
      "n": "جو يو",
      "trait": "naval",
      "flaw": null,
      "lead": 4,
      "fame": 50,
      "src": "hist",
      "wiki": "Zhou_Yu",
      "ar": null,
      "bio": "رفيق سون تسه ومن أبرز رجال جيانغدونغ. جمع خبرة الأنهار إلى تدبير الجند، ويملك ثقة واسعة في مجلس سون تشوان.",
      "born": 175,
      "at": "wu",
      "died": 210,
      "skills": {
        "diplomacy": 1,
        "administration": 0,
        "intrigue": 2
      },
      "temperament": "عملي",
      "identity": "عين النهر",
      "personality": "يطلب خطة منسجمة وقيادة لا تتنازعها الأوامر",
      "persona": "proud",
      "aptitudes": {
        "command": 4,
        "logistics": 4,
        "stewardship": 3,
        "influence": 4,
        "scouting": 3,
        "resolve": 4
      },
      "ties": [
        "سون تشوان"
      ]
    },
    {
      "n": "لو منغ",
      "trait": "tactician",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Lü_Meng",
      "ar": null,
      "bio": "قائد صعد من صفوف الجند في خدمة آل سون. جريء ويعتني بالتعلم، ويسعى إلى أن يثبت أن خبرة الميدان تصنع قائداً.",
      "born": 178,
      "at": "wu",
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "غان نينغ",
      "trait": "elite",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Gan_Ning",
      "ar": "غان نينغ",
      "bio": "ترك حياة الغارات النهرية والتحق بسون تشوان. يعرف مجاري المياه وحركة الليل، وشدته تحتاج إلى يد تضبطها.",
      "at": "wu",
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 2
      },
      "temperament": "اندفاعي",
      "identity": "رجل الغارة",
      "personality": "يفضل المبادرة ولا يلائم الانتظار الطويل",
      "persona": "bold",
      "aptitudes": {
        "command": 3,
        "logistics": 2,
        "stewardship": 1,
        "influence": 2,
        "scouting": 5,
        "resolve": 5
      },
      "rivals": [
        "لينغ تونغ"
      ]
    },
    {
      "n": "تشنغ بو",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Cheng_Pu",
      "ar": null,
      "bio": "خدم ثلاثة من بيت سون وتعلّم الحرب مع جيل المؤسسين. يعرفه الجنود بصبر المخضرم، ويطلب احترام أقدميته.",
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 210,
      "died": 210,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "هان دانغ",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Han_Dang",
      "ar": null,
      "bio": "من رجال سون جيان القدماء، ماهر بالسلاح والخيل. خبرته متصلة بقيادة المشاة في حملات الجنوب الطويلة.",
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 227,
      "died": 227,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "هوانغ غاي",
      "trait": "naval",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Huang_Gai",
      "ar": null,
      "bio": "مخضرم من رجال سون جيان، صاحب خبرة في القتال وإدارة المدن. يقبل المشقة ويطلب من رجاله مثلها.",
      "at": "wu",
      "died": 215,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "austere",
      "aptitudes": {
        "command": 3,
        "logistics": 4,
        "stewardship": 3,
        "influence": 3,
        "scouting": 2,
        "resolve": 5
      }
    },
    {
      "n": "لينغ تونغ",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ling_Tong",
      "ar": "لينغ تونغ",
      "bio": "قائد شاب خلف أباه في الخدمة بعد مقتله. يحمل حماسة الفتى ومسؤولية اسم عائلته، وخصومات لم تهدأ بعد.",
      "born": 189,
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 217,
      "died": 217,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "proud",
      "rivals": [
        "غان نينغ"
      ],
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "لو سو",
      "trait": "logistician",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Lu_Su",
      "ar": null,
      "bio": "رجل من أسرة موسرة وهب جهده لسون تشوان. يفكر في التحالفات وميزان الأقاليم، ويستطيع الحديث مع قادة المعسكرات المختلفة.",
      "born": 172,
      "at": "wu",
      "died": 217,
      "skills": {
        "diplomacy": 3,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "صانع الأحلاف",
      "personality": "يفضل شريكاً موثوقاً على غنيمة قصيرة",
      "persona": "pragmatic",
      "aptitudes": {
        "command": 2,
        "logistics": 4,
        "stewardship": 4,
        "influence": 5,
        "scouting": 2,
        "resolve": 3
      },
      "ties": [
        "سون تشوان"
      ]
    },
    {
      "n": "جو تاي",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhou_Tai",
      "ar": null,
      "bio": "قائد خدم آل سون في حروب جيانغدونغ. حمل جسده جراحاً من حماية سيده؛ وفاؤه أساس مكانته بين الرجال.",
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 223,
      "died": 223,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "جيانغ تشين",
      "trait": "naval",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Jiang_Qin",
      "ar": null,
      "bio": "خدم سون تسه ثم سون تشوان في حملات الأنهار. يعتني بانضباط المراكب والجند، ولا يحب الإسراف في المعسكر.",
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 220,
      "died": 220,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "جو هوان",
      "trait": "siege",
      "flaw": "arrogant",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhu_Huan",
      "ar": null,
      "bio": "رجل من أسر جيانغدونغ دخل خدمة سون تشوان. يطلب قيادة تتيح له إظهار قدرته ولا يرضى طويلاً بالمهمات الصغيرة.",
      "born": 177,
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 238,
      "died": 238,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "معتد بنفسه",
      "identity": null,
      "personality": "معتد بنفسه؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "لو شون",
      "trait": "defender",
      "flaw": null,
      "lead": 4,
      "fame": 30,
      "src": "hist",
      "wiki": "Lu_Xun_(Eastern_Wu)",
      "ar": null,
      "bio": "من أسرة راسخة في وو، بدأ في أعمال الإدارة وضبط الريف. يفضل إعداد الخطة وتأمين الناس قبل طلب معركة كبيرة.",
      "born": 183,
      "at": "cand",
      "aff": "wu",
      "from": 215,
      "to": 245,
      "died": 245,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 4,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "جو ران",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhu_Ran",
      "ar": null,
      "bio": "عرف سون تشوان منذ الصغر، وله خبرة في إدارة المقاطعات. يطلب رجالاً منضبطين وموضعاً يستطيع الثبات فيه.",
      "born": 182,
      "at": "cand",
      "aff": "wu",
      "from": 212,
      "to": 249,
      "died": 249,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شو شنغ",
      "trait": "naval",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Xu_Sheng",
      "ar": null,
      "bio": "انتقل من الشمال المضطرب إلى جيانغدونغ. اكتسب سمعته من خدمة المواقع الحدودية وحماية أهلها.",
      "at": "cand",
      "aff": "wu",
      "from": 208,
      "to": 229,
      "died": 229,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "دينغ فنغ",
      "trait": "swift",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ding_Feng_(general)",
      "ar": null,
      "bio": "ضابط نشأ في جند الجنوب، يعرف القتال القريب ومشقة الحملات. يطمح إلى موضع أوسع بين قادة وو.",
      "at": "cand",
      "aff": "wu",
      "from": 222,
      "to": 271,
      "died": 271,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "جانغ لو",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Zhang_Lu_(Han_dynasty)",
      "ar": null,
      "bio": "يحكم هانزونغ باسم جماعة المعلمين السماويين. يجمع سلطة الدين إلى إدارة إقليم يحميه الجبل والممر الضيق.",
      "at": "neutral",
      "died": 216,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "منغ هوو",
      "trait": "brave",
      "flaw": "reckless",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Meng_Huo",
      "ar": null,
      "bio": "زعيم من الجنوب تربطه صلات بالنخب المحلية. نفوذه قائم على معرفة الناس والأرض أكثر من مناصب البلاط.",
      "at": "event",
      "died": 230,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "from": 225,
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شي شيه",
      "trait": "merchant",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Shi_Xie",
      "ar": null,
      "bio": "حاكم جياوتشو البعيد عن قلب الصراع، ينتمي إلى أسرة ذات نفوذ محلي. يوازن بين استقلال إقليمه والاعتراف الاسمي بالبلاط.",
      "born": 137,
      "at": "neutral",
      "died": 226,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 3,
        "influence": 1
      }
    },
    {
      "n": "هان سوي",
      "trait": "desert",
      "flaw": "disloyal",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Han_Sui",
      "ar": null,
      "bio": "أمير حرب من ليانغ خبر تقلب أحلاف الغرب. يعتمد على الفرسان وصلاته بزعماء الحدود.",
      "at": "neutral",
      "died": 215,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "حسابي",
      "identity": null,
      "personality": "حسابي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ما تنغ",
      "trait": "cavalier",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ma_Teng",
      "ar": null,
      "bio": "أمير حرب من ليانغ وأب لما تشاو. له جذور بين جماعات الحدود، وتشد موقعه شبكة من الأقارب والفرسان.",
      "at": "neutral",
      "died": 212,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "كبي نينغ",
      "trait": "cavalier",
      "flaw": null,
      "lead": 4,
      "fame": 30,
      "src": "hist",
      "wiki": "Kebineng",
      "ar": null,
      "bio": "زعيم صاعد بين الشيانبي بعد اضطراب موازين الشمال. يجمع فرسان جماعات عدة تحت قيادته.",
      "at": "event",
      "died": 235,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 4,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بو دو غن",
      "trait": "swift",
      "flaw": "harsh",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Budugen",
      "ar": null,
      "bio": "زعيم شيانبي من بيت تانشيهواي. يحاول حفظ نفوذه بين زعماء السهوب وقوة تساو تساو المتنامية.",
      "at": "event",
      "died": 233,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "سو لي",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "مولو ملك الوحوش",
      "trait": "brave",
      "flaw": "reckless",
      "lead": 2,
      "fame": 8,
      "src": "novel",
      "wiki": "List_of_fictional_people_of_the_Three_Kingdoms",
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "وو تو قو",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 8,
      "src": "novel",
      "wiki": "List_of_fictional_people_of_the_Three_Kingdoms",
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تشو رونغ",
      "trait": "swift",
      "flaw": null,
      "lead": 2,
      "fame": 8,
      "src": "novel",
      "wiki": "List_of_fictional_people_of_the_Three_Kingdoms",
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "يو فو لوو",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تشين دا",
      "trait": "swift",
      "flaw": "greedy",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": null,
      "personality": "مساوم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "لوو هاي",
      "trait": "naval",
      "flaw": "greedy",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": null,
      "personality": "مساوم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    }
  ],
  "umayyad": [
    {
      "n": "سليمان بن عبد الملك",
      "trait": "merchant",
      "flaw": "greedy",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Sulayman_ibn_Abd_al-Malik",
      "ar": "سليمان بن عبد الملك",
      "bio": "خليفة من بيت عبد الملك، خبر حكم فلسطين واتخذ الرملة مركزاً له. يقوم نفوذه على صلات البيت الأموي ورجال الشام.",
      "born": 674,
      "at": "umayyad",
      "ruler": true,
      "died": 717,
      "skills": {
        "diplomacy": 2,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": "مجلس الرملة",
      "personality": "يطلب وفاء رجال دولته ويعتني بروابط البيوت",
      "persona": "proud",
      "aptitudes": {
        "command": 2,
        "logistics": 2,
        "stewardship": 4,
        "influence": 5,
        "scouting": 1,
        "resolve": 3
      }
    },
    {
      "n": "مسلمة بن عبد الملك",
      "trait": "siege",
      "flaw": null,
      "lead": 4,
      "fame": 54,
      "src": "hist",
      "wiki": "Maslama_ibn_Abd_al-Malik",
      "ar": "مسلمة بن عبد الملك",
      "bio": "أمير من بيت الخلافة وقائد حملات في الأناضول والقوقاز. خبر الحصون وطول الطريق، ويعرف قيمة اجتماع الجند والمؤن.",
      "at": "umayyad",
      "died": 738,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "رجل الثغور",
      "personality": "يطالب بالمؤن والرجال قبل إطالة الحصار",
      "persona": "austere",
      "aptitudes": {
        "command": 4,
        "logistics": 5,
        "stewardship": 2,
        "influence": 4,
        "scouting": 3,
        "resolve": 5
      }
    },
    {
      "n": "العباس بن الوليد",
      "trait": "cavalier",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Al-Abbas_ibn_al-Walid",
      "ar": "العباس بن الوليد بن عبد الملك",
      "bio": "أمير أموي برز في حملات الثغور الرومية. يرتبط اسمه بالجند الشامي وبالقتال على طرق الحصون.",
      "at": "umayyad",
      "died": 750,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "bold",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 1,
        "influence": 3,
        "scouting": 4,
        "resolve": 4
      }
    },
    {
      "n": "الجراح الحكمي",
      "trait": "brave",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Al-Jarrah_ibn_Abdallah_al-Hakami",
      "ar": "الجراح الحكمي",
      "bio": "قائد من قبيلة حكم، خبر الخدمة العسكرية والإدارية في العراق. يعتني بضبط المعسكر والوفاء بالتكاليف الموكلة إليه.",
      "at": "umayyad",
      "died": 730,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 1
      },
      "temperament": "اندفاعي",
      "identity": "ضابط المعسكر",
      "personality": "يربط الثقة بالالتزام والانضباط",
      "persona": "austere",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 3,
        "influence": 2,
        "scouting": 3,
        "resolve": 5
      }
    },
    {
      "n": "محمد بن مروان",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Muhammad_ibn_Marwan",
      "ar": "محمد بن مروان",
      "bio": "أمير مخضرم من البيت الأموي، أمضى أعواماً على جبهة أرمينية والجزيرة. يحمل خبرة طويلة وشبكة رجال في الثغور.",
      "at": "umayyad",
      "died": 720,
      "skills": {
        "diplomacy": 2,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "ذاكرة الحدود",
      "personality": "ينظر إلى الجبهات بعين المخضرم",
      "persona": "careful",
      "aptitudes": {
        "command": 3,
        "logistics": 4,
        "stewardship": 2,
        "influence": 4,
        "scouting": 3,
        "resolve": 4
      }
    },
    {
      "n": "عمر بن هبيرة",
      "trait": "naval",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Umar_ibn_Hubayra",
      "ar": "عمر بن هبيرة",
      "bio": "قائد من فزارة اشترك في حملات الثغور. له صلات برجال قيس ويطلب أن يقرن النفوذ السياسي بقيادة الجند.",
      "at": "umayyad",
      "died": 726,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "ambitious",
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 2,
        "influence": 4,
        "scouting": 3,
        "resolve": 3
      }
    },
    {
      "n": "سعيد الحرشي",
      "trait": "swift",
      "flaw": "harsh",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Sa'id_ibn_Amr_al-Harashi",
      "ar": "سعيد بن عمرو الحرشي",
      "bio": "قائد من جند الشام، يعرف حملات الثغور ومشقة الحصار. يميل إلى تنفيذ المهمة بقوة وثبات.",
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 735,
      "died": 735,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "مروان بن محمد",
      "trait": "tactician",
      "flaw": null,
      "lead": 2,
      "fame": 12,
      "src": "hist",
      "wiki": "Marwan_II",
      "ar": "مروان بن محمد",
      "bio": "أمير شاب من بيت مروان نشأ قريباً من جند الجزيرة. يتطلع إلى قيادة مستقلة تثبت مكانته بين أبناء البيت الأموي.",
      "born": 691,
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 750,
      "died": 750,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "ambitious",
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 2,
        "influence": 3,
        "scouting": 3,
        "resolve": 4
      }
    },
    {
      "n": "بشر بن الوليد",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Bishr_ibn_al-Walid",
      "ar": "بشر بن الوليد بن عبد الملك",
      "bio": "أمير من أبناء الوليد، سبق له قيادة حملات على الروم. يرتبط بطبقة الأمراء القادة ورجال الثغور.",
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 745,
      "died": 745,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "bold",
      "aptitudes": {
        "command": 2,
        "logistics": 2,
        "stewardship": 1,
        "influence": 3,
        "scouting": 4,
        "resolve": 3
      }
    },
    {
      "n": "خالد القسري",
      "trait": "merchant",
      "flaw": "greedy",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Khalid_al-Qasri",
      "ar": "خالد القسري",
      "bio": "والي مكة من قبيلة بجيلة، تمرس بأمور الحكم والجباية. يعرف أثر الكلمة والعطاء في تثبيت السلطة.",
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 743,
      "died": 743,
      "skills": {
        "diplomacy": 1,
        "administration": 3,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": "صاحب الديوان",
      "personality": "يعتني باستقامة المال ويطالب بصلاحيات واضحة",
      "persona": "pragmatic",
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 5,
        "influence": 4,
        "scouting": 1,
        "resolve": 3
      }
    },
    {
      "n": "سليمان بن معاذ",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 8,
      "src": "hist",
      "wiki": "Siege_of_Constantinople_(717–718)",
      "ar": null,
      "bio": "من رجال الحملات الشامية، تتصل خدمته بتجهيز الجند والسفن. يطلب مهمة واضحة ومؤناً تكفيها.",
      "at": "cand",
      "aff": "umayyad",
      "from": 717,
      "to": 720,
      "died": 720,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "يزيد بن المهلب",
      "trait": "logistician",
      "flaw": "disloyal",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Yazid_ibn_al-Muhallab",
      "ar": "يزيد بن المهلب",
      "bio": "ابن بيت عسكري نافذ، له خبرة بخراسان وصلات واسعة في العراق. يجمع الكرم والطموح إلى رغبة قوية في استعادة موقع أسرته.",
      "born": 672,
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 720,
      "died": 720,
      "skills": {
        "diplomacy": 2,
        "administration": 1,
        "intrigue": 1
      },
      "temperament": "حسابي",
      "identity": "صاحب الأتباع",
      "personality": "يريد النفوذ والعطاء ومكانة تليق ببيته",
      "persona": "ambitious",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 3,
        "influence": 5,
        "scouting": 2,
        "resolve": 4
      },
      "region": [
        "العراق"
      ]
    },
    {
      "n": "هشام بن عبد الملك",
      "trait": "merchant",
      "flaw": "cautious",
      "lead": 2,
      "fame": 18,
      "src": "hist",
      "wiki": "Hisham_ibn_Abd_al-Malik",
      "ar": "هشام بن عبد الملك",
      "bio": "أمير من بيت عبد الملك، نشأ بين رجال الحكم ودواوين الشام. يميل إلى متابعة الحساب والتفاصيل قبل اتخاذ القرار.",
      "born": 691,
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 743,
      "died": 743,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "متأنٍ",
      "identity": "صاحب الحساب",
      "personality": "متأنٍ؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "careful",
      "aptitudes": {
        "command": 2,
        "logistics": 4,
        "stewardship": 5,
        "influence": 3,
        "scouting": 1,
        "resolve": 3
      }
    },
    {
      "n": "عبد الله البطال",
      "trait": "brave",
      "flaw": null,
      "lead": 3,
      "fame": 24,
      "src": "hist",
      "wiki": "Abdallah_al-Battal",
      "ar": "عبد الله البطال",
      "bio": "قائد من رجال الثغور، خبر الغارات على الأناضول. سمعته بين الجند متصلة بالجرأة والعمل في مقدمة الحملة.",
      "at": "cand",
      "aff": "umayyad",
      "from": 717,
      "to": 740,
      "died": 740,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "bold",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الثغور",
        "الأناضول"
      ]
    },
    {
      "n": "نصر بن سيار",
      "trait": "defender",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Nasr_ibn_Sayyar",
      "ar": "نصر بن سيار الكناني",
      "bio": "رجل من جند خراسان، يعرف بيئتها القبلية وشؤون أهلها. يجمع خبرة الميدان إلى فهم موازين الولاء المحلي.",
      "born": 663,
      "at": "cand",
      "aff": "umayyad",
      "from": 715,
      "to": 748,
      "died": 748,
      "skills": {
        "diplomacy": 2,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": "عارف خراسان",
      "personality": "يعرف أن رضا الوجهاء يخفف كلفة الحملة",
      "aptitudes": {
        "command": 3,
        "stewardship": 2,
        "influence": 3
      },
      "region": [
        "العراق"
      ]
    },
    {
      "n": "أسد بن عبد الله القسري",
      "trait": "cavalier",
      "flaw": "harsh",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Asad_ibn_Abdallah_al-Qasri",
      "ar": "أسد بن عبد الله القسري",
      "bio": "من بيت القسري ذي النفوذ، وله خبرة بقيادة الجند وإدارة الأقاليم. يعتمد على الانضباط وشبكة رجاله.",
      "at": "cand",
      "aff": "umayyad",
      "from": 723,
      "to": 738,
      "died": 738,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "العراق"
      ]
    },
    {
      "n": "الحارث بن سريج",
      "trait": "swift",
      "flaw": "disloyal",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Al-Harith_ibn_Surayj",
      "ar": "الحارث بن سريج",
      "bio": "رجل من تميم في خراسان، يجد أنصاراً بين الساخطين على توزيع السلطة والمال. لا يسهل إخضاع رأيه لمجلس بعيد.",
      "at": "cand",
      "from": 734,
      "to": 746,
      "died": 746,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "حسابي",
      "identity": null,
      "personality": "حسابي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "persona": "ambitious",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "العراق"
      ]
    },
    {
      "n": "مسلم بن سعيد الكلابي",
      "trait": "tactician",
      "flaw": "cautious",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Muslim_ibn_Sa'id_al-Kilabi",
      "ar": "مسلم بن سعيد الكلابي",
      "bio": "قائد من رجال خراسان، يقدّر استمالة الوجهاء المحليين وتأمين الطريق قبل التوسع.",
      "at": "cand",
      "aff": "umayyad",
      "from": 720,
      "to": 735,
      "died": 735,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "متأنٍ",
      "identity": null,
      "personality": "متأنٍ؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "العراق"
      ]
    },
    {
      "n": "إسحاق بن مسلم العقيلي",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ishaq_ibn_Muslim_al-Uqayli",
      "ar": "إسحاق بن مسلم العقيلي",
      "bio": "من رجال الجزيرة وأرمينية، خبر الجبل ومسالك الثغور. يستند إلى صلات عسكرية راسخة في الشمال.",
      "at": "cand",
      "aff": "umayyad",
      "from": 730,
      "to": 760,
      "died": 760,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "القوقاز",
        "الجزيرة"
      ]
    },
    {
      "n": "مسلمة بن هشام",
      "trait": "siege",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Maslama_ibn_Hisham",
      "ar": "مسلمة بن هشام",
      "bio": "أمير من بيت هشام يتقدم إلى خدمة الثغور. يوفر له نسبه الرجال، لكن عليه أن يثبت قدرته في الميدان.",
      "at": "cand",
      "aff": "umayyad",
      "from": 735,
      "to": 750,
      "died": 750,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الثغور",
        "الأناضول"
      ]
    },
    {
      "n": "ثيودوسيوس",
      "trait": "merchant",
      "flaw": "cautious",
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Theodosius_III",
      "ar": "ثيودوسيوس الثالث",
      "bio": "جابي ضرائب من أدراميتيون رفعه الجند إلى العرش. خبرته بالحساب أكبر من خبرته بقيادة الحملات، وسلطته تحتاج إلى تثبيت.",
      "at": "byzantine",
      "ruler": true,
      "died": 754,
      "skills": {
        "diplomacy": 0,
        "administration": 3,
        "intrigue": 0
      },
      "temperament": "متأنٍ",
      "identity": "رجل الحساب",
      "personality": "يبحث عن سند موثوق بين القادة",
      "persona": "careful",
      "aptitudes": {
        "command": 2,
        "logistics": 2,
        "stewardship": 4,
        "influence": 3,
        "scouting": 1,
        "resolve": 2
      }
    },
    {
      "n": "ليون الإيساوري",
      "trait": "defender",
      "flaw": null,
      "lead": 4,
      "fame": 44,
      "src": "hist",
      "wiki": "Leo_III_the_Isaurian",
      "ar": "لاون الثالث الإيساوري",
      "bio": "قائد إقليم الأناضول، خبر الحدود القوقازية والمفاوضة مع أهلها. لا يمنح ثقته بسهولة، وله نفوذ مستقل بين الجند.",
      "born": 685,
      "at": "byzantine",
      "died": 741,
      "skills": {
        "diplomacy": 1,
        "administration": 0,
        "intrigue": 2
      },
      "temperament": "عملي",
      "identity": "حارس الأناضول",
      "personality": "يطلب ثقة واسعة ولا ينسى إقصاءه",
      "persona": "careful",
      "aptitudes": {
        "command": 4,
        "logistics": 4,
        "stewardship": 3,
        "influence": 4,
        "scouting": 3,
        "resolve": 5
      }
    },
    {
      "n": "أرتاباسدوس",
      "trait": "cavalier",
      "flaw": "disloyal",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Artabasdos",
      "ar": "أرتاباسدوس",
      "bio": "قائد إقليم الأرمنياق ومن أصل أرمني. يعرف طرق المرتفعات، ويربط طموحه بتحالفه مع ليون قائد الأناضول.",
      "at": "byzantine",
      "died": 743,
      "skills": {
        "diplomacy": 1,
        "administration": 0,
        "intrigue": 2
      },
      "temperament": "حسابي",
      "identity": "حليف المرتفعات",
      "personality": "تحالفاته شخصية وطموحه أكبر من منصبه",
      "persona": "ambitious",
      "aptitudes": {
        "command": 3,
        "logistics": 3,
        "stewardship": 2,
        "influence": 3,
        "scouting": 5,
        "resolve": 4
      }
    },
    {
      "n": "سيسينيوس",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 8,
      "src": "hist",
      "wiki": "Rendakis",
      "ar": null,
      "bio": "رجل من أسرة رينداكيس ذات الصلات العسكرية. يعتمد على مكانة أسرته وروابط رجال البلاط.",
      "at": "cand",
      "died": 719,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aff": "byzantine",
      "from": 718,
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "باسيل أونوماغولوس",
      "trait": "logistician",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Basil_Onomagoulos",
      "ar": null,
      "bio": "موظف رومي في صقلية، تربطه صلات بحكم الجزيرة. يعرف الدواوين والإمداد البحري أكثر من حملات البر.",
      "at": "cand",
      "died": 718,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aff": "byzantine",
      "from": 717,
      "aptitudes": {
        "command": 2,
        "stewardship": 2,
        "influence": 1
      },
      "region": [
        "صقلية"
      ]
    },
    {
      "n": "نقيطاس",
      "trait": "swift",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "مانويل",
      "trait": "elite",
      "flaw": null,
      "lead": 3,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بطرس",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ثيوفيلاكتوس",
      "trait": "siege",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "يوحنا",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ميخائيل",
      "trait": "naval",
      "flaw": "greedy",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "byzantine",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": null,
      "personality": "مساوم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "أناستاسيوس",
      "trait": "naval",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Anastasius_II_(emperor)",
      "ar": "أرتيميوس أناستاسيوس الثاني",
      "bio": "أرتيميوس، كاتب البلاط الذي تولى العرش ثم أُبعد عنه إلى تسالونيكي. يحمل خبرة في تجهيز العاصمة والأسطول؛ استدعاؤه يعيد رجلاً صاحب مطالبة ومكانة إلى المجلس.",
      "at": "cand",
      "aff": "byzantine",
      "from": 715,
      "to": 719,
      "died": 719,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 1
      },
      "temperament": "عملي",
      "identity": "خبرة البلاط",
      "personality": "لا ينفصل طلبه للخدمة عن مكانته السابقة",
      "persona": "proud",
      "aptitudes": {
        "command": 3,
        "logistics": 5,
        "stewardship": 4,
        "influence": 4,
        "scouting": 1,
        "resolve": 3
      },
      "region": [
        "الروم",
        "thessalonica"
      ]
    },
    {
      "n": "قسطنطين",
      "trait": "tactician",
      "flaw": "harsh",
      "lead": 4,
      "fame": 30,
      "src": "hist",
      "wiki": "Constantine_V",
      "ar": "قسطنطين الخامس",
      "bio": "ابن ليون، نشأ في البلاط وبين قادة الجيش. تلقى تربية تؤهله لشؤون الحكم، ويطلب أن تثبت القيادة قدرته.",
      "born": 718,
      "at": "cand",
      "aff": "byzantine",
      "from": 736,
      "to": 775,
      "died": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 4,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بارجيك",
      "trait": "cavalier",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Barjik",
      "ar": "بارجيك",
      "bio": "أمير خزري من بيت الخاقان، يقود جماعات من فرسان الشمال. يعتمد على سرعة الحشد وروابط البيت الحاكم.",
      "at": "cand",
      "died": 731,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aff": "khazar",
      "from": 722,
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الخزر",
        "القوقاز"
      ]
    },
    {
      "n": "آلب طرخان",
      "trait": "archer",
      "flaw": null,
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Alp_Tarkhan",
      "ar": null,
      "bio": "قائد من نخب الخزر العسكرية، يحمل لقباً يدل على البأس والمكانة. خبرته في جمع الفرسان وإدارة المناوشة.",
      "at": "cand",
      "died": 737,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aff": "khazar",
      "from": 720,
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الخزر",
        "القوقاز"
      ]
    },
    {
      "n": "هزر طرخان",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Hazer_Tarkhan",
      "ar": "هزر طرخان",
      "bio": "قائد خزري من أصحاب الألقاب العسكرية. يربط قوة رجاله بحسن استخدام النهر والمراعي ومسالك السهوب.",
      "alias": [
        "هزار طرخان"
      ],
      "at": "cand",
      "aff": "khazar",
      "from": 737,
      "to": 737,
      "died": 737,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الخزر",
        "القوقاز"
      ]
    },
    {
      "n": "بولان",
      "trait": "merchant",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Bulan_(Khazar)",
      "ar": "بولان (خزر)",
      "bio": "من تقاليد البيت الحاكم عند الخزر. تفاصيل زمنه وسيرته غير محسومة، فلا يدخل مجلس قادة هذه الحملة.",
      "at": "legacy",
      "died": 760,
      "skills": {
        "diplomacy": 0,
        "administration": 2,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 3,
        "influence": 1
      }
    },
    {
      "n": "قاطون",
      "trait": "swift",
      "flaw": "harsh",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "قوتلوغ",
      "trait": "elite",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "تونغا",
      "trait": "tactician",
      "flaw": "arrogant",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 1
      },
      "temperament": "معتد بنفسه",
      "identity": null,
      "personality": "معتد بنفسه؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "قرلغ",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ساروخ",
      "trait": "logistician",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 1,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 2,
        "influence": 1
      }
    },
    {
      "n": "باغاتور",
      "trait": "desert",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "aff": "khazar",
      "from": 715,
      "to": 775,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بيهار",
      "trait": "cavalier",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Bihar_(Khazar)",
      "ar": "بهار (خزر)",
      "bio": "خاقان من حكام الخزر، يرتبط نفوذه بروابط البيت الحاكم وزعماء السهوب. يتعامل مع الممالك المجاورة من موقع استقلال.",
      "alias": [
        "الخاقان بيهار"
      ],
      "at": "cand",
      "aff": "khazar",
      "from": 730,
      "to": 750,
      "died": 750,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "الخزر"
      ]
    },
    {
      "n": "سمبات الباغراتي",
      "trait": "cavalier",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Smbat_VI_Bagratuni",
      "ar": null,
      "bio": "أمير أرمني من البيت الباغراتي، خبر تقلب السيطرة على أرمينية. يستند إلى الفرسان والنفوذ المحلي.",
      "alias": [
        "سمبات"
      ],
      "at": "neutral",
      "died": 726,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "غوارام الكرجي",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Guaram_III_of_Iberia",
      "ar": null,
      "bio": "أمير كارتلي من البيت الغوارامي ويحمل لقباً رومانياً. يوازن بين جيرانه الأقوياء ويحفظ طرق الجبل.",
      "at": "neutral",
      "died": 748,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "حسّان التدمري",
      "trait": "desert",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "أشوط الباغراتي",
      "trait": "defender",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Ashot_III_Bagratuni",
      "ar": null,
      "bio": "أمير من البيت الباغراتي، يرتبط ببيوت أرمينية العسكرية. يرى في ضبط الأرض والتفاهم مع القوى الكبرى حفظاً لنفوذه.",
      "born": 690,
      "alias": [
        "أشوط الأرمني"
      ],
      "at": "cand",
      "from": 732,
      "to": 748,
      "died": 748,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      },
      "region": [
        "القوقاز"
      ]
    },
    {
      "n": "سولوك أبو مزاحم",
      "trait": "cavalier",
      "flaw": null,
      "lead": 4,
      "fame": 30,
      "src": "hist",
      "wiki": "Suluk_(Türgesh_khagan)",
      "ar": null,
      "bio": "قائد من الترغش يجمع فرسان السهوب حوله. تقوم قوته على سرعة الحشد وإدارة الأحلاف المتقلبة.",
      "at": "event",
      "died": 738,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "from": 716,
      "aptitudes": {
        "command": 4,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "كورصول",
      "trait": "swift",
      "flaw": "reckless",
      "lead": 3,
      "fame": 30,
      "src": "hist",
      "wiki": "Kül-chor",
      "ar": "كورصول",
      "bio": "قائد من نخب الترغش، له نفوذ بين رجال الخيل. يحب المبادرة ويعتد بمكانته في المجلس.",
      "at": "event",
      "died": 740,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "اندفاعي",
      "identity": null,
      "personality": "اندفاعي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "from": 721,
      "aptitudes": {
        "command": 3,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "يلدوز طرخان",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "ترفل خان",
      "trait": "cavalier",
      "flaw": null,
      "lead": 4,
      "fame": 30,
      "src": "hist",
      "wiki": "Tervel_of_Bulgaria",
      "ar": "تيرفيل ملك بلغاريا",
      "bio": "حاكم البلغار الذي ساعد جستنيان على استعادة عرشه ونال لقب قيصر. يملك فرساناً وصلات مؤثرة جنوب الدانوب.",
      "at": "event",
      "died": 721,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 4,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "كورميسوش",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Kormisosh",
      "ar": null,
      "bio": "رجل من نخب البلغار الحاكمة، تستند مكانته إلى بيت فوكيل وروابط المحاربين.",
      "at": "event",
      "died": 756,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "from": 753,
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "سيفار",
      "trait": "swift",
      "flaw": null,
      "lead": 2,
      "fame": 30,
      "src": "hist",
      "wiki": "Sevar_of_Bulgaria",
      "ar": "سيفار",
      "bio": "من بيت دولو الحاكم عند البلغار، يرتبط نفوذه بالأسر العسكرية وفرسان الحدود.",
      "at": "event",
      "died": 753,
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "from": 738,
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "قتلو خان",
      "trait": "swift",
      "flaw": "harsh",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "صارم",
      "identity": null,
      "personality": "صارم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "باياندور",
      "trait": "archer",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "بوريسلاف",
      "trait": "brave",
      "flaw": null,
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "عملي",
      "identity": null,
      "personality": "عملي؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "شهريار الديلمي",
      "trait": "mountaineer",
      "flaw": "greedy",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": null,
      "personality": "مساوم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "غريغور الأرمني",
      "trait": "cavalier",
      "flaw": "greedy",
      "lead": 2,
      "fame": 0,
      "src": "fic",
      "wiki": null,
      "ar": null,
      "bio": "ضابط من جند الإقليم؛ سجله يتشكل بما ينجزه في هذه الحملة.",
      "at": "legacy",
      "skills": {
        "diplomacy": 0,
        "administration": 0,
        "intrigue": 0
      },
      "temperament": "مساوم",
      "identity": null,
      "personality": "مساوم؛ يقدّر وضوح المهمة والوفاء بالعهد",
      "aptitudes": {
        "command": 2,
        "stewardship": 1,
        "influence": 1
      }
    },
    {
      "n": "طارق بن زياد",
      "trait": "mountaineer",
      "flaw": null,
      "lead": 4,
      "fame": 62,
      "born": 670,
      "to": 720,
      "died": 720,
      "bio": "قائد بربري الأصل عبر إلى الأندلس وقاد فتح مدنها. عاد إلى المشرق بعد حملاته، يحمل خبرة عبور البحر والقتال في أرض بعيدة.",
      "identity": "عابر المضيق",
      "personality": "عملي؛ يريد رجالاً يمكن الاعتماد عليهم في أرض غريبة",
      "skills": {
        "diplomacy": 1,
        "administration": 0,
        "intrigue": 1
      },
      "src": "hist",
      "at": "cand",
      "aff": "umayyad",
      "temperament": "عملي",
      "from": 715,
      "persona": "austere",
      "region": [
        "الأندلس",
        "المغرب",
        "damascus"
      ],
      "aptitudes": {
        "command": 4,
        "logistics": 3,
        "stewardship": 2,
        "influence": 4,
        "scouting": 4,
        "resolve": 5
      }
    },
    {
      "n": "موسى بن نصير",
      "trait": "logistician",
      "flaw": "arrogant",
      "lead": 4,
      "fame": 70,
      "born": 640,
      "to": 716,
      "died": 716,
      "bio": "قائد مخضرم تولى إفريقية وأدار توسع الجند في المغرب والأندلس. خبرته واسعة، وصلاته بالقيادة الشامية تحتاج إلى عناية.",
      "identity": "جامع الأقاليم",
      "personality": "معتد بخبرته؛ يطلب تقدير سنواته ونفوذ رجاله",
      "skills": {
        "diplomacy": 1,
        "administration": 3,
        "intrigue": 0
      },
      "src": "hist",
      "at": "cand",
      "aff": "umayyad",
      "temperament": "عملي",
      "from": 715,
      "persona": "proud",
      "region": [
        "الأندلس",
        "المغرب",
        "damascus"
      ],
      "aptitudes": {
        "command": 4,
        "logistics": 5,
        "stewardship": 4,
        "influence": 5,
        "scouting": 3,
        "resolve": 4
      }
    },
    {
      "n": "عبد العزيز بن موسى",
      "trait": "merchant",
      "flaw": null,
      "lead": 2,
      "fame": 28,
      "to": 716,
      "died": 716,
      "bio": "ابن موسى بن نصير، يدير الأندلس من إشبيلية بعد رحيل أبيه. يتعامل مع مجتمع جديد يحتاج إلى اتفاقات وحاميات مستقرة.",
      "identity": "والي إشبيلية",
      "personality": "مفاوض؛ يفضل تثبيت الحكم قبل توسيع الحرب",
      "skills": {
        "diplomacy": 2,
        "administration": 2,
        "intrigue": 0
      },
      "src": "hist",
      "at": "umayyad",
      "aff": "umayyad",
      "temperament": "عملي",
      "from": 715,
      "persona": "pragmatic",
      "region": [
        "الأندلس"
      ],
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 4,
        "influence": 3,
        "scouting": 2,
        "resolve": 3
      }
    },
    {
      "n": "عبد الملك بن رفاعة",
      "alias": [
        "عبد الملك بن رفاعة الفهمي"
      ],
      "trait": "merchant",
      "flaw": "cautious",
      "lead": 2,
      "fame": 22,
      "src": "hist",
      "at": "umayyad",
      "aff": "umayyad",
      "died": 727,
      "persona": "pragmatic",
      "identity": "رجل جند مصر",
      "bio": "من رجال جند مصر، يتولى شؤون الإقليم من الفسطاط بعد خدمة في شرطته. خبرته في ضبط المدن والدواوين أوسع من خبرته في حملات الثغور.",
      "aptitudes": {
        "command": 2,
        "logistics": 3,
        "stewardship": 4,
        "influence": 3,
        "scouting": 1,
        "resolve": 3
      }
    }
  ]
};
