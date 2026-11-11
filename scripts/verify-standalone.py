import io
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\dist\卫星互联网数字专家.html")
SHOTS = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\单文件验收")
REPORT = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\单文件验收报告.json")
SAMPLE_FILE = r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\验收样例\时延日志样例.csv"
PROMPT_1 = "请分析承载网时延日志数据，研判多轨卫星时延态势并生成趋势分析。"

SHOTS.mkdir(parents=True, exist_ok=True)
results = []
errors = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)[:300]})
    print(("OK   " if ok else "FAIL ") + name + (("  " + str(detail)) if detail else ""))
    if not ok:
        errors.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    external_requests = []
    pg.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: console_errors.append(str(e)))
    pg.on("request", lambda r: external_requests.append(r.url))

    pg.goto(HTML.as_uri() + "#/", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(500)

    # 1 首屏与默认右栏关闭
    pg.screenshot(path=str(SHOTS / "01-欢迎态.png"))
    check("单文件标题", pg.title() == "卫星互联网数字专家", pg.title())
    check("欢迎标题", pg.locator(".ds-welcome__greeting").inner_text().strip() == "你好，今天想完成什么任务")
    check("快捷任务卡=4", pg.locator(".ds-suggest__card").count() == 4)
    boxes = pg.evaluate("""() => Array.from(document.querySelectorAll('.ds-suggest__card')).map(c => {
      const r = c.getBoundingClientRect();
      return { title: c.querySelector('.suggest-title')?.textContent || c.querySelector('.ds-suggest__title')?.textContent, x: Math.round(r.x), y: Math.round(r.y) };
    })""")
    rows = sorted(set(box["y"] for box in boxes))
    cols = sorted(set(box["x"] for box in boxes))
    check("快捷任务为 2×2 布局", len(rows) == 2 and len(cols) == 2, f"rows={rows}, cols={cols}")
    check("新增遥测数据可视化卡片", any(box["title"] == "遥测数据可视化" for box in boxes), boxes)
    tip_meta = pg.evaluate("""() => Array.from(document.querySelectorAll('.ds-suggest__card')).map(c => {
      const d = c.querySelector('.ds-suggest__desc');
      return {
        tip: c.getAttribute('title') || '',
        text: d?.textContent || '',
        whiteSpace: d ? getComputedStyle(d).whiteSpace : '',
        overflow: d ? getComputedStyle(d).textOverflow : '',
        clipped: d ? d.scrollWidth > d.clientWidth : false
      };
    })""")
    check("快捷任务小字截断且悬停显示全文",
          len(tip_meta) == 4
          and all(t["tip"] == t["text"] and t["whiteSpace"] == "nowrap" and t["overflow"] == "ellipsis" for t in tip_meta)
          and any(t["clipped"] for t in tip_meta), tip_meta)
    layout = pg.evaluate("""() => {
      const left = document.querySelector('.ds-shell__left');
      const bodies = Array.from(document.querySelectorAll('.ds-history__group-body, .ds-history__project, .ds-history__project-body'));
      const composer = document.querySelector('.ds-welcome__composer .ds-composer')?.getBoundingClientRect();
      const suggest = document.querySelector('.ds-welcome__suggest-block')?.getBoundingClientRect();
      return {
        bg: left ? getComputedStyle(left).backgroundColor : '',
        gaps: bodies.map(b => getComputedStyle(b).rowGap),
        composer: composer ? { left: Math.round(composer.left), right: Math.round(composer.right) } : null,
        suggest: suggest ? { left: Math.round(suggest.left), right: Math.round(suggest.right) } : null
      };
    }""")
    check("侧边栏底色为 #F6F6F6", layout["bg"] == "rgb(246, 246, 246)", layout["bg"])
    check("历史树条目间距 3px", layout["gaps"] and all(g == "3px" for g in layout["gaps"]), layout["gaps"])
    check("输入框与快捷任务同宽", layout["composer"] == layout["suggest"], f'{layout["composer"]} / {layout["suggest"]}')
    sidebar = pg.evaluate("""() => ({
      projectBadges: document.querySelectorAll('.ds-history__row--project .ds-task-state').length,
      projectConvs: Array.from(document.querySelectorAll('.ds-history__project-body .ds-history__row--conversation')).map(r => ({ id: r.dataset.convId, status: r.dataset.taskStatus, badge: r.querySelector('.ds-task-state')?.innerText || '' })),
      recent: Array.from(document.querySelectorAll('.ds-history__row--recent')).map(r => ({ id: r.dataset.convId, status: r.dataset.taskStatus, badge: r.querySelector('.ds-task-state')?.innerText || '' }))
    })""")
    check("项目名不显示任务状态", sidebar["projectBadges"] == 0, sidebar)
    all_convs = sidebar["projectConvs"] + sidebar["recent"]
    badges = [c["badge"] for c in all_convs if c["badge"]]
    check("未读状态每种仅一个", len(badges) == 4 and set(badges) == {"进行中", "完成", "待确认", "失败"}, badges)
    status_geom = pg.evaluate("""() => Array.from(document.querySelectorAll('.ds-task-state')).map(s => {
      const r = s.getBoundingClientRect();
      const label = s.querySelector('.ds-task-state__label');
      const lr = label ? label.getBoundingClientRect() : null;
      return {
        status: s.dataset.status,
        width: Math.round(r.width),
        centerGap: lr ? Math.abs((r.top + r.height / 2) - (lr.top + lr.height / 2)) : 99
      };
    })""")
    fixed = [g["width"] for g in status_geom if g["status"] != "running"]
    running = next((g["width"] for g in status_geom if g["status"] == "running"), 0)
    check("状态标签等宽（进行中除外）", fixed and len(set(fixed)) == 1 and running > fixed[0], status_geom)
    check("状态标签文字上下居中", all(g["centerGap"] <= 0.5 for g in status_geom), status_geom)
    check("项目内会话显示未读状态", all(
        next((c for c in sidebar["projectConvs"] if c["id"] == cid), {}).get("status") == status
        for cid, status in [("c11", "completed"), ("c12", "waiting"), ("c22", "failed")]
    ), sidebar["projectConvs"])
    check("最近会话显示未读状态", next((c for c in sidebar["recent"] if c["id"] == "r1"), {}).get("status") == "running", sidebar["recent"])
    check("已读会话不显示状态", all(
        next((c for c in all_convs if c["id"] == cid), {}).get("status") == "none"
        for cid in ["c21", "r2", "r3"]
    ), all_convs)

    # 触发查看后未读状态消失
    pg.locator('.ds-history__row--conversation[data-conv-id="c11"] .ds-history__main').click()
    pg.wait_for_timeout(250)
    c11_status = pg.locator('.ds-history__row--conversation[data-conv-id="c11"]').get_attribute("data-task-status")
    remain = pg.locator(".ds-task-state").count()
    check("查看会话后状态消失", c11_status == "none" and remain == 3, f"{c11_status} / {remain}")
    pg.locator(".pw-new__btn").click()
    pg.wait_for_timeout(300)
    right_w = pg.evaluate("() => document.querySelector('.ds-shell__right').getBoundingClientRect().width")
    check("首次进入右栏关闭", right_w <= 1, right_w)

    # 2 卡片预填、不发送
    cards = pg.locator(".ds-suggest__card")
    cards.nth(0).click()
    pg.wait_for_timeout(200)
    val = pg.locator(".ds-composer__textarea").input_value()
    check("卡片预填完整提示词", val.strip() == PROMPT_1, val)
    check("预填不自动发送", pg.locator(".ds-suggest__card").count() == 4)

    # 3 发送与生成过程
    pg.locator(".ds-composer__send").click()
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(SHOTS / "02-生成中.png"))
    check("发送后进入会话态", pg.locator(".ds-bubble").count() >= 1)
    row_title = pg.locator(".ds-history__row--conversation.is-current .ds-history__main").inner_text().strip()
    header_title = pg.locator(".ds-convhead__title").inner_text().strip()
    check("发送后自动生成会话标题", row_title == "承载网时延日志分析", row_title)
    check("顶部导航同步会话名称", header_title == row_title, f"{header_title} / {row_title}")
    run_status = pg.locator(".ds-history__row--conversation.is-current").get_attribute("data-task-status")
    check("当前会话执行中不显示状态", run_status == "none", run_status)
    pg.wait_for_selector('[data-component="artifact-card"]', timeout=18000)
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(SHOTS / "03-生成完成.png"))
    done_status = pg.locator(".ds-history__row--conversation.is-current").get_attribute("data-task-status")
    check("当前会话完成后不显示状态", done_status == "none", done_status)
    check("顶部导航完成后保留会话名称", pg.locator(".ds-convhead__title").inner_text().strip() == row_title)
    think = pg.locator(".ds-think").inner_text()
    check("思考块完成态", "已深度思考 38 秒" in think, think[:80])
    count = pg.locator(".ds-steps__count").inner_text().strip()
    check("四个步骤完成", count in ("4/4", "4 / 4"), count)
    check("正文与代码揭示", pg.locator(".ds-md").count() == 1 and pg.locator(".ds-code").count() == 1)
    action_meta = pg.evaluate("""() => Array.from(document.querySelectorAll('.ds-msg-actions button')).map(el => ({
      label: el.getAttribute('aria-label'),
      title: el.getAttribute('title')
    }))""")
    check("回答底部仅保留四个操作图标", len(action_meta) == 4 and [a["title"] for a in action_meta] == ["重新生成", "复制回答", "点赞", "点踩"], action_meta)
    check("回答操作图标悬停有功能名", all(a["title"] == a["label"] for a in action_meta), action_meta)
    widths = pg.evaluate("""() => {
      const w = (el) => Math.round(el.getBoundingClientRect().width);
      const composer = document.querySelector('.ds-composer');
      const blocks = Array.from(document.querySelectorAll('.ds-think__card, .ds-steps, .ds-md, .ds-code, .ds-artcard'));
      return {
        composer: w(composer),
        blocks: blocks.map((el) => ({ name: el.className, width: w(el) }))
      };
    }""")
    check("对话内容块与输入框同宽", widths["blocks"] and all(abs(b["width"] - widths["composer"]) <= 1 for b in widths["blocks"]), widths)
    peek_meta = pg.evaluate("""() => Array.from(document.querySelectorAll('.ds-artcard__peek')).map(el => ({
      label: el.getAttribute('aria-label'),
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
      borderWidth: getComputedStyle(el).borderTopWidth,
      background: getComputedStyle(el).backgroundColor
    }))""")
    check("产物卡右侧带查看按钮", len(peek_meta) == 5 and all(p["label"] == "查看" and p["width"] == 26 and p["height"] == 26 for p in peek_meta), peek_meta)
    pg.mouse.move(0, 0)
    pg.wait_for_timeout(300)
    card_style = pg.evaluate("""() => {
      const el = document.querySelector('.ds-artcard');
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, border: s.borderTopWidth, radius: s.borderTopLeftRadius, shadow: s.boxShadow };
    }""")
    check("产物卡默认白底", card_style["background"] == "rgb(255, 255, 255)"
          and card_style["border"] == "1px" and card_style["radius"] == "14px" and card_style["shadow"] == "none"
          and all(p["borderWidth"] == "0px" and p["background"] == "rgba(0, 0, 0, 0)" for p in peek_meta), card_style)
    pg.locator(".ds-artcard__main").first.hover()
    pg.wait_for_timeout(300)
    hover_bg = pg.evaluate("""() => getComputedStyle(document.querySelector('.ds-artcard')).backgroundColor""")
    check("产物卡悬停灰底", hover_bg == "rgb(247, 247, 247)", hover_bg)

    # 4 md 产物：预览、编辑、保存同步
    pg.locator(".ds-artcard__peek").first.click()
    pg.wait_for_timeout(500)
    check("查看按钮打开产物", pg.locator(".ds-aview--doc").count() == 1)
    pg.locator('.ds-artcard[data-id="art-md"] .ds-artcard__main').click()
    pg.wait_for_selector(".ds-aview--doc", timeout=8000)
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOTS / "04-md预览.png"))
    check("md 默认预览", pg.locator(".ds-preview").count() == 1)
    pg.locator('[data-action="mode-toggle"]').click()
    pg.wait_for_selector(".ds-editor__area", timeout=5000)
    check("md 编辑态出现编辑器", pg.locator(".ds-editor__area").count() == 1)
    editor = pg.locator(".ds-editor__area")
    editor.click()
    editor.press("End")
    editor.type("\n单文件验收新增行：7 号链路优先核查路由配置。")
    pg.wait_for_timeout(600)
    check("编辑后出现已保存提示", pg.locator(".ds-atbar__saved").is_visible())
    pg.screenshot(path=str(SHOTS / "05-md编辑.png"))
    pg.locator('[data-action="mode-toggle"]').click()
    pg.wait_for_timeout(300)
    body = pg.locator(".ds-preview").inner_text()
    check("预览与编辑同源", "单文件验收新增行" in body, body[-80:])

    # 5 文件树与多格式视图
    if pg.locator('[data-action="tree-toggle"]').get_attribute("aria-pressed") != "true":
        pg.locator('[data-action="tree-toggle"]').click()
    pg.wait_for_timeout(400)
    tree_meta = pg.evaluate("""() => ({
      head: document.querySelector('.ds-atree__head-id')?.innerText.trim() || '',
      sections: Array.from(document.querySelectorAll('.ds-atree__section')).map(s => ({
        title: s.querySelector('.ds-atree__section-title')?.innerText.trim() || '',
        rows: s.querySelectorAll('.ds-atree__row').length
      }))
    })""")
    check("工作区不再显示 #SAT-01", "#SAT-01" not in tree_meta["head"], tree_meta["head"])
    check("文件树分为对话产物与上传资源", [s["title"] for s in tree_meta["sections"]] == ["对话产物", "上传资源"], tree_meta["sections"])
    check("两个分区均列出文件", all(s["rows"] >= 1 for s in tree_meta["sections"]), tree_meta["sections"])
    pg.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-2"]').click()""")
    pg.wait_for_timeout(400)
    check("xlsx 只读表格视图", pg.locator(".ds-sheet__grid").count() == 1 and pg.locator('[data-action="mode-toggle"]').count() == 0)
    pg.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-3"]').click()""")
    pg.wait_for_timeout(400)
    check("docx 只读页面视图", pg.locator(".ds-page").count() == 1 and pg.locator('[data-action="mode-toggle"]').count() == 0)
    pg.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-4"]').click()""")
    pg.wait_for_timeout(400)
    check("html 预览有选择元素与编辑切换", pg.locator('[data-action="pick-element"]').count() == 1 and pg.locator('[data-action="mode-toggle"]').count() == 1)
    pg.locator('[data-action="mode-toggle"]').click()
    pg.wait_for_timeout(300)
    check("html 编辑态隐藏选择元素", pg.locator('[data-action="pick-element"]').count() == 0)
    pg.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="art-telemetry"]').click()""")
    pg.wait_for_timeout(500)
    telemetry = pg.evaluate("""() => ({
      title: document.querySelector('.ds-telemetry')?.parentElement?.querySelector('.ds-webpage__title')?.innerText.trim() || '',
      series: document.querySelectorAll('.ds-telemetry__svg path').length,
      ranking: document.querySelectorAll('.ds-telemetry__rank-row').length,
      text: document.querySelector('.ds-telemetry')?.innerText || ''
    })""")
    check("遥测时序可视化产物完整", telemetry["title"] == "遥测时序可视化分析"
          and telemetry["series"] == 4 and telemetry["ranking"] == 5
          and "断链1" in telemetry["text"] and "断链2" in telemetry["text"]
          and "TOP1 parameter1" in telemetry["text"], telemetry)

    # 6 深链还原
    pg.goto(HTML.as_uri() + "#/w/c11/artifact/art-md", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(600)
    check("深链还原会话内容", pg.locator(".ds-md").count() == 1)
    check("深链还原产物页签", pg.locator('.ds-atab[data-tab-id="art-md"]').count() == 1)
    pg.screenshot(path=str(SHOTS / "06-深链还原.png"))

    # 7 右栏调宽与左栏折叠
    pg.locator(".ds-shell__resize").focus()
    pg.locator(".ds-shell__resize").press("Home")
    pg.wait_for_timeout(300)
    min_w = pg.evaluate("() => Math.round(document.querySelector('.ds-shell__right').getBoundingClientRect().width)")
    pg.locator(".ds-shell__resize").press("End")
    pg.wait_for_timeout(300)
    max_w = pg.evaluate("() => Math.round(document.querySelector('.ds-shell__right').getBoundingClientRect().width)")
    expect_max = pg.evaluate("() => Math.round(window.innerWidth - document.querySelector('.ds-shell__left').getBoundingClientRect().width - 360)")
    check("右栏键盘调宽 320 / 视口上限", abs(min_w - 320) < 2 and abs(max_w - expect_max) < 2, f"{min_w} / {max_w} / {expect_max}")
    pg.locator('[data-action="left-toggle"]').click()
    pg.wait_for_timeout(400)
    left_w = pg.evaluate("() => document.querySelector('.ds-shell__left').getBoundingClientRect().width")
    check("左栏可折叠", left_w <= 1, left_w)
    pg.locator('[data-action="left-toggle"]').click()
    pg.wait_for_timeout(300)

    # 8 项目菜单、会话菜单、移动到项目子菜单
    pg.goto(HTML.as_uri() + "#/", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(700)
    prow = pg.locator(".ds-history__row--project").first
    prow.hover()
    prow.locator('[data-act="menu"]').click()
    pg.wait_for_timeout(400)
    items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("项目更多菜单弹出", pg.locator("#ds-popover-panel").count() == 1 and len(items) >= 2, items)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)

    row = pg.locator(".ds-history__row--conversation").first
    row.hover()
    row.locator('[data-act="menu"]').click()
    pg.wait_for_timeout(400)
    items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("会话行菜单弹出", len(items) >= 2, items)
    pg.locator("#ds-popover-panel .ds-popover__item").filter(has_text="移动到项目").first.hover()
    pg.wait_for_timeout(400)
    sub = pg.locator("#ds-popover-subpanel .ds-popover__item").all_inner_texts()
    check("移动到项目二级菜单", pg.locator("#ds-popover-subpanel").count() == 1 and any("创建新项目" in x for x in sub), sub)
    pg.screenshot(path=str(SHOTS / "07-移动到项目.png"))
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)

    row.hover()
    row.locator('[data-act="menu"]').click()
    pg.wait_for_timeout(400)
    pg.locator("#ds-popover-panel .ds-popover__item").filter(has_text="删除").first.click()
    pg.wait_for_timeout(400)
    check("删除确认框弹出", pg.locator(".ds-dialog.is-open").count() == 1)
    pg.locator(".ds-dialog__cancel").click()
    pg.wait_for_timeout(300)

    # 9 附件上传
    check("上传附件按钮存在", pg.locator(".ds-composer__attach").count() == 1 and pg.locator(".ds-composer__plus").count() == 0)
    pg.set_input_files(".ds-composer__file", SAMPLE_FILE)
    pg.wait_for_timeout(400)
    chips = pg.locator(".ds-attach-chip").all_inner_texts()
    check("选择文件后出现附件条", len(chips) == 1 and "时延日志样例.csv" in chips[0], chips)
    pg.screenshot(path=str(SHOTS / "08-附件上传.png"))
    pg.locator(".ds-attach-chip__x").first.click()
    pg.wait_for_timeout(300)
    check("附件条可移除", pg.locator(".ds-attach-chip").count() == 0)

    # 10 模型浮层与 @ 提及
    pg.locator(".ds-model-switch").click()
    pg.wait_for_timeout(400)
    model_items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("模型浮层弹出", len(model_items) >= 2, model_items)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    pg.locator(".ds-composer__textarea").click()
    pg.type(".ds-composer__textarea", "@")
    pg.wait_for_timeout(500)
    check("@提及浮层弹出", pg.locator(".ds-mention").count() == 1)
    pg.screenshot(path=str(SHOTS / "09-提及浮层.png"))
    pg.keyboard.press("Escape")
    pg.locator(".ds-composer__textarea").fill("")
    pg.wait_for_timeout(300)

    # 11 文件树位置、启动页、PNG 视图
    pg.goto(HTML.as_uri() + "#/w/c11/artifact/art-docx", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(800)
    if pg.locator('[data-action="tree-toggle"]').get_attribute("aria-pressed") != "true":
        pg.locator('[data-action="tree-toggle"]').click()
    pg.wait_for_timeout(500)
    box = pg.evaluate("""() => {
      const pick = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; };
      return { tree: pick('.ds-atree'), preview: pick('.ds-aviews'), panel: pick('.ds-arti') };
    }""")
    tree, preview, panel = box["tree"], box["preview"], box["panel"]
    check("文件树在预览右侧", tree and preview and tree["left"] >= preview["left"] + preview["width"] - 1, box)
    check("文件树贴右缘", tree and panel and abs(tree["left"] + tree["width"] - (panel["left"] + panel["width"])) <= 1, box)
    check("文件树宽度 240", tree and tree["width"] == 240, tree["width"] if tree else None)
    check("当前文件高亮", pg.locator(".ds-atree__row.is-current").count() == 1)
    pg.screenshot(path=str(SHOTS / "10-文件树.png"))

    pg.locator('[data-action="tab-new"]').click()
    pg.wait_for_timeout(400)
    check("新标签页启动页", pg.locator(".ds-alaunch").is_visible() and pg.locator(".ds-launch-row").count() == 5)

    pg.goto(HTML.as_uri() + "#/w/c11/artifact/art-png", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(700)
    img = pg.evaluate("""() => {
      const im = document.querySelector('.ds-image__img');
      return { format: document.querySelector('[data-component="document-preview"]').dataset.format,
               loaded: !!im && im.naturalWidth > 0,
               toggle: !!document.querySelector('[data-action="mode-toggle"]'),
               picker: !!document.querySelector('[data-action="pick-element"]') };
    }""")
    check("PNG 按图片格式渲染", img["format"] == "image" and img["loaded"], img)
    check("PNG 无编辑与选择元素", (not img["toggle"]) and (not img["picker"]), img)
    pg.screenshot(path=str(SHOTS / "11-PNG产物.png"))

    # 12 产物工具栏收敛为「下载 + 文件树」
    pg.goto(HTML.as_uri() + "#/w/c11/artifact/art-md", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(500)
    bar = pg.evaluate("""() => {
      const el = document.querySelector('.ds-atbar');
      return {
        text: el ? el.innerText : '',
        download: el ? el.querySelectorAll('[data-action="download"]').length : 0,
        more: el ? el.querySelectorAll('[data-action="more"]').length : 0,
        share: el ? el.querySelectorAll('[aria-label*="分享"], [aria-label*="外部打开"]').length : 0,
        tree: el ? el.querySelectorAll('[data-action="tree-toggle"]').length : 0
      };
    }""")
    check("产物工具栏保留下载与文件树", bar["download"] == 1 and bar["tree"] == 1, bar)
    check("产物工具栏已移除分享与更多", bar["more"] == 0 and bar["share"] == 0, bar)
    with pg.expect_download() as dl:
        pg.locator('[data-action="download"]').click()
    check("下载按钮可导出当前产物", dl.value.suggested_filename == "时延态势与趋势分析.md", dl.value.suggested_filename)

    pg.goto(HTML.as_uri() + "#/", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(400)
    pg.locator(".ds-composer__textarea").fill("请分析承载网时延日志数据，快速给出结论。")
    pg.locator(".ds-composer__send").click()
    pg.wait_for_timeout(300)
    check("生成中发送按钮变为停止", pg.locator(".ds-composer__send").get_attribute("aria-label") == "停止生成")
    pg.locator(".ds-composer__send").click()
    pg.wait_for_timeout(300)
    think_blocks = pg.locator(".ds-think")
    last_think = think_blocks.last
    think = last_think.inner_text()
    check("停止生成生效", "思考已停止" in think and last_think.get_attribute("data-state") in ("stopped", "expanded"), think[:80])
    stopped_status = pg.locator(".ds-history__row--conversation.is-current").get_attribute("data-task-status")
    check("当前会话停止后不显示状态", stopped_status == "none", stopped_status)
    pg.screenshot(path=str(SHOTS / "12-停止生成.png"))

    # 13 网络、控制台与文件自包含
    outside = [u for u in external_requests if u.startswith(("http://", "https://"))]
    check("无外部网络请求", not outside, outside[:5])
    check("console 无错误", not console_errors, " | ".join(console_errors[:5]))
    html = HTML.read_text("utf-8")
    check("仍存在外链标签", "<script src=" not in html and '<link rel="stylesheet"' not in html)
    check("不含 assets 路径", "assets/app.js" not in html and "assets/style.css" not in html)

    b.close()

report = {"ok": not errors, "failed": errors, "checks": results, "requests": external_requests[:30], "shots": len(list(SHOTS.glob("*.png")))}
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("SUMMARY", len(results), "pass", len(results) - len(errors), "fail", len(errors))
raise SystemExit(0 if not errors else 1)
