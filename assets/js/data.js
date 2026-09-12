/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 共享数据
   数据整理截至 2026-09-12（2026-27 赛季开局）
   梯队结构依据 fcbarcelona.com 官方 2026/27 教练名单
   名单来源：
     · Cadete B(U15) / Infantil A(U14) / Infantil B(U13) / Infantil C(U13)
       —— 2026-27 名单（据俱乐部各梯队官方名单图整理，2026-09；
          低龄球员中文译名为直译仅供参考，出生年份未知一律留空）
     · Juvenil A / Juvenil B / Cadete A(U16) —— 仍为 2025-26 赛季名单，待更新
   球员字段：pos = GK/DF/MF/FW（渲染分组用）；role = 细分位置（RB/CB/LB/CDM/CM/CAM/RW/ST/LW，
   仅在名单图给出时填写）；img 为本地照片路径（assets/img/players/），无照片留空（用头像占位）
   ═══════════════════════════════════════════════ */
window.LAMASIA_DATA = {
  updated: "2026-09-12",

  teams: [
    { id: "barca-atletic", age: "预备队",  name: "Barça Atlètic",        league: "Segunda Federación · G2",                 href: "teams/barca-atletic.html", desc: "一线储备队 · 体系顶端" },
    { id: "juvenil-a",     age: "U19",      name: "U19 A · Juvenil A",    league: "División de Honor Juvenil · G3",          href: "teams/juvenil-a.html",     desc: "一线青年队 · 精英组" },
    { id: "juvenil-b",     age: "U19",      name: "U19 B · Juvenil B",    league: "Liga Nacional Juvenil",                   href: "teams/juvenil-b.html",     desc: "二线青年队" },
    { id: "cadete",        age: "U16",      name: "U16 · Cadete A",       league: "División de Honor Catalana Cadete",       href: "teams/cadete.html",        desc: "少年梯队最高组" },
    { id: "cadete-b",      age: "U15",      name: "U15 · Cadete B",       league: "Preferente Catalana Cadete G.1",           href: "teams/cadete-b.html",      desc: "少年B队" },
    { id: "infantil",      age: "U14",      name: "U14 · Infantil A",     league: "División de Honor Catalana Infantil",     href: "teams/infantil.html",      desc: "技术打磨关键期" },
    { id: "infantil-b",    age: "U13",      name: "U13 · Infantil B",     league: "Preferente Catalana Infantil G.1",         href: "teams/infantil-b.html",    desc: "儿童B队" },
    { id: "infantil-c",    age: "U13",      name: "U13 · Infantil C",     league: "Catalana Infantil · 组别待核",             href: "teams/infantil-c.html",    desc: "儿童C队 · 原 Alevín A 升入 11 人制" },
    { id: "seven",         age: "U11–U8",   name: "七人制梯队",            league: "Alevín · Benjamín · Prebenjamín",         href: "teams/seven-a-side.html",  desc: "8 支 7 人制梯队" }
  ],

  /* 球员名单：pos = GK/DF/MF/FW（分组用）；role = 细分位置（名单图给出时填写）；img 为本地照片路径（assets/img/players/），无照片留空（用头像占位） */
  players: {
    "juvenil-a": [
      { num: "30", name: "Max Bonfill",          zh: "马克斯·邦菲尔", pos: "GK", nation: "西班牙",       dob: "2007-03-02", note: "U10 入队 · 已升入巴萨竞技", img: "" },
      { num: "—",  name: "Iker Rodríguez",       zh: "伊克尔·罗德里格斯", pos: "GK", nation: "西班牙",       dob: "2008-02-22", note: "青训 · 预计随巴萨竞技",     img: "iker-rodriguez.jpg", imgCredit: "barcauniversal.com", imgUrl: "https://barcauniversal.com/barcelona-hand-first-professional-contract-to-future-first-team-goalkeeper/" },
      { num: "—",  name: "Pol Bernabeu",         zh: "波尔·贝尔纳乌", pos: "DF", nation: "西班牙",       dob: "2008-01-05", note: "青训 · 合同至 2027",          img: "" },
      { num: "—",  name: "Alex Campos",          zh: "亚历克斯·坎波斯", pos: "DF", nation: "西班牙",       dob: "2008-02-02", note: "中卫 · 合同至 2027",          img: "" },
      { num: "3/4",name: "Hafiz Gariba",         zh: "哈菲兹·加里巴", pos: "DF", nation: "加纳",         dob: "2007-01-09", note: "2025 自 Marcet 加盟 · 随一线队季前", img: "" },
      { num: "—",  name: "Baba Kourouma",        zh: "巴巴·库鲁马", pos: "DF", nation: "—",            dob: "2009-02-23", note: "左脚中卫 · 莫里巴之弟",      img: "baba-kourouma.jpg", imgCredit: "barcauniversal.com", imgUrl: "https://barcauniversal.com/who-is-baba-kourouma-the-16-year-old-gem-called-up-to-barcelona-first-team-training/" },
      { num: "—",  name: "Nico Marcipar",        zh: "尼科·马西帕", pos: "DF", nation: "—",            dob: "2008-02-13", note: "左脚中卫",                    img: "" },
      { num: "—",  name: "Lorenzo Oertli",       zh: "洛伦佐·厄特利", pos: "DF", nation: "—",            dob: "2008-03-26", note: "左后卫",                      img: "" },
      { num: "—",  name: "Leo Saca",             zh: "莱奥·萨卡", pos: "DF", nation: "西班牙",       dob: "2007-01-03", note: "合同 2026-06 到期 · 归属待定", img: "" },
      { num: "—",  name: "Nil Teixidor",         zh: "尼尔·特西多尔", pos: "DF", nation: "西班牙",       dob: "2008-02-28", note: "右后卫 · 合同至 2027",        img: "" },
      { num: "—",  name: "Guillem Víctor",       zh: "吉列姆·维克托", pos: "DF", nation: "西班牙",       dob: "2007-05-03", note: "右后卫 · 合同到期 · 归属待定", img: "" },
      { num: "—",  name: "Dani Ávila",           zh: "达尼·阿维拉", pos: "MF", nation: "西班牙",       dob: "2007-03-22", note: "续约至 2028 · 预计升巴萨竞技", img: "" },
      { num: "—",  name: "Orian Goren",          zh: "奥里安·戈伦", pos: "MF", nation: "以色列",       dob: "2009-03-15", note: "续约至 2028 · 预计随巴萨竞技", img: "" },
      { num: "—",  name: "Pedro Rodríguez Iglesias", zh: "佩德罗·罗德里格斯", pos: "MF", nation: "西班牙",   dob: "2008-01-20", note: "11 岁入队 · 合同至 2027",     img: "" },
      { num: "—",  name: "Roberto Tomás",        zh: "罗伯托·托马斯", pos: "MF", nation: "—",            dob: "—",          note: "青训",                        img: "" },
      { num: "—",  name: "Ebrima Tunkara",       zh: "埃布里马·通卡拉", pos: "MF", nation: "西班牙/冈比亚", dob: "2010-03-10", note: "跨级超新星 · 续约并提高解约金", img: "ebrima-tunkara.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/ebrima-tunkara/profil/spieler/1242159" },
      { num: "16", name: "Pedro Villar Leyenda", zh: "佩德罗·维拉尔", pos: "MF", nation: "西班牙",       dob: "2008-01-11", note: "合同至 2027 · 冠军杯决赛进球", img: "" },
      { num: "—",  name: "Quim Junyent",         zh: "胡尼恩特", pos: "MF", nation: "西班牙",       dob: "约2007",     note: "西班牙 U19 队长 · 已转会阿尔梅里亚", img: "quim-junyent.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/quim-junyent/profil/spieler/962113" },
      { num: "—",  name: "Nuhu Fofana",          zh: "努胡·福法纳", pos: "FW", nation: "西班牙",       dob: "2008-07-28", note: "续约至 2030 · 亦代表巴萨竞技", img: "" },
      { num: "—",  name: "Adrián Guerrero",      zh: "阿德里安·格雷罗", pos: "FW", nation: "西班牙",       dob: "2008-05-13", note: "青训 · 合同至 2027",          img: "" },
      { num: "—",  name: "Shane Kluivert",       zh: "肖恩·克鲁伊维特", pos: "FW", nation: "荷兰",         dob: "2007-09-24", note: "克鲁伊维特之子 · 续约至 2028", img: "shane-kluivert.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/shane-kluivert/profil/spieler/964364" },
      { num: "—",  name: "Oriol Pallàs",         zh: "奥里奥尔·帕拉斯", pos: "FW", nation: "西班牙",       dob: "—",          note: "2025 自西班牙人 U18 引进",    img: "" },
      { num: "—",  name: "Nil Vicens Ponsatí",   zh: "尼尔·维森斯", pos: "FW", nation: "西班牙",       dob: "—",          note: "青训 · 夺冠战首开纪录",      img: "" },
      { num: "—",  name: "Ajay Tavares",         zh: "阿杰伊·塔瓦雷斯", pos: "FW", nation: "英格兰",       dob: "2009-12-28", note: "自诺维奇城 · 英格兰 U17 国脚", img: "ajay-tavares.jpg", imgCredit: "zerozero.pt", imgUrl: "https://www.zerozero.pt/jogador/ajay-tavares/1820493" },
      { num: "—",  name: "Álex González Yanes",  zh: "亚历克斯·冈萨雷斯", pos: "FW", nation: "西班牙",       dob: "2007-02-02", note: "自 Damm · 随一线队季前",       img: "" },
      { num: "—",  name: "Lovro Chelfi",         zh: "洛夫罗·切尔菲", pos: "FW", nation: "克罗地亚",     dob: "2007-01-30", note: "自 Kustošija · 克罗地亚 U19 国脚", img: "lovro-chelfi.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/lovro-chelfi/profil/spieler/1277252" },
      { num: "—",  name: "Hamza Abdelkarim",     zh: "哈姆扎·阿卜杜勒卡里姆", pos: "FW", nation: "埃及",         dob: "2008-01-01", note: "已升巴萨竞技 · 埃及国家队",   img: "hamza-abdelkarim.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/hamza-abdelkarim/profil/spieler/1259085" },
      { num: "—",  name: "Òscar Gistau",         zh: "奥斯卡·吉斯陶", pos: "FW", nation: "西班牙", dob: "—", note: "Sofascore 归属巴萨竞技", img: "" },
      { num: "—",  name: "Sama Nomoko",          zh: "萨马·诺莫科", pos: "FW", nation: "西班牙", dob: "—", note: "Sofascore 归属巴萨竞技", img: "" },
      { num: "—",  name: "Guillermo Fernández",  zh: "吉列尔莫·费尔南德斯", pos: "MF", nation: "西班牙", dob: "—", note: "Sofascore 归属巴萨竞技", img: "" },
      { num: "—",  name: "Landry Farré",         zh: "兰德里·法雷", pos: "DF", nation: "西班牙", dob: "—", note: "Sofascore 归属巴萨竞技", img: "" },
      { num: "—",  name: "Eder Aller",           zh: "埃德尔·阿莱尔", pos: "GK", nation: "西班牙", dob: "—", note: "Sofascore 归属巴萨竞技", img: "" }
    ],

    "juvenil-b": [
      { num: "—", name: "Pau Espi",            zh: "保罗·埃斯皮", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gerard Sala",         zh: "杰拉德·萨拉", pos: "GK", nation: "西班牙", dob: "2008-01-25", note: "生于 Granollers · 合同至 2027", img: "" },
      { num: "—", name: "Gerard Valls",        zh: "杰拉德·巴尔斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pau Bergés",          zh: "保罗·贝尔赫斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Adrián Cuadrado",     zh: "阿德里安·夸德拉多", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Raul Expósito",       zh: "劳尔·埃克斯波西托", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Álvaro Gómez",        zh: "阿尔瓦罗·戈麦斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Joan Inglès",         zh: "霍安·英格莱斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Sergi Mayans",        zh: "塞尔吉·马扬斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Madou Murcia",        zh: "马杜·穆尔西亚", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Jordi Pesquer",       zh: "霍尔迪·佩斯克尔", pos: "DF", nation: "西班牙", dob: "—", note: "随一线队季前", img: "" },
      { num: "—", name: "Adam Argemí",         zh: "亚当·阿尔赫米", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gorka Buil",          zh: "戈尔卡·布伊尔", pos: "MF", nation: "西班牙", dob: "—", note: "2026 续约", img: "" },
      { num: "—", name: "Ibrahim Babayev",     zh: "易卜拉欣·巴巴耶夫", pos: "MF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Xavier Miràngels",    zh: "哈维尔·米兰赫尔斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gerard Mullol",       zh: "杰拉德·穆洛尔", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Michal Zuk",          zh: "米哈乌·茹克", pos: "MF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Genís Clua",          zh: "赫尼斯·克卢瓦", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alieu Drammeh",       zh: "阿利乌·德拉梅", pos: "FW", nation: "—",     dob: "—", note: "—", img: "alieu-drammeh.jpg", imgCredit: "gambiana.com", imgUrl: "https://gambiana.com/gambia-u-17-captain-alieu-drammeh-signs-professional-contract-with-fc-barcelona/" },
      { num: "—", name: "Pol Mancheño",        zh: "波尔·曼切尼奥", pos: "FW", nation: "西班牙", dob: "—", note: "已转会黄潜 Juvenil A", img: "" },
      { num: "—", name: "Ïu Martínez",         zh: "伊乌·马丁内斯", pos: "FW", nation: "西班牙", dob: "—", note: "冠军杯决赛被罚下", img: "" },
      { num: "—", name: "Byron Mendoza",       zh: "拜伦·门多萨", pos: "FW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Alejandro Pastor",    zh: "亚历杭德罗·帕斯托尔", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ismael Ziani",        zh: "伊斯梅尔·齐亚尼", pos: "FW", nation: "—",     dob: "—", note: "—", img: "ismael-ziani.jpg", imgCredit: "al-ain.com", imgUrl: "https://al-ain.com/article/ismael-ziani-lopez-miracle-bar-a" },
      { num: "—", name: "Genís Oya",           zh: "赫尼斯·奥亚", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" }
    ],

    "cadete": [
      { num: "—", name: "Elyott Daussy",         zh: "埃利奥特·多西", pos: "GK", nation: "西班牙", dob: "—", note: "2026 续约", img: "" },
      { num: "—", name: "Pablo Peña",            zh: "巴勃罗·佩尼亚", pos: "GK", nation: "西班牙", dob: "—", note: "2026 续约 · 西班牙 U15/U16", img: "" },
      { num: "—", name: "Ahmed Abarkane",        zh: "艾哈迈德·阿巴尔卡内", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Jude Ali Berro",        zh: "裘德·阿里·贝罗", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Roc Martínez",          zh: "罗克·马丁内斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Òscar Medina",          zh: "奥斯卡·梅迪纳", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Luca Pérez",            zh: "卢卡·佩雷斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "José Alfredo Rodríguez", zh: "何塞·阿尔弗雷多·罗德里格斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pere Villacorta",       zh: "佩雷·比利亚科塔", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Guiu Xuclà",            zh: "吉乌·舒克拉", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Milosz Zuk",            zh: "米沃什·茹克", pos: "DF", nation: "—",     dob: "—", note: "Michal Zuk 之弟 · 外租 CE Sabadell", img: "" },
      { num: "—", name: "Unai Balmón",           zh: "乌奈·巴尔蒙", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ignasi Bassas",         zh: "伊格纳西·巴萨斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Samu Borniquel",        zh: "萨穆·博尔尼克尔", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Garcés",           zh: "乌戈·加塞斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Robert Oliveras",       zh: "罗贝尔特·奥利韦拉斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Artem Rybak",           zh: "阿尔乔姆·雷巴克", pos: "MF", nation: "—",     dob: "—", note: "—", img: "artem-rybak.jpg", imgCredit: "dynamo.kiev.ua", imgUrl: "https://dynamo.kiev.ua/en/news/695213-ukrainian-midfielder-of-barcelona-u-18-i-want-to-grow-to-the-first-team-and-win-as-many-trophies-as-possible-with-it" },
      { num: "—", name: "Alex Arasa",            zh: "亚历克斯·阿拉萨", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Marc Armada",           zh: "马克·阿马达", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alejandro Fernández",   zh: "亚历杭德罗·费尔南德斯", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Noah Garcia",           zh: "诺亚·加西亚", pos: "FW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pau Miguel Mateos",     zh: "保·米格尔·马特奥斯", pos: "FW", nation: "西班牙", dob: "—", note: "—", nameAlias: "Paumi Mateos", img: "" },
      { num: "—", name: "Ruslan Mba",            zh: "鲁斯兰·姆巴", pos: "FW", nation: "西班牙/赤道几内亚", dob: "2010-02-27", note: "职业合同至 2029 · 人称迷你拉菲尼亚", img: "" },
      { num: "—", name: "Héctor Néstor Asumu",   zh: "埃克托尔·内斯托尔·阿苏穆", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Lucas Bernal",          zh: "卢卡斯·贝尔纳尔", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" }
    ],

    "infantil": [
      { num: "—", name: "Eric Coyo",           zh: "埃里克·科约", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Nil Abellán",         zh: "尼尔·阿韦扬", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Issa Niakaté",        zh: "伊萨·尼亚卡特", pos: "DF", role: "RB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Gómez",           zh: "扬·戈麦斯", pos: "DF", role: "RB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Claudio Ruiz",        zh: "克劳迪奥·鲁伊斯", pos: "DF", role: "CB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Leo Martínez",        zh: "莱奥·马丁内斯", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Arnau Berbois",       zh: "阿尔瑙·贝尔博伊斯", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jaume Casanovas",     zh: "豪梅·卡萨诺瓦", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Izan Ruiz",           zh: "伊桑·鲁伊斯", pos: "DF", role: "LB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Guillem Balcells",    zh: "吉列姆·巴尔塞尔斯", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Biel Blanco",         zh: "别尔·布兰科", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mario Franco",        zh: "马里奥·佛朗哥", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Moré",            zh: "扬·莫雷", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Álex López",          zh: "亚历克斯·洛佩斯", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Julen Gallardo",      zh: "胡伦·加亚尔多", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Enzo Márquez",        zh: "恩佐·马克斯", pos: "MF", role: "CAM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Omri Weiss-Sharabi",  zh: "奥姆里·魏斯-沙拉比", pos: "MF", role: "CAM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pep Farrés",          zh: "佩普·法雷斯", pos: "FW", role: "RW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Abdoulatif Djitte",   zh: "阿卜杜拉蒂夫·吉特", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Juan García",         zh: "胡安·加西亚", pos: "FW", role: "RW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jayden Espinal",      zh: "杰登·埃斯皮纳尔", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Anas Saghdani",       zh: "阿纳斯·萨格达尼", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Mounirou Kande",      zh: "穆尼鲁·坎德", pos: "FW", role: "LW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Denys Sokolovskyi",   zh: "丹尼斯·索科洛夫斯基", pos: "FW", role: "LW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Aran Aparicio",       zh: "阿兰·阿帕里西奥", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" }
    ],

    /* 2026-27 赛季名单（据俱乐部各梯队官方名单图整理，2026-09-12；低龄球员中文译名为直译仅供参考） */
    "cadete-b": [
      { num: "—", name: "Álex Guardado",       zh: "亚历克斯·瓜尔达多", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ander Pérez",         zh: "安德尔·佩雷斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Biel Chacón",         zh: "别尔·查孔", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Guerra",         zh: "阿兰·格拉", pos: "DF", role: "RB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Yibrahan García",     zh: "伊布拉汉·加西亚", pos: "DF", role: "RB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pol Jou",             zh: "波尔·若乌", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Derek Puig",          zh: "德里克·普伊格", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "John Ovie",           zh: "约翰·奥维", pos: "DF", role: "CB", nation: "—",     dob: "—", note: "名单图作 John Ovie（旧名单作 John Ovie Adams）", img: "" },
      { num: "—", name: "Gael Seijo",          zh: "加埃尔·塞伊霍", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Guerau Villegas",     zh: "格拉乌·比列加斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Tomás",          zh: "乌戈·托马斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Munté",           zh: "扬·蒙特", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Enzo Pérez",          zh: "恩佐·佩雷斯", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gerard Mateo",        zh: "赫拉德·马特奥", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Agus Marcet",         zh: "阿古斯·马塞特", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "David Moreno",        zh: "大卫·莫雷诺", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Antonio Amaya",       zh: "安东尼奥·阿马亚", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Edgar Doblas",        zh: "埃德加·多布拉斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alex Pliego",         zh: "亚历克斯·普列戈", pos: "FW", role: "RW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ayoub Hilali",        zh: "阿尤布·希拉利", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Fode Diallo",         zh: "福德·迪亚洛", pos: "FW", role: "ST", nation: "西班牙/几内亚", dob: "2012-06-03", note: "U12 赛季 30 场进 97 球", img: "" },
      { num: "—", name: "Juan Fernández",      zh: "胡安·费尔南德斯", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Li Haoyan",           zh: "李昊炎", pos: "FW", role: "LW", nation: "中国", dob: "2012", nameAlias: "Haoyan Li", note: "拉玛西亚 46 年首位中国籍球员 · 跨龄入 U15 · 2026-08 注册", img: "li-haoyan.jpg", imgCredit: "董路微博（凤凰网转载）", imgUrl: "https://news.ifeng.com/c/8tiRW4qt087" }
    ],

    "infantil-b": [
      { num: "—", name: "Mauro Artigot",       zh: "毛罗·阿尔蒂戈特", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martí Pico",          zh: "马尔蒂·皮科", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Teo Rodríguez",       zh: "特奥·罗德里格斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Unai Rodríguez",      zh: "乌奈·罗德里格斯", pos: "DF", role: "RB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Marco Mollica",       zh: "马尔科·莫利卡", pos: "DF", role: "RB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Biel Chaves",         zh: "别尔·查韦斯", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Arnau Casas",         zh: "阿尔瑙·卡萨斯", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "David Quintelà",      zh: "大卫·金特拉", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Veganzones",      zh: "扬·贝甘索内斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Josep Curto",         zh: "何塞普·库尔托", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Max Florenza",        zh: "马克斯·弗洛伦萨", pos: "MF", role: "CDM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Marc Ribera",         zh: "马克·里贝拉", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Galdeano",       zh: "乌戈·加尔德亚诺", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "José Ahumada",        zh: "何塞·阿乌马达", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Joel Cabanes",        zh: "乔尔·卡巴内斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pedro Juárez",        zh: "佩德罗·华雷斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alessandro Mejia",    zh: "亚历山德罗·梅希亚", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Denzel Winter",       zh: "登泽尔·温特", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Kajetan Góral",       zh: "卡耶坦·戈拉尔", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Destiny Kosio",       zh: "德斯蒂尼·科西奥", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Barka Seif",          zh: "巴尔卡·塞夫", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Biel Ramos",          zh: "别尔·拉莫斯", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Arq Martínez",        zh: "阿尔克·马丁内斯", pos: "FW", role: "LW", nation: "—",     dob: "—", note: "名单图作 Arq（缩写待核）", img: "" },
      { num: "—", name: "Shinta Nishiyama",    zh: "西山真太", pos: "FW", role: "LW", nation: "日本", dob: "—", note: "汉字写法待核", img: "" }
    ],

    /* Infantil C（U13）：上赛季 Alevín A 升入 11 人制 */
    "infantil-c": [
      { num: "—", name: "Lluc Morilla",        zh: "卢克·莫里利亚", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Cesc Coll",           zh: "塞斯克·科尔", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Marc Moreira",        zh: "马克·莫雷拉", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Joel Cabrera",        zh: "乔尔·卡布雷拉", pos: "DF", role: "RB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Max Moreno",          zh: "马克斯·莫雷诺", pos: "DF", role: "RB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Madou Tounkara",      zh: "马杜·通卡拉", pos: "DF", role: "CB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Leo Jiménez",         zh: "莱奥·希门尼斯", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Aran Puig",           zh: "阿兰·普伊格", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Idan Scutari",        zh: "伊丹·斯库塔里", pos: "DF", role: "CB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Nico García",         zh: "尼科·加西亚", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alexandre Sentís",    zh: "亚历山大·森蒂斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Álex Larregola",      zh: "亚历克斯·拉雷戈拉", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Evangelista Rubio",   zh: "埃万赫利斯塔·鲁维奥", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Sandro Liparteliani", zh: "桑德罗·利帕尔特利安尼", pos: "MF", role: "CM", nation: "—", dob: "—", note: "格鲁吉亚姓氏", img: "" },
      { num: "—", name: "Martí Parraga",       zh: "马尔蒂·帕拉加", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martí Fernández",     zh: "马尔蒂·费尔南德斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alder Jiménez",       zh: "阿尔德·希门尼斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Youssef Khanfri",     zh: "优素福·汉弗里", pos: "MF", role: "CAM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Henry Yeboah",        zh: "亨利·耶博阿", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Calle",          zh: "阿兰·卡列", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Iván Cortés",         zh: "伊万·科尔特斯", pos: "FW", role: "ST", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gio Sánchez",         zh: "吉奥·桑切斯", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Bruno Olmos",         zh: "布鲁诺·奥尔莫斯", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" }
    ],

    /* ── 以下为 2026-09 换名单时被移出各队、但归属尚未查明的球员（不参与渲染，留档待核） ──
       · 旧 Cadete B（2025-26 官网快照，南木维基 2026-05-23；疑为 2026-27 Cadete A/U16 阵容）：
         Alexander Chimoscope(GK) / Arnau Ribes(GK) / Jose Basaña / Lucas Bernal / Aritz Lairado /
         Víctor Rao / Minguk Lee / Gerard Millan / Iker Nsang / Darwin Zamora / Dragos Bivol /
         Quim Cárcel / Jan Giral / Unax Hernández / Johan Leiva / Adrián Sánchez / Pau Sarrià /
         Daehan Lee / Héctor Asumu / Divine Ejiofor John / Mamadou Keita / Jan Rizos
       · 旧 Infantil A 未出现在新 Cadete B 名单：Pol Porta / Eric Marín / Adam Qaroual
       · 旧 Infantil B 未出现在新 Infantil A 名单：Jesús Ruescas / Enrique Villaro(Enric Vilaró)
       · 旧 Alevín A 未出现在新 Infantil C 名单：Yuk Moriya(GK, 日本)
       待拿到 Cadete A(U16) 等其余梯队名单图后再归位。 */

    "u11a": [
      { num: "—", name: "Yago Villavicencio", zh: "亚戈·比利亚维森西奥", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Luca Yakunin",       zh: "卢卡·亚库宁", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Edwar Encarnación",  zh: "爱德华·恩卡纳西翁", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martí Prat",         zh: "马尔蒂·普拉特", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Sekou Bayo",         zh: "塞库·巴约", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Izan Rodríguez",     zh: "伊桑·罗德里格斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Youssef El Mir",     zh: "优素福·埃尔米尔", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Yarei Cortés",       zh: "亚雷·科尔特斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Thiago Claverías",   zh: "蒂亚戈·克拉韦里亚斯", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Soulaimane L'Khamal",zh: "苏莱曼·哈马尔", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Amadou Diakate",     zh: "阿马杜·迪亚卡特", pos: "FW", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hoossam Bnihich",    zh: "胡萨姆·布尼希", pos: "FW", nation: "—", dob: "—", note: "—", img: "" }
    ],

    "u11b": [
      { num: "—", name: "Quim Anglada",     zh: "基姆·安格拉达", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martín Guarnido",  zh: "马丁·瓜尔尼多", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mamadi Diallo",    zh: "马马迪·迪亚洛", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martí Giral",      zh: "马尔蒂·希拉尔", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Youssef El Abaal", zh: "优素福·埃尔阿巴勒", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Martí Sánchez",    zh: "马尔蒂·桑切斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Edgar Guerri",     zh: "埃德加·格里", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Bruno López",      zh: "布鲁诺·洛佩斯", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Leo Rizo",         zh: "莱奥·里索", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Daniel Ezzeddine", zh: "丹尼尔·埃泽丁", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Adonai Patilla",   zh: "阿多奈·帕蒂利亚", pos: "FW", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Noah Chima",       zh: "诺亚·奇马", pos: "FW", nation: "—", dob: "—", note: "—", img: "" }
    ],

    "u10a": [
      { num: "—", name: "Daniel Talavera",     zh: "丹尼尔·塔拉韦拉", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Enzo Rubio",          zh: "恩佐·鲁维奥", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Álvaro Vives",        zh: "阿尔瓦罗·比韦斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Leo Martínez",        zh: "莱奥·马丁内斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Pi",             zh: "阿兰·皮", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Esteban Henao",       zh: "埃斯特万·埃纳奥", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mateo Romero",        zh: "马特奥·罗梅罗", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Natán Satinski",      zh: "纳坦·萨廷斯基", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Soulaiman Essalama",  zh: "苏莱曼·埃萨拉马", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Noah Arechabaleta",   zh: "诺亚·阿雷查巴莱塔", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Salim El Madi",       zh: "萨利姆·埃尔马迪", pos: "FW", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Adrián Martínez",     zh: "阿德里安·马丁内斯", pos: "FW", nation: "—", dob: "—", note: "—", img: "" }
    ],

    "u10b": [
      { num: "—", name: "Simón Murciano",  zh: "西蒙·穆尔西亚诺", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Xevi Papaseit",   zh: "谢维·帕帕塞特", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mamadou Diallo",  zh: "马马杜·迪亚洛", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Derrick Reyes",   zh: "德里克·雷耶斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Víctor Méndez",   zh: "维克托·门德斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mario Gómez",     zh: "马里奥·戈麦斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Eric García",     zh: "埃里克·加西亚", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mateo Canillo",   zh: "马特奥·卡尼略", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Luca Millet",     zh: "卢卡·米列特", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Thiago Martínez", zh: "蒂亚戈·马丁内斯", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Toni Montes",     zh: "托尼·蒙特斯", pos: "FW", nation: "—", dob: "—", note: "—", img: "" }
    ],

    "u9a": [
      { num: "—", name: "Arnau Carbonell",    zh: "阿瑙·卡沃内利", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Aday Segovia",       zh: "阿代·塞戈维亚", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jordán Pérez",       zh: "霍尔丹·佩雷斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Àlex Morillas",      zh: "亚历克斯·莫里利亚斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Zorrilla",      zh: "阿兰·索里利亚", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Thiago Acevedo",     zh: "蒂亚戈·阿塞维多", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Àlex Caballero",     zh: "亚历克斯·卡瓦列罗", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Fallou Balde",       zh: "法卢·巴尔德", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Haroun Azzougouagh", zh: "哈龙·阿祖古阿", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Àlex Garrido",       zh: "亚历克斯·加里多", pos: "FW", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Castro",        zh: "乌戈·卡斯特罗", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" }
    ],

    "u9b": [
      { num: "—", name: "Harrison Baya",    zh: "哈里森·巴亚", pos: "GK", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "John Cuevas",      zh: "约翰·奎瓦斯", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jairo Peña",       zh: "哈伊罗·佩尼亚", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gerard Cervilla",  zh: "杰拉德·塞尔维利亚", pos: "DF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mahir Abrimou",    zh: "马希尔·阿布里穆", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "David López",      zh: "大卫·洛佩斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Teo González",     zh: "特奥·冈萨雷斯", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Padilla",     zh: "乌戈·帕迪利亚", pos: "MF", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Josué Cortés",     zh: "霍苏埃·科尔特斯", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Adam Haddani",     zh: "亚当·哈达尼", pos: "FW", nation: "—", dob: "—", note: "—", img: "" },
      { num: "—", name: "Akram Boutajar",   zh: "阿克拉姆·布塔哈尔", pos: "FW", nation: "—", dob: "—", note: "—", img: "" }
    ]
  },

  /* 国籍英文 → 中文（Sofascore 返回英文国家名，渲染时汉化；未收录的国家会保持英文显示） */
  nationZh: {
    /* 欧洲 */
    "Spain": "西班牙", "France": "法国", "Germany": "德国", "Italy": "意大利",
    "England": "英格兰", "Scotland": "苏格兰", "Wales": "威尔士", "Ireland": "爱尔兰", "Northern Ireland": "北爱尔兰",
    "Netherlands": "荷兰", "Belgium": "比利时", "Portugal": "葡萄牙",
    "Denmark": "丹麦", "Sweden": "瑞典", "Norway": "挪威", "Finland": "芬兰", "Iceland": "冰岛",
    "Switzerland": "瑞士", "Austria": "奥地利",
    "Poland": "波兰", "Czech Republic": "捷克", "Czechia": "捷克", "Slovakia": "斯洛伐克",
    "Hungary": "匈牙利", "Romania": "罗马尼亚", "Bulgaria": "保加利亚", "Greece": "希腊",
    "Turkey": "土耳其", "Russia": "俄罗斯", "Ukraine": "乌克兰", "Belarus": "白俄罗斯",
    "Serbia": "塞尔维亚", "Croatia": "克罗地亚", "Bosnia and Herzegovina": "波黑", "Slovenia": "斯洛文尼亚",
    "Montenegro": "黑山", "North Macedonia": "北马其顿", "Albania": "阿尔巴尼亚", "Kosovo": "科索沃",
    "Georgia": "格鲁吉亚", "Armenia": "亚美尼亚", "Azerbaijan": "阿塞拜疆", "Moldova": "摩尔多瓦",
    "Estonia": "爱沙尼亚", "Latvia": "拉脱维亚", "Lithuania": "立陶宛",
    "Kazakhstan": "哈萨克斯坦", "Uzbekistan": "乌兹别克斯坦", "Kyrgyzstan": "吉尔吉斯斯坦",
    "Tajikistan": "塔吉克斯坦", "Turkmenistan": "土库曼斯坦",
    "Israel": "以色列",
    /* 南美 */
    "Brazil": "巴西", "Argentina": "阿根廷", "Uruguay": "乌拉圭", "Chile": "智利",
    "Colombia": "哥伦比亚", "Peru": "秘鲁", "Ecuador": "厄瓜多尔", "Paraguay": "巴拉圭",
    "Venezuela": "委内瑞拉", "Bolivia": "玻利维亚",
    /* 北美 · 中美 · 加勒比 */
    "Mexico": "墨西哥", "United States": "美国", "USA": "美国", "Canada": "加拿大",
    "Costa Rica": "哥斯达黎加", "Panama": "巴拿马", "Honduras": "洪都拉斯", "Guatemala": "危地马拉",
    "El Salvador": "萨尔瓦多", "Nicaragua": "尼加拉瓜", "Jamaica": "牙买加",
    "Trinidad and Tobago": "特立尼达和多巴哥", "Cuba": "古巴", "Haiti": "海地",
    "Dominican Republic": "多米尼加", "Curaçao": "库拉索",
    /* 非洲 */
    "Morocco": "摩洛哥", "Algeria": "阿尔及利亚", "Tunisia": "突尼斯", "Egypt": "埃及", "Libya": "利比亚",
    "Senegal": "塞内加尔", "Nigeria": "尼日利亚", "Ghana": "加纳",
    "Ivory Coast": "科特迪瓦", "Cote d'Ivoire": "科特迪瓦", "Cameroon": "喀麦隆",
    "Mali": "马里", "Guinea": "几内亚", "Guinea-Bissau": "几内亚比绍", "Gambia": "冈比亚",
    "Burkina Faso": "布基纳法索", "Gabon": "加蓬", "Congo": "刚果",
    "DR Congo": "刚果（金）", "Democratic Republic of the Congo": "刚果（金）",
    "Angola": "安哥拉", "South Africa": "南非", "Mozambique": "莫桑比克",
    "Cape Verde": "佛得角", "Cabo Verde": "佛得角", "Togo": "多哥", "Benin": "贝宁",
    "Zambia": "赞比亚", "Zimbabwe": "津巴布韦", "Sierra Leone": "塞拉利昂", "Liberia": "利比里亚",
    "Sudan": "苏丹", "South Sudan": "南苏丹", "Eritrea": "厄立特里亚", "Ethiopia": "埃塞俄比亚",
    "Kenya": "肯尼亚", "Uganda": "乌干达", "Tanzania": "坦桑尼亚", "Equatorial Guinea": "赤道几内亚",
    /* 亚洲 · 大洋洲 */
    "China": "中国", "Japan": "日本", "South Korea": "韩国", "Korea Republic": "韩国", "North Korea": "朝鲜",
    "India": "印度", "Thailand": "泰国", "Vietnam": "越南", "Indonesia": "印度尼西亚",
    "Malaysia": "马来西亚", "Philippines": "菲律宾", "Singapore": "新加坡",
    "Australia": "澳大利亚", "New Zealand": "新西兰",
    "Qatar": "卡塔尔", "Saudi Arabia": "沙特阿拉伯", "United Arab Emirates": "阿联酋", "UAE": "阿联酋",
    "Kuwait": "科威特", "Bahrain": "巴林", "Oman": "阿曼", "Lebanon": "黎巴嫩", "Jordan": "约旦",
    "Syria": "叙利亚", "Iraq": "伊拉克", "Iran": "伊朗", "Palestine": "巴勒斯坦", "Yemen": "也门",
    "Pakistan": "巴基斯坦", "Afghanistan": "阿富汗", "Bangladesh": "孟加拉国", "Sri Lanka": "斯里兰卡",
    "Mongolia": "蒙古"
  }
};
