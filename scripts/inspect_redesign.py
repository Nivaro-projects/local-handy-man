import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\audit_redesign"
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
            page.wait_for_timeout(1000)
            screenshot_path = os.path.join(output_dir, f"{name}.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Captured {name}: {screenshot_path}", flush=True)
        except Exception as e:
            print(f"Error capturing {name}: {e}", flush=True)
        finally:
            context.close()
            
    # Extra 1: Logged-in Customer Dashboard
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    try:
        page.goto("http://127.0.0.1:5173/customer", wait_until="domcontentloaded", timeout=15000)
        page.evaluate("""() => {
            const mockCust = {
                id: 'CUST-DEMO-1001',
                displayId: 'CUST-DEMO-1001',
                fullName: 'K. Satyanarayana',
                phoneNumber: '9491242781',
                email: 'satya@example.com',
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('lh_customers_data', JSON.stringify([mockCust]));
            localStorage.setItem('lh_current_customer_id', 'CUST-DEMO-1001');
        }""")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(1200)
        screenshot_path = os.path.join(output_dir, "customer_logged_in_dashboard.png")
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Captured customer_logged_in_dashboard: {screenshot_path}", flush=True)
    except Exception as e:
        print(f"Error capturing customer_logged_in_dashboard: {e}", flush=True)
    finally:
        context.close()

    # Extra 2: Technician Register Tab
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    try:
        page.goto("http://127.0.0.1:5173/technician", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(1000)
        reg_btn = page.locator("button:has-text('Join as Partner')").first
        if reg_btn.count() > 0:
            reg_btn.click()
            page.wait_for_timeout(800)
        screenshot_path = os.path.join(output_dir, "technician_register_tab.png")
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Captured technician_register_tab: {screenshot_path}", flush=True)
    except Exception as e:
        print(f"Error capturing technician_register_tab: {e}", flush=True)
    finally:
        context.close()

    # Extra 3: Homepage Booking Section
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    try:
        page.goto("http://127.0.0.1:5173/", wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(1000)
        el = page.locator("#booking")
        el.scroll_into_view_if_needed()
        page.wait_for_timeout(800)
        screenshot_path = os.path.join(output_dir, "homepage_booking_section.png")
        page.screenshot(path=screenshot_path)
        print(f"Captured homepage_booking_section: {screenshot_path}", flush=True)
    except Exception as e:
        print(f"Error capturing homepage_booking_section: {e}", flush=True)
    finally:
        context.close()

    browser.close()
print("All redesign screenshots captured successfully.", flush=True)
