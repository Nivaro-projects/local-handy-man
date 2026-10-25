import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import { CustomerProfile } from '../types';

interface NavbarProps {
  onOpenCustomerAuth?: () => void;
  onOpenCustomerDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCustomerAuth,
  onOpenCustomerDashboard,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    return customerService.getCurrentCustomer();
  });

  useEffect(() => {
    const unsub = customerService.subscribe((c) => {
      setCustomer(c ? { ...c } : null);
    });
    return () => unsub();
  }, []);

  const navLinks = [
    { name: 'Home', href: '/#home' },
    { name: 'Services', href: '/services' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'My Bookings', href: '/#my-bookings' },
    { name: 'Help', href: '/#help' },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Wordmark & Location */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a 
              href="/#home"
              onClick={handleLinkClick}
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-xl p-1 group"
              aria-label="Nivaro - Home"
            >
              {/* Official Nivaro Wordmark on Dark Backing */}
              <div className="h-10 sm:h-11 rounded-xl bg-navy overflow-hidden flex items-center shadow-xs group-hover:ring-2 group-hover:ring-gold transition-shadow">
                <img
                  src="/brand/nivaro-logo.png"
                  alt="Nivaro"
                  className="h-full w-auto object-contain"
                  width={1024}
                  height={342}
                  loading="eager"
                />
              </div>

              {/* Chirala indicator in Charcoal Grey */}
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-[11px] font-bold text-navy tracking-wider uppercase">
                  Chirala, AP
                </span>
                <span className="text-[10px] text-slate-600 font-medium">
                  Home Services
                </span>
              </div>
            </a>

          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 lg:gap-7" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-semibold text-slate-700 hover:text-navy transition-colors py-1.5 border-b-2 border-transparent hover:border-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Direct Support Link */}
            <a
              href="tel:+919491242781"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs lg:text-sm font-semibold text-slate-700 hover:text-navy bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[40px]"
              title="Call Nivaro directly"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+91 94912 42781</span>
            </a>

            {/* Customer Login / Account Menu */}
            {customer ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenCustomerDashboard}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs lg:text-sm font-semibold text-navy bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors min-h-[40px] cursor-pointer"
                  title="Open Customer Account & Dashboard"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{customer.fullName.split(' ')[0]}</span>
                </button>
                <button
                  type="button"
                  onClick={() => customerService.logout()}
                  className="p-2 text-navy hover:text-navy hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors min-h-[40px] cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenCustomerAuth}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-semibold text-navy bg-white hover:bg-slate-50 border border-slate-300 hover:border-navy rounded-lg transition-colors min-h-[40px] cursor-pointer"
                title="Customer Sign In"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Sign In</span>
              </button>
            )}

            {/* Primary CTA */}
            <a
              href="/#booking"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs lg:text-sm font-bold text-navy bg-gold hover:bg-gold-hover border border-navy rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy shadow-sm min-h-[40px]"
            >
              <span>Book a Service</span>
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <a
              href="tel:+919491242781"
              className="p-2.5 rounded-lg bg-white border border-slate-300 text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Call +91 94912 42781"
            >
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-navy hover:bg-slate-100 bg-white border border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6">
          <nav className="flex flex-col space-y-1.5" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={handleLinkClick}
                className="px-3.5 py-2.5 rounded-lg text-base font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy transition-colors min-h-[40px] flex items-center"
              >
                {link.name}
              </a>
            ))}

            <div className="pt-3 mt-2 border-t border-slate-200 flex flex-col gap-2.5">
              {customer ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenCustomerDashboard) onOpenCustomerDashboard();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-navy bg-slate-50 border border-slate-300 cursor-pointer min-h-[40px]"
                  >
                    <span>My Account ({customer.fullName.split(' ')[0]})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      customerService.logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3.5 py-2.5 rounded-lg text-navy bg-slate-50 border border-slate-300 cursor-pointer min-h-[40px]"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenCustomerAuth) onOpenCustomerAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-navy bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer min-h-[40px]"
                >
                  <span>Sign In</span>
                </button>
              )}

              <a
                href="tel:+919491242781"
                onClick={handleLinkClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-navy bg-white border border-slate-300 hover:bg-slate-50 transition-colors min-h-[40px]"
              >
                <span>Call +91 94912 42781</span>
              </a>

              <a
                href="/#booking"
                onClick={handleLinkClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-navy bg-gold hover:bg-gold-hover border border-navy transition-colors min-h-[40px] shadow-xs text-center"
              >
                <span>Book a Service</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
