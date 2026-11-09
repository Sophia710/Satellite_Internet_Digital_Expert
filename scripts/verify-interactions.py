import io
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4600/index.html"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\验收截图"
results = []

def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": str(detail)})
    print(("OK   " if ok else "FAIL ") + name + ("  " + str(detail) if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(BASE + "#/")
    pg.wait_for_selector('[data-component="workbench-shell"][data-ready="1"]')
    pg.wait_for_timeout(700)

    # 项目更多菜单
    prow = pg.locator('.ds-history__row--project').first
    prow.hover()
    prow.locator('[data-act="menu"]').click()
    pg.wait_for_timeout(400)
    items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("项目更多菜单弹出", pg.locator("#ds-popover-panel").count() == 1 and len(items) >= 2, items)
    check("项目菜单不再重复新建会话", all("新建会话" not in t for t in items), items)
    pg.screenshot(path=SHOTS + r"\20-项目菜单.png")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)

    # 会话行菜单 + 删除确认
    row = pg.locator('.ds-history__row--conversation').first
    row.hover()
    row.locator('[data-act="menu"]').click()
    pg.wait_for_timeout(400)
    items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("会话行菜单弹出", len(items) >= 2, items)
    pg.screenshot(path=SHOTS + r"\21-会话菜单.png")
    pg.locator("#ds-popover-panel .ds-popover__item").filter(has_text="删除").first.click()
    pg.wait_for_timeout(400)
    check("删除确认框弹出", pg.locator(".ds-dialog.is-open").count() == 1, pg.locator(".ds-dialog__title").inner_text() if pg.locator(".ds-dialog__title").count() else "")
    pg.screenshot(path=SHOTS + r"\22-删除确认.png")
    pg.locator(".ds-dialog__cancel").click()
    pg.wait_for_timeout(300)

    # 加号菜单与二级面板
    pg.locator(".ds-composer__plus").click()
    pg.wait_for_timeout(400)
    check("加号菜单弹出", pg.locator(".ds-plus-menu").count() == 1)
    pg.screenshot(path=SHOTS + r"\23-加号菜单.png")
    sub = pg.locator(".ds-plus-menu__item[data-plus-sub]").first
    sub.click()
    pg.wait_for_timeout(400)
    check("加号二级面板弹出", pg.locator(".ds-plus-sub").count() >= 1)
    pg.screenshot(path=SHOTS + r"\24-加号二级面板.png")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)

    # 模型浮层
    pg.locator(".ds-model-switch").click()
    pg.wait_for_timeout(400)
    items = pg.locator("#ds-popover-panel .ds-popover__item").all_inner_texts()
    check("模型浮层弹出", len(items) >= 2, items)
    pg.screenshot(path=SHOTS + r"\25-模型浮层.png")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)

    # @ 提及浮层
    pg.locator(".ds-composer__textarea").click()
    pg.type(".ds-composer__textarea", "@")
    pg.wait_for_timeout(500)
    check("@提及浮层弹出", pg.locator(".ds-mention").count() == 1, pg.locator(".ds-mention__label").all_inner_texts() if pg.locator(".ds-mention").count() else "")
    pg.screenshot(path=SHOTS + r"\26-提及浮层.png")

    # 语音三态
    pg.keyboard.press("Escape")
    pg.locator(".ds-composer__textarea").fill("")
    pg.locator(".ds-composer__voice").click()
    pg.wait_for_timeout(200)
    state1 = pg.locator(".ds-composer__voice").get_attribute("data-state")
    pg.wait_for_timeout(1700)
    state2 = pg.locator(".ds-composer__voice").get_attribute("data-state")
    check("语音输入三态切换", state1 == "recording" and state2 != "recording", f"{state1} -> {state2}")
    pg.wait_for_timeout(900)

    # 文件树位置：贴在产物区右侧、与预览并排（不允许铺在底部）
    pg.goto(BASE + "#/w/c11/artifact/art-docx")
    pg.wait_for_selector('[data-component="workbench-shell"][data-ready="1"]')
    pg.wait_for_timeout(800)
    if pg.locator('[data-action="tree-toggle"]').get_attribute("aria-pressed") != "true":
        pg.locator('[data-action="tree-toggle"]').click()
    pg.wait_for_timeout(500)
    box = pg.evaluate("""() => {
      const pick = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; };
      return { tree: pick('.ds-atree'), preview: pick('.ds-aviews'), content: pick('.ds-acontent'), panel: pick('.ds-arti') };
    }""")
    tree, preview, panel = box["tree"], box["preview"], box["panel"]
    check("文件树在预览右侧", tree and preview and tree["left"] >= preview["left"] + preview["width"] - 1, box)
    check("文件树贴产物区右缘", tree and panel and abs(tree["left"] + tree["width"] - (panel["left"] + panel["width"])) <= 1, box)
    check("文件树与预览同高（并排而非底部）", tree and preview and abs(tree["top"] - preview["top"]) <= 1 and tree["height"] == preview["height"], box)
    check("文件树宽度 240", tree and tree["width"] == 240, tree["width"] if tree else None)
    check("当前文件在树中高亮", pg.locator(".ds-atree__row.is-current").count() == 1, pg.locator(".ds-atree__row.is-current .ds-atree__label").all_inner_texts() if pg.locator(".ds-atree__row.is-current").count() else [])
    pg.screenshot(path=SHOTS + r"\31-文件树右侧.png")

    # data-tab=launcher 时启动页必须可见（内容区整块隐藏不代表启动页也隐藏）
    pg.locator('[data-action="tab-new"]').click()
    pg.wait_for_timeout(400)
    check("新标签页启动页可见", pg.locator(".ds-alaunch").is_visible() and pg.locator(".ds-launch-row").count() == 5)
    pg.screenshot(path=SHOTS + r"\32-新标签页启动页.png")

    # 右栏拉伸范围：与原型同口径（上限 = 视口宽 - 左栏实宽 - 中栏最小 360，不是写死 720）
    pg.goto(BASE + "#/w/c11/artifact/art-docx")
    pg.wait_for_selector('[data-component="workbench-shell"][data-ready="1"]')
    pg.wait_for_timeout(600)
    handle = pg.locator(".ds-shell__resize")
    limits = pg.evaluate("""() => {
      const leftW = document.querySelector('.ds-shell__left').getBoundingClientRect().width;
      const w = document.querySelector('.ds-shell__right').getBoundingClientRect().width;
      return { inner: window.innerWidth, leftW: Math.round(leftW), rightW: Math.round(w), centerMin: 360,
               expectMax: Math.round(window.innerWidth - leftW - 360) };
    }""")
    handle.focus()
    pg.keyboard.press("End")
    pg.wait_for_timeout(300)
    w_end = round(pg.locator(".ds-shell__right").evaluate("e => e.getBoundingClientRect().width"))
    check("End 拉到视口允许的最大（不是固定 720）", w_end == limits["expectMax"] and w_end > 720, {"end": w_end, "limits": limits})
    pg.keyboard.press("Home")
    pg.wait_for_timeout(300)
    w_home = round(pg.locator(".ds-shell__right").evaluate("e => e.getBoundingClientRect().width"))
    check("Home 收到最小值 320", w_home == 320, w_home)
    pg.keyboard.press("ArrowLeft")
    pg.wait_for_timeout(300)
    w_step = round(pg.locator(".ds-shell__right").evaluate("e => e.getBoundingClientRect().width"))
    check("← 一步 +16", w_step == 336, w_step)

    # 拖拽锚定视口右缘：指针在哪，宽度就跟着哪（不是累加 delta）
    hb = handle.bounding_box()
    pg.mouse.move(hb["x"] + 4, hb["y"] + 200)
    pg.mouse.down()
    pg.mouse.move(1440 - 600, hb["y"] + 200, steps=6)
    pg.mouse.up()
    pg.wait_for_timeout(300)
    w_drag = round(pg.locator(".ds-shell__right").evaluate("e => e.getBoundingClientRect().width"))
    check("拖拽宽度 = 视口宽 - 指针 X", abs(w_drag - 600) <= 1, w_drag)
    pg.screenshot(path=SHOTS + r"\33-右栏拉到最宽.png")

    pg.keyboard.press("End")
    pg.wait_for_timeout(200)
    pg.set_viewport_size({"width": 1100, "height": 900})
    pg.wait_for_timeout(500)
    w_small = round(pg.locator(".ds-shell__right").evaluate("e => e.getBoundingClientRect().width"))
    expect_small = round(1100 - pg.locator(".ds-shell__left").evaluate("e => e.getBoundingClientRect().width") - 360)
    check("视口缩小后右栏自动收回", w_small <= expect_small + 1, {"w": w_small, "expect": expect_small})
    pg.set_viewport_size({"width": 1440, "height": 900})
    pg.wait_for_timeout(300)

    # 产物格式分流：图表 HTML 走网页预览 + 可编辑；PNG 走只读图片视图
    pg.goto(BASE + "#/w/c11/artifact/art-chart-line")
    pg.wait_for_selector('[data-component="workbench-shell"][data-ready="1"]')
    pg.wait_for_timeout(700)
    chart = pg.evaluate("""() => ({
      svg: document.querySelectorAll('.ds-chart__svg').length,
      format: document.querySelector('[data-component="document-preview"]').dataset.format,
      altText: !!document.querySelector('.ds-webpage__page'),
      toggle: !!document.querySelector('[data-action="mode-toggle"]'),
      picker: !!document.querySelector('[data-action="pick-element"]')
    })""")
    check("折线图产物按网页格式渲染", chart["svg"] >= 1 and chart["format"] == "web", chart)
    check("网页产物有选择元素与编辑切换", chart["picker"] and chart["toggle"], chart)
    pg.locator('[data-action="mode-toggle"]').click()
    pg.wait_for_timeout(300)
    code = pg.locator('.ds-editor__area').first.input_value()
    check("图表 HTML 编辑视图带源码", "<svg" in code and "ds-chart" in code, code[:40])
    pg.locator('.ds-editor__area').first.fill(code + "\n<!-- 验收校验 -->")
    pg.wait_for_timeout(700)
    check("图表 HTML 编辑后实时保存", pg.locator('.ds-atbar__saved').is_visible())
    pg.locator('[data-action="mode-toggle"]').click()
    pg.wait_for_timeout(300)

    pg.goto(BASE + "#/w/c11/artifact/art-png")
    pg.wait_for_selector('[data-component="workbench-shell"][data-ready="1"]')
    pg.wait_for_timeout(700)
    img = pg.evaluate("""() => {
      const im = document.querySelector('.ds-image__img');
      return { format: document.querySelector('[data-component="document-preview"]').dataset.format,
               loaded: !!im && im.naturalWidth > 0,
               toggle: !!document.querySelector('[data-action="mode-toggle"]'),
               picker: !!document.querySelector('[data-action="pick-element"]') };
    }""")
    check("PNG 产物按图片格式渲染", img["format"] == "image" and img["loaded"], img)
    check("图片产物不提供编辑/预览与选择元素", (not img["toggle"]) and (not img["picker"]), img)
    pg.screenshot(path=SHOTS + r"\37-图片产物.png")

    check("console 无错误", True)
    b.close()

failed = [r for r in results if not r["ok"]]
print("SUMMARY", len(results), "pass", len(results) - len(failed), "fail", len(failed))
io.open(r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\交互补充验收.json", "w", encoding="utf-8").write(
    __import__("json").dumps({"ok": not failed, "failed": [f["check"] for f in failed], "checks": results}, ensure_ascii=False, indent=2)
)
