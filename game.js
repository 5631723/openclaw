const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");
const automationDriven = Boolean(window.navigator.webdriver);

const simulationTuning = automationDriven
  ? {
      dayLength: 10,
      initialSpawnDelay: 0.45,
      minSpawnDelay: 0.45,
      spawnBaseDelay: 0.95,
      spawnDaySlope: 0.03,
      visitorSpeedMultiplier: 3.2,
      visitorWait: 0.16,
    }
  : {
      dayLength: 18,
      initialSpawnDelay: 1.8,
      minSpawnDelay: 1.05,
      spawnBaseDelay: 2.3,
      spawnDaySlope: 0.04,
      visitorSpeedMultiplier: 1,
      visitorWait: 0.9,
    };

const layout = {
  gridX: 38,
  gridY: 148,
  cols: 14,
  rows: 10,
  tile: 60,
  sidebarX: 914,
  sidebarY: 112,
  sidebarW: 468,
  sidebarH: 760,
  roadY: 808,
  roadH: 62,
};

const calendarTuning = {
  daysPerYear: 360,
  seasonLength: 90,
  calendarDayStep: 15,
};

const shellThemePalettes = {
  spring: {
    sunny: { top: "#f3d778", bottom: "#efab76", glow: "rgba(255,255,255,0.46)" },
    cloudy: { top: "#e8cf88", bottom: "#d7b27f", glow: "rgba(255,255,255,0.32)" },
    drizzle: { top: "#c8d2a1", bottom: "#91b5a8", glow: "rgba(232,244,255,0.24)" },
    "festival-breeze": { top: "#ffd784", bottom: "#f19f72", glow: "rgba(255,246,214,0.42)" },
    snow: { top: "#dce7f1", bottom: "#bfd1dd", glow: "rgba(255,255,255,0.52)" },
  },
  summer: {
    sunny: { top: "#f7cf63", bottom: "#f08c5d", glow: "rgba(255,252,210,0.38)" },
    cloudy: { top: "#dfc287", bottom: "#d39d73", glow: "rgba(255,246,225,0.28)" },
    drizzle: { top: "#b8c69a", bottom: "#82a7a0", glow: "rgba(220,238,255,0.2)" },
    "festival-breeze": { top: "#ffd36a", bottom: "#f06f67", glow: "rgba(255,237,197,0.4)" },
    snow: { top: "#dde6ef", bottom: "#c4d2dc", glow: "rgba(255,255,255,0.46)" },
  },
  autumn: {
    sunny: { top: "#efc878", bottom: "#d98d63", glow: "rgba(255,242,214,0.34)" },
    cloudy: { top: "#d8bd8f", bottom: "#b99879", glow: "rgba(255,245,226,0.24)" },
    drizzle: { top: "#b9b79e", bottom: "#8e98a5", glow: "rgba(226,233,247,0.18)" },
    "festival-breeze": { top: "#f1c86d", bottom: "#da7c63", glow: "rgba(255,232,189,0.36)" },
    snow: { top: "#dde4ea", bottom: "#c3ccd6", glow: "rgba(255,255,255,0.48)" },
  },
  winter: {
    sunny: { top: "#dfe9f7", bottom: "#c9d7eb", glow: "rgba(255,255,255,0.48)" },
    cloudy: { top: "#d1dbe8", bottom: "#bcc9da", glow: "rgba(255,255,255,0.32)" },
    drizzle: { top: "#c1d0dd", bottom: "#a8b8c9", glow: "rgba(235,245,255,0.22)" },
    "festival-breeze": { top: "#e7dff3", bottom: "#cfc3e5", glow: "rgba(255,246,255,0.4)" },
    snow: { top: "#e9f1fb", bottom: "#d2deee", glow: "rgba(255,255,255,0.58)" },
  },
};

const facilityTypes = [
  {
    id: "snack",
    name: "Snack Bar",
    cost: 35,
    baseIncome: 6,
    appeal: 6,
    unlockAt: 0,
    color: "#f06b4d",
    footprint: { w: 1, h: 1 },
    bonusText: "靠近 Park 时人气更高",
    synergy: { park: { income: 2, rating: 2, pop: 4 } },
    sprite: [
      "..rrrrrrrrrr..",
      ".rrrryyyyrrrr.",
      "rrrwwwwwwwwrrr",
      "rrwwooooooowrr",
      "rrwwooooooowrr",
      "rrwwwwwwwwwwrr",
      ".rrrccccccrrr.",
      "..rrccccccrr..",
      "..rrccccccrr..",
      ".rrrccccccrrr.",
      ".rrll....llrr.",
      ".rlll....lllrr",
      ".rlll....lllrr",
      "..lll....lll..",
      "..bbb....bbb..",
      "..............",
    ],
    palette: {
      r: "#d84c36",
      y: "#ffe173",
      w: "#fff9e8",
      o: "#a34b2a",
      c: "#f4c780",
      l: "#694640",
      b: "#463538",
    },
  },
  {
    id: "park",
    name: "Sunny Park",
    cost: 28,
    baseIncome: 3,
    appeal: 9,
    unlockAt: 0,
    color: "#67b353",
    footprint: { w: 1, h: 1 },
    bonusText: "和 Snack / Bath 形成休闲区",
    synergy: {
      snack: { income: 2, rating: 2, pop: 3 },
      bath: { income: 3, rating: 3, pop: 3 },
    },
    sprite: [
      "...ggggggg....",
      "..ggggggggg...",
      ".ggggggggggg..",
      ".ggggggggggg..",
      "..ggggggggg...",
      "...ggggggg....",
      "......tt......",
      ".....tttt.....",
      "....tttttt....",
      "...tttttttt...",
      "..tttttttttt..",
      "..tt..tt..tt..",
      "..tt..tt..tt..",
      ".bbbbbbbbbbbb.",
      ".bbbbbbbbbbbb.",
      "..............",
    ],
    palette: {
      g: "#71bf57",
      t: "#8d5b39",
      b: "#d9b46b",
    },
  },
  {
    id: "arcade",
    name: "Mini Arcade",
    cost: 55,
    baseIncome: 10,
    appeal: 8,
    unlockAt: 22,
    color: "#5f74df",
    footprint: { w: 2, h: 1 },
    bonusText: "挨着 Snack 时更会赚钱",
    synergy: { snack: { income: 4, rating: 2, pop: 3 } },
    sprite: [
      "..bbbbbbbbbb..",
      ".bbiiiiiiiiibb.",
      "bbiiiiiiiiiiibb",
      "bbiyyiiiiyyiibb",
      "bbiyyiiiiyyiibb",
      "bbiiiiiiiiiiibb",
      "bbiiiccccciiibb",
      ".bbiicccccciibb.",
      ".bbiicpppcciibb.",
      ".bbiiiccccciiibb",
      ".bbll......llbb.",
      ".bbll......llbb.",
      ".bbll......llbb.",
      "..kk........kk..",
      "..kk........kk..",
      "..............",
    ],
    palette: {
      b: "#4554a5",
      i: "#6b7cf3",
      y: "#ffe26f",
      c: "#d5d7f6",
      p: "#f06390",
      l: "#2f3156",
      k: "#383240",
    },
  },
  {
    id: "bath",
    name: "Pocket Bath",
    cost: 78,
    baseIncome: 13,
    appeal: 11,
    unlockAt: 48,
    color: "#72c7d5",
    footprint: { w: 2, h: 2 },
    bonusText: "靠近 Park 时评价涨得快",
    synergy: { park: { income: 3, rating: 5, pop: 2 } },
    sprite: [
      "..cccccccccc..",
      ".ccwwwwwwwwcc.",
      "ccwwwwwwwwwwcc",
      "ccwwoooooowwcc",
      "ccwwoooooowwcc",
      "ccwwwwwwwwwwcc",
      "ccwwttttttwwcc",
      ".ccwttttttwcc.",
      ".ccwttttttwcc.",
      ".ccwwwwwwwwcc.",
      ".ccll....llcc.",
      ".ccll....llcc.",
      ".ccll....llcc.",
      "..bb......bb..",
      "..bb......bb..",
      "..............",
    ],
    palette: {
      c: "#65c6d3",
      w: "#f8f8f0",
      o: "#f4a261",
      t: "#89d5e3",
      l: "#58727a",
      b: "#37505a",
    },
  },
  {
    id: "tower",
    name: "Idol Tower",
    cost: 105,
    baseIncome: 17,
    appeal: 13,
    unlockAt: 88,
    color: "#ef5aa1",
    footprint: { w: 3, h: 2 },
    bonusText: "和 Arcade 配套会爆红",
    synergy: { arcade: { income: 5, rating: 6, pop: 5 } },
    sprite: [
      "......pp......",
      ".....pppp.....",
      "....ppyypp....",
      "...ppyyyypp...",
      "..ppyyyyyypp..",
      "..ppyyyyyypp..",
      "...ppyyyypp...",
      "...pppwwppp...",
      "...ppwwwwpp...",
      "...ppwwwwpp...",
      "...ppwwwwpp...",
      "...ppwwwwpp...",
      "..rrppwwpprr..",
      "..rr..ww..rr..",
      "..rr..ww..rr..",
      "..............",
    ],
    palette: {
      p: "#ea58a5",
      y: "#ffe26f",
      w: "#fff4fb",
      r: "#6f3c56",
    },
  },
];

const visitorPalette = [
  { shirt: "#5c7cfa", hair: "#5a3d2b" },
  { shirt: "#f06595", hair: "#2f2a46" },
  { shirt: "#51cf66", hair: "#8d5b39" },
  { shirt: "#ffd43b", hair: "#5a4638" },
];

const visitorArchetypes = [
  {
    id: "student",
    label: "学生客",
    favoriteTypes: ["arcade", "snack"],
    likedTimes: ["daytime", "evening"],
    likedWeathers: ["cloudy", "festival-breeze"],
    festivalBias: ["summer-fair"],
  },
  {
    id: "family",
    label: "家庭客",
    favoriteTypes: ["park", "snack", "bath"],
    likedTimes: ["daytime", "morning"],
    likedWeathers: ["sunny"],
    festivalBias: ["new-year", "flower"],
  },
  {
    id: "worker",
    label: "上班族",
    favoriteTypes: ["snack", "bath"],
    likedTimes: ["morning", "evening"],
    likedWeathers: ["cloudy", "drizzle"],
    festivalBias: ["harvest"],
  },
  {
    id: "traveler",
    label: "游客",
    favoriteTypes: ["tower", "park", "arcade"],
    likedTimes: ["daytime", "evening"],
    likedWeathers: ["sunny", "festival-breeze"],
    festivalBias: ["flower", "summer-fair"],
  },
];

const landmarkTypes = [
  {
    id: "clinic",
    name: "Town Clinic",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 2 },
    color: "#e46b72",
    sprite: [
      "................",
      "..rrrrrrrrrr....",
      ".rrwwwwwwwwrr...",
      ".rrwwccccwwrr...",
      ".rrwwccccwwrr...",
      ".rrwwwwwwwwrr...",
      ".rrbbyyyybbrr...",
      ".rrbbyyyybbrr...",
      ".rrwwwwwwwwrr...",
      ".rrwwttttwwrr...",
      ".rrwwttttwwrr...",
      ".rrll....llrr...",
      ".rrll....llrr...",
      "..kk......kk....",
      "..kk......kk....",
      "................",
    ],
    palette: {
      r: "#d95a63",
      w: "#fff5f1",
      c: "#f06b73",
      y: "#ffd97c",
      b: "#f0c18d",
      t: "#9ed3f8",
      l: "#705850",
      k: "#43363d",
    },
  },
  {
    id: "library",
    name: "Town Library",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 2 },
    color: "#6b8fd8",
    sprite: [
      "................",
      "..bbbbbbbbbb....",
      ".bbwwwwwwwwbb...",
      ".bbwwppppwwbb...",
      ".bbwwppppwwbb...",
      ".bbwwwwwwwwbb...",
      ".bbccyyyyccbb...",
      ".bbccyyyyccbb...",
      ".bbwwwwwwwwbb...",
      ".bbwwttttwwbb...",
      ".bbwwttttwwbb...",
      ".bbll....llbb...",
      ".bbll....llbb...",
      "..kk......kk....",
      "..kk......kk....",
      "................",
    ],
    palette: {
      b: "#5d7fc5",
      w: "#f4f8ff",
      p: "#8ca6dd",
      c: "#b6c7ea",
      y: "#ffd86e",
      t: "#a6d7f5",
      l: "#50627d",
      k: "#3d495a",
    },
  },
  {
    id: "post",
    name: "Post House",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 2 },
    color: "#e19e58",
    sprite: [
      "................",
      "..oooooooooo....",
      ".oowwwwwwwwoo...",
      ".oowwmmmmwwoo...",
      ".oowmwwwwmwoo...",
      ".oowwwwwwwwoo...",
      ".ooccyyyyccoo...",
      ".ooccyyyyccoo...",
      ".oowwwwwwwwoo...",
      ".oowwttttwwoo...",
      ".oowwttttwwoo...",
      ".ooll....lloo...",
      ".ooll....lloo...",
      "..kk......kk....",
      "..kk......kk....",
      "................",
    ],
    palette: {
      o: "#d98a46",
      w: "#fff5e9",
      m: "#f1cda1",
      c: "#f4d8a2",
      y: "#ffd86c",
      t: "#9fd7f4",
      l: "#795847",
      k: "#44363a",
    },
  },
  {
    id: "police",
    name: "Police Box",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 2 },
    color: "#5c83c8",
    sprite: [
      "................",
      "..bbbbbbbbbb....",
      ".bbwwwwwwwwbb...",
      ".bbwwppppwwbb...",
      ".bbwwpggpwwbb...",
      ".bbwwppppwwbb...",
      ".bbccyyyyccbb...",
      ".bbccyyyyccbb...",
      ".bbwwwwwwwwbb...",
      ".bbwwttttwwbb...",
      ".bbwwttttwwbb...",
      ".bbll....llbb...",
      ".bbll....llbb...",
      "..kk......kk....",
      "..kk......kk....",
      "................",
    ],
    palette: {
      b: "#567abf",
      w: "#f4f8ff",
      p: "#87a6dd",
      g: "#ffe47a",
      c: "#b6c8eb",
      y: "#ffd96f",
      t: "#a5d7f4",
      l: "#4d617c",
      k: "#3c495b",
    },
  },
  {
    id: "workshop",
    name: "Craft Works",
    kind: "landmark",
    removable: false,
    footprint: { w: 3, h: 2 },
    color: "#7c8a92",
    sprite: [
      "...ssssssssss...",
      "..sswwwwwwwwss..",
      ".sswwhhhhhhwwss.",
      ".sswwhwwwwhwwss.",
      ".sswwhhhhhhwwss.",
      ".sswwwwwwwwwwss.",
      ".ssccbbccbbccss.",
      ".ssccbbccbbccss.",
      ".sswwwwttwwwwss.",
      ".sswwwwttwwwwss.",
      ".ssll..ll..llss.",
      ".ssll..ll..llss.",
      ".sskk..kk..kkss.",
      ".sskk..kk..kkss.",
      "..kk..........kk",
      "................",
    ],
    palette: {
      s: "#707d86",
      w: "#f5f4ef",
      h: "#b5c3cc",
      c: "#9caab4",
      b: "#ffd971",
      t: "#9fd5f1",
      l: "#5c6267",
      k: "#403b42",
    },
  },
];

