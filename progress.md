Original prompt: 你写一个小demo，美术风格和你整理描述的差不多就可以

- 2026-03-18: 仓库当前几乎为空，计划从零构建一个开罗风像素经营 demo。
- 目标: 零依赖静态网页，可直接本地打开或经本地服务运行。
- 玩法草案: 选择设施并放置到像素地块上，访客自动游走消费，设施组合产生加成，天数推进带来收入与评价增长。
- 需要补充: `window.render_game_to_text`、`window.advanceTime(ms)`、自动化交互验证。
- 2026-03-19: 补完经营闭环，新增每日热潮 `todayTrend`、阶段目标 `goals`、完成态 overlay，以及更完整的状态输出。
- 2026-03-19: 为 Playwright 自动化补了测试友好的 simulation tuning，`navigator.webdriver` 下只靠 `advanceTime(ms)` 推进，避免截图和文本状态漂移。
- 2026-03-19: 新增 `scripts/smoke.mjs` 和 `smoke-actions.json`，`npm test` 会起本地静态服务并调用技能目录里的 `web_game_playwright_client.js`。
- 2026-03-19: fresh smoke test 已生成 `output/web-game/shot-0.png` 和 `output/web-game/state-0.json`；本轮结果包含 2 次已完成接待、右键拆除链路、无 `errors-0.json`。
- 注意: 当前自动化会打印一个来自技能目录 `web_game_playwright_client.js` 的 `MODULE_TYPELESS_PACKAGE_JSON` warning，不影响运行；若想去掉，需要给 `C:\\Users\\MI\\.codex\\skills\\develop-web-game\\package.json` 补 `\"type\": \"module\"`。
