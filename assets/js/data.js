/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 共享数据
   数据整理截至 2026-09-21（2026-27 赛季开局 · Juvenil B / Cadete A 已换 2026-27 名单）
   梯队结构依据 fcbarcelona.com 官方 2026/27 教练名单
   名单来源：
     · Cadete B(U15) / Infantil A(U14) / Infantil B(U13) / Infantil C(U13)
       —— 2026-27 名单（据俱乐部各梯队官方名单图整理，2026-09；
          低龄球员中文译名为直译仅供参考，出生年份未知一律留空）
     · Juvenil B(U19 B) / Cadete A(U16) —— 2026-27 名单（据俱乐部两队官方名单图整理，2026-09-21；
          Juvenil B 主体为 2025-26 赛季 Cadete A 整体升入的球员，Cadete A 主体为 2025-26 赛季 Cadete B 升入）
     · Juvenil A —— 仍为 2025-26 赛季名单，待更新
   梯队命名（2026-09-12 核对 fcbarcelona.es «Fútbol – Formativo masculino»）：
     · 官网用 SUB+年龄 命名：SUB16(Cadete A) / SUB15(Cadete B) / SUB14(Infantil A) /
       SUB13(Infantil B) / SUB12(Alevín A) / SUB11 A(Alevín C) / SUB11 B(Alevín D) /
       SUB10 A·B(Benjamín A·B) / SUB9 A·B(Benjamín C·D) / SUB8 A·B(Prebenjamín·Sub-8 B)，
       另有 Juvenil A / Juvenil B。官方该板块共 15 支（11 人制 6 + 7 人制 9，不含巴萨竞技）。
     · 官网男足**没有** Infantil C、也没有 Alevín B；本站的 Infantil C 依俱乐部名单图另收（官网未列出）
   球员字段：pos = GK/DF/MF/FW（渲染分组用）；role = 细分位置（RB/CB/LB/CDM/CM/CAM/RW/ST/LW，
   仅在名单图给出时填写）；img 为本地照片路径（assets/img/players/），无照片留空（用头像占位）
   ═══════════════════════════════════════════════ */