const sceneryTypes = [
  {
    id: "tree",
    name: "Street Tree",
    kind: "tree",
    removable: true,
    footprint: { w: 1, h: 1 },
    color: "#69b95b",
    sprite: [
      ".....ggg........",
      "....ggggg.......",
      "...ggggggg......",
      "...ggggggg......",
      "....ggggg.......",
      ".....ggg........",
      "......tt........",
      "......tt........",
      ".....bbbb.......",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    palette: {
      g: "#67b95d",
      t: "#8d5b39",
      b: "#d3b078",
    },
  },
];

const structureTypes = [...facilityTypes, ...landmarkTypes, ...sceneryTypes];

const npcProfiles = [
  { id: "mika", name: "美佳", shirt: "#ff8aa1", hair: "#5c3d31", accent: "#fff0c5" },
  { id: "taichi", name: "太一", shirt: "#6db8ff", hair: "#48352f", accent: "#f6f3ce" },
  { id: "yuzu", name: "柚子", shirt: "#8edc74", hair: "#6b4c3d", accent: "#fff7d9" },
];

const goalDefinitions = [
  {
    id: "build-3",
    title: "建成 3 家设施",
    rewardMoney: 45,
    rewardRating: 3,
  },
  {
    id: "combo-2",
    title: "触发 2 次联动组合",
    rewardMoney: 55,
    rewardRating: 4,
  },
  {
    id: "serve-8",
    title: "接待 8 位顾客",
    rewardMoney: 70,
    rewardRating: 4,
  },
  {
    id: "rating-80",
    title: "街区评价达到 80★",
    rewardMoney: 90,
    rewardRating: 5,
  },
];

const seasonDefinitions = [
  {
    id: "spring",
    name: "Spring",
    label: "春季",
    visitorMultiplier: 1.04,
    color: "#ffd7e6",
    facilityBonuses: {
      park: { income: 1, rating: 1, pop: 3 },
      snack: { rating: 1 },
    },
  },
  {
    id: "summer",
    name: "Summer",
    label: "夏季",
    visitorMultiplier: 1.1,
    color: "#ffe48c",
    facilityBonuses: {
      snack: { income: 2, pop: 2 },
      arcade: { income: 1, rating: 1 },
    },
  },
  {
    id: "autumn",
    name: "Autumn",
    label: "秋季",
    visitorMultiplier: 1,
    color: "#ffc17a",
    facilityBonuses: {
      arcade: { income: 1, pop: 2 },
      tower: { rating: 2, pop: 1 },
    },
  },
  {
    id: "winter",
    name: "Winter",
    label: "冬季",
    visitorMultiplier: 0.92,
    color: "#dcecff",
    facilityBonuses: {
      bath: { income: 3, rating: 2, pop: 4 },
      park: { income: -1, pop: -2 },
    },
  },
];

const weatherDefinitions = [
  {
    id: "sunny",
    name: "Sunny",
    label: "晴天",
    weights: { spring: 5, summer: 5, autumn: 4, winter: 2 },
    visitorMultiplier: 1.08,
    facilityBonuses: {
      park: { pop: 2, rating: 1 },
      snack: { income: 1 },
    },
  },
  {
    id: "cloudy",
    name: "Cloudy",
    label: "多云",
    weights: { spring: 3, summer: 2, autumn: 3, winter: 3 },
    visitorMultiplier: 1,
    facilityBonuses: {},
  },
  {
    id: "drizzle",
    name: "Drizzle",
    label: "小雨",
    weights: { spring: 3, summer: 1, autumn: 3, winter: 1 },
    visitorMultiplier: 0.9,
    facilityBonuses: {
      bath: { income: 2, pop: 2 },
      park: { income: -1, pop: -2 },
    },
  },
  {
    id: "festival-breeze",
    name: "Festival Breeze",
    label: "祭典微风",
    weights: { spring: 1, summer: 3, autumn: 2, winter: 0 },
    visitorMultiplier: 1.12,
    facilityBonuses: {
      tower: { rating: 2, pop: 2 },
      arcade: { income: 1, pop: 1 },
    },
  },
  {
    id: "snow",
    name: "Soft Snow",
    label: "小雪",
    weights: { spring: 0, summer: 0, autumn: 1, winter: 4 },
    visitorMultiplier: 0.82,
    facilityBonuses: {
      bath: { income: 3, rating: 1, pop: 2 },
      snack: { income: 1 },
      park: { income: -1, pop: -3 },
    },
  },
];

const annualFestivalDefinitions = [
  {
    id: "new-year",
    dayOfYear: 1,
    name: "新年大卖场",
    color: "#ffd56c",
    description: "招牌挂满新年饰带，零食和公园会吸来更多客人。",
    trafficModifier: 1.32,
    facilityBonuses: {
      snack: { income: 3, rating: 1, pop: 3 },
      park: { income: 1, rating: 2, pop: 4 },
    },
  },
  {
    id: "flower",
    dayOfYear: 90,
    name: "花见步行祭",
    color: "#ffc4de",
    description: "春日花见开始，适合散步和拍照的设施会更受欢迎。",
    trafficModifier: 1.22,
    facilityBonuses: {
      park: { income: 2, rating: 2, pop: 4 },
      tower: { rating: 2, pop: 2 },
    },
  },
  {
    id: "summer-fair",
    dayOfYear: 180,
    name: "夏日烟火夜",
    color: "#ffb45c",
    description: "夜市与烟火点亮街区，零食、街机和高塔会吃满热度。",
    trafficModifier: 1.38,
    facilityBonuses: {
      snack: { income: 3, pop: 3 },
      arcade: { income: 2, rating: 1, pop: 2 },
      tower: { income: 2, rating: 2, pop: 3 },
    },
  },
  {
    id: "harvest",
    dayOfYear: 270,
    name: "丰收感恩市",
    color: "#ffd493",
    description: "秋收市集带来稳定客流，适合做组合收益和慢节奏逛街。",
    trafficModifier: 1.24,
    facilityBonuses: {
      snack: { income: 2, pop: 2 },
      bath: { income: 2, rating: 2, pop: 1 },
      park: { rating: 1, pop: 2 },
    },
  },
];

const timeOfDayDefinitions = [
  {
    id: "midnight",
    label: "深夜",
    start: 0,
    end: 6,
    visitorMultiplier: 0.28,
    overlay: "rgba(28, 38, 88, 0.34)",
    accent: "#9cb5ff",
  },
  {
    id: "morning",
    label: "清晨",
    start: 6,
    end: 10,
    visitorMultiplier: 0.78,
    overlay: "rgba(255, 229, 182, 0.08)",
    accent: "#ffd38c",
  },
  {
    id: "daytime",
    label: "白天",
    start: 10,
    end: 18,
    visitorMultiplier: 1.12,
    overlay: "rgba(255, 255, 255, 0)",
    accent: "#fff0b0",
  },
  {
    id: "evening",
    label: "傍晚",
    start: 18,
    end: 24,
    visitorMultiplier: 0.88,
    overlay: "rgba(115, 67, 33, 0.16)",
    accent: "#ffb56d",
  },
];

const dialogueTemplates = {
  start: [
    () => "今天开街第一天，感觉会有不少人来逛。",
    () => "招牌一亮起来，这条街一下就有味道了。",
  ],
  build: [
    ({ facilityName }) => `${facilityName} 新开张，路过的人已经在偷看菜单了。`,
    ({ facilityName }) => `${facilityName} 摆上去以后，街景立刻像样多了。`,
  ],
  "big-build": [
    ({ facilityName }) => `${facilityName} 这排面够大，已经有点地标建筑的意思。`,
    ({ facilityName }) => `这么大的 ${facilityName} 一落地，整条街都显得热闹了。`,
  ],
  combo: [
    ({ comboText }) => `${comboText} 贴在一起真搭，看着就像热门街区。`,
    ({ comboText }) => `${comboText} 这组合很开罗味，顾客一看就会拐进来。`,
  ],
  removal: [
    ({ facilityName }) => `${facilityName} 撤掉以后视野清爽了，重新规划也不错。`,
    ({ facilityName }) => `${facilityName} 先收起来吧，等资金宽裕再换更大的配置。`,
  ],
  unlock: [
    ({ facilityName }) => `${facilityName} 总算解锁了，街区的档次要往上跳一截。`,
    ({ facilityName }) => `评价够高了，${facilityName} 可以摆上台面了。`,
  ],
  goal: [
    () => "这个目标完成得很顺，街区节奏起来了。",
    ({ title }) => `${title} 已经拿下，今天的账面会好看很多。`,
  ],
  weather: [
    ({ weatherLabel }) => `${weatherLabel} 的日子，客人脚步会跟着天气变。`,
    ({ weatherLabel }) => `今天是 ${weatherLabel}，得看准哪类店更吃香。`,
  ],
  season: [
    ({ seasonLabel }) => `${seasonLabel} 一到，整条街的气质都跟着换了。`,
    ({ seasonLabel }) => `${seasonLabel} 的配色真舒服，适合把招牌做得更亮一点。`,
  ],
  festival: [
    ({ festivalName }) => `${festivalName} 开始了，街上这股热闹劲一下就上来了。`,
    ({ festivalName }) => `${festivalName} 这几天得把门口收拾得更体面，客人会明显变多。`,
  ],
  trend: [
    ({ trendName }) => `今天大家都在聊 ${trendName}，这股热度得接住。`,
    ({ trendName }) => `${trendName} 成了今日热潮，摆得好就能吃满这波流量。`,
  ],
  service: [
    ({ facilityName }) => `${facilityName} 又接了一单，门口的人气越来越稳。`,
    ({ facilityName }) => `${facilityName} 的客人出得很快，这个点位挑对了。`,
  ],
  queue: [
    ({ facilityName }) => `${facilityName} 门口开始排队了，节奏已经起来。`,
    ({ facilityName }) => `${facilityName} 前面有人等着，看来这家是真有人气。`,
  ],
  crowded: [
    ({ facilityName }) => `${facilityName} 门口挤成一团，晚一点再来也许更顺。`,
    ({ facilityName }) => `${facilityName} 这会儿太火了，排队的人已经拐弯。`,
  ],
  levelup: [
    ({ facilityName, level }) => `${facilityName} 升到 Lv.${level} 了，老顾客开始认这家招牌了。`,
    ({ facilityName, level }) => `${facilityName} 做到 Lv.${level}，这就是口碑慢慢堆起来的感觉。`,
  ],
  day: [
    ({ seasonLabel }) => `新的一天开始了，${seasonLabel} 的街景还是很耐看。`,
    () => "今天继续把街区铺顺，别让黄金地段空着。",
  ],
  generic: [
    () => "慢慢把店铺连成一片，街区就会自己活起来。",
  ],
};

const state = createInitialState();

function createGrid() {
  return Array.from({ length: layout.rows }, () =>
    Array.from({ length: layout.cols }, () => null),
  );
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getStructureDef(type) {
  return structureTypes.find((item) => item.id === type);
}

function createStructureEntity(type, col, row, id, overrides = {}) {
  const def = getStructureDef(type);
  return {
    id,
    type,
    col,
    row,
    width: def.footprint.w,
    height: def.footprint.h,
    kind: def.kind || "shop",
    removable: def.removable ?? true,
    level: def.kind === "shop" ? 1 : 0,
    visits: 0,
    queue: [],
    activeServiceId: null,
    ...overrides,
  };
}

function canOccupyTiles(grid, col, row, width, height) {
  if (col < 0 || row < 0 || col + width > layout.cols || row + height > layout.rows) {
    return false;
  }
  for (let dr = 0; dr < height; dr += 1) {
    for (let dc = 0; dc < width; dc += 1) {
      if (grid[row + dr][col + dc]) {
        return false;
      }
    }
  }
  return true;
}

function occupyStructureOnGrid(grid, structure) {
  for (let dr = 0; dr < structure.height; dr += 1) {
    for (let dc = 0; dc < structure.width; dc += 1) {
      grid[structure.row + dr][structure.col + dc] = { facilityId: structure.id };
    }
  }
}

function seedStartingStructures(grid) {
  const structures = [];
  let nextId = 1;
  const landmarkPool = shuffleArray(landmarkTypes);
  const landmarkCandidates = [];
  for (let row = 0; row <= 4; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      landmarkCandidates.push({ col, row });
    }
  }
  for (const landmarkDef of landmarkPool) {
    const shuffledSpots = shuffleArray(landmarkCandidates);
    let placed = false;
    for (const spot of shuffledSpots) {
      if (
        !canOccupyTiles(
          grid,
          spot.col,
          spot.row,
          landmarkDef.footprint.w,
          landmarkDef.footprint.h,
        )
      ) {
        continue;
      }
      const landmark = createStructureEntity(
        landmarkDef.id,
        spot.col,
        spot.row,
        nextId,
      );
      nextId += 1;
      occupyStructureOnGrid(grid, landmark);
      structures.push(landmark);
      placed = true;
      break;
    }
    if (!placed) {
      const fallbackSpot = landmarkCandidates.find((spot) =>
        canOccupyTiles(
          grid,
          spot.col,
          spot.row,
          landmarkDef.footprint.w,
          landmarkDef.footprint.h,
        ),
      );
      if (!fallbackSpot) {
        continue;
      }
      const landmark = createStructureEntity(
        landmarkDef.id,
        fallbackSpot.col,
        fallbackSpot.row,
        nextId,
      );
      nextId += 1;
      occupyStructureOnGrid(grid, landmark);
      structures.push(landmark);
    }
  }

  const treeCount = 4 + Math.floor(Math.random() * 3);
  const candidates = [];
  for (let row = 3; row < layout.rows - 1; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      candidates.push({ col, row });
    }
  }
  for (const tile of shuffleArray(candidates)) {
    if (structures.filter((item) => item.kind === "tree").length >= treeCount) {
      break;
    }
    if (!canOccupyTiles(grid, tile.col, tile.row, 1, 1)) {
      continue;
    }
    if (tile.row >= layout.rows - 2 && (tile.col === 0 || tile.col === 1)) {
      continue;
    }
    const tree = createStructureEntity("tree", tile.col, tile.row, nextId);
    nextId += 1;
    occupyStructureOnGrid(grid, tree);
    structures.push(tree);
  }
  return { structures, nextId };
}

