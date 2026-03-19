# Pixel Pocket Town

一个带开罗风像素气质的轻量经营 demo。玩家通过放置设施、触发街区联动、接待访客并提升评价，逐步把小商店街经营起来。

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
- `Mini Arcade` / `Pocket Bath` / `Idol Tower`：需要更高评价解锁
- 每天会刷新一个 `Trend today` 热潮设施，对应设施会拿到额外收入和评价

### 操作

- 鼠标左键：选择设施 / 放置设施
- 鼠标右键：拆除设施
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

测试脚本会输出：

- `output/web-game/shot-0.png`
- `output/web-game/state-0.json`

## 主要文件

- `index.html`：页面入口
- `styles.css`：界面样式
- `game.js`：核心玩法和渲染逻辑
- `scripts/smoke.mjs`：本地 smoke test runner
- `smoke-actions.json`：自动化输入脚本
- `progress.md`：开发记录和交接说明
