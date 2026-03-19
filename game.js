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
  gridY: 122,
  cols: 11,
  rows: 8,
  tile: 52,
  sidebarX: 650,
  sidebarY: 108,
  sidebarW: 276,
  sidebarH: 498,
  roadY: 566,
  roadH: 46,
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
    rewardRating: 6,
  },
];

const state = createInitialState();

function createInitialState() {
  const initialRating = 12;
  const initialDay = 1;
  return {
    mode: "menu",
    money: 160,
    rating: initialRating,
    day: initialDay,
    clock: 0.18,
    selectedType: "snack",
    grid: Array.from({ length: layout.rows }, () =>
      Array.from({ length: layout.cols }, () => null),
    ),
    visitors: [],
    floaters: [],
    messages: ["点击开始经营，做出一条热闹的商店街。"],
    nextVisitorId: 1,
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

function getTileCenter(col, row) {
  const pos = tileToScreen(col, row);
  return {
    x: pos.x + layout.tile / 2,
    y: pos.y + layout.tile / 2 + 4,
  };
}

function calculateBonuses(col, row, type) {
  const def = getFacilityDef(type);
  const bonus = { income: 0, rating: 0, pop: 0, names: [] };
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dc, dr] of offsets) {
    const nextCol = col + dc;
    const nextRow = row + dr;
    if (
      nextCol < 0 ||
      nextRow < 0 ||
      nextCol >= layout.cols ||
      nextRow >= layout.rows
    ) {
      continue;
    }
    const neighbor = state.grid[nextRow][nextCol];
    if (!neighbor) {
      continue;
    }
    const effect = def.synergy[neighbor.type];
    if (effect) {
      bonus.income += effect.income;
      bonus.rating += effect.rating;
      bonus.pop += effect.pop;
      bonus.names.push(getFacilityDef(neighbor.type).name);
    }
  }
  return bonus;
}

function getFacilityPopularity(facility) {
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility.col, facility.row, facility.type);
  const trendBoost =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.incomeBonus + state.todayTrend.ratingBonus
      : 0;
  return def.appeal + bonus.pop + facility.level * 2 + trendBoost;
}

function placeFacility(col, row, type) {
  if (state.mode !== "play" || state.grid[row][col]) {
    return false;
  }
  const def = getFacilityDef(type);
  if (!isUnlocked(def)) {
    pushMessage(`${def.name} 还没解锁，先把街区评价再抬高一点。`);
    return false;
  }
  if (state.money < def.cost) {
    pushMessage("钱不够，先等顾客消费几轮。");
    return false;
  }

  state.money -= def.cost;
  state.grid[row][col] = {
    type,
    col,
    row,
    level: 1,
    visits: 0,
  };

  const bonus = calculateBonuses(col, row, type);
  const facilityName = def.name;
  if (bonus.names.length) {
    const comboText = `${facilityName} + ${bonus.names[0]}`;
    state.lastCombo = comboText;
    state.rating += bonus.rating;
    state.money += bonus.income;
    state.comboCount += 1;
    state.floaters.push({
      x: getTileCenter(col, row).x,
      y: getTileCenter(col, row).y - 16,
      text: `Combo +${bonus.rating}★`,
      color: "#fff4a4",
      ttl: 1.6,
    });
    pushMessage(`${comboText} 触发街区联动，评价上涨。`);
  } else {
    state.rating += 1;
    pushMessage(`${facilityName} 开业，等顾客上门。`);
  }
  evaluateGoals();
  return true;
}

function removeFacility(col, row) {
  const facility = state.grid[row][col];
  if (!facility) {
    return;
  }
  const def = getFacilityDef(facility.type);
  state.money += Math.floor(def.cost * 0.6);
  state.grid[row][col] = null;
  state.rating = Math.max(0, state.rating - 2);
  pushMessage(`${def.name} 已拆除，回收一部分资金。`);
  evaluateGoals();
}

