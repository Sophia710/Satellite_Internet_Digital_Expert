from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\dist\卫星互联网数字专家.html")
SHOT = Path(r"D:\XW\Project\Satellite_Internet_Digital_Expert\docs\单文件验收\13-断网离线打开.png")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=["--allow-file-access-from-files"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, offline=True)
    pg = ctx.new_page()
    errors = []
    failed = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("requestfailed", lambda r: failed.append(r.url))
    pg.goto(HTML.as_uri() + "#/w/c11/artifact/art-png", wait_until="load")
    pg.wait_for_selector('.ds-shell[data-ready="1"]', timeout=15000)
    pg.wait_for_timeout(1200)
    img = pg.evaluate("""() => { const im = document.querySelector('.ds-image__img'); return !!im && im.naturalWidth > 0; }""")
    print("title", pg.title())
    print("ready", pg.locator('.ds-shell[data-ready="1"]').count())
    print("pngLoaded", img)
    print("console", errors)
    print("failedRequests", failed)
    pg.screenshot(path=str(SHOT))
    b.close()