window.LAMASIA_DATA = {
  updated: "2026-09-21",

  teams: [
    { id: "barca-atletic", age: "预备队",  name: "Barça Atlètic",        league: "Segunda Federación · G2",                 href: "teams/barca-atletic.html", desc: "一线储备队 · 体系顶端" },
    { id: "juvenil-a",     age: "U19",      name: "U19 A · Juvenil A",    league: "División de Honor Juvenil · G3",          href: "teams/juvenil-a.html",     desc: "一线青年队 · 精英组" },
    { id: "juvenil-b",     age: "U19",      name: "U19 B · Juvenil B",    league: "Liga Nacional Juvenil",                   href: "teams/juvenil-b.html",     desc: "二线青年队" },
    { id: "cadete",        age: "U16",      name: "SUB16 · Cadete A",     league: "División de Honor Catalana Cadete",       href: "teams/cadete.html",        desc: "少年梯队最高组" },
    { id: "cadete-b",      age: "U15",      name: "SUB15 · Cadete B",     league: "Preferente Catalana Cadete G.1",           href: "teams/cadete-b.html",      desc: "少年B队" },
    { id: "infantil",      age: "U14",      name: "SUB14 · Infantil A",   league: "División de Honor Catalana Infantil",     href: "teams/infantil.html",      desc: "技术打磨关键期" },
    { id: "infantil-b",    age: "U13",      name: "SUB13 · Infantil B",   league: "Preferente Catalana Infantil G.1",         href: "teams/infantil-b.html",    desc: "儿童B队" },
    { id: "infantil-c",    age: "U12",      name: "SUB12 · Infantil C",   league: "Preferente Infantil U13（越级）",            href: "teams/infantil-c.html",    desc: "Juanan Gil 执教 · 越级 U13" },
    { id: "seven",         age: "U11–U8",   name: "七人制梯队",            league: "SUB11 A – SUB8 B",                        href: "teams/seven-a-side.html",  desc: "8 支 7 人制梯队（SUB11 A–SUB8 B）" }
  ],

  /* 球员名单：pos = GK/DF/MF/FW（分组用）；role = 细分位置（名单图给出时填写）；img 为本地照片路径（assets/img/players/），无照片留空（用头像占位） */
  players: {
    "juvenil-a": [
      { num: "—", name: "Gerard Sala", zh: "赫拉德·萨拉", pos: "GK", role: "GK", nation: "西班牙", dob: "2008-01-25", img: "", sfId: "2229916" },
      { num: "—", name: "Gerard Valls", zh: "杰拉德·巴尔斯", pos: "GK", role: "GK", nation: "西班牙", dob: "2009-01-20", img: "", sfId: "2048364" },
      { num: "—", name: "Nil Teixidor", zh: "尼尔·特西多尔", pos: "DF", role: "RB", nation: "西班牙", dob: "2008-02-28", foot: "右脚", note: "右后卫 · 合同至 2027", img: "", sfId: "1926082" },
      { num: "—", name: "Raúl Expósito", zh: "劳尔·埃斯波西托", pos: "DF", role: "RB", nation: "西班牙", dob: "2009-04-26", img: "", sfId: "2607840" },
      { num: "—", name: "Nico Marcipar", zh: "尼科·马西帕", pos: "DF", role: "CB", nation: "阿根廷", dob: "2008-02-13", foot: "左脚", note: "左脚中卫", img: "", sfId: "2076881" },
      { num: "—", name: "Baba Kourouma", zh: "巴巴·库鲁马", pos: "DF", role: "CB", nation: "西班牙", dob: "2009-02-23", foot: "左脚", note: "左脚中卫 · 莫里巴之弟", img: "baba-kourouma.jpg", imgCredit: "barcauniversal.com", imgUrl: "https://barcauniversal.com/who-is-baba-kourouma-the-16-year-old-gem-called-up-to-barcelona-first-team-training/", sfId: "2076894" },
      { num: "—", name: "Sergi Mayans", zh: "塞尔吉·马扬斯", pos: "DF", role: "CB", nation: "西班牙", dob: "2009-01-29", img: "", sfId: "2128115" },
      { num: "—", name: "Joan Inglés", zh: "若安·因格莱斯", pos: "DF", role: "CB", nation: "西班牙", dob: "2009-04-09", img: "", sfId: "2229086" },
      { num: "—", name: "Mikael Baza", zh: "米卡埃尔·巴萨", pos: "DF", role: "CB", nation: "德国", dob: "2010-01-12", img: "", sfId: "2311166" },
      { num: "—", name: "Pol Bernabéu", zh: "波尔·贝尔纳乌", pos: "DF", role: "LB", nation: "西班牙", dob: "2008-01-05", foot: "左脚", note: "青训 · 合同至 2027", img: "", sfId: "2076871" },
      { num: "—", name: "Lorenzo Oertli", zh: "洛伦佐·厄特利", pos: "DF", role: "LB", nation: "西班牙", dob: "2008-03-26", foot: "左脚", note: "左后卫", img: "", sfId: "2229084" },
      { num: "—", name: "Adam Argemí", zh: "亚当·阿尔赫米", pos: "MF", role: "CDM", nation: "西班牙", dob: "2008-02-04", img: "", sfId: "2076887" },
      { num: "—", name: "Samu Borniquel", zh: "萨穆·博尔尼克尔", pos: "MF", role: "CDM", nation: "西班牙", dob: "2010-01-20", img: "", sfId: "2407333" },
      { num: "—", name: "Michał Żuk", zh: "米哈乌·祖克", pos: "MF", role: "CM", nation: "西班牙", dob: "2009-01-01", img: "", sfId: "2128103" },
      { num: "—", name: "Xavi Miràngels", zh: "哈维·米兰赫尔斯", pos: "MF", role: "CM", nation: "西班牙", dob: "2009-07-20", img: "", sfId: "2722893" },
      { num: "—", name: "Roberto Tomás", zh: "罗伯托·托马斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "2009", foot: "右脚", note: "青训", img: "", sfId: "2607839" },
      { num: "—", name: "Gorka Buil", zh: "戈尔卡·布伊尔", pos: "MF", role: "CAM", nation: "西班牙", dob: "2010-03-19", img: "", sfId: "2272317" },
      { num: "—", name: "Nil Vicens", zh: "尼尔·维森斯", pos: "FW", role: "RW", nation: "西班牙", dob: "2008", foot: "左脚", note: "青训 · 夺冠战首开纪录", img: "", sfId: "2014710" },
      { num: "—", name: "Adrián Guerrero", zh: "阿德里安·格雷罗", pos: "FW", role: "ST", nation: "西班牙", dob: "2008-05-13", foot: "右脚", note: "青训 · 合同至 2027", img: "", sfId: "2048405" },
      { num: "—", name: "Nuhu Fofana", zh: "努胡·福法纳", pos: "FW", role: "ST", nation: "西班牙", dob: "2008-07-28", foot: "双脚", note: "续约至 2030 · 亦代表巴萨竞技", img: "", sfId: "2229087" },
      { num: "—", name: "Ajay Tavares", zh: "阿杰伊·塔瓦雷斯", pos: "FW", role: "LW", nation: "英格兰", dob: "2009-12-28", foot: "右脚", note: "自诺维奇城 · 英格兰 U17 国脚", img: "ajay-tavares.jpg", imgCredit: "zerozero.pt", imgUrl: "https://www.zerozero.pt/jogador/ajay-tavares/1820493", sfId: "1861694" },
      { num: "—", name: "Ïu Martínez", zh: "伊乌·马丁内斯", pos: "FW", role: "LW", nation: "西班牙", dob: "2009-04-27", img: "", sfId: "2405472" }
    ],

    "juvenil-b": [
      { num: "—", name: "Pau Espí", zh: "保罗·埃斯皮", pos: "GK", role: "GK", nation: "西班牙", img: "" },
      { num: "—", name: "Pablo Peña", zh: "巴勃罗·佩尼亚", pos: "GK", role: "GK", nation: "西班牙", dob: "2010", foot: "右脚", note: "2026 续约 · 西班牙 U15/U16", img: "", sfId: "2229083" },
      { num: "—", name: "Elyott Daussy", zh: "埃利奥特·多西", pos: "GK", role: "GK", nation: "西班牙", dob: "2010", foot: "右脚", note: "2026 续约", img: "" },
      { num: "—", name: "Guiu Xuclà", zh: "吉乌·舒克拉", pos: "DF", role: "RB", nation: "西班牙", dob: "2010-01-17", img: "guiu-xucla.jpg", imgCredit: "Sofascore", imgUrl: "https://img.sofascore.com/api/v1/player/2447156/image", sfId: "2447156" },
      { num: "—", name: "Álvaro Gómez", zh: "阿尔瓦罗·戈麦斯", pos: "DF", role: "RB", nation: "西班牙", dob: "2009-05-15", img: "", sfId: "2722899" },
      { num: "—", name: "Óscar Medina", zh: "奥斯卡·梅迪纳", pos: "DF", role: "RB", nation: "西班牙", dob: "2010-01-16", img: "", sfId: "2690246" },
      { num: "—", name: "Roc Martínez", zh: "罗克·马丁内斯", pos: "DF", role: "CB", nation: "西班牙", dob: "2010-03-04", img: "", sfId: "2342517" },
      { num: "—", name: "Luca Pérez", zh: "卢卡·佩雷斯", pos: "DF", role: "CB", nation: "西班牙", dob: "2010-01-10", img: "", sfId: "2412372" },
      { num: "—", name: "Pere Villacorta", zh: "佩雷·比利亚科塔", pos: "DF", role: "CB", nation: "西班牙", dob: "2010", foot: "左脚", img: "", sfId: "2410975" },
      { num: "—", name: "Madou Murcia", zh: "马杜·穆尔西亚", pos: "DF", role: "CB", nation: "西班牙", dob: "2008", foot: "左脚", img: "", sfId: "2738837" },
      { num: "—", name: "Ahmed Abarkane", zh: "艾哈迈德·阿巴尔卡内", pos: "DF", role: "LB", nation: "西班牙", dob: "2010", foot: "左脚", img: "ahmed-abarkane.jpg", imgCredit: "Sofascore", imgUrl: "https://img.sofascore.com/api/v1/player/2342525/image", sfId: "2342525" },
      { num: "—", name: "Pau Bergés", zh: "保罗·贝尔赫斯", pos: "DF", role: "LB", nation: "西班牙", dob: "2009-01-20", img: "", sfId: "2405426" },
      { num: "—", name: "Gerard Mullol", zh: "杰拉德·穆洛尔", pos: "MF", role: "CDM", nation: "西班牙", dob: "2010-10-11", img: "", sfId: "2866762" },
      { num: "—", name: "Mahdi El Maimouni", zh: "马赫迪·埃尔·迈穆尼", pos: "MF", role: "CDM", nation: "比利时/摩洛哥", dob: "2009-07-12", note: "2026 自沙勒罗瓦加盟", img: "", sfId: "2690302" },
      { num: "—", name: "Ignasi Bassas", zh: "伊格纳西·巴萨斯", pos: "MF", role: "CM", nation: "西班牙", dob: "2010", foot: "右脚", img: "", sfId: "2410976" },
      { num: "—", name: "Robert Oliveras", zh: "罗贝尔特·奥利韦拉斯", pos: "MF", role: "CM", nation: "西班牙", dob: "2010-11-22", img: "", sfId: "2407338" },
      { num: "—", name: "Arnau Casas", zh: "阿尔瑙·卡萨斯", pos: "MF", role: "CM", nation: "西班牙", dob: "2010-06-21", note: "2026 自 Cornellà 加盟", img: "", sfId: "2690276" },
      { num: "—", name: "Unai Balmón", zh: "乌奈·巴尔蒙", pos: "MF", role: "CAM", nation: "西班牙", dob: "2010", foot: "右脚", img: "", sfId: "2690278" },
      { num: "—", name: "Hugo Garcés", zh: "乌戈·加塞斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "2010", foot: "右脚", img: "hugo-garces.jpg", imgCredit: "Sofascore", imgUrl: "https://img.sofascore.com/api/v1/player/2405402/image", sfId: "2405402" },
      { num: "—", name: "Genís Clúa", zh: "赫尼斯·克卢瓦", pos: "MF", role: "CAM", nation: "西班牙", dob: "2009", foot: "右脚", img: "" },
      { num: "—", name: "Erik Domínguez", zh: "埃里克·多明格斯", pos: "FW", role: "RW", nation: "西班牙", dob: "2010", foot: "右脚", note: "2026 自 Cornellà 加盟", img: "", sfId: "2866767" },
      { num: "—", name: "Byron Mendoza", zh: "拜伦·门多萨", pos: "FW", role: "RW", nation: "西班牙", dob: "2009", foot: "左脚", img: "byron-mendoza.jpg", imgCredit: "Sofascore", imgUrl: "https://img.sofascore.com/api/v1/player/2446943/image", sfId: "2446943" },
      { num: "—", name: "Ismael Ziani", zh: "伊斯梅尔·齐亚尼", pos: "FW", role: "ST", nation: "摩洛哥", dob: "2009", foot: "右脚", img: "ismael-ziani.jpg", imgCredit: "al-ain.com", imgUrl: "https://al-ain.com/article/ismael-ziani-lopez-miracle-bar-a" },
      { num: "—", name: "Artem Rybak", zh: "阿尔乔姆·雷巴克", pos: "FW", role: "ST", nation: "乌克兰", dob: "2010", foot: "左脚", img: "artem-rybak.jpg", imgCredit: "dynamo.kiev.ua", imgUrl: "https://dynamo.kiev.ua/en/news/695213-ukrainian-midfielder-of-barcelona-u-18-i-want-to-grow-to-the-first-team-and-win-as-many-trophies-as-possible-with-it", sfId: "2080974" },
      { num: "—", name: "Dany Freire", zh: "达尼·弗雷雷", pos: "FW", role: "ST", nation: "葡萄牙", dob: "2010", foot: "右脚", img: "", sfId: "2151704" },
      { num: "—", name: "Noah García", zh: "诺亚·加西亚", pos: "FW", role: "LW", img: "" },
      { num: "—", name: "Ruslan Mba", zh: "鲁斯兰·姆巴", pos: "FW", role: "LW", nation: "西班牙/赤道几内亚", dob: "2010-02-27", foot: "左脚", note: "职业合同至 2029 · 人称迷你拉菲尼亚", img: "ruslan-mba.jpg", imgCredit: "Sofascore", imgUrl: "https://img.sofascore.com/api/v1/player/2128111/image", sfId: "2128111" },
      { num: "—", name: "Ibrahim Babayev", zh: "易卜拉欣·巴巴耶夫", pos: "FW", role: "LW", dob: "2008", img: "", sfId: "1990908" }
    ],

    "cadete": [
      { num: "—", name: "Arnau Ribes",          zh: "阿尔瑙·里贝斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alexander Cimoscov",   zh: "亚历山大·奇莫斯科夫", pos: "GK", nation: "—",      dob: "—", note: "旧 Cadete B 名单作 Alexander Chimoscope / Aleksander Simoskov", nameAlias: "Aleksander Simoskov, Alexander Chimoscope", img: "" },
      { num: "—", name: "Iker Nsang",           zh: "伊克尔·恩桑", pos: "DF", role: "RB", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Minguk Lee",           zh: "李民国", pos: "DF", role: "RB", nation: "韩国",   dob: "2011", foot: "右脚", note: "与李大汉为韩国双胞胎 · 2011 年生（韩媒）", img: "" },
      { num: "—", name: "Darwin Zamora",        zh: "达尔文·萨莫拉", pos: "DF", role: "CB", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Jose Basagaña",        zh: "何塞·巴萨加尼亚", pos: "DF", role: "CB", nation: "—",      dob: "—", note: "旧 Cadete B 名单作 Jose Basaña", img: "" },
      { num: "—", name: "Víctor Lao",           zh: "维克托·拉奥", pos: "DF", role: "CB", nation: "—",      dob: "2011", note: "旧 Cadete B 名单作 Víctor Rao", img: "" },
      { num: "—", name: "Lucas Bernal",         zh: "卢卡斯·贝尔纳尔", pos: "DF", role: "LB", nation: "西班牙", dob: "2011", foot: "左脚", note: "—", img: "" },
      { num: "—", name: "Daehan Lee",           zh: "李大汉", pos: "DF", role: "LB", nation: "韩国",   dob: "2011", note: "与李民国为韩国双胞胎 · 2011 年生（韩媒）", img: "" },
      { num: "—", name: "Unax Hernández",       zh: "乌纳克斯·埃尔南德斯", pos: "MF", role: "CDM", nation: "西班牙", dob: "2011", foot: "右脚", note: "巴萨竞技 Unai Hernández 之弟 · 2011 年生", img: "" },
      { num: "—", name: "Víctor Barbany",       zh: "维克托·巴尔巴尼", pos: "MF", role: "CDM", nation: "西班牙",      dob: "2011", foot: "右脚", note: "—", img: "" },
      { num: "—", name: "Dragos Bivol",         zh: "德拉戈什·比沃尔", pos: "MF", role: "CM", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Giral",            zh: "扬·希拉尔", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pau Sarrià",           zh: "保·萨里亚", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Iker García",          zh: "伊克尔·加西亚", pos: "MF", role: "CM", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Johann Leiva",         zh: "约翰·莱瓦", pos: "MF", role: "CAM", nation: "—",      dob: "—", note: "旧 Cadete B 名单作 Johan Leiva", nameAlias: "Johan Leiva", img: "" },
      { num: "—", name: "Adrián Sánchez",       zh: "阿德里安·桑切斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Víctor Santiago",      zh: "维克托·圣地亚哥", pos: "MF", role: "CAM", nation: "西班牙",      dob: "2011", foot: "左脚", note: "—", img: "" },
      { num: "—", name: "Jan Rizos",            zh: "扬·里索斯", pos: "FW", role: "RW", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Karim Mendikanov",     zh: "卡里姆·门迪卡诺夫", pos: "FW", role: "RW", nation: "—",      dob: "—", note: "—", img: "" },
      { num: "—", name: "Divine Ikenna",        zh: "迪瓦恩·伊肯纳", pos: "FW", role: "ST", nation: "西班牙",      dob: "2011", foot: "右脚", note: "—", nameAlias: "Divine Ikenna Ejiofor, Divine Ejiofor John", img: "" },
      { num: "—", name: "Héctor Néstor Asumu",  zh: "埃克托尔·阿苏穆", pos: "FW", role: "LW", nation: "西班牙", dob: "2011", foot: "左脚", note: "—", nameAlias: "Héctor Asumu", img: "" },
      { num: "—", name: "Mamadou Keita",        zh: "马马杜·凯塔", pos: "FW", role: "LW", nation: "—",      dob: "—", note: "—", img: "" },
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
      { num: "—", name: "Guillem Balcells",    zh: "吉列姆·巴尔塞尔斯", pos: "MF", role: "CDM", nation: "西班牙", dob: "2013", note: "—", img: "" },
      { num: "—", name: "Biel Blanco",         zh: "别尔·布兰科", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Mario Franco",        zh: "马里奥·佛朗哥", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Moré",            zh: "扬·莫雷", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Álex López",          zh: "亚历克斯·洛佩斯", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Julen Gallardo",      zh: "胡伦·加亚尔多", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Enzo Márquez",        zh: "恩佐·马克斯", pos: "MF", role: "CAM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Omri Weiss-Sharabi",  zh: "奥姆里·魏斯-沙拉比", pos: "MF", role: "CAM", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pep Farrés",          zh: "佩普·法雷斯", pos: "FW", role: "RW", nation: "西班牙", dob: "2013", note: "—", img: "" },
      { num: "—", name: "Abdoulatif Djitte",   zh: "阿卜杜拉蒂夫·吉特", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Juan García",         zh: "胡安·加西亚", pos: "FW", role: "RW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jayden Espinal",      zh: "杰登·埃斯皮纳尔", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Anas Saghdani",       zh: "阿纳斯·萨格达尼", pos: "FW", role: "ST", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Mounirou Kande",      zh: "穆尼鲁·坎德", pos: "FW", role: "LW", nation: "—",     dob: "2013", note: "—", img: "" },
      { num: "—", name: "Denys Sokolovskyi",   zh: "丹尼斯·索科洛夫斯基", pos: "FW", role: "LW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Aran Aparicio",       zh: "阿兰·阿帕里西奥", pos: "FW", role: "LW", nation: "西班牙", dob: "2013", foot: "左脚", note: "—", img: "" }
    ],

    /* 2026-27 赛季名单（据俱乐部各梯队官方名单图整理，2026-09-12；低龄球员中文译名为直译仅供参考） */
    "cadete-b": [
      { num: "—", name: "Álex Guardado",       zh: "亚历克斯·瓜尔达多", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ander Pérez",         zh: "安德尔·佩雷斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Biel Chacón",         zh: "别尔·查孔", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Guerra",         zh: "阿兰·格拉", pos: "DF", role: "RB", nation: "西班牙",     dob: "2012", foot: "右脚", note: "—", img: "" },
      { num: "—", name: "Yibrahan García",     zh: "伊布拉汉·加西亚", pos: "DF", role: "RB", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pol Jou",             zh: "波尔·若乌", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Derek Puig",          zh: "德里克·普伊格", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "John Ovie",           zh: "约翰·奥维", pos: "DF", role: "CB", nation: "—",     dob: "—", note: "名单图作 John Ovie（旧名单作 John Ovie Adams）", img: "" },
      { num: "—", name: "Gael Seijo",          zh: "加埃尔·塞伊霍", pos: "DF", role: "CB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Guerau Villegas",     zh: "格拉乌·比列加斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Tomás",          zh: "乌戈·托马斯", pos: "DF", role: "LB", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Munté",           zh: "扬·蒙特", pos: "MF", role: "CDM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Enzo Pérez",          zh: "恩佐·佩雷斯", pos: "MF", role: "CDM", nation: "西班牙", dob: "2012", foot: "右脚", note: "—", img: "" },
      { num: "—", name: "Gerard Mateo",        zh: "赫拉德·马特奥", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Agus Marcet",         zh: "阿古斯·马塞特", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "David Moreno",        zh: "大卫·莫雷诺", pos: "MF", role: "CM", nation: "西班牙", dob: "2012", foot: "左脚", note: "—", img: "" },
      { num: "—", name: "Antonio Amaya",       zh: "安东尼奥·阿马亚", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Edgar Doblas",        zh: "埃德加·多布拉斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alex Pliego",         zh: "亚历克斯·普列戈", pos: "FW", role: "RW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ayoub Hilali",        zh: "阿尤布·希拉利", pos: "FW", role: "RW", nation: "摩洛哥",     dob: "2012", foot: "左脚", note: "—", img: "" },
      { num: "—", name: "Fode Diallo",         zh: "福德·迪亚洛", pos: "FW", role: "ST", nation: "西班牙/几内亚", dob: "2012-06-03", foot: "右脚", note: "U12 赛季 30 场进 97 球", img: "" },
      { num: "—", name: "Juan Fernández",      zh: "胡安·费尔南德斯", pos: "FW", role: "LW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Li Haoyan",           zh: "李昊炎", pos: "FW", role: "LW", nation: "中国", dob: "2012", foot: "右脚", nameAlias: "Haoyan Li", note: "拉玛西亚 46 年首位中国籍球员 · 跨龄入 U15 · 2026-08 注册", img: "li-haoyan.jpg", imgCredit: "董路微博（凤凰网转载）", imgUrl: "https://news.ifeng.com/c/8tiRW4qt087" }
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
      { num: "—", name: "Hugo Galdeano",       zh: "乌戈·加尔德亚诺", pos: "MF", role: "CM", nation: "西班牙", dob: "2014", foot: "左脚", note: "—", img: "" },
      { num: "—", name: "José Ahumada",        zh: "何塞·阿乌马达", pos: "MF", role: "CM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Joel Cabanes",        zh: "乔尔·卡巴内斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pedro Juárez",        zh: "佩德罗·华雷斯", pos: "MF", role: "CAM", nation: "西班牙", dob: "2014", foot: "右脚", note: "—", nameAlias: "Pedrito Juárez", img: "" },
      { num: "—", name: "Alessandro Mejia",    zh: "亚历山德罗·梅希亚", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Denzel Winter",       zh: "登泽尔·温特", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Kajetan Góral",       zh: "卡耶坦·戈拉尔", pos: "FW", role: "RW", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Destiny Kosio",       zh: "德斯蒂尼·科西奥", pos: "FW", role: "ST", nation: "—",     dob: "2014", note: "—", nameAlias: "Destiny Ejiofor", img: "" },
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

    /* ── 以下为换名单时被移出各队、但归属尚未查明的球员（不参与渲染，留档待核） ──
       · 旧 Cadete A（2025-26 名单）未出现在 2026-27 Cadete A 名单图中：
         Jude Ali Berro / José Alfredo Rodríguez / Milosz Żuk / Samu Borniquel / Alex Arasa /
         Marc Armada / Alejandro Fernández / Pau Miguel Mateos
         （其余 15 人已升入 Juvenil B，见上）
       · 旧 Cadete B（2025-26 官网快照）经 2026-27 Cadete A 名单图确认即为该队阵容，已归位
       · 旧 Infantil A 未出现在新 Cadete B 名单：Pol Porta / Eric Marín / Adam Qaroual
       · 旧 Infantil B 未出现在新 Infantil A 名单：Jesús Ruescas / Enrique Villaro(Enric Vilaró)
       · 旧 Alevín A 未出现在新 Infantil C 名单：Yuk Moriya(GK, 日本)
       待拿到 Juvenil A 名单图后再归位。 */

    "u11a": [
      { num: "—", name: "Yago Villavicencio", zh: "亚戈·比利亚维森西奥", pos: "GK", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Luca Yakunin",       zh: "卢卡·亚库宁", pos: "GK", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Edwar Encarnación",  zh: "爱德华·恩卡纳西翁", pos: "DF", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Martí Prat",         zh: "马尔蒂·普拉特", pos: "DF", nation: "西班牙", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Sekou Bayo",         zh: "塞库·巴约", pos: "DF", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Izan Rodríguez",     zh: "伊桑·罗德里格斯", pos: "DF", nation: "西班牙", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Youssef El Mir",     zh: "优素福·埃尔米尔", pos: "MF", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Yarei Cortés",       zh: "亚雷·科尔特斯", pos: "MF", nation: "西班牙", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Thiago Claverías",   zh: "蒂亚戈·克拉韦里亚斯", pos: "MF", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Soulaimane L'Khamal",zh: "苏莱曼·哈马尔", pos: "MF", nation: "—", dob: "2014", note: "—", img: "" },
      { num: "—", name: "Amadou Diakate",     zh: "阿马杜·迪亚卡特", pos: "FW", nation: "—", dob: "2014", note: "—", nameAlias: "Amadou Diakite", img: "" },
      { num: "—", name: "Hoossam Bnihich",    zh: "胡萨姆·布尼希", pos: "FW", nation: "—", dob: "2014", note: "—", img: "" }
    ],

    "u11b": [
      { num: "—", name: "Quim Anglada",     zh: "基姆·安格拉达", pos: "GK", nation: "西班牙", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Martín Guarnido",  zh: "马丁·瓜尔尼多", pos: "GK", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Mamadi Diallo",    zh: "马马迪·迪亚洛", pos: "DF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Martí Giral",      zh: "马尔蒂·希拉尔", pos: "DF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Youssef El Abaal", zh: "优素福·埃尔阿巴勒", pos: "DF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Martí Sánchez",    zh: "马尔蒂·桑切斯", pos: "DF", nation: "西班牙", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Edgar Guerri",     zh: "埃德加·格里", pos: "DF", nation: "西班牙", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Bruno López",      zh: "布鲁诺·洛佩斯", pos: "MF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Leo Rizo",         zh: "莱奥·里索", pos: "MF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Daniel Ezzeddine", zh: "丹尼尔·埃泽丁", pos: "MF", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Adonai Patilla",   zh: "阿多奈·帕蒂利亚", pos: "FW", nation: "—", dob: "2015", note: "—", img: "" },
      { num: "—", name: "Noah Chima",       zh: "诺亚·奇马", pos: "FW", nation: "—", dob: "2015", note: "—", img: "" }
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

/* ═══ 球员中文名补漏（全站共用）═══
   键写原始英文名，载入时统一归一化（小写、去重音、只留 a-z0-9）。
   用于 data.js 官方名单里没有的 2026-27 新面孔、以及懂球帝只给英文名的球员；
   球员卡片（player-card.js）、集锦页与首页滚动条都读这份表。 */
(function () {
  var raw = {
    "Adam Argemí": "亚当·阿尔赫米",
    "Ïu Martínez": "伊乌·马丁内斯",
    "Raúl Expósito": "劳尔·埃斯波西托",
    "Joni Hernández": "乔尼·埃尔南德斯",
    "Jonathan Hernández": "乔纳森·埃尔南德斯",
    "Gerard Valls": "赫拉德·瓦尔斯",
    "Gerard Sala": "赫拉德·萨拉",
    "Sergi Mayans": "塞尔吉·马扬斯",
    "Joan Inglés": "乔安·因格莱斯",
    "Gorka Buil": "戈尔卡·布伊尔",
    "Mikael Baza": "米卡埃尔·巴萨",
    "Xavi Miràngels": "哈维·米兰赫尔斯",
    "Alejandro Fernández": "亚历杭德罗·费尔南德斯",
    "Alexander Walton": "亚历山大·沃尔顿",
    "Alex Walton": "亚历山大·沃尔顿",
    "Daniel da Lima": "丹尼尔·达利马",
    "Jordi Pesquer": "乔尔迪·佩斯克尔",
    "José Alfredo Rodríguez": "何塞·阿尔弗雷多·罗德里格斯",
    "Jude Ali Berro": "裘德·阿里·贝罗",
    "Marc Armada": "马克·阿尔马达",
    "Alex Arasa": "亚历克斯·阿拉萨",
    "Michał Żuk": "米哈乌·茹克",
    "Miłosz Żuk": "米沃什·茹克",
    "Milosz Żuk": "米沃什·茹克",
    "Milosz Zuk": "米沃什·茹克",
    "Pau Miguel Mateos Ruido": "保·米格尔·马特奥斯",
    "Pau Miguel Mateos": "保·米格尔·马特奥斯",
    "Paumi Mateos": "保米·马特奥斯",
    "Samu Borniquel": "萨穆·博尔尼克尔"
  };
  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }
  var map = {};
  Object.keys(raw).forEach(function (k) {
    var nk = norm(k);
    if (nk && !map[nk]) map[nk] = raw[k];
  });
  window.LAMASIA_NAME_ZH = map;
})();