function createNPCs() {
  return npcProfiles.map((profile, index) => ({
    ...profile,
    x: 92 + index * 70,
    y: layout.roadY + 10 + (index % 2) * 4,
    bobPhase: index * 0.8,
  }));
}

function getSeasonDefinition(dayOfYear) {
  const index = Math.floor((dayOfYear - 1) / calendarTuning.seasonLength);
  return seasonDefinitions[index] || seasonDefinitions[0];
}

function pickWeighted(items, weightKey) {
  const total = items.reduce((sum, item) => sum + (item[weightKey] || 0), 0);
  if (total <= 0) {
    return items[0];
  }
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item[weightKey] || 0;
    if (cursor <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function buildCalendar(day) {
  const absoluteDay = 1 + (day - 1) * calendarTuning.calendarDayStep;
  const year =
    1 + Math.floor((absoluteDay - 1) / calendarTuning.daysPerYear);
  const dayOfYear =
    ((absoluteDay - 1) % calendarTuning.daysPerYear) + 1;
  const season = getSeasonDefinition(dayOfYear);
  const seasonDay =
    ((dayOfYear - 1) % calendarTuning.seasonLength) + 1;
  return {
    year,
    dayOfYear,
    seasonDay,
    label: `Y${year} / D${dayOfYear}`,
    seasonId: season.id,
    seasonName: season.label,
  };
}

function getFestivalOffset(fromDayOfYear, festivalDayOfYear) {
  return (
    (festivalDayOfYear - fromDayOfYear + calendarTuning.daysPerYear) %
    calendarTuning.daysPerYear
  );
}

function isFestivalInCurrentWindow(calendar, festival) {
  return (
    getFestivalOffset(calendar.dayOfYear, festival.dayOfYear) <
    calendarTuning.calendarDayStep
  );
}

function buildFestivalEvent(festival) {
  return {
    id: `festival-${festival.id}`,
    type: "festival",
    title: festival.name,
    color: festival.color,
    description: festival.description,
    trafficModifier: festival.trafficModifier,
    facilityBonuses: festival.facilityBonuses,
  };
}

function getUpcomingFestival(dayOfYear) {
  const ordered = annualFestivalDefinitions
    .map((festival) => ({
      ...festival,
      offset: getFestivalOffset(dayOfYear, festival.dayOfYear),
    }))
    .sort((a, b) => a.offset - b.offset);
  return ordered[0];
}

function getActiveFestival(calendar) {
  return (
    annualFestivalDefinitions.find((festival) =>
      isFestivalInCurrentWindow(calendar, festival),
    ) || null
  );
}

function buildWeather(seasonId) {
  const weightedWeather = weatherDefinitions.map((weather) => ({
    ...weather,
    chance: weather.weights[seasonId] || 0,
  }));
  return pickWeighted(weightedWeather, "chance");
}

function buildWorld(day, previousWorld = null) {
  const calendar = buildCalendar(day);
  const season = seasonDefinitions.find(
    (item) => item.id === calendar.seasonId,
  ) || seasonDefinitions[0];
  const weather = buildWeather(season.id);
  const activeFestival = getActiveFestival(calendar);
  const festivalEvent = activeFestival ? buildFestivalEvent(activeFestival) : null;
  return {
    calendar,
    season,
    weather,
    activeFestival,
    upcomingFestival: getUpcomingFestival(calendar.dayOfYear),
    eventQueue: festivalEvent ? [festivalEvent] : [],
    incidentQueue: previousWorld?.incidentQueue || [],
  };
}

function getCurrentHour() {
  return (
    8 +
    Math.floor(
      ((state.dayTimer % simulationTuning.dayLength) / simulationTuning.dayLength) * 24,
    )
  ) % 24;
}

function getTimeOfDay(hour) {
  return (
    timeOfDayDefinitions.find(
      (definition) => hour >= definition.start && hour < definition.end,
    ) || timeOfDayDefinitions[0]
  );
}

function getTrafficModifier() {
  const eventTraffic = state.world.eventQueue.reduce(
    (product, event) => product * (event.trafficModifier || 1),
    1,
  );
  const incidentTraffic = state.world.incidentQueue.reduce(
    (product, incident) => product * (incident.trafficModifier || 1),
    1,
  );
  return (
    (state.world.weather.visitorMultiplier || 1) *
    (state.world.season.visitorMultiplier || 1) *
    (state.timeOfDay.visitorMultiplier || 1) *
    eventTraffic *
    incidentTraffic
  );
}

function setEnvironmentNotice(text, color = "#ffe7a3", ttl = 3.8) {
  state.environmentNotice = {
    text,
    color,
    ttl,
  };
}

function syncShellTheme() {
  const seasonPalettes =
    shellThemePalettes[state.world.season.id] || shellThemePalettes.spring;
  const basePalette =
    seasonPalettes[state.world.weather.id] || seasonPalettes.sunny;
  let top = basePalette.top;
  let bottom = basePalette.bottom;
  let glow = basePalette.glow;

  if (state.timeOfDay.id === "evening") {
    top = "#e6c17c";
    bottom = "#b97a67";
    glow = "rgba(255, 226, 190, 0.28)";
  } else if (state.timeOfDay.id === "midnight") {
    top = "#889cc4";
    bottom = "#4e6289";
    glow = "rgba(230, 240, 255, 0.18)";
  } else if (state.timeOfDay.id === "morning") {
    glow = "rgba(255, 250, 226, 0.46)";
  }

  document.documentElement.style.setProperty("--bg-top", top);
  document.documentElement.style.setProperty("--bg-bottom", bottom);
  document.documentElement.style.setProperty("--bg-glow", glow);
}

function createInitialState() {
  const initialRating = 12;
  const initialDay = 1;
  const initialWorld = buildWorld(initialDay);
  const initialHour = 8;
  const initialGrid = createGrid();
  const seededMap = seedStartingStructures(initialGrid);
  return {
    mode: "menu",
    money: 160,
    rating: initialRating,
    day: initialDay,
    clock: 0.18,
    selectedType: null,
    grid: initialGrid,
    facilities: seededMap.structures,
    visitors: [],
    floaters: [],
    messages: ["点击开始经营，做出一条热闹的商店街。"],
    nextVisitorId: 1,
    nextFacilityId: seededMap.nextId,
    spawnTimer: simulationTuning.initialSpawnDelay,
    dayTimer: 0,
    lastCombo: "暂无",
    hoveredTile: null,
    cameraPulse: 0,
    comboCount: 0,
    servedVisitors: 0,
    lifetimeIncome: 0,
    todayTrend: buildTrend(initialRating, initialDay),
    goals: goalDefinitions.map((goal) => ({
      ...goal,
      completed: false,
    })),
    winCelebrated: false,
    finalePlaceholderUnlocked: false,
    world: initialWorld,
    npcs: createNPCs(),
    activeDialogue: null,
    dialogueFeed: [],
    dialoguePointer: 0,
    dialogueCooldown: 1.6,
    visitorTalkTimer: 6.5,
    timeOfDay: getTimeOfDay(initialHour),
    environmentNotice: {
      text: "白天营业开始，街区人流最旺。",
      color: "#ffe7a3",
      ttl: 3.2,
    },
    announcedUnlocks: facilityTypes
      .filter((def) => def.unlockAt <= 0)
      .map((def) => def.id),
  };
}

function resetGame() {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  render();
}

function startGame() {
  if (state.mode === "play") {
    return;
  }
  state.mode = "play";
  pushMessage("小镇开张，第一批顾客正在路上。");
  if (state.world.activeFestival) {
    pushMessage(`${state.world.activeFestival.name} 正在举办，街区今天会更热闹。`);
    setEnvironmentNotice(
      `${state.world.activeFestival.name}：${state.world.activeFestival.description}`,
      state.world.activeFestival.color,
      4.8,
    );
  }
  syncButtons();
}

function pushMessage(text) {
  state.messages.unshift(text);
  state.messages = state.messages.slice(0, 5);
}

function getFacilityDef(type) {
  return getStructureDef(type);
}

function isUnlocked(def) {
  return state.rating >= def.unlockAt;
}

function getUnlockedFacilitiesFor(rating) {
  return facilityTypes.filter((def) => rating >= def.unlockAt);
}

function buildTrend(rating, day) {
  const unlocked = getUnlockedFacilitiesFor(rating);
  const base = unlocked[(day - 1) % unlocked.length] || facilityTypes[0];
  return {
    type: base.id,
    name: base.name,
    incomeBonus: 2 + Math.floor(day / 3),
    ratingBonus: day >= 5 ? 2 : 1,
  };
}

function pickVisitorArchetype() {
  const weights = visitorArchetypes.map((profile) => {
    let weight = 1;
    if (profile.likedTimes.includes(state.timeOfDay.id)) {
      weight += 1.1;
    }
    if (profile.likedWeathers.includes(state.world.weather.id)) {
      weight += 0.8;
    }
    if (
      state.world.activeFestival &&
      profile.festivalBias.includes(state.world.activeFestival.id)
    ) {
      weight += 1.4;
    }
    return { profile, weight };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.profile;
    }
  }
  return weights[weights.length - 1]?.profile || visitorArchetypes[0];
}

function maybeTriggerVisitorThought() {
  const candidates = state.visitors.filter(
    (visitor) =>
      visitor.phase === "going" ||
      visitor.phase === "entering" ||
      visitor.phase === "queueing" ||
      visitor.phase === "queue-wait" ||
      visitor.phase === "leaving",
  );
  if (!candidates.length) {
    return;
  }
  const visitor =
    candidates[Math.floor(Math.random() * candidates.length)];
  const facility = getFacilityById(visitor.targetFacilityId);
  const facilityName = facility ? getFacilityDef(facility.type).name : "店铺";
  const profileLabel = visitor.profileLabel || "顾客";
  const lines =
    visitor.phase === "queueing" || visitor.phase === "queue-wait"
      ? [
          `${facilityName} 前面已经有人了，不过这家看起来值得等等。`,
          `${profileLabel} 排着队也在看招牌，感觉这家店口碑不差。`,
          `这条队伍排得还算整齐，就看 ${facilityName} 出客快不快了。`,
        ]
      : visitor.phase === "leaving"
        ? [
            `${profileLabel} 逛完这一圈差不多了，下次再看看街区会不会更热闹。`,
            `${state.world.season.label} 的街景看够了，今天这趟算没白来。`,
          ]
        : [
            `${profileLabel} 今天碰上 ${state.world.weather.label}，出来逛街正合适。`,
            `${facilityName} 看起来不错，今天就去这家看看。`,
            `${state.timeOfDay.label} 的街区节奏，和我这种 ${profileLabel} 挺合拍。`,
            `${state.world.season.label} 的街景真有味道，像小镇庆典前夕。`,
            `那边的 ${facilityName} 好像挺热闹，排一会儿也值。`,
          ];
  triggerDialogue(
    "thought",
    {},
    {
      chance: 1,
      speakerId: visitor.id,
      force: true,
    },
  );
  if (state.activeDialogue) {
    state.activeDialogue.text =
      lines[Math.floor(Math.random() * lines.length)];
    state.activeDialogue.speakerName = profileLabel;
    state.dialogueFeed[0].speakerName = profileLabel;
    state.dialogueFeed[0].text = state.activeDialogue.text;
  }
}

function triggerDialogue(topic, payload = {}, options = {}) {
  const { force = false, chance = 0.28, speakerId = null } = options;
  if (!force && Math.random() > chance) {
    return;
  }
  if (state.dialogueCooldown > 0) {
    return;
  }
  if (!force && state.activeDialogue && state.activeDialogue.ttl > 1.5) {
    return;
  }
  const lines = dialogueTemplates[topic] || dialogueTemplates.generic;
  const template =
    lines[Math.floor(Math.random() * lines.length)] ||
    dialogueTemplates.generic[0];
  const candidates = state.visitors.filter(
    (visitor) =>
      visitor.phase === "going" ||
      visitor.phase === "entering" ||
      visitor.phase === "leaving",
  );
  const speaker =
    (speakerId ? getVisitorById(speakerId) : null) ||
    candidates[Math.floor(Math.random() * candidates.length)];
  if (!speaker) {
    return;
  }
  const text = template(payload);
  state.activeDialogue = {
    speakerId: speaker.id,
    speakerKind: "visitor",
    speakerName: speaker.profileLabel || "顾客",
    text,
    topic,
    ttl: 3.2,
  };
  state.dialogueFeed.unshift({
    speakerName: speaker.profileLabel || "顾客",
    text,
    topic,
  });
  state.dialogueFeed = state.dialogueFeed.slice(0, 4);
  state.dialogueCooldown = 5.2;
}

function updateDialogue(delta) {
  state.dialogueCooldown = Math.max(0, state.dialogueCooldown - delta);
  if (state.environmentNotice) {
    state.environmentNotice.ttl -= delta;
    if (state.environmentNotice.ttl <= 0) {
      state.environmentNotice = null;
    }
  }
  if (!state.activeDialogue) {
    return;
  }
  if (!getVisitorById(state.activeDialogue.speakerId)) {
    state.activeDialogue = null;
    return;
  }
  state.activeDialogue.ttl -= delta;
  if (state.activeDialogue.ttl <= 0) {
    state.activeDialogue = null;
  }
}

function tileToScreen(col, row) {
  return {
    x: layout.gridX + col * layout.tile,
    y: layout.gridY + row * layout.tile,
  };
}

function screenToTile(x, y) {
  const col = Math.floor((x - layout.gridX) / layout.tile);
  const row = Math.floor((y - layout.gridY) / layout.tile);
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) {
    return null;
  }
  return { col, row };
}

function getTileCenter(col, row, width = 1, height = 1) {
  const pos = tileToScreen(col, row);
  return {
    x: pos.x + (width * layout.tile) / 2,
    y: pos.y + (height * layout.tile) / 2 + 4,
  };
}

function getFootprintTiles(col, row, width, height) {
  const result = [];
  for (let dr = 0; dr < height; dr += 1) {
    for (let dc = 0; dc < width; dc += 1) {
      result.push({ col: col + dc, row: row + dr });
    }
  }
  return result;
}

function getFacilityTiles(facility) {
  return getFootprintTiles(
    facility.col,
    facility.row,
    facility.width,
    facility.height,
  );
}

function getFacilityById(id) {
  return state.facilities.find((facility) => facility.id === id) || null;
}

function getVisitorById(id) {
  return state.visitors.find((visitor) => visitor.id === id) || null;
}

function getFacilityAt(col, row) {
  const cell = state.grid[row]?.[col];
  if (!cell) {
    return null;
  }
  return getFacilityById(cell.facilityId);
}

function isWalkableTile(col, row, allowedFacilityId = null) {
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) {
    return false;
  }
  const occupant = getFacilityAt(col, row);
  return !occupant || occupant.id === allowedFacilityId;
}

