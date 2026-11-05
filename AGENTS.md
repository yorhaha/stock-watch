# AGENTS.md

## UI设计规范

我希望它能像 Linear 官网或 Apple 备忘录一样，拥有近乎极致的完成度：目标纯粹、 架构简洁、设计克制、实现精炼。

删掉所有口号式文案、辅助说明和次要标签。如果一个界面必须依赖这些文字才能让用户理解，那就应该重新设计布局，让界面本身清晰直观、不言自明。

每一个设计与技术决策，都应该同时提升用户体验(UX)、开发者体验(DX)和AI Agent 体验(AX),并且不能破坏任何现有功能。

配色：整理页面中使用的颜色，优先沿用已有品牌色和配色规范。如果还没有完整的配色方案，可以参考 Radix Colors，按背景、文字、边框和交互状态选择对应颜色。同类元素尽量使用一致的配色。

装饰：检查页面里的圆角、阴影，尤其是卡片左侧的彩色线条，减少没有明确用途的装饰。同类组件使用一致的圆角。阴影可以用来区分弹窗、下拉菜单等浮层，不必给每张卡片都加。色条如果用于表示状态或分类，可以保留。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
