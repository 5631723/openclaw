const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");
const automationDriven = Boolean(window.navigator.webdriver);
const initialDebugIncidentId = (() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = params.get("incident") || params.get("debugIncident") || "";
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/^incident-/, "") || null;
  } catch {
    return null;
  }
})();
const initialDebugTrafficMode = (() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const raw = params.get("traffic") || params.get("debugTraffic") || "";
    const normalized = String(raw || "").trim().toLowerCase();
    return normalized === "stop" || normalized === "drive" ? normalized : null;
  } catch {
    return null;
  }
})();

const simulationTuning = automationDriven
  ? {
      dayLength: 10,
      initialSpawnDelay: 0.38,
      minSpawnDelay: 0.38,
      spawnBaseDelay: 0.8,
      spawnDaySlope: 0.03,
      visitorSpeedMultiplier: 3.2,
      visitorWait: 0.22,
    }
  : {
      dayLength: 50,
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

const streetLayout = {
  verticalBand: { min: 5, max: 7 },
  northLotRows: { min: 0, max: 2 },
  mainStreetRows: {
    northSidewalk: 3,
    promenade: 4,
    southSidewalk: 5,
  },
  southLotRows: { min: 6, max: 7 },
  lowerPromenadeRows: {
    upper: 8,
    lower: 9,
  },
  crosswalkCols: [5, 6, 7],
  signalCycle: {
    walk: 4.8,
    blink: 1.2,
    drive: 5.2,
  },
};

function isVerticalStreetTile(col) {
  return col >= streetLayout.verticalBand.min && col <= streetLayout.verticalBand.max;
}

function isNorthLotRow(row) {
  return row >= streetLayout.northLotRows.min && row <= streetLayout.northLotRows.max;
}

function isSouthLotRow(row) {
  return row >= streetLayout.southLotRows.min && row <= streetLayout.southLotRows.max;
}

function isBuildLotTile(col, row) {
  return !isVerticalStreetTile(col) && (isNorthLotRow(row) || isSouthLotRow(row));
}

function isSidewalkRow(row) {
  return (
    row === streetLayout.mainStreetRows.northSidewalk ||
    row === streetLayout.mainStreetRows.southSidewalk ||
    row === streetLayout.lowerPromenadeRows.upper ||
    row === streetLayout.lowerPromenadeRows.lower
  );
}

function isPromenadeTile(col, row) {
  return row === streetLayout.mainStreetRows.promenade || row === streetLayout.lowerPromenadeRows.lower;
}

function isCrosswalkTile(col, row) {
  return (
    streetLayout.crosswalkCols.includes(col) &&
    (row === streetLayout.mainStreetRows.promenade ||
      row === streetLayout.lowerPromenadeRows.upper ||
      row === streetLayout.lowerPromenadeRows.lower)
  );
}

function isTownWalkwayTile(col, row) {
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) {
    return false;
  }
  return isVerticalStreetTile(col) || isSidewalkRow(row) || isPromenadeTile(col, row);
}

function getTownTileKind(col, row) {
  if (isBuildLotTile(col, row)) {
    return "lot";
  }
  if (isCrosswalkTile(col, row)) {
    return "crosswalk";
  }
  if (row === streetLayout.mainStreetRows.promenade) {
    return "main-street";
  }
  if (row === streetLayout.lowerPromenadeRows.lower) {
    return "lower-promenade";
  }
  if (row === streetLayout.lowerPromenadeRows.upper) {
    return "curb";
  }
  if (isVerticalStreetTile(col)) {
    return col === 6 ? "vertical-street" : "vertical-sidewalk";
  }
  if (isSidewalkRow(row)) {
    return "sidewalk";
  }
  return "green";
}

function getTownLotPlacementCandidates(width, height) {
  const candidates = [];
  for (let row = 0; row <= layout.rows - height; row += 1) {
    for (let col = 0; col <= layout.cols - width; col += 1) {
      const tiles = getFootprintTiles(col, row, width, height);
      if (!tiles.every((tile) => isBuildLotTile(tile.col, tile.row))) {
        continue;
      }
      candidates.push({ col, row });
    }
  }
  return candidates;
}

function getTreePlanterCandidates() {
  return [
    { col: 0, row: 5 },
    { col: 2, row: 5 },
    { col: 4, row: 8 },
    { col: 9, row: 5 },
    { col: 11, row: 8 },
    { col: 13, row: 8 },
    { col: 1, row: 8 },
    { col: 12, row: 5 },
  ];
}

const calendarTuning = {
  daysPerYear: 360,
  seasonLength: 90,
  calendarDayStep: 15,
};

const quarterSeasonLabels = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

const pixelCloudTemplates = [
  {
    body: [
      [4, 1, 8, 2],
      [2, 3, 13, 3],
      [0, 5, 16, 4],
      [2, 9, 12, 2],
    ],
    highlight: [
      [5, 2, 4, 1],
      [3, 4, 7, 1],
      [6, 6, 5, 1],
    ],
  },
  {
    body: [
      [3, 1, 7, 2],
      [1, 3, 10, 2],
      [0, 5, 14, 3],
      [4, 8, 8, 2],
    ],
    highlight: [
      [4, 2, 3, 1],
      [2, 4, 5, 1],
      [7, 5, 4, 1],
    ],
  },
  {
    body: [
      [2, 2, 6, 2],
      [0, 4, 11, 2],
      [1, 6, 13, 3],
      [5, 9, 7, 2],
    ],
    highlight: [
      [3, 3, 3, 1],
      [1, 5, 5, 1],
      [7, 6, 4, 1],
    ],
  },
];

const roadTrafficPalettes = [
  { body: "#ef8f57", roof: "#fff1d7", trim: "#593d3d" },
  { body: "#63a7e8", roof: "#edf7ff", trim: "#354b63" },
  { body: "#74c56a", roof: "#f1ffe8", trim: "#416245" },
  { body: "#ffd266", roof: "#fff7e0", trim: "#6a5140" },
];

const roadTrafficConfigs = [
  {
    id: "car-east",
    speed: 76,
    y: () => layout.roadY + 4,
    dir: 1,
    scale: 3,
    palette: roadTrafficPalettes[0],
    type: "car",
    startX: -120,
  },
  {
    id: "truck-west",
    speed: 54,
    y: () => layout.roadY + 24,
    dir: -1,
    scale: 3,
    palette: roadTrafficPalettes[1],
    type: "truck",
    startX: () => layout.sidebarX + 120,
  },
  {
    id: "bus-east",
    speed: 34,
    y: () => layout.roadY + 2,
    dir: 1,
    scale: 3,
    palette: roadTrafficPalettes[3],
    type: "bus",
    startX: -420,
  },
];

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
    serviceScale: 2.6,
    bonusText: "靠近 Park 时人气更高",
    synergy: { park: { income: 2, rating: 2, pop: 4 } },
    sprite: [
      ".....yyyyy......",
      "....yyoooyy.....",
      "...rrrrrrrrrr...",
      "..rrwwwwwwwwrr..",
      "..rwwoooooowwr..",
      "..rwwwwwwwwwwr..",
      "..rccrrrrrrccr..",
      "..rccrrrrrrccr..",
      "..rwwyyyyyywwr..",
      "..rwwttbbttwwr..",
      "..rwwttbbttwwr..",
      "..rllbddddbllr..",
      "..rllbddddbllr..",
      "...kk......kk...",
      "...kk......kk...",
      "................",
    ],
    palette: {
      r: "#d84c36",
      y: "#ffe173",
      w: "#fff9e8",
      o: "#a34b2a",
      c: "#f4c780",
      t: "#8ed4ef",
      d: "#87563f",
      l: "#694640",
      b: "#463538",
      k: "#433742",
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
    serviceScale: 1.8,
    bonusText: "和 Snack / Bath 形成休闲区",
    synergy: {
      snack: { income: 2, rating: 2, pop: 3 },
      bath: { income: 3, rating: 3, pop: 3 },
    },
    sprite: [
      "....hhhhh.......",
      "...hgggggh......",
      "..hgggggggh.....",
      "..ggggggggg.....",
      "...hgggggh......",
      "......tt........",
      ".....tttt.......",
      "...pppppppp.....",
      "..ppybbbbypp....",
      "..ppybttbypp....",
      "..ppybttbypp....",
      "...ppyyyypp.....",
      "...ff....ff.....",
      "..ffffffffff....",
      "..ffffffffff....",
      "................",
    ],
    palette: {
      h: "#8dd56d",
      g: "#63b552",
      t: "#8d5b39",
      p: "#d7c7a8",
      y: "#f6df90",
      b: "#9b6b41",
      f: "#f08ca6",
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
    serviceScale: 3.2,
    bonusText: "挨着 Snack 时更会赚钱",
    synergy: { snack: { income: 4, rating: 2, pop: 3 } },
    sprite: [
      ".....yyyyy......",
      "...bbbbbbbbbb...",
      "..bbiiiiiiiibb..",
      "..biyppppppyib..",
      "..biypwwwwpyib..",
      "..biypwwwwpyib..",
      "..biiiccccciii..",
      "..biiccppppcci..",
      "..biiccppppcci..",
      "..biittbbbbtti..",
      "..biittbbbbtti..",
      "..biillbddblli..",
      "..biillbddblli..",
      "...kk......kk...",
      "...kk......kk...",
      "................",
    ],
    palette: {
      b: "#4554a5",
      i: "#6b7cf3",
      y: "#ffe26f",
      c: "#d5d7f6",
      p: "#f06390",
      t: "#7cd6f5",
      l: "#2f3156",
      k: "#383240",
      d: "#6d4d4b",
      w: "#fff8eb",
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
    serviceScale: 3.8,
    bonusText: "靠近 Park 时评价涨得快",
    synergy: { park: { income: 3, rating: 5, pop: 2 } },
    sprite: [
      "....ssssssss....",
      "...sswwwwwwss...",
      "..sswccccccwss..",
      "..swccooooccws..",
      "..swcwwwwwwcws..",
      "..swcyyyyyycws..",
      "..swcyttttycws..",
      "..swcytmmtycws..",
      "..swcytmmtycws..",
      "..swcyppppycws..",
      "..swllbddbllws..",
      "..swllbddbllws..",
      "..swkk....kkws..",
      "...kk......kk...",
      "...kk......kk...",
      "................",
    ],
    palette: {
      s: "#63bfd1",
      w: "#f8f8f0",
      c: "#d9f4fb",
      o: "#f0b87a",
      y: "#f7e0a0",
      t: "#8fd7ea",
      m: "#63afcc",
      p: "#6aa6de",
      l: "#58727a",
      b: "#4b6170",
      d: "#8c654e",
      k: "#37505a",
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
    serviceScale: 4.4,
    bonusText: "和 Arcade 配套会爆红",
    synergy: { arcade: { income: 5, rating: 6, pop: 5 } },
    sprite: [
      "......yy........",
      ".....yppy.......",
      "....ppyyyy......",
      "...pppwwypp.....",
      "..ppwwwwwwpp....",
      "..pwwwwwwwwp....",
      "..pwwyssywwp....",
      "..pwwsssswwp....",
      "..pwwsssswwp....",
      "..pwwyssywwp....",
      "..pwwttbbttwp...",
      "..pwwttbbttwp...",
      "..prllbddbllrp..",
      "..prllbddbllrp..",
      "...rr......rr...",
      "................",
    ],
    palette: {
      p: "#ea58a5",
      y: "#ffe26f",
      w: "#fff4fb",
      s: "#ff8ac9",
      t: "#91dcff",
      b: "#6b4b5e",
      d: "#9f7358",
      r: "#6f3c56",
      l: "#4c3242",
    },
  },
];

const visitorAppearanceSets = {
  student: [
    {
      shirt: "#5c7cfa",
      hair: "#4d3a34",
      accent: "#ffe69b",
      pants: "#475cb2",
      skin: "#f4d8be",
      frame: "short",
      accessory: "cap",
    },
    {
      shirt: "#ff8fb7",
      hair: "#3f3451",
      accent: "#fff1bb",
      pants: "#b45d84",
      skin: "#f2d3b8",
      frame: "short",
      accessory: "ribbon",
    },
  ],
  family: [
    {
      shirt: "#51cf66",
      hair: "#7d5639",
      accent: "#ffe4b8",
      pants: "#4d9351",
      skin: "#f4d8be",
      frame: "standard",
      accessory: "scarf",
    },
    {
      shirt: "#ffb84d",
      hair: "#4b3933",
      accent: "#fff1d0",
      pants: "#b97f39",
      skin: "#f1d1b4",
      frame: "standard",
      accessory: "ribbon",
    },
  ],
  worker: [
    {
      shirt: "#6e88ff",
      hair: "#4a372f",
      accent: "#dce4ff",
      pants: "#4b5f92",
      skin: "#efd0b5",
      frame: "broad",
      accessory: "briefcase",
    },
    {
      shirt: "#7ec5ff",
      hair: "#2f2b40",
      accent: "#f6e2ab",
      pants: "#4f6f9e",
      skin: "#f2d4ba",
      frame: "broad",
      accessory: "tie",
    },
  ],
  traveler: [
    {
      shirt: "#ffd166",
      hair: "#5b493a",
      accent: "#c7f0ff",
      pants: "#9d7c38",
      skin: "#f1cfb2",
      frame: "tall",
      accessory: "hat",
    },
    {
      shirt: "#a28cff",
      hair: "#3e314a",
      accent: "#ffe7b8",
      pants: "#6755ad",
      skin: "#efcbb0",
      frame: "tall",
      accessory: "bag",
    },
  ],
};

const visitorArchetypes = [
  {
    id: "student",
    label: "学生客",
    favoriteTypes: ["arcade", "snack"],
    favoredLandmarks: ["library"],
    likedTimes: ["daytime", "evening"],
    likedWeathers: ["cloudy", "festival-breeze"],
    festivalBias: ["summer-fair"],
  },
  {
    id: "family",
    label: "家庭客",
    favoriteTypes: ["park", "snack", "bath"],
    favoredLandmarks: ["clinic", "library"],
    likedTimes: ["daytime", "morning"],
    likedWeathers: ["sunny"],
    festivalBias: ["new-year", "flower"],
  },
  {
    id: "worker",
    label: "上班族",
    favoriteTypes: ["snack", "bath"],
    favoredLandmarks: ["workshop", "post", "police"],
    likedTimes: ["morning", "evening"],
    likedWeathers: ["cloudy", "drizzle"],
    festivalBias: ["harvest"],
  },
  {
    id: "traveler",
    label: "游客",
    favoriteTypes: ["tower", "park", "arcade"],
    favoredLandmarks: ["post", "library"],
    likedTimes: ["daytime", "evening"],
    likedWeathers: ["sunny", "festival-breeze"],
    festivalBias: ["flower", "summer-fair"],
  },
];

const visitorEmoteSprites = {
  dots: {
    sprite: [".....", ".....", "d.d.d", ".....", "....."],
    palette: { d: "#7f675f" },
  },
  sweat: {
    sprite: ["..b..", ".bbb.", ".bbb.", "..b..", "....."],
    palette: { b: "#78c8ff" },
  },
  anger: {
    sprite: ["r...r", ".r.r.", "..r..", ".r.r.", "r...r"],
    palette: { r: "#ff8369" },
  },
  heart: {
    sprite: ["p.p.p", "ppppp", "ppppp", ".ppp.", "..p.."],
    palette: { p: "#ff7ba5" },
  },
  note: {
    sprite: ["..g..", "..g..", "..gg.", "..gg.", ".gg.."],
    palette: { g: "#97dd8a" },
  },
  star: {
    sprite: ["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."],
    palette: { y: "#ffe37a" },
  },
  sleep: {
    sprite: ["zz...", ".zz..", "..zz.", "...zz", "....."],
    palette: { z: "#7da7ff" },
  },
  book: {
    sprite: ["bbbbb", "bwwpb", "bwwpb", "bpppb", "bbbbb"],
    palette: { b: "#6d8ed8", w: "#f7fbff", p: "#9eb8ea" },
  },
  briefcase: {
    sprite: ["..yy.", ".bbbb", "bwwpb", "bpppb", ".bbbb"],
    palette: { y: "#f3d372", b: "#8f6847", w: "#f9f1de", p: "#bc8d61" },
  },
  house: {
    sprite: ["..r..", ".rrr.", "bbbbb", "bwwbb", "bbbbb"],
    palette: { r: "#ff9277", b: "#8f744f", w: "#fff1d6" },
  },
  exclaim: {
    sprite: ["..r..", "..r..", "..r..", ".....", "..r.."],
    palette: { r: "#ff8a72" },
  },
};

const visitorEmotionDefinitions = {
  calm: {
    label: "平静",
    speedMultiplier: 1,
    accent: "#fff0ce",
    emote: null,
  },
  happy: {
    label: "开心",
    speedMultiplier: 1.06,
    accent: "#ffe07c",
    emote: "note",
  },
  rushed: {
    label: "着急",
    speedMultiplier: 1.2,
    accent: "#ffbf84",
    emote: "exclaim",
  },
  tired: {
    label: "犯困",
    speedMultiplier: 0.84,
    accent: "#9fb6ff",
    emote: "sleep",
  },
  bored: {
    label: "发呆",
    speedMultiplier: 0.92,
    accent: "#d8cbb7",
    emote: "dots",
  },
  annoyed: {
    label: "抱怨",
    speedMultiplier: 1.08,
    accent: "#ff9e93",
    emote: "anger",
  },
};

const socialBondDefinitions = {
  classmate: {
    label: "同学",
    emote: "book",
    mood: "happy",
    pauseRange: [0.9, 1.4],
    chatLines: [
      "原来你也刚从那边过来，放学后果然还是会往这条街逛。",
      "等会儿一起去看看新店吧，这条街今天好像比平时更热闹。",
      "作业先放一边，街口这阵动静不看一眼总觉得亏了。",
      "每次经过这条街都能碰到点新鲜事，难怪大家老往这边跑。",
      "那边的招牌又换过了，放学后绕来这里果然有得看。",
    ],
    waveLines: [
      "放学后见到你正好，一起往前晃吧。",
      "欸，你也来了，前面那一段今天好像挺热闹。",
    ],
    strollLines: [
      "一起往前走吧，边逛边聊更有意思。",
      "那就并排走一段，看看今天街上又多了什么。",
    ],
  },
  coworker: {
    label: "同事",
    emote: "briefcase",
    mood: "calm",
    pauseRange: [0.8, 1.2],
    chatLines: [
      "班上的事先放一边，趁现在街上不挤，顺手逛一圈。",
      "这边碰到你正好，忙完再一起去前面那家店看看。",
      "刚好换了个空档，街上这一阵人流看着还挺顺。",
      "今天事情总算告一段落，走到这儿整个人都松下来了。",
      "前面那家店门口又热起来了，下班路上不看两眼太可惜。",
    ],
    waveLines: [
      "你也刚忙完？那前面一起看看。",
      "正好碰上，先并排走一小段。",
    ],
    strollLines: [
      "先别急着散，往前边那排店一起走走。",
      "下班后的街景就该慢慢看，顺路一起过去吧。",
    ],
  },
  couple: {
    label: "伴侣",
    emote: "heart",
    mood: "happy",
    pauseRange: [1, 1.6],
    chatLines: [
      "今天这条街的气氛不错，慢慢走一圈也挺舒服。",
      "那家店门口看着挺有意思，等会儿一起进去看看吧。",
      "这会儿灯色刚刚好，沿着这排店慢慢逛最舒服。",
      "街上的人一多起来，反而更有那种一起散步的感觉。",
      "前面那边看起来又有热闹，我们慢慢走过去就行。",
    ],
    waveLines: [
      "在这儿碰上正好，继续一起逛吧。",
      "你也看到前面那阵热闹了吧，过去瞧瞧。",
    ],
    strollLines: [
      "那就慢一点并排走，今天不着急。",
      "一起往前看看吧，这条街现在最适合慢慢逛。",
    ],
  },
  neighbor: {
    label: "邻居",
    emote: "house",
    mood: "calm",
    pauseRange: [0.75, 1.15],
    chatLines: [
      "在这儿又碰到了，看来最近大家都爱往这条街散步。",
      "街口刚热闹起来，等会儿有空再一起过去看看。",
      "最近这条街变化挺快，隔两天过来都像多了点新东西。",
      "出来遛个弯还能碰见你，看来大家都盯上这边了。",
      "前面那棵树旁边总有人停一下，连散步路线都变得有意思了。",
    ],
    waveLines: [
      "又遇到了，一起往街口走走？",
      "前面正热闹着，边走边看吧。",
    ],
    strollLines: [
      "刚好顺路，那就一起散一段。",
      "一起走到前面看看，今天街上的节奏挺有意思。",
    ],
  },
};

const shopVisitFeedbackDefinitions = {
  snack: {
    badgeType: "snack",
    moodId: "happy",
    moodTtl: 5.6,
    emotes: ["heart", "note"],
    floaterTexts: ["吃饱了", "小点心真香", "嘴巴满足"],
    dialogues: [
      "这家点心一吃，脚步都跟着轻快起来了。",
      "刚出炉的香味真顶，难怪门口总有人停下来看。",
      "小吃摊这趟没白排，手上还留着点香味。",
    ],
  },
  park: {
    badgeType: "park",
    moodId: "calm",
    moodTtl: 6,
    emotes: ["star", "dots"],
    floaterTexts: ["心情转晴", "散步一下", "放松片刻"],
    dialogues: [
      "绕着公园走一圈，整个人都慢下来了。",
      "草地边停一下，街上的声音都变得顺耳了。",
      "在这儿晃一圈以后，再继续逛街也不急了。",
    ],
  },
  arcade: {
    badgeType: "arcade",
    moodId: "rushed",
    moodTtl: 4.6,
    emotes: ["star", "exclaim"],
    floaterTexts: ["赢了一把", "手感不错", "上头了"],
    dialogues: [
      "这一局打得太顺了，出来以后还想往下一家冲。",
      "街机厅这趟很提劲，感觉还能再逛好几家。",
      "刚才那一下赢得漂亮，整个人都精神了。",
    ],
  },
  bath: {
    badgeType: "bath",
    moodId: "calm",
    moodTtl: 6.4,
    emotes: ["heart", "dots"],
    floaterTexts: ["舒服多了", "暖和起来", "松一口气"],
    dialogues: [
      "泡完这一趟，脚步都不自觉慢下来了。",
      "热气一散开，刚才那点疲惫一下就没了。",
      "从浴场出来以后，整个人都柔和了不少。",
    ],
  },
  tower: {
    badgeType: "tower",
    moodId: "happy",
    moodTtl: 6.2,
    emotes: ["heart", "note", "star"],
    floaterTexts: ["气氛拉满", "应援完成", "今晚值了"],
    dialogues: [
      "舞台那股热度还没散，出来以后心情都跟着亮起来了。",
      "刚才那段表演太带劲，走出来还想再回头看一眼。",
      "偶像塔的气氛真会带人，离开以后还在回味。",
    ],
  },
};

const visitorServiceBadgeSprites = {
  snack: {
    sprite: [".....", ".yyy.", "yoooy", "yoooy", ".bbb."],
    palette: { y: "#ffe17c", o: "#cf7a42", b: "#8f5f42" },
  },
  park: {
    sprite: ["..g..", ".ggg.", "ggggg", "..g..", "..g.."],
    palette: { g: "#86d267" },
  },
  arcade: {
    sprite: ["ppppp", "pwwpp", "ppwpp", "pwwpp", "ppppp"],
    palette: { p: "#7f7cff", w: "#fff2b8" },
  },
  bath: {
    sprite: ["bbbbb", "bwwwb", "bwwwb", ".bbb.", "..b.."],
    palette: { b: "#8ed6ff", w: "#f7fdff" },
  },
  tower: {
    sprite: ["..p..", ".ppp.", "..p..", ".yyy.", "yyyyy"],
    palette: { p: "#ff90b2", y: "#ffe170" },
  },
};

const streetPickupDefinitions = {
  paperbag: {
    label: "纸袋",
    emote: "note",
    inspectText: "掉了个小纸袋",
    sprite: ["..yy.", ".yyyy", ".y..y", ".yyyy", "..bb."],
    palette: { y: "#ebc578", b: "#8a6547" },
  },
  receipt: {
    label: "小票",
    emote: "dots",
    inspectText: "捡起一张小票",
    sprite: ["wwww.", "w..w.", "wwww.", "w..w.", "wwww."],
    palette: { w: "#fff6df" },
  },
  token: {
    label: "代币",
    emote: "star",
    inspectText: "捡到一枚代币",
    sprite: [".yyy.", "yoooy", "yoooy", "yoooy", ".yyy."],
    palette: { y: "#ffd965", o: "#f4b83f" },
  },
  flyer: {
    label: "宣传单",
    emote: "note",
    inspectText: "捡起一张宣传单",
    sprite: ["wwwww", "wrrrw", "wwwww", "wrrrw", "wwwww"],
    palette: { w: "#fff4de", r: "#ff9a8a" },
  },
  ticket: {
    label: "票根",
    emote: "heart",
    inspectText: "捡到一张票根",
    sprite: ["ppppp", "pwwwp", "ppppp", "pwwwp", "ppppp"],
    palette: { p: "#ff98bf", w: "#fff7e7" },
  },
  leaf: {
    label: "落叶",
    emote: "star",
    inspectText: "拈起一片落叶",
    sprite: ["..o..", ".ooo.", "ooooo", ".ooo.", "..o.."],
    palette: { o: "#e6a04d" },
  },
  petal: {
    label: "花瓣",
    emote: "heart",
    inspectText: "拾起一片花瓣",
    sprite: [".p.p.", "ppppp", ".ppp.", "..p..", "....."],
    palette: { p: "#ff9fcb" },
  },
  coupon: {
    label: "折扣券",
    emote: "star",
    inspectText: "捡到一张折扣券",
    sprite: ["yyyyy", "ywwwy", "yyyyy", "ywwwy", "yyyyy"],
    palette: { y: "#ffe17b", w: "#fff8e5" },
  },
  ribbon: {
    label: "彩带",
    emote: "note",
    inspectText: "捡起一段彩带",
    sprite: ["r...r", ".r.r.", "..r..", ".r.r.", "r...r"],
    palette: { r: "#ff8eb3" },
  },
};

const landmarkRhythmDefinitions = {
  library: {
    color: "#92b8ff",
    title: "图书角热起来了",
    description: "图书馆今天来往明显变多，学生客和游客更愿意往安静路线走。",
    profileBias: { student: 0.9, traveler: 0.35, family: 0.18 },
    facilityBias: { park: 1.3, tower: 1.8, snack: 0.6 },
    thresholds: [2, 4],
  },
  clinic: {
    color: "#ffb3b3",
    title: "诊所门口人来人往",
    description: "诊所事务变多，家庭客更常出现，大家也更偏好轻松一点的店。",
    profileBias: { family: 0.85, worker: 0.25 },
    facilityBias: { bath: 1.6, park: 1.1, arcade: -0.5 },
    thresholds: [2, 4],
  },
  post: {
    color: "#ffd28b",
    title: "邮局今天很忙",
    description: "寄件和取件的人多了，游客和上班族会更多地拐进街边小店。",
    profileBias: { traveler: 0.78, worker: 0.44 },
    facilityBias: { snack: 1.5, tower: 1.1, arcade: 0.7 },
    thresholds: [2, 4],
  },
  police: {
    color: "#b9ceff",
    title: "警务亭问路的人变多",
    description: "更多人会先去问路，随后更愿意继续逛完整条街。",
    profileBias: { family: 0.4, worker: 0.34, traveler: 0.28 },
    facilityBias: { park: 1.2, snack: 0.8, tower: 0.8 },
    thresholds: [2, 4],
  },
  workshop: {
    color: "#dcb79d",
    title: "工坊事务正忙",
    description: "工坊交接频繁，上班族会更多出现，办完事后也更想顺手消费。",
    profileBias: { worker: 0.92, traveler: 0.12 },
    facilityBias: { snack: 1.4, arcade: 1.2, bath: 0.7 },
    thresholds: [2, 4],
  },
};

const landmarkResultSprites = {
  library: {
    sprite: [
      ".bbbb.",
      ".bwwb.",
      ".bwwb.",
      ".bppb.",
      ".bppb.",
      ".bbbb.",
    ],
    palette: {
      b: "#6b8fd8",
      w: "#f7fbff",
      p: "#9bb7ee",
    },
  },
  clinic: {
    sprite: [
      "..rr..",
      "..rr..",
      "rrrrrr",
      "rrrrrr",
      "..rr..",
      "..rr..",
    ],
    palette: {
      r: "#ef7481",
    },
  },
  post: {
    sprite: [
      "yyyyyy",
      "ywwwwy",
      "ywwwwy",
      "yywwyy",
      "ywywyy",
      "yyyyyy",
    ],
    palette: {
      y: "#ffd37e",
      w: "#fff7ea",
    },
  },
  police: {
    sprite: [
      "..bb..",
      ".bbbb.",
      "bbddbb",
      ".byyb.",
      "..bb..",
      "..bb..",
    ],
    palette: {
      b: "#6f8fd8",
      d: "#dfe9ff",
      y: "#ffe38a",
    },
  },
  workshop: {
    sprite: [
      "..oo..",
      ".oooo.",
      ".ooto.",
      "..tt..",
      "..tt..",
      ".bbbb.",
    ],
    palette: {
      o: "#d68d55",
      t: "#8e613f",
      b: "#5a4740",
    },
  },
};

const landmarkTypes = [
  {
    id: "clinic",
    name: "Town Clinic",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 1 },
    color: "#e46b72",
    sprite: [
      "...rrrrrrrrrr...",
      "..rrmmmmmmmmrr..",
      ".rrmwwwwwwwwmrr.",
      ".rmwwccccccwwmr.",
      ".rmwwccccccwwmr.",
      ".rmwwwwwwwwwwmr.",
      ".rmwwyywwyywwmr.",
      ".rmwwwwwwwwwwmr.",
      ".rmttttttttttmr.",
      ".rmttrrbbrrttmr.",
      ".rmttrrbbrrttmr.",
      ".rmlllddddllmmr.",
      ".rmlllddddllmmr.",
      "..kk........kk..",
      "..kk........kk..",
      "................",
    ],
    palette: {
      r: "#d95a63",
      m: "#b84c55",
      w: "#fff5f1",
      c: "#f06b73",
      y: "#ffd97c",
      b: "#9d6f54",
      t: "#9ed3f8",
      l: "#705850",
      d: "#f0c18d",
      k: "#43363d",
    },
  },
  {
    id: "library",
    name: "Town Library",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 1 },
    color: "#6b8fd8",
    sprite: [
      "...bbbbbbbbbb...",
      "..bbmmmmmmmmbb..",
      ".bbmwwwwwwwwmbb.",
      ".bmwwppppppwwmb.",
      ".bmwwpwwwwpwwmb.",
      ".bmwwppppppwwmb.",
      ".bmwyyyyyyyywmb.",
      ".bmwyppwwppywmb.",
      ".bmwypttttpywmb.",
      ".bmwypdbbdpywmb.",
      ".bmwypdbbdpywmb.",
      ".bmlllddddlllmb.",
      ".bmlllddddlllmb.",
      "..kk........kk..",
      "..kk........kk..",
      "................",
    ],
    palette: {
      b: "#5d7fc5",
      m: "#4868a9",
      w: "#f4f8ff",
      p: "#8ca6dd",
      y: "#ffd86e",
      t: "#a6d7f5",
      l: "#50627d",
      d: "#8f644d",
      k: "#3d495a",
    },
  },
  {
    id: "post",
    name: "Post House",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 1 },
    color: "#e19e58",
    sprite: [
      "...oooooooooo...",
      "..ooqqqqqqqqoo..",
      ".ooqwwwwwwwwqoo.",
      ".oqwwmmmmmmwwqo.",
      ".oqwwmwwwwmwwqo.",
      ".oqwwmmmmmmwwqo.",
      ".oqwyyyyyyyywqo.",
      ".oqwymmeemmywqo.",
      ".oqwyttttttywqo.",
      ".oqwyttbbttywqo.",
      ".oqwyttbbttywqo.",
      ".oqlllddddlllqo.",
      ".oqlllddddlllqo.",
      "..kk........kk..",
      "..kk........kk..",
      "................",
    ],
    palette: {
      o: "#d98a46",
      q: "#a16436",
      w: "#fff5e9",
      m: "#f1cda1",
      y: "#ffd86c",
      t: "#9fd7f4",
      l: "#795847",
      b: "#6c4f42",
      d: "#a56c4e",
      k: "#44363a",
    },
  },
  {
    id: "police",
    name: "Police Box",
    kind: "landmark",
    removable: false,
    footprint: { w: 2, h: 1 },
    color: "#5c83c8",
    sprite: [
      "...bbbbbbbbbb...",
      "..bbnnnnnnnnbb..",
      ".bbnwwwwwwwwnbb.",
      ".bnwwppppppwwnb.",
      ".bnwwpggggpwwnb.",
      ".bnwwppppppwwnb.",
      ".bnwyyyyyyyywnb.",
      ".bnwypbbbbpywnb.",
      ".bnwypttttpywnb.",
      ".bnwyttbbttywnb.",
      ".bnwyttbbttywnb.",
      ".bnlllddddlllnb.",
      ".bnlllddddlllnb.",
      "..kk........kk..",
      "..kk........kk..",
      "................",
    ],
    palette: {
      b: "#567abf",
      n: "#35547f",
      w: "#f4f8ff",
      p: "#87a6dd",
      g: "#ffe47a",
      y: "#ffd96f",
      t: "#a5d7f4",
      l: "#4d617c",
      d: "#81614f",
      k: "#3c495b",
    },
  },
  {
    id: "workshop",
    name: "Craft Works",
    kind: "landmark",
    removable: false,
    footprint: { w: 1, h: 2 },
    color: "#7c8a92",
    sprite: [
      ".....cccc.......",
      "....cchhc.......",
      "...sshhhhs......",
      "...shwwwhs......",
      "...shwgqhs......",
      "...shwqqhs......",
      "...shwwwhs......",
      "...shyyyys......",
      "...shyttys......",
      "...shytbys......",
      "...shlbbls......",
      "...shlbdls......",
      "...shk..ks......",
      "...ssk..ss......",
      "................",
      "................",
    ],
    palette: {
      s: "#707d86",
      h: "#56646d",
      w: "#f5f4ef",
      c: "#9f7158",
      g: "#d7c06a",
      q: "#8d7a46",
      y: "#c3d0d8",
      b: "#8c694d",
      t: "#9fd5f1",
      l: "#5c6267",
      k: "#403b42",
    },
  },
];