function getFacilityEntranceTiles(facility, options = {}) {
  const { includeFallback = false } = options;
  const entrances = [];
  const frontRow = facility.row + facility.height;
  if (frontRow < layout.rows) {
    const frontCols = [];
    if (facility.width === 1) {
      frontCols.push(facility.col);
    } else if (facility.width === 2) {
      frontCols.push(facility.col, facility.col + 1);
    } else {
      frontCols.push(facility.col + Math.floor((facility.width - 1) / 2));
      frontCols.push(facility.col + Math.ceil((facility.width - 1) / 2));
    }
    for (const col of [...new Set(frontCols)]) {
      if (isWalkableTile(col, frontRow)) {
        entrances.push({ col, row: frontRow, side: "front" });
      }
    }
  }
  if (entrances.length || !includeFallback) {
    return entrances;
  }

  const fallback = [];
  const sideRows = [];
  if (facility.height === 1) {
    sideRows.push(facility.row);
  } else {
    sideRows.push(facility.row + Math.floor((facility.height - 1) / 2));
  }
  for (const row of [...new Set(sideRows)]) {
    const leftCol = facility.col - 1;
    const rightCol = facility.col + facility.width;
    if (isWalkableTile(leftCol, row)) {
      fallback.push({ col: leftCol, row, side: "left" });
    }
    if (isWalkableTile(rightCol, row)) {
      fallback.push({ col: rightCol, row, side: "right" });
    }
  }
  return fallback;
}

function getApproachTiles(facility, options = {}) {
  return getFacilityEntranceTiles(facility, options);
}

function findGridPath(start, goals) {
  const goalSet = new Set(goals.map((goal) => `${goal.col},${goal.row}`));
  const queue = [start];
  const visited = new Set([`${start.col},${start.row}`]);
  const parents = new Map();
  while (queue.length) {
    const current = queue.shift();
    const currentKey = `${current.col},${current.row}`;
    if (goalSet.has(currentKey)) {
      const path = [current];
      let cursor = currentKey;
      while (parents.has(cursor)) {
        const previous = parents.get(cursor);
        path.push(previous);
        cursor = `${previous.col},${previous.row}`;
      }
      return path.reverse();
    }
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { col: current.col + dc, row: current.row + dr };
      const key = `${next.col},${next.row}`;
      if (visited.has(key) || !isWalkableTile(next.col, next.row)) {
        continue;
      }
      visited.add(key);
      parents.set(key, current);
      queue.push(next);
    }
  }
  return null;
}

function chooseWeightedFacility(facilities, profile) {
  const weights = facilities.map((facility) => {
    const queuedVisitors = state.visitors.filter(
      (visitor) => visitor.targetFacilityId === facility.id,
    ).length;
    const weight =
      Math.max(3, getFacilityPopularity(facility)) *
        (0.72 + Math.random() * 0.9) +
      getVisitorPreferenceScore(profile, facility) +
      Math.max(0, 8 - facility.visits * 2) -
      queuedVisitors * 3;
    return { facility, weight };
  });
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.facility;
    }
  }
  return weights[weights.length - 1]?.facility || facilities[0];
}

function getRoadPoint(kind, referenceCol = Math.floor(layout.cols / 2)) {
  const playfieldWidth = layout.sidebarX - 20;
  const clampedCol = Math.max(0, Math.min(layout.cols - 1, referenceCol));
  const anchorX = layout.gridX + clampedCol * layout.tile + layout.tile / 2;
  switch (kind) {
    case "left":
      return { x: 18, y: layout.roadY + 28, kind };
    case "right":
      return { x: playfieldWidth - 14, y: layout.roadY + 28, kind };
    default:
      return { x: anchorX, y: layout.roadY + 30, kind: "center" };
  }
}

function buildVisitorRoute(facility) {
  const approachTiles = getApproachTiles(facility);
  if (!approachTiles.length) {
    return null;
  }
  const bestEntrance = approachTiles[0];
  const roadStartTile = {
    col: Math.max(0, Math.min(layout.cols - 1, bestEntrance.col)),
    row: layout.rows - 1,
  };
  const path = findGridPath(roadStartTile, approachTiles);
  if (!path) {
    return null;
  }
  const entryKinds = ["left", "right", "center"];
  const entryKind = entryKinds[Math.floor(Math.random() * entryKinds.length)];
  const exitKinds = entryKinds.filter((kind) => kind !== entryKind);
  const exitKind =
    exitKinds[Math.floor(Math.random() * exitKinds.length)] || "center";
  return {
    approachTile: path[path.length - 1],
    path,
    roadEntry: getRoadPoint(entryKind, roadStartTile.col),
    roadExit: getRoadPoint(exitKind, roadStartTile.col + (Math.random() > 0.5 ? 1 : -1)),
  };
}

function canPlaceFacility(col, row, def) {
  const { w, h } = def.footprint;
  if (col + w > layout.cols || row + h > layout.rows) {
    return {
      ok: false,
      reason: "这块地摆不下这么大的设施。",
    };
  }
  for (const tile of getFootprintTiles(col, row, w, h)) {
    if (state.grid[tile.row][tile.col]) {
      return {
        ok: false,
        reason: "地块被占了，得先挪开现有设施。",
      };
    }
  }
  return { ok: true, reason: "" };
}

function occupyFacility(facility) {
  for (const tile of getFacilityTiles(facility)) {
    state.grid[tile.row][tile.col] = { facilityId: facility.id };
  }
}

function clearFacilityOccupancy(facility) {
  for (const tile of getFacilityTiles(facility)) {
    state.grid[tile.row][tile.col] = null;
  }
}

function listFacilities() {
  return state.facilities.filter((facility) => facility.kind === "shop");
}

function getObserveCardRect() {
  return {
    x: layout.sidebarX + 22,
    y: layout.sidebarY + 212,
    w: layout.sidebarW - 44,
    h: 30,
  };
}

function getFacilityCardRect(index) {
  return {
    x: layout.sidebarX + 22,
    y: layout.sidebarY + 252 + index * 52,
    w: layout.sidebarW - 44,
    h: 44,
  };
}

function getAdjacentFacilities(facilityLike) {
  const seen = new Set();
  const result = [];
  const tiles = getFootprintTiles(
    facilityLike.col,
    facilityLike.row,
    facilityLike.width,
    facilityLike.height,
  );
  for (const tile of tiles) {
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nextCol = tile.col + dc;
      const nextRow = tile.row + dr;
      if (
        nextCol < 0 ||
        nextRow < 0 ||
        nextCol >= layout.cols ||
        nextRow >= layout.rows
      ) {
        continue;
      }
      if (
        nextCol >= facilityLike.col &&
        nextCol < facilityLike.col + facilityLike.width &&
        nextRow >= facilityLike.row &&
        nextRow < facilityLike.row + facilityLike.height
      ) {
        continue;
      }
      const neighbor = getFacilityAt(nextCol, nextRow);
      if (!neighbor || neighbor.id === facilityLike.id || seen.has(neighbor.id)) {
        continue;
      }
      seen.add(neighbor.id);
      result.push(neighbor);
    }
  }
  return result;
}

function calculateBonuses(facilityLike) {
  const def = getFacilityDef(facilityLike.type);
  const bonus = { income: 0, rating: 0, pop: 0, names: [] };
  for (const neighbor of getAdjacentFacilities(facilityLike)) {
    const effect = def.synergy[neighbor.type];
    if (!effect) {
      continue;
    }
    bonus.income += effect.income;
    bonus.rating += effect.rating;
    bonus.pop += effect.pop;
    bonus.names.push(getFacilityDef(neighbor.type).name);
  }
  return bonus;
}

function getWorldFacilityBonus(facility) {
  const effect = { income: 0, rating: 0, pop: 0 };
  const seasonEffect =
    state.world.season.facilityBonuses[facility.type] || {};
  const weatherEffect =
    state.world.weather.facilityBonuses[facility.type] || {};
  const eventEffects = state.world.eventQueue.map(
    (event) => event.facilityBonuses?.[facility.type] || {},
  );
  effect.income += seasonEffect.income || 0;
  effect.income += weatherEffect.income || 0;
  effect.rating += seasonEffect.rating || 0;
  effect.rating += weatherEffect.rating || 0;
  effect.pop += seasonEffect.pop || 0;
  effect.pop += weatherEffect.pop || 0;
  for (const eventEffect of eventEffects) {
    effect.income += eventEffect.income || 0;
    effect.rating += eventEffect.rating || 0;
    effect.pop += eventEffect.pop || 0;
  }
  return effect;
}

function getVisitorPreferenceScore(profile, facility) {
  let score = 0;
  if (profile.favoriteTypes.includes(facility.type)) {
    score += 8;
  }
  if (profile.likedTimes.includes(state.timeOfDay.id)) {
    score += 3;
  }
  if (profile.likedWeathers.includes(state.world.weather.id)) {
    score += 2;
  }
  if (
    state.world.activeFestival &&
    profile.festivalBias.includes(state.world.activeFestival.id)
  ) {
    score += 4;
  }
  const festivalBonus =
    state.world.activeFestival?.facilityBonuses?.[facility.type];
  if (festivalBonus) {
    score +=
      (festivalBonus.pop || 0) +
      (festivalBonus.rating || 0) +
      Math.max(0, festivalBonus.income || 0);
  }
  return score;
}

function getFacilityPopularity(facility) {
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility);
  const worldBonus = getWorldFacilityBonus(facility);
  const queueLoad = facility.queue.length + (facility.activeServiceId ? 1 : 0);
  const trendBoost =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.incomeBonus + state.todayTrend.ratingBonus
      : 0;
  return (
    def.appeal +
    bonus.pop +
    worldBonus.pop +
    facility.level * 2 +
    trendBoost +
    facility.width * facility.height -
    queueLoad * 2
  );
}

