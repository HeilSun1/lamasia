/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 共享数据
   数据整理截至 2026-08-06（2026-27 赛季起步期）
   梯队结构依据 fcbarcelona.com 官方 2026/27 教练名单
   名单为 2025-26 赛季官方名单
   ═══════════════════════════════════════════════ */
window.LAMASIA_DATA = {
  updated: "2026-08-06",

  teams: [
    { id: "barca-atletic", age: "预备队",  name: "Barça Atlètic",        league: "Segunda Federación · G2",                 href: "teams/barca-atletic.html", desc: "一线储备队 · 体系顶端" },
    { id: "juvenil-a",     age: "U19",      name: "U19 A · Juvenil A",    league: "División de Honor Juvenil · G3",          href: "teams/juvenil-a.html",     desc: "一线青年队 · 精英组" },
    { id: "juvenil-b",     age: "U19",      name: "U19 B · Juvenil B",    league: "Liga Nacional Juvenil",                   href: "teams/juvenil-b.html",     desc: "二线青年队" },
    { id: "cadete",        age: "U16",      name: "U16 · Cadete A",       league: "División de Honor Cadete",                href: "teams/cadete.html",        desc: "少年梯队最高组" },
    { id: "cadete-b",      age: "U15",      name: "U15 · Cadete B",       league: "Preferente Cadete",                       href: "teams/cadete-b.html",      desc: "少年B队" },
    { id: "infantil",      age: "U14",      name: "U14 · Infantil A",     league: "División de Honor Infantil",              href: "teams/infantil.html",      desc: "技术打磨关键期" },
    { id: "infantil-b",    age: "U13",      name: "U13 · Infantil B",     league: "Preferente Infantil",                     href: "teams/infantil-b.html",    desc: "儿童B队" },
    { id: "seven",         age: "U12–U8",   name: "七人制梯队",            league: "Alevín · Benjamín · Prebenjamín",         href: "teams/seven-a-side.html",  desc: "9 支 7 人制梯队" }
  ],

  /* 球员名单：pos = GK/DF/MF/FW；img 为本地照片路径（assets/img/players/），无照片留空（用头像占位） */
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
      { num: "—",  name: "Hamza Abdelkarim",     zh: "哈姆扎·阿卜杜勒卡里姆", pos: "FW", nation: "埃及",         dob: "2008-01-01", note: "已升巴萨竞技 · 埃及国家队",   img: "hamza-abdelkarim.jpg", imgCredit: "Transfermarkt", imgUrl: "https://www.transfermarkt.com/hamza-abdelkarim/profil/spieler/1259085" }
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
      { num: "—", name: "Ismael Ziani",        zh: "伊斯梅尔·齐亚尼", pos: "FW", nation: "—",     dob: "—", note: "—", img: "ismael-ziani.jpg", imgCredit: "al-ain.com", imgUrl: "https://al-ain.com/article/ismael-ziani-lopez-miracle-bar-a" }
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
      { num: "—", name: "Pau Miguel Mateos",     zh: "保·米格尔·马特奥斯", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ruslan Mba",            zh: "鲁斯兰·姆巴", pos: "FW", nation: "西班牙/赤道几内亚", dob: "2010-02-27", note: "职业合同至 2029 · 人称迷你拉菲尼亚", img: "" }
    ],

    "infantil": [
      { num: "—", name: "Biel Chacón",        zh: "别尔·查孔", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alex Guardado",      zh: "亚历克斯·瓜尔达多", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Ander Pérez",        zh: "安德尔·佩雷斯", pos: "GK", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "John Ovie Adams",    zh: "约翰·奥维·亚当斯", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Yibrahan Garcia",    zh: "伊布拉汉·加西亚", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Alan Guerra",        zh: "阿兰·格拉", pos: "DF", nation: "—",     dob: "—", note: "—", img: "" },
      { num: "—", name: "Pol Jou",            zh: "波尔·若乌", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Pol Porta",          zh: "波尔·波尔塔", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Derek Puig",         zh: "德里克·普伊格", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Hugo Tomás",         zh: "乌戈·托马斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Guerau Villegas",    zh: "格拉乌·比列加斯", pos: "DF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Antonio Amaya",      zh: "安东尼奥·阿马亚", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Edgar Doblas",       zh: "埃德加·多布拉斯", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Agus Marcet",        zh: "阿古斯·马塞特", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Eric Marín",         zh: "埃里克·马林", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Gerard Mateo",       zh: "赫拉德·马特奥", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "David Moreno",       zh: "大卫·莫雷诺", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Jan Munté",          zh: "扬·蒙特", pos: "MF", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Fode Diallo",        zh: "福德·迪亚洛", pos: "FW", nation: "西班牙/几内亚", dob: "2012-06-03", note: "U12 赛季 30 场进 97 球", img: "" },
      { num: "—", name: "Juan Fernández",     zh: "胡安·费尔南德斯", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Alex Pliego",        zh: "亚历克斯·普列戈", pos: "FW", nation: "西班牙", dob: "—", note: "—", img: "" },
      { num: "—", name: "Adam Qaroual",       zh: "亚当·卡鲁瓦尔", pos: "FW", nation: "—",     dob: "—", note: "—", img: "" }
    ]
  }
};