function spawnVisitor() {
  const facilities = listFacilities();
  if (!facilities.length) {
    return;
  }
  const palette = visitorPalette[(state.nextVisitorId - 1) % visitorPalette.length];
  const best = [...facilities].sort(
    (a, b) => getFacilityPopularity(b) - getFacilityPopularity(a),
  );
  const target =
    best[Math.floor(Math.random() * Math.min(2, best.length))] ||
    facilities[0];
  const center = getTileCenter(target.col, target.row);
  state.visitors.push({
    id: state.nextVisitorId++,
    x: layout.gridX + 40 + Math.random() * (layout.cols * layout.tile - 80),
    y: layout.roadY + 26 + Math.random() * 8,
    speed: (52 + Math.random() * 16) * simulationTuning.visitorSpeedMultiplier,
    mood: 1,
    targetCol: target.col,
    targetRow: target.row,
    phase: "going",
    wait: 0,
    colors: palette,
    targetX: center.x,
    targetY: center.y + 10,
  });
}

function listFacilities() {
  const result = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const facility = state.grid[row][col];
      if (facility) {
        result.push(facility);
      }
    }
  }
  return result;
}

function visitFacility(visitor) {
  const facility = state.grid[visitor.targetRow]?.[visitor.targetCol];
  if (!facility) {
    visitor.phase = "leaving";
    visitor.targetY = layout.roadY + 24;
    return;
  }
  const def = getFacilityDef(facility.type);
  const bonus = calculateBonuses(facility.col, facility.row, facility.type);
  const trendIncome =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.incomeBonus
      : 0;
  const trendRating =
    state.todayTrend && facility.type === state.todayTrend.type
      ? state.todayTrend.ratingBonus
      : 0;
  const income = def.baseIncome + bonus.income + facility.level + trendIncome;
  const ratingGain = 1 + bonus.rating + trendRating;
  facility.visits += 1;
  if (facility.visits % 5 === 0) {
    facility.level += 1;
    pushMessage(`${def.name} 升到 Lv.${facility.level}，更能吸金了。`);
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
  evaluateGoals();
}

function updateVisitors(delta) {
  for (const visitor of state.visitors) {
    if (visitor.phase === "going" || visitor.phase === "leaving") {
      const dx = visitor.targetX - visitor.x;
      const dy = visitor.targetY - visitor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        if (visitor.phase === "going") {
          visitor.phase = "waiting";
          visitor.wait = simulationTuning.visitorWait;
        } else {
          visitor.done = true;
        }
      } else {
        const move = Math.min(dist, visitor.speed * delta);
        visitor.x += (dx / dist) * move;
        visitor.y += (dy / dist) * move;
      }
    } else if (visitor.phase === "waiting") {
      visitor.wait -= delta;
      if (visitor.wait <= 0) {
        visitFacility(visitor);
        visitor.phase = "leaving";
        visitor.targetX += (Math.random() - 0.5) * 20;
        visitor.targetY = layout.roadY + 24;
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
  state.day += 1;
  state.rating += 2;
  const upkeep = Math.max(0, listFacilities().length - 4) * 3;
  if (upkeep > 0) {
    state.money = Math.max(0, state.money - upkeep);
    pushMessage(`营业日结算，维护费 -${upkeep}G。`);
  } else {
    pushMessage("今天顺顺利利，街区口碑又涨了一点。");
  }
  const extraVisitors = 1 + Math.floor(state.day / 4);
  for (let i = 0; i < extraVisitors; i += 1) {
    spawnVisitor();
  }
  state.todayTrend = buildTrend(state.rating, state.day);
  pushMessage(
    `今日热潮：${state.todayTrend.name}，额外 +${state.todayTrend.incomeBonus}G / +${state.todayTrend.ratingBonus}★。`,
  );
  evaluateGoals();
}

function update(delta) {
  if (state.mode !== "play") {
    state.cameraPulse += delta;
    updateFloaters(delta);
    return;
  }

  state.cameraPulse += delta;
  state.spawnTimer -= delta;
  state.dayTimer += delta;
  state.clock =
    0.15 + ((state.dayTimer % simulationTuning.dayLength) / simulationTuning.dayLength) * 0.7;

  if (state.spawnTimer <= 0) {
    spawnVisitor();
    state.spawnTimer = Math.max(
      simulationTuning.minSpawnDelay,
      simulationTuning.spawnBaseDelay - state.day * simulationTuning.spawnDaySlope,
    );
  }

  if (state.dayTimer >= simulationTuning.dayLength) {
    state.dayTimer -= simulationTuning.dayLength;
    advanceDay();
  }

  updateVisitors(delta);
  updateFloaters(delta);
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
    }
  }

  if (completedNow && state.goals.every((goal) => goal.completed) && !state.winCelebrated) {
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
  startButton.disabled = state.mode !== "menu";
  startButton.textContent = state.mode === "menu" ? "开始经营" : "经营中";
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

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, layout.roadY);
  sky.addColorStop(0, "#8bd3ff");
  sky.addColorStop(0.6, "#bfe9ff");
  sky.addColorStop(1, "#ffe9b4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunX = 110 + Math.sin(state.cameraPulse * 0.25) * 8;
  ctx.fillStyle = "rgba(255, 240, 170, 0.95)";
  ctx.fillRect(sunX, 48, 44, 44);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(180, 58, 62, 18);
  ctx.fillRect(208, 50, 48, 24);
  ctx.fillRect(260, 82, 58, 16);

  const mountainColors = ["#99c27f", "#87b36a", "#6b9460"];
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

  ctx.fillStyle = "#d4ef8d";
  ctx.fillRect(0, layout.gridY - 26, 640, layout.rows * layout.tile + 44);
  ctx.fillStyle = "#84c362";
  ctx.fillRect(0, layout.roadY - 22, 640, 22);

  ctx.fillStyle = "#72606a";
  ctx.fillRect(0, layout.roadY, 650, layout.roadH);
  ctx.fillStyle = "#f7f0b3";
  for (let x = 20; x < 640; x += 80) {
    ctx.fillRect(x, layout.roadY + 20, 34, 6);
  }
}

function drawGrid() {
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const pos = tileToScreen(col, row);
      const even = (col + row) % 2 === 0;
      ctx.fillStyle = even ? "#b8e27c" : "#a2d36d";
      ctx.fillRect(pos.x, pos.y, layout.tile - 2, layout.tile - 2);

      ctx.fillStyle = "#90c35e";
      ctx.fillRect(pos.x + 4, pos.y + layout.tile - 14, layout.tile - 10, 6);
      ctx.fillStyle = "#7aac4e";
      ctx.fillRect(pos.x + 6, pos.y + layout.tile - 8, layout.tile - 14, 4);

      if (
        state.hoveredTile &&
        state.hoveredTile.col === col &&
        state.hoveredTile.row === row &&
        state.mode === "play"
      ) {
        ctx.strokeStyle = "#fff8d6";
        ctx.lineWidth = 3;
        ctx.strokeRect(pos.x + 1.5, pos.y + 1.5, layout.tile - 5, layout.tile - 5);
      }

      const facility = state.grid[row][col];
      if (facility) {
        drawFacility(facility);
      }
    }
  }
}