function checkUnlockAnnouncements() {
  for (const def of facilityTypes) {
    if (state.rating < def.unlockAt || state.announcedUnlocks.includes(def.id)) {
      continue;
    }
    state.announcedUnlocks.push(def.id);
    pushMessage(`${def.name} 解锁，可在右侧卡片中建造。`);
    triggerDialogue("unlock", { facilityName: def.name }, { chance: 0.36 });
  }
}

function placeFacility(col, row, type) {
  if (state.mode !== "play") {
    return false;
  }
  const def = getFacilityDef(type);
  const placement = canPlaceFacility(col, row, def);
  if (!placement.ok) {
    pushMessage(placement.reason);
    return false;
  }
  if (!isUnlocked(def)) {
    pushMessage(`${def.name} 还没解锁，先把街区评价再抬高一点。`);
    return false;
  }
  if (state.money < def.cost) {
    pushMessage("钱不够，先等顾客消费几轮。");
    return false;
  }

  const facility = createStructureEntity(type, col, row, state.nextFacilityId);
  state.nextFacilityId += 1;
  state.money -= def.cost;
  state.facilities.push(facility);
  occupyFacility(facility);

  const bonus = calculateBonuses(facility);
  const facilityName = def.name;
  if (bonus.names.length) {
    const comboText = `${facilityName} + ${bonus.names[0]}`;
    state.lastCombo = comboText;
    state.rating += bonus.rating;
    state.money += bonus.income;
    state.comboCount += 1;
    const center = getTileCenter(
      facility.col,
      facility.row,
      facility.width,
      facility.height,
    );
    state.floaters.push({
      x: center.x,
      y: center.y - 16,
      text: `Combo +${bonus.rating}★`,
      color: "#fff4a4",
      ttl: 1.6,
    });
    pushMessage(`${comboText} 触发街区联动，评价上涨。`);
    triggerDialogue("combo", { comboText }, { chance: 0.42 });
  } else {
    state.rating += 1;
    pushMessage(`${facilityName} 开业，等顾客上门。`);
    triggerDialogue(
      facility.width * facility.height > 1 ? "big-build" : "build",
      { facilityName },
      { chance: facility.width * facility.height > 2 ? 0.4 : 0.2 },
    );
  }
  checkUnlockAnnouncements();
  evaluateGoals();
  return true;
}

function removeFacility(col, row) {
  const facility = getFacilityAt(col, row);
  if (!facility) {
    return;
  }
  const def = getFacilityDef(facility.type);
  if (!facility.removable) {
    pushMessage(`${def.name} 是镇上的固定建筑，不能拆除。`);
    return;
  }
  if (facility.kind === "tree") {
    clearFacilityOccupancy(facility);
    state.facilities = state.facilities.filter((item) => item.id !== facility.id);
    pushMessage("路边树已移走，这块地腾出来了。");
    return;
  }
  state.money += Math.floor(def.cost * 0.6);
  clearFacilityOccupancy(facility);
  state.facilities = state.facilities.filter((item) => item.id !== facility.id);
  state.rating = Math.max(
    0,
    state.rating - Math.max(2, facility.width * facility.height - 1),
  );
  pushMessage(`${def.name} 已拆除，回收一部分资金。`);
  triggerDialogue("removal", { facilityName: def.name }, { chance: 0.16 });
  evaluateGoals();
}

function getVisitorSpawnDelay() {
  const rawDelay =
    simulationTuning.spawnBaseDelay - state.day * simulationTuning.spawnDaySlope;
  return Math.max(
    simulationTuning.minSpawnDelay,
    rawDelay / Math.max(0.24, getTrafficModifier()),
  );
}

function setVisitorTargetToTile(visitor, tile) {
  const center = getTileCenter(tile.col, tile.row);
  visitor.targetX = center.x;
  visitor.targetY = center.y;
}

function setVisitorTargetToFacility(visitor, facility) {
  const center = getTileCenter(
    facility.col,
    facility.row,
    facility.width,
    facility.height,
  );
  visitor.targetX = center.x;
  visitor.targetY = center.y + 8;
}

function getFacilityQueueCapacity(facility) {
  const frontDepth = Math.max(2, layout.rows - (facility.row + facility.height) + 1);
  return Math.max(
    2,
    Math.min(5 + Math.floor(facility.level / 3), frontDepth + Math.max(0, facility.width - 1)),
  );
}

function removeVisitorFromFacilityQueue(facility, visitorId) {
  if (!facility) {
    return;
  }
  facility.queue = facility.queue.filter((id) => id !== visitorId);
  if (facility.activeServiceId === visitorId) {
    facility.activeServiceId = null;
  }
}

function syncFacilityQueueTargets(facility) {
  facility.queue = facility.queue.filter((visitorId) => Boolean(getVisitorById(visitorId)));
  facility.queue.forEach((visitorId, index) => {
    const queuedVisitor = getVisitorById(visitorId);
    if (!queuedVisitor) {
      return;
    }
    const slotIndex = Math.max(0, queuedVisitor.path.length - 1 - index);
    const slotTile = queuedVisitor.path[slotIndex];
    queuedVisitor.queueSlotIndex = index;
    queuedVisitor.pathIndex = slotIndex;
    setVisitorTargetToTile(queuedVisitor, slotTile);
    queuedVisitor.phase = "queueing";
  });
}

function beginVisitorService(visitor, facility) {
  removeVisitorFromFacilityQueue(facility, visitor.id);
  facility.activeServiceId = visitor.id;
  visitor.phase = "entering";
  visitor.queuePatience = 0;
  visitor.queueSlotIndex = 0;
  setVisitorTargetToFacility(visitor, facility);
  syncFacilityQueueTargets(facility);
}

function tryQueueVisitor(visitor, facility) {
  if (facility.activeServiceId === null && facility.queue.length === 0) {
    beginVisitorService(visitor, facility);
    return true;
  }
  const maxQueue = Math.min(getFacilityQueueCapacity(facility), visitor.path.length);
  if (facility.queue.includes(visitor.id)) {
    syncFacilityQueueTargets(facility);
    return true;
  }
  if (facility.queue.length >= maxQueue) {
    state.floaters.push({
      x: visitor.x,
      y: visitor.y - 14,
      text: "太挤了",
      color: "#ffb8a8",
      ttl: 1.5,
    });
    if (Math.random() < 0.24) {
      pushMessage(`${getFacilityDef(facility.type).name} 门口太挤，顾客被劝退了。`);
    }
    triggerDialogue(
      "crowded",
      { facilityName: getFacilityDef(facility.type).name },
      { chance: 0.22, speakerId: visitor.id },
    );
    startVisitorLeaving(visitor);
    return false;
  }
  facility.queue.push(visitor.id);
  visitor.phase = "queueing";
  visitor.queuePatience = 4 + Math.random() * 3;
  if (facility.queue.length >= 2) {
    triggerDialogue(
      "queue",
      { facilityName: getFacilityDef(facility.type).name },
      { chance: 0.18, speakerId: visitor.id },
    );
  }
  syncFacilityQueueTargets(facility);
  return true;
}

function startVisitorLeaving(visitor) {
  const facility = getFacilityById(visitor.targetFacilityId);
  if (facility) {
    removeVisitorFromFacilityQueue(facility, visitor.id);
    syncFacilityQueueTargets(facility);
  }
  if (visitor.phase === "to-grid") {
    visitor.phase = "leaving-road";
    visitor.targetX = visitor.exitRoadX;
    visitor.targetY = visitor.exitRoadY;
    return;
  }
  if (visitor.phase === "entering" || visitor.phase === "inside") {
    visitor.phase = "exiting";
    setVisitorTargetToTile(visitor, visitor.path[visitor.path.length - 1]);
    return;
  }
  if (
    visitor.phase === "going" ||
    visitor.phase === "entering" ||
    visitor.phase === "inside" ||
    visitor.phase === "queueing" ||
    visitor.phase === "queue-wait"
  ) {
    visitor.phase = "leaving";
    return;
  }
  if (visitor.phase === "exiting") {
    return;
  }
  visitor.phase = "leaving-road";
  visitor.targetX = visitor.exitRoadX;
  visitor.targetY = visitor.exitRoadY;
}

function spawnVisitor() {
  const facilities = listFacilities();
  if (!facilities.length) {
    return;
  }
  const profile = pickVisitorArchetype();
  const target = chooseWeightedFacility(facilities, profile);
  const route = buildVisitorRoute(target);
  if (!route) {
    return;
  }
  const palette =
    visitorPalette[(state.nextVisitorId - 1) % visitorPalette.length];
  const firstTile = route.path[0];
  const firstCenter = getTileCenter(firstTile.col, firstTile.row);
  state.visitors.push({
    id: state.nextVisitorId,
    x: route.roadEntry.x,
    y: route.roadEntry.y,
    speed:
      (52 + Math.random() * 16) * simulationTuning.visitorSpeedMultiplier,
    mood: 1,
    profileId: profile.id,
    profileLabel: profile.label,
    targetFacilityId: target.id,
    targetCol: target.col,
    targetRow: target.row,
    targetApproachCol: route.approachTile.col,
    targetApproachRow: route.approachTile.row,
    phase: "to-grid",
    wait: 0,
    colors: palette,
    path: route.path,
    pathIndex: 0,
    queuePatience: 0,
    queueSlotIndex: 0,
    targetX: firstCenter.x,
    targetY: layout.roadY + 18,
    exitRoadX: route.roadExit.x,
    exitRoadY: route.roadExit.y,
  });
  state.nextVisitorId += 1;
}

function visitFacility(visitor) {
  const facility = getFacilityById(visitor.targetFacilityId);
  if (!facility) {
    startVisitorLeaving(visitor);
    return;
  }
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility);
  const trendIncome =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.incomeBonus
      : 0;
  const trendRating =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.ratingBonus
      : 0;
  const worldBonus = getWorldFacilityBonus(facility);
  const income =
    def.baseIncome +
    bonus.income +
    facility.level +
    trendIncome +
    worldBonus.income;
  const ratingGain =
    1 + bonus.rating + trendRating + worldBonus.rating;
  facility.visits += 1;
  if (facility.visits % 5 === 0) {
    facility.level += 1;
    pushMessage(`${def.name} 升到 Lv.${facility.level}，更能吸金了。`);
    triggerDialogue("levelup", { facilityName: def.name, level: facility.level }, { chance: 0.28 });
  }
  facility.activeServiceId = null;
  state.money += income;
  state.rating += ratingGain;
  state.servedVisitors += 1;
  state.lifetimeIncome += income;
  state.lastCombo = bonus.names.length
    ? `${def.name} + ${bonus.names[0]}`
    : trendIncome > 0
      ? `${def.name} 今日热销`
      : `${def.name} 单店营业`;
  state.floaters.push({
    x: visitor.x,
    y: visitor.y - 12,
    text: `+${income}G / +${ratingGain}★`,
    color: "#ffffff",
    ttl: 1.8,
  });
  pushMessage(`${def.name} 接待顾客，收入 +${income}G。`);
  if (state.servedVisitors % 3 === 0) {
    triggerDialogue("service", { facilityName: def.name }, { chance: 0.18, speakerId: visitor.id });
  }
  syncFacilityQueueTargets(facility);
  checkUnlockAnnouncements();
  evaluateGoals();
}

function updateVisitors(delta) {
  for (const visitor of state.visitors) {
    if (
      visitor.phase === "to-grid" ||
      visitor.phase === "going" ||
      visitor.phase === "queueing" ||
      visitor.phase === "entering" ||
      visitor.phase === "exiting" ||
      visitor.phase === "leaving" ||
      visitor.phase === "leaving-road"
    ) {
      if (
        visitor.phase !== "leaving" &&
        visitor.phase !== "leaving-road" &&
        !getFacilityById(visitor.targetFacilityId)
      ) {
        startVisitorLeaving(visitor);
      }
      const dx = visitor.targetX - visitor.x;
      const dy = visitor.targetY - visitor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        if (visitor.phase === "to-grid") {
          visitor.phase = "going";
          const waypoint = visitor.path[visitor.pathIndex];
          setVisitorTargetToTile(visitor, waypoint);
        } else if (visitor.phase === "going") {
          if (visitor.pathIndex < visitor.path.length - 1) {
            visitor.pathIndex += 1;
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            const facility = getFacilityById(visitor.targetFacilityId);
            if (!facility) {
              startVisitorLeaving(visitor);
              continue;
            }
            tryQueueVisitor(visitor, facility);
          }
        } else if (visitor.phase === "queueing") {
          visitor.phase = "queue-wait";
        } else if (visitor.phase === "entering") {
          visitor.phase = "inside";
          visitor.wait = simulationTuning.visitorWait;
        } else if (visitor.phase === "exiting") {
          visitor.phase = "leaving";
          visitor.pathIndex = Math.max(0, visitor.path.length - 1);
          if (visitor.pathIndex > 0) {
            visitor.pathIndex -= 1;
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            visitor.phase = "leaving-road";
            visitor.targetX = visitor.exitRoadX;
            visitor.targetY = visitor.exitRoadY;
          }
        } else if (visitor.phase === "leaving") {
          if (visitor.pathIndex > 0) {
            visitor.pathIndex -= 1;
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            visitor.phase = "leaving-road";
            visitor.targetX = visitor.exitRoadX;
            visitor.targetY = visitor.exitRoadY;
          }
        } else {
          if (
            Math.abs(visitor.x - visitor.exitRoadX) < 8 &&
            Math.abs(visitor.y - visitor.exitRoadY) < 8
          ) {
            visitor.done = true;
          } else {
            visitor.targetX = visitor.exitRoadX;
            visitor.targetY = visitor.exitRoadY;
          }
        }
      } else {
        const move = Math.min(dist, visitor.speed * delta);
        visitor.x += (dx / dist) * move;
        visitor.y += (dy / dist) * move;
      }
    } else if (visitor.phase === "queue-wait") {
      const facility = getFacilityById(visitor.targetFacilityId);
      if (!facility) {
        startVisitorLeaving(visitor);
        continue;
      }
      visitor.queuePatience -= delta;
      if (visitor.queuePatience <= 0) {
        removeVisitorFromFacilityQueue(facility, visitor.id);
        syncFacilityQueueTargets(facility);
        state.floaters.push({
          x: visitor.x,
          y: visitor.y - 14,
          text: "排太久",
          color: "#ffd38d",
          ttl: 1.5,
        });
        triggerDialogue(
          "crowded",
          { facilityName: getFacilityDef(facility.type).name },
          { chance: 0.18, speakerId: visitor.id },
        );
        startVisitorLeaving(visitor);
        continue;
      }
      if (facility.activeServiceId === null && facility.queue[0] === visitor.id) {
        beginVisitorService(visitor, facility);
      }
    } else if (visitor.phase === "inside") {
      visitor.wait -= delta;
      if (visitor.wait <= 0) {
        visitFacility(visitor);
        const approachTile = visitor.path[visitor.path.length - 1];
        visitor.phase = "exiting";
        setVisitorTargetToTile(visitor, approachTile);
      }
    }
  }
  state.visitors = state.visitors.filter((visitor) => !visitor.done);
}

