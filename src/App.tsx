import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { HowItWorks } from './components/HowItWorks';
import { PlatformBenefits } from './components/PlatformBenefits';
import { MyBookingsPreview } from './components/MyBookingsPreview';
import { BookingSection } from './components/BookingSection';
import { TrustSupport } from './components/TrustSupport';
import { TechnicianJoinSection } from './components/TechnicianJoinSection';
import { Footer } from './components/Footer';
import { NotFound } from './components/NotFound';
import { AdminDashboard } from './components/AdminDashboard';
import { TechnicianPortal } from './components/TechnicianPortal';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { LoginPage } from './components/LoginPage';
import { LegalPolicyModal, LegalPolicyTab } from './components/LegalPolicyModal';
import { CookieBanner } from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BookingFormData, ServiceCategory } from './types';
import { authService } from './services/authService';
import { ServicesCatalogPage } from './pages/ServicesCatalogPage';
import { SeoInput, businessLd, serviceLd, useSeo, websiteLd } from './lib/seo';

const HOME_SEO: SeoInput = {
  title: 'Electrician & Plumber in Chirala | Nivaro Home Services',
  description:
    'Book an approved electrician or plumber in Chirala. On-site estimates before work, local technicians and doorstep repairs for switches, fans, wiring, taps, leaks and blocked drains.',
  path: '/',
  jsonLd: [businessLd(), ...serviceLd(), websiteLd()],
};

// Private shells and unknown paths stay out of the index.
const PRIVATE_SEO: SeoInput = {
  title: 'Nivaro | Account Access',
  path: '/',
  noindex: true,
};

