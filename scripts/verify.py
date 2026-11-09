"""
verify.py —— 工程验收：用本机 Chrome（headless）跑一遍真实交互，并落截图。

用法：python scripts/verify.py [--base http://127.0.0.1:4600]
前置：app 已 build，且 http://127.0.0.1:4600 指向 app/dist。
截图输出：docs/验收截图/*.png；结果以 JSON 打印，任何一条断言失败 → exit 1。
"""
import argparse
import io
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "验收截图"

PROMPT_1 = "请分析承载网时延日志数据，研判多轨卫星时延态势并生成趋势分析。"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:4600")
    args = ap.parse_args()
    SHOTS.mkdir(parents=True, exist_ok=True)

    results = []
    errors = []

    def check(name, cond, detail=""):
        results.append({"check": name, "ok": bool(cond), "detail": str(detail)[:200]})
        if not cond:
            errors.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        page.goto(args.base + "/", wait_until="load")
        page.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
        page.wait_for_timeout(400)

        # 1. 首屏欢迎态
        page.screenshot(path=str(SHOTS / "01-欢迎态.png"))
        check("欢迎标题", page.locator(".ds-welcome__greeting").inner_text().strip() == "你好，今天想完成什么任务")
        cards = page.locator(".ds-suggest__card")
        check("快捷任务卡=3", cards.count() == 3, cards.count())

        # 2. 点第一张卡 → 完整提示词预填、不自动发送
        cards.nth(0).click()
        page.wait_for_timeout(200)
        val = page.locator(".ds-composer__textarea").input_value()
        check("卡片预填完整提示词", val.strip() == PROMPT_1, val)
        check("预填不自动发送", page.locator(".ds-suggest__card").count() == 3)

        # 3. 发送 → 生成过程
        page.locator(".ds-composer__send").click()
        page.wait_for_timeout(900)
        page.screenshot(path=str(SHOTS / "02-生成中.png"))
        check("发送后进入会话态", page.locator(".ds-bubble").count() >= 1)

        # 4. 等演示回放结束（5.8s + 余量）
        page.wait_for_selector('[data-component="artifact-card"]', timeout=15000)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SHOTS / "03-回放完成.png"))
        check("思考块完成态", "已深度思考 38 秒" in page.locator(".ds-think").inner_text())
        check("四个步骤完成", page.locator('.ds-steps__count').inner_text().strip() in ("4/4", "4 / 4"),
              page.locator('.ds-steps__count').inner_text().strip())
        check("正文/代码/引用/产物卡全揭示",
              page.locator(".ds-md").count() == 1 and page.locator(".ds-code").count() == 1)

        # 5. 打开 md 产物 → 预览 → 编辑 → 实时保存 → 预览同步
        page.locator('.ds-artcard[data-id="art-md"]').click()
        page.wait_for_selector('.ds-aview--doc', timeout=8000)
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "04-md预览.png"))
        check("md 打开的是预览视图", page.locator('.ds-preview').count() == 1)

        page.locator('[data-action="mode-toggle"]').click()
        page.wait_for_selector(".ds-editor__area", timeout=5000)
        check("md 编辑态出现源码编辑器", page.locator(".ds-editor__area").count() == 1)
        editor = page.locator(".ds-editor__area")
        editor.click()
        editor.press("End")
        editor.type("\n新增一行：7 号链路优先核查路由配置。")
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "05-md编辑.png"))
        saved_now = page.locator(".ds-atbar__saved").is_visible()
        check("编辑后出现已保存提示", saved_now)

        page.locator('[data-action="mode-toggle"]').click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "06-md预览同步.png"))
        body = page.locator(".ds-preview").inner_text()
        check("预览与编辑同源", "新增一行：7 号链路优先核查路由配置。" in body, body[-80:])

        # 6. 文件树：xlsx / docx 只读，无编辑预览按钮
        page.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-2"]').click()""")
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "07-xlsx只读.png"))
        check("xlsx 无编辑预览按钮", page.locator('[data-action="mode-toggle"]').count() == 0)
        check("xlsx 表格视图", page.locator(".ds-sheet__grid").count() == 1)

        page.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-3"]').click()""")
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "08-docx只读.png"))
        check("docx 无编辑预览按钮", page.locator('[data-action="mode-toggle"]').count() == 0)
        check("docx 页面视图", page.locator(".ds-page").count() == 1)

        # 7. html 产物：预览态才出现「选择元素」
        page.evaluate("""() => document.querySelector('.ds-atree__row--file[data-id="tree-file-4"]').click()""")
        page.wait_for_timeout(400)
        page.screenshot(path=str(SHOTS / "09-html预览.png"))
        check("html 预览有选择元素", page.locator('[data-action="pick-element"]').count() == 1)
        check("html 有编辑预览按钮", page.locator('[data-action="mode-toggle"]').count() == 1)

        page.locator('[data-action="mode-toggle"]').click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "10-html编辑.png"))
        check("html 编辑态隐藏选择元素", page.locator('[data-action="pick-element"]').count() == 0)

        # 8. 深链：刷新还原会话 + 产物页签
        page.goto(args.base + "/#/w/c11/artifact/art-md", wait_until="load")
        page.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "11-深链还原.png"))
        check("深链还原会话内容", page.locator(".ds-md").count() == 1)
        check("深链还原产物页签", page.locator('.ds-atab[data-tab-id="art-md"]').count() == 1)

        # 9. 深色主题
        page.locator(".ds-btn--ghost").first.click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "12-深色主题.png"))
        check("主题切换生效", page.evaluate("() => document.documentElement.dataset.theme") == "dark")

        # 10. 右栏宽度键盘调节（Home=最小 320，End=视口允许的最大：视口宽 - 左栏 - 中栏最小 360）
        page.locator(".ds-shell__resize").focus()
        page.locator(".ds-shell__resize").press("Home")
        page.wait_for_timeout(300)
        min_w = page.evaluate("() => document.querySelector('.ds-shell__right').getBoundingClientRect().width")
        page.locator(".ds-shell__resize").press("End")
        page.wait_for_timeout(300)
        max_w = page.evaluate("() => document.querySelector('.ds-shell__right').getBoundingClientRect().width")
        expect_max = page.evaluate(
            "() => Math.round(window.innerWidth - document.querySelector('.ds-shell__left')"
            ".getBoundingClientRect().width - 360)"
        )
        check("右栏键盘调宽 320 / 视口上限", abs(min_w - 320) < 2 and abs(max_w - expect_max) < 2,
              f"{min_w} / {max_w} (expect {expect_max})")

        # 11. 左栏折叠
        page.locator('[data-action="left-toggle"]').click()
        page.wait_for_timeout(400)
        left_w = page.evaluate("() => document.querySelector('.ds-shell__left').getBoundingClientRect().width")
        check("左栏可折叠", left_w <= 1, left_w)
        page.locator('[data-action="left-toggle"]').click()

        check("console 无错误", not console_errors, " | ".join(console_errors[:5]))
        browser.close()

    io.open(str(ROOT / "docs" / "验收报告.json"), "w", encoding="utf-8").write(json.dumps({"ok": not errors, "failed": errors, "checks": results}, ensure_ascii=False, indent=2))
    report = {"ok": not errors, "failed": errors, "checks": results, "shots": len(list(SHOTS.glob("*.png")))}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
