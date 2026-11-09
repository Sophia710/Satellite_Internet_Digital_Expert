# 卫星互联网数字专家 · AI 对话工作台（Vue 3 前端工程）

把已验收的高保真原型 `source/原型-原始.html` 改造成可维护的前端工程。视觉、文案、演示时序与原型的**成品**保持一致，同时把原先挤在单文件里的装配契约（`data-component`、`window.DS*` 句柄、`CustomEvent` 通信）换成 Vue 的组件、路由与 Pinia 状态。

## 技术栈

| 能力 | 选型 |
| --- | --- |
| 视图层 | Vue 3.5（全部业务组件 `<script setup>`） |
| 路由 | vue-router 4（hash 模式，刷新/深链可用） |
| 状态 | Pinia 3（4 个领域 store） |
| 构建 | Vite 6（`base: './'`，单 JS + 单 CSS 产物） |
| 数据 | 本地 mock service + JSON 种子（无后端依赖） |

## 目录结构

```
app/
├─ index.html                 入口（内联 favicon，无外链）
├─ vite.config.js             单入口、CSS 不拆分、相对 base
└─ src/
   ├─ main.js                 createApp + Pinia + router + 全局样式
   ├─ App.vue                 Sprite + router-view + PopoverHost + ConfirmDialog
   ├─ router/index.js         / · /w/:conversationId · /w/:conversationId/artifact/:artifactId · 404
   ├─ layouts/
   │  └─ WorkbenchLayout.vue  三栏壳：左右栏折叠/展开、右栏拖拽与键盘调宽、主题
   ├─ views/
   │  ├─ WorkbenchView.vue    路由 ↔ store 双向同步（会话与产物页签的深链还原）
   │  └─ NotFoundView.vue
   ├─ features/               按领域垂直切分，每个领域自带 store 与组件
   │  ├─ shell/store.js       左栏折叠、右栏开合与宽度（320–720，localStorage）、主题
   │  ├─ session/             历史树、项目/会话行菜单、重命名、删除确认
   │  ├─ chat/                对话流、欢迎态、思考块、步骤时间线、回答与产物卡
   │  ├─ composer/            输入框、草稿、autosize、模型浮层、@提及、附件、语音三态
   │  └─ artifact/            页签栏、工具栏、文件树、7 种格式渲染视图
   ├─ services/
   │  ├─ artifacts.js         产物目录（md/xlsx/html 报告/3 图表 html/png）、文件树、各格式源文
   │  ├─ mockApi.js           演示回放时间轴（700ms → 5800ms 共 9 个节点）
   │  └─ seeds/*.json         历史、模型、提及、演示数据
   └─ shared/
      ├─ ui/                  Sprite / Icon / PopoverHost / ConfirmDialog + popover、dialog 控制器
      ├─ lib/markdown.js      mdToHtml、md↔html 序列化、格式判定（kind/format/view）
      ├─ styles/app.css       全量设计 token 与组件样式（原样搬运 + 少量修正）
      └─ icons/sprite.svg     58 个 symbol 图标（已修正抽取锚点）
```

## 路由

| 路径 | 说明 |
| --- | --- |
| `/` | 欢迎态（未进入具体会话） |
| `/w/:conversationId` | 打开某个会话并还原其对话内容 |
| `/w/:conversationId/artifact/:artifactId` | 会话 + 指定产物页签（深链） |
| 其他 | 404 视图 |

产物页签的打开/切换/关闭会反写 URL，因此「打开过的标签」可以复制链接复现。

## 关键行为

- **欢迎态**：标题「你好，今天想完成什么任务」，3 张快捷任务卡；点击只把完整提示词预填进输入框，不自动发送。新建对话页输入框在标题与快捷任务之间（与卡片同宽，整块垂直居中）；发出首条消息后输入框回到底部页脚停靠，焦点自动跟随。
- **演示回放**：发送后按 `services/mockApi.js` 的时间轴依次点亮思考块、4 个步骤（0/4 → 4/4）、正文、代码、引用、四张产物卡（md / xlsx / 图表 html / png）。
- **产物视图按格式分流**：
  - `.md` → 文档预览 / 源码编辑（编辑与预览同源，输入 400ms 防抖后显示「已保存」）
  - `.html` → 网页预览 / 源码编辑（同上），且仅网页预览态出现「选择元素」；每个 HTML 产物各有一份源码（折线图、柱状图、雷达图互不串稿）
  - `.xlsx` → 只读表格视图（A1:E6、行号列、判定列）
  - `.png` 等图片 → 只读图片视图（灰底画布居中放原图 + 文件名与尺寸说明），无编辑/预览切换、无「选择元素」
  - `.docx` / `.pdf` / `.pptx` → 只读页面视图，不提供编辑与预览切换
