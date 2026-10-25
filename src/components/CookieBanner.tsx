import React, { useState, useEffect } from 'react';
import { LegalPolicyTab } from './LegalPolicyModal';

interface CookieBannerProps {
  onOpenPolicy: (tab: LegalPolicyTab) => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenPolicy }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('lh_cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } catch {
      // In case localStorage is blocked by user browser settings
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    // No non-essential trackers exist; if one is added, read this flag before initialising it.
    try {
      localStorage.setItem('lh_cookie_consent', 'accepted');
    } catch {
      // ignore storage error
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside 
      role="region"
      aria-label="Cookie and Privacy Consent Banner"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-5 bg-white text-charcoal border-t border-slate-200 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Banner Content */}
        <div className="flex items-start sm:items-center gap-3.5 text-left w-full md:w-auto">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-navy font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
            CP
          </div>
          <div>
            <p className="text-sm font-semibold text-navy leading-relaxed">
              We use strictly necessary cookies only: a Supabase Auth session cookie that keeps you signed in, and a flag that remembers this choice.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              No analytics, advertising or cross-site trackers are loaded &mdash; before or after you accept.
            </p>
          </div>
        </div>

        {/* Banner Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={() => onOpenPolicy('cookies')}
            className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
          >
            Cookie details
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-lg bg-gold text-navy border border-navy shadow-sm font-bold text-xs sm:text-sm hover:bg-gold-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer"
          >
            Accept
          </button>
        </div>

      </div>
    </aside>
  );
};
