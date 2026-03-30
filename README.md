# 小镇观察模拟器

一个带开罗风像素气质的轻量经营 demo。玩家通过放置设施、触发街区联动、接待访客并提升评价，逐步把小商店街经营起来；新版本还加入了顾客对白、多格大型设施、天气季节，以及会真实影响客流和收益的节庆活动。

## 项目描述

- 类型：零依赖静态网页经营游戏
- 技术栈：HTML、CSS、原生 JavaScript
- 目标：本地直接打开可玩，同时支持自动化 smoke test 和 GitHub Pages 在线演示

## 在线 Demo

- 预期地址：<https://5631723.github.io/openclaw/>

说明：
首次推送带 Pages workflow 的提交后，GitHub 需要一点时间完成部署。如果刚打开是 `404`，通常等 1 到 3 分钟再刷新即可。

## 玩法说明

### 核心循环

1. 点击“开始经营”进入营业状态
2. 在右侧卡片里选择设施
3. 点击地块放置设施，顾客会自动前往消费
4. 利用相邻设施触发组合加成，赚取更多 `G` 和 `★`
5. 完成侧栏目标，逐步把街区经营到完成态

### 设施与成长

- `Snack Bar`：前期主力赚钱点，遇到 `Sunny Park` 会更受欢迎
- `Sunny Park`：提高人气，也是多个设施的联动核心
- `Mini Arcade` / `Pocket Bath` / `Idol Tower`：需要更高评价解锁，且会占用更多格子
- 每天会刷新一个 `Trend today` 热潮设施，对应设施会拿到额外收入和评价

### 新增系统

- `Town Talk`：顾客会低频冒出跟随自身移动的简短自言自语，对天气、时段和目标店铺做出反应
- `Large Footprints`：高阶设施会占据 `2x1`、`2x2`、`3x2` 等更大地块，布局需要提前留空间
- `Weather & Season`：春夏秋冬、每日天气和昼夜时段会共同影响客流、设施收益与评价倾向
- `Festival Effects`：年度节庆现在会真正生效，带来主题加成、额外客流和更明显的环境提示
- `Festival Hooks`：状态输出里已保留年度节庆和事件/事故队列字段，方便后续扩展节日活动与随机事件
- `Visitor Routing`：顾客会从多个方向进入，并优先沿建筑周边的步行引导格绕开阻挡去接近目标设施
- `Visitor Archetypes`：顾客现在开始区分学生客、家庭客、上班族、游客，不同人群会偏好不同设施、天气、时段和节庆
- `Town Landmarks`：开局会随机生成至少 `3` 个不可拆除的大型固定建筑，并点缀少量可拆除树木，让小镇一开始就有生活气息
- `Observe Mode`：右侧新增取消选中商店的观察模式，左键不再默认乱铺；键盘 `0` 也可以快速清空当前选择
- `Queue & Crowding`：热门店铺门口会开始排队，顾客会因为过挤或排太久而离开，店铺也会显示当前排队状态
- `Quarter Review Recall`：季度切换时会自动弹出季报；如果当时没细看，右侧顶部信息卡也可以手动补看上一季报表

### 操作

- 鼠标左键：选择设施 / 放置设施
- 鼠标右键：拆除设施
- 右侧顶部 `补看上季`：重新打开最近一次季度报告
- `0`：取消当前设施选中，切回观察模式
- `1-5`：快捷切换设施
- `R`：重新开档
- `F`：切换全屏

## 本地运行

最简单的方式是直接双击打开 `index.html`。

如果你想走本地服务：

```powershell
python -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173
```

## 自动化验证

项目内置了一个 Playwright smoke test，用来验证“开始游戏 -> 放置设施 -> 顾客消费 -> 拆除设施”这条关键链路。

运行方式：

```powershell
npm install
npm test
```

如果默认端口 `4173` 已被占用，可以临时改用别的端口：

```powershell
$env:SMOKE_PORT='4274'
npm test
```

测试脚本会输出：

- `output/web-game/shot-0.png`
- `output/web-game/state-0.json`

`state-0.json` 现在还会额外输出：

- `world`：季节、天气、年度节庆占位信息
- `facilities.width / height`：多格设施占地信息
- `npcs` / `dialogue`：NPC 对白状态
- `lastQuarterReport`：最近一季报表摘要，便于验证“自动弹出后仍可手动补看”

## 主要文件

- `index.html`：页面入口
- `styles.css`：界面样式
- `game.js`：核心玩法和渲染逻辑
- `scripts/smoke.mjs`：本地 smoke test runner
- `smoke-actions.json`：自动化输入脚本
- `progress.md`：开发记录和交接说明
