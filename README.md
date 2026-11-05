# Tape

**一列标的，一眼看清。**

为 A 股与 ETF 日内盯盘而做的极简自选行情页。没有资讯流、没有多余面板——只有一列高密度、可直接对比的走势带。

[![Deploy to GitHub Pages](https://github.com/yorhaha/stock-watch/actions/workflows/deploy.yml/badge.svg)](https://github.com/yorhaha/stock-watch/actions/workflows/deploy.yml)
[![Live](https://img.shields.io/badge/live-yorhaha.github.io%2Fstock--watch-17181a)](https://yorhaha.github.io/stock-watch/)

![Tape 深色主题](docs/tape-dark.png)

## 为什么是 Tape

盯盘时最常做的动作，是**在一组标的之间来回扫一眼**：谁在拉升，谁在跳水，谁还在横盘。

大部分行情页把这件事拆成了点击、切换和很多块信息。Tape 把它重新压回一个动作：一列标的，每只固定一行，完整分时线、价格与涨跌同时可见。需要更多信息时，点击打开独立分时详情层，不改变列表密度。也可以切换双列，把更多标的收进同一屏。

围绕这个目标，项目只保留三件事：

- **一眼可比较**：统一的时间轴、昨收基准线和涨跌色，让每只股票的形状可以直接纵向对比。
- **一行有深度**：点击打开分时详情层，保留完整图表、成交量与关键指标，列表仍是单行。
- **没有多余步骤**：`⌘K` 添加，方向键浏览，回车打开详情；自选与偏好自动保存在本地。

## 功能

- **单行走势带**：默认单列时每个标的固定一行，一条当日分时 Sparkline，带昨收虚线基准，红涨绿跌一眼可辨；股票与 ETF 均不显示代码。
- **指数实时走势与自定义**：每张指数卡带实时分时缩略线；点击查看分时与日K详情；从预设列表中选择、移除或上下调动指数（最多 6 个），也可一键按涨跌幅排序；预设覆盖 A 股主要指数、恒生指数、恒生科技与韩国 KOSPI / KOSPI200。
- **指数数值可隐藏**：设置中可将指数卡切换为只显示名称、涨跌幅与走势，进一步压缩高度。
- **单屏 15+**：默认 16 只股票；390×844 移动端首屏 16 行全部可见，1440×1080 桌面首屏 16 行完整可见。
- **独立分时详情**：价格线、均价线、成交量、今开 / 最高 / 最低 / 昨收 / 成交额 / 换手 / 量比 / 振幅，以及逐分钟悬停详情。
- **实时刷新**：盘中行情每 3–10 秒刷新（可设置），分时图约每 30 秒同步；页面隐藏时暂停请求，回到前台立即补刷。
- **沪深京 A 股与 ETF 搜索**：支持名称、拼音与 6 位代码，ETF 价格保留 3 位小数；最多可放 30 个标的。
- **涨跌幅排序**：设置中可在自选顺序、涨跌幅从高到低、从低到高之间切换；排序不改变手动顺序。
- **批量导入**：粘贴多行文本，每行一个股票或 ETF 名称；自动识别、去重，并标记已在自选、未找到、多个匹配与超出上限的条目。
- **自选管理**：拖动排序，或使用上下箭头调整；移除后可在 Toast 中撤销。
- **明暗主题**：自动跟随系统，也可手动固定浅色 / 深色。
- **显示自定义**：隐藏价格、隐藏指数数值、切换单列 / 双列，全部即时生效并保存；涨跌幅始终以红绿色块呈现。
- **键盘操作**：`⌘K` / `/` 添加，`↑` `↓` 浏览，`↵` 打开详情，`Esc` 关闭。
- **移动优先**：导航与市场时钟合并为单行；手机端以 40px 行高呈现行情，短屏设备进一步压缩行高，优先保证列表密度。
- **没有多余说明文字**：主界面只保留数据、标题与操作图标；只有输入与识别结果需要辨认时才出现功能标签。
- **Agent 可读**：行情行与指数暴露 `data-secid`、`data-code`、`data-price`、`data-pct`、`data-status`、`data-market-phase`、`data-show-price`、`data-show-index-value`、`data-layout`、`data-sort`、`data-index-count` 等稳定属性，便于自动化检查与 AI Agent 读取。
- **纯静态**：Next.js 静态导出，无服务端、无数据库，直接部署 GitHub Pages。

## 预览

| 浅色 | 深色 |
| --- | --- |
| ![浅色主题](docs/tape-light.png) | ![深色主题](docs/tape-dark.png) |

![分时详情](docs/tape-detail.png)

<p align="center">
  <img src="docs/tape-mobile.png" width="320" alt="Tape 移动端单列" />
  <img src="docs/tape-double.png" width="320" alt="Tape 双列模式" />
</p>

<p align="center">
  <img src="docs/tape-batch.png" width="320" alt="Tape 批量导入识别结果" />
  <img src="docs/tape-index.png" width="320" alt="Tape 自定义指数并隐藏数值" />
  <img src="docs/tape-focus.png" width="320" alt="隐藏价格" />
</p>

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

检查类型并构建静态产物：

```bash
npm run typecheck
npm run build
```

静态文件会生成在 `out/`。

## 部署到 GitHub Pages

仓库已包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。推送到 `main` 后：

1. 打开仓库 **Settings → Pages**。
2. 将 **Source** 设为 **GitHub Actions**。
3. 等待 `Deploy to GitHub Pages` 工作流完成。

工作流会把 Pages 提供的 `base_path` 注入 `NEXT_PUBLIC_BASE_PATH`，所以项目站点路径（如 `/stock-watch`）下的 JS、CSS、图标与 manifest 都能正确加载。

如需手动构建项目站点：

```bash
NEXT_PUBLIC_BASE_PATH=/stock-watch npm run build
```

## 技术结构

```text
app/
  layout.tsx          # 元信息、主题预置、字体与全局样式入口
  page.tsx            # 静态首页
components/
  WatchlistApp.tsx    # 页面编排、键盘交互、Toast、编辑模式
  StockRow.tsx        # 单行行情带
  DetailSheet.tsx     # 股票 / 指数详情层
  Sparkline.tsx       # 列表用分时缩略线
  DetailChart.tsx     # 分时主图、成交量、悬停十字线
  AddStockDialog.tsx  # ⌘K 搜索添加 / 批量导入
  BatchImportPanel.tsx # 多行名称识别与导入
  SettingsPopover.tsx # 主题、涨跌色、显示、布局、指数与刷新
  IndexStrip.tsx      # 自定义指数走势条
  IndexManagerDialog.tsx # 指数预设选择、排序与移除
  MarketClock.tsx     # 上海时间与市场状态
hooks/
  useMarketData.ts    # 批量行情、分时、轮询与页面可见性
  useWatchlist.ts     # 自选持久化
  useIndices.ts       # 自定义指数持久化
  usePreferences.ts   # 主题、显示与排序偏好
lib/
  eastmoney.ts        # 行情 / 分时 / 搜索数据源
  chart.ts            # 纯函数图表几何计算
  market.ts           # 交易时段、格式化、默认自选、ETF 校验与排序
```

设计上刻意没有引入 UI 组件库或图表库：图表路径、布局、动效与交互都由少量纯函数和 CSS 实现。这样页面没有运行时框架负担，视觉也能保持统一。

主界面不靠文案解释行为：添加是右上角唯一的实心按钮，铅笔进入编辑，点击任意标的打开分时详情，图表本身就是分时结构；批量导入只在输入与识别结果需要辨认时显示必要标签。

## 数据说明

- 行情、分时、股票 / ETF 搜索均来自**东方财富公开接口**，在浏览器端直接请求，项目本身不存储任何行情数据。港股与韩国指数按北京时间显示交易时段（港股 09:30–12:00、13:00–16:00；韩国 08:00–14:30）。
- 公开接口可能变更、限流或出现延迟，页面会在连接异常时保留最近一次数据并提示重试；开盘前当日分时为空时，会自动回退到最近交易日的分时。
- 交易日状态按北京时间与工作日推算，未接入单独的节假日日历。
- 本项目仅用于学习与个人看盘，**不构成任何投资建议**。

## License

[MIT](LICENSE) © 2026 yorhaha