const publicSpotTypes = [
  {
    id: "pocket-plaza",
    name: "Pocket Plaza",
    shortLabel: "Plaza",
    kind: "public-spot",
    removable: false,
    footprint: { w: 2, h: 1 },
    color: "#7dbd89",
    ambientRole: "gather",
    sprite: [
      "...pppppppppp...",
      "..ppsssssssspp..",
      ".ppssggggggsspp.",
      ".pssggttttggssp.",
      ".pssggttttggssp.",
      ".pssgghhhhggssp.",
      ".pssgghhhhggssp.",
      ".pssggttttggssp.",
      ".pssggttttggssp.",
      ".pssbbbbbbbbssp.",
      ".pssbbbbbbbbssp.",
      ".pssrr....rrssp.",
      ".pssrr....rrssp.",
      "..kk........kk..",
      "..kk........kk..",
      "................",
    ],
    palette: {
      p: "#7dbd89",
      s: "#d9c29b",
      g: "#9ed57d",
      t: "#e8d0a4",
      h: "#c66c72",
      b: "#8a664d",
      r: "#6d4d3d",
      k: "#3f353a",
    },
  },
  {
    id: "fountain-corner",
    name: "Fountain Corner",
    shortLabel: "Fountain",
    kind: "public-spot",
    removable: false,
    footprint: { w: 1, h: 1 },
    color: "#77b9dd",
    ambientRole: "linger",
    sprite: [
      ".....ssss.......",
      "...ssddddss.....",
      "..sddwwwwdds....",
      ".sddwbbbbwdds...",
      ".sddwbccbwdds...",
      "ssdwbcffcbwdss..",
      "ssdwbcffcbwdss..",
      ".sddwbccbwdds...",
      ".sddwbbbbwdds...",
      "..sddwwwwdds....",
      "...ssddddss.....",
      "....tttttt......",
      "...ttmmmmtt.....",
      "...tmmmmmm......",
      "...ttttttt......",
      "................",
    ],
    palette: {
      s: "#d9c59d",
      d: "#bba57d",
      w: "#d8ecff",
      b: "#7aaed8",
      c: "#9ad2f6",
      f: "#eff8ff",
      t: "#71b6df",
      m: "#5f95bb",
    },
  },
  {
    id: "metro-entrance",
    name: "Metro Entrance",
    shortLabel: "Metro",
    kind: "public-spot",
    removable: false,
    footprint: { w: 1, h: 2 },
    color: "#68a7e6",
    ambientRole: "transit",
    sprite: [
      ".....bbbb.......",
      "....bbssbb......",
      "...bbssssbb.....",
      "...bswwwwsb.....",
      "...bswiiwsb.....",
      "...bswwwwsb.....",
      "...bsyyyysb.....",
      "...bsyttysb.....",
      "...bsyttysb.....",
      "...bslddlsb.....",
      "...bslddlsb.....",
      "...kk....kk.....",
      "...rr....rr.....",
      "...rr....rr.....",
      "................",
      "................",
    ],
    palette: {
      b: "#5e96d4",
      s: "#3f5d87",
      w: "#f3f9ff",
      i: "#d94459",
      y: "#b9d6ee",
      t: "#8cc2e8",
      l: "#62758f",
      d: "#425266",
      k: "#2d3848",
      r: "#7e8fa3",
    },
  },
  {
    id: "street-stall",
    name: "Street Stall",
    shortLabel: "Stall",
    kind: "public-spot",
    removable: false,
    footprint: { w: 1, h: 1 },
    color: "#ef9f62",
    ambientRole: "vendor",
    sprite: [
      ".....oooo.......",
      "...oooyyyoo.....",
      "..ooyyoooyyo....",
      "..oyyoooooyyo...",
      "..oyooooooooyo..",
      "..oywwwwwwwwyo..",
      "..oywrrrrrrwyo..",
      "..oywrrrrrrwyo..",
      "..oywttttttwyo..",
      "..oywttttttwyo..",
      "..oywbbbbbbwyo..",
      "..oylbbbbbblyo..",
      "...kk....kk.....",
      "...kk....kk.....",
      "................",
      "................",
    ],
    palette: {
      o: "#d88c4b",
      y: "#ffd45f",
      w: "#fff5df",
      r: "#f06f6f",
      t: "#e9b97b",
      b: "#8d6549",
      l: "#694c3f",
      k: "#403238",
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
      ".....hhhhh......",
      "....hgggggh.....",
      "...hgggggggh....",
      "...ggggggggg....",
      "..hgggggggggh...",
      "...ggggggggg....",
      "....hgggggh.....",
      ".....hgggh......",
      "......ttt.......",
      ".....tttt.......",
      "....tttttt......",
      "...pppppppp.....",
      "...pbbbbbbp.....",
      "...pbbbbbbp.....",
      "...pppppppp.....",
      "................",
    ],
    palette: {
      h: "#97da79",
      g: "#59ad50",
      t: "#8d5b39",
      p: "#c79d6d",
      b: "#8c6942",
    },
  },
];

const structureTypes = [...facilityTypes, ...landmarkTypes, ...publicSpotTypes, ...sceneryTypes];

const npcProfiles = [
  { id: "mika", name: "美佳", shirt: "#ff8aa1", hair: "#5c3d31", accent: "#fff0c5" },
  { id: "taichi", name: "太一", shirt: "#6db8ff", hair: "#48352f", accent: "#f6f3ce" },
  { id: "yuzu", name: "柚子", shirt: "#8edc74", hair: "#6b4c3d", accent: "#fff7d9" },
];

const residentProfiles = [
  {
    id: "aoi",
    name: "葵",
    archetypeId: "student",
    socialAffinity: 0.82,
    appearance: {
      shirt: "#ff8fb7",
      hair: "#5a412f",
      accent: "#fff3c2",
      pants: "#b76487",
      skin: "#f4d8be",
      frame: "short",
      accessory: "ribbon",
    },
    bonds: [{ targetResidentId: "ren", type: "classmate", closeness: 0.9, activeHours: ["morning", "daytime", "evening"] }],
  },
  {
    id: "ren",
    name: "莲",
    archetypeId: "student",
    socialAffinity: 0.76,
    appearance: {
      shirt: "#67a3ff",
      hair: "#39445e",
      accent: "#ffe6a0",
      pants: "#4963b8",
      skin: "#f3d6bb",
      frame: "short",
      accessory: "cap",
    },
    bonds: [{ targetResidentId: "aoi", type: "classmate", closeness: 0.9, activeHours: ["morning", "daytime", "evening"] }],
  },
  {
    id: "misaki",
    name: "美咲",
    archetypeId: "worker",
    socialAffinity: 0.68,
    appearance: {
      shirt: "#ff9b72",
      hair: "#47343c",
      accent: "#ffe2b2",
      pants: "#9d6550",
      skin: "#f0ceb2",
      frame: "broad",
      accessory: "briefcase",
    },
    bonds: [{ targetResidentId: "shu", type: "coworker", closeness: 0.84, activeHours: ["morning", "evening"] }],
  },
  {
    id: "shu",
    name: "修司",
    archetypeId: "worker",
    socialAffinity: 0.64,
    appearance: {
      shirt: "#6ea5ff",
      hair: "#2d3048",
      accent: "#dce7ff",
      pants: "#50638f",
      skin: "#efd0b7",
      frame: "broad",
      accessory: "tie",
    },
    bonds: [{ targetResidentId: "misaki", type: "coworker", closeness: 0.84, activeHours: ["morning", "evening"] }],
  },
  {
    id: "hana",
    name: "花音",
    archetypeId: "family",
    socialAffinity: 0.74,
    appearance: {
      shirt: "#ffb55e",
      hair: "#5a4037",
      accent: "#fff0c9",
      pants: "#bc8240",
      skin: "#f3d5bc",
      frame: "standard",
      accessory: "ribbon",
    },
    bonds: [{ targetResidentId: "toma", type: "couple", closeness: 0.92, activeHours: ["daytime", "evening"] }],
  },
  {
    id: "toma",
    name: "斗真",
    archetypeId: "family",
    socialAffinity: 0.66,
    appearance: {
      shirt: "#63d17d",
      hair: "#4a3a34",
      accent: "#ffe1bb",
      pants: "#4c9a60",
      skin: "#f0d0b4",
      frame: "standard",
      accessory: "scarf",
    },
    bonds: [{ targetResidentId: "hana", type: "couple", closeness: 0.92, activeHours: ["daytime", "evening"] }],
  },
  {
    id: "suzu",
    name: "铃",
    archetypeId: "family",
    socialAffinity: 0.58,
    appearance: {
      shirt: "#ff8ab0",
      hair: "#47354c",
      accent: "#fff1cc",
      pants: "#b26082",
      skin: "#f1d1b6",
      frame: "standard",
      accessory: "ribbon",
    },
    bonds: [{ targetResidentId: "mina", type: "neighbor", closeness: 0.72, activeHours: ["daytime", "evening"] }],
  },
  {
    id: "mina",
    name: "美奈",
    archetypeId: "family",
    socialAffinity: 0.62,
    appearance: {
      shirt: "#8bdc78",
      hair: "#7f5637",
      accent: "#ffe4bf",
      pants: "#5a9950",
      skin: "#f3d6ba",
      frame: "standard",
      accessory: "scarf",
    },
    bonds: [{ targetResidentId: "suzu", type: "neighbor", closeness: 0.72, activeHours: ["daytime", "evening"] }],
  },
];

const incidentActorProfiles = {
  "incident-influencer-rush": [
    { name: "阿镜", role: "探店博主", shirt: "#ff8a73", hair: "#43313d", accent: "#ffd8ae" },
    { name: "小拍", role: "摄影搭档", shirt: "#7ec5ff", hair: "#5b4239", accent: "#fff0c8" },
  ],
  "incident-roadwork-detour": [
    { name: "老周", role: "施工员", shirt: "#ffc94d", hair: "#5b4836", accent: "#ffe5a8" },
    { name: "阿楠", role: "引导员", shirt: "#f28c6b", hair: "#4a3a30", accent: "#fff3bf" },
  ],
  "incident-power-dip": [
    { name: "电务员", role: "抢修员", shirt: "#8fb2ff", hair: "#42374c", accent: "#dbe4ff" },
  ],
  "incident-flash-sale": [
    { name: "店长", role: "促销员", shirt: "#ff7fa4", hair: "#533b33", accent: "#ffe0ef" },
    { name: "招呼娘", role: "揽客员", shirt: "#f6c05b", hair: "#5f4436", accent: "#fff2b8" },
  ],
  "incident-street-performance": [
    { name: "鼓手", role: "街头艺人", shirt: "#7fd9ff", hair: "#413447", accent: "#d7f6ff" },
    { name: "贝斯手", role: "乐手", shirt: "#a68cff", hair: "#4d3a35", accent: "#efe0ff" },
  ],
  "incident-health-inspection": [
    { name: "稽查员", role: "检查官", shirt: "#b7a4ff", hair: "#42343f", accent: "#efe7ff" },
  ],
};

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

