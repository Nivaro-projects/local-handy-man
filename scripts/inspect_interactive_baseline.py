import os
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\audit_baseline"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Customer Demo Login & Dashboard
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.goto("http://127.0.0.1:5173/login", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    
    # Click Quick Demo Login button if available
    try:
        demo_btn = page.locator("button:has-text('Quick Demo Login')")
        if demo_btn.is_visible():
            demo_btn.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(output_dir, "customer_logged_in_dashboard.png"), full_page=True)
            print("Captured customer_logged_in_dashboard.png", flush=True)
    except Exception as e:
        print(f"Customer demo login error: {e}", flush=True)
    context.close()

    # 2. Technician Register Tab
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.goto("http://127.0.0.1:5173/technician?tab=register", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "technician_register_tab.png"), full_page=True)
    print("Captured technician_register_tab.png", flush=True)
    context.close()

    # 3. Homepage Booking Section Scrolled
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.goto("http://127.0.0.1:5173/#booking", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    booking_el = page.locator("#booking")
    if booking_el.is_visible():
        booking_el.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(output_dir, "homepage_booking_section.png"))
        print("Captured homepage_booking_section.png", flush=True)
    context.close()

    browser.close()