- **图表产物**：折线（时延 P95/P50 走势）、柱状（波束角度吞吐 vs 质量分）、雷达（7 号 / 12 号链路六维健康度）都在 `services/artifacts/charts/*.html` 里用**静态 SVG** 手绘（Python 算好坐标生成，不引 echarts），连同 PNG 一起进文件树（8 个文件），`?raw` / `?inline` 打进包，单文件离线打开也能看。
- **右栏**：宽度范围与原型同口径——下限 320px，上限按视口算（`视口宽 - 左栏实宽 - 中栏最小 360`，1440 宽屏下为 820，不是写死 720）；拖拽锚定视口右缘（宽度 = 视口宽 - 指针 X），`←/→` 步进 16、`Home` 收到 320、`End` 拉到上限，窗口缩放会自动收回越界宽度；页签支持 `←/→/Home/End/Enter/Space/Delete`。
- **文件树**：与产物内容并排贴在右栏右侧（240px，`data-open` 控制开合），不是铺在底部；展开时若预览区会被压到 420px 以下，自动把右栏撑到 720px，避免表格被挤成横向滚动条。当前文件按文件名回指高亮，点击即切页签。树里共 8 个文件：md / xlsx / docx / html 报告 + 3 个图表 html + 1 张 png。
- **新标签页**：启动页在内容区之外，`data-tab="launcher"` 时内容区整块隐藏、启动页照常显示。
- **左栏**：可折叠；项目与会话行在 hover 时出现「⋯」菜单（重命名 / 置顶 / 移动 / 删除），删除走确认框。
- **输入框**：草稿按会话隔离、Enter 发送 / Shift+Enter 换行、3–10 行 autosize、上传附件（原「＋」按钮已替换为附件按钮，本版本只保留附件上传，点选文件生成附件 chip、可逐个移除）、模型浮层、`@` 提及、语音三态。
- **主题**：浅/深双主题，切换持久化。

## 本地运行

```powershell
cd D:\XW\Project\Satellite_Internet_Digital_Expert\app
npm install          # 依赖已锁在 package.json
npm run dev          # 开发（vite，默认 5173）
npm run build        # 生产构建 + 自动生成根目录 原型.html
```

> `npm install` 必须在 `app\` 目录内执行；在交付根执行 `npm --prefix app install` 会因找不到 package.json 报 `ENOENT`。

## 质量门禁

```powershell
cd D:\XW\Project\Satellite_Internet_Digital_Expert
node scripts\audit-src.mjs        # 工程规则：6 条源码规则 + 4 条 router 规则
node scripts\build-single.mjs     # dist → 单文件 原型.html（残留外链直接失败）

# 视觉/行为验收（需要 app 已构建，并有一个本地服务指向 app/dist）
cd app; python -m http.server 4600 --directory dist
cd ..
python scripts\verify.py            # 25 条断言 + 27 张截图
python scripts\verify-interactions.py  # 29 条交互断言（菜单/确认框/附件上传/提及/语音/文件树/右栏/产物格式分流）
```

最近一次结果：

- `scripts/audit-src.mjs` → `ok: true`（scanned 40，rules 6，routerRules 4）
- `scripts/verify.py` → **25/25 通过**，截图在 `docs/验收截图/`，报告 `docs/验收报告.json`
- `scripts/verify-interactions.py` → **29/29 通过**（浮层 8 条 + 附件上传 4 条 + 文件树布局 5 条 + 启动页 + 右栏拉伸范围 6 条 + 产物格式分流 5 条 + console），报告 `docs/交互补充验收.json`
- `scripts/build-single.mjs` → `原型.html` 378,443 字节（`cssInlined 1 / jsInlined 1 / externalRefs 0`，含图表 SVG 与 PNG data URI），双击可离线打开

## 交付物说明

| 路径 | 用途 |
| --- | --- |
| `app/` | 前端工程本体（开发、构建的入口） |
| `原型.html` | 由当前构建自动内联出的单文件版本，供快速预览/演示，**不是**工程源码，改代码请改 `app/src` 后重新构建 |
| `source/原型-原始.html` | 改造前的成品原型，唯一视觉/行为对照源 |
| `build/` | 从原型抽取 CSS/sprite/body/数据岛的脚本与中间产物（`extract.mjs`） |
| `docs/验收截图/` | 验收截图（01–12 主链路、20–26 交互层、30 单文件离线、31 文件树右侧、32 新标签页启动页） |
| `scripts/` | 审计、单文件打包、两套验收脚本 |

## 与原型的关系

- 保留：`--ds-*` 设计 token、组件类名与视觉、文案、演示时间轴、键盘交互。
- 替换：`data-component` 标记仍作为稳定选择器保留，但不再承担装配职责；`window.DS*` 全局句柄与 `CustomEvent` 通信已全部删除（`audit-src.mjs` 会拦截回潮）。
- 已知差异：样式仍是一整份 `app.css`（未按组件拆分/未 scoped），这是「先保视觉一致」的取舍；`查/改` 某组件样式时按类名前缀定位即可。
