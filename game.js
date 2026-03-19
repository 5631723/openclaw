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
  gridX: 36,
  gridY: 132,
  cols: 12,
  rows: 9,
  tile: 54,
  sidebarX: 700,
  sidebarY: 108,
  sidebarW: 368,
  sidebarH: 586,
  roadY: 620,
  roadH: 54,
};

const calendarTuning = {
  daysPerYear: 360,
  seasonLength: 90,
  calendarDayStep: 15,
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
  { id: "new-year", dayOfYear: 1, name: "新年大卖场" },
  { id: "flower", dayOfYear: 90, name: "花见步行祭" },
  { id: "summer-fair", dayOfYear: 180, name: "夏日烟火夜" },
  { id: "harvest", dayOfYear: 270, name: "丰收感恩市" },
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
  trend: [
    ({ trendName }) => `今天大家都在聊 ${trendName}，这股热度得接住。`,
    ({ trendName }) => `${trendName} 成了今日热潮，摆得好就能吃满这波流量。`,
  ],
  service: [
    ({ facilityName }) => `${facilityName} 又接了一单，门口的人气越来越稳。`,
    ({ facilityName }) => `${facilityName} 的客人出得很快，这个点位挑对了。`,
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

function getUpcomingFestival(dayOfYear) {
  const ordered = annualFestivalDefinitions
    .map((festival) => ({
      ...festival,
      offset:
        festival.dayOfYear >= dayOfYear
          ? festival.dayOfYear - dayOfYear
          : calendarTuning.daysPerYear - dayOfYear + festival.dayOfYear,
    }))
    .sort((a, b) => a.offset - b.offset);
  return ordered[0];
}

function getActiveFestival(dayOfYear) {
  return annualFestivalDefinitions.find(
    (festival) => festival.dayOfYear === dayOfYear,
  ) || null;
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
  return {
    calendar,
    season,
    weather,
    activeFestival: getActiveFestival(calendar.dayOfYear),
    upcomingFestival: getUpcomingFestival(calendar.dayOfYear),
    eventQueue: previousWorld?.eventQueue || [],
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

function createInitialState() {
  const initialRating = 12;
  const initialDay = 1;
  const initialWorld = buildWorld(initialDay);
  const initialHour = 8;
  return {
    mode: "menu",
    money: 160,
    rating: initialRating,
    day: initialDay,
    clock: 0.18,
    selectedType: "snack",
    grid: createGrid(),
    facilities: [],
    visitors: [],
    floaters: [],
    messages: ["点击开始经营，做出一条热闹的商店街。"],
    nextVisitorId: 1,
    nextFacilityId: 1,
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
  syncButtons();
}

function pushMessage(text) {
  state.messages.unshift(text);
  state.messages = state.messages.slice(0, 5);
}

function getFacilityDef(type) {
  return facilityTypes.find((item) => item.id === type);
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

function maybeTriggerVisitorThought() {
  const candidates = state.visitors.filter(
    (visitor) =>
      visitor.phase === "going" ||
      visitor.phase === "entering" ||
      visitor.phase === "leaving",
  );
  if (!candidates.length) {
    return;
  }
  const visitor =
    candidates[Math.floor(Math.random() * candidates.length)];
  const facility = getFacilityById(visitor.targetFacilityId);
  const facilityName = facility ? getFacilityDef(facility.type).name : "店铺";
  const lines = [
    `${state.world.weather.label} 出门逛街，感觉这条街还挺舒服。`,
    `${facilityName} 看起来不错，今天就去这家看看。`,
    `${state.timeOfDay.label} 的人果然少一点，逛起来更轻松。`,
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
    speakerName: "顾客",
    text,
    topic,
    ttl: 3.2,
  };
  state.dialogueFeed.unshift({
    speakerName: "顾客",
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

function chooseWeightedFacility(facilities) {
  const weights = facilities.map((facility) => {
    const queuedVisitors = state.visitors.filter(
      (visitor) => visitor.targetFacilityId === facility.id,
    ).length;
    const weight =
      Math.max(3, getFacilityPopularity(facility)) *
        (0.72 + Math.random() * 0.9) +
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
  return [...state.facilities];
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
  effect.income += seasonEffect.income || 0;
  effect.income += weatherEffect.income || 0;
  effect.rating += seasonEffect.rating || 0;
  effect.rating += weatherEffect.rating || 0;
  effect.pop += seasonEffect.pop || 0;
  effect.pop += weatherEffect.pop || 0;
  return effect;
}

function getFacilityPopularity(facility) {
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility);
  const worldBonus = getWorldFacilityBonus(facility);
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
    facility.width * facility.height
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

  const facility = {
    id: state.nextFacilityId,
    type,
    col,
    row,
    width: def.footprint.w,
    height: def.footprint.h,
    level: 1,
    visits: 0,
  };
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

function startVisitorLeaving(visitor) {
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
    visitor.phase === "inside"
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
  const target = chooseWeightedFacility(facilities);
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
  checkUnlockAnnouncements();
  evaluateGoals();
}

function updateVisitors(delta) {
  for (const visitor of state.visitors) {
    if (
      visitor.phase === "to-grid" ||
      visitor.phase === "going" ||
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
            visitor.phase = "entering";
            setVisitorTargetToFacility(visitor, facility);
          }
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
  const upkeep = Math.max(0, listFacilities().length - 4) * 3;
  if (upkeep > 0) {
    state.money = Math.max(0, state.money - upkeep);
    pushMessage(`营业日结算，维护费 -${upkeep}G。`);
  } else {
    pushMessage("今天顺顺利利，街区口碑又涨了一点。");
  }
  const extraVisitors = Math.max(
    1,
    Math.round(
      (1 + Math.floor(state.day / 4)) *
        (state.world.weather.visitorMultiplier || 1),
    ),
  );
  for (let i = 0; i < extraVisitors; i += 1) {
    spawnVisitor();
  }
  state.world = buildWorld(state.day);
  state.todayTrend = buildTrend(state.rating, state.day);
  pushMessage(
    `今日热潮：${state.todayTrend.name}，额外 +${state.todayTrend.incomeBonus}G / +${state.todayTrend.ratingBonus}★。`,
  );
  pushMessage(
    `${state.world.season.label} ${state.world.weather.label}，下一场节庆：${state.world.upcomingFestival.name}。`,
  );
  setEnvironmentNotice(
    `${state.world.season.label} ${state.world.weather.label}，${state.world.upcomingFestival.name} 将近。`,
    state.world.season.color,
    4.4,
  );
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
    state.mode = "complete";
    pushMessage("商店街目标全达成，这一轮已经能拿去当完整 demo 了。");
    syncButtons();
  }
}

function getActiveGoal() {
  return state.goals.find((goal) => !goal.completed) || null;
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
  ctx.fillRect(0, layout.gridY - 26, 640, layout.rows * layout.tile + 44);
  ctx.fillStyle = grassDark;
  ctx.fillRect(0, layout.roadY - 22, 640, 22);

  ctx.fillStyle = "#72606a";
  ctx.fillRect(0, layout.roadY, 650, layout.roadH);
  ctx.fillStyle = "#f7f0b3";
  for (let x = 20; x < 640; x += 80) {
    ctx.fillRect(x, layout.roadY + 20, 34, 6);
  }

  if (state.world.weather.id === "drizzle") {
    ctx.fillStyle = "rgba(88, 133, 188, 0.45)";
    for (let i = 0; i < 36; i += 1) {
      const x = (i * 27 + state.cameraPulse * 80) % 640;
      const y = 90 + (i * 18) % 410;
      ctx.fillRect(x, y, 2, 12);
    }
  }

  if (state.world.weather.id === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 31 + state.cameraPulse * 24) % 640;
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
  if (!state.hoveredTile || state.mode !== "play") {
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
  for (const facility of state.facilities) {
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(pos.x + 8, pos.y + height - 10, width - 10, 9);

  ctx.fillStyle =
    facility.width * facility.height > 1 ? "rgba(255, 247, 214, 0.82)" : "rgba(255, 247, 214, 0.64)";
  ctx.fillRect(pos.x + 2, pos.y + 3, width, height);
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 4;
  ctx.strokeRect(pos.x + 4, pos.y + 5, width - 4, height - 4);

  drawFittedSprite(def.sprite, def.palette, pos.x + 1, pos.y + 1, width, height);

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
  ctx.fillRect(layout.sidebarX + 18, layout.sidebarY + 18, layout.sidebarW - 36, 118);
  ctx.fillStyle = "#ffefbd";
  ctx.font = "bold 19px Trebuchet MS";
  ctx.fillText(`Day ${state.day}`, layout.sidebarX + 34, layout.sidebarY + 46);
  ctx.fillText(`${state.money} G`, layout.sidebarX + 34, layout.sidebarY + 72);
  ctx.fillText(`${state.rating} ★`, layout.sidebarX + 34, layout.sidebarY + 98);

  ctx.fillStyle = state.world.season.color;
  ctx.font = "bold 12px Trebuchet MS";
  ctx.fillText(state.world.season.label, layout.sidebarX + 162, layout.sidebarY + 40);
  ctx.fillStyle = "#ffefbd";
  ctx.fillText(state.world.weather.label, layout.sidebarX + 162, layout.sidebarY + 58);
  ctx.fillStyle = "#8a6f79";
  ctx.font = "11px Trebuchet MS";
  ctx.fillText("Trend today", layout.sidebarX + 162, layout.sidebarY + 78);
  wrapText(
    `${state.todayTrend.name} +${state.todayTrend.incomeBonus}G/+${state.todayTrend.ratingBonus}★`,
    layout.sidebarX + 162,
    layout.sidebarY + 92,
    160,
    13,
    2,
  );
  ctx.fillText("Next fest", layout.sidebarX + 162, layout.sidebarY + 112);
  wrapText(
    state.world.upcomingFestival.name,
    layout.sidebarX + 162,
    layout.sidebarY + 126,
    160,
    13,
    2,
  );

  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("Facilities", layout.sidebarX + 24, layout.sidebarY + 158);

  facilityTypes.forEach((def, index) => {
    const cardX = layout.sidebarX + 22;
    const cardY = layout.sidebarY + 170 + index * 52;
    const selected = state.selectedType === def.id;
    const unlocked = isUnlocked(def);
    ctx.fillStyle = selected ? "#ffe48c" : unlocked ? "#fff9e5" : "#ddcfbc";
    ctx.fillRect(cardX, cardY, layout.sidebarW - 44, 44);
    ctx.strokeStyle = selected ? "#c44d2f" : "#7f6470";
    ctx.lineWidth = 3;
    ctx.strokeRect(cardX + 1.5, cardY + 1.5, layout.sidebarW - 47, 41);

    ctx.fillStyle = def.color;
    ctx.fillRect(cardX + 10, cardY + 6, 28, 28);
    drawSprite(def.sprite, def.palette, cardX + 10, cardY + 7, 2);

  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 11px Trebuchet MS";
    ctx.fillText(fitTextToWidth(def.name, 160), cardX + 46, cardY + 17);
    ctx.font = "10px Trebuchet MS";
    const price = unlocked ? `${def.cost}G | ${def.footprint.w}x${def.footprint.h}` : `Unlock ${def.unlockAt}★`;
    ctx.fillText(price, cardX + 46, cardY + 29);
    ctx.fillStyle = "#7f6470";
    ctx.fillText(fitTextToWidth(def.bonusText, 170), cardX + 46, cardY + 39);
  });

  const activeGoal = getActiveGoal();
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("Goal & Town Talk", layout.sidebarX + 24, layout.sidebarY + 472);
  ctx.fillStyle = "#6f5a62";
  if (activeGoal) {
    const progress = getGoalProgress(activeGoal);
    wrapText(
      `${activeGoal.title} (${Math.min(progress.value, progress.target)}/${progress.target})`,
      layout.sidebarX + 24,
      layout.sidebarY + 492,
      layout.sidebarW - 48,
      15,
      2,
    );
  } else {
    wrapText(
      "全部目标达成，商店街已进入展示完成态。",
      layout.sidebarX + 24,
      layout.sidebarY + 492,
      layout.sidebarW - 48,
      15,
      2,
    );
  }
  const talk =
    state.activeDialogue?.text ||
    state.dialogueFeed[0]?.text ||
    state.messages[0] ||
    "暂无消息";
  ctx.fillStyle = "#6f5a62";
  wrapText(talk, layout.sidebarX + 24, layout.sidebarY + 526, layout.sidebarW - 48, 14, 3);
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
  const card = hitFacilityCard(x, y);
  if (card) {
    state.selectedType = card.id;
    render();
    return;
  }

  const tile = screenToTile(x, y);
  if (tile) {
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
    const cardX = layout.sidebarX + 22;
    const cardY = layout.sidebarY + 170 + index * 52;
    if (
      x >= cardX &&
      x <= cardX + layout.sidebarW - 44 &&
      y >= cardY &&
      y <= cardY + 44
    ) {
      return def;
    }
  }
  return null;
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
      eventQueueSize: state.world.eventQueue.length,
      incidentQueueSize: state.world.incidentQueue.length,
    },
    facilities: listFacilities().map((facility) => ({
      id: facility.id,
      type: facility.type,
      col: facility.col,
      row: facility.row,
      width: facility.width,
      height: facility.height,
      level: facility.level,
      visits: facility.visits,
    })),
    visitors: state.visitors.map((visitor) => ({
      id: visitor.id,
      x: Math.round(visitor.x),
      y: Math.round(visitor.y),
      phase: visitor.phase,
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
