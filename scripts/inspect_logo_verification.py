import os
import sys
import time
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\audit_logo_verification"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    
    # 1. Desktop Context
    ctx_d = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx_d.new_page()
    
    # Homepage Header & Nav
    page.goto("http://127.0.0.1:5173/", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "homepage_header_desktop.png"))
    print("Captured homepage_header_desktop.png", flush=True)
    
    # Homepage Footer
    footer_el = page.locator("footer")
    footer_el.scroll_into_view_if_needed()
    page.wait_for_timeout(600)
    page.screenshot(path=os.path.join(output_dir, "homepage_footer_desktop.png"))
    print("Captured homepage_footer_desktop.png", flush=True)
    
    # Customer Login Page Desktop
    page.goto("http://127.0.0.1:5173/login", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "customer_login_desktop.png"))
    print("Captured customer_login_desktop.png", flush=True)
    
    # Customer Logged-in Dashboard Desktop
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
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "customer_dashboard_desktop.png"))
    print("Captured customer_dashboard_desktop.png", flush=True)
    
    # Technician Auth Desktop
    page.evaluate("() => localStorage.clear()")
    page.goto("http://127.0.0.1:5173/technician", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "technician_auth_desktop.png"))
    print("Captured technician_auth_desktop.png", flush=True)
    
    # Technician Logged-in Dashboard Desktop
    page.evaluate("""() => {
        const mockTech = {
            id: 'TECH-1001',
            displayId: 'TECH-1001',
            fullName: 'Ramesh Varma',
            phoneNumber: '9491242781',
            serviceCategory: 'Electrical Repairs',
            neighborhood: 'Paparajuthota',
            status: 'Approved',
            availability: 'Available',
            rating: 4.9,
            completedJobsCount: 42,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('lh_technicians_data', JSON.stringify([mockTech]));
        localStorage.setItem('lh_current_technician_id', 'TECH-1001');
    }""")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "technician_dashboard_desktop.png"))
    print("Captured technician_dashboard_desktop.png", flush=True)
    
    # Admin Auth Desktop
    page.evaluate("() => localStorage.clear()")
    page.goto("http://127.0.0.1:5173/admin", wait_until="domcontentloaded", timeout=15000)
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "admin_auth_desktop.png"))
    print("Captured admin_auth_desktop.png", flush=True)
    
    # Admin Logged-in Dashboard Desktop
    page.evaluate("""() => {
        const mockAdmin = {
            id: 'ADMIN-SUPER',
            email: 'admin@nivaro.in',
            role: 'admin',
            lastLogin: new Date().toISOString()
        };
        localStorage.setItem('lh_admin_session', JSON.stringify(mockAdmin));
    }""")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(output_dir, "admin_dashboard_desktop.png"))
    print("Captured admin_dashboard_desktop.png", flush=True)
    
    ctx_d.close()
    
    # 2. Mobile Context (375x812)
    ctx_m = browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True)
    page_m = ctx_m.new_page()
    
    # Homepage Mobile
    page_m.goto("http://127.0.0.1:5173/", wait_until="domcontentloaded", timeout=15000)
    page_m.wait_for_timeout(1000)
    page_m.screenshot(path=os.path.join(output_dir, "homepage_header_mobile.png"))
    print("Captured homepage_header_mobile.png", flush=True)
    
    # Customer Login Mobile
    page_m.goto("http://127.0.0.1:5173/login", wait_until="domcontentloaded", timeout=15000)
    page_m.wait_for_timeout(1000)
    page_m.screenshot(path=os.path.join(output_dir, "customer_login_mobile.png"))
    print("Captured customer_login_mobile.png", flush=True)
    
    # Technician Auth Mobile
    page_m.goto("http://127.0.0.1:5173/technician", wait_until="domcontentloaded", timeout=15000)
    page_m.wait_for_timeout(1000)
    page_m.screenshot(path=os.path.join(output_dir, "technician_auth_mobile.png"))
    print("Captured technician_auth_mobile.png", flush=True)
    
    # Admin Auth Mobile
    page_m.goto("http://127.0.0.1:5173/admin", wait_until="domcontentloaded", timeout=15000)
    page_m.wait_for_timeout(1000)
    page_m.screenshot(path=os.path.join(output_dir, "admin_auth_mobile.png"))
    print("Captured admin_auth_mobile.png", flush=True)
    
    ctx_m.close()
    browser.close()
    print("All logo verification screenshots captured successfully.", flush=True)