const lightweightIncidentDefinitions = [
  {
    id: "influencer-rush",
    title: "探店热潮",
    color: "#ffb36c",
    minDay: 1,
    weight: 1.15,
  },
  {
    id: "roadwork-detour",
    title: "道路施工",
    color: "#f3d36b",
    minDay: 1,
    weight: 0.95,
  },
  {
    id: "power-dip",
    title: "短时停电",
    color: "#9cb4ff",
    minDay: 2,
    weight: 0.82,
  },
  {
    id: "flash-sale",
    title: "限时折扣",
    color: "#ff9dc1",
    minDay: 2,
    weight: 0.92,
  },
  {
    id: "street-performance",
    title: "街头演出",
    color: "#8fd8ff",
    minDay: 2,
    weight: 0.88,
  },
  {
    id: "health-inspection",
    title: "卫生检查",
    color: "#c7b7ff",
    minDay: 3,
    weight: 0.72,
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
  errand: [
    ({ landmarkName, errandLabel }) => `逛完这一趟，先去 ${landmarkName}${errandLabel}。`,
    ({ landmarkName, profileLabel }) => `${profileLabel} 看样子还要去 ${landmarkName} 办点事。`,
  ],
  queue: [
    ({ facilityName }) => `${facilityName} 门口开始排队了，节奏已经起来。`,
    ({ facilityName }) => `${facilityName} 前面有人等着，看来这家是真有人气。`,
  ],
  "queue-thought": [
    ({ facilityName }) => `${facilityName} 队伍有点长，不过这家看着值得等等。`,
    ({ facilityName, profileLabel }) => `${profileLabel} 一边排队一边盯着 ${facilityName}，像是已经下定决心了。`,
    ({ facilityName }) => `${facilityName} 要是再出客快一点，这条队伍就更顺了。`,
  ],
  crowded: [
    ({ facilityName }) => `${facilityName} 门口挤成一团，晚一点再来也许更顺。`,
    ({ facilityName }) => `${facilityName} 这会儿太火了，排队的人已经拐弯。`,
  ],
  incident: [
    ({ incidentTitle }) => `${incidentTitle} 一来，今天街上的节奏一下就变了。`,
    ({ incidentTitle }) => `${incidentTitle} 正在影响街区，得盯着人流重新判断。`,
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

function pickRandom(items) {
  if (!items?.length) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function pickWeightedByWeight(items) {
  if (!items?.length) {
    return null;
  }
  const total = items.reduce((sum, item) => sum + Math.max(0.01, item.weight || 1), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(0.01, item.weight || 1);
    if (cursor <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function getStructureDef(type) {
  return structureTypes.find((item) => item.id === type);
}

function createStructureEntity(type, col, row, id, overrides = {}) {
  const def = getStructureDef(type);
  const structureKind = def.kind || "shop";
  return {
    id,
    type,
    col,
    row,
    width: def.footprint.w,
    height: def.footprint.h,
    kind: structureKind,
    removable: def.removable ?? true,
    level: structureKind === "shop" ? 1 : 0,
    visits: 0,
    queue: [],
    activeServiceId: null,
    peakQueue: 0,
    turnaways: 0,
    patienceLeaves: 0,
    crowdHeat: 0,
    landmarkVisits: 0,
    publicVisits: 0,
    ambientRole: def.ambientRole || null,
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

function getSeedStructureGap(col, row, width, height, structures) {
  if (!structures.length) {
    return 6;
  }
  let bestGap = Number.POSITIVE_INFINITY;
  for (const structure of structures) {
    if (structure.kind === "tree") {
      continue;
    }
    const gapX = Math.max(
      0,
      Math.max(structure.col - (col + width), col - (structure.col + structure.width)),
    );
    const gapY = Math.max(
      0,
      Math.max(structure.row - (row + height), row - (structure.row + structure.height)),
    );
    bestGap = Math.min(bestGap, gapX + gapY);
  }
  return Number.isFinite(bestGap) ? bestGap : 6;
}

function scorePublicSpotPlacement(def, spot, structures) {
  const centerCol = spot.col + (def.footprint.w - 1) / 2;
  const centerRow = spot.row + (def.footprint.h - 1) / 2;
  const townCenterCol = (layout.cols - 1) / 2;
  const centerDistance = Math.abs(centerCol - townCenterCol);
  const gapScore = Math.min(6, getSeedStructureGap(spot.col, spot.row, def.footprint.w, def.footprint.h, structures));
  let score = gapScore * 2 + Math.random() * 0.35;
  switch (def.id) {
    case "pocket-plaza":
      score += 8 - centerDistance * 1.1;
      score += centerRow >= streetLayout.southLotRows.min ? 2.8 : 0.6;
      break;
    case "fountain-corner":
      score += 7 - centerDistance * 0.95;
      score += spot.row === streetLayout.southLotRows.min || spot.row === streetLayout.northLotRows.max ? 2.4 : 0.5;
      break;
    case "metro-entrance": {
      const bandDistance = Math.min(
        Math.abs(centerCol - (streetLayout.verticalBand.min - 0.5)),
        Math.abs(centerCol - (streetLayout.verticalBand.max + 0.5)),
      );
      score += centerRow >= streetLayout.southLotRows.min ? 5.5 : -2.5;
      score += 5.4 - bandDistance * 1.2;
      break;
    }
    case "street-stall":
      score += 6.5 - Math.abs(centerDistance - 2.5) * 1.15;
      score += spot.row === streetLayout.southLotRows.min || spot.row === streetLayout.northLotRows.max ? 2 : 0.5;
      break;
    default:
      break;
  }
  return score;
}

function pickBestSeedSpot(grid, def, structures, scorer = null) {
  const candidates = getTownLotPlacementCandidates(def.footprint.w, def.footprint.h).filter((spot) =>
    canOccupyTiles(grid, spot.col, spot.row, def.footprint.w, def.footprint.h),
  );
  if (!candidates.length) {
    return null;
  }
  if (!scorer) {
    return shuffleArray(candidates)[0] || null;
  }
  return (
    [...candidates].sort(
      (left, right) =>
        scorer(right, structures) - scorer(left, structures),
    )[0] || candidates[0]
  );
}

function seedStartingStructures(grid) {
  const structures = [];
  let nextId = 1;
  const landmarkPool = shuffleArray(landmarkTypes);
  for (const landmarkDef of landmarkPool) {
    const spot = pickBestSeedSpot(grid, landmarkDef, structures);
    if (!spot) {
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
  }

  for (const publicSpotDef of shuffleArray(publicSpotTypes)) {
    const spot = pickBestSeedSpot(
      grid,
      publicSpotDef,
      structures,
      (candidate, currentStructures) =>
        scorePublicSpotPlacement(publicSpotDef, candidate, currentStructures),
    );
    if (!spot) {
      continue;
    }
    const publicSpot = createStructureEntity(
      publicSpotDef.id,
      spot.col,
      spot.row,
      nextId,
    );
    nextId += 1;
    occupyStructureOnGrid(grid, publicSpot);
    structures.push(publicSpot);
  }

  const treeCount = Math.min(5, getTreePlanterCandidates().length);
  for (const tile of shuffleArray(getTreePlanterCandidates())) {
    if (structures.filter((item) => item.kind === "tree").length >= treeCount) {
      break;
    }
    if (!canOccupyTiles(grid, tile.col, tile.row, 1, 1)) {
      continue;
    }
    if (!isTownWalkwayTile(tile.col, tile.row)) {
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

function isActorWalkableTile(col, row, facilities) {
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) {
    return false;
  }
  if (!isTownWalkwayTile(col, row)) {
    return false;
  }
  return !facilities.some(
    (facility) =>
      col >= facility.col &&
      col < facility.col + facility.width &&
      row >= facility.row &&
      row < facility.row + facility.height,
  );
}

function collectWalkableTiles(
  range = { min: 0, max: layout.cols - 1 },
  rowMin = 0,
  rowMax = layout.rows - 1,
  facilities = [],
) {
  const tiles = [];
  for (let row = rowMin; row <= rowMax; row += 1) {
    for (let col = range.min; col <= range.max; col += 1) {
      if (isActorWalkableTile(col, row, facilities)) {
        tiles.push({ col, row });
      }
    }
  }
  return tiles;
}

function getIncidentAnchorRange(incident, facilities) {
  if (incident.zoneRange) {
    return incident.zoneRange;
  }
  if (incident.featuredType) {
    const target = facilities
      .filter((facility) => facility.type === incident.featuredType)
      .sort((a, b) => getFacilityPopularity(b) - getFacilityPopularity(a))[0];
    if (target) {
      return {
        min: Math.max(0, target.col - 2),
        max: Math.min(layout.cols - 1, target.col + target.width + 2),
      };
    }
  }
  return { min: 0, max: layout.cols - 1 };
}

function getIncidentAnchorRow(incident, facilities) {
  const relevant = facilities.filter((facility) => {
    if (facility.kind !== "shop") {
      return false;
    }
    if (incident.featuredType) {
      return facility.type === incident.featuredType;
    }
    if (incident.zoneRange) {
      const centerCol = facility.col + facility.width / 2;
      return centerCol >= incident.zoneRange.min && centerCol <= incident.zoneRange.max;
    }
    return true;
  });
  if (!relevant.length) {
    return Math.max(3, layout.rows - 4);
  }
  const averageRow =
    relevant.reduce((sum, facility) => sum + facility.row + facility.height, 0) /
    relevant.length;
  return Math.max(2, Math.min(layout.rows - 2, Math.round(averageRow)));
}

function buildEventActorRoute(incident, facilities, offset = 0) {
  const range = getIncidentAnchorRange(incident, facilities);
  const anchorRow = getIncidentAnchorRow(incident, facilities);
  let candidates = collectWalkableTiles(
    range,
    Math.max(2, anchorRow - 1),
    Math.min(layout.rows - 2, anchorRow + 2),
    facilities,
  );
  if (!candidates.length) {
    candidates = collectWalkableTiles(
      range,
      Math.max(2, anchorRow - 3),
      Math.min(layout.rows - 2, anchorRow + 3),
      facilities,
    );
  }
  if (!candidates.length) {
    candidates = collectWalkableTiles(range, 2, layout.rows - 3, facilities);
  }
  if (!candidates.length) {
    return [];
  }
  const startIndex = (offset * 3) % candidates.length;
  const route = [];
  for (let index = 0; index < 3; index += 1) {
    const tile = candidates[(startIndex + index * Math.max(1, Math.floor(candidates.length / 3))) % candidates.length];
    if (!tile) {
      continue;
    }
    const center = getTileCenter(tile.col, tile.row);
    route.push({ ...center, col: tile.col, row: tile.row });
  }
  return route;
}

function createIncidentActors(incidents, facilities) {
  const actors = [];
  for (const incident of incidents) {
    const profiles = incidentActorProfiles[incident.id] || [];
    profiles.forEach((profile, index) => {
      const route = buildEventActorRoute(incident, facilities, index);
      if (!route.length) {
        return;
      }
      actors.push({
        id: `${incident.id}-actor-${index}`,
        incidentId: incident.id,
        incidentTitle: incident.title,
        role: profile.role,
        name: profile.name,
        shirt: profile.shirt,
        hair: profile.hair,
        accent: profile.accent,
        x: route[0].x,
        y: route[0].y,
        route,
        routeIndex: route.length > 1 ? 1 : 0,
        targetX: route.length > 1 ? route[1].x : route[0].x,
        targetY: route.length > 1 ? route[1].y : route[0].y,
        speed: 22 + index * 4,
        bobPhase: index * 0.9 + Math.random() * 0.6,
        talkTimer: 2.4 + Math.random() * 1.8,
        interactionTimer: 1.8 + Math.random() * 1.4,
        interactionRadius: incident.id === "incident-street-performance" ? 96 : 72,
        focusVisitorId: null,
        focusTtl: 0,
      });
    });
  }
  return actors;
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

function getQuarterId(calendar) {
  return `Y${calendar.year}-${calendar.seasonId}`;
}

function createQuarterStatsState(calendar) {
  return {
    id: getQuarterId(calendar),
    year: calendar.year,
    seasonId: calendar.seasonId,
    seasonLabel: quarterSeasonLabels[calendar.seasonId] || calendar.seasonName || "本季",
    startDayOfYear: calendar.dayOfYear,
    revenue: 0,
    visitorsServed: 0,
    facilityVisits: {},
    landmarkVisits: {},
    publicSpotVisits: {},
    notableEvents: [],
    notableEventKeys: {},
    notes: [],
    noteKeys: {},
  };
}

function incrementQuarterCounter(bucket, key, amount = 1) {
  if (!bucket || !key) {
    return;
  }
  bucket[key] = (bucket[key] || 0) + amount;
}

function recordQuarterEvent(text, key = text) {
  if (!state?.quarterStats || !text) {
    return;
  }
  if (state.quarterStats.notableEventKeys[key]) {
    return;
  }
  state.quarterStats.notableEventKeys[key] = true;
  state.quarterStats.notableEvents.push(text);
  state.quarterStats.notableEvents = state.quarterStats.notableEvents.slice(0, 8);
}

function recordQuarterNote(text, key = text) {
  if (!state?.quarterStats || !text) {
    return;
  }
  if (state.quarterStats.noteKeys[key]) {
    return;
  }
  state.quarterStats.noteKeys[key] = true;
  state.quarterStats.notes.push(text);
  state.quarterStats.notes = state.quarterStats.notes.slice(0, 8);
}

function getTopQuarterEntry(bucket) {
  const entries = Object.entries(bucket || {});
  if (!entries.length) {
    return null;
  }
  const [name, value] = [...entries].sort((left, right) => right[1] - left[1])[0];
  return { name, value };
}

function buildQuarterReport(stats) {
  const topFacility = getTopQuarterEntry(stats.facilityVisits);
  const topLandmark = getTopQuarterEntry(stats.landmarkVisits);
  const topPublicSpot = getTopQuarterEntry(stats.publicSpotVisits);
  const storyLine =
    stats.notes[0] ||
    (topPublicSpot
      ? `${topPublicSpot.name} 附近开始形成固定停留人流。`
      : topLandmark
        ? `${topLandmark.name} 成了这季最常被观察到的默认建筑。`
        : topFacility
          ? `${topFacility.name} 是这季最容易吸住顾客视线的店。`
          : "这一季的街区还在热身，但已经开始有自己的节奏。");
  const highlights = [
    {
      title: "季度大事",
      text:
        stats.notableEvents[0] ||
        `这季整体平稳推进，${stats.seasonLabel} 的街区气氛逐渐成型。`,
      accent: "#ffd97a",
    },
    {
      title: "最热店铺",
      text: topFacility
        ? `${topFacility.name} 本季接待 ${topFacility.value} 次，已经成了街面焦点。`
        : "这季还没有形成明确的热店，像是在等第一家真正爆红的门脸。",
      accent: "#ffb17d",
    },
    {
      title: "观察趣闻",
      text: topPublicSpot
        ? `${topPublicSpot.name} 一带出现了 ${topPublicSpot.value} 次驻足停留，路人会在那里多看两眼。`
        : topLandmark
          ? `${topLandmark.name} 本季被居民光顾 ${topLandmark.value} 次，默认建筑终于开始带动街区日常。`
          : storyLine,
      accent: "#8fd3ff",
    },
  ];
  return {
    id: stats.id,
    title: `${stats.year}年 ${stats.seasonLabel} 小镇报表`,
    seasonLabel: stats.seasonLabel,
    metrics: {
      revenue: stats.revenue,
      visitorsServed: stats.visitorsServed,
      topFacility: topFacility?.name || "暂无",
      topLandmark: topLandmark?.name || "暂无",
      topPublicSpot: topPublicSpot?.name || "暂无",
    },
    highlights,
    storyLine,
    ctaLabel: "进入下一季",
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

function makeFacilityBonusMap(typeIds, effect) {
  return typeIds.reduce((result, typeId) => {
    result[typeId] = { ...effect };
    return result;
  }, {});
}

function getFacilityZoneLabel(zoneId) {
  switch (zoneId) {
    case "left":
      return "西侧街区";
    case "right":
      return "东侧街区";
    default:
      return "中央街区";
  }
}

function pickIncidentZone(facilities) {
  if (!facilities.length) {
    return {
      zoneId: "center",
      label: getFacilityZoneLabel("center"),
      range: { min: 4, max: 9 },
    };
  }
  const counts = {
    left: 0,
    center: 0,
    right: 0,
  };
  for (const facility of facilities) {
    const centerCol = facility.col + facility.width / 2;
    if (centerCol < layout.cols / 3) {
      counts.left += 1;
    } else if (centerCol > (layout.cols * 2) / 3) {
      counts.right += 1;
    } else {
      counts.center += 1;
    }
  }
  const zoneId =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "center";
  if (zoneId === "left") {
    return { zoneId, label: getFacilityZoneLabel(zoneId), range: { min: 0, max: 4 } };
  }
  if (zoneId === "right") {
    return { zoneId, label: getFacilityZoneLabel(zoneId), range: { min: 9, max: layout.cols - 1 } };
  }
  return { zoneId, label: getFacilityZoneLabel(zoneId), range: { min: 4, max: 9 } };
}

function normalizeIncidentDebugId(raw) {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^incident-/, "");
  return lightweightIncidentDefinitions.some((incident) => incident.id === normalized)
    ? normalized
    : null;
}

function buildLightweightIncident(day, season, weather, facilities, forcedIncidentId = null) {
  const available = lightweightIncidentDefinitions.filter((incident) => day >= incident.minDay);
  if (!available.length) {
    return [];
  }
  const normalizedForcedIncidentId = normalizeIncidentDebugId(forcedIncidentId);
  let picked =
    (normalizedForcedIncidentId &&
      lightweightIncidentDefinitions.find((incident) => incident.id === normalizedForcedIncidentId)) ||
    null;
  if (!picked) {
    const triggerChance = day <= 2 ? 0.46 : 0.6;
    if (Math.random() > triggerChance) {
      return [];
    }
    picked = pickWeighted(
      available.map((incident) => ({ ...incident, chance: incident.weight })),
      "chance",
    );
  }
  if (!picked) {
    return [];
  }

  if (picked.id === "influencer-rush") {
    const featuredType =
      facilities
        .filter((facility) => facility.kind === "shop")
        .sort((a, b) => getFacilityPopularity(b) - getFacilityPopularity(a))[0]?.type ||
      (season.id === "summer" ? "snack" : season.id === "winter" ? "bath" : "park") ||
      "snack";
    const featuredName = getFacilityDef(featuredType)?.name || "热门店";
    return [
      {
        id: "incident-influencer-rush",
        type: "incident",
        title: "探店热潮",
        color: picked.color,
        description: `本地博主把镜头对准了 ${featuredName}，相关客流正在快速聚集。`,
        trafficModifier: 1.14,
        facilityBonuses: {
          [featuredType]: { income: 2, rating: 1, pop: 5 },
        },
        featuredType,
      },
    ];
  }

  if (picked.id === "flash-sale") {
    const promoPool = ["snack", "arcade", "bath"].filter((typeId) =>
      facilities.some((facility) => facility.type === typeId),
    );
    const featuredType =
      promoPool[Math.floor(Math.random() * promoPool.length)] ||
      (season.id === "summer" ? "snack" : season.id === "winter" ? "bath" : "arcade");
    const featuredName = getFacilityDef(featuredType)?.name || "热门店";
    return [
      {
        id: "incident-flash-sale",
        type: "incident",
        title: "限时折扣",
        color: picked.color,
        description: `${featuredName} 挂出了限时折扣牌，顾客更愿意在门口多等一会儿。`,
        trafficModifier: 1.08,
        facilityBonuses: {
          [featuredType]: { income: 2, rating: 1, pop: 6 },
        },
        queuePatienceMultipliers: {
          [featuredType]: 1.26,
        },
        featuredType,
      },
    ];
  }

  if (picked.id === "roadwork-detour") {
    const zone = pickIncidentZone(facilities.filter((facility) => facility.kind === "shop"));
    return [
      {
        id: "incident-roadwork-detour",
        type: "incident",
        title: "道路施工",
        color: picked.color,
        description: `${zone.label} 正在施工，顾客会下意识绕开这一带。`,
        trafficModifier: 0.93,
        zoneId: zone.zoneId,
        zoneLabel: zone.label,
        zoneRange: zone.range,
      },
    ];
  }

  if (picked.id === "street-performance") {
    const zone = pickIncidentZone(facilities.filter((facility) => facility.kind === "shop"));
    return [
      {
        id: "incident-street-performance",
        type: "incident",
        title: "街头演出",
        color: picked.color,
        description: `${zone.label} 有乐队开始演出，人流会自然往这一带聚。`,
        trafficModifier: 1.09,
        zoneId: zone.zoneId,
        zoneLabel: zone.label,
        zoneRange: zone.range,
        zonePreferenceDelta: 6,
        queuePatienceZoneMultiplier: 1.12,
      },
    ];
  }

  if (picked.id === "health-inspection") {
    const checkedTypes = ["snack", "bath", "arcade"].filter((typeId) =>
      facilities.some((facility) => facility.type === typeId),
    );
    const checkedType =
      checkedTypes[Math.floor(Math.random() * checkedTypes.length)] || "snack";
    const checkedName = getFacilityDef(checkedType)?.name || "店铺";
    return [
      {
        id: "incident-health-inspection",
        type: "incident",
        title: "卫生检查",
        color: picked.color,
        description: `${checkedName} 正在做卫生检查，接客节奏会慢下来，排队顾客也更容易不耐烦。`,
        trafficModifier: 0.97,
        facilityBonuses: {
          [checkedType]: { income: -1, pop: -3 },
        },
        serviceMultipliers: {
          [checkedType]: 1.34,
        },
        queuePatienceMultipliers: {
          [checkedType]: 0.82,
        },
        queueDrainMultipliers: {
          [checkedType]: 1.2,
        },
        featuredType: checkedType,
      },
    ];
  }

  return [
    {
      id: "incident-power-dip",
      type: "incident",
      title: "短时停电",
      color: picked.color,
      description: `${weather.label} 天里电力不稳，娱乐与大设施的接客节奏放慢了。`,
      trafficModifier: 0.96,
      facilityBonuses: {
        arcade: { income: -1, pop: -2 },
        tower: { income: -2, pop: -3 },
        bath: { income: -1, pop: -1 },
      },
      serviceMultipliers: {
        arcade: 1.36,
        tower: 1.42,
        bath: 1.18,
      },
    },
  ];
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

function buildWorld(day, previousWorld = null, facilities = [], forcedIncidentId = null) {
  const calendar = buildCalendar(day);
  const season = seasonDefinitions.find(
    (item) => item.id === calendar.seasonId,
  ) || seasonDefinitions[0];
  const weather = buildWeather(season.id);
  const activeFestival = getActiveFestival(calendar);
  const festivalEvent = activeFestival ? buildFestivalEvent(activeFestival) : null;
  const incidentQueue = buildLightweightIncident(
    day,
    season,
    weather,
    facilities,
    forcedIncidentId,
  );
  return {
    calendar,
    season,
    weather,
    activeFestival,
    upcomingFestival: getUpcomingFestival(calendar.dayOfYear),
    eventQueue: festivalEvent ? [festivalEvent] : [],
    incidentQueue,
  };
}

function getTrafficPhaseDuration(phase) {
  switch (phase) {
    case "walk":
      return streetLayout.signalCycle.walk;
    case "blink":
      return streetLayout.signalCycle.blink;
    default:
      return streetLayout.signalCycle.drive;
  }
}

function getNextTrafficPhase(phase) {
  switch (phase) {
    case "walk":
      return "blink";
    case "blink":
      return "drive";
    default:
      return "walk";
  }
}

function createTrafficSignalState(phase = "walk") {
  return {
    phase,
    timer: getTrafficPhaseDuration(phase),
  };
}

function getRoadTrafficScale() {
  return state.timeOfDay.id === "midnight" ? 0.45 : state.timeOfDay.id === "evening" ? 0.8 : 1;
}

function getRoadVehicleLength(type, scale) {
  switch (type) {
    case "bus":
      return scale * 18;
    case "truck":
      return scale * 14;
    default:
      return scale * 14;
  }
}

function createRoadTrafficVehicles(debugMode = null) {
  const vehicles = roadTrafficConfigs.map((config, index) => ({
    id: config.id,
    type: config.type,
    dir: config.dir,
    scale: config.scale,
    palette: config.palette,
    speed: config.speed,
    y: typeof config.y === "function" ? config.y() : config.y,
    x: typeof config.startX === "function" ? config.startX() : config.startX,
    stopped: false,
    stopBounce: index * 0.4,
  }));
  if (debugMode === "stop" || debugMode === "drive") {
    for (const vehicle of vehicles) {
      const stopLine = getRoadVehicleStopLineX(vehicle);
      if (debugMode === "stop") {
        vehicle.x = stopLine;
        vehicle.stopped = true;
      } else {
        vehicle.x = vehicle.dir > 0 ? stopLine + 72 : stopLine - 72;
        vehicle.stopped = false;
      }
    }
  }
  return vehicles;
}

function getRoadVehicleStopLineX(vehicle) {
  const bounds = getBottomCrosswalkBounds();
  const length = getRoadVehicleLength(vehicle.type, vehicle.scale);
  if (vehicle.dir > 0) {
    return bounds.x - 26 - length;
  }
  return bounds.x + bounds.w + 26;
}

function canPedestriansCrossRoad() {
  return state.trafficSignal.phase === "walk" || state.trafficSignal.phase === "blink";
}

function getBottomCrosswalkBounds() {
  const leftPos = tileToScreen(streetLayout.crosswalkCols[0], layout.rows - 1);
  const rightPos = tileToScreen(
    streetLayout.crosswalkCols[streetLayout.crosswalkCols.length - 1],
    layout.rows - 1,
  );
  return {
    x: leftPos.x + 8,
    w: rightPos.x + layout.tile - leftPos.x - 18,
    curbY: layout.gridY + layout.rows * layout.tile - 8,
  };
}

function shouldPauseForTrafficSignal(visitor) {
  if (canPedestriansCrossRoad()) {
    return false;
  }
  if (visitor.phase === "to-grid") {
    return visitor.y > getBottomCrosswalkBounds().curbY - 2;
  }
  if (visitor.phase === "leaving-road") {
    return visitor.y < getBottomCrosswalkBounds().curbY + 6;
  }
  return false;
}

function updateRoadTraffic(delta) {
  const roadLeft = -220;
  const roadRight = layout.sidebarX + 220;
  const carRedLight = state.trafficSignal.phase === "walk" || state.trafficSignal.phase === "blink";
  const trafficScale = getRoadTrafficScale();
  for (const vehicle of state.roadTrafficVehicles) {
    vehicle.y = roadTrafficConfigs.find((config) => config.id === vehicle.id)?.y?.() ?? vehicle.y;
    const step = vehicle.speed * trafficScale * delta;
    const stopLine = getRoadVehicleStopLineX(vehicle);
    if (carRedLight) {
      if (vehicle.dir > 0 && vehicle.x < stopLine && vehicle.x + step >= stopLine) {
        vehicle.x = stopLine;
        vehicle.stopped = true;
        continue;
      }
      if (vehicle.dir < 0 && vehicle.x > stopLine && vehicle.x - step <= stopLine) {
        vehicle.x = stopLine;
        vehicle.stopped = true;
        continue;
      }
      if (vehicle.stopped) {
        continue;
      }
    } else if (vehicle.stopped) {
      vehicle.stopped = false;
    }

    vehicle.x += vehicle.dir * step;
    const vehicleLength = getRoadVehicleLength(vehicle.type, vehicle.scale);
    if (vehicle.dir > 0 && vehicle.x > roadRight) {
      vehicle.x = roadLeft - vehicleLength - Math.random() * 140;
      vehicle.stopped = false;
    } else if (vehicle.dir < 0 && vehicle.x < roadLeft - vehicleLength) {
      vehicle.x = roadRight + Math.random() * 140;
      vehicle.stopped = false;
    }
  }
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
  const frontCloudOpacity =
    state.world.weather.id === "drizzle"
      ? 0.42
      : state.world.weather.id === "cloudy"
        ? 0.48
        : state.world.weather.id === "snow"
          ? 0.28
          : 0.34;
  const backCloudOpacity =
    state.world.weather.id === "drizzle"
      ? 0.3
      : state.world.weather.id === "cloudy"
        ? 0.36
        : state.world.weather.id === "snow"
          ? 0.22
          : 0.24;
  const rainOpacity = state.world.weather.id === "drizzle" ? 0.32 : 0;
  document.documentElement.style.setProperty(
    "--page-cloud-opacity-front",
    String(frontCloudOpacity),
  );
  document.documentElement.style.setProperty(
    "--page-cloud-opacity-back",
    String(backCloudOpacity),
  );
  document.documentElement.style.setProperty("--page-rain-opacity", String(rainOpacity));
}

function createInitialState() {
  const initialRating = 12;
  const initialDay = 1;
  const initialHour = 8;
  const initialGrid = createGrid();
  const seededMap = seedStartingStructures(initialGrid);
  const initialWorld = buildWorld(
    initialDay,
    null,
    seededMap.structures,
    initialDebugIncidentId,
  );
  const initialQuarterStats = createQuarterStatsState(initialWorld.calendar);
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
    streetPickups: [],
    floaters: [],
    messages: ["点击开始经营，做出一条热闹的商店街。"],
    nextVisitorId: 1,
    nextFacilityId: seededMap.nextId,
    nextPickupId: 1,
    spawnTimer: simulationTuning.initialSpawnDelay,
    pickupSpawnTimer: 4.6,
    dayTimer: 0,
    lastCombo: "暂无",
    hoveredTile: null,
    cameraPulse: 0,
    comboCount: 0,
    servedVisitors: 0,
    lifetimeIncome: 0,
    todayTrend: buildTrend(initialRating, initialDay),
    dailyLandmarkStats: {},
    landmarkSpotlights: [],
    dailyLandmarkSpotlightIds: {},
    observerNotes: ["观察记录：先盯住默认建筑的人来人往，再看整条街怎么被带动。"],
    quarterStats: initialQuarterStats,
    quarterReport: null,
    goals: goalDefinitions.map((goal) => ({
      ...goal,
      completed: false,
    })),
    winCelebrated: false,
    finalePlaceholderUnlocked: false,
    world: initialWorld,
    npcs: createNPCs(),
    eventActors: createIncidentActors(initialWorld.incidentQueue, seededMap.structures),
    trafficSignal: createTrafficSignalState(initialDebugTrafficMode === "drive" ? "drive" : "walk"),
    roadTrafficVehicles: createRoadTrafficVehicles(initialDebugTrafficMode),
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
    debug: {
      forcedIncidentId: initialDebugIncidentId,
      trafficMode: initialDebugTrafficMode,
    },
    announcedUnlocks: facilityTypes
      .filter((def) => def.unlockAt <= 0)
      .map((def) => def.id),
  };
}

function resetGame() {
  const preservedForcedIncidentId = state.debug?.forcedIncidentId || null;
  const fresh = createInitialState();
  fresh.debug.forcedIncidentId = preservedForcedIncidentId || initialDebugIncidentId;
  fresh.world = buildWorld(
    fresh.day,
    null,
    fresh.facilities,
    fresh.debug.forcedIncidentId,
  );
  fresh.eventActors = createIncidentActors(fresh.world.incidentQueue, fresh.facilities);
  Object.assign(state, fresh);
  render();
}

function rebuildWorldForCurrentDay() {
  state.world = buildWorld(
    state.day,
    state.world,
    state.facilities,
    state.debug?.forcedIncidentId || null,
  );
  state.eventActors = createIncidentActors(state.world.incidentQueue, state.facilities);
}

function applyDebugIncident(incidentId = null) {
  const normalized = incidentId ? normalizeIncidentDebugId(incidentId) : null;
  if (incidentId && !normalized) {
    return null;
  }
  state.debug.forcedIncidentId = normalized;
  rebuildWorldForCurrentDay();
  if (normalized && state.world.incidentQueue[0]) {
    const incident = state.world.incidentQueue[0];
    pushMessage(`调试事件已锁定：${incident.title}。`);
    setEnvironmentNotice(`调试事件：${incident.title} 已强制生效。`, incident.color, 4.2);
    if (state.mode === "play" && state.eventActors[0]) {
      triggerEventActorDialogue(state.eventActors[0], true);
    }
  } else {
    pushMessage("已恢复随机事件刷新。");
    setEnvironmentNotice("随机事件已恢复默认刷新。", "#ffe7a3", 3.4);
  }
  syncShellTheme();
  render();
  return state.world.incidentQueue[0]?.id || null;
}

function refreshIncidentQueueForCurrentFacilities() {
  const forcedIncidentId = state.debug?.forcedIncidentId || null;
  const currentIncidentId =
    state.world.incidentQueue[0]?.id?.replace(/^incident-/, "") || null;
  const nextIncidentId = forcedIncidentId || currentIncidentId;
  if (!nextIncidentId) {
    return;
  }
  state.world.incidentQueue = buildLightweightIncident(
    state.day,
    state.world.season,
    state.world.weather,
    state.facilities,
    nextIncidentId,
  );
  state.eventActors = createIncidentActors(state.world.incidentQueue, state.facilities);
}

function startGame() {
  if (state.mode === "play") {
    return;
  }
  state.mode = "play";
  state.eventActors = createIncidentActors(state.world.incidentQueue, state.facilities);
  pushMessage("小镇开张，第一批顾客正在路上。");
  if (state.world.activeFestival) {
    pushMessage(`${state.world.activeFestival.name} 正在举办，街区今天会更热闹。`);
    setEnvironmentNotice(
      `${state.world.activeFestival.name}：${state.world.activeFestival.description}`,
      state.world.activeFestival.color,
      4.8,
    );
  }
  if (state.world.incidentQueue.length) {
    const incident = state.world.incidentQueue[0];
    pushMessage(`${incident.title}：${incident.description}`);
    setEnvironmentNotice(`${incident.title}：${incident.description}`, incident.color, 4.6);
    triggerDialogue("incident", { incidentTitle: incident.title }, { chance: 0.24 });
    if (state.eventActors[0]) {
      triggerEventActorDialogue(state.eventActors[0], true);
    }
  }
  syncButtons();
}

function pushMessage(text) {
  state.messages.unshift(text);
  state.messages = state.messages.slice(0, 5);
}

function openQuarterReport(report) {
  state.quarterReport = {
    ...report,
    ttl: 20,
  };
  state.selectedType = null;
  state.activeDialogue = null;
  setEnvironmentNotice(`${report.seasonLabel} 季报出炉，先看看这季街区发生了什么。`, "#ffe39f", 5);
}

function closeQuarterReport() {
  state.quarterReport = null;
}

function noteLandmarkVisit(landmark) {
  if (!landmark) {
    return;
  }
  const current = state.dailyLandmarkStats[landmark.id] || {
    facilityId: landmark.id,
    type: landmark.type,
    name: getStructureDef(landmark.type)?.name || "默认建筑",
    visits: 0,
  };
  current.visits += 1;
  state.dailyLandmarkStats[landmark.id] = current;
}

function getLandmarkRoutineScale(landmarkType) {
  const dailyVisits = Object.values(state.dailyLandmarkStats || {})
    .filter((item) => item.type === landmarkType)
    .reduce((sum, item) => sum + item.visits, 0);
  return Math.min(2.4, dailyVisits * 0.45);
}

function maybeActivateLandmarkSpotlight(landmark) {
  const rhythm = landmarkRhythmDefinitions[landmark.type];
  if (!rhythm) {
    return;
  }
  const dailyVisits = state.dailyLandmarkStats[landmark.id]?.visits || 0;
  for (const threshold of rhythm.thresholds) {
    const key = `${landmark.id}:${threshold}`;
    if (dailyVisits < threshold || state.dailyLandmarkSpotlightIds[key]) {
      continue;
    }
    state.dailyLandmarkSpotlightIds[key] = true;
    const spotlight = {
      id: key,
      landmarkType: landmark.type,
      landmarkId: landmark.id,
      title: rhythm.title,
      description: rhythm.description,
      color: rhythm.color,
      threshold,
    };
    state.landmarkSpotlights.unshift(spotlight);
    state.landmarkSpotlights = state.landmarkSpotlights.slice(0, 3);
    pushMessage(`${getStructureDef(landmark.type)?.name || "默认建筑"}：${rhythm.title}`);
    setEnvironmentNotice(`${rhythm.title}，${rhythm.description}`, rhythm.color, 4.2);
  }
}

function getLandmarkActivityRows(limit = 3) {
  const rows = Object.values(state.dailyLandmarkStats || {})
    .sort((left, right) => {
      if (right.visits !== left.visits) {
        return right.visits - left.visits;
      }
      const leftTotal = getFacilityById(left.facilityId)?.landmarkVisits || 0;
      const rightTotal = getFacilityById(right.facilityId)?.landmarkVisits || 0;
      return rightTotal - leftTotal;
    })
    .slice(0, limit)
    .map((item) => {
      const total = getFacilityById(item.facilityId)?.landmarkVisits || item.visits;
      return `${item.name} 今日 ${item.visits} / 累计 ${total}`;
    });
  return rows.length ? rows : ["今天默认建筑还没接到明显办事人流。"];
}

function getObserverSnapshot() {
  const activeRoutine = Object.values(state.dailyLandmarkStats || {}).sort(
    (left, right) => right.visits - left.visits,
  )[0];
  const busiestFacility = getBusiestFacility();
  if (activeRoutine && busiestFacility) {
    return `观察记录：${activeRoutine.name} 今天最忙，${getFacilityDef(busiestFacility.type).name} 也在跟着吃人流。`;
  }
  if (activeRoutine) {
    return `观察记录：${activeRoutine.name} 今天最活跃，街上的办事节奏已经成形。`;
  }
  if (busiestFacility) {
    return `观察记录：${getFacilityDef(busiestFacility.type).name} 是当前街区热点，小镇还在缓慢长出自己的习惯。`;
  }
  return "观察记录：今天街区还在热身，更多变化会在建筑和人流里慢慢出现。";
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
    for (const [landmarkType, rhythm] of Object.entries(landmarkRhythmDefinitions)) {
      const bias = rhythm.profileBias?.[profile.id] || 0;
      if (bias) {
        weight += bias * getLandmarkRoutineScale(landmarkType);
      }
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
      visitor.phase === "errand-going" ||
      visitor.phase === "entering" ||
      visitor.phase === "landmark-entering" ||
      visitor.phase === "queueing" ||
      visitor.phase === "queue-wait" ||
      visitor.phase === "leaving",
  );
  if (!candidates.length) {
    return;
  }
  const weighted = candidates.map((visitor) => ({
    visitor,
    weight:
      visitor.phase === "queueing" || visitor.phase === "queue-wait"
        ? 3.1
        : visitor.phase === "leaving"
          ? 1.1
          : 1.6,
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  let visitor = weighted[0].visitor;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      visitor = item.visitor;
      break;
    }
  }
  const facility = getFacilityById(visitor.targetFacilityId);
  const facilityName = facility ? getFacilityDef(facility.type).name : "店铺";
  const profileLabel = visitor.profileLabel || "顾客";
  const speakerName = getVisitorDisplayName(visitor);
  const lines =
    visitor.phase === "queueing" || visitor.phase === "queue-wait"
      ? [
          `${facilityName} 前面已经有人了，不过这家看起来值得等等。`,
          `${speakerName} 排着队也在看招牌，感觉这家店口碑不差。`,
          `这条队伍排得还算整齐，就看 ${facilityName} 出客快不快了。`,
        ]
      : visitor.phase === "errand-going" || visitor.phase === "landmark-entering"
        ? [
            `${speakerName} 正往 ${getStructureDef(visitor.errandLandmarkType || visitor.originLandmarkType)?.name || "默认建筑"} 那边走，像是还有事要办。`,
            `先逛店，再去 ${getStructureDef(visitor.errandLandmarkType || visitor.originLandmarkType)?.name || "默认建筑"}，这趟路线挺像小镇日常。`,
          ]
      : visitor.phase === "leaving"
        ? [
            `${speakerName} 逛完这一圈差不多了，下次再看看街区会不会更热闹。`,
            `${state.world.season.label} 的街景看够了，今天这趟算没白来。`,
          ]
        : [
            `${speakerName} 今天碰上 ${state.world.weather.label}，出来逛街正合适。`,
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
    state.activeDialogue.speakerName = speakerName;
    state.dialogueFeed[0].speakerName = speakerName;
    state.dialogueFeed[0].text = state.activeDialogue.text;
  }
}

function setVisitorEmote(visitor, type, ttl = 1.1 + Math.random() * 0.6) {
  if (!visitor) {
    return;
  }
  visitor.emote = { type, ttl };
  visitor.emoteCooldown = 1.2 + Math.random() * 1.6;
}

function pickQueueEmote(visitor, facility) {
  const patienceRatio = Math.max(0, Math.min(1, visitor.queuePatience / 10));
  if (patienceRatio < 0.24) {
    return Math.random() < 0.68 ? "anger" : "sweat";
  }
  if (patienceRatio < 0.48) {
    return Math.random() < 0.55 ? "sweat" : "dots";
  }
  if (profileIsVisitorFavorite(visitor, facility.type)) {
    return Math.random() < 0.5 ? "heart" : "note";
  }
  return Math.random() < 0.5 ? "dots" : "star";
}

function maybeTriggerQueueReaction(visitor, facility, dialogueChance = 0.22) {
  if (!visitor || !facility) {
    return;
  }
  if ((visitor.emoteCooldown || 0) <= 0) {
    setVisitorEmote(visitor, pickQueueEmote(visitor, facility));
  }
  if (state.dialogueCooldown <= 0 && Math.random() < dialogueChance) {
    triggerDialogue(
      "queue-thought",
      {
        facilityName: getFacilityDef(facility.type).name,
        profileLabel: visitor.profileLabel || "顾客",
      },
      { chance: 1, speakerId: visitor.id },
    );
  }
}

function speakAsVisitor(visitor, text, topic = "thought", ttl = 3.2, force = false) {
  if (!visitor) {
    return false;
  }
  if (!force) {
    if (state.dialogueCooldown > 0) {
      return false;
    }
    if (state.activeDialogue && state.activeDialogue.ttl > 1.5) {
      return false;
    }
  }
  openDialogueForSpeaker("visitor", visitor.id, getVisitorDisplayName(visitor), text, topic, ttl);
  return true;
}

function getNearbyTree(visitor, radius = 34) {
  return (
    state.facilities.find(
      (facility) =>
        facility.kind === "scenery" &&
        facility.type === "tree" &&
        Math.hypot(getTileCenter(facility.col, facility.row).x - visitor.x, getTileCenter(facility.col, facility.row).y - visitor.y) <= radius,
    ) || null
  );
}

function getNearbyCuriousFacility(visitor, radius = 42) {
  return (
    state.facilities.find((facility) => {
      if (
        facility.kind === "scenery" ||
        facility.kind === "public-spot" ||
        facility.id === visitor.targetFacilityId
      ) {
        return false;
      }
      const center = getTileCenter(facility.col, facility.row, facility.width, facility.height);
      return Math.hypot(center.x - visitor.x, center.y - visitor.y) <= radius;
    }) || null
  );
}

function getNearbyPublicSpot(visitor, radius = 44) {
  return (
    state.facilities.find((facility) => {
      if (facility.kind !== "public-spot") {
        return false;
      }
      const center = getTileCenter(facility.col, facility.row, facility.width, facility.height);
      return Math.hypot(center.x - visitor.x, center.y - visitor.y) <= radius;
    }) || null
  );
}

function getPublicSpotAmbientLine(type) {
  switch (type) {
    case "pocket-plaza":
      return pickRandom([
        "小广场这块看着就适合站一会儿，街上的动静一眼就扫到了。",
        "这个口袋公园摆得挺妙，站在边上看人来人往特别有味道。",
      ]);
    case "fountain-corner":
      return pickRandom([
        "喷泉边的水声一起来，整条街都像慢下来了一点。",
        "这个喷泉角落挺会做气氛，路过都想多看两眼。",
      ]);
    case "metro-entrance":
      return pickRandom([
        "地铁口一摆上来，感觉这条街的人气一下就对了。",
        "站口看着就很忙，像是下一波客人随时会冒出来。",
      ]);
    case "street-stall":
      return pickRandom([
        "这个小摊看着就热闹，路过的人很难不瞟一眼。",
        "摊位一撑起来，街面终于有点集市味了。",
      ]);
    default:
      return "这块公共点位挺有街区味，路过就会想停一下。";
  }
}

function canVisitorStartAmbientAction(visitor) {
  return (
    canVisitorPauseForAmbient(visitor) &&
    visitor.ambientCooldown <= 0 &&
    visitor.localPause <= 0 &&
    visitor.incidentPause <= 0 &&
    !isVisitorNearDestination(visitor)
  );
}

function canVisitorsSocializeTogether(visitor, other, radius = 32) {
  return !(
    visitor.id === other.id ||
    visitor.socialCooldown > 0 ||
    other.socialCooldown > 0 ||
    visitor.waveCooldown > 0 ||
    other.waveCooldown > 0 ||
    visitor.localPause > 0 ||
    other.localPause > 0 ||
    !canVisitorPauseForAmbient(visitor) ||
    !canVisitorPauseForAmbient(other) ||
    isVisitorNearDestination(visitor) ||
    isVisitorNearDestination(other) ||
    Math.hypot(visitor.x - other.x, visitor.y - other.y) > radius
  );
}

function startCompanionWalk(visitor, other, ttl = 4.2) {
  if (
    visitor.targetFacilityId !== other.targetFacilityId ||
    !canVisitorPauseForAmbient(visitor) ||
    !canVisitorPauseForAmbient(other)
  ) {
    return false;
  }
  const leader = visitor.id < other.id ? visitor : other;
  const follower = leader.id === visitor.id ? other : visitor;
  leader.companionPartnerId = follower.id;
  leader.companionLeadId = leader.id;
  leader.companionWalkTtl = Math.max(leader.companionWalkTtl || 0, ttl);
  leader.companionOffsetX = 0;
  follower.companionPartnerId = leader.id;
  follower.companionLeadId = leader.id;
  follower.companionWalkTtl = Math.max(follower.companionWalkTtl || 0, ttl);
  follower.companionOffsetX =
    follower.x <= leader.x ? -10 - Math.random() * 3 : 10 + Math.random() * 3;
  follower.companionOffsetY = Math.random() * 4 - 2;
  return true;
}

function getCompanionMoveTarget(visitor) {
  if (
    !visitor.companionLeadId ||
    visitor.companionLeadId === visitor.id ||
    (visitor.companionWalkTtl || 0) <= 0 ||
    !canVisitorPauseForAmbient(visitor)
  ) {
    return null;
  }
  const lead = getVisitorById(visitor.companionLeadId);
  if (
    !lead ||
    lead.done ||
    lead.phase !== visitor.phase ||
    (lead.companionWalkTtl || 0) <= 0
  ) {
    return null;
  }
  return {
    x: lead.x + (visitor.companionOffsetX || 0),
    y: lead.y + (visitor.companionOffsetY || 0),
  };
}

function maybeTriggerVisitorAmbientAction(visitor) {
  if (!canVisitorStartAmbientAction(visitor)) {
    return false;
  }

  if (maybeTriggerPickupInteraction(visitor)) {
    return true;
  }

  if (
    (state.world.weather.id === "drizzle" || state.world.weather.id === "snow") &&
    Math.random() < 0.22
  ) {
    visitor.hurryTtl = 4.2 + Math.random() * 1.8;
    setVisitorMoodBias(visitor, "rushed", 3.8);
    visitor.ambientCooldown = 7 + Math.random() * 3;
    if ((visitor.emoteCooldown || 0) <= 0) {
      setVisitorEmote(visitor, "sweat", 0.9);
    }
    if (Math.random() < 0.2) {
      speakAsVisitor(visitor, "这天气得快走两步，不然一会儿鞋边都要湿了。", "street", 2.8);
    }
    return true;
  }

  const nearbyTree = getNearbyTree(visitor);
  if (nearbyTree && Math.random() < 0.26) {
    visitor.localPause = 0.75 + Math.random() * 0.55;
    visitor.ambientCooldown = 8 + Math.random() * 3.4;
    setVisitorMoodBias(visitor, Math.random() < 0.5 ? "happy" : "bored", 3.6);
    if ((visitor.emoteCooldown || 0) <= 0) {
      setVisitorEmote(visitor, Math.random() < 0.65 ? "star" : "dots", 0.95);
    }
    if (Math.random() < 0.16) {
      speakAsVisitor(visitor, "树边停一下，整条街的动静一下就能看清。", "street", 2.8);
    }
    return true;
  }

  const nearbyPublicSpot = getNearbyPublicSpot(visitor);
  if (nearbyPublicSpot && Math.random() < 0.28) {
    visitor.localPause = 0.7 + Math.random() * 0.55;
    visitor.ambientCooldown = 8.5 + Math.random() * 3.2;
    setVisitorMoodBias(
      visitor,
      nearbyPublicSpot.type === "metro-entrance" ? "rushed" : "happy",
      3.2,
    );
    if ((visitor.emoteCooldown || 0) <= 0) {
      setVisitorEmote(
        visitor,
        nearbyPublicSpot.type === "metro-entrance"
          ? "note"
          : nearbyPublicSpot.type === "fountain-corner"
            ? "star"
            : "heart",
        0.95,
      );
    }
    if (Math.random() < 0.28) {
      speakAsVisitor(
        visitor,
        getPublicSpotAmbientLine(nearbyPublicSpot.type),
        "street",
        2.9,
      );
    }
    return true;
  }

  const curiousFacility = getNearbyCuriousFacility(visitor);
  if (curiousFacility && Math.random() < 0.32) {
    const facilityName = getStructureDef(curiousFacility.type)?.name || "这家店";
    visitor.localPause = 0.65 + Math.random() * 0.45;
    visitor.ambientCooldown = 7 + Math.random() * 3;
    setVisitorMoodBias(visitor, "calm", 2.8);
    if ((visitor.emoteCooldown || 0) <= 0) {
      setVisitorEmote(visitor, "note", 0.9);
    }
    if (Math.random() < 0.18) {
      speakAsVisitor(visitor, `${facilityName} 的招牌有点意思，先记住，下回再专门过来。`, "street", 2.9);
    }
    return true;
  }

  if (Math.random() < 0.08) {
    visitor.localPause = 0.7 + Math.random() * 0.4;
    visitor.ambientCooldown = 9 + Math.random() * 3.2;
    if ((visitor.emoteCooldown || 0) <= 0) {
      setVisitorEmote(visitor, "star", 0.85);
    }
    return true;
  }

  return false;
}

function maybeTriggerYieldInteraction(visitor, other) {
  if (
    !canVisitorPauseForAmbient(visitor) ||
    !canVisitorPauseForAmbient(other) ||
    visitor.localPause > 0 ||
    other.localPause > 0 ||
    visitor.ambientCooldown > 0 ||
    other.ambientCooldown > 0 ||
    isVisitorNearDestination(visitor) ||
    isVisitorNearDestination(other)
  ) {
    return false;
  }
  if (Math.hypot(visitor.x - other.x, visitor.y - other.y) > 14 || Math.random() > 0.12) {
    return false;
  }
  const yielding = visitor.id < other.id ? visitor : other;
  yielding.localPause = 0.28 + Math.random() * 0.24;
  yielding.ambientCooldown = 5 + Math.random() * 2;
  if ((yielding.emoteCooldown || 0) <= 0 && Math.random() < 0.45) {
    setVisitorEmote(yielding, "dots", 0.75);
  }
  return true;
}

function maybeTriggerWaveGreeting(visitor, other) {
  if (!canVisitorsSocializeTogether(visitor, other, 42)) {
    return false;
  }
  const bond = getVisitorBondBetween(visitor, other) || getVisitorBondBetween(other, visitor);
  if (!bond || !bond.activeHours.includes(state.timeOfDay.id) || Math.random() > 0.11) {
    return false;
  }
  const bondDef = socialBondDefinitions[bond.type];
  if (!bondDef) {
    return false;
  }
  visitor.socialCooldown = 9 + Math.random() * 4;
  other.socialCooldown = 9 + Math.random() * 4;
  visitor.waveCooldown = 7 + Math.random() * 3;
  other.waveCooldown = 7 + Math.random() * 3;
  visitor.localPause = 0.18 + Math.random() * 0.12;
  other.localPause = 0.18 + Math.random() * 0.12;
  if ((visitor.emoteCooldown || 0) <= 0) {
    setVisitorEmote(visitor, bondDef.emote, 0.9);
  }
  if ((other.emoteCooldown || 0) <= 0) {
    setVisitorEmote(other, bondDef.emote, 0.9);
  }
  if (Math.random() < 0.44) {
    const speaker = Math.random() < 0.5 ? visitor : other;
    speakAsVisitor(speaker, pickRandom(bondDef.waveLines) || pickRandom(bondDef.chatLines), "social-wave", 2.7);
  }
  if (Math.random() < 0.62) {
    const ttl = 3.2 + Math.random() * 2.2;
    if (startCompanionWalk(visitor, other, ttl) && Math.random() < 0.38) {
      const speaker = Math.random() < 0.5 ? visitor : other;
      speakAsVisitor(speaker, pickRandom(bondDef.strollLines) || "那就并排走一段。", "social-walk", 2.9);
    }
  }
  return true;
}

function maybeTriggerSocialEncounter(visitor, other) {
  if (!canVisitorsSocializeTogether(visitor, other, 30)) {
    return false;
  }
  const bond = getVisitorBondBetween(visitor, other) || getVisitorBondBetween(other, visitor);
  if (!bond || !bond.activeHours.includes(state.timeOfDay.id)) {
    return false;
  }
  const bondDef = socialBondDefinitions[bond.type];
  if (!bondDef) {
    return false;
  }
  const pause =
    bondDef.pauseRange[0] + Math.random() * (bondDef.pauseRange[1] - bondDef.pauseRange[0]);
  visitor.localPause = pause;
  other.localPause = pause * (0.88 + Math.random() * 0.18);
  visitor.socialCooldown = 16 + Math.random() * 10;
  other.socialCooldown = 16 + Math.random() * 10;
  visitor.ambientCooldown = Math.max(visitor.ambientCooldown, 6);
  other.ambientCooldown = Math.max(other.ambientCooldown, 6);
  visitor.socialGlowTtl = Math.max(visitor.socialGlowTtl || 0, 7.5);
  other.socialGlowTtl = Math.max(other.socialGlowTtl || 0, 7.5);
  setVisitorMoodBias(visitor, bondDef.mood, 5.4);
  setVisitorMoodBias(other, bondDef.mood, 5.4);
  if ((visitor.emoteCooldown || 0) <= 0) {
    setVisitorEmote(visitor, bondDef.emote, 1.05);
  }
  if ((other.emoteCooldown || 0) <= 0) {
    setVisitorEmote(other, bondDef.emote, 1.05);
  }
  if (Math.random() < 0.52) {
    const speaker = Math.random() < 0.5 ? visitor : other;
    const line =
      pickRandom(bondDef.chatLines) ||
      pickRandom(bondDef.waveLines) ||
      "又在街上碰到了。";
    speakAsVisitor(speaker, line, "social", 3.1);
  }
  if (Math.random() < 0.58) {
    startCompanionWalk(visitor, other, 3.8 + Math.random() * 2.4);
  }
  return true;
}

function updateVisitorAmbientLayer() {
  for (let index = 0; index < state.visitors.length; index += 1) {
    const visitor = state.visitors[index];
    for (let otherIndex = index + 1; otherIndex < state.visitors.length; otherIndex += 1) {
      const other = state.visitors[otherIndex];
      if (maybeTriggerSocialEncounter(visitor, other)) {
        continue;
      }
      if (maybeTriggerWaveGreeting(visitor, other)) {
        continue;
      }
      maybeTriggerYieldInteraction(visitor, other);
    }
  }
  for (const visitor of state.visitors) {
    maybeTriggerVisitorAmbientAction(visitor);
  }
}

function getEventActorById(id) {
  return state.eventActors.find((actor) => actor.id === id) || null;
}

function getEventActorDisplayName(actor) {
  return `${actor.role}·${actor.name}`;
}

function resolveDialogueSpeaker(dialogue) {
  if (!dialogue) {
    return null;
  }
  if (dialogue.speakerKind === "event-actor") {
    return getEventActorById(dialogue.speakerId);
  }
  if (dialogue.speakerKind === "npc") {
    return state.npcs.find((npc) => npc.id === dialogue.speakerId) || null;
  }
  return getVisitorById(dialogue.speakerId);
}

function openDialogueForSpeaker(speakerKind, speakerId, speakerName, text, topic, ttl = 3.2) {
  state.activeDialogue = {
    speakerId,
    speakerKind,
    speakerName,
    text,
    topic,
    ttl,
  };
  state.dialogueFeed.unshift({
    speakerName,
    text,
    topic,
  });
  state.dialogueFeed = state.dialogueFeed.slice(0, 4);
  state.dialogueCooldown = 5.2;
}

function getEventActorDialogueLines(actor) {
  const incident = state.world.incidentQueue.find((item) => item.id === actor.incidentId);
  const featuredName =
    incident?.featuredType ? getFacilityDef(incident.featuredType)?.name || "这家店" : "这条街";
  const zoneLabel = incident?.zoneLabel || "这片街区";
  switch (actor.incidentId) {
    case "incident-influencer-rush":
      return [
        `${actor.name}：镜头先给 ${featuredName}，这家今天肯定要爆。`,
        `${actor.name}：再往 ${featuredName} 门口站近一点，排队感才够热闹。`,
        `${actor.name}：今天这波探店流量，${featuredName} 吃得很满。`,
        `${actor.name}：人一多起来，${featuredName} 的门脸立刻就出片了。`,
      ];
    case "incident-roadwork-detour":
      return [
        `${actor.name}：${zoneLabel} 这边先绕行，大家别往施工带里挤。`,
        `${actor.name}：脚下这段刚封起来，去店里的客人得往旁边让。`,
        `${actor.name}：等这截路修平了，人流才会重新回来。`,
        `${actor.name}：别急着穿过去，从旁边那条路绕会更顺。`,
      ];
    case "incident-power-dip":
      return [
        `${actor.name}：电压还在跳，招牌和机器都得慢一点开。`,
        `${actor.name}：别急，先把这路电稳住，店里节奏就能回来。`,
        `${actor.name}：这会儿灯一闪一闪的，客人难免会迟疑。`,
        `${actor.name}：抢修先顶住，别让这条街一口气全暗下去。`,
      ];
    case "incident-flash-sale":
      return [
        `${actor.name}：限时折扣开始了，想排的现在就排。`,
        `${actor.name}：今天这波价牌一挂，${featuredName} 门口肯定不空。`,
        `${actor.name}：再等一会儿就轮到了，别错过这波折扣。`,
        `${actor.name}：折扣牌就挂这一阵，晚了可就没这价了。`,
      ];
    case "incident-street-performance":
      return [
        `${actor.name}：${zoneLabel} 这边开演，先把人气聚起来。`,
        `${actor.name}：鼓点一起来，旁边那几家店都会跟着吃流量。`,
        `${actor.name}：站位往中间靠一点，这波观众会越围越多。`,
        `${actor.name}：先别急着走，下一段副歌一出来气氛就上来了。`,
      ];
    case "incident-health-inspection":
      return [
        `${actor.name}：今天抽查得细一点，流程慢了也得按规矩来。`,
        `${actor.name}：先别催单，检查没过完，这家出客就是会慢。`,
        `${actor.name}：队伍别再往前顶了，等这轮检查结束再说。`,
        `${actor.name}：台面和流程都得看过一遍，今天想快也快不起来。`,
      ];
    default:
      return [
        `${actor.name}：今天街上气氛不一样，得盯着点人流。`,
      ];
  }
}

function triggerEventActorDialogue(actor, force = false) {
  if (!actor || (!force && state.dialogueCooldown > 0)) {
    return;
  }
  const lines = getEventActorDialogueLines(actor);
  const text = lines[Math.floor(Math.random() * lines.length)] || lines[0];
  openDialogueForSpeaker("event-actor", actor.id, getEventActorDisplayName(actor), text, "incident-live", 3.6);
}

function getNearbyVisitorsForActor(actor, radius = 44) {
  return state.visitors
    .filter(
      (visitor) =>
        !visitor.done &&
        visitor.phase !== "inside" &&
        visitor.phase !== "landmark-inside" &&
        visitor.phase !== "leaving-road" &&
        Math.hypot(visitor.x - actor.x, visitor.y - actor.y) <= radius,
    )
    .sort(
      (left, right) =>
        Math.hypot(left.x - actor.x, left.y - actor.y) -
        Math.hypot(right.x - actor.x, right.y - actor.y),
    );
}

function getEventInteractionPayload(actor, visitor) {
  const incident = state.world.incidentQueue.find((item) => item.id === actor.incidentId);
  const featuredName =
    incident?.featuredType ? getFacilityDef(incident.featuredType)?.name || "这家店" : "这条街";
  const zoneLabel = incident?.zoneLabel || "这片街区";
  switch (actor.incidentId) {
    case "incident-influencer-rush":
      return {
        actorLines: [
          `${actor.name}：对，镜头就跟着你往 ${featuredName} 那边走。`,
          `${actor.name}：今天这条街的主角就是 ${featuredName}，别错过门口那波热闹。`,
        ],
        visitorLines: [
          `欸，镜头扫到我了？那我可得把 ${featuredName} 这趟逛完整。`,
          `${featuredName} 门口都被拍上了，今天不去看看就亏了。`,
        ],
        emote: Math.random() < 0.5 ? "star" : "note",
        pause: 0.45,
      };
    case "incident-roadwork-detour":
      return {
        actorLines: [
          `${actor.name}：这边先让一让，去 ${zoneLabel} 的客人从旁边绕。`,
          `${actor.name}：别贴着施工带走，前面那条缝只够一人过。`,
        ],
        visitorLines: [
          `这段路果然得绕一下，今天逛街节奏全被施工带歪了。`,
          `${zoneLabel} 这边被拦了一截，只能换个方向慢慢过去。`,
        ],
        emote: Math.random() < 0.5 ? "sweat" : "dots",
        pause: 0.4,
      };
    case "incident-power-dip":
      return {
        actorLines: [
          `${actor.name}：先别催，电一稳下来，这条街就不会一闪一闪了。`,
          `${actor.name}：招牌刚跳过一次，大家先别往机器边挤。`,
        ],
        visitorLines: [
          `灯刚刚闪了一下，今天这趟还是慢慢逛比较稳。`,
          `电压不太稳的时候，连排队都让人有点犹豫。`,
        ],
        emote: Math.random() < 0.5 ? "dots" : "sweat",
        pause: 0.5,
      };
    case "incident-flash-sale":
      return {
        actorLines: [
          `${actor.name}：折扣牌刚翻出来，这会儿排最值。`,
          `${actor.name}：今天这波价差很实在，想省钱的别犹豫。`,
        ],
        visitorLines: [
          `都喊到这份上了，那我再等一会儿也行。`,
          `限时折扣挂出来以后，门口这队伍突然就更能等了。`,
        ],
        emote: Math.random() < 0.5 ? "heart" : "star",
        pause: 0.35,
        queueBonus: 1.4,
      };
    case "incident-street-performance":
      return {
        actorLines: [
          `${actor.name}：先别走，下一段一响，这块人就会全围过来。`,
          `${actor.name}：站这儿听两拍就知道，${zoneLabel} 今天不缺人气。`,
        ],
        visitorLines: [
          `这段节奏还真挺上头，我先在这边看一会儿。`,
          `边听边逛的感觉不错，这一带一下就热起来了。`,
        ],
        emote: Math.random() < 0.5 ? "note" : "star",
        pause: 1.05,
      };
    case "incident-health-inspection":
      return {
        actorLines: [
          `${actor.name}：队伍先收一收，今天得按检查流程慢慢过。`,
          `${actor.name}：别催前台，这轮抽查看完才能继续提速。`,
        ],
        visitorLines: [
          `今天这队是真的慢，不过检查的时候也只能多等一会儿。`,
          `流程一细起来，门口节奏就立刻拖下来了。`,
        ],
        emote: Math.random() < 0.5 ? "sweat" : "anger",
        pause: 0.5,
        queuePenalty: 0.55,
      };
    default:
      return {
        actorLines: [`${actor.name}：今天这条街的节奏和往常不一样。`],
        visitorLines: [`今天街上突然多了新动静，只能边走边看。`],
        emote: "dots",
        pause: 0.35,
      };
  }
}

function triggerEventActorInteraction(actor) {
  if (!actor) {
    return false;
  }
  const visitor = getNearbyVisitorsForActor(actor, actor.interactionRadius || 42)[0];
  if (!visitor) {
    return false;
  }
  const payload = getEventInteractionPayload(actor, visitor);
  if (!payload) {
    return false;
  }
  actor.focusVisitorId = visitor.id;
  actor.focusTtl = 1.4;
  if ((visitor.emoteCooldown || 0) <= 0 || Math.random() < 0.52) {
    setVisitorEmote(visitor, payload.emote, 1.4 + Math.random() * 0.6);
  }
  if (payload.pause && visitor.phase !== "queue-wait") {
    visitor.incidentPause = Math.max(visitor.incidentPause || 0, payload.pause);
  }
  if (
    payload.queueBonus &&
    (visitor.phase === "queueing" || visitor.phase === "queue-wait")
  ) {
    visitor.queuePatience += payload.queueBonus;
  }
  if (
    payload.queuePenalty &&
    (visitor.phase === "queueing" || visitor.phase === "queue-wait")
  ) {
    visitor.queuePatience = Math.max(0.9, visitor.queuePatience - payload.queuePenalty);
  }
  if (state.dialogueCooldown <= 0 || !state.activeDialogue) {
    const actorText =
      payload.actorLines[Math.floor(Math.random() * payload.actorLines.length)] ||
      payload.actorLines[0];
    const visitorText =
      payload.visitorLines[Math.floor(Math.random() * payload.visitorLines.length)] ||
      payload.visitorLines[0];
    if (Math.random() < 0.56) {
      openDialogueForSpeaker(
        "event-actor",
        actor.id,
        getEventActorDisplayName(actor),
        actorText,
        "incident-live",
        3.4,
      );
    } else {
      openDialogueForSpeaker(
        "visitor",
        visitor.id,
        getVisitorDisplayName(visitor),
        visitorText,
        "incident-react",
        3.2,
      );
    }
  }
  if (Math.random() < 0.22) {
    pushMessage(`${getVisitorDisplayName(visitor)} 被 ${getEventActorDisplayName(actor)} 吸引，脚步慢了下来。`);
  }
  return true;
}

function updateEventActors(delta) {
  for (const actor of state.eventActors) {
    actor.focusTtl = Math.max(0, (actor.focusTtl || 0) - delta);
    if ((actor.focusTtl || 0) <= 0) {
      actor.focusVisitorId = null;
    }
    const nearbyVisitor = getNearbyVisitorsForActor(
      actor,
      Math.max(96, (actor.interactionRadius || 72) * 1.8),
    )[0];
    if (nearbyVisitor && Math.random() < delta * 1.8) {
      actor.targetX = nearbyVisitor.x;
      actor.targetY = nearbyVisitor.y;
    }
    const dx = actor.targetX - actor.x;
    const dy = actor.targetY - actor.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      actor.routeIndex = (actor.routeIndex + 1) % actor.route.length;
      actor.targetX = actor.route[actor.routeIndex].x;
      actor.targetY = actor.route[actor.routeIndex].y;
    } else {
      const move = Math.min(dist, actor.speed * delta);
      actor.x += (dx / dist) * move;
      actor.y += (dy / dist) * move;
    }
    actor.talkTimer -= delta;
    actor.interactionTimer -= delta;
    if (actor.talkTimer <= 0) {
      if (Math.random() < 0.62) {
        triggerEventActorDialogue(actor);
      }
      actor.talkTimer = 4.6 + Math.random() * 3.2;
    }
    if (actor.interactionTimer <= 0) {
      const interacted = triggerEventActorInteraction(actor);
      actor.interactionTimer = interacted ? 3.4 + Math.random() * 2.2 : 1.8 + Math.random() * 1.2;
    }
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
  openDialogueForSpeaker(
    "visitor",
    speaker.id,
    getVisitorDisplayName(speaker),
    text,
    topic,
  );
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
  if (!resolveDialogueSpeaker(state.activeDialogue)) {
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

function getResidentProfileById(id) {
  return residentProfiles.find((profile) => profile.id === id) || null;
}

function cloneVisitorAppearance(appearance) {
  return {
    shirt: appearance.shirt,
    hair: appearance.hair,
    accent: appearance.accent,
    pants: appearance.pants,
    skin: appearance.skin,
    frame: appearance.frame,
    accessory: appearance.accessory,
  };
}

function getVisitorAppearance(profileId, residentProfile, seed) {
  if (residentProfile?.appearance) {
    return cloneVisitorAppearance(residentProfile.appearance);
  }
  const presets = visitorAppearanceSets[profileId] || visitorAppearanceSets.family;
  const preset = presets[seed % presets.length] || presets[0];
  return cloneVisitorAppearance(preset);
}

function getVisitorDisplayName(visitor) {
  return visitor?.displayName || visitor?.profileLabel || "顾客";
}

function getVisitorEmotionDefinition(id) {
  return visitorEmotionDefinitions[id] || visitorEmotionDefinitions.calm;
}

function isVisitorMovingPhase(visitor) {
  return (
    visitor.phase === "to-grid" ||
    visitor.phase === "going" ||
    visitor.phase === "public-spot-going" ||
    visitor.phase === "errand-going" ||
    visitor.phase === "queueing" ||
    visitor.phase === "entering" ||
    visitor.phase === "landmark-entering" ||
    visitor.phase === "exiting" ||
    visitor.phase === "leaving" ||
    visitor.phase === "leaving-road"
  );
}

function canVisitorPauseForAmbient(visitor) {
  return (
    visitor.phase === "going" ||
    visitor.phase === "public-spot-going" ||
    visitor.phase === "errand-going" ||
    visitor.phase === "leaving"
  );
}

function getVisitorRemainingRouteSteps(visitor) {
  if (visitor.phase === "going" || visitor.phase === "errand-going") {
    return Math.max(0, visitor.path.length - 1 - visitor.pathIndex);
  }
  if (visitor.phase === "leaving") {
    return Math.max(0, visitor.pathIndex);
  }
  return 0;
}

function isVisitorNearDestination(visitor) {
  if (
    visitor.phase === "queueing" ||
    visitor.phase === "queue-wait" ||
    visitor.phase === "entering" ||
    visitor.phase === "landmark-entering" ||
    visitor.phase === "inside" ||
    visitor.phase === "landmark-inside"
  ) {
    return true;
  }
  return getVisitorRemainingRouteSteps(visitor) <= 1;
}

function setVisitorMoodBias(visitor, moodId, ttl = 4.2) {
  if (!visitor) {
    return;
  }
  visitor.moodBias = {
    id: moodId,
    ttl: Math.max(visitor.moodBias?.ttl || 0, ttl),
  };
}

function getVisitorBondBetween(visitor, other) {
  if (!visitor?.socialBonds?.length || !other?.residentProfileId) {
    return null;
  }
  return (
    visitor.socialBonds.find((bond) => bond.targetResidentId === other.residentProfileId) || null
  );
}

function evaluateVisitorEmotion(visitor) {
  if (visitor.moodBias?.ttl > 0) {
    return visitor.moodBias.id;
  }
  if (visitor.phase === "queue-wait" || visitor.phase === "queueing") {
    if (visitor.queuePatience <= 2.2) {
      return "annoyed";
    }
    if (visitor.queuePatience <= 4.6) {
      return "bored";
    }
    return profileIsVisitorFavorite(visitor, getFacilityById(visitor.targetFacilityId)?.type || "")
      ? "happy"
      : "calm";
  }
  if (visitor.phase === "leaving-road" && state.timeOfDay.id === "midnight") {
    return "tired";
  }
  if (
    (state.timeOfDay.id === "midnight" || state.timeOfDay.id === "morning") &&
    (visitor.phase === "going" || visitor.phase === "leaving")
  ) {
    return "tired";
  }
  if (
    visitor.hurryTtl > 0 ||
    ((state.world.weather.id === "drizzle" || state.world.weather.id === "snow") &&
      canVisitorPauseForAmbient(visitor) &&
      !isVisitorNearDestination(visitor))
  ) {
    return "rushed";
  }
  if (visitor.socialGlowTtl > 0) {
    return "happy";
  }
  if (visitor.localPause > 0.65 && canVisitorPauseForAmbient(visitor)) {
    return "bored";
  }
  return "calm";
}

function updateVisitorEmotionState(visitor, delta) {
  if (visitor.moodBias) {
    visitor.moodBias.ttl -= delta;
    if (visitor.moodBias.ttl <= 0) {
      visitor.moodBias = null;
    }
  }
  visitor.socialGlowTtl = Math.max(0, (visitor.socialGlowTtl || 0) - delta);
  visitor.hurryTtl = Math.max(0, (visitor.hurryTtl || 0) - delta);
  visitor.emotionSampleTimer = Math.max(0, (visitor.emotionSampleTimer || 0) - delta);
  if (visitor.emotionSampleTimer > 0 && visitor.emotionId) {
    return;
  }
  visitor.emotionSampleTimer = 0.9 + Math.random() * 0.8;
  const nextEmotion = evaluateVisitorEmotion(visitor);
  if (nextEmotion !== visitor.emotionId) {
    visitor.emotionId = nextEmotion;
    visitor.mood = nextEmotion;
    const emotionDef = getVisitorEmotionDefinition(nextEmotion);
    if (emotionDef.emote && (visitor.emoteCooldown || 0) <= 0 && Math.random() < 0.72) {
      setVisitorEmote(visitor, emotionDef.emote, 0.95 + Math.random() * 0.5);
    }
  }
}

function getVisitorMoveSpeed(visitor) {
  return visitor.speed * getVisitorEmotionDefinition(visitor.emotionId).speedMultiplier;
}

function listLandmarks() {
  return state.facilities.filter((facility) => facility.kind === "landmark");
}

function listPublicSpots() {
  return state.facilities.filter((facility) => facility.kind === "public-spot");
}

function getPublicSpotOriginChance(profileId) {
  switch (profileId) {
    case "traveler":
      return 0.52;
    case "worker":
      return 0.38;
    case "student":
      return 0.29;
    case "family":
      return 0.18;
    default:
      return 0.24;
  }
}

function buildPublicSpotOriginRoute(facility, profile) {
  const metroSpots = shuffleArray(
    listPublicSpots().filter((spot) => spot.type === "metro-entrance"),
  );
  for (const spot of metroSpots) {
    const originTile = getPrimaryEntranceTile(spot);
    if (!originTile) {
      continue;
    }
    const path = buildFacilityPath(originTile, facility);
    if (!path) {
      continue;
    }
    return {
      path,
      originKind: "public-spot",
      originPublicSpotId: spot.id,
      originPublicSpotType: spot.type,
      spawnTile: path[0],
      approachTile: path[path.length - 1],
      roadExit: getRoadPoint(pickRandom(["left", "center", "right"]) || "center", originTile.col),
    };
  }
  return null;
}

function getPublicSpotDetourWeight(visitor, publicSpot) {
  let weight = 1.1;
  switch (publicSpot.type) {
    case "pocket-plaza":
      weight += visitor.profileId === "family" ? 1.3 : 0.7;
      weight += visitor.emotionId === "happy" || visitor.emotionId === "calm" ? 0.5 : 0.1;
      break;
    case "fountain-corner":
      weight += visitor.profileId === "traveler" ? 1.2 : 0.8;
      weight += state.world.weather.id === "drizzle" ? -0.4 : 0.35;
      break;
    case "street-stall":
      weight += visitor.profileId === "student" || visitor.profileId === "family" ? 1.1 : 0.5;
      weight += state.timeOfDay.id === "evening" ? 0.55 : 0.2;
      break;
    default:
      break;
  }
  return weight;
}

function planVisitorPublicSpotVisit(visitor) {
  const startTile = visitor.path[visitor.path.length - 1];
  if (!startTile) {
    return null;
  }
  const candidates = listPublicSpots()
    .filter((spot) => spot.type !== "metro-entrance")
    .map((spot) => {
      const path = buildFacilityPath(startTile, spot);
      if (!path) {
        return null;
      }
      return {
        publicSpot: spot,
        path,
        weight: getPublicSpotDetourWeight(visitor, spot),
      };
    })
    .filter(Boolean);
  const picked = pickWeightedByWeight(candidates);
  if (!picked) {
    return null;
  }
  return {
    publicSpot: picked.publicSpot,
    path: picked.path,
    approachTile: picked.path[picked.path.length - 1],
  };
}

function getPublicSpotStayDuration(type) {
  const base = simulationTuning.visitorWait;
  switch (type) {
    case "pocket-plaza":
      return base * 1.9;
    case "fountain-corner":
      return base * 2.2;
    case "street-stall":
      return base * 1.5;
    case "metro-entrance":
      return base * 1.2;
    default:
      return base * 1.6;
  }
}

function getPublicSpotVisitPayload(type) {
  switch (type) {
    case "pocket-plaza":
      return {
        floaterText: "停在广场",
        dialogue: pickRandom([
          "这小广场真适合停一下，街上的人一来一去全看得见。",
          "广场这块留得真妙，站一会儿就会觉得整条街活起来了。",
        ]),
        emote: "heart",
        moodId: "happy",
        color: "#ffeab3",
      };
    case "fountain-corner":
      return {
        floaterText: "看了喷泉",
        dialogue: pickRandom([
          "喷泉这块挺会做气氛，路过真的会想慢一点。",
          "水声一出来，刚才排队那点烦躁都被冲掉了。",
        ]),
        emote: "star",
        moodId: "calm",
        color: "#d9f1ff",
      };
    case "street-stall":
      return {
        floaterText: "围了小摊",
        dialogue: pickRandom([
          "小摊往街边一摆，整条路就有了点逛市集的味道。",
          "这摊子真会招人，走到这里总想再多停一秒。",
        ]),
        emote: "note",
        moodId: "happy",
        color: "#ffe1ab",
      };
    case "metro-entrance":
      return {
        floaterText: "从地铁口来",
        dialogue: pickRandom([
          "刚出站就能看到这条街，第一眼印象就够热闹。",
          "地铁口离商店街这么近，难怪客流接得这么顺。",
        ]),
        emote: "note",
        moodId: "rushed",
        color: "#d8ebff",
      };
    default:
      return {
        floaterText: "停留了一下",
        dialogue: "这块公共点位留得不错，走到这就想多看一眼。",
        emote: "note",
        moodId: "calm",
        color: "#fff4d4",
      };
  }
}

function notePublicSpotVisit(publicSpot) {
  if (!publicSpot) {
    return;
  }
  publicSpot.publicVisits = (publicSpot.publicVisits || 0) + 1;
  const def = getStructureDef(publicSpot.type);
  incrementQuarterCounter(state.quarterStats?.publicSpotVisits, def?.name || publicSpot.type, 1);
  if (publicSpot.publicVisits === 3 || publicSpot.publicVisits === 6) {
    const note = `观察记录：${def?.name || "公共点位"} 附近开始形成固定停留人流。`;
    state.observerNotes.unshift(note);
    state.observerNotes = state.observerNotes.slice(0, 4);
    recordQuarterNote(note, `public:${publicSpot.id}:${publicSpot.publicVisits}`);
    if (Math.random() < 0.56) {
      pushMessage(note);
    }
  }
}

function getLandmarkErrandLabel(landmarkType, profileId) {
  switch (landmarkType) {
    case "library":
      return profileId === "student" ? "借书" : "翻翻公告板";
    case "clinic":
      return "问诊";
    case "post":
      return "寄信";
    case "police":
      return profileId === "worker" ? "报备" : "问路";
    case "workshop":
      return profileId === "worker" ? "交班" : "办事";
    default:
      return "办事";
  }
}

function getLandmarkCompletionPayload(visitor, landmarkType) {
  const profileLabel = getVisitorDisplayName(visitor);
  switch (landmarkType) {
    case "library":
      return visitor.profileId === "student"
        ? {
            resultText: `${profileLabel} 借到了新书`,
            floaterText: "新书到手",
            emote: "heart",
            badgeType: "library",
            color: "#bfe1ff",
            dialogue: "这趟图书馆没白来，借到的书够我再逛一路。",
          }
        : {
            resultText: `${profileLabel} 看完了公告板`,
            floaterText: "消息入手",
            emote: "note",
            badgeType: "library",
            color: "#d9ebff",
            dialogue: "公告板今天信息不少，顺手把街上的新消息也看了。",
          };
    case "clinic":
      return {
        resultText: `${profileLabel} 在诊所处理完了琐事`,
        floaterText: "问诊完成",
        emote: "dots",
        badgeType: "clinic",
        color: "#ffd3d3",
        dialogue: "诊所这边总算处理完了，接下来能轻松一点继续逛。",
      };
    case "post":
      return visitor.profileId === "traveler"
        ? {
            resultText: `${profileLabel} 寄出了明信片`,
            floaterText: "寄件完成",
            emote: "star",
            badgeType: "post",
            color: "#ffe4a8",
            dialogue: "明信片寄出去了，这趟小镇之行算是留下纪念了。",
          }
        : {
            resultText: `${profileLabel} 把信件寄出去了`,
            floaterText: "寄信完成",
            emote: "note",
            badgeType: "post",
            color: "#ffe0a6",
            dialogue: "信一寄出去，今天这趟事就算办利索了。",
          };
    case "police":
      return visitor.profileId === "worker"
        ? {
            resultText: `${profileLabel} 完成了报备`,
            floaterText: "报备完成",
            emote: "dots",
            badgeType: "police",
            color: "#d6e2ff",
            dialogue: "该报备的都报备完了，接下来就能安心回去了。",
          }
        : {
            resultText: `${profileLabel} 问清了路线`,
            floaterText: "路线确认",
            emote: "star",
            badgeType: "police",
            color: "#dce5ff",
            dialogue: "路线总算问明白了，再逛这条街就不会绕晕。",
          };
    case "workshop":
      return visitor.profileId === "worker"
        ? {
            resultText: `${profileLabel} 在工坊交完了班`,
            floaterText: "交班结束",
            emote: "heart",
            badgeType: "workshop",
            color: "#f4deb8",
            dialogue: "工坊这边的活已经交掉，今天逛街才算真正开始。",
          }
        : {
            resultText: `${profileLabel} 在工坊办完了手头事务`,
            floaterText: "事务办妥",
            emote: "note",
            badgeType: "workshop",
            color: "#ead8c0",
            dialogue: "工坊这边的事情处理好，整个人都轻松下来了。",
          };
    default:
      return {
        resultText: `${profileLabel} 办完了事`,
        floaterText: "办妥了",
        emote: "note",
        badgeType: "post",
        color: "#fff0b8",
        dialogue: "事情办完，接下来就可以慢慢离开这条街了。",
      };
  }
}

function getShopVisitFeedbackPayload(visitor, facilityType) {
  const def = shopVisitFeedbackDefinitions[facilityType];
  if (!def) {
    return null;
  }
  return {
    ...def,
    floaterText: pickRandom(def.floaterTexts) || "逛得不错",
    dialogue: pickRandom(def.dialogues) || "这趟逛得挺值。",
    emote: pickRandom(def.emotes) || "note",
  };
}

function applyShopVisitFeedback(visitor, facilityType) {
  const payload = getShopVisitFeedbackPayload(visitor, facilityType);
  if (!payload) {
    return null;
  }
  if ((visitor.emoteCooldown || 0) <= 0 || Math.random() < 0.4) {
    setVisitorEmote(visitor, payload.emote, 1.15 + Math.random() * 0.5);
  }
  visitor.serviceBadge = {
    type: payload.badgeType,
    ttl: 3.6 + Math.random() * 1.4,
  };
  setVisitorMoodBias(visitor, payload.moodId, payload.moodTtl);
  state.floaters.push({
    x: visitor.x,
    y: visitor.y - 24,
    text: payload.floaterText,
    color: "#fff4d4",
    ttl: 1.7,
  });
  if (Math.random() < 0.26) {
    speakAsVisitor(visitor, payload.dialogue, "service-result", 3);
  }
  return payload;
}

function getFacilityPickupSpawnPoint(facility) {
  const entrance = getPrimaryEntranceTile(facility);
  if (entrance) {
    const center = getTileCenter(entrance.col, entrance.row);
    return {
      x: center.x + (Math.random() * 18 - 9),
      y: center.y + (Math.random() * 16 - 8),
    };
  }
  const center = getTileCenter(facility.col, facility.row, facility.width, facility.height);
  return {
    x: center.x + (Math.random() * 26 - 13),
    y: center.y + facility.height * 8 + (Math.random() * 16 - 8),
  };
}

function buildStreetPickupSpawnCandidates() {
  const candidates = [];
  for (const facility of state.facilities) {
    if (facility.kind === "landmark" || facility.kind === "tree") {
      continue;
    }
    const point = getFacilityPickupSpawnPoint(facility);
    switch (facility.type) {
      case "snack":
        candidates.push({ type: Math.random() < 0.55 ? "paperbag" : "receipt", point, weight: 1.8, sourceLabel: "Snack Bar 门口" });
        break;
      case "arcade":
        candidates.push({ type: Math.random() < 0.55 ? "token" : "ticket", point, weight: 1.55, sourceLabel: "Mini Arcade 门口" });
        break;
      case "bath":
        candidates.push({ type: Math.random() < 0.65 ? "flyer" : "coupon", point, weight: 1.2, sourceLabel: "Pocket Bath 门前" });
        break;
      case "tower":
        candidates.push({ type: Math.random() < 0.6 ? "ticket" : "ribbon", point, weight: 1.6, sourceLabel: "Idol Tower 周围" });
        break;
      case "park":
        candidates.push({
          type:
            state.world.season.id === "spring"
              ? "petal"
              : state.world.season.id === "autumn"
                ? "leaf"
                : Math.random() < 0.35
                  ? "petal"
                  : "leaf",
          point,
          weight: 1.1,
          sourceLabel: "Sunny Park 边上",
        });
        break;
      default:
        break;
    }
  }

  if (state.world.weather.id === "drizzle") {
    candidates.push({
      type: "flyer",
      point: {
        x: layout.gridX + 80 + Math.random() * (layout.sidebarX - layout.gridX - 180),
        y: layout.gridY + 120 + Math.random() * (layout.rows * layout.tile - 180),
      },
      weight: 1.2,
      sourceLabel: "雨天被风吹落",
    });
  }
  if (state.world.season.id === "spring") {
    candidates.push({
      type: "petal",
      point: {
        x: layout.gridX + 60 + Math.random() * (layout.sidebarX - layout.gridX - 140),
        y: layout.gridY + 80 + Math.random() * (layout.rows * layout.tile - 140),
      },
      weight: 0.9,
      sourceLabel: "春风吹来",
    });
  }
  if (state.world.season.id === "autumn") {
    candidates.push({
      type: "leaf",
      point: {
        x: layout.gridX + 60 + Math.random() * (layout.sidebarX - layout.gridX - 140),
        y: layout.gridY + 80 + Math.random() * (layout.rows * layout.tile - 140),
      },
      weight: 1,
      sourceLabel: "秋风卷过",
    });
  }

  for (const incident of state.world.incidentQueue) {
    if (incident.id === "incident-flash-sale") {
      candidates.push({
        type: "coupon",
        point: {
          x: layout.gridX + 100 + Math.random() * (layout.sidebarX - layout.gridX - 200),
          y: layout.gridY + 120 + Math.random() * (layout.rows * layout.tile - 180),
        },
        weight: 1.35,
        sourceLabel: "折扣活动散落",
      });
    } else if (incident.id === "incident-street-performance") {
      candidates.push({
        type: Math.random() < 0.5 ? "ticket" : "ribbon",
        point: {
          x: layout.gridX + 120 + Math.random() * (layout.sidebarX - layout.gridX - 220),
          y: layout.gridY + 110 + Math.random() * (layout.rows * layout.tile - 200),
        },
        weight: 1.15,
        sourceLabel: "演出余波",
      });
    }
  }

  return candidates;
}

function spawnStreetPickup() {
  if (state.streetPickups.length >= 6) {
    return false;
  }
  const picked = pickWeightedByWeight(buildStreetPickupSpawnCandidates());
  if (!picked) {
    return false;
  }
  const def = streetPickupDefinitions[picked.type];
  if (!def) {
    return false;
  }
  state.streetPickups.push({
    id: state.nextPickupId,
    type: picked.type,
    x: picked.point.x,
    y: picked.point.y,
    ttl: 10 + Math.random() * 6,
    drift: Math.random() * Math.PI * 2,
    sourceLabel: picked.sourceLabel,
    inspectText: def.inspectText,
    emote: def.emote,
  });
  state.nextPickupId += 1;
  return true;
}

function updateStreetPickups(delta) {
  state.pickupSpawnTimer -= delta;
  if (state.pickupSpawnTimer <= 0) {
    if (Math.random() < 0.72) {
      spawnStreetPickup();
    }
    state.pickupSpawnTimer =
      state.world.incidentQueue.length > 0
        ? 3.6 + Math.random() * 2.4
        : 4.8 + Math.random() * 3.4;
  }
  for (const pickup of state.streetPickups) {
    pickup.ttl -= delta;
    pickup.drift += delta * 1.8;
  }
  state.streetPickups = state.streetPickups.filter((pickup) => pickup.ttl > 0);
}

function getNearbyStreetPickup(visitor, radius = 22) {
  return (
    state.streetPickups.find(
      (pickup) =>
        pickup.ttl > 0.05 &&
        Math.hypot(pickup.x - visitor.x, pickup.y - visitor.y) <= radius,
    ) || null
  );
}

function maybeTriggerPickupInteraction(visitor) {
  const pickup = getNearbyStreetPickup(visitor);
  if (!pickup || Math.random() > 0.34) {
    return false;
  }
  visitor.localPause = 0.56 + Math.random() * 0.34;
  visitor.ambientCooldown = 9 + Math.random() * 3;
  setVisitorMoodBias(visitor, Math.random() < 0.45 ? "happy" : "calm", 3.4);
  if ((visitor.emoteCooldown || 0) <= 0) {
    setVisitorEmote(visitor, pickup.emote, 0.95);
  }
  state.floaters.push({
    x: pickup.x,
    y: pickup.y - 12,
    text: pickup.inspectText,
    color: "#fff0cf",
    ttl: 1.45,
  });
  if (Math.random() < 0.18) {
    speakAsVisitor(visitor, `${pickup.sourceLabel} 留了点小痕迹，顺手捡起来看看。`, "street", 2.8);
  }
  pickup.ttl = -0.01;
  return true;
}

function incidentAffectsFacilityZone(incident, facility) {
  if (!incident.zoneRange) {
    return false;
  }
  const centerCol = facility.col + (facility.width - 1) / 2;
  return centerCol >= incident.zoneRange.min && centerCol <= incident.zoneRange.max;
}

function getIncidentFacilityPreferenceDelta(facility) {
  return state.world.incidentQueue.reduce((sum, incident) => {
    if (incident.id === "incident-roadwork-detour" && incidentAffectsFacilityZone(incident, facility)) {
      return sum - 5;
    }
    if (incident.id === "incident-street-performance" && incidentAffectsFacilityZone(incident, facility)) {
      return sum + (incident.zonePreferenceDelta || 4);
    }
    if (incident.featuredType && incident.featuredType === facility.type) {
      return sum + 6;
    }
    return sum;
  }, 0);
}

function getIncidentServiceMultiplier(facility) {
  return state.world.incidentQueue.reduce((multiplier, incident) => {
    const next = incident.serviceMultipliers?.[facility.type] || 1;
    return multiplier * next;
  }, 1);
}

function getIncidentQueuePatienceMultiplier(facility) {
  return state.world.incidentQueue.reduce((multiplier, incident) => {
    const typeFactor = incident.queuePatienceMultipliers?.[facility.type] || 1;
    const zoneFactor =
      incident.queuePatienceZoneMultiplier && incidentAffectsFacilityZone(incident, facility)
        ? incident.queuePatienceZoneMultiplier
        : 1;
    return multiplier * typeFactor * zoneFactor;
  }, 1);
}

function getIncidentQueueDrainMultiplier(facility) {
  return state.world.incidentQueue.reduce((multiplier, incident) => {
    const typeFactor = incident.queueDrainMultipliers?.[facility.type] || 1;
    return multiplier * typeFactor;
  }, 1);
}

function profileIsVisitorFavorite(visitor, facilityType) {
  const profile = visitorArchetypes.find((item) => item.id === visitor.profileId);
  return Boolean(profile && profile.favoriteTypes.includes(facilityType));
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
  if (!isTownWalkwayTile(col, row)) {
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

function getPrimaryEntranceTile(facility) {
  const entrances = getFacilityEntranceTiles(facility, { includeFallback: true });
  if (!entrances.length) {
    return null;
  }
  const facilityCenterCol = facility.col + (facility.width - 1) / 2;
  const facilityCenterRow = facility.row + (facility.height - 1) / 2;
  const sidePriority = { front: 0, left: 1, right: 1 };
  return (
    [...entrances].sort((a, b) => {
      const sideDelta =
        (sidePriority[a.side] ?? 2) - (sidePriority[b.side] ?? 2);
      if (sideDelta !== 0) {
        return sideDelta;
      }
      const aDistance =
        Math.abs(a.col - facilityCenterCol) + Math.abs(a.row - facilityCenterRow);
      const bDistance =
        Math.abs(b.col - facilityCenterCol) + Math.abs(b.row - facilityCenterRow);
      return aDistance - bDistance;
    })[0] || entrances[0]
  );
}

function getFacilityQueueLaneTiles(facility, maxSlots = getFacilityQueueCapacity(facility)) {
  const entrance = getPrimaryEntranceTile(facility);
  if (!entrance) {
    return [];
  }
  const direction =
    entrance.side === "left"
      ? { dc: -1, dr: 0 }
      : entrance.side === "right"
        ? { dc: 1, dr: 0 }
        : { dc: 0, dr: 1 };
  const lane = [];
  for (let offset = 0; offset < maxSlots; offset += 1) {
    const col = entrance.col + direction.dc * offset;
    const row = entrance.row + direction.dr * offset;
    if (!isWalkableTile(col, row)) {
      break;
    }
    lane.push({ col, row, side: entrance.side });
  }
  return lane;
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

function buildFacilityPath(startTile, facility) {
  const approachTiles = getApproachTiles(facility, { includeFallback: true });
  if (!approachTiles.length) {
    return null;
  }
  return findGridPath(startTile, approachTiles);
}

function chooseWeightedFacility(facilities, profile) {
  const weights = facilities.map((facility) => {
    const queuedVisitors = state.visitors.filter(
      (visitor) => visitor.targetFacilityId === facility.id,
    ).length;
    const popularity = getFacilityPopularity(facility);
    const preference = getVisitorPreferenceScore(profile, facility);
    const novelty = Math.max(0, 6 - facility.visits);
    const queuePressure = getFacilityQueueLoad(facility) + queuedVisitors * 0.8;
    const favoriteBias = profile.favoriteTypes.includes(facility.type) ? 2.8 : 0;
    const crowdTolerance = profile.favoriteTypes.includes(facility.type) ? 0.72 : 1.08;
    const weight =
      Math.pow(Math.max(3, popularity + preference + novelty + favoriteBias), 1.18) *
        (0.92 + Math.random() * 0.24) -
      queuePressure * 1.2 * crowdTolerance;
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

function getRoadSpawnCol(kind = "center", referenceCol = Math.floor(layout.cols / 2)) {
  const options = [
    { kind: "left", col: 2 },
    { kind: "center", col: 6 },
    { kind: "right", col: 11 },
  ];
  if (kind === "auto") {
    return (
      [...options].sort(
        (a, b) => Math.abs(a.col - referenceCol) - Math.abs(b.col - referenceCol),
      )[0] || options[1]
    );
  }
  return options.find((option) => option.kind === kind) || options[1];
}

function getRoadPoint(kind, referenceCol = Math.floor(layout.cols / 2)) {
  const spawn = getRoadSpawnCol(kind === "center" ? "auto" : kind, referenceCol);
  const anchorX = layout.gridX + spawn.col * layout.tile + layout.tile / 2;
  switch (kind) {
    case "left":
      return { x: anchorX - 10, y: layout.roadY + 30, kind };
    case "right":
      return { x: anchorX + 10, y: layout.roadY + 30, kind };
    default:
      return { x: anchorX, y: layout.roadY + 30, kind: spawn.kind };
  }
}

function buildVisitorRoute(facility) {
  const bestEntrance = getPrimaryEntranceTile(facility);
  if (!bestEntrance) {
    return null;
  }
  const entryKinds = shuffleArray(["left", "center", "right"]);
  let selected = null;
  for (const entryKind of entryKinds) {
    const spawn = getRoadSpawnCol(entryKind, bestEntrance.col);
    const roadStartTile = { col: spawn.col, row: layout.rows - 1 };
    const path = buildFacilityPath(roadStartTile, facility);
    if (!path) {
      continue;
    }
    if (!selected || path.length < selected.path.length) {
      selected = { entryKind: spawn.kind, roadStartTile, path };
    }
  }
  if (!selected) {
    return null;
  }
  const exitKinds = ["left", "center", "right"].filter((kind) => kind !== selected.entryKind);
  const exitKind = exitKinds[Math.floor(Math.random() * exitKinds.length)] || "center";
  return {
    approachTile: selected.path[selected.path.length - 1],
    path: selected.path,
    roadEntry: getRoadPoint(selected.entryKind, selected.roadStartTile.col),
    roadExit: getRoadPoint(exitKind, selected.roadStartTile.col),
  };
}

function buildLandmarkOriginRoute(facility, profile) {
  const favoredLandmarks = shuffleArray(
    listLandmarks().filter((landmark) =>
      profile.favoredLandmarks.includes(landmark.type),
    ),
  );
  for (const landmark of favoredLandmarks) {
    const originTile = getPrimaryEntranceTile(landmark);
    if (!originTile) {
      continue;
    }
    const path = buildFacilityPath(originTile, facility);
    if (!path) {
      continue;
    }
    const exitKinds = ["left", "center", "right"];
    const exitKind = (pickRandom(exitKinds) || "center");
    return {
      path,
      originKind: "landmark",
      originLandmarkId: landmark.id,
      originLandmarkType: landmark.type,
      spawnTile: path[0],
      approachTile: path[path.length - 1],
      roadExit: getRoadPoint(exitKind, originTile.col),
    };
  }
  return null;
}

function chooseErrandLandmark(profile, preferredLandmarkId = null) {
  const landmarks = listLandmarks().filter((landmark) =>
    profile.favoredLandmarks.includes(landmark.type),
  );
  if (!landmarks.length) {
    return null;
  }
  if (preferredLandmarkId) {
    const preferred = landmarks.find((landmark) => landmark.id === preferredLandmarkId);
    if (preferred && Math.random() < 0.68) {
      return preferred;
    }
  }
  return landmarks[Math.floor(Math.random() * landmarks.length)] || landmarks[0];
}

function buildLandmarkErrandRoute(startTile, landmarkId) {
  const landmark = getFacilityById(landmarkId);
  if (!landmark) {
    return null;
  }
  const path = buildFacilityPath(startTile, landmark);
  if (!path) {
    return null;
  }
  return {
    landmark,
    path,
    approachTile: path[path.length - 1],
  };
}

function getLandmarkStayDuration(landmarkType) {
  const base = simulationTuning.visitorWait;
  switch (landmarkType) {
    case "clinic":
      return base * 2.8;
    case "library":
      return base * 3.2;
    case "workshop":
      return base * 2.4;
    case "post":
      return base * 1.9;
    case "police":
      return base * 1.7;
    default:
      return base * 2;
  }
}

function completeLandmarkErrand(visitor) {
  const landmark = getFacilityById(visitor.errandLandmarkId);
  if (!landmark) {
    return;
  }
  landmark.landmarkVisits = (landmark.landmarkVisits || 0) + 1;
  noteLandmarkVisit(landmark);
  maybeActivateLandmarkSpotlight(landmark);
  const landmarkName = getStructureDef(landmark.type)?.name || "默认建筑";
  incrementQuarterCounter(state.quarterStats?.landmarkVisits, landmarkName, 1);
  const payload = getLandmarkCompletionPayload(visitor, landmark.type);
  if ((visitor.emoteCooldown || 0) <= 0) {
    setVisitorEmote(visitor, payload.emote, 1.6 + Math.random() * 0.6);
  }
  visitor.errandBadge = {
    type: payload.badgeType,
    ttl: 3.2 + Math.random() * 1,
  };
  state.floaters.push({
    x: visitor.x,
    y: visitor.y - 14,
    text: payload.floaterText,
    color: payload.color,
    ttl: 1.8,
  });
  if (Math.random() < 0.42) {
    pushMessage(`${payload.resultText}，从 ${landmarkName} 出来了。`);
  }
  if (!state.activeDialogue || state.dialogueCooldown <= 0 || Math.random() < 0.24) {
    openDialogueForSpeaker(
      "visitor",
      visitor.id,
      visitor.profileLabel || "顾客",
      payload.dialogue,
      "landmark-finish",
      3.2,
    );
  }
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
    if (!isBuildLotTile(tile.col, tile.row)) {
      return {
        ok: false,
        reason: "建筑只能贴着规划街区的店面地块摆放。",
      };
    }
    if (state.grid[tile.row][tile.col]) {
      return {
        ok: false,
        reason: "地块被占了，得先挪开现有设施。",
      };
    }
  }
  const probe = { col, row, width: w, height: h };
  if (!getApproachTiles(probe, { includeFallback: true }).length) {
    return {
      ok: false,
      reason: "这家店没有可用门口，顾客没法靠近。",
    };
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

function getSidebarPanelHeights(totalContentHeight, specs) {
  const minTotal = specs.reduce((sum, spec) => sum + spec.minHeight, 0);
  if (totalContentHeight <= minTotal) {
    const scaled = specs.map((spec) =>
      Math.max(28, Math.floor((spec.minHeight / minTotal) * totalContentHeight)),
    );
    let allocated = scaled.reduce((sum, value) => sum + value, 0);
    let index = scaled.length - 1;
    while (allocated > totalContentHeight && index >= 0) {
      if (scaled[index] > 28) {
        scaled[index] -= 1;
        allocated -= 1;
      } else {
        index -= 1;
      }
    }
    return scaled;
  }
  const extra = totalContentHeight - minTotal;
  const weightTotal = specs.reduce((sum, spec) => sum + spec.weight, 0) || 1;
  const heights = specs.map((spec) => spec.minHeight);
  let remaining = extra;
  specs.forEach((spec, index) => {
    if (index === specs.length - 1) {
      heights[index] += remaining;
      return;
    }
    const bonus = Math.floor((extra * spec.weight) / weightTotal);
    heights[index] += bonus;
    remaining -= bonus;
  });
  return heights;
}

function getSidebarPanelLayout(startY, endY) {
  const specs = [
    { id: "goal", minHeight: 34, weight: 0.7 },
    { id: "pulse", minHeight: 42, weight: 1 },
    { id: "routines", minHeight: 44, weight: 0.9 },
    { id: "notes", minHeight: 60, weight: 1.5 },
  ];
  const titleHeight = 16;
  const sectionGap = 8;
  const totalContentHeight = Math.max(
    0,
    endY - startY - specs.length * titleHeight - (specs.length - 1) * sectionGap,
  );
  const heights = getSidebarPanelHeights(totalContentHeight, specs);
  const panels = {};
  let cursorY = startY;
  specs.forEach((spec, index) => {
    const contentHeight = heights[index];
    panels[spec.id] = {
      titleY: cursorY + 13,
      boxY: cursorY + titleHeight,
      boxH: contentHeight,
    };
    cursorY += titleHeight + contentHeight + sectionGap;
  });
  return panels;
}

function getSidebarUILayout() {
  const cardX = layout.sidebarX + 22;
  const cardW = layout.sidebarW - 44;
  const header = {
    x: layout.sidebarX + 18,
    y: layout.sidebarY + 18,
    w: layout.sidebarW - 36,
    h: 146,
  };
  const facilitiesTitleY = header.y + header.h + 22;
  const observeRect = {
    x: cardX,
    y: facilitiesTitleY + 7,
    w: cardW,
    h: 30,
  };
  const facilityCards = facilityTypes.map((_, index) => ({
    x: cardX,
    y: observeRect.y + observeRect.h + 8 + index * 42,
    w: cardW,
    h: 40,
  }));
  const facilityBottom =
    facilityCards.length > 0
      ? facilityCards[facilityCards.length - 1].y + facilityCards[facilityCards.length - 1].h
      : observeRect.y + observeRect.h;
  const lowerStartY = facilityBottom + 14;
  const panels = getSidebarPanelLayout(lowerStartY, layout.sidebarY + layout.sidebarH - 16);
  return {
    header,
    facilitiesTitleY,
    observeRect,
    facilityCards,
    lowerStartY,
    panels,
  };
}

function getObserveCardRect() {
  return getSidebarUILayout().observeRect;
}

function getFacilityCardRect(index) {
  return getSidebarUILayout().facilityCards[index];
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
  const incidentEffects = state.world.incidentQueue.map(
    (incident) => incident.facilityBonuses?.[facility.type] || {},
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
  for (const incidentEffect of incidentEffects) {
    effect.income += incidentEffect.income || 0;
    effect.rating += incidentEffect.rating || 0;
    effect.pop += incidentEffect.pop || 0;
  }
  for (const incident of state.world.incidentQueue) {
    if (incident.id === "incident-roadwork-detour" && incidentAffectsFacilityZone(incident, facility)) {
      effect.pop -= 4;
    }
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
  for (const [landmarkType, rhythm] of Object.entries(landmarkRhythmDefinitions)) {
    const facilityDelta = rhythm.facilityBias?.[facility.type] || 0;
    if (facilityDelta) {
      score += facilityDelta * getLandmarkRoutineScale(landmarkType);
    }
  }
  score += getIncidentFacilityPreferenceDelta(facility);
  return score;
}

function getFacilityPopularity(facility) {
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility);
  const worldBonus = getWorldFacilityBonus(facility);
  const queueLoad = getFacilityQueueLoad(facility);
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

function getFacilityCrowdScore(facility) {
  return (
    getFacilityQueueLoad(facility) +
    Math.min(2.4, facility.crowdHeat || 0) +
    Math.min(2, (facility.turnaways || 0) * 0.22) +
    Math.min(1.4, (facility.patienceLeaves || 0) * 0.18)
  );
}

function getFacilityCrowdState(facility) {
  const queueCount = facility.queue.length;
  const queueCapacity = getFacilityQueueCapacity(facility);
  const crowdScore = getFacilityCrowdScore(facility);
  if (queueCount >= queueCapacity && queueCapacity > 0) {
    return {
      id: "overflow",
      shortLabel: `FULL ${queueCount}`,
      pulseText: `${getFacilityDef(facility.type).name} 已爆满，已劝退 ${facility.turnaways || 0} 人。`,
      badgeColor: "#c44d2f",
      accent: "#ff9d7a",
    };
  }
  if (crowdScore >= 4.6) {
    return {
      id: "packed",
      shortLabel: `Q${queueCount} / Packed`,
      pulseText: `${getFacilityDef(facility.type).name} 门口已经堆起人潮，排队 ${queueCount} 人。`,
      badgeColor: "#d57a37",
      accent: "#ffd27a",
    };
  }
  if (crowdScore >= 2.5) {
    return {
      id: "busy",
      shortLabel: `Q${queueCount} / Busy`,
      pulseText: `${getFacilityDef(facility.type).name} 正在接客，队伍推进得有点紧。`,
      badgeColor: "#4066b1",
      accent: "#9dc3ff",
    };
  }
  if (crowdScore >= 1.1) {
    return {
      id: "warming",
      shortLabel: serviceBusyLabel(facility, queueCount),
      pulseText: `${getFacilityDef(facility.type).name} 门口开始聚人，热度正在抬头。`,
      badgeColor: "#4f6b3f",
      accent: "#c5e39a",
    };
  }
  return {
    id: "calm",
    shortLabel: serviceBusyLabel(facility, queueCount),
    pulseText: `${getFacilityDef(facility.type).name} 目前出客平稳。`,
    badgeColor: "#4f6b3f",
    accent: "#c5e39a",
  };
}

function serviceBusyLabel(facility, queueCount) {
  return queueCount > 0
    ? `Q${queueCount}${facility.activeServiceId ? " / Busy" : ""}`
    : facility.activeServiceId
      ? "Busy"
      : "Open";
}

function noteFacilityCrowd(facility, heatBoost = 0.6) {
  if (!facility) {
    return;
  }
  facility.peakQueue = Math.max(facility.peakQueue || 0, facility.queue.length);
  facility.crowdHeat = Math.min(6, (facility.crowdHeat || 0) + heatBoost);
}

function updateFacilityCrowding(delta) {
  for (const facility of listFacilities()) {
    const load = getFacilityQueueLoad(facility);
    const targetHeat =
      load * 0.58 +
      Math.min(1.4, (facility.turnaways || 0) * 0.08) +
      Math.min(1.1, (facility.patienceLeaves || 0) * 0.06);
    facility.crowdHeat += (targetHeat - facility.crowdHeat) * Math.min(1, delta * 1.8);
    facility.crowdHeat = Math.max(0, Math.min(6, facility.crowdHeat));
    facility.peakQueue = Math.max(facility.peakQueue || 0, facility.queue.length);
  }
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
  refreshIncidentQueueForCurrentFacilities();
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
  refreshIncidentQueueForCurrentFacilities();
}

function getVisitorSpawnDelay() {
  const hottestFacility = listFacilities().reduce((best, facility) => {
    if (!best) {
      return facility;
    }
    return getFacilityPopularity(facility) > getFacilityPopularity(best)
      ? facility
      : best;
  }, null);
  const hotspotBoost = hottestFacility
    ? Math.min(1.7, 1 + Math.max(0, getFacilityPopularity(hottestFacility) - 12) * 0.03)
    : 1;
  const rawDelay =
    simulationTuning.spawnBaseDelay - state.day * simulationTuning.spawnDaySlope;
  return Math.max(
    simulationTuning.minSpawnDelay,
    rawDelay / Math.max(0.24, getTrafficModifier() * hotspotBoost),
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
    Math.min(4 + Math.floor(facility.level / 4), frontDepth + Math.max(0, facility.width - 1)),
  );
}

function getFacilityQueueLoad(facility) {
  return facility.queue.length + (facility.activeServiceId ? 1 : 0);
}

function getFacilityServiceDuration(facility) {
  const def = getFacilityDef(facility.type);
  const scale = def.serviceScale || 1.8;
  const levelBoost = 1 + Math.max(0, facility.level - 1) * 0.1;
  return (
    ((simulationTuning.visitorWait * scale) / levelBoost) *
    getIncidentServiceMultiplier(facility)
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
  visitor.emote = null;
  setVisitorTargetToFacility(visitor, facility);
  syncFacilityQueueTargets(facility);
}

function tryQueueVisitor(visitor, facility) {
  if (facility.activeServiceId === null && facility.queue.length === 0) {
    beginVisitorService(visitor, facility);
    return true;
  }
  const laneDepth = getFacilityQueueLaneTiles(facility).length;
  const maxQueue = Math.min(
    getFacilityQueueCapacity(facility),
    Math.max(laneDepth, visitor.path.length),
  );
  if (facility.queue.includes(visitor.id)) {
    syncFacilityQueueTargets(facility);
    return true;
  }
  if (facility.queue.length >= maxQueue) {
    facility.turnaways += 1;
    noteFacilityCrowd(facility, 1.35);
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
  noteFacilityCrowd(facility, 0.72);
  visitor.phase = "queueing";
  visitor.queuePatience =
    (6 +
      Math.random() * 4 +
      (profileIsVisitorFavorite(visitor, facility.type) ? 1.4 : 0)) *
    getIncidentQueuePatienceMultiplier(facility);
  visitor.emoteCooldown = 0;
  maybeTriggerQueueReaction(visitor, facility, 0.34);
  if (facility.queue.length >= 1) {
    triggerDialogue(
      "queue",
      { facilityName: getFacilityDef(facility.type).name },
      { chance: 0.3, speakerId: visitor.id },
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
  if (visitor.phase === "errand-going" || visitor.phase === "landmark-entering") {
    visitor.phase = "leaving-road";
    visitor.targetX = visitor.exitRoadX;
    visitor.targetY = visitor.exitRoadY;
    return;
  }
  if (visitor.phase === "public-spot-going" || visitor.phase === "public-spot-staying") {
    visitor.phase = "leaving";
    visitor.publicSpotId = null;
    visitor.publicSpotType = null;
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
    visitor.phase === "queue-wait" ||
    visitor.phase === "errand-going" ||
    visitor.phase === "public-spot-going"
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

function pickResidentProfileForArchetype(archetypeId, excludeIds = []) {
  if (archetypeId === "traveler") {
    return null;
  }
  const activeResidents = new Set(
    state.visitors
      .map((visitor) => visitor.residentProfileId)
      .filter(Boolean),
  );
  const candidates = residentProfiles.filter(
    (profile) =>
      profile.archetypeId === archetypeId &&
      !activeResidents.has(profile.id) &&
      !excludeIds.includes(profile.id),
  );
  if (!candidates.length || Math.random() > 0.66) {
    return null;
  }
  const weighted = candidates.map((profile) => {
    const partnerActive = profile.bonds.some((bond) =>
      state.visitors.some((visitor) => visitor.residentProfileId === bond.targetResidentId),
    );
    return { profile, weight: 1 + profile.socialAffinity + (partnerActive ? 0.9 : 0) };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.profile;
    }
  }
  return weighted[0]?.profile || null;
}

function buildVisitorSpawnPlan(profile, residentProfile = null, overrides = {}) {
  const facilities = listFacilities();
  if (!facilities.length) {
    return null;
  }
  const target =
    (overrides.targetFacilityId && getFacilityById(overrides.targetFacilityId)) ||
    chooseWeightedFacility(facilities, profile);
  if (!target) {
    return null;
  }
  const route =
    overrides.route ||
    ((Math.random() < getPublicSpotOriginChance(profile.id) &&
      buildPublicSpotOriginRoute(target, profile)) ||
      (Math.random() < 0.58 && buildLandmarkOriginRoute(target, profile)) ||
      buildVisitorRoute(target));
  if (!route) {
    return null;
  }
  const errandLandmark =
    overrides.errandLandmark === undefined
      ? Math.random() < 0.66
        ? chooseErrandLandmark(profile, route.originLandmarkId || null)
        : null
      : overrides.errandLandmark;
  return {
    profile,
    residentProfile,
    target,
    route,
    errandLandmark,
  };
}

function cloneRoute(route) {
  return {
    ...route,
    roadEntry: route.roadEntry ? { ...route.roadEntry } : null,
    roadExit: route.roadExit ? { ...route.roadExit } : null,
    approachTile: route.approachTile ? { ...route.approachTile } : null,
    path: route.path.map((tile) => ({ ...tile })),
  };
}

function createVisitorFromPlan(plan, options = {}) {
  const { companionAnchor = null, siblingResidentId = null } = options;
  const appearance = getVisitorAppearance(
    plan.profile.id,
    plan.residentProfile,
    state.nextVisitorId - 1,
  );
  const route = cloneRoute(plan.route);
  const firstTile = route.path[0];
  const firstCenter = getTileCenter(firstTile.col, firstTile.row);
  const startsOnTile = route.originKind === "landmark" || route.originKind === "public-spot";
  const nextPathIndex = startsOnTile ? Math.min(1, route.path.length - 1) : 0;
  const firstTargetTile = route.path[nextPathIndex];
  const firstTargetCenter = getTileCenter(firstTargetTile.col, firstTargetTile.row);
  const positionOffset = companionAnchor ? (state.nextVisitorId % 2 === 0 ? 10 : -10) : 0;
  const visitor = {
    id: state.nextVisitorId,
    x:
      (startsOnTile ? firstCenter.x : route.roadEntry.x) + positionOffset,
    y: startsOnTile ? firstCenter.y : route.roadEntry.y,
    speed: (52 + Math.random() * 16) * simulationTuning.visitorSpeedMultiplier,
    mood: "calm",
    emotionId: "calm",
    emotionSampleTimer: 0.4 + Math.random() * 0.6,
    moodBias: null,
    profileId: plan.profile.id,
    profileLabel: plan.profile.label,
    displayName: plan.residentProfile?.name || plan.profile.label,
    residentProfileId: plan.residentProfile?.id || null,
    socialAffinity: plan.residentProfile?.socialAffinity || 0.34 + Math.random() * 0.28,
    socialBonds: plan.residentProfile?.bonds?.map((bond) => ({ ...bond })) || [],
    socialCooldown: 4 + Math.random() * 3.5,
    ambientCooldown: 2.4 + Math.random() * 2.4,
    localPause: companionAnchor ? 0.5 + Math.random() * 0.3 : 0,
    socialGlowTtl: companionAnchor ? 2.8 + Math.random() * 1.2 : 0,
    hurryTtl: 0,
    siblingResidentId,
    targetFacilityId: plan.target.id,
    targetCol: plan.target.col,
    targetRow: plan.target.row,
    targetApproachCol: route.approachTile.col,
    targetApproachRow: route.approachTile.row,
    phase: startsOnTile ? "going" : "to-grid",
    wait: 0,
    appearance,
    path: route.path,
    pathIndex: nextPathIndex,
    queuePatience: 0,
    queueSlotIndex: 0,
    targetX:
      (startsOnTile ? firstTargetCenter.x : firstCenter.x) + positionOffset,
    targetY:
      startsOnTile ? firstTargetCenter.y : layout.roadY + 18,
    exitRoadX: route.roadExit.x,
    exitRoadY: route.roadExit.y,
    originLandmarkId: route.originLandmarkId || null,
    originLandmarkType: route.originLandmarkType || null,
    originPublicSpotId: route.originPublicSpotId || null,
    originPublicSpotType: route.originPublicSpotType || null,
    errandLandmarkId: plan.errandLandmark?.id || null,
    errandLandmarkType: plan.errandLandmark?.type || null,
    pendingErrandPath: null,
    pendingPublicSpotVisit: null,
    publicSpotId: null,
    publicSpotType: null,
    emote: null,
    emoteCooldown: 0.6 + Math.random() * 1.8,
    incidentPause: 0,
    errandBadge: null,
    serviceBadge: null,
    waveCooldown: 3.2 + Math.random() * 2.8,
    companionLeadId: companionAnchor?.id || null,
    companionPartnerId: companionAnchor?.id || null,
    companionOffsetX: companionAnchor ? positionOffset : 0,
    companionOffsetY: 0,
    companionWalkTtl: companionAnchor ? 2.8 + Math.random() * 1.2 : 0,
  };
  state.visitors.push(visitor);
  state.nextVisitorId += 1;
  return visitor;
}

function maybeSpawnBondCompanion(primaryVisitor, primaryPlan) {
  if (!primaryPlan.residentProfile?.bonds?.length || state.visitors.length >= 16) {
    return null;
  }
  const activeBond = primaryPlan.residentProfile.bonds.find((bond) =>
    bond.activeHours.includes(state.timeOfDay.id),
  );
  if (!activeBond || Math.random() > activeBond.closeness * 0.72) {
    return null;
  }
  if (getVisitorById(primaryVisitor.id)?.phase === "queue-wait") {
    return null;
  }
  if (state.visitors.some((visitor) => visitor.residentProfileId === activeBond.targetResidentId)) {
    return null;
  }
  const companionResident = getResidentProfileById(activeBond.targetResidentId);
  if (!companionResident) {
    return null;
  }
  const companionProfile =
    visitorArchetypes.find((item) => item.id === companionResident.archetypeId) || primaryPlan.profile;
  const companionPlan = buildVisitorSpawnPlan(companionProfile, companionResident, {
    targetFacilityId: primaryPlan.target.id,
    route: cloneRoute(primaryPlan.route),
    errandLandmark: primaryPlan.errandLandmark,
  });
  if (!companionPlan) {
    return null;
  }
  const companion = createVisitorFromPlan(companionPlan, {
    companionAnchor: primaryVisitor,
    siblingResidentId: primaryPlan.residentProfile.id,
  });
  primaryVisitor.siblingResidentId = companion.residentProfileId;
  primaryVisitor.companionPartnerId = companion.id;
  primaryVisitor.companionLeadId = primaryVisitor.id;
  primaryVisitor.companionOffsetX = primaryVisitor.companionOffsetX || 0;
  primaryVisitor.companionWalkTtl = Math.max(primaryVisitor.companionWalkTtl || 0, 3.2);
  companion.companionPartnerId = primaryVisitor.id;
  companion.companionLeadId = primaryVisitor.id;
  setVisitorMoodBias(primaryVisitor, "happy", 5.4);
  setVisitorMoodBias(companion, "happy", 5.4);
  return companion;
}

function spawnVisitor() {
  const facilities = listFacilities();
  if (!facilities.length) {
    return;
  }
  const profile = pickVisitorArchetype();
  const residentProfile = pickResidentProfileForArchetype(profile.id);
  const plan = buildVisitorSpawnPlan(profile, residentProfile);
  if (!plan) {
    return;
  }
  const visitor = createVisitorFromPlan(plan);
  if (visitor.residentProfileId) {
    maybeSpawnBondCompanion(visitor, plan);
  }
}

function visitFacility(visitor) {
  const facility = getFacilityById(visitor.targetFacilityId);
  if (!facility) {
    startVisitorLeaving(visitor);
    return null;
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
  if (state.quarterStats) {
    state.quarterStats.revenue += income;
    state.quarterStats.visitorsServed += 1;
    incrementQuarterCounter(state.quarterStats.facilityVisits, def.name, 1);
    if (bonus.names.length) {
      recordQuarterEvent(`${def.name} 这季多次触发联动，街区组合开始成形。`, `combo:${def.name}`);
    }
  }
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
  const feedback = applyShopVisitFeedback(visitor, facility.type);
  pushMessage(`${def.name} 接待顾客，收入 +${income}G。`);
  if (state.servedVisitors % 3 === 0) {
    triggerDialogue("service", { facilityName: def.name }, { chance: 0.18, speakerId: visitor.id });
  }
  syncFacilityQueueTargets(facility);
  checkUnlockAnnouncements();
  evaluateGoals();
  return feedback;
}

function planVisitorErrandAfterService(visitor) {
  if (!visitor.errandLandmarkId) {
    return null;
  }
  const landmark = getFacilityById(visitor.errandLandmarkId);
  if (!landmark) {
    return null;
  }
  const shopExitTile = visitor.path[visitor.path.length - 1];
  const route = buildLandmarkErrandRoute(shopExitTile, landmark.id);
  if (!route) {
    return null;
  }
  return route;
}

function updateVisitors(delta) {
  for (const visitor of state.visitors) {
    visitor.emoteCooldown = Math.max(0, (visitor.emoteCooldown || 0) - delta);
    visitor.incidentPause = Math.max(0, (visitor.incidentPause || 0) - delta);
    visitor.socialCooldown = Math.max(0, (visitor.socialCooldown || 0) - delta);
    visitor.waveCooldown = Math.max(0, (visitor.waveCooldown || 0) - delta);
    visitor.ambientCooldown = Math.max(0, (visitor.ambientCooldown || 0) - delta);
    visitor.localPause = Math.max(0, (visitor.localPause || 0) - delta);
    visitor.companionWalkTtl = Math.max(0, (visitor.companionWalkTtl || 0) - delta);
    if (visitor.errandBadge) {
      visitor.errandBadge.ttl -= delta;
      if (visitor.errandBadge.ttl <= 0) {
        visitor.errandBadge = null;
      }
    }
    if (visitor.serviceBadge) {
      visitor.serviceBadge.ttl -= delta;
      if (visitor.serviceBadge.ttl <= 0) {
        visitor.serviceBadge = null;
      }
    }
    if (visitor.emote) {
      visitor.emote.ttl -= delta;
      if (visitor.emote.ttl <= 0) {
        visitor.emote = null;
      }
    }
    updateVisitorEmotionState(visitor, delta);
    if (isVisitorMovingPhase(visitor)) {
      if (
        (visitor.phase === "to-grid" ||
          visitor.phase === "going" ||
          visitor.phase === "queueing" ||
          visitor.phase === "entering") &&
        !getFacilityById(visitor.targetFacilityId)
      ) {
        startVisitorLeaving(visitor);
      }
      if (
        (visitor.incidentPause > 0 || visitor.localPause > 0) &&
        visitor.phase !== "queueing" &&
        visitor.phase !== "queue-wait"
      ) {
        continue;
      }
      const companionTarget = getCompanionMoveTarget(visitor);
      if (companionTarget) {
        const followDx = companionTarget.x - visitor.x;
        const followDy = companionTarget.y - visitor.y;
        const followDist = Math.hypot(followDx, followDy);
        if (followDist >= 2) {
          const followMove = Math.min(followDist, getVisitorMoveSpeed(visitor) * delta);
          visitor.x += (followDx / followDist) * followMove;
          visitor.y += (followDy / followDist) * followMove;
        }
        continue;
      }
      if (shouldPauseForTrafficSignal(visitor)) {
        if (
          (visitor.emoteCooldown || 0) <= 0 &&
          Math.random() < 0.08 &&
          state.trafficSignal.phase === "drive"
        ) {
          setVisitorEmote(visitor, "dots", 0.85);
        }
        continue;
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
        } else if (visitor.phase === "errand-going") {
          if (visitor.pathIndex < visitor.path.length - 1) {
            visitor.pathIndex += 1;
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            const landmark = getFacilityById(visitor.errandLandmarkId);
            if (!landmark) {
              startVisitorLeaving(visitor);
              continue;
            }
            visitor.phase = "landmark-entering";
            setVisitorTargetToFacility(visitor, landmark);
          }
        } else if (visitor.phase === "public-spot-going") {
          if (visitor.pathIndex < visitor.path.length - 1) {
            visitor.pathIndex += 1;
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            const publicSpot = getFacilityById(visitor.publicSpotId);
            if (!publicSpot) {
              startVisitorLeaving(visitor);
              continue;
            }
            const payload = getPublicSpotVisitPayload(publicSpot.type);
            visitor.phase = "public-spot-staying";
            visitor.wait = getPublicSpotStayDuration(publicSpot.type);
            setVisitorMoodBias(visitor, payload.moodId, 4.2);
            notePublicSpotVisit(publicSpot);
            if ((visitor.emoteCooldown || 0) <= 0) {
              setVisitorEmote(visitor, payload.emote, 1.05 + Math.random() * 0.55);
            }
            state.floaters.push({
              x: visitor.x,
              y: visitor.y - 14,
              text: payload.floaterText,
              color: payload.color,
              ttl: 1.6,
            });
            if (Math.random() < 0.34) {
              speakAsVisitor(visitor, payload.dialogue, "public-spot", 3.1);
            }
          }
        } else if (visitor.phase === "queueing") {
          visitor.phase = "queue-wait";
        } else if (visitor.phase === "entering") {
          const facility = getFacilityById(visitor.targetFacilityId);
          visitor.phase = "inside";
          setVisitorMoodBias(visitor, "happy", 4.2);
          visitor.wait = facility
            ? getFacilityServiceDuration(facility)
            : simulationTuning.visitorWait;
        } else if (visitor.phase === "landmark-entering") {
          visitor.phase = "landmark-inside";
          visitor.wait = getLandmarkStayDuration(visitor.errandLandmarkType);
          if (Math.random() < 0.24) {
            const landmarkName =
              getStructureDef(visitor.errandLandmarkType)?.name || "默认建筑";
            pushMessage(
              `${getVisitorDisplayName(visitor)} 进了 ${landmarkName}${getLandmarkErrandLabel(
                visitor.errandLandmarkType,
                visitor.profileId,
              )}。`,
            );
          }
        } else if (visitor.phase === "exiting") {
          if (visitor.pendingPublicSpotVisit?.path?.length) {
            visitor.path = visitor.pendingPublicSpotVisit.path;
            visitor.publicSpotId = visitor.pendingPublicSpotVisit.publicSpot.id;
            visitor.publicSpotType = visitor.pendingPublicSpotVisit.publicSpot.type;
            visitor.pendingPublicSpotVisit = null;
            visitor.pathIndex = Math.min(1, visitor.path.length - 1);
            if (visitor.path.length > 1) {
              visitor.phase = "public-spot-going";
              setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
            } else {
              const publicSpot = getFacilityById(visitor.publicSpotId);
              if (!publicSpot) {
                startVisitorLeaving(visitor);
                continue;
              }
              const payload = getPublicSpotVisitPayload(publicSpot.type);
              visitor.phase = "public-spot-staying";
              visitor.wait = getPublicSpotStayDuration(publicSpot.type);
              setVisitorMoodBias(visitor, payload.moodId, 4.2);
              notePublicSpotVisit(publicSpot);
              if ((visitor.emoteCooldown || 0) <= 0) {
                setVisitorEmote(visitor, payload.emote, 1.05 + Math.random() * 0.55);
              }
            }
          } else if (visitor.pendingErrandPath?.length) {
            visitor.path = visitor.pendingErrandPath;
            visitor.pendingErrandPath = null;
            visitor.pathIndex = Math.min(1, visitor.path.length - 1);
            if (visitor.path.length > 1) {
              visitor.phase = "errand-going";
              setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
            } else {
              const landmark = getFacilityById(visitor.errandLandmarkId);
              if (!landmark) {
                startVisitorLeaving(visitor);
                continue;
              }
              visitor.phase = "landmark-entering";
              setVisitorTargetToFacility(visitor, landmark);
            }
          } else {
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
        const move = Math.min(dist, getVisitorMoveSpeed(visitor) * delta);
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
      visitor.queuePatience -=
        delta * Math.max(0, getIncidentQueueDrainMultiplier(facility) - 1);
      if (visitor.queuePatience <= 2.4) {
        setVisitorMoodBias(visitor, "annoyed", 2.8);
      } else if (visitor.queuePatience <= 4.8) {
        setVisitorMoodBias(visitor, "bored", 2.2);
      }
      if (Math.random() < delta * 0.46) {
        maybeTriggerQueueReaction(visitor, facility, 0.18);
      }
      if (visitor.queuePatience <= 0) {
        removeVisitorFromFacilityQueue(facility, visitor.id);
        syncFacilityQueueTargets(facility);
        facility.patienceLeaves += 1;
        noteFacilityCrowd(facility, 0.9);
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
        const plannedPublicSpot =
          Math.random() < 0.42 ? planVisitorPublicSpotVisit(visitor) : null;
        const plannedErrand = plannedPublicSpot ? null : planVisitorErrandAfterService(visitor);
        visitFacility(visitor);
        visitor.pendingPublicSpotVisit = plannedPublicSpot;
        const approachTile = visitor.path[visitor.path.length - 1];
        visitor.pendingErrandPath = plannedErrand?.path || null;
        visitor.phase = "exiting";
        setVisitorTargetToTile(visitor, approachTile);
        if (plannedErrand && Math.random() < 0.28) {
          const landmarkName = getStructureDef(plannedErrand.landmark.type)?.name || "默认建筑";
          triggerDialogue(
            "errand",
            {
              landmarkName,
              profileLabel: visitor.profileLabel || "顾客",
              errandLabel: getLandmarkErrandLabel(
                plannedErrand.landmark.type,
                visitor.profileId,
              ),
            },
            { chance: 1, speakerId: visitor.id },
          );
        }
      }
    } else if (visitor.phase === "public-spot-staying") {
      visitor.wait -= delta;
      if (visitor.wait <= 0) {
        const publicSpotApproachTile = visitor.path[visitor.path.length - 1];
        visitor.publicSpotId = null;
        visitor.publicSpotType = null;
        const route = visitor.errandLandmarkId
          ? buildLandmarkErrandRoute(publicSpotApproachTile, visitor.errandLandmarkId)
          : null;
        if (route) {
          visitor.path = route.path;
          visitor.pathIndex = Math.min(1, visitor.path.length - 1);
          if (visitor.path.length > 1) {
            visitor.phase = "errand-going";
            setVisitorTargetToTile(visitor, visitor.path[visitor.pathIndex]);
          } else {
            const landmark = getFacilityById(visitor.errandLandmarkId);
            if (!landmark) {
              startVisitorLeaving(visitor);
              continue;
            }
            visitor.phase = "landmark-entering";
            setVisitorTargetToFacility(visitor, landmark);
          }
        } else {
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
        }
      }
    } else if (visitor.phase === "landmark-inside") {
      visitor.wait -= delta;
      if (visitor.wait <= 0) {
        completeLandmarkErrand(visitor);
        setVisitorMoodBias(visitor, "happy", 5.4);
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
  const previousCalendar = { ...state.world.calendar };
  const observerSnapshot = getObserverSnapshot();
  state.day += 1;
  state.rating += 2;
  state.dailyLandmarkStats = {};
  state.dailyLandmarkSpotlightIds = {};
  state.landmarkSpotlights = [];
  state.observerNotes.unshift(observerSnapshot);
  state.observerNotes = state.observerNotes.slice(0, 4);
  rebuildWorldForCurrentDay();
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
    recordQuarterEvent(
      `${state.world.activeFestival.name} 在 ${state.world.season.label} 把街区气氛推高了一截。`,
      `festival:${state.world.activeFestival.id}`,
    );
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
  if (state.world.incidentQueue.length) {
    const incident = state.world.incidentQueue[0];
    recordQuarterEvent(`${incident.title}：${incident.description}`, `incident:${incident.id}`);
    pushMessage(`${incident.title}：${incident.description}`);
    setEnvironmentNotice(`${incident.title}：${incident.description}`, incident.color, 4.6);
    triggerDialogue("incident", { incidentTitle: incident.title }, { chance: 0.28 });
    if (state.eventActors[0]) {
      triggerEventActorDialogue(state.eventActors[0], true);
    }
  }
  triggerDialogue("trend", { trendName: state.todayTrend.name }, { chance: 0.2 });
  triggerDialogue("weather", { weatherLabel: state.world.weather.label }, { chance: 0.18 });
  if (previousSeasonId !== state.world.season.id) {
    recordQuarterNote(observerSnapshot, `snapshot:${previousCalendar.dayOfYear}`);
    const finishedQuarterStats = state.quarterStats || createQuarterStatsState(previousCalendar);
    openQuarterReport(buildQuarterReport(finishedQuarterStats));
    state.quarterStats = createQuarterStatsState(state.world.calendar);
    triggerDialogue("season", { seasonLabel: state.world.season.label }, { chance: 0.32 });
  } else {
    triggerDialogue("day", { seasonLabel: state.world.season.label }, { chance: 0.12 });
  }
  checkUnlockAnnouncements();
  evaluateGoals();
}

function updateTrafficSignal(delta) {
  state.trafficSignal.timer -= delta;
  if (state.trafficSignal.timer > 0) {
    return;
  }
  state.trafficSignal.phase = getNextTrafficPhase(state.trafficSignal.phase);
  state.trafficSignal.timer = getTrafficPhaseDuration(state.trafficSignal.phase);
}

function update(delta) {
  state.cameraPulse += delta;
  updateDialogue(delta);
  if (state.quarterReport) {
    state.quarterReport.ttl = Math.max(0, (state.quarterReport.ttl || 0) - delta);
    if (state.quarterReport.ttl <= 0) {
      closeQuarterReport();
    }
  }
  if (state.mode !== "play") {
    updateRoadTraffic(delta);
    updateFloaters(delta);
    return;
  }
  updateEventActors(delta);
  updateTrafficSignal(delta);
  updateRoadTraffic(delta);

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

  updateStreetPickups(delta);
  updateVisitors(delta);
  updateVisitorAmbientLayer();
  updateFacilityCrowding(delta);
  updateFloaters(delta);
  state.visitorTalkTimer -= delta;
  if (state.visitorTalkTimer <= 0) {
    maybeTriggerVisitorThought();
    const queuePresent = state.visitors.some(
      (visitor) => visitor.phase === "queueing" || visitor.phase === "queue-wait",
    );
    state.visitorTalkTimer = queuePresent ? 4.5 + Math.random() * 2.2 : 7 + Math.random() * 4;
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
      return getFacilityCrowdScore(b) - getFacilityCrowdScore(a);
    })[0] || null
  );
}

function syncButtons() {
  startButton.disabled = state.mode === "play" || state.mode === "complete";
  restartButton.textContent = state.mode === "complete" ? "再开一轮" : "重新开档";
}

function getQuarterReportButtonRect() {
  return {
    x: 418,
    y: 698,
    w: 132,
    h: 34,
  };
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
        (width - 12) / sprite[0].length,
        (height - 12) / sprite.length,
      ),
    ),
  );
  const drawWidth = sprite[0].length * scale;
  const drawHeight = sprite.length * scale;
  const drawX = x + Math.max(4, Math.floor((width - drawWidth) / 2));
  const drawY = y + Math.max(2, Math.floor((height - drawHeight) / 2) - 2);
  drawSprite(sprite, palette, drawX, drawY, scale);
}

function drawPixelCloud(x, y, scale, alpha, variant = 0, weatherId = "sunny") {
  const template = pixelCloudTemplates[variant % pixelCloudTemplates.length];
  const light =
    weatherId === "drizzle" ? "#edf3fb" : weatherId === "snow" ? "#f8fbff" : "#fffaf0";
  const mid =
    weatherId === "drizzle" ? "#dbe6f3" : weatherId === "snow" ? "#e6f1fb" : "#eef5ff";
  const shade =
    weatherId === "drizzle" ? "#bccbdd" : weatherId === "snow" ? "#c9d9ea" : "#d6e6f2";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = shade;
  template.body.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(x + (bx + 1) * scale, y + (by + 2) * scale, bw * scale, bh * scale);
  });
  ctx.fillStyle = mid;
  template.body.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(x + bx * scale, y + (by + 1) * scale, bw * scale, bh * scale);
  });
  ctx.fillStyle = light;
  template.body.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(x + bx * scale, y + by * scale, bw * scale, bh * scale);
  });
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  template.highlight.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(x + bx * scale, y + by * scale, bw * scale, bh * scale);
  });
  ctx.restore();
}

function drawBird(x, y, scale = 2, color = "#4f4448") {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + scale, scale, scale);
  ctx.fillRect(x + scale, y, scale, scale);
  ctx.fillRect(x + scale * 2, y + scale, scale, scale);
}

function drawSkyTraffic(playfieldWidth) {
  if (state.timeOfDay.id !== "midnight") {
    const planeTravel = (state.cameraPulse * 20) % (playfieldWidth + 220);
    const planeX = playfieldWidth + 140 - planeTravel;
    const planeY = 86 + Math.sin(state.cameraPulse * 0.35) * 8;
    const planeAlpha =
      state.world.weather.id === "drizzle" ? 0.44 : state.world.weather.id === "cloudy" ? 0.62 : 0.86;
    ctx.save();
    ctx.globalAlpha = planeAlpha;
    ctx.fillStyle = "#fff9e9";
    ctx.fillRect(planeX, planeY + 3, 26, 4);
    ctx.fillRect(planeX + 7, planeY, 10, 3);
    ctx.fillRect(planeX + 9, planeY + 7, 8, 2);
    ctx.fillRect(planeX + 17, planeY + 2, 8, 2);
    ctx.fillStyle = "#c9d8e8";
    ctx.fillRect(planeX + 4, planeY + 4, 16, 2);
    if (state.world.activeFestival) {
      ctx.fillStyle = state.world.activeFestival.color;
      ctx.fillRect(planeX + 29, planeY + 3, 18, 2);
      ctx.fillRect(planeX + 47, planeY + 3, 4, 4);
    }
    ctx.restore();
  }

  const flockCount =
    state.world.weather.id === "drizzle" ? 1 : state.world.weather.id === "cloudy" ? 2 : 3;
  for (let flock = 0; flock < flockCount; flock += 1) {
    const speed = 32 + flock * 8;
    const span = playfieldWidth + 180;
    const leader = (state.cameraPulse * speed + flock * 140) % span;
    const baseX = leader - 90;
    const baseY = 98 + flock * 28 + Math.sin(state.cameraPulse * (0.9 + flock * 0.12)) * 6;
    for (let index = 0; index < 3 + flock; index += 1) {
      drawBird(
        Math.round(baseX - index * 14),
        Math.round(baseY + (index % 2 === 0 ? 0 : 4)),
        2,
        state.world.weather.id === "drizzle" ? "#66707d" : "#51474b",
      );
    }
  }
}

function drawRoadVehicle(x, y, scale, palette, type = "car") {
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + scale, y + scale * 7, scale * (type === "bus" ? 16 : type === "truck" ? 14 : 12), scale * 2);
  ctx.fillStyle = palette.body;
  if (type === "bus") {
    ctx.fillRect(x, y + scale * 2, scale * 18, scale * 5);
    ctx.fillRect(x + scale * 2, y, scale * 11, scale * 4);
  } else if (type === "truck") {
    ctx.fillRect(x, y + scale * 3, scale * 14, scale * 4);
    ctx.fillRect(x + scale * 9, y, scale * 5, scale * 4);
    ctx.fillRect(x + scale * 2, y + scale * 1, scale * 5, scale * 2);
  } else {
    ctx.fillRect(x, y + scale * 3, scale * 14, scale * 3);
    ctx.fillRect(x + scale * 3, y, scale * 8, scale * 4);
  }
  ctx.fillStyle = palette.roof;
  if (type === "bus") {
    ctx.fillRect(x + scale * 3, y + scale, scale * 10, scale * 2);
    ctx.fillRect(x + scale * 2, y + scale * 4, scale * 14, scale);
  } else if (type === "truck") {
    ctx.fillRect(x + scale, y + scale * 4, scale * 7, scale);
    ctx.fillRect(x + scale * 9, y + scale, scale * 3, scale * 2);
  } else {
    ctx.fillRect(x + scale * 3, y + scale, scale * 6, scale * 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  if (type === "bus") {
    ctx.fillRect(x + scale * 3, y + scale * 3, scale * 2, scale);
    ctx.fillRect(x + scale * 6, y + scale * 3, scale * 2, scale);
    ctx.fillRect(x + scale * 9, y + scale * 3, scale * 2, scale);
    ctx.fillRect(x + scale * 12, y + scale * 3, scale * 2, scale);
    ctx.fillRect(x + scale * 15, y + scale * 3, scale * 2, scale);
  } else if (type === "truck") {
    ctx.fillRect(x + scale * 10, y + scale, scale * 2, scale);
    ctx.fillRect(x + scale * 11, y + scale * 2, scale, scale);
  } else {
    ctx.fillRect(x + scale * 4, y + scale, scale * 2, scale);
    ctx.fillRect(x + scale * 8, y + scale, scale * 2, scale);
  }
  ctx.fillStyle = palette.trim;
  ctx.fillRect(x + scale * 2, y + scale * 7, scale * 2, scale * 2);
  ctx.fillRect(x + scale * 10, y + scale * 7, scale * 2, scale * 2);
  if (type === "bus") {
    ctx.fillRect(x + scale * 15, y + scale * 7, scale * 2, scale * 2);
  } else if (type === "truck") {
    ctx.fillRect(x + scale * 6, y + scale * 7, scale * 2, scale * 2);
  }
  ctx.fillStyle = "rgba(47, 34, 49, 0.26)";
  if (type === "bus") {
    ctx.fillRect(x + scale * 2, y + scale * 5, scale * 14, scale);
  } else if (type === "truck") {
    ctx.fillRect(x + scale * 2, y + scale * 5, scale * 10, scale);
  } else {
    ctx.fillRect(x + scale * 2, y + scale * 5, scale * 10, scale);
  }
}

function drawCentralCrossroadProps() {
  const signalColor =
    state.trafficSignal.phase === "walk"
      ? "#82dd77"
      : state.trafficSignal.phase === "blink"
        ? "#ffe17a"
        : "#ff8d73";
  const posts = [
    tileToScreen(4, 3),
    tileToScreen(8, 3),
    tileToScreen(4, 5),
    tileToScreen(8, 5),
  ];
  posts.forEach((pos, index) => {
    const x = pos.x + (index % 2 === 0 ? layout.tile - 12 : 8);
    const y = pos.y + (index < 2 ? layout.tile - 24 : 12);
    ctx.fillStyle = "#4f474f";
    ctx.fillRect(x, y, 4, 18);
    ctx.fillStyle = "#2f2231";
    ctx.fillRect(x - 3, y - 6, 10, 6);
    ctx.fillStyle = signalColor;
    ctx.fillRect(x, y - 4, 4, 3);
  });
}

function drawBusStop(x, y) {
  ctx.fillStyle = "#4f474f";
  ctx.fillRect(x, y - 18, 4, 20);
  ctx.fillStyle = "#6db7ff";
  ctx.fillRect(x - 4, y - 26, 12, 8);
  ctx.fillStyle = "#fff5d8";
  ctx.fillRect(x - 2, y - 24, 8, 4);
}

function drawMailBox(x, y) {
  ctx.fillStyle = "#d75f54";
  ctx.fillRect(x, y - 12, 10, 10);
  ctx.fillStyle = "#fff3d8";
  ctx.fillRect(x + 2, y - 10, 6, 2);
  ctx.fillStyle = "#6f4a44";
  ctx.fillRect(x + 3, y - 2, 4, 6);
}

function drawRoadCone(x, y) {
  ctx.fillStyle = "#ffb45f";
  ctx.fillRect(x + 2, y - 10, 4, 2);
  ctx.fillRect(x + 1, y - 8, 6, 4);
  ctx.fillRect(x, y - 4, 8, 4);
  ctx.fillStyle = "#fff6dc";
  ctx.fillRect(x + 1, y - 6, 6, 1);
}

function drawStreetSign(x, y, accent = "#6db7ff") {
  ctx.fillStyle = "#4f474f";
  ctx.fillRect(x + 4, y - 16, 3, 18);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y - 20, 12, 8);
  ctx.fillStyle = "#fff8de";
  ctx.fillRect(x + 2, y - 18, 8, 1);
}

function drawPuddle(x, y, width = 14) {
  ctx.fillStyle = "rgba(108, 171, 229, 0.28)";
  ctx.fillRect(x, y - 2, width, 4);
  ctx.fillStyle = "rgba(222, 244, 255, 0.36)";
  ctx.fillRect(x + 2, y - 1, Math.max(4, width - 6), 1);
}

function drawCanopy(x, y, width = 20, color = "#7fd7ff") {
  ctx.fillStyle = "#4f474f";
  ctx.fillRect(x + 2, y - 2, 2, 10);
  ctx.fillRect(x + width - 4, y - 2, 2, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 8, width, 6);
  ctx.fillStyle = "#fff8de";
  ctx.fillRect(x + 2, y - 6, width - 4, 2);
}

function drawLanternString(x, y, color = "#ff8cb1") {
  ctx.fillStyle = "#7f675f";
  ctx.fillRect(x, y, 28, 2);
  ctx.fillStyle = color;
  for (let index = 0; index < 4; index += 1) {
    ctx.fillRect(x + 3 + index * 7, y + 2, 4, 5);
  }
}

function drawSpeakerStand(x, y) {
  ctx.fillStyle = "#4f474f";
  ctx.fillRect(x + 4, y - 12, 3, 12);
  ctx.fillStyle = "#7fd7ff";
  ctx.fillRect(x, y - 18, 10, 7);
  ctx.fillStyle = "#2f2231";
  ctx.fillRect(x + 2, y - 16, 6, 3);
}

function drawSaleBoard(x, y, color = "#ff95bf") {
  ctx.fillStyle = "#7f675f";
  ctx.fillRect(x + 4, y - 12, 3, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 18, 12, 8);
  ctx.fillStyle = "#fff8de";
  ctx.fillRect(x + 2, y - 16, 8, 2);
}

function drawBench(x, y, tint = "#a77a54") {
  ctx.fillStyle = tint;
  ctx.fillRect(x, y - 8, 14, 4);
  ctx.fillRect(x + 2, y - 12, 10, 3);
  ctx.fillRect(x + 2, y - 4, 2, 5);
  ctx.fillRect(x + 10, y - 4, 2, 5);
}

function drawPlanter(x, y, bloom = "#f08ca6") {
  ctx.fillStyle = "#c79d6d";
  ctx.fillRect(x, y - 6, 10, 6);
  ctx.fillStyle = "#8c6942";
  ctx.fillRect(x + 1, y - 4, 8, 2);
  ctx.fillStyle = "#61b157";
  ctx.fillRect(x + 3, y - 12, 4, 6);
  ctx.fillStyle = bloom;
  ctx.fillRect(x + 1, y - 13, 2, 2);
  ctx.fillRect(x + 7, y - 13, 2, 2);
}

function drawParcelStack(x, y) {
  ctx.fillStyle = "#c9a071";
  ctx.fillRect(x, y - 8, 8, 8);
  ctx.fillRect(x + 6, y - 12, 10, 12);
  ctx.fillStyle = "#9f7450";
  ctx.fillRect(x + 2, y - 6, 4, 1);
  ctx.fillRect(x + 10, y - 8, 2, 6);
}

function drawWorkshopSmoke(x, y, drift) {
  const puff = Math.sin(drift) * 2;
  ctx.fillStyle = "rgba(238, 242, 248, 0.82)";
  ctx.fillRect(x, y + puff, 8, 4);
  ctx.fillRect(x + 4, y - 4 + puff, 6, 4);
  ctx.fillRect(x + 10, y - 8 + puff, 4, 4);
}

function drawStreetFurniture() {
  const activeIncidentId = state.world.incidentQueue[0]?.id || null;
  const festivalColor = state.world.activeFestival?.color || "#ff8cb1";
  const busStop = tileToScreen(1, 8);
  drawCanopy(
    busStop.x + 2,
    busStop.y + 16,
    28,
    state.world.weather.id === "drizzle" ? "#7fb9ff" : "#7fd7ff",
  );
  drawBusStop(busStop.x + 12, busStop.y + 22);
  drawBench(busStop.x + 8, busStop.y + 28, "#8c6c52");
  if (state.world.weather.id === "drizzle" || state.world.weather.id === "snow") {
    drawPuddle(busStop.x + 6, busStop.y + 34, 18);
  }
  if (state.world.activeFestival) {
    drawLanternString(busStop.x + 2, busStop.y + 2, festivalColor);
  }
  const mailbox = tileToScreen(0, 3);
  drawMailBox(mailbox.x + 12, mailbox.y + 40);
  const signEast = tileToScreen(9, 3);
  drawStreetSign(signEast.x + 12, signEast.y + 18, "#7fd7ff");
  const signSouth = tileToScreen(10, 8);
  drawStreetSign(signSouth.x + 22, signSouth.y + 38, "#ffd06d");
  const coneA = tileToScreen(4, 8);
  const coneB = tileToScreen(8, 8);
  drawRoadCone(coneA.x + 16, coneA.y + 44);
  drawRoadCone(coneB.x + 28, coneB.y + 44);
  if (activeIncidentId === "incident-roadwork-detour") {
    const detour = tileToScreen(7, 5);
    drawRoadCone(detour.x + 8, detour.y + 42);
    drawRoadCone(detour.x + 20, detour.y + 42);
    drawStreetSign(detour.x + 30, detour.y + 24, "#ffb45f");
  } else if (activeIncidentId === "incident-street-performance") {
    const stage = tileToScreen(8, 5);
    drawSpeakerStand(stage.x + 18, stage.y + 30);
    drawSpeakerStand(stage.x + 32, stage.y + 30);
  } else if (activeIncidentId === "incident-flash-sale") {
    const sale = tileToScreen(10, 3);
    drawSaleBoard(sale.x + 10, sale.y + 34, "#ff8cb1");
  } else if (activeIncidentId === "incident-health-inspection") {
    const inspect = tileToScreen(9, 5);
    drawStreetSign(inspect.x + 34, inspect.y + 22, "#efe0ff");
  }
}

function drawCat(x, y, body = "#5b4f53", accent = "#ffe8b0") {
  ctx.fillStyle = body;
  ctx.fillRect(x + 2, y - 6, 8, 5);
  ctx.fillRect(x + 4, y - 10, 5, 5);
  ctx.fillRect(x + 2, y - 12, 2, 2);
  ctx.fillRect(x + 7, y - 12, 2, 2);
  ctx.fillRect(x + 3, y - 1, 2, 4);
  ctx.fillRect(x + 7, y - 1, 2, 4);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 5, y - 8, 1, 1);
}

function drawDog(x, y, body = "#b88b57", accent = "#fff1c7") {
  ctx.fillStyle = body;
  ctx.fillRect(x + 1, y - 6, 10, 6);
  ctx.fillRect(x + 7, y - 10, 5, 5);
  ctx.fillRect(x + 2, y, 2, 4);
  ctx.fillRect(x + 8, y, 2, 4);
  ctx.fillRect(x, y - 5, 2, 2);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 8, y - 8, 1, 1);
}

function drawPigeon(x, y, tone = "#66707d") {
  ctx.fillStyle = tone;
  ctx.fillRect(x + 2, y - 3, 5, 3);
  ctx.fillRect(x + 5, y - 5, 3, 3);
  ctx.fillRect(x + 3, y, 1, 2);
  ctx.fillRect(x + 6, y, 1, 2);
}

function drawAmbientStreetLife() {
  const catBase = tileToScreen(2, 8);
  const wetWeather = state.world.weather.id === "drizzle" || state.world.weather.id === "snow";
  const catWalk = ((state.cameraPulse * 22) % 108);
  const catY = wetWeather ? catBase.y + 28 : catBase.y + 44;
  drawCat(catBase.x + 18 + catWalk, catY, wetWeather ? "#6b5e68" : "#63545e", "#ffeab5");

  const dogBase = tileToScreen(9, 5);
  const dogBob = Math.sin(state.cameraPulse * 1.8) * 1.5;
  drawDog(dogBase.x + 18, dogBase.y + (wetWeather ? 28 : 36) + dogBob, "#c08b56", "#fff0c8");
  if (wetWeather) {
    drawPuddle(dogBase.x + 12, dogBase.y + 38, 16);
  }

  if (!wetWeather) {
    const pigeonA = tileToScreen(5, 5);
    const pigeonB = tileToScreen(7, 5);
    drawPigeon(pigeonA.x + 18, pigeonA.y + 40 + Math.sin(state.cameraPulse * 2.4));
    drawPigeon(pigeonB.x + 26, pigeonB.y + 34 + Math.cos(state.cameraPulse * 2.1));
  }
}

function drawLandmarkOutdoorProps(facility, pos, width, height) {
  const frontY = pos.y + height + 4;
  const activeIncidentId = state.world.incidentQueue[0]?.id || null;
  const festivalColor = state.world.activeFestival?.color || "#ff8cb1";
  switch (facility.type) {
    case "clinic":
      if (state.world.weather.id === "drizzle" || state.world.weather.id === "snow") {
        drawCanopy(pos.x + 8, frontY - 8, 24, "#7fb9ff");
        drawPuddle(pos.x + 10, frontY + 6, 18);
      }
      drawStreetSign(pos.x + width - 18, pos.y + height - 6, "#ff8f93");
      drawPlanter(pos.x + 10, frontY, "#f08ca6");
      if (activeIncidentId === "incident-health-inspection") {
        drawSaleBoard(pos.x + width - 32, frontY + 4, "#efe0ff");
      }
      break;
    case "library":
      if (state.world.activeFestival) {
        drawLanternString(pos.x + 10, pos.y + height - 4, festivalColor);
      }
      drawBench(pos.x + 12, frontY, "#9c7b58");
      drawStreetSign(pos.x + width - 16, pos.y + height - 6, "#7da7ff");
      drawPlanter(pos.x + width - 28, frontY + 1, "#8fc8ff");
      break;
    case "post":
      if (state.world.weather.id === "drizzle") {
        drawCanopy(pos.x + width - 34, frontY - 8, 24, "#7fd7ff");
      }
      drawMailBox(pos.x + width - 18, frontY + 2);
      drawParcelStack(pos.x + 8, frontY + 2);
      if (state.world.activeFestival) {
        drawLanternString(pos.x + 10, pos.y + height - 6, festivalColor);
      }
      break;
    case "police":
      if (activeIncidentId === "incident-roadwork-detour") {
        drawStreetSign(pos.x + 12, frontY + 2, "#ffb45f");
      }
      drawRoadCone(pos.x + 8, frontY + 2);
      drawRoadCone(pos.x + 20, frontY + 2);
      drawStreetSign(pos.x + width - 18, pos.y + height - 4, "#6db7ff");
      break;
    case "workshop":
      drawParcelStack(pos.x + 10, frontY + 2);
      drawBench(pos.x + width - 30, frontY, "#8c6c52");
      drawWorkshopSmoke(pos.x + width - 34, pos.y + 12, state.cameraPulse * 2.1);
      if (state.world.weather.id === "drizzle") {
        drawPuddle(pos.x + 8, frontY + 8, 22);
      }
      break;
    default:
      break;
  }
}

function drawRoadTraffic(playfieldWidth) {
  state.roadTrafficVehicles.forEach((vehicle, index) => {
    const x = Math.round(vehicle.x);
    const idleBob = vehicle.stopped ? Math.sin(state.cameraPulse * 5 + vehicle.stopBounce) * 0.4 : 0;
    drawRoadVehicle(
      x,
      Math.round(vehicle.y + (index % 2) + idleBob),
      vehicle.scale,
      vehicle.palette,
      vehicle.type,
    );
    if (vehicle.stopped) {
      ctx.fillStyle = "rgba(255, 130, 120, 0.72)";
      const tailX = vehicle.dir > 0 ? vehicle.x + vehicle.scale : vehicle.x + getRoadVehicleLength(vehicle.type, vehicle.scale) - vehicle.scale * 2;
      ctx.fillRect(Math.round(tailX), Math.round(vehicle.y + vehicle.scale * 6), vehicle.scale, vehicle.scale);
      ctx.fillRect(Math.round(tailX), Math.round(vehicle.y + vehicle.scale * 7), vehicle.scale, vehicle.scale);
    }
    if (state.timeOfDay.id === "evening" || state.timeOfDay.id === "midnight") {
      ctx.fillStyle = "#ffe39f";
      const headlightX =
        vehicle.dir > 0
          ? x + vehicle.scale * (vehicle.type === "bus" ? 18 : vehicle.type === "truck" ? 14 : 14)
          : x - vehicle.scale;
      ctx.fillRect(headlightX, Math.round(vehicle.y + vehicle.scale * 4), vehicle.scale, vehicle.scale);
      ctx.fillRect(headlightX, Math.round(vehicle.y + vehicle.scale * 6), vehicle.scale, vehicle.scale);
    }
  });
}

function drawBottomCrosswalk(playfieldWidth) {
  const bounds = getBottomCrosswalkBounds();
  ctx.fillStyle = "#f6f1d1";
  for (let index = 0; index < 6; index += 1) {
    const x = bounds.x + index * 22;
    ctx.fillRect(x, layout.roadY + 4, 12, layout.roadH - 8);
  }
  ctx.fillStyle = "rgba(255, 246, 212, 0.4)";
  ctx.fillRect(bounds.x - 16, layout.roadY - 6, bounds.w + 30, 8);
  ctx.fillRect(bounds.x - 16, layout.roadY + layout.roadH - 2, bounds.w + 30, 6);
  ctx.fillStyle = "#6f6368";
  ctx.fillRect(bounds.x - 20, layout.roadY - 18, bounds.w + 38, 10);
  ctx.fillRect(bounds.x - 20, layout.roadY + layout.roadH + 6, bounds.w + 38, 6);
  ctx.fillStyle = "#c8bd9a";
  ctx.fillRect(bounds.x - 20, layout.roadY - 20, bounds.w + 38, 4);
}

function drawTrafficSignalPosts() {
  const bounds = getBottomCrosswalkBounds();
  const signalColor =
    state.trafficSignal.phase === "walk"
      ? "#82dd77"
      : state.trafficSignal.phase === "blink"
        ? "#ffe17a"
        : "#ff8d73";
  for (const x of [bounds.x - 28, bounds.x + bounds.w + 14]) {
    ctx.fillStyle = "#4f474f";
    ctx.fillRect(x, layout.roadY - 34, 6, 28);
    ctx.fillRect(x, layout.roadY + layout.roadH + 2, 6, 20);
    ctx.fillStyle = "#2f2231";
    ctx.fillRect(x - 4, layout.roadY - 42, 14, 12);
    ctx.fillRect(x - 4, layout.roadY + layout.roadH + 2, 14, 12);
    ctx.fillStyle = signalColor;
    ctx.fillRect(x, layout.roadY - 38, 6, 4);
    ctx.fillRect(x, layout.roadY + layout.roadH + 6, 6, 4);
  }
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

  const cloudBands = [
    {
      speed: 7,
      y: 108,
      alpha: state.world.weather.id === "drizzle" ? 0.68 : 0.56,
      clouds: [
        { x: 82, scale: 4, variant: 0 },
        { x: 252, scale: 3, variant: 1 },
        { x: 438, scale: 4, variant: 2 },
        { x: 648, scale: 4, variant: 1 },
      ],
    },
    {
      speed: 4,
      y: 150,
      alpha: state.world.weather.id === "drizzle" ? 0.54 : 0.42,
      clouds: [
        { x: 148, scale: 3, variant: 2 },
        { x: 372, scale: 3, variant: 0 },
        { x: 610, scale: 3, variant: 1 },
      ],
    },
  ];
  for (const band of cloudBands) {
    const drift = (state.cameraPulse * band.speed) % (playfieldWidth + 220);
    for (const cloud of band.clouds) {
      const baseX = cloud.x + drift - 120;
      for (const wrapOffset of [0, -(playfieldWidth + 240)]) {
        const drawX = baseX + wrapOffset;
        drawPixelCloud(drawX, band.y, cloud.scale, band.alpha, cloud.variant, state.world.weather.id);
      }
    }
  }

  drawSkyTraffic(playfieldWidth);

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
  ctx.fillStyle = "rgba(255, 244, 198, 0.68)";
  ctx.fillRect(0, layout.gridY - 4, playfieldWidth, 6);
  ctx.fillStyle = "rgba(145, 170, 97, 0.32)";
  ctx.fillRect(0, layout.gridY + layout.rows * layout.tile - 10, playfieldWidth, 10);

  ctx.fillStyle = "#72606a";
  ctx.fillRect(0, layout.roadY, playfieldWidth, layout.roadH);
  ctx.fillStyle = "#544954";
  ctx.fillRect(0, layout.roadY - 6, playfieldWidth, 6);
  ctx.fillStyle = "#85777f";
  ctx.fillRect(0, layout.roadY + layout.roadH / 2 - 2, playfieldWidth, 4);
  ctx.fillStyle = "#8d7f87";
  ctx.fillRect(0, layout.roadY + 6, playfieldWidth, 2);
  ctx.fillRect(0, layout.roadY + layout.roadH - 8, playfieldWidth, 2);
  ctx.fillStyle = "#f7f0b3";
  for (let x = 20; x < playfieldWidth; x += 76) {
    if (x > getBottomCrosswalkBounds().x - 24 && x < getBottomCrosswalkBounds().x + getBottomCrosswalkBounds().w + 20) {
      continue;
    }
    ctx.fillRect(x, layout.roadY + 28, 28, 4);
  }
  drawBottomCrosswalk(playfieldWidth);
  drawRoadTraffic(playfieldWidth);
  drawTrafficSignalPosts();

  const treePalette =
    state.world.season.id === "winter"
      ? { top: "#d7ebf5", trunk: "#7b675f" }
      : state.world.season.id === "autumn"
        ? { top: "#ffbf66", trunk: "#7d5638" }
        : state.world.season.id === "summer"
          ? { top: "#79c861", trunk: "#7b5735" }
          : { top: "#9ddc86", trunk: "#7d593e" };
  for (let index = 0; index < 6; index += 1) {
    const x = 34 + index * 112;
    ctx.fillStyle = `${treePalette.trunk}66`;
    ctx.fillRect(x + 10, layout.gridY - 18, 34, 4);
    ctx.fillStyle = "#d5b37d";
    ctx.fillRect(x + 8, layout.gridY - 24, 38, 8);
    ctx.fillStyle = "#b48a59";
    ctx.fillRect(x + 10, layout.gridY - 22, 34, 4);
    ctx.fillStyle = treePalette.top;
    ctx.fillRect(x + 2, layout.gridY - 56, 38, 16);
    ctx.fillRect(x + 10, layout.gridY - 68, 24, 16);
    ctx.fillStyle =
      state.world.season.id === "winter"
        ? "#f5fbff"
        : state.world.season.id === "autumn"
          ? "#ffd28c"
          : state.world.season.id === "summer"
            ? "#9bdf7e"
            : "#bbea9b";
    ctx.fillRect(x + 6, layout.gridY - 62, 28, 8);
    ctx.fillRect(x + 14, layout.gridY - 74, 12, 8);
    ctx.fillStyle = treePalette.trunk;
    ctx.fillRect(x + 16, layout.gridY - 40, 6, 18);
  }

  if (state.world.weather.id === "drizzle") {
    for (let i = 0; i < 54; i += 1) {
      const x = (i * 31 + (i % 4) * 11) % playfieldWidth;
      const fall = (state.cameraPulse * 240 + i * 28) % (layout.roadY - 72);
      const y = 86 + fall;
      ctx.fillStyle = i % 3 === 0 ? "rgba(88, 133, 188, 0.54)" : "rgba(124, 164, 214, 0.46)";
      ctx.fillRect(x, y, 2, 14);
      ctx.fillRect(x + 2, y + 8, 1, 6);
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
    const approachTiles = getApproachTiles(facility, { includeFallback: true });
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

function drawQueueLaneMarkers() {
  for (const facility of listFacilities()) {
    if (!facility.queue.length) {
      continue;
    }
    const laneTiles = getFacilityQueueLaneTiles(facility, Math.min(getFacilityQueueCapacity(facility), 4));
    if (!laneTiles.length) {
      continue;
    }
    for (let index = 0; index < laneTiles.length; index += 1) {
      const slotTile = laneTiles[index];
      const pos = tileToScreen(slotTile.col, slotTile.row);
      if (index >= facility.queue.length) {
        continue;
      }
      ctx.fillStyle = "rgba(255, 228, 146, 0.12)";
      ctx.fillRect(pos.x + 20, pos.y + 20, layout.tile - 42, layout.tile - 42);
      ctx.strokeStyle = "rgba(255, 222, 132, 0.54)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pos.x + 20, pos.y + 20, layout.tile - 42, layout.tile - 42);
    }
  }
}

function drawStreetPickups() {
  for (const pickup of state.streetPickups) {
    const def = streetPickupDefinitions[pickup.type];
    if (!def) {
      continue;
    }
    const bob = Math.sin(pickup.drift) * 1.5;
    const x = Math.round(pickup.x);
    const y = Math.round(pickup.y + bob);
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(x - 5, y + 5, 10, 3);
    drawSprite(def.sprite, def.palette, x - 5, y - 5, 2);
    if (Math.sin(pickup.drift * 1.8) > 0.45) {
      ctx.fillStyle = "#fff6cf";
      ctx.fillRect(x + 5, y - 6, 2, 2);
      ctx.fillRect(x + 7, y - 4, 1, 1);
    }
  }
}

function drawGrid() {
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const pos = tileToScreen(col, row);
      const tileKind = getTownTileKind(col, row);
      const even = (col + row) % 2 === 0;
      let baseColor = "#b8e27c";
      let accentColor = "#90c35e";
      let trimColor = "#7aac4e";
      switch (tileKind) {
        case "lot":
          baseColor = even ? "#d7eca2" : "#c8e38d";
          accentColor = "#b7d37a";
          trimColor = "#9fb967";
          break;
        case "sidewalk":
        case "vertical-sidewalk":
          baseColor = even ? "#d8d2c8" : "#ccc5bb";
          accentColor = "#c0b7ab";
          trimColor = "#a59d92";
          break;
        case "main-street":
        case "vertical-street":
          baseColor = even ? "#726773" : "#665b67";
          accentColor = "#5a4f58";
          trimColor = "#8d8390";
          break;
        case "crosswalk":
          baseColor = even ? "#756a75" : "#6a5f69";
          accentColor = "#5a5058";
          trimColor = "#f4efde";
          break;
        case "curb":
          baseColor = even ? "#c7c2b7" : "#bab5aa";
          accentColor = "#a5a095";
          trimColor = "#948f84";
          break;
        case "lower-promenade":
          baseColor = even ? "#cfc9bc" : "#c3bcaf";
          accentColor = "#b8b1a4";
          trimColor = "#9d9588";
          break;
        default:
          if (state.world.season.id === "winter") {
            baseColor = even ? "#e8f5fb" : "#d8eaf2";
            accentColor = "#c1dbe7";
            trimColor = "#a7c5d3";
          }
          break;
      }
      ctx.fillStyle = baseColor;
      ctx.fillRect(pos.x, pos.y, layout.tile - 2, layout.tile - 2);

      ctx.fillStyle = accentColor;
      ctx.fillRect(pos.x + 4, pos.y + layout.tile - 14, layout.tile - 10, 6);
      ctx.fillStyle = trimColor;
      ctx.fillRect(pos.x + 6, pos.y + layout.tile - 8, layout.tile - 14, 4);

      if (tileKind === "lot") {
        ctx.fillStyle = "rgba(255, 253, 230, 0.18)";
        ctx.fillRect(pos.x + 6, pos.y + 8, layout.tile - 14, 4);
        ctx.fillStyle = "rgba(126, 168, 79, 0.34)";
        ctx.fillRect(pos.x + 8, pos.y + 18, 4, 4);
        ctx.fillRect(pos.x + layout.tile - 16, pos.y + 28, 4, 4);
      } else if (tileKind === "sidewalk" || tileKind === "vertical-sidewalk" || tileKind === "curb") {
        ctx.fillStyle = "rgba(255, 250, 238, 0.28)";
        ctx.fillRect(pos.x + 6, pos.y + 10, layout.tile - 12, 2);
        ctx.fillStyle = "rgba(145, 138, 121, 0.22)";
        ctx.fillRect(pos.x + 6, pos.y + 24, layout.tile - 12, 2);
        ctx.fillRect(pos.x + 22, pos.y + 8, 2, layout.tile - 16);
      } else if (tileKind === "crosswalk") {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(pos.x + 6, pos.y + 6, layout.tile - 14, layout.tile - 14);
        ctx.fillStyle = "#fff7dc";
        ctx.fillRect(pos.x + 9, pos.y + 6, 12, layout.tile - 14);
        ctx.fillRect(pos.x + 27, pos.y + 6, 12, layout.tile - 14);
        if (row === streetLayout.mainStreetRows.promenade && col === 6) {
          ctx.fillRect(pos.x + 6, pos.y + 9, layout.tile - 14, 12);
          ctx.fillRect(pos.x + 6, pos.y + 27, layout.tile - 14, 12);
        }
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(pos.x + 4, pos.y + 4, layout.tile - 10, 2);
        ctx.fillRect(pos.x + 4, pos.y + layout.tile - 8, layout.tile - 10, 2);
      } else if (tileKind === "main-street") {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(pos.x + 6, pos.y + 6, layout.tile - 10, layout.tile - 12);
        if (!streetLayout.crosswalkCols.includes(col)) {
          ctx.fillStyle = "#e7d16e";
          ctx.fillRect(pos.x + 10, pos.y + 21, 12, 3);
          ctx.fillRect(pos.x + 28, pos.y + 21, 12, 3);
        }
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(pos.x + 6, pos.y + 7, 2, layout.tile - 14);
        ctx.fillRect(pos.x + layout.tile - 10, pos.y + 7, 2, layout.tile - 14);
      } else if (tileKind === "vertical-street") {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(pos.x + 6, pos.y + 6, layout.tile - 12, layout.tile - 10);
        if (row !== streetLayout.mainStreetRows.promenade) {
          ctx.fillStyle = "#e7d16e";
          ctx.fillRect(pos.x + 21, pos.y + 10, 3, 12);
          ctx.fillRect(pos.x + 21, pos.y + 28, 3, 12);
        }
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(pos.x + 7, pos.y + 6, layout.tile - 14, 2);
        ctx.fillRect(pos.x + 7, pos.y + layout.tile - 10, layout.tile - 14, 2);
      } else if (tileKind === "lower-promenade") {
        ctx.fillStyle = "rgba(255, 247, 226, 0.22)";
        ctx.fillRect(pos.x + 8, pos.y + 12, layout.tile - 16, 3);
        ctx.fillRect(pos.x + 8, pos.y + 28, layout.tile - 16, 3);
      }

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
  drawCentralCrossroadProps();
  drawStreetFurniture();
  drawApproachMarkers();
  drawQueueLaneMarkers();
  drawPlacementPreview();
  const facilities = [...state.facilities].sort(
    (a, b) => a.row + a.height - (b.row + b.height),
  );
  for (const facility of facilities) {
    drawFacility(facility);
  }
  drawStreetPickups();
}

function drawLandmarkBackdrop(facility, pos, width, height) {
  const frontY = pos.y + height - 6;
  switch (facility.type) {
    case "clinic":
      ctx.fillStyle = "rgba(255, 236, 236, 0.9)";
      ctx.fillRect(pos.x + 6, frontY, width - 12, 18);
      ctx.fillStyle = "rgba(255, 204, 204, 0.7)";
      ctx.fillRect(pos.x + 12, frontY + 6, width - 24, 4);
      break;
    case "library":
      ctx.fillStyle = "rgba(234, 241, 252, 0.92)";
      ctx.fillRect(pos.x + 8, frontY, width - 16, 16);
      ctx.fillStyle = "rgba(167, 198, 245, 0.5)";
      ctx.fillRect(pos.x + 12, frontY + 4, width - 24, 3);
      break;
    case "post":
      ctx.fillStyle = "rgba(244, 231, 214, 0.92)";
      ctx.fillRect(pos.x + 6, frontY, width - 12, 18);
      ctx.fillStyle = "rgba(214, 171, 110, 0.42)";
      ctx.fillRect(pos.x + 12, frontY + 5, width - 24, 2);
      ctx.fillRect(pos.x + 12, frontY + 11, width - 24, 2);
      break;
    case "police":
      ctx.fillStyle = "rgba(228, 237, 255, 0.92)";
      ctx.fillRect(pos.x + 6, frontY, width - 12, 18);
      ctx.fillStyle = "rgba(119, 163, 238, 0.42)";
      ctx.fillRect(pos.x + 12, frontY + 6, width - 24, 3);
      break;
    case "workshop":
      ctx.fillStyle = "rgba(226, 226, 224, 0.94)";
      ctx.fillRect(pos.x + 8, frontY, width - 16, 18);
      ctx.fillStyle = "rgba(255, 198, 92, 0.4)";
      ctx.fillRect(pos.x + 12, frontY + 5, width - 24, 3);
      ctx.fillRect(pos.x + 18, frontY + 11, width - 36, 3);
      break;
    default:
      break;
  }
}

function drawPublicSpotBackdrop(facility, pos, width, height) {
  const frontY = pos.y + height - 4;
  switch (facility.type) {
    case "pocket-plaza":
      ctx.fillStyle = "rgba(223, 240, 221, 0.96)";
      ctx.fillRect(pos.x + 4, frontY - 10, width - 8, 22);
      ctx.fillStyle = "rgba(186, 216, 175, 0.82)";
      ctx.fillRect(pos.x + 8, frontY - 4, width - 16, 10);
      break;
    case "fountain-corner":
      ctx.fillStyle = "rgba(228, 240, 248, 0.96)";
      ctx.fillRect(pos.x + 8, frontY - 12, width - 16, 24);
      ctx.fillStyle = "rgba(151, 199, 233, 0.78)";
      ctx.fillRect(pos.x + 14, frontY - 2, width - 28, 8);
      break;
    case "metro-entrance":
      ctx.fillStyle = "rgba(229, 236, 245, 0.95)";
      ctx.fillRect(pos.x + 8, frontY - 8, width - 16, 18);
      ctx.fillStyle = "rgba(149, 182, 217, 0.76)";
      ctx.fillRect(pos.x + 12, frontY - 3, width - 24, 8);
      break;
    case "street-stall":
      ctx.fillStyle = "rgba(251, 236, 211, 0.95)";
      ctx.fillRect(pos.x + 6, frontY - 10, width - 12, 20);
      ctx.fillStyle = "rgba(236, 193, 128, 0.82)";
      ctx.fillRect(pos.x + 10, frontY - 4, width - 20, 8);
      break;
    default:
      break;
  }
}

function drawPublicSpotProps(facility, pos, width, height) {
  const frontY = pos.y + height + 2;
  switch (facility.type) {
    case "pocket-plaza":
      drawBench(pos.x + 8, frontY + 1, "#91684d");
      drawBench(pos.x + width - 34, frontY + 1, "#91684d");
      drawPlanter(pos.x + Math.floor(width / 2) - 9, frontY + 1, "#f08397");
      break;
    case "fountain-corner":
      drawPlanter(pos.x + 6, frontY + 1, "#74b7de");
      drawPlanter(pos.x + width - 18, frontY + 1, "#74b7de");
      break;
    case "metro-entrance":
      drawStreetSign(pos.x + width - 18, pos.y + height - 10, "#6db7ff");
      drawBench(pos.x + 8, frontY, "#718195");
      break;
    case "street-stall":
      drawSaleBoard(pos.x + width - 26, frontY + 2, "#ffcf72");
      drawParcelStack(pos.x + 8, frontY + 2);
      break;
    default:
      break;
  }
}

function drawFacility(facility) {
  const pos = tileToScreen(facility.col, facility.row);
  const def = getFacilityDef(facility.type);
  const width = facility.width * layout.tile - 6;
  const height = facility.height * layout.tile - 8;
  if (facility.kind === "tree") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(pos.x + 12, pos.y + height - 8, width - 18, 7);
    ctx.fillStyle = "#d7ba83";
    ctx.fillRect(pos.x + 10, pos.y + height - 16, width - 14, 10);
    ctx.fillStyle = "#b48b59";
    ctx.fillRect(pos.x + 12, pos.y + height - 13, width - 18, 4);
    drawFittedSprite(def.sprite, def.palette, pos.x + 2, pos.y + 2, width, height);
    return;
  }
  if (facility.kind === "landmark") {
    drawLandmarkBackdrop(facility, pos, width, height);
  } else if (facility.kind === "public-spot") {
    drawPublicSpotBackdrop(facility, pos, width, height);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(pos.x + 8, pos.y + height - 10, width - 10, 9);

  ctx.fillStyle =
    facility.kind === "landmark"
      ? "rgba(230, 236, 242, 0.9)"
      : facility.kind === "public-spot"
        ? "rgba(246, 240, 225, 0.92)"
      : facility.width * facility.height > 1
        ? "rgba(255, 247, 214, 0.82)"
        : "rgba(255, 247, 214, 0.64)";
  ctx.fillRect(pos.x + 2, pos.y + 3, width, height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(pos.x + width - 8, pos.y + 10, 6, height - 16);
  ctx.fillRect(pos.x + 10, pos.y + height - 8, width - 16, 5);
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(pos.x + 4, pos.y + 5, width - 4, height - 4);
  ctx.fillStyle = `${def.color}33`;
  ctx.fillRect(pos.x + 6, pos.y + 7, width - 8, 10);
  ctx.fillStyle = "rgba(255, 250, 238, 0.26)";
  ctx.fillRect(pos.x + 8, pos.y + 9, width - 14, 4);
  if (facility.kind === "landmark") {
    ctx.fillStyle = `${def.color}88`;
    ctx.fillRect(pos.x + 12, pos.y + 18, width - 24, 8);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(pos.x + 16, pos.y + 20, width - 32, 3);
  } else if (facility.kind === "public-spot") {
    ctx.fillStyle = `${def.color}66`;
    ctx.fillRect(pos.x + 10, pos.y + 18, width - 20, 7);
    ctx.fillStyle = "rgba(255,255,255,0.26)";
    ctx.fillRect(pos.x + 14, pos.y + 20, Math.max(14, width - 28), 2);
  } else {
    ctx.fillStyle = `${def.color}aa`;
    ctx.fillRect(pos.x + 10, pos.y + 18, width - 20, 10);
    ctx.fillStyle = "rgba(255,255,255,0.26)";
    ctx.fillRect(pos.x + 14, pos.y + 20, width - 28, 3);
    ctx.fillStyle = "rgba(143, 107, 61, 0.42)";
    ctx.fillRect(pos.x + Math.floor(width / 2) - 10, pos.y + height - 18, 20, 6);
  }

  drawFittedSprite(def.sprite, def.palette, pos.x + 1, pos.y + 1, width, height);

  if (facility.kind === "landmark") {
    drawLandmarkOutdoorProps(facility, pos, width, height);
    ctx.fillStyle = "rgba(47, 34, 49, 0.84)";
    ctx.fillRect(pos.x + 8, pos.y + height - 22, Math.min(96, width - 14), 14);
    ctx.fillStyle = "#fff4d6";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.fillText(fitTextToWidth(def.name, Math.min(84, width - 18)), pos.x + 12, pos.y + height - 12);
    return;
  }

  if (facility.kind === "public-spot") {
    drawPublicSpotProps(facility, pos, width, height);
    const labelWidth = Math.max(38, Math.min(width - 10, 68));
    ctx.fillStyle = "rgba(47, 34, 49, 0.8)";
    ctx.fillRect(pos.x + 6, pos.y + height - 22, labelWidth, 12);
    ctx.fillStyle = "#fff4d6";
    ctx.font = "bold 8px Trebuchet MS";
    ctx.fillText(
      fitTextToWidth(def.shortLabel || def.name, labelWidth - 8),
      pos.x + 10,
      pos.y + height - 13,
    );
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
  const crowdState = getFacilityCrowdState(facility);
  const serviceBusy = Boolean(facility.activeServiceId);
  if (crowdState.id !== "calm" || serviceBusy) {
    const badgeW = crowdState.shortLabel.length > 10 ? 74 : 60;
    ctx.fillStyle = crowdState.badgeColor;
    ctx.fillRect(pos.x + width - badgeW - 10, pos.y + height - 24, badgeW, 14);
    ctx.fillStyle = "#fff8dd";
    ctx.font = "bold 9px Trebuchet MS";
    ctx.fillText(crowdState.shortLabel, pos.x + width - badgeW - 6, pos.y + height - 13);
  }
  if (crowdState.id !== "calm") {
    const pulseWidth = Math.min(width - 18, 42 + Math.round((facility.crowdHeat || 0) * 8));
    ctx.fillStyle = `${crowdState.accent}44`;
    ctx.fillRect(pos.x + 10, pos.y + 22, pulseWidth, 6);
    ctx.fillStyle = crowdState.accent;
    ctx.fillRect(pos.x + 10, pos.y + 22, Math.max(10, pulseWidth - 10), 3);
    for (let index = 0; index < Math.min(3, queueCount + (serviceBusy ? 1 : 0)); index += 1) {
      ctx.fillStyle = crowdState.accent;
      ctx.fillRect(pos.x + width - 16 - index * 5, pos.y + 8, 3, 3);
      ctx.fillRect(pos.x + width - 17 - index * 5, pos.y + 11, 5, 4);
    }
  }
}

function getVisitorDrawMetrics(visitor) {
  const frame = visitor.appearance?.frame || "standard";
  switch (frame) {
    case "short":
      return {
        shadowW: 13,
        hairX: -5,
        hairY: -13,
        hairW: 9,
        faceX: -5,
        faceY: -8,
        faceW: 10,
        faceH: 9,
        bodyX: -6,
        bodyY: 3,
        bodyW: 12,
        bodyH: 10,
        legY: 13,
        legH: 8,
      };
    case "tall":
      return {
        shadowW: 14,
        hairX: -4,
        hairY: -13,
        hairW: 8,
        faceX: -5,
        faceY: -8,
        faceW: 10,
        faceH: 10,
        bodyX: -6,
        bodyY: 1,
        bodyW: 12,
        bodyH: 13,
        legY: 14,
        legH: 9,
      };
    case "broad":
      return {
        shadowW: 16,
        hairX: -5,
        hairY: -12,
        hairW: 10,
        faceX: -6,
        faceY: -7,
        faceW: 12,
        faceH: 9,
        bodyX: -7,
        bodyY: 2,
        bodyW: 14,
        bodyH: 11,
        legY: 13,
        legH: 8,
      };
    default:
      return {
        shadowW: 14,
        hairX: -4,
        hairY: -12,
        hairW: 8,
        faceX: -5,
        faceY: -7,
        faceW: 10,
        faceH: 9,
        bodyX: -6,
        bodyY: 2,
        bodyW: 12,
        bodyH: 11,
        legY: 13,
        legH: 8,
      };
  }
}

function getActorFacing(actor, fallback = "down") {
  const dx = (actor.targetX ?? actor.x ?? 0) - (actor.x ?? 0);
  const dy = (actor.targetY ?? actor.y ?? 0) - (actor.y ?? 0);
  if (Math.abs(dx) + Math.abs(dy) < 0.8) {
    return fallback;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

function drawVisitorAccessory(look, x, y, metrics, facing = "down") {
  if (!look?.accessory) {
    return;
  }
  ctx.fillStyle = look.accent || "#fff1bf";
  switch (look.accessory) {
    case "cap":
      ctx.fillRect(x + metrics.hairX - 1, y + metrics.hairY - 2, metrics.hairW + 2, 3);
      ctx.fillRect(x + metrics.hairX + 1, y + metrics.hairY + 1, metrics.hairW - 1, 1);
      break;
    case "ribbon":
      ctx.fillRect(x + metrics.hairX - 1, y + metrics.hairY + 1, 3, 3);
      ctx.fillRect(x + metrics.hairX + metrics.hairW - 1, y + metrics.hairY + 1, 3, 3);
      ctx.fillRect(x + metrics.hairX + 2, y + metrics.hairY + 2, metrics.hairW - 2, 1);
      break;
    case "scarf":
      ctx.fillRect(x + metrics.bodyX + 1, y + metrics.bodyY + 1, metrics.bodyW - 2, 2);
      ctx.fillRect(x + metrics.bodyX + 3, y + metrics.bodyY + 3, 3, 4);
      break;
    case "briefcase":
      ctx.fillStyle = "#6b5547";
      ctx.fillRect(
        x + (facing === "left" ? metrics.bodyX - 5 : metrics.bodyX + metrics.bodyW),
        y + metrics.bodyY + 5,
        5,
        5,
      );
      ctx.fillStyle = look.accent || "#fff1bf";
      ctx.fillRect(
        x + (facing === "left" ? metrics.bodyX - 4 : metrics.bodyX + metrics.bodyW + 1),
        y + metrics.bodyY + 4,
        3,
        1,
      );
      break;
    case "tie":
      ctx.fillRect(x - 1, y + metrics.bodyY + 2, 2, 6);
      ctx.fillRect(x - 2, y + metrics.bodyY + 7, 4, 2);
      break;
    case "hat":
      ctx.fillRect(x + metrics.hairX - 1, y + metrics.hairY - 3, metrics.hairW + 2, 3);
      ctx.fillRect(x + metrics.hairX + 1, y + metrics.hairY - 6, metrics.hairW - 2, 3);
      break;
    case "bag":
      ctx.fillRect(
        x + (facing === "left" ? metrics.bodyX - 2 : metrics.bodyX + metrics.bodyW - 1),
        y + metrics.bodyY + 4,
        5,
        6,
      );
      ctx.fillRect(
        x + (facing === "left" ? metrics.bodyX + metrics.bodyW - 1 : metrics.bodyX + metrics.bodyW - 2),
        y + metrics.bodyY + 2,
        1,
        4,
      );
      break;
    default:
      break;
  }
}

function drawTownChibi(look, x, y, metrics, options = {}) {
  const facing = options.facing || "down";
  const stride = options.stride || 0;
  const pose = options.pose || (Math.abs(stride) > 0.15 ? "walk" : "idle");
  const accentBarColor = options.accentBarColor || look.accent || "#fff0ce";
  const activeColor = options.activeColor || null;
  const bodyShiftY =
    pose === "walk" ? (stride > 0 ? -1 : 0) : pose === "chat" ? -1 : pose === "queue" ? 1 : 0;
  const bodyShiftX = pose === "walk" && (facing === "left" || facing === "right") ? Math.round(stride) : 0;
  const nearArmLift =
    pose === "walk" ? (stride > 0 ? -1 : 1) : pose === "chat" ? -2 : pose === "queue" ? 1 : 0;
  const farArmLift =
    pose === "walk" ? (stride > 0 ? 1 : -1) : pose === "chat" ? 1 : pose === "queue" ? 0 : 0;
  const leftLegOffset =
    pose === "queue" ? 0 : pose === "walk" ? (stride > 0 ? 2 : 0) : pose === "chat" ? 1 : 0;
  const rightLegOffset =
    pose === "queue" ? 0 : pose === "walk" ? (stride < 0 ? 2 : 0) : pose === "chat" ? 1 : 0;
  const shadowYOffset = pose === "walk" ? 0 : pose === "chat" ? -1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - Math.floor(metrics.shadowW / 2), y + 8 + shadowYOffset, metrics.shadowW, 4);

  ctx.fillStyle = "#4c3d37";
  ctx.fillRect(
    x + metrics.bodyX + 2 + (pose === "walk" ? -1 : 0),
    y + metrics.legY + leftLegOffset,
    3,
    metrics.legH,
  );
  ctx.fillRect(
    x + metrics.bodyX + metrics.bodyW - 5 + (pose === "walk" ? 1 : 0),
    y + metrics.legY + rightLegOffset,
    3,
    metrics.legH,
  );
  ctx.fillStyle = look.pants || "#5f5a78";
  ctx.fillRect(
    x + metrics.bodyX + 1 + bodyShiftX,
    y + metrics.bodyY + metrics.bodyH - 2 + bodyShiftY,
    metrics.bodyW - 2,
    3,
  );

  const armY = y + metrics.bodyY + 3 + bodyShiftY;
  if (facing === "up") {
    ctx.fillStyle = look.shirt;
    ctx.fillRect(
      x + metrics.bodyX + 1 + bodyShiftX,
      y + metrics.bodyY + 1 + bodyShiftY,
      metrics.bodyW - 2,
      metrics.bodyH,
    );
    ctx.fillStyle = `${look.shirt}cc`;
    ctx.fillRect(
      x + metrics.bodyX + 2 + bodyShiftX,
      y + metrics.bodyY + 3 + bodyShiftY,
      metrics.bodyW - 4,
      3,
    );
    ctx.fillStyle = accentBarColor;
    ctx.fillRect(
      x + metrics.bodyX + 2 + bodyShiftX,
      y + metrics.bodyY + 2 + bodyShiftY,
      3,
      metrics.bodyH - 4,
    );
    ctx.fillRect(
      x + metrics.bodyX + metrics.bodyW - 5 + bodyShiftX,
      y + metrics.bodyY + 2 + bodyShiftY,
      3,
      metrics.bodyH - 4,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(x + metrics.bodyX + bodyShiftX, armY + 1 + nearArmLift, 2, 5);
    ctx.fillRect(
      x + metrics.bodyX + metrics.bodyW - 2 + bodyShiftX,
      armY + 1 + farArmLift,
      2,
      5,
    );
    ctx.fillStyle = look.hair;
    ctx.fillRect(
      x + metrics.faceX - 1,
      y + metrics.faceY - 1 + bodyShiftY,
      metrics.faceW + 2,
      metrics.faceH,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(
      x + metrics.faceX + 2,
      y + metrics.faceY + 5 + bodyShiftY,
      metrics.faceW - 4,
      3,
    );
  } else if (facing === "left" || facing === "right") {
    const dir = facing === "left" ? -1 : 1;
    ctx.fillStyle = look.shirt;
    ctx.fillRect(
      x + metrics.bodyX + 1 + bodyShiftX,
      y + metrics.bodyY + 1 + bodyShiftY,
      metrics.bodyW - 3,
      metrics.bodyH,
    );
    ctx.fillStyle = accentBarColor;
    ctx.fillRect(
      x + (dir < 0 ? metrics.bodyX + 2 : metrics.bodyX + metrics.bodyW - 5) + bodyShiftX,
      y + metrics.bodyY + 2 + bodyShiftY,
      3,
      metrics.bodyH - 4,
    );
    ctx.fillStyle = `${look.shirt}cc`;
    ctx.fillRect(
      x + metrics.bodyX + 2 + bodyShiftX,
      y + metrics.bodyY + metrics.bodyH - 5 + bodyShiftY,
      metrics.bodyW - 5,
      2,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(
      x + (dir < 0 ? metrics.bodyX - 2 : metrics.bodyX + metrics.bodyW) + bodyShiftX,
      armY + nearArmLift,
      2,
      6,
    );
    ctx.fillRect(
      x + (dir < 0 ? metrics.bodyX + metrics.bodyW - 1 : metrics.bodyX - 1) + bodyShiftX,
      armY + 1 + farArmLift,
      2,
      5,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(
      x + metrics.faceX + (dir < 0 ? 1 : 2),
      y + metrics.faceY + bodyShiftY,
      metrics.faceW - 3,
      metrics.faceH,
    );
    ctx.fillStyle = look.hair;
    ctx.fillRect(x + metrics.hairX, y + metrics.hairY + bodyShiftY, metrics.hairW, 5);
    ctx.fillRect(
      x + (dir < 0 ? metrics.faceX - 1 : metrics.faceX + metrics.faceW - 2),
      y + metrics.faceY + bodyShiftY,
      2,
      metrics.faceH - 1,
    );
    ctx.fillStyle = "#2f2231";
    ctx.fillRect(
      x + (dir < 0 ? metrics.faceX + 2 : metrics.faceX + metrics.faceW - 4),
      y + metrics.faceY + 4 + bodyShiftY,
      1,
      1,
    );
  } else {
    ctx.fillStyle = look.shirt;
    ctx.fillRect(
      x + metrics.bodyX + bodyShiftX,
      y + metrics.bodyY + bodyShiftY,
      metrics.bodyW,
      metrics.bodyH,
    );
    ctx.fillStyle = accentBarColor;
    ctx.fillRect(
      x + metrics.bodyX + 1 + bodyShiftX,
      y + metrics.bodyY + 2 + bodyShiftY,
      metrics.bodyW - 2,
      2,
    );
    ctx.fillStyle = `${look.shirt}cc`;
    ctx.fillRect(
      x + metrics.bodyX + 1 + bodyShiftX,
      y + metrics.bodyY + metrics.bodyH - 4 + bodyShiftY,
      metrics.bodyW - 2,
      2,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(x + metrics.bodyX - 1 + bodyShiftX, armY + 1 + nearArmLift, 2, 5);
    ctx.fillRect(
      x + metrics.bodyX + metrics.bodyW - 1 + bodyShiftX,
      armY + 1 + farArmLift,
      2,
      5,
    );
    ctx.fillStyle = look.skin || "#f4d8be";
    ctx.fillRect(x + metrics.faceX, y + metrics.faceY + bodyShiftY, metrics.faceW, metrics.faceH);
    ctx.fillStyle = look.hair;
    ctx.fillRect(x + metrics.hairX, y + metrics.hairY + bodyShiftY, metrics.hairW, 5);
    ctx.fillRect(x + metrics.faceX, y + metrics.faceY - 1 + bodyShiftY, metrics.faceW, 2);
    ctx.fillStyle = "#2f2231";
    ctx.fillRect(x + metrics.faceX + 2, y + metrics.faceY + 3 + bodyShiftY, 1, 1);
    ctx.fillRect(x + metrics.faceX + metrics.faceW - 4, y + metrics.faceY + 3 + bodyShiftY, 1, 1);
    ctx.fillRect(
      x + metrics.faceX + Math.floor(metrics.faceW / 2) - 1,
      y + metrics.faceY + 6 + bodyShiftY,
      2,
      1,
    );
  }

  drawVisitorAccessory(look, x, y, metrics, facing);

  if (activeColor) {
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 11, y - 14, 22, 31);
  }
}

function drawVisitorNameTag(visitor, x, topY) {
  if (!visitor.residentProfileId) {
    return;
  }
  const name = getVisitorDisplayName(visitor);
  const accent = visitor.appearance?.accent || "#fff0ce";
  ctx.save();
  ctx.font = "bold 11px Trebuchet MS";
  const width = Math.max(26, Math.ceil(ctx.measureText(name).width) + 12);
  const boxX = Math.round(x - width / 2);
  ctx.fillStyle = "rgba(47, 34, 49, 0.2)";
  ctx.fillRect(boxX + 1, topY + 2, width, 14);
  ctx.fillStyle = "#fff8de";
  ctx.fillRect(boxX, topY, width, 14);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX + 1, topY + 1, width - 2, 12);
  ctx.fillStyle = "#2f2231";
  ctx.fillText(name, boxX + 5, topY + 10);
  ctx.restore();
}

function drawVisitors() {
  for (const visitor of state.visitors) {
    if (visitor.phase === "inside") {
      continue;
    }
    const look = visitor.appearance || getVisitorAppearance(visitor.profileId, null, visitor.id);
    const metrics = getVisitorDrawMetrics(visitor);
    const x = Math.round(visitor.x);
    const y = Math.round(visitor.y);
    const moving =
      Math.abs((visitor.targetX ?? visitor.x) - visitor.x) + Math.abs((visitor.targetY ?? visitor.y) - visitor.y) > 0.5;
    const stride = moving ? Math.sin(state.cameraPulse * 14 + visitor.id * 0.7) : 0;
    const pose =
      moving
        ? "walk"
        : visitor.phase === "queueing" || visitor.phase === "queue-wait"
          ? "queue"
          : (visitor.localPause || 0) > 0.08 || visitor.emote
            ? "chat"
            : "idle";
    drawTownChibi(look, x, y, metrics, {
      facing: getActorFacing(visitor, visitor.phase === "leaving" ? "down" : "right"),
      stride,
      pose,
      accentBarColor: look.accent || "#fff0ce",
    });
    const emotionDef = getVisitorEmotionDefinition(visitor.emotionId);
    ctx.fillStyle = "rgba(255, 248, 214, 0.92)";
    ctx.fillRect(x - 8, y - 18, 16, 4);
    ctx.fillStyle = emotionDef.accent;
    ctx.fillRect(
      x - 7,
      y - 17,
      visitor.emotionId === "calm" ? 6 : 12,
      2,
    );
    if (visitor.phase === "queueing" || visitor.phase === "queue-wait") {
      const patienceRatio = Math.max(
        0,
        Math.min(1, visitor.queuePatience / 10),
      );
      ctx.fillStyle = "#2f2231";
      ctx.fillRect(x - 10, y - 24, 20, 4);
      ctx.fillStyle = patienceRatio < 0.35 ? "#ff8f70" : "#ffe08f";
      ctx.fillRect(x - 9, y - 23, Math.max(2, Math.round(18 * patienceRatio)), 2);
      ctx.fillStyle = "#fff5da";
      ctx.fillRect(x - 4, y - 28, 8, 4);
      ctx.fillStyle = "#8f6b3d";
      ctx.fillRect(x - 3, y - 27, 2, 2);
      ctx.fillRect(x + 1, y - 27, 2, 2);
    }
    let stackCursor = y - 34;
    if (visitor.errandBadge) {
      const badgeDef = landmarkResultSprites[visitor.errandBadge.type];
      if (badgeDef) {
        const badgeY = stackCursor - 16;
        ctx.fillStyle = "rgba(47, 34, 49, 0.16)";
        ctx.fillRect(x - 8, badgeY + 2, 16, 16);
        ctx.fillStyle = "#fff8de";
        ctx.fillRect(x - 9, badgeY, 16, 16);
        ctx.strokeStyle = "#7f675f";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 8, badgeY + 1, 14, 14);
        drawSprite(badgeDef.sprite, badgeDef.palette, x - 5, badgeY + 3, 2);
        stackCursor = badgeY - 6;
      }
    }
    if (visitor.serviceBadge) {
      const badgeDef = visitorServiceBadgeSprites[visitor.serviceBadge.type];
      if (badgeDef) {
        const badgeY = stackCursor - 16;
        ctx.fillStyle = "rgba(47, 34, 49, 0.16)";
        ctx.fillRect(x - 8, badgeY + 2, 16, 16);
        ctx.fillStyle = "#fff8de";
        ctx.fillRect(x - 9, badgeY, 16, 16);
        ctx.strokeStyle = "#c59f66";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 8, badgeY + 1, 14, 14);
        drawSprite(badgeDef.sprite, badgeDef.palette, x - 5, badgeY + 3, 2);
        stackCursor = badgeY - 6;
      }
    }
    if (visitor.emote) {
      const emoteDef = visitorEmoteSprites[visitor.emote.type];
      if (emoteDef) {
        const bubbleY = stackCursor - 18;
        ctx.fillStyle = "rgba(47, 34, 49, 0.18)";
        ctx.fillRect(x - 13, bubbleY + 2, 26, 18);
        ctx.fillStyle = "#fff8de";
        ctx.fillRect(x - 14, bubbleY, 26, 18);
        ctx.strokeStyle = "#7f675f";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 13, bubbleY + 1, 24, 16);
        drawSprite(emoteDef.sprite, emoteDef.palette, x - 7, bubbleY + 2, 3);
        stackCursor = bubbleY - 6;
      }
    }
    drawVisitorNameTag(visitor, x, stackCursor - 14);
  }
}

function drawEventActorProp(actor, x, y) {
  switch (actor.incidentId) {
    case "incident-influencer-rush":
      ctx.fillStyle = "#3f4659";
      ctx.fillRect(x + 8, y - 6, 8, 6);
      ctx.fillStyle = "#9fd5ff";
      ctx.fillRect(x + 10, y - 4, 4, 2);
      ctx.fillStyle = "#ffd68c";
      ctx.fillRect(x + 15, y - 5, 2, 4);
      break;
    case "incident-roadwork-detour":
      ctx.fillStyle = "#ffcc65";
      ctx.fillRect(x + 9, y - 3, 6, 5);
      ctx.fillStyle = "#9a5f3c";
      ctx.fillRect(x + 10, y + 2, 4, 2);
      break;
    case "incident-power-dip":
      ctx.fillStyle = "#fff2a8";
      ctx.fillRect(x + 10, y - 8, 2, 4);
      ctx.fillRect(x + 8, y - 4, 5, 2);
      ctx.fillRect(x + 9, y - 2, 2, 4);
      break;
    case "incident-flash-sale":
      ctx.fillStyle = "#ff9dc1";
      ctx.fillRect(x + 9, y - 7, 6, 6);
      ctx.fillStyle = "#fff8e2";
      ctx.fillRect(x + 11, y - 5, 2, 2);
      break;
    case "incident-street-performance":
      ctx.fillStyle = "#7fd7ff";
      ctx.fillRect(x + 9, y - 6, 3, 8);
      ctx.fillStyle = "#fff5cb";
      ctx.fillRect(x + 13, y - 8, 2, 2);
      ctx.fillRect(x + 15, y - 6, 2, 2);
      break;
    case "incident-health-inspection":
      ctx.fillStyle = "#efe0ff";
      ctx.fillRect(x + 9, y - 7, 6, 8);
      ctx.fillStyle = "#8a78b7";
      ctx.fillRect(x + 10, y - 5, 4, 1);
      ctx.fillRect(x + 10, y - 3, 4, 1);
      break;
    default:
      break;
  }
}

function drawNPCs() {
  for (const npc of state.npcs) {
    const active =
      state.activeDialogue && state.activeDialogue.speakerId === npc.id;
    const bob = Math.sin(state.cameraPulse * 2 + npc.bobPhase) * 2;
    const x = Math.round(npc.x);
    const y = Math.round(npc.y + bob);
    const look = {
      shirt: npc.shirt,
      hair: npc.hair,
      accent: npc.accent,
      pants: "#5e5d7e",
      skin: "#f4d8be",
      accessory: npc.id === "mika" ? "ribbon" : npc.id === "taichi" ? "cap" : "scarf",
    };
    const metrics = getVisitorDrawMetrics({ appearance: { frame: npc.id === "taichi" ? "broad" : "standard" } });
    drawTownChibi(look, x, y, metrics, {
      facing: npc.id === "taichi" ? "left" : npc.id === "yuzu" ? "right" : "down",
      stride: Math.sin(state.cameraPulse * 4 + npc.bobPhase),
      pose: active ? "chat" : "idle",
      activeColor: active ? npc.accent : null,
    });
  }
  for (const actor of state.eventActors) {
    const active =
      state.activeDialogue &&
      state.activeDialogue.speakerKind === "event-actor" &&
      state.activeDialogue.speakerId === actor.id;
    const bob = Math.sin(state.cameraPulse * 2.8 + actor.bobPhase) * 2;
    const x = Math.round(actor.x);
    const y = Math.round(actor.y + bob);
    const look = {
      shirt: actor.shirt,
      hair: actor.hair,
      accent: actor.accent,
      pants: "#5e617f",
      skin: "#f4d8be",
      accessory:
        actor.incidentId === "incident-health-inspection"
          ? "briefcase"
          : actor.incidentId === "incident-street-performance"
            ? "scarf"
            : "cap",
    };
    const metrics = getVisitorDrawMetrics({ appearance: { frame: actor.incidentId === "incident-roadwork-detour" ? "broad" : "standard" } });
    drawTownChibi(look, x, y, metrics, {
      facing: getActorFacing(actor, "left"),
      stride: Math.sin(state.cameraPulse * 8 + actor.bobPhase),
      pose: active || (actor.focusTtl || 0) > 0 ? "chat" : "idle",
      activeColor: active ? actor.accent : null,
    });
    ctx.fillStyle = actor.accent;
    ctx.fillRect(x - 8, y - 18, 16, 4);
    ctx.fillRect(x - 2, y - 22, 4, 4);
    drawEventActorProp(actor, x, y);
    if ((actor.focusTtl || 0) > 0) {
      ctx.fillStyle = `${actor.accent}aa`;
      ctx.fillRect(x - 10, y - 28, 20, 3);
    }
  }
}

function drawSidebar() {
  const sidebarLayout = getSidebarUILayout();
  const { header, facilitiesTitleY, observeRect, panels } = sidebarLayout;
  const headerX = header.x;
  const headerY = header.y;
  const headerW = header.w;
  const headerH = header.h;
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
  ctx.fillRect(headerX, headerY, headerW, headerH);
  ctx.fillStyle = "#ffefbd";
  ctx.font = "bold 22px Trebuchet MS";
  ctx.fillText(`Day ${state.day}`, layout.sidebarX + 32, layout.sidebarY + 48);
  ctx.fillText(`${state.money} G`, layout.sidebarX + 32, layout.sidebarY + 80);
  ctx.fillText(`${state.rating} ★`, layout.sidebarX + 32, layout.sidebarY + 112);

  ctx.fillStyle = "#5a4358";
  ctx.fillRect(layout.sidebarX + 148, layout.sidebarY + 32, 2, 112);

  const infoRows = [
    { label: "Season", value: state.world.season.label, color: state.world.season.color },
    { label: "Weather", value: state.world.weather.label, color: "#ffefbd" },
    {
      label: "Festival",
      value: state.world.activeFestival ? state.world.activeFestival.name : "今天没有节庆活动",
      color: "#ffefbd",
    },
    {
      label: "Incident",
      value: state.world.incidentQueue[0] ? state.world.incidentQueue[0].title : "今天街区风平浪静",
      color: "#ffefbd",
    },
    {
      label: "Trend",
      value: `${state.todayTrend.name} +${state.todayTrend.incomeBonus}G/+${state.todayTrend.ratingBonus}★`,
      color: "#ffefbd",
    },
    { label: "Next Fest", value: state.world.upcomingFestival.name, color: "#ffefbd" },
  ];
  infoRows.forEach((row, index) => {
    const rowY = layout.sidebarY + 42 + index * 18;
    ctx.fillStyle = "#9e8898";
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(row.label, layout.sidebarX + 170, rowY);
    ctx.fillStyle = row.color;
    ctx.font = "bold 13px Trebuchet MS";
    wrapText(row.value, layout.sidebarX + 236, rowY, headerW - 250, 12, 1);
  });

  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Facilities", layout.sidebarX + 24, facilitiesTitleY);

  const observing = !state.selectedType;
  ctx.fillStyle = observing ? "#d9f0bb" : "#f4ead4";
  ctx.fillRect(observeRect.x, observeRect.y, observeRect.w, observeRect.h);
  ctx.strokeStyle = observing ? "#628442" : "#7f6470";
  ctx.lineWidth = 3;
  ctx.strokeRect(observeRect.x + 1.5, observeRect.y + 1.5, observeRect.w - 3, observeRect.h - 3);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.fillText("Observe Mode", observeRect.x + 12, observeRect.y + 15);
  ctx.font = "11px Trebuchet MS";
  ctx.fillText(
    fitTextToWidth(
      observing ? "当前不会放置商店，左键只观察地图。" : "点击这里取消当前商店选中。",
      observeRect.w - 24,
      "…",
    ),
    observeRect.x + 12,
    observeRect.y + 26,
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
    ctx.font = "bold 12px Trebuchet MS";
    ctx.fillText(fitTextToWidth(def.name, cardW - 92, "…"), cardX + 46, cardY + 17);
    ctx.font = "11px Trebuchet MS";
    ctx.fillStyle = unlocked ? "#5d4951" : "#6d5860";
    const summary = unlocked
      ? `${def.cost}G | ${def.footprint.w}x${def.footprint.h} | ${def.bonusText}`
      : `${def.unlockAt}★解锁 | ${def.bonusText}`;
    ctx.fillText(fitTextToWidth(summary, cardW - 104, "…"), cardX + 46, cardY + 31);
  });

  const activeGoal = getActiveGoal();
  const busiestFacility = getBusiestFacility();
  const activeSpotlight = state.landmarkSpotlights[0] || null;
  const routineRows = getLandmarkActivityRows(activeSpotlight ? 1 : 2);
  const observerText =
    state.activeDialogue?.text ||
    state.observerNotes[0] ||
    state.dialogueFeed[0]?.text ||
    state.messages[0] ||
    "暂无消息";

  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Goal", layout.sidebarX + 24, panels.goal.titleY);
  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(layout.sidebarX + 22, panels.goal.boxY, layout.sidebarW - 44, panels.goal.boxH);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.sidebarX + 23.5, panels.goal.boxY + 1.5, layout.sidebarW - 47, panels.goal.boxH - 3);
  ctx.fillStyle = "#6f5a62";
  if (activeGoal) {
    const progress = getGoalProgress(activeGoal);
    wrapText(
      `${activeGoal.title} (${Math.min(progress.value, progress.target)}/${progress.target})`,
      layout.sidebarX + 24,
      panels.goal.boxY + 18,
      layout.sidebarW - 48,
      14,
      panels.goal.boxH >= 42 ? 2 : 1,
    );
  } else {
    wrapText(
      state.finalePlaceholderUnlocked
        ? "阶段目标已清空。小镇会继续营业，终章观察区暂未开放。"
        : "全部目标达成，商店街已进入展示完成态。",
      layout.sidebarX + 24,
      panels.goal.boxY + 15,
      layout.sidebarW - 48,
      14,
      panels.goal.boxH >= 42 ? 2 : 1,
    );
  }
  const pulseText = busiestFacility
    ? (() => {
        const crowdState = getFacilityCrowdState(busiestFacility);
        if (crowdState.id === "overflow") {
          return `Street Pulse：${crowdState.pulseText}`;
        }
        if (crowdState.id === "packed") {
          return `Street Pulse：${crowdState.pulseText}`;
        }
        if (crowdState.id === "busy") {
          return `Street Pulse：${crowdState.pulseText} 已有 ${busiestFacility.patienceLeaves || 0} 人嫌久离开。`;
        }
        if (busiestFacility.activeServiceId) {
          return `Street Pulse：${crowdState.pulseText}`;
        }
        return "Street Pulse：目前街区还比较从容，适合继续观察人流。";
      })()
    : "Street Pulse：先摆出第一家店，再观察哪一类顾客最先被吸引。";
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Street Pulse", layout.sidebarX + 24, panels.pulse.titleY);
  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(layout.sidebarX + 22, panels.pulse.boxY, layout.sidebarW - 44, panels.pulse.boxH);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.sidebarX + 23.5, panels.pulse.boxY + 1.5, layout.sidebarW - 47, panels.pulse.boxH - 3);
  ctx.fillStyle = "#8b6d61";
  wrapText(
    pulseText,
    layout.sidebarX + 32,
    panels.pulse.boxY + 18,
    layout.sidebarW - 64,
    14,
    panels.pulse.boxH >= 52 ? 3 : 2,
  );
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Town Routines", layout.sidebarX + 24, panels.routines.titleY);
  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(layout.sidebarX + 22, panels.routines.boxY, layout.sidebarW - 44, panels.routines.boxH);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    layout.sidebarX + 23.5,
    panels.routines.boxY + 1.5,
    layout.sidebarW - 47,
    panels.routines.boxH - 3,
  );
  ctx.fillStyle = "#6f5a62";
  const routineLineLimit = activeSpotlight ? 1 : panels.routines.boxH >= 56 ? 2 : 1;
  routineRows.slice(0, routineLineLimit).forEach((row, index) => {
    wrapText(
      row,
      layout.sidebarX + 32,
      panels.routines.boxY + 18 + index * 14,
      layout.sidebarW - 64,
      13,
      1,
    );
  });
  if (activeSpotlight) {
    wrapText(
      `今日焦点：${activeSpotlight.title}`,
      layout.sidebarX + 32,
      panels.routines.boxY + panels.routines.boxH - 10,
      layout.sidebarW - 64,
      13,
      1,
    );
  }
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText("Town Talk & Notes", layout.sidebarX + 24, panels.notes.titleY);
  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(layout.sidebarX + 22, panels.notes.boxY, layout.sidebarW - 44, panels.notes.boxH);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.sidebarX + 23.5, panels.notes.boxY + 1.5, layout.sidebarW - 47, panels.notes.boxH - 3);
  ctx.fillStyle = "#6f5a62";
  wrapText(
    observerText,
    layout.sidebarX + 32,
    panels.notes.boxY + 22,
    layout.sidebarW - 64,
    14,
    panels.notes.boxH >= 84 ? 4 : 3,
  );
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
  const speaker = resolveDialogueSpeaker(state.activeDialogue);
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

function drawQuarterReportOverlay() {
  const report = state.quarterReport;
  if (!report) {
    return;
  }
  const panelX = 48;
  const panelY = 516;
  const panelW = 520;
  const panelH = 250;
  ctx.fillStyle = "rgba(47, 34, 49, 0.2)";
  ctx.fillRect(panelX + 8, panelY + 10, panelW, panelH);
  ctx.fillStyle = "rgba(255, 240, 206, 0.96)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#3d2b35";
  ctx.lineWidth = 6;
  ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);

  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 22px Trebuchet MS";
  ctx.fillText(fitTextToWidth(report.title, 300, "…"), panelX + 24, panelY + 36);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = "#6f5a62";
  ctx.fillText("季报不会暂停小镇运行，20 秒后会自动收起。", panelX + 24, panelY + 58);

  const metrics = [
    { label: "本季营收", value: `${report.metrics.revenue}G`, color: "#ffb17d" },
    { label: "接待顾客", value: `${report.metrics.visitorsServed} 人`, color: "#8fd3ff" },
    { label: "最热店铺", value: report.metrics.topFacility, color: "#ffd97a" },
    { label: "街角焦点", value: report.metrics.topPublicSpot !== "暂无" ? report.metrics.topPublicSpot : report.metrics.topLandmark, color: "#9fe09a" },
  ];
  metrics.forEach((item, index) => {
    const x = panelX + 24 + (index % 2) * 238;
    const y = panelY + 78 + Math.floor(index / 2) * 64;
    ctx.fillStyle = `${item.color}30`;
    ctx.fillRect(x, y, 214, 50);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, 211, 47);
    ctx.fillStyle = "#6f5a62";
    ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(item.label, x + 10, y + 16);
    ctx.fillStyle = "#2f2231";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(fitTextToWidth(item.value, 188, "…"), x + 10, y + 38);
  });

  ctx.fillStyle = "#f8ecd1";
  ctx.fillRect(panelX + 24, panelY + 212, panelW - 48, 74);
  ctx.strokeStyle = "#b5976d";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 25.5, panelY + 213.5, panelW - 51, 71);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 15px Trebuchet MS";
  ctx.fillText(report.highlights[0]?.title || "本季大事", panelX + 38, panelY + 234);
  ctx.fillStyle = "#6f5a62";
  ctx.font = "14px Trebuchet MS";
  wrapText(
    report.highlights[0]?.text || report.storyLine,
    panelX + 38,
    panelY + 258,
    panelW - 76,
    18,
    2,
  );

  const button = getQuarterReportButtonRect();
  ctx.fillStyle = "#ffe18a";
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.strokeStyle = "#c48731";
  ctx.lineWidth = 3;
  ctx.strokeRect(button.x + 2, button.y + 2, button.w - 4, button.h - 4);
  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("提前收起", button.x + 26, button.y + 22);
  ctx.font = "11px Trebuchet MS";
  ctx.fillText(`${Math.ceil(report.ttl || 0)}s`, button.x + 92, button.y + 22);
}

function render() {
  syncButtons();
  syncShellTheme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawHeader();
  drawGrid();
  drawAmbientStreetLife();
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
  if (state.quarterReport) {
    drawQuarterReportOverlay();
  }
}

function handleCanvasClick(event) {
  const { x, y } = getCanvasPointer(event);
  if (state.quarterReport) {
    const button = getQuarterReportButtonRect();
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      closeQuarterReport();
      render();
    }
    return;
  }
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
  if (state.quarterReport && (event.key === "Enter" || event.key === " ")) {
    closeQuarterReport();
    render();
    return;
  }
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

window.setDebugIncident = (incidentId = null) => applyDebugIncident(incidentId);
window.listDebugIncidents = () =>
  lightweightIncidentDefinitions.map((incident) => ({
    id: incident.id,
    title: incident.title,
    minDay: incident.minDay,
  }));

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
      quarterId: state.quarterStats?.id || null,
      selectedType: state.selectedType,
      lastCombo: state.lastCombo,
      debugIncidentId: state.debug?.forcedIncidentId || null,
      debugTrafficMode: state.debug?.trafficMode || null,
      todayTrend: state.todayTrend,
      servedVisitors: state.servedVisitors,
      lifetimeIncome: state.lifetimeIncome,
    },
    world: {
      calendar: state.world.calendar,
      timeOfDay: state.timeOfDay,
      trafficSignal: {
        phase: state.trafficSignal.phase,
        timer: Number(state.trafficSignal.timer.toFixed(2)),
      },
      roadTraffic: state.roadTrafficVehicles.map((vehicle) => ({
        id: vehicle.id,
        type: vehicle.type,
        x: Math.round(vehicle.x),
        y: Math.round(vehicle.y),
        dir: vehicle.dir,
        stopped: vehicle.stopped,
      })),
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
      activeEvents: [...state.world.eventQueue, ...state.world.incidentQueue].map((event) => ({
        id: event.id,
        title: event.title,
        trafficModifier: event.trafficModifier,
      })),
      activeIncidents: state.world.incidentQueue.map((incident) => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        featuredType: incident.featuredType || null,
        zoneId: incident.zoneId || null,
      })),
      landmarkSpotlights: state.landmarkSpotlights.map((spotlight) => ({
        id: spotlight.id,
        landmarkType: spotlight.landmarkType,
        title: spotlight.title,
        threshold: spotlight.threshold,
      })),
      eventQueueSize: state.world.eventQueue.length,
      incidentQueueSize: state.world.incidentQueue.length,
    },
    dailyLandmarkStats: Object.values(state.dailyLandmarkStats || {}).map((item) => ({
      facilityId: item.facilityId,
      type: item.type,
      name: item.name,
      visits: item.visits,
    })),
    observerNotes: [...state.observerNotes],
    quarterReport: state.quarterReport
      ? {
          id: state.quarterReport.id,
          title: state.quarterReport.title,
          ttl: Number(state.quarterReport.ttl?.toFixed?.(2) || 0),
          metrics: state.quarterReport.metrics,
          highlights: state.quarterReport.highlights.map((item) => ({
            title: item.title,
            text: item.text,
          })),
          storyLine: state.quarterReport.storyLine,
        }
      : null,
    structures: state.facilities.map((facility) => ({
      id: facility.id,
      type: facility.type,
      kind: facility.kind,
      removable: facility.removable,
      col: facility.col,
      row: facility.row,
      width: facility.width,
      height: facility.height,
      landmarkVisits: facility.landmarkVisits || 0,
      publicVisits: facility.publicVisits || 0,
      ambientRole: facility.ambientRole || null,
    })),
    streetPickups: state.streetPickups.map((pickup) => ({
      id: pickup.id,
      type: pickup.type,
      sourceLabel: pickup.sourceLabel,
      x: Math.round(pickup.x),
      y: Math.round(pickup.y),
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
      peakQueue: facility.peakQueue || 0,
      turnaways: facility.turnaways || 0,
      patienceLeaves: facility.patienceLeaves || 0,
      crowdHeat: Number(facility.crowdHeat?.toFixed?.(2) || 0),
      crowdState: getFacilityCrowdState(facility).id,
    })),
    visitors: state.visitors.map((visitor) => ({
      id: visitor.id,
      displayName: getVisitorDisplayName(visitor),
      profileId: visitor.profileId,
      profileLabel: visitor.profileLabel,
      residentProfileId: visitor.residentProfileId || null,
      x: Math.round(visitor.x),
      y: Math.round(visitor.y),
      phase: visitor.phase,
      emotionId: visitor.emotionId || "calm",
      queuePatience: Number(visitor.queuePatience?.toFixed?.(2) || 0),
      emote: visitor.emote?.type || null,
      errandBadge: visitor.errandBadge?.type || null,
      serviceBadge: visitor.serviceBadge?.type || null,
      localPause: Number(visitor.localPause?.toFixed?.(2) || 0),
      siblingResidentId: visitor.siblingResidentId || null,
      companionLeadId: visitor.companionLeadId || null,
      companionPartnerId: visitor.companionPartnerId || null,
      companionWalkTtl: Number(visitor.companionWalkTtl?.toFixed?.(2) || 0),
      originLandmarkType: visitor.originLandmarkType || null,
      originPublicSpotType: visitor.originPublicSpotType || null,
      errandLandmarkType: visitor.errandLandmarkType || null,
      publicSpotType: visitor.publicSpotType || null,
      target: { col: visitor.targetCol, row: visitor.targetRow },
    })),
    npcs: state.npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      x: Math.round(npc.x),
      y: Math.round(npc.y),
      speaking: state.activeDialogue?.speakerId === npc.id,
    })),
    eventActors: state.eventActors.map((actor) => ({
      id: actor.id,
      incidentId: actor.incidentId,
      role: actor.role,
      name: actor.name,
      x: Math.round(actor.x),
      y: Math.round(actor.y),
      focusVisitorId: actor.focusVisitorId || null,
      speaking:
        state.activeDialogue?.speakerKind === "event-actor" &&
        state.activeDialogue?.speakerId === actor.id,
    })),
    dialogue: state.activeDialogue
      ? {
          speakerName: state.activeDialogue.speakerName,
          speakerId: state.activeDialogue.speakerId,
          speakerKind: state.activeDialogue.speakerKind,
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