function updateFloaters(delta) {
  for (const floater of state.floaters) {
    floater.ttl -= delta;
    floater.y -= delta * 18;
  }
  state.floaters = state.floaters.filter((floater) => floater.ttl > 0);
}

function advanceDay() {
  const previousSeasonId = state.world.season.id;
  state.day += 1;
  state.rating += 2;
  state.world = buildWorld(state.day, state.world);
  const upkeep = Math.max(0, listFacilities().length - 4) * 3;
  if (upkeep > 0) {
    state.money = Math.max(0, state.money - upkeep);
    pushMessage(`营业日结算，维护费 -${upkeep}G。`);
  } else {
    pushMessage("今天顺顺利利，街区口碑又涨了一点。");
  }
  const extraVisitors = Math.max(
    1,
    Math.round((1 + Math.floor(state.day / 4)) * getTrafficModifier()),
  );
  for (let i = 0; i < extraVisitors; i += 1) {
    spawnVisitor();
  }
  state.todayTrend = buildTrend(state.rating, state.day);
  pushMessage(
    `今日热潮：${state.todayTrend.name}，额外 +${state.todayTrend.incomeBonus}G / +${state.todayTrend.ratingBonus}★。`,
  );
  if (state.world.activeFestival) {
    pushMessage(
      `${state.world.activeFestival.name} 举办中：${state.world.activeFestival.description}`,
    );
    setEnvironmentNotice(
      `${state.world.activeFestival.name} 举办中：客流提升，主题设施更吃香。`,
      state.world.activeFestival.color,
      4.8,
    );
    triggerDialogue(
      "festival",
      { festivalName: state.world.activeFestival.name },
      { chance: 0.24 },
    );
  } else {
    pushMessage(
      `${state.world.season.label} ${state.world.weather.label}，下一场节庆：${state.world.upcomingFestival.name}。`,
    );
    setEnvironmentNotice(
      `${state.world.season.label} ${state.world.weather.label}，${state.world.upcomingFestival.name} 将近。`,
      state.world.season.color,
      4.4,
    );
  }
  triggerDialogue("trend", { trendName: state.todayTrend.name }, { chance: 0.2 });
  triggerDialogue("weather", { weatherLabel: state.world.weather.label }, { chance: 0.18 });
  if (previousSeasonId !== state.world.season.id) {
    triggerDialogue("season", { seasonLabel: state.world.season.label }, { chance: 0.32 });
  } else {
    triggerDialogue("day", { seasonLabel: state.world.season.label }, { chance: 0.12 });
  }
  checkUnlockAnnouncements();
  evaluateGoals();
}

function update(delta) {
  state.cameraPulse += delta;
  updateDialogue(delta);
  if (state.mode !== "play") {
    updateFloaters(delta);
    return;
  }

  state.spawnTimer -= delta;
  state.dayTimer += delta;
  const currentHour = getCurrentHour();
  state.clock = currentHour / 24;
  const nextTimeOfDay = getTimeOfDay(currentHour);
  if (nextTimeOfDay.id !== state.timeOfDay.id) {
    state.timeOfDay = nextTimeOfDay;
    setEnvironmentNotice(
      `${state.timeOfDay.label} 时段，人流会明显${state.timeOfDay.visitorMultiplier < 1 ? "减少" : "上升"}。`,
      state.timeOfDay.accent,
      3.6,
    );
  }

  if (state.spawnTimer <= 0) {
    spawnVisitor();
    state.spawnTimer = getVisitorSpawnDelay();
  }

  if (state.dayTimer >= simulationTuning.dayLength) {
    state.dayTimer -= simulationTuning.dayLength;
    advanceDay();
  }

  updateVisitors(delta);
  updateFloaters(delta);
  state.visitorTalkTimer -= delta;
  if (state.visitorTalkTimer <= 0) {
    maybeTriggerVisitorThought();
    state.visitorTalkTimer = 7 + Math.random() * 4;
  }
}

function getGoalProgress(goal) {
  switch (goal.id) {
    case "build-3":
      return {
        value: listFacilities().length,
        target: 3,
      };
    case "combo-2":
      return {
        value: state.comboCount,
        target: 2,
      };
    case "serve-8":
      return {
        value: state.servedVisitors,
        target: 8,
      };
    case "rating-80":
      return {
        value: state.rating,
        target: 80,
      };
    default:
      return {
        value: 0,
        target: 1,
      };
  }
}

function evaluateGoals() {
  let completedNow = false;
  for (const goal of state.goals) {
    if (goal.completed) {
      continue;
    }
    const progress = getGoalProgress(goal);
    if (progress.value >= progress.target) {
      goal.completed = true;
      state.money += goal.rewardMoney;
      state.rating += goal.rewardRating;
      completedNow = true;
      state.floaters.push({
        x: 784,
        y: 126,
        text: `Goal +${goal.rewardMoney}G`,
        color: "#ffe58f",
        ttl: 2.2,
      });
      pushMessage(
        `目标完成：${goal.title}，奖励 ${goal.rewardMoney}G / ${goal.rewardRating}★。`,
      );
      triggerDialogue("goal", { title: goal.title }, { chance: 0.22 });
    }
  }

  if (
    completedNow &&
    state.goals.every((goal) => goal.completed) &&
    !state.winCelebrated
  ) {
    state.winCelebrated = true;
    state.finalePlaceholderUnlocked = true;
    pushMessage("阶段目标已全部达成。小镇会继续营业，终章观察区暂未开放。");
    setEnvironmentNotice(
      "阶段目标完成，小镇继续运转中。终章内容后续开放。",
      "#ffe6a8",
      4.6,
    );
  }
}

function getActiveGoal() {
  return state.goals.find((goal) => !goal.completed) || null;
}

function getBusiestFacility() {
  const shops = listFacilities();
  if (!shops.length) {
    return null;
  }
  return (
    [...shops].sort((a, b) => {
      const aLoad = a.queue.length + (a.activeServiceId ? 1 : 0);
      const bLoad = b.queue.length + (b.activeServiceId ? 1 : 0);
      return bLoad - aLoad;
    })[0] || null
  );
}

function syncButtons() {
  startButton.disabled = state.mode === "play" || state.mode === "complete";
  restartButton.textContent = state.mode === "complete" ? "再开一轮" : "重新开档";
}

function drawPixelRect(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawSprite(sprite, palette, x, y, scale = 3) {
  for (let row = 0; row < sprite.length; row += 1) {
    for (let col = 0; col < sprite[row].length; col += 1) {
      const key = sprite[row][col];
      if (key === ".") {
        continue;
      }
      drawPixelRect(x + col * scale, y + row * scale, scale, palette[key]);
    }
  }
}

function drawFittedSprite(sprite, palette, x, y, width, height) {
  const scale = Math.max(
    2,
    Math.floor(
      Math.min(
        (width - 18) / sprite[0].length,
        (height - 18) / sprite.length,
      ),
    ),
  );
  const drawWidth = sprite[0].length * scale;
  const drawHeight = sprite.length * scale;
  const drawX = x + Math.max(6, Math.floor((width - drawWidth) / 2));
  const drawY = y + Math.max(4, Math.floor((height - drawHeight) / 2) - 2);
  drawSprite(sprite, palette, drawX, drawY, scale);
}

function drawBackground() {
  const playfieldWidth = layout.sidebarX - 18;
  const skyPalette = {
    spring: ["#9be0ff", "#d2f2ff", "#ffe2b3"],
    summer: ["#80d2ff", "#bfe9ff", "#ffd88c"],
    autumn: ["#9ad2f2", "#d8efff", "#ffcf99"],
    winter: ["#b9d9f8", "#edf6ff", "#e8f0ff"],
  };
  const skyStops =
    skyPalette[state.world.season.id] || skyPalette.spring;
  const sky = ctx.createLinearGradient(0, 0, 0, layout.roadY);
  sky.addColorStop(0, skyStops[0]);
  sky.addColorStop(0.6, skyStops[1]);
  sky.addColorStop(1, skyStops[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.world.weather.id !== "snow") {
    const sunX = 110 + Math.sin(state.cameraPulse * 0.25) * 8;
    ctx.fillStyle =
      state.world.weather.id === "drizzle" ? "rgba(255, 245, 198, 0.55)" : "rgba(255, 240, 170, 0.95)";
    ctx.fillRect(sunX, 48, 44, 44);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(180, 58, 62, 18);
  ctx.fillRect(208, 50, 48, 24);
  ctx.fillRect(260, 82, 58, 16);

  const mountainColors =
    state.world.season.id === "winter"
      ? ["#b9cad6", "#9eb3c0", "#8799a8"]
      : state.world.season.id === "autumn"
        ? ["#c9af7f", "#bc9765", "#9d7a56"]
        : ["#99c27f", "#87b36a", "#6b9460"];
  mountainColors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-40, 230 + index * 22);
    for (let i = 0; i <= 6; i += 1) {
      ctx.lineTo(i * 180, 200 + ((i + index) % 2) * 28 + index * 18);
    }
    ctx.lineTo(canvas.width + 40, 250 + index * 24);
    ctx.lineTo(canvas.width + 40, 360);
    ctx.lineTo(-40, 360);
    ctx.fill();
  });

  const lawnColors = {
    spring: ["#d9f3a4", "#92cf63"],
    summer: ["#c9eb78", "#84c362"],
    autumn: ["#d8d28b", "#aab25e"],
    winter: ["#e7f0f6", "#a0bbd2"],
  };
  const [grassLight, grassDark] =
    lawnColors[state.world.season.id] || lawnColors.spring;
  ctx.fillStyle = grassLight;
  ctx.fillRect(0, layout.gridY - 26, playfieldWidth, layout.rows * layout.tile + 44);
  ctx.fillStyle = grassDark;
  ctx.fillRect(0, layout.roadY - 22, playfieldWidth, 22);

  ctx.fillStyle = "#72606a";
  ctx.fillRect(0, layout.roadY, playfieldWidth, layout.roadH);
  ctx.fillStyle = "#f7f0b3";
  for (let x = 20; x < playfieldWidth; x += 80) {
    ctx.fillRect(x, layout.roadY + 20, 34, 6);
  }

  const treePalette =
    state.world.season.id === "winter"
      ? { top: "#d7ebf5", trunk: "#7b675f" }
      : state.world.season.id === "autumn"
        ? { top: "#ffbf66", trunk: "#7d5638" }
        : state.world.season.id === "summer"
          ? { top: "#79c861", trunk: "#7b5735" }
          : { top: "#9ddc86", trunk: "#7d593e" };
  for (let index = 0; index < 6; index += 1) {
    const x = 44 + index * 112;
    ctx.fillStyle = treePalette.top;
    ctx.fillRect(x, layout.gridY - 54, 34, 20);
    ctx.fillRect(x + 6, layout.gridY - 66, 22, 14);
    ctx.fillStyle = treePalette.trunk;
    ctx.fillRect(x + 14, layout.gridY - 34, 6, 18);
  }

  if (state.world.weather.id === "drizzle") {
    ctx.fillStyle = "rgba(88, 133, 188, 0.45)";
    for (let i = 0; i < 36; i += 1) {
      const x = (i * 27 + state.cameraPulse * 80) % playfieldWidth;
      const y = 90 + (i * 18) % 410;
      ctx.fillRect(x, y, 2, 12);
    }
  }

  if (state.world.weather.id === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 31 + state.cameraPulse * 24) % playfieldWidth;
      const y = 78 + (i * 22 + state.cameraPulse * 14) % 420;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  if (state.world.season.id === "autumn") {
    const leafColors = ["#ffb347", "#f18f43", "#d96f32"];
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.fillRect(70 + i * 44, 162 + ((i + 1) % 3) * 18, 5, 3);
    }
  }

  ctx.fillStyle = "rgba(255, 248, 215, 0.74)";
  ctx.fillRect(playfieldWidth - 166, 100, 144, 42);
  ctx.strokeStyle = state.world.season.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(playfieldWidth - 164, 102, 140, 38);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText(`${state.world.season.label} / ${state.world.weather.label}`, playfieldWidth - 152, 118);
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(`${state.timeOfDay.label} 气氛`, playfieldWidth - 152, 134);

  if (state.world.activeFestival) {
    ctx.fillStyle = state.world.activeFestival.color;
    for (let x = 34; x < playfieldWidth - 40; x += 44) {
      ctx.fillRect(x, 104, 18, 5);
      ctx.fillRect(x + 6, 108, 6, 18);
    }
  }

  if (state.timeOfDay.overlay) {
    ctx.fillStyle = state.timeOfDay.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (state.timeOfDay.id === "midnight") {
    ctx.fillStyle = "#ffe7a8";
    for (let index = 0; index < 6; index += 1) {
      const x = 84 + index * 92;
      ctx.fillRect(x, layout.roadY - 18, 5, 20);
      ctx.fillRect(x - 6, layout.roadY - 8, 16, 10);
    }
  }
}

