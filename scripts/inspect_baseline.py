import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\audit_baseline"
os.makedirs(output_dir, exist_ok=True)

routes = [
    ("homepage_desktop", "http://127.0.0.1:5173/", 1440, 900),
    ("homepage_mobile", "http://127.0.0.1:5173/", 375, 812),
    ("login_desktop", "http://127.0.0.1:5173/login", 1440, 900),
    ("login_mobile", "http://127.0.0.1:5173/login", 375, 812),
    ("technician_desktop", "http://127.0.0.1:5173/technician", 1440, 900),
    ("technician_mobile", "http://127.0.0.1:5173/technician", 375, 812),
    ("admin_desktop", "http://127.0.0.1:5173/admin", 1440, 900),
    ("admin_mobile", "http://127.0.0.1:5173/admin", 375, 812),
    ("customer_desktop", "http://127.0.0.1:5173/customer", 1440, 900),
    ("customer_mobile", "http://127.0.0.1:5173/customer", 375, 812),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    for name, url, width, height in routes:
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(1500)
            screenshot_path = os.path.join(output_dir, f"{name}.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Captured {name}: {screenshot_path}", flush=True)
        except Exception as e:
            print(f"Error capturing {name}: {e}", flush=True)
        finally:
            context.close()
            
    browser.close()
print("All baseline screenshots captured successfully.", flush=True)
