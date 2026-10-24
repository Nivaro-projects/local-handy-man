import React from 'react';
import { customerService } from '../services/customerService';
import { LegalPolicyTab } from './LegalPolicyModal';

interface FooterProps {
  onOpenCustomerAuth?: () => void;
  onOpenCustomerDashboard?: () => void;
  onOpenPolicy?: (tab: LegalPolicyTab) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenCustomerAuth,
  onOpenCustomerDashboard,
  onOpenPolicy,
}) => {
  return (
    <footer 
      className="w-full pt-16 pb-12 bg-white text-charcoal border-t border-slate-200 relative z-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-200">
          
          {/* Col 1: Brand Column & Wordmark */}
          <div className="space-y-4">
            <a 
              href="/#home"
              className="inline-flex flex-col items-start gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-xl p-1 group"
              aria-label="Nivaro - Back to Top"
            >
              {/* Official Nivaro Wordmark on Dark Backing */}
              <div className="h-11 rounded-xl bg-navy overflow-hidden flex items-center shadow-xs group-hover:ring-2 group-hover:ring-gold transition-shadow">
                <img
                  src="/brand/nivaro-logo.png"
                  alt="Nivaro"
                  className="h-full w-auto object-contain"
                  width={1024}
                  height={342}
                  loading="lazy"
                />
              </div>
              <span 
                className="text-xs font-semibold uppercase tracking-wider text-navy pl-0.5"
              >
                Home Services, Made Simple
              </span>
            </a>
            <p 
              className="text-sm leading-relaxed text-left font-normal text-slate-600"
            >
              Connecting households across Chirala, Andhra Pradesh, with approved local electricians and plumbers for home repairs.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="text-left">
            <h3 
              className="text-xs font-bold uppercase tracking-wider text-navy mb-4"
            >
              Navigation
            </h3>
            <ul 
              className="space-y-2.5 text-sm list-none p-0 m-0"
            >
              <li>
                <a 
                  href="/#home"
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-block font-medium"
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="/services"
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-block font-medium"
                >
                  Our Services
                </a>
              </li>
              <li>
                <a 
                  href="/#how-it-works"
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-block font-medium"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a 
                  href="/#my-bookings"
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-block font-medium"
                >
                  My Bookings
                </a>
              </li>
              <li>
                <a 
                  href="/#help"
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-block font-medium"
                >
                  Help &amp; Support
                </a>
              </li>
              <li>
                <a 
                  href="/#booking"
                  className="text-navy hover:underline transition-colors py-1 inline-flex items-center gap-1.5 font-bold"
                >
                  <span>&rarr; Book a Service</span>
                </a>
              </li>
              <li className="pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => {
                    const current = customerService.getCurrentCustomer();
                    if (current && onOpenCustomerDashboard) {
                      onOpenCustomerDashboard();
                    } else if (onOpenCustomerAuth) {
                      onOpenCustomerAuth();
                    }
                  }}
                  className="text-navy hover:text-navy/80 transition-colors py-1 inline-flex items-center gap-1.5 font-semibold text-xs cursor-pointer text-left bg-transparent border-none p-0"
                >
                  <span>Customer Login / Account</span>
                </button>
              </li>
              <li className="pt-1">
                <a 
                  href="/technician" 
                  className="text-slate-600 hover:text-navy transition-colors py-1 inline-flex items-center gap-1.5 font-semibold text-xs"
                >
                  <span>Technician Portal</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Support Contact */}
          <div className="text-left">
            <h3 
              className="text-xs font-bold uppercase tracking-wider text-navy mb-4"
            >
              Chirala Support
            </h3>
            <ul 
              className="space-y-3.5 text-sm list-none p-0 m-0"
            >
              <li className="flex items-start gap-3">
                <span className="text-navy font-bold">&bull;</span>
                <span className="text-slate-700 font-medium">
                  Chirala, Andhra Pradesh, India
                </span>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-navy font-bold">&bull;</span>
                <div>
                  <span className="text-xs text-slate-600 block">Telephone Helpline</span>
                  <a 
                    href="tel:+919491242781" 
                    className="text-navy hover:text-navy/80 font-bold transition-colors"
                    title="Call Nivaro directly"
                  >
                    +91 94912 42781
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="text-navy font-bold">&bull;</span>
                <div>
                  <span className="text-xs text-slate-600 block">Direct Email</span>
                  <a 
                    href="mailto:contact@nivaro.in" 
                    className="text-navy hover:text-navy/80 font-bold transition-colors"
                    title="Email Nivaro"
                  >
                    contact@nivaro.in
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Service Hours & Local Coverage */}
          <div className="text-left">
            <h3 
              className="text-xs font-bold uppercase tracking-wider text-navy mb-4"
            >
              Operating Hours
            </h3>
            <div 
              className="border-t border-slate-200 pt-4 text-xs text-slate-600 space-y-1.5"
            >
              <p className="font-bold text-navy text-sm mb-1">Monday &ndash; Sunday</p>
              <p className="text-slate-600">8:00 AM &ndash; 7:30 PM</p>
              <div 
                className="pt-2 border-t border-slate-200 mt-2 text-[11px] font-medium text-slate-600"
              >
                Local dispatch coverage across Paparajuthota, Perala, Kothapeta, Srinivas Colony, and Vadarevu.
              </div>
            </div>
          </div>

        </div>

        {/* Legal Policies & Compliance Modal Triggers */}
        <div className="pt-8 pb-4 flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-5 text-xs border-b border-slate-200">
          <span className="text-navy font-bold uppercase tracking-wider text-[11px]">
            Policies:
          </span>
          <button
            type="button"
            onClick={() => onOpenPolicy?.('privacy')}
            className="text-slate-600 hover:text-navy transition-colors font-medium bg-transparent border-none p-0 cursor-pointer underline-offset-4 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="text-slate-300" aria-hidden="true">&bull;</span>
          <button
            type="button"
            onClick={() => onOpenPolicy?.('terms')}
            className="text-slate-600 hover:text-navy transition-colors font-medium bg-transparent border-none p-0 cursor-pointer underline-offset-4 hover:underline"
          >
            Terms of Service
          </button>
          <span className="text-slate-300" aria-hidden="true">&bull;</span>
          <button
            type="button"
            onClick={() => onOpenPolicy?.('cookies')}
            className="text-slate-600 hover:text-navy transition-colors font-medium bg-transparent border-none p-0 cursor-pointer underline-offset-4 hover:underline"
          >
            Cookie Policy
          </button>
          <span className="text-slate-300" aria-hidden="true">&bull;</span>
          <button
            type="button"
            onClick={() => onOpenPolicy?.('refund')}
            className="text-slate-600 hover:text-navy transition-colors font-medium bg-transparent border-none p-0 cursor-pointer underline-offset-4 hover:underline"
          >
            Refund &amp; Cancellation Policy
          </button>
        </div>

        {/* Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left">
          <p className="font-semibold text-slate-700">
            &copy; 2026 Nivaro. All rights reserved.
          </p>
          <p className="font-medium text-slate-500">
            Home Services, Made Simple &bull; Chirala, AP.
          </p>
        </div>

      </div>
    </footer>
  );
};