function drawPlacementPreview() {
  if (!state.hoveredTile || state.mode !== "play" || !state.selectedType) {
    return;
  }
  const def = getFacilityDef(state.selectedType);
  const placement = canPlaceFacility(state.hoveredTile.col, state.hoveredTile.row, def);
  const color = placement.ok ? "rgba(255, 244, 163, 0.48)" : "rgba(255, 120, 120, 0.4)";
  for (const tile of getFootprintTiles(
    state.hoveredTile.col,
    state.hoveredTile.row,
    def.footprint.w,
    def.footprint.h,
  )) {
    if (
      tile.col < 0 ||
      tile.row < 0 ||
      tile.col >= layout.cols ||
      tile.row >= layout.rows
    ) {
      continue;
    }
    const pos = tileToScreen(tile.col, tile.row);
    ctx.fillStyle = color;
    ctx.fillRect(pos.x + 2, pos.y + 2, layout.tile - 6, layout.tile - 6);
  }
}

function drawApproachMarkers() {
  for (const facility of listFacilities()) {
    const approachTiles = getApproachTiles(facility);
    for (const tile of approachTiles) {
      const pos = tileToScreen(tile.col, tile.row);
      ctx.fillStyle = "rgba(255, 248, 220, 0.72)";
      if (tile.side === "left") {
        ctx.fillRect(pos.x + layout.tile - 10, pos.y + 18, 8, 18);
        ctx.fillStyle = "rgba(124, 92, 68, 0.38)";
        ctx.fillRect(pos.x + layout.tile - 8, pos.y + 20, 4, 14);
        continue;
      }
      if (tile.side === "right") {
        ctx.fillRect(pos.x + 2, pos.y + 18, 8, 18);
        ctx.fillStyle = "rgba(124, 92, 68, 0.38)";
        ctx.fillRect(pos.x + 4, pos.y + 20, 4, 14);
        continue;
      }
      ctx.fillRect(pos.x + 18, pos.y + 4, 18, 8);
      ctx.fillStyle = "rgba(124, 92, 68, 0.38)";
      ctx.fillRect(pos.x + 20, pos.y + 6, 14, 4);
    }
  }
}

function drawGrid() {
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const pos = tileToScreen(col, row);
      const even = (col + row) % 2 === 0;
      const winterTile = state.world.season.id === "winter";
      ctx.fillStyle = winterTile
        ? even
          ? "#e8f5fb"
          : "#d8eaf2"
        : even
          ? "#b8e27c"
          : "#a2d36d";
      ctx.fillRect(pos.x, pos.y, layout.tile - 2, layout.tile - 2);

      ctx.fillStyle = winterTile ? "#c1dbe7" : "#90c35e";
      ctx.fillRect(pos.x + 4, pos.y + layout.tile - 14, layout.tile - 10, 6);
      ctx.fillStyle = winterTile ? "#a7c5d3" : "#7aac4e";
      ctx.fillRect(pos.x + 6, pos.y + layout.tile - 8, layout.tile - 14, 4);

      if (
        state.hoveredTile &&
        state.hoveredTile.col === col &&
        state.hoveredTile.row === row &&
        state.mode === "play"
      ) {
        ctx.strokeStyle = "#fff8d6";
        ctx.lineWidth = 3;
        ctx.strokeRect(
          pos.x + 1.5,
          pos.y + 1.5,
          layout.tile - 5,
          layout.tile - 5,
        );
      }
    }
  }
  drawApproachMarkers();
  drawPlacementPreview();
  const facilities = [...state.facilities].sort(
    (a, b) => a.row + a.height - (b.row + b.height),
  );
  for (const facility of facilities) {
    drawFacility(facility);
  }
}

function drawFacility(facility) {
  const pos = tileToScreen(facility.col, facility.row);
  const def = getFacilityDef(facility.type);
  const width = facility.width * layout.tile - 6;
  const height = facility.height * layout.tile - 8;
  if (facility.kind === "tree") {
    drawFittedSprite(def.sprite, def.palette, pos.x + 2, pos.y + 2, width, height);
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(pos.x + 8, pos.y + height - 10, width - 10, 9);

  ctx.fillStyle =
    facility.kind === "landmark"
      ? "rgba(230, 236, 242, 0.9)"
      : facility.width * facility.height > 1
        ? "rgba(255, 247, 214, 0.82)"
        : "rgba(255, 247, 214, 0.64)";
  ctx.fillRect(pos.x + 2, pos.y + 3, width, height);
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(pos.x + 4, pos.y + 5, width - 4, height - 4);

  drawFittedSprite(def.sprite, def.palette, pos.x + 1, pos.y + 1, width, height);

  if (facility.kind === "landmark") {
    ctx.fillStyle = "rgba(47, 34, 49, 0.84)";
    ctx.fillRect(pos.x + 8, pos.y + height - 22, Math.min(96, width - 14), 14);
    ctx.fillStyle = "#fff4d6";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.fillText(fitTextToWidth(def.name, Math.min(84, width - 18)), pos.x + 12, pos.y + height - 12);
    return;
  }

  ctx.fillStyle = "#2e2131";
  ctx.fillRect(pos.x + 6, pos.y + 6, 28, 12);
  ctx.fillStyle = "#fff4d6";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`L${facility.level}`, pos.x + 8, pos.y + 15);

  if (facility.width * facility.height > 1) {
    ctx.fillStyle = "#2e2131";
    ctx.fillRect(pos.x + width - 44, pos.y + 6, 36, 12);
    ctx.fillStyle = "#ffe9a8";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`${facility.width}x${facility.height}`, pos.x + width - 40, pos.y + 15);
  }

  const queueCount = facility.queue.length;
  const queueCapacity = getFacilityQueueCapacity(facility);
  const serviceBusy = Boolean(facility.activeServiceId);
  if (queueCount || serviceBusy) {
    const badgeW = queueCount >= queueCapacity ? 68 : 54;
    ctx.fillStyle =
      queueCount >= queueCapacity
        ? "#c44d2f"
        : serviceBusy
          ? "#4066b1"
          : "#4f6b3f";
    ctx.fillRect(pos.x + width - badgeW - 10, pos.y + height - 24, badgeW, 14);
    ctx.fillStyle = "#fff8dd";
    ctx.font = "bold 9px Trebuchet MS";
    const badgeText =
      queueCount >= queueCapacity
        ? `FULL ${queueCount}`
        : `Q${queueCount}${serviceBusy ? " / Busy" : ""}`;
    ctx.fillText(badgeText, pos.x + width - badgeW - 6, pos.y + height - 13);
  }
}

function drawVisitors() {
  for (const visitor of state.visitors) {
    if (visitor.phase === "inside") {
      continue;
    }
    const x = Math.round(visitor.x);
    const y = Math.round(visitor.y);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x - 7, y + 8, 14, 4);
    ctx.fillStyle = visitor.colors.hair;
    ctx.fillRect(x - 4, y - 12, 8, 5);
    ctx.fillStyle = "#f4d8be";
    ctx.fillRect(x - 5, y - 7, 10, 9);
    ctx.fillStyle = visitor.colors.shirt;
    ctx.fillRect(x - 6, y + 2, 12, 11);
    ctx.fillStyle = "#4c3d37";
    ctx.fillRect(x - 4, y + 13, 3, 8);
    ctx.fillRect(x + 1, y + 13, 3, 8);
    ctx.fillStyle = "rgba(255, 248, 214, 0.92)";
    ctx.fillRect(x - 8, y - 18, 16, 4);
  }
}

function drawNPCs() {
  for (const npc of state.npcs) {
    const active =
      state.activeDialogue && state.activeDialogue.speakerId === npc.id;
    const bob = Math.sin(state.cameraPulse * 2 + npc.bobPhase) * 2;
    const x = Math.round(npc.x);
    const y = Math.round(npc.y + bob);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x - 9, y + 10, 18, 4);
    ctx.fillStyle = npc.hair;
    ctx.fillRect(x - 5, y - 11, 10, 5);
    ctx.fillStyle = "#f4d8be";
    ctx.fillRect(x - 6, y - 6, 12, 10);
    ctx.fillStyle = npc.shirt;
    ctx.fillRect(x - 7, y + 4, 14, 12);
    ctx.fillStyle = "#4c3d37";
    ctx.fillRect(x - 4, y + 16, 3, 9);
    ctx.fillRect(x + 1, y + 16, 3, 9);
    if (active) {
      ctx.strokeStyle = npc.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 11, y - 14, 22, 31);
    }
  }
}

function drawSidebar() {
  const infoX = layout.sidebarX + 196;
  const infoWidth = layout.sidebarW - 226;
  ctx.fillStyle = "#2f2231";
  ctx.fillRect(layout.sidebarX, layout.sidebarY, layout.sidebarW, layout.sidebarH);
  ctx.fillStyle = "#fff0ce";
  ctx.fillRect(
    layout.sidebarX + 10,
    layout.sidebarY + 10,
    layout.sidebarW - 20,
    layout.sidebarH - 20,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    layout.sidebarX + 12,
    layout.sidebarY + 12,
    layout.sidebarW - 24,
    layout.sidebarH - 24,
  );
  ctx.clip();

  ctx.fillStyle = "#362734";
  ctx.fillRect(layout.sidebarX + 18, layout.sidebarY + 18, layout.sidebarW - 36, 160);
  ctx.fillStyle = "#ffefbd";
  ctx.font = "bold 19px Trebuchet MS";
  ctx.fillText(`Day ${state.day}`, layout.sidebarX + 34, layout.sidebarY + 46);
  ctx.fillText(`${state.money} G`, layout.sidebarX + 34, layout.sidebarY + 72);
  ctx.fillText(`${state.rating} ★`, layout.sidebarX + 34, layout.sidebarY + 98);

  ctx.fillStyle = state.world.season.color;
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText(state.world.season.label, infoX, layout.sidebarY + 40);
  ctx.fillStyle = "#ffefbd";
  ctx.fillText(state.world.weather.label, infoX, layout.sidebarY + 58);
  ctx.fillStyle = "#8a6f79";
  ctx.font = "11px Trebuchet MS";
  ctx.fillText("Festival now", infoX, layout.sidebarY + 78);
  wrapText(
    state.world.activeFestival
      ? state.world.activeFestival.name
      : "今天没有节庆活动",
    infoX,
    layout.sidebarY + 92,
    infoWidth,
    13,
    2,
  );
  ctx.fillText("Trend today", infoX, layout.sidebarY + 112);
  wrapText(
    `${state.todayTrend.name} +${state.todayTrend.incomeBonus}G/+${state.todayTrend.ratingBonus}★`,
    infoX,
    layout.sidebarY + 126,
    infoWidth,
    13,
    2,
  );
  ctx.fillText("Next fest", infoX, layout.sidebarY + 146);
  wrapText(
    state.world.upcomingFestival.name,
    infoX,
    layout.sidebarY + 160,
    infoWidth,
    13,
    2,
  );

  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("Facilities", layout.sidebarX + 24, layout.sidebarY + 200);

  const observeRect = getObserveCardRect();
  const observing = !state.selectedType;
  ctx.fillStyle = observing ? "#d9f0bb" : "#f4ead4";
  ctx.fillRect(observeRect.x, observeRect.y, observeRect.w, observeRect.h);
  ctx.strokeStyle = observing ? "#628442" : "#7f6470";
  ctx.lineWidth = 3;
  ctx.strokeRect(observeRect.x + 1.5, observeRect.y + 1.5, observeRect.w - 3, observeRect.h - 3);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText("Observe Mode", observeRect.x + 12, observeRect.y + 13);
  ctx.font = "10px Trebuchet MS";
  ctx.fillText(
    observing ? "当前不会放置商店，左键只观察地图。" : "点击这里取消当前商店选中。",
    observeRect.x + 12,
    observeRect.y + 24,
  );

  facilityTypes.forEach((def, index) => {
    const { x: cardX, y: cardY, w: cardW, h: cardH } = getFacilityCardRect(index);
    const selected = state.selectedType === def.id;
    const unlocked = isUnlocked(def);
    ctx.fillStyle = selected ? "#ffe48c" : unlocked ? "#fff9e5" : "#ddcfbc";
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = selected ? "#c44d2f" : "#7f6470";
    ctx.lineWidth = 3;
    ctx.strokeRect(cardX + 1.5, cardY + 1.5, cardW - 3, cardH - 3);

    ctx.fillStyle = def.color;
    ctx.fillRect(cardX + 10, cardY + 6, 28, 28);
    drawSprite(def.sprite, def.palette, cardX + 10, cardY + 7, 2);

    ctx.fillStyle = "#2f2231";
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(fitTextToWidth(def.name, cardW - 92), cardX + 46, cardY + 17);
    ctx.font = "10px Trebuchet MS";
    const price = unlocked ? `${def.cost}G | ${def.footprint.w}x${def.footprint.h}` : `Unlock ${def.unlockAt}★`;
    ctx.fillText(price, cardX + 46, cardY + 29);
    ctx.fillStyle = "#7f6470";
    ctx.fillText(fitTextToWidth(def.bonusText, cardW - 104), cardX + 46, cardY + 39);
  });

  const activeGoal = getActiveGoal();
  const busiestFacility = getBusiestFacility();
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("Goal & Town Talk", layout.sidebarX + 24, layout.sidebarY + 526);
  ctx.fillStyle = "#6f5a62";
  if (activeGoal) {
    const progress = getGoalProgress(activeGoal);
    wrapText(
      `${activeGoal.title} (${Math.min(progress.value, progress.target)}/${progress.target})`,
      layout.sidebarX + 24,
      layout.sidebarY + 546,
      layout.sidebarW - 48,
      15,
      2,
    );
  } else {
    wrapText(
      state.finalePlaceholderUnlocked
        ? "阶段目标已清空。小镇会继续营业，终章观察区暂未开放。"
        : "全部目标达成，商店街已进入展示完成态。",
      layout.sidebarX + 24,
      layout.sidebarY + 546,
      layout.sidebarW - 48,
      15,
      2,
    );
  }
  const pulseText = busiestFacility
    ? (() => {
        const def = getFacilityDef(busiestFacility.type);
        const queueCount = busiestFacility.queue.length;
        if (queueCount >= getFacilityQueueCapacity(busiestFacility)) {
          return `Street Pulse：${def.name} 已爆满，门口顾客正在外溢。`;
        }
        if (queueCount > 0) {
          return `Street Pulse：${def.name} 正在排队，当前 ${queueCount} 人等候。`;
        }
        if (busiestFacility.activeServiceId) {
          return `Street Pulse：${def.name} 正在接客，门口节奏很稳。`;
        }
        return "Street Pulse：目前街区还比较从容，适合继续观察人流。";
      })()
    : "Street Pulse：先摆出第一家店，再观察哪一类顾客最先被吸引。";
  ctx.fillStyle = "#8b6d61";
  wrapText(pulseText, layout.sidebarX + 24, layout.sidebarY + 578, layout.sidebarW - 48, 14, 2);
  const talk =
    state.activeDialogue?.text ||
    state.dialogueFeed[0]?.text ||
    state.messages[0] ||
    "暂无消息";
  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(layout.sidebarX + 22, layout.sidebarY + 612, layout.sidebarW - 44, 106);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.sidebarX + 23.5, layout.sidebarY + 613.5, layout.sidebarW - 47, 103);
  ctx.fillStyle = "#6f5a62";
  wrapText(talk, layout.sidebarX + 32, layout.sidebarY + 634, layout.sidebarW - 64, 15, 4);
  ctx.restore();
}