export const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash);
  const [customerAuthOpen, setCustomerAuthOpen] = useState<boolean>(false);
  const [showCustomerDashboard, setShowCustomerDashboard] = useState<boolean>(false);
  const [activePolicyTab, setActivePolicyTab] = useState<LegalPolicyTab | null>(null);
  const [technicianInitialTab, setTechnicianInitialTab] = useState<'login' | 'register'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('tab=register') || search.includes('register') || hash.includes('register')) {
        return 'register';
      }
    }
    return 'login';
  });
  const [formData, setFormData] = useState<BookingFormData>({
    fullName: '',
    phoneNumber: '',
    serviceCategory: '',
    neighborhood: '',
    address: '',
    description: '',
    preferredDate: '',
    timeSlot: '',
    serviceRating: 0,
  });

  // Simple router logic: handle path changes, hash changes, admin & 404
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
      if (window.location.search.includes('tab=register') || window.location.search.includes('register')) {
        setTechnicianInitialTab('register');
      } else if (window.location.pathname.startsWith('/technician')) {
        setTechnicianInitialTab('login');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Resolve section hashes after React mounts; the browser resolves them too early.
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    const sectionIds = ['home', 'services', 'how-it-works', 'benefits', 'my-bookings', 'booking', 'help', 'technicians'];
    if (!sectionIds.includes(id)) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const header = document.querySelector('header');
      const offset = header instanceof HTMLElement ? header.offsetHeight : 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'auto' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Determine if URL contains password recovery tokens, authorization code, or error states
  const isRecoveryParam = 
    typeof window !== 'undefined' && 
    (window.location.search.includes('code=') || 
     window.location.search.includes('type=recovery') || 
     window.location.hash.includes('type=recovery') ||
     window.location.search.includes('error=') ||
     window.location.hash.includes('error=') ||
     authService.isRecoveryMode());

  // Determine if on technician route
  const isTechnician = 
    currentPath === '/technician' || 
    currentPath === '/technician/' || 
    currentPath.startsWith('/technician') ||
    currentHash === '#technician';

  // Determine if on customer account route
  const isCustomer = 
    currentPath === '/customer' || 
    currentPath === '/customer/' || 
    currentPath.startsWith('/customer') ||
    currentHash === '#customer';

  // Determine if on customer login route
  const isLogin = 
    currentPath === '/login' || 
    currentPath === '/login/' || 
    currentPath.startsWith('/login') ||
    currentHash === '#login';

  // Determine if on the public services catalog route
  const isServices = currentPath === '/services' || currentPath === '/services/';

  // Determine if on admin route
  const isAdmin = 
    currentPath === '/admin' || 
    currentPath === '/admin/' || 
    currentPath.startsWith('/admin') ||
    currentPath === '/reset-password' ||
    currentPath === '/admin/reset-password' ||
    currentHash === '#admin' ||
    (isRecoveryParam && !isTechnician && !isCustomer);

  // Determine if on valid homepage route
  const isHome = 
    isAdmin ||
    isTechnician ||
    isCustomer ||
    isLogin ||
    currentPath === '/' || 
    currentPath === '' || 
    currentPath.endsWith('index.html');

  // /services owns its own metadata; private shells get noindex.
  useSeo(isServices ? null : isAdmin || isTechnician || isCustomer || isLogin || !isHome ? PRIVATE_SEO : HOME_SEO);

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    setCurrentHash('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCustomerLogin = () => {
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
    setCurrentHash('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTechnician = (tab: 'login' | 'register' = 'login') => {
    window.history.pushState({}, '', tab === 'register' ? '/technician?tab=register' : '/technician');
    setCurrentPath('/technician');
    setCurrentHash('');
    setTechnicianInitialTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectService = (category: ServiceCategory, problemDescription?: string) => {
    const defaultDesc = 
      category === 'Electrical Repairs' 
        ? 'Electrical problem' 
        : category === 'Plumbing Repairs' 
        ? 'Plumbing problem' 
        : '';

    setFormData((prev) => {
      const targetDesc = problemDescription || defaultDesc;
      const isKnownDefault = [
        '',
        'Electrical problem',
        'Plumbing problem',
        'Fan is not working',
        'Switch or socket is not working',
        'Water leakage problem',
        'Tap repair required',
      ].includes(prev.description.trim());

      return {
        ...prev,
        serviceCategory: category,
        description: isKnownDefault ? targetDesc : prev.description,
      };
    });
  };

  const handleSelectServiceFromCatalog = (category: ServiceCategory, problemDescription?: string) => {
    handleSelectService(category, problemDescription);
    window.history.pushState({}, '', '/#booking');
    setCurrentPath('/');
    setCurrentHash('#booking');
    setTimeout(() => {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (isAdmin) {
    return <AdminDashboard onBackToHome={handleGoHome} />;
  }

  if (isTechnician) {
    return (
      <TechnicianPortal 
        onBackToHome={handleGoHome} 
        initialTab={technicianInitialTab} 
      />
    );
  }

  if (isCustomer || showCustomerDashboard) {
    return (
      <CustomerDashboard
        onBackToHome={() => {
          setShowCustomerDashboard(false);
          handleGoHome();
        }}
        onOpenBooking={() => {
          setShowCustomerDashboard(false);
          handleGoHome();
          setTimeout(() => {
            const el = document.getElementById('booking');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />
    );
  }

  if (isLogin) {
    return (
      <LoginPage
        onBackToHome={handleGoHome}
        onLoginSuccess={() => {
          window.history.pushState({}, '', '/customer');
          setCurrentPath('/customer');
          setShowCustomerDashboard(true);
        }}
        onBookService={() => {
          window.history.pushState({}, '', '/#booking');
          setCurrentPath('/');
          setCurrentHash('#booking');
          setTimeout(() => {
            const el = document.getElementById('booking');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />
    );
  }

  if (isServices) {
    return (
      <>
        <ServicesCatalogPage
          onSelectService={handleSelectServiceFromCatalog}
          onOpenCustomerAuth={handleOpenCustomerLogin}
          onOpenCustomerDashboard={() => setShowCustomerDashboard(true)}
          onOpenPolicy={setActivePolicyTab}
        />
        <CookieBanner onOpenPolicy={(tab) => setActivePolicyTab(tab)} />
        <LegalPolicyModal
          isOpen={activePolicyTab !== null}
          activeTab={activePolicyTab || 'privacy'}
          onTabChange={setActivePolicyTab}
          onClose={() => setActivePolicyTab(null)}
        />
      </>
    );
  }

  if (!isHome) {
    return <NotFound onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-charcoal font-sans selection:bg-gold selection:text-navy overflow-x-hidden">
      {/* Navigation Bar */}
      <Navbar 
        onOpenCustomerAuth={handleOpenCustomerLogin}
        onOpenCustomerDashboard={() => setShowCustomerDashboard(true)}
      />

      <main className="flex-grow">
        {/* Section 1: Hero */}
        <Hero
          onSelectService={handleSelectService}
          onOpenTechnician={handleOpenTechnician}
        />

        {/* Section 2: Our Services (Electrical & Plumbing only) */}
        <Services onSelectService={handleSelectService} />

        {/* Section 3: How It Works */}
        <HowItWorks />

        {/* Section 4: Booking */}
        <BookingSection 
          formData={formData} 
          setFormData={setFormData} 
          onOpenPrivacyPolicy={() => setActivePolicyTab('privacy')}
        />

        {/* Section 5: My Bookings Preview */}
        <MyBookingsPreview
          onOpenCustomerAuth={handleOpenCustomerLogin}
          onOpenCustomerDashboard={() => setShowCustomerDashboard(true)}
        />

        {/* Section 6: Trust & Local Support */}
        <TrustSupport />

        {/* Section 7: Helping Customers & Technicians */}
        <PlatformBenefits />

        {/* Section 8: Dedicated Technician Join & Login Section */}
        <TechnicianJoinSection onOpenTechnician={handleOpenTechnician} />
      </main>

      {/* Footer */}
      <Footer 
        onOpenCustomerAuth={handleOpenCustomerLogin}
        onOpenCustomerDashboard={() => setShowCustomerDashboard(true)}
        onOpenPolicy={(tab) => setActivePolicyTab(tab)}
      />

      {/* Customer Account Auth Modal (Login / Signup) */}
      <CustomerAuthModal
        isOpen={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
        onSuccess={() => setShowCustomerDashboard(true)}
      />

      {/* Essential Cookie & Storage Consent Banner */}
      <CookieBanner onOpenPolicy={(tab) => setActivePolicyTab(tab)} />

      {/* Dedicated Legal Policies Modal (Privacy, Terms, Cookies, Refund) */}
      <LegalPolicyModal
        isOpen={activePolicyTab !== null}
        activeTab={activePolicyTab || 'privacy'}
        onTabChange={(tab) => setActivePolicyTab(tab)}
        onClose={() => setActivePolicyTab(null)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