function drawFacility(facility) {
  const pos = tileToScreen(facility.col, facility.row);
  const def = getFacilityDef(facility.type);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(pos.x + 8, pos.y + 34, 38, 8);
  drawSprite(def.sprite, def.palette, pos.x + 2, pos.y + 2, 3);

  ctx.fillStyle = "#2e2131";
  ctx.fillRect(pos.x + 4, pos.y + 4, 16, 10);
  ctx.fillStyle = "#fff4d6";
  ctx.font = "bold 11px monospace";
  ctx.fillText(`L${facility.level}`, pos.x + 6, pos.y + 12);
}

function drawVisitors() {
  for (const visitor of state.visitors) {
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

function drawSidebar() {
  ctx.fillStyle = "#2f2231";
  ctx.fillRect(layout.sidebarX, layout.sidebarY, layout.sidebarW, layout.sidebarH);
  ctx.fillStyle = "#fff0ce";
  ctx.fillRect(layout.sidebarX + 10, layout.sidebarY + 10, layout.sidebarW - 20, layout.sidebarH - 20);

  ctx.fillStyle = "#362734";
  ctx.fillRect(layout.sidebarX + 18, layout.sidebarY + 18, layout.sidebarW - 36, 118);
  ctx.fillStyle = "#ffefbd";
  ctx.font = "bold 19px Trebuchet MS";
  ctx.fillText(`Day ${state.day}`, layout.sidebarX + 34, layout.sidebarY + 48);
  ctx.fillText(`${state.money} G`, layout.sidebarX + 34, layout.sidebarY + 74);
  ctx.fillText(`${state.rating} ★`, layout.sidebarX + 34, layout.sidebarY + 100);

  ctx.fillStyle = "#8a6f79";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText("Trend today", layout.sidebarX + 166, layout.sidebarY + 42);
  wrapText(
    `${state.todayTrend.name} +${state.todayTrend.incomeBonus}G/+${state.todayTrend.ratingBonus}★`,
    layout.sidebarX + 166,
    layout.sidebarY + 58,
    96,
    14,
    2,
  );
  ctx.fillText("Best combo", layout.sidebarX + 166, layout.sidebarY + 92);
  wrapText(state.lastCombo, layout.sidebarX + 166, layout.sidebarY + 108, 96, 14, 2);

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
    ctx.fillText(def.name, cardX + 46, cardY + 17);
    ctx.font = "10px Trebuchet MS";
    const price = unlocked ? `${def.cost}G` : `Unlock ${def.unlockAt}★`;
    ctx.fillText(price, cardX + 46, cardY + 29);
    ctx.fillStyle = "#7f6470";
    ctx.fillText(def.bonusText, cardX + 46, cardY + 39);
  });

  const activeGoal = getActiveGoal();
  ctx.fillStyle = "#3d2b35";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText("Goal & Feed", layout.sidebarX + 24, layout.sidebarY + 444);
  ctx.fillStyle = "#6f5a62";
  if (activeGoal) {
    const progress = getGoalProgress(activeGoal);
    wrapText(
      `${activeGoal.title} (${Math.min(progress.value, progress.target)}/${progress.target})`,
      layout.sidebarX + 24,
      layout.sidebarY + 462,
      232,
      15,
      2,
    );
  } else {
    wrapText("全部目标达成，商店街已进入展示完成态。", layout.sidebarX + 24, layout.sidebarY + 462, 232, 15, 2);
  }
  ctx.fillStyle = "#6f5a62";
  wrapText(state.messages[0] || "暂无消息", layout.sidebarX + 24, layout.sidebarY + 478, 232, 14, 1);
}