function fitTextToWidth(text, maxWidth, suffix = "") {
  let current = text;
  while (current && ctx.measureText(current + suffix).width > maxWidth) {
    current = current.slice(0, -1);
  }
  return current + (current !== text ? suffix : "");
}

function getWrappedLines(
  text,
  maxWidth,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const chunks = String(text).split("");
  const lines = [];
  let line = "";
  for (let index = 0; index < chunks.length; index += 1) {
    const char = chunks[index];
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length + 1 >= maxLines) {
        const remaining = line + chunks.slice(index + 1).join("");
        lines.push(fitTextToWidth(remaining, maxWidth, "…"));
        return lines.slice(0, maxLines);
      }
    } else {
      line = test;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.slice(0, maxLines);
}

function wrapText(
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const lines = getWrappedLines(text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return lines.length;
}

function drawHeader() {
  ctx.fillStyle = "#2f2231";
  ctx.fillRect(18, 18, canvas.width - 36, 72);
  ctx.fillStyle = "#ffe8a8";
  ctx.fillRect(28, 28, canvas.width - 56, 52);

  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("小镇观察模拟器", 42, 60);
  ctx.font = "13px Trebuchet MS";
  const hours = getCurrentHour();
  ctx.fillText(`Town buzz ${hours}:00`, 252, 60);
  ctx.fillText(
    fitTextToWidth(
      `${state.timeOfDay.label} / ${state.world.season.label} / ${state.world.weather.label} / ${state.world.calendar.label}`,
      canvas.width - 410,
    ),
    362,
    60,
  );
}

function drawFloaters() {
  ctx.font = "bold 14px monospace";
  for (const floater of state.floaters) {
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x - 26, floater.y);
  }
}

function drawDialogueOverlay() {
  if (!state.activeDialogue) {
    return;
  }
  const speaker = getVisitorById(state.activeDialogue.speakerId);
  if (!speaker) {
    return;
  }
  const lines = getWrappedLines(state.activeDialogue.text, 164, 3);
  const boxW = 184;
  const boxH = 24 + lines.length * 13;
  const boxX = Math.max(18, Math.min(layout.sidebarX - boxW - 16, speaker.x - boxW / 2));
  const boxY = Math.max(98, speaker.y - 58 - (lines.length - 1) * 8);
  ctx.fillStyle = "rgba(255, 244, 214, 0.96)";
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = "#3d2b35";
  ctx.lineWidth = 4;
  ctx.strokeRect(boxX + 1.5, boxY + 1.5, boxW - 3, boxH - 3);
  ctx.fillStyle = "#2f2231";
  ctx.font = "11px Trebuchet MS";
  wrapText(state.activeDialogue.text, boxX + 10, boxY + 18, 164, 13, 3);
}

function drawEnvironmentNotice() {
  if (!state.environmentNotice) {
    return;
  }
  const width = 296;
  const height = 42;
  const x = Math.round((canvas.width - width) / 2);
  const y = 92;
  ctx.fillStyle = "rgba(47, 34, 49, 0.88)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = state.environmentNotice.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
  ctx.fillStyle = state.environmentNotice.color;
  ctx.font = "bold 13px Trebuchet MS";
  wrapText(state.environmentNotice.text, x + 12, y + 18, width - 24, 14, 2);
}

function drawMenuOverlay() {
  ctx.fillStyle = "rgba(47, 34, 49, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff0ce";
  ctx.fillRect(132, 164, 430, 242);
  ctx.strokeStyle = "#3d2b35";
  ctx.lineWidth = 6;
  ctx.strokeRect(135, 167, 424, 236);

  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 28px Trebuchet MS";
  ctx.fillText("小镇观察模拟器", 170, 222);
  ctx.font = "16px Trebuchet MS";
  wrapText(
    "目标是拼出有联动、有季节感的小商店街。先用 Snack 和 Park 打底，后面会解锁更大的设施。",
    170,
    254,
    350,
    22,
  );
  wrapText(
    "街边 NPC 会评论天气、开店与组合加成。点击开始按钮进入经营，右键拆楼，评价越高，顾客刷新越快。",
    170,
    324,
    350,
    22,
  );
}

function drawCompleteOverlay() {
  ctx.fillStyle = "rgba(47, 34, 49, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff0ce";
  ctx.fillRect(166, 182, 394, 204);
  ctx.strokeStyle = "#3d2b35";
  ctx.lineWidth = 6;
  ctx.strokeRect(169, 185, 388, 198);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 30px Trebuchet MS";
  ctx.fillText("Street Complete!", 220, 240);
  ctx.font = "16px Trebuchet MS";
  wrapText(
    `目标全部完成。累计接待 ${state.servedVisitors} 位顾客，营业收入 ${state.lifetimeIncome}G。按 R 或点“再开一轮”继续调参。`,
    210,
    278,
    300,
    22,
  );
}

function render() {
  syncButtons();
  syncShellTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawHeader();
  drawGrid();
  drawNPCs();
  drawVisitors();
  drawSidebar();
  drawEnvironmentNotice();
  drawDialogueOverlay();
  drawFloaters();
  if (state.mode === "menu") {
    drawMenuOverlay();
  } else if (state.mode === "complete") {
    drawCompleteOverlay();
  }
}

function handleCanvasClick(event) {
  const { x, y } = getCanvasPointer(event);
  if (hitObserveCard(x, y)) {
    state.selectedType = null;
    render();
    return;
  }
  const card = hitFacilityCard(x, y);
  if (card) {
    state.selectedType = card.id;
    render();
    return;
  }

  const tile = screenToTile(x, y);
  if (tile && state.selectedType) {
    placeFacility(tile.col, tile.row, state.selectedType);
    render();
  }
}

function handleContextMenu(event) {
  event.preventDefault();
  const { x, y } = getCanvasPointer(event);
  const tile = screenToTile(x, y);
  if (!tile || state.mode !== "play") {
    return;
  }
  removeFacility(tile.col, tile.row);
  render();
}

function hitFacilityCard(x, y) {
  for (let index = 0; index < facilityTypes.length; index += 1) {
    const def = facilityTypes[index];
    const { x: cardX, y: cardY, w: cardW, h: cardH } = getFacilityCardRect(index);
    if (
      x >= cardX &&
      x <= cardX + cardW &&
      y >= cardY &&
      y <= cardY + cardH
    ) {
      return def;
    }
  }
  return null;
}

function hitObserveCard(x, y) {
  const rect = getObserveCardRect();
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function getCanvasPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener("click", handleCanvasClick);
canvas.addEventListener("contextmenu", handleContextMenu);
canvas.addEventListener("mousemove", (event) => {
  const point = getCanvasPointer(event);
  state.hoveredTile = screenToTile(point.x, point.y);
  render();
});
canvas.addEventListener("mouseleave", () => {
  state.hoveredTile = null;
  render();
});

startButton.addEventListener("click", () => {
  startGame();
  render();
});

restartButton.addEventListener("click", () => {
  resetGame();
});

window.addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "5") {
    const index = Number(event.key) - 1;
    if (facilityTypes[index]) {
      state.selectedType = facilityTypes[index].id;
    }
  }
  if (event.key === "0") {
    state.selectedType = null;
  }
  if (event.key.toLowerCase() === "r") {
    resetGame();
  }
  if (event.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  if (event.key === "Escape" && document.fullscreenElement) {
    document.exitFullscreen?.();
  }
  render();
});

let lastFrame = performance.now();
let manualControlUntil = 0;
function frame(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!automationDriven && now >= manualControlUntil) {
    update(delta);
  }
  render();
  requestAnimationFrame(frame);
}

window.advanceTime = (ms) => {
  manualControlUntil = performance.now() + 200;
  const step = 1000 / 60;
  let remaining = ms;
  while (remaining > 0) {
    const chunk = Math.min(step, remaining);
    update(chunk / 1000);
    remaining -= chunk;
  }
  render();
};

window.render_game_to_text = () =>
  JSON.stringify({
    mode: state.mode,
    coordinateSystem: {
      origin: "top-left of canvas",
      xDirection: "right",
      yDirection: "down",
      tileSize: layout.tile,
    },
    resources: {
      money: state.money,
      rating: state.rating,
      day: state.day,
      selectedType: state.selectedType,
      lastCombo: state.lastCombo,
      todayTrend: state.todayTrend,
      servedVisitors: state.servedVisitors,
      lifetimeIncome: state.lifetimeIncome,
    },
    world: {
      calendar: state.world.calendar,
      timeOfDay: state.timeOfDay,
      season: {
        id: state.world.season.id,
        name: state.world.season.name,
        label: state.world.season.label,
      },
      weather: {
        id: state.world.weather.id,
        name: state.world.weather.name,
        label: state.world.weather.label,
      },
      upcomingFestival: state.world.upcomingFestival,
      activeFestival: state.world.activeFestival,
      activeEvents: state.world.eventQueue.map((event) => ({
        id: event.id,
        title: event.title,
        trafficModifier: event.trafficModifier,
      })),
      eventQueueSize: state.world.eventQueue.length,
      incidentQueueSize: state.world.incidentQueue.length,
    },
    structures: state.facilities.map((facility) => ({
      id: facility.id,
      type: facility.type,
      kind: facility.kind,
      removable: facility.removable,
      col: facility.col,
      row: facility.row,
      width: facility.width,
      height: facility.height,
    })),
    facilities: listFacilities().map((facility) => ({
      id: facility.id,
      type: facility.type,
      col: facility.col,
      row: facility.row,
      width: facility.width,
      height: facility.height,
      level: facility.level,
      visits: facility.visits,
      queueLength: facility.queue.length,
      queueCapacity: getFacilityQueueCapacity(facility),
      activeServiceId: facility.activeServiceId,
    })),
    visitors: state.visitors.map((visitor) => ({
      id: visitor.id,
      profileId: visitor.profileId,
      profileLabel: visitor.profileLabel,
      x: Math.round(visitor.x),
      y: Math.round(visitor.y),
      phase: visitor.phase,
      queuePatience: Number(visitor.queuePatience?.toFixed?.(2) || 0),
      target: { col: visitor.targetCol, row: visitor.targetRow },
    })),
    npcs: state.npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      x: Math.round(npc.x),
      y: Math.round(npc.y),
      speaking: state.activeDialogue?.speakerId === npc.id,
    })),
    dialogue: state.activeDialogue
      ? {
          speakerName: state.activeDialogue.speakerName,
          speakerId: state.activeDialogue.speakerId,
          topic: state.activeDialogue.topic,
          text: state.activeDialogue.text,
        }
      : null,
    environmentNotice: state.environmentNotice,
    goals: state.goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      completed: goal.completed,
      progress: getGoalProgress(goal),
    })),
    ticker: state.messages.slice(0, 2),
  });

requestAnimationFrame(frame);
render();
