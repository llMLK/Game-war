'use strict';
// Period-relative biographies. References and simulation assumptions: docs/leader-research.md.
// Legacy entries only identify older saves and never enter new recruitment.
const CMD_CATALOG = {
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