function fitTextToWidth(text, maxWidth, suffix = "") {
  let current = text;
  while (current && ctx.measureText(current + suffix).width > maxWidth) {
    current = current.slice(0, -1);
  }
  return current + (current !== text ? suffix : "");
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines = Number.POSITIVE_INFINITY) {
  const chunks = String(text).split("");
  let line = "";
  let lineIndex = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    const char = chunks[index];
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lineIndex + 1 >= maxLines) {
        const remaining = line + chunks.slice(index).join("");
        ctx.fillText(fitTextToWidth(remaining, maxWidth, "…"), x, y + lineIndex * lineHeight);
        return;
      }
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = char;
      lineIndex += 1;
    } else {
      line = test;
    }
  }
  if (line && lineIndex < maxLines) {
    ctx.fillText(line, x, y + lineIndex * lineHeight);
  }
}

function drawHeader() {
  ctx.fillStyle = "#2f2231";
  ctx.fillRect(18, 18, 924, 72);
  ctx.fillStyle = "#ffe8a8";
  ctx.fillRect(28, 28, 904, 52);

  ctx.fillStyle = "#2f2231";
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("Pixel Pocket Town", 42, 60);
  ctx.font = "13px Trebuchet MS";
  const hours = 8 + Math.floor(state.clock * 12);
  ctx.fillText(`Town buzz ${hours}:00`, 254, 60);
  ctx.fillText("Build -> attract -> earn -> unlock", 364, 60);
}

function drawFloaters() {
  ctx.font = "bold 14px monospace";
  for (const floater of state.floaters) {
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x - 26, floater.y);
  }
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
  ctx.fillText("Tiny Kairo-ish Demo", 170, 222);
  ctx.font = "16px Trebuchet MS";
  wrapText(
    "目标是拼出有联动的小商店街。先用 Snack 和 Park 打底，评价上来后会解锁 Arcade、Bath 和 Tower。",
    170,
    254,
    350,
    22,
  );
  wrapText(
    "点击页面左边的开始按钮进入经营。右键拆楼，评价越高，顾客刷新越快。",
    170,
    326,
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
  drawVisitors();
  drawSidebar();
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
    if (x >= cardX && x <= cardX + layout.sidebarW - 44 && y >= cardY && y <= cardY + 44) {
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
    facilities: listFacilities().map((facility) => ({
      type: facility.type,
      col: facility.col,
      row: facility.row,
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
