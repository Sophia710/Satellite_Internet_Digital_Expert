import json
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\dist\卫星互联网数字专家.html")
SHOT = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\单文件验收")
SHOT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.goto(HTML.as_uri(), wait_until="load")
    pg.wait_for_timeout(1500)
    print("url", pg.url)
    print("title", pg.title())
    print("ready", pg.locator('.ds-shell[data-ready="1"]').count())
    print("welcome", pg.locator(".ds-welcome__greeting").count())
    print("cards", pg.locator(".ds-suggest__card").count())
    print("errors", errors)
    pg.screenshot(path=str(SHOT / "01-单文件首屏.png"))
    b.close()
