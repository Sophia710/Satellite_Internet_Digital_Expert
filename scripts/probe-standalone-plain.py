from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\dist\卫星互联网数字专家.html")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True)
    for offline in (False, True):
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, offline=offline)
        pg = ctx.new_page()
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(HTML.as_uri() + "#/", wait_until="load")
        pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
        pg.wait_for_timeout(800)
        print("offline" if offline else "online", pg.title(), pg.locator('.ds-shell[data-ready="1"]').count(), pg.locator(".ds-suggest__card").count(), errors)
        ctx.close()
    b.close()
