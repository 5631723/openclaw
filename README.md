# 小镇观察模拟器

一款开罗风像素经营观察游戏：在小镇上放置设施、接待访客、赚取 G 和 ★，同时观察人流、天气、季节、时段与节庆如何改变街区的生活节律。

技术栈：纯 HTML + CSS + 原生 JavaScript（ES Module），零依赖，单页运行。

## 快速开始

项目需要本地静态服务器运行（ES Module 无法通过 `file://` 直接打开，双击 `index.html` 会被浏览器拦截）。

```powershell
cd "C:\Users\MI\Desktop\codex_git"
npm run serve
```

启动后访问：<http://127.0.0.1:4173/>

> 备用方式：无 Node 环境时直接运行 `python -m http.server 4173`，或使用 VS Code 的 Live Server 打开 `index.html`。

## 玩法

1. 点击「开始经营」进入营业状态，在右侧卡片选择设施
2. 点击地块放置设施，顾客会沿街自动前往消费
3. 相邻设施触发组合加成，赚取更多 G 和 ★
4. 完成侧栏目标，把街区经营起来

- **设施**：Snack Bar / Sunny Park / Mini Arcade / Pocket Bath / Idol Tower，高阶设施占地更大，需 ★ 解锁；每天有 1 个「今日热潮」设施获得额外收益
- **观察要素**：顾客分学生、家庭、上班族、游客四类原型，会受天气、时段、季节与节庆影响；热门店门口会出现排队与拥挤；默认建筑有街坊办事人流
- **世界模拟**：四季、5 种天气、昼夜时段、年度节庆与随机事件会真实影响客流与收益
- **季报**：季度切换自动弹报，可随时在右侧补看上一季报表

## 操作

| 操作 | 说明 |
| --- | --- |
| 左键 | 选择 / 放置设施 |
| 右键 | 拆除设施 |
| `0` | 取消选中，切回观察模式 |
| `1-5` | 快捷选择设施 |
| `-` / `+` | 调整观察节奏 |
| `F` / `R` | 全屏 / 重新开档 |

## 项目结构

- `index.html` — 页面入口与左侧面板
- `styles.css` — 界面样式
- `game.js` — 核心玩法与渲染逻辑（约 1.1 万行单文件）
- `scripts/` — 自动化测试脚本（smoke、季报、队列、红绿灯、事件矩阵等）

## 测试

```powershell
npm install
npm test
```

`npm test` 运行关键链路 smoke test（开始游戏 → 放置设施 → 顾客消费 → 拆除设施），产物输出到 `output/web-game/`。另有专项测试：`npm run test:quarter`、`test:queue`、`test:traffic`、`test:incidents`。

## 在线 Demo

<https://5631723.github.io/openclaw/>

首次推送后 GitHub Pages 需要 1–3 分钟完成部署，刚打开若为 404 请稍后刷新。
