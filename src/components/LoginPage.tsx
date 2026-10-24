import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Phone, 
  Sparkles
} from 'lucide-react';
import { authService, ConfirmationResult } from '../services/authService';
import { customerService } from '../services/customerService';

interface LoginPageProps {
  onBackToHome?: () => void;
  onLoginSuccess?: () => void;
  onBookService?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onLoginSuccess,
  onBookService,
}) => {
  // Authentication Step: 'phone' -> 'otp' -> 'forgot'
  const [step, setStep] = useState<'phone' | 'otp' | 'forgot'>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);

  // Async & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Auto-bypass login if user already has an active authenticated customer session
  useEffect(() => {
    const activeCustomer = customerService.getCurrentCustomer();
    const activeAuthUser = authService.getCurrentUser();
    if (activeCustomer || activeAuthUser) {
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.history.pushState({}, '', '/customer');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }

    authService.restoreSession().then((authUser) => {
      if (authUser) {
        const cust = customerService.getCurrentCustomer();
        if (cust || authUser.role === 'customer' || !authUser.role) {
          if (onLoginSuccess) {
            onLoginSuccess();
          } else {
            window.history.pushState({}, '', '/customer');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }
    }).catch(() => {});
  }, [onLoginSuccess]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setCooldownSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldownSeconds]);

  // Focus OTP input upon step change
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const cleanPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(-10);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    // Normalize pasted numbers: strip leading 91 (if 12 digits) or leading 0 (if 11 digits)
    const normalized = raw.length > 10 && raw.startsWith('91')
      ? raw.slice(2, 12)
      : raw.length > 10 && raw.startsWith('0')
      ? raw.slice(1, 11)
      : raw.slice(0, 10);
    setPhone(normalized);
  };

  /**
   * Step 1: Send SMS OTP via Supabase Auth
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = cleanPhoneDigits(phone);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9491242781).');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.sendPhoneOtp(clean);
      setConfirmationResult(result);
      setStep('otp');
      setCooldownSeconds(60);
      setSuccessMsg(`Verification code dispatched to +91 ${clean}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dispatch verification code.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend SMS OTP
   */
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isLoading) return;
    setErrorMsg(null);

    const clean = cleanPhoneDigits(phone);
    setIsLoading(true);
    try {
      const result = await authService.sendPhoneOtp(clean);
      setConfirmationResult(result);
      setCooldownSeconds(60);
      setSuccessMsg(`A new code was dispatched to +91 ${clean}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification code.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: Verify the 6-digit OTP with Supabase Auth
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanOtp = otpCode.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const authUser = await authService.verifyOtp(confirmationResult, cleanOtp);

      customerService.handleAuthenticatedSession(
        authUser.uid,
        authUser.phoneNumber || cleanPhoneDigits(phone),
        authUser.displayName || undefined
      );

      setSuccessMsg('Phone verified successfully! Opening your account...');

      setTimeout(() => {
        setIsLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.history.pushState({}, '', '/customer');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, 600);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Verification failed. Please check the code.';
      setErrorMsg(msg);
    }
  };

  /**
   * Step 3: Send Customer Password Reset Email via Supabase Auth
   */
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetSentMsg(null);

    const email = forgotEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      await authService.sendCustomerPasswordReset(email);
      setResetSentMsg(
        `If an account exists for ${email}, a secure password recovery link has been dispatched to your email address. Please click the link to reset your password.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery email.';
      setErrorMsg(msg);
    } finally {
      setIsSendingReset(false);
    }
  };

  /**
   * Quick Demo Login for instant testing
   */
  const handleQuickDemoLogin = () => {
    setErrorMsg(null);
    setIsDemoLoading(true);
    try {
      customerService.loginDemoCustomer();
      setSuccessMsg('Logged into Demo Sandbox! Redirecting to dashboard...');
      setTimeout(() => {
        setIsDemoLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          window.history.pushState({}, '', '/customer');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, 500);
    } catch (err: unknown) {
      setIsDemoLoading(false);
      const msg = err instanceof Error ? err.message : 'Demo login failed.';
      setErrorMsg(msg);
    }
  };

  const navigateToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const navigateToBooking = () => {
    if (onBookService) {
      onBookService();
    } else {
      window.history.pushState({}, '', '/#booking');
      window.dispatchEvent(new PopStateEvent('popstate'));
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5E6CC] text-[#2E2E2E] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#E27D60]/20 selection:text-[#2E2E2E]">
      {/* Brand Palette: Warm Cream #F5E6CC, Charcoal Grey #4A4A4A, Terracotta Orange #E27D60, Forest Green #2D4F1E (Legacy: #4A251D #E59838 #EEF3EF #DCE6E1) */}
      <div className="w-full max-w-7xl bg-white rounded-3xl border border-[#4A4A4A]/20 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[640px] lg:min-h-[720px]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: THE LOGIN FORM                                               */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 h-full">
          
          {/* Top Bar: Brand Logo & Back to Home */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={navigateToHome}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
              title="Return to Nivaro Homepage"
            >
              {/* Official Nivaro Wordmark on Dark Backing */}
              <div className="h-11 px-3.5 py-1.5 rounded-xl bg-black border border-[#4A4A4A]/30 flex items-center shadow-xs transition-transform group-hover:scale-105">
                <img
                  src="/brand/nivaro-logo.png"
                  alt="Nivaro"
                  className="h-7 w-auto object-contain"
                  width={1024}
                  height={342}
                />
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-xs tracking-wider text-[#4A4A4A] uppercase block">
                  Chirala, AP
                </span>
                <span className="text-[10px] font-bold text-[#4A4A4A]/80 uppercase tracking-wider block">
                  Home Services, Made Simple
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={navigateToHome}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#4A4A4A] hover:text-[#2E2E2E] py-1.5 px-3 rounded-full hover:bg-[#FAF3E7] border border-transparent hover:border-[#4A4A4A]/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to website</span>
            </button>
          </div>

          {/* Form Content Area (Centered) */}
          <div className="my-auto py-8 sm:py-10 max-w-md w-full mx-auto">
            
            {/* Header Text */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E2E2E] tracking-tight">
                Welcome back!
              </h1>
              <p className="text-sm text-[#4A4A4A] font-medium mt-2 leading-relaxed">
                Log in with your mobile number to track your electrical and plumbing repairs in Chirala.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div role="status" className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* STEP 1: MOBILE NUMBER INPUT */}
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="mobile-input" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-2">
                    10-Digit Mobile Number
                  </label>
                  
                  {/* Pill-shaped, fully rounded input field */}
                  <div className="relative rounded-full border border-[#4A4A4A]/25 bg-white px-5 py-3.5 flex items-center gap-3 focus-within:border-[#E27D60] focus-within:ring-2 focus-within:ring-[#E27D60]/20 transition-all shadow-xs">
                    <div className="flex items-center gap-1.5 pr-3 border-r border-[#4A4A4A]/20 text-[#2E2E2E] font-extrabold text-sm select-none shrink-0">
                      <Phone className="w-3.5 h-3.5 text-[#E27D60]" />
                      <span>+91</span>
                    </div>
                    <input
                      id="mobile-input"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter your number"
                      maxLength={10}
                      autoFocus
                      required
                      disabled={isLoading}
                      className="w-full bg-transparent text-sm font-bold text-[#2E2E2E] placeholder-[#4A4A4A]/50 focus:outline-none tracking-wide disabled:opacity-60"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#4A4A4A] pl-3">
                    We will send an authenticated 6-digit OTP via SMS.
                  </p>
                </div>

                {/* Primary CTA Button: Terracotta Orange #E27D60 with bold white text */}
                <button
                  type="submit"
                  disabled={isLoading || cleanPhoneDigits(phone).length !== 10}
                  className="w-full mt-2 py-4 px-6 rounded-full bg-[#E27D60] hover:bg-[#D26B4E] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-sm transition-all duration-150 cursor-pointer min-h-[50px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Login Code...</span>
                    </>
                  ) : (
                    <span>Send Login Code (OTP)</span>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setResetSentMsg(null);
                    }}
                    className="text-xs text-[#2E2E2E] hover:underline font-bold cursor-pointer"
                  >
                    Forgot password or email account recovery?
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP PASSCODE */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
                <div className="rounded-2xl bg-[#FAF3E7] border border-[#4A4A4A]/20 p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#4A4A4A] block text-[10px] uppercase font-bold">Code sent to:</span>
                    <span className="font-extrabold text-[#2E2E2E] text-sm">+91 {cleanPhoneDigits(phone)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtpCode('');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-bold text-[#E27D60] hover:underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>

                <div>
                  <label htmlFor="otp-input" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-2">
                    6-Digit Verification Code
                  </label>
                  
                  {/* Pill-shaped rounded OTP input */}
                  <div className="rounded-full border-2 border-[#4A4A4A]/25 bg-white px-5 py-3 flex items-center justify-center focus-within:border-[#E27D60] focus-within:ring-2 focus-within:ring-[#E27D60]/20 transition-all shadow-xs">
                    <input
                      id="otp-input"
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      autoFocus
                      required
                      disabled={isLoading}
                      className="w-full text-center tracking-[0.5em] text-2xl font-black text-[#2E2E2E] placeholder-[#4A4A4A]/40 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Resend OTP info */}
                <div className="flex items-center justify-between text-xs font-medium px-2">
                  <span className="text-[#4A4A4A]">
                    {cooldownSeconds > 0
                      ? `Resend available in ${cooldownSeconds}s`
                      : "Didn't receive the SMS?"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldownSeconds > 0 || isLoading}
                    className="font-bold text-[#E27D60] hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    Resend Code
                  </button>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading || otpCode.trim().length !== 6}
                  className="w-full py-4 px-6 rounded-full bg-[#E27D60] hover:bg-[#D26B4E] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-sm transition-all duration-150 cursor-pointer min-h-[50px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Passcode...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Log In</span>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: FORGOT PASSWORD EMAIL RECOVERY */}
            {step === 'forgot' && (
              <form onSubmit={handleSendPasswordReset} className="space-y-4" noValidate>
                <div className="rounded-2xl bg-[#FAF3E7] border border-[#4A4A4A]/20 p-3.5 text-xs text-[#4A4A4A] font-medium leading-relaxed">
                  Enter your registered email address. We will dispatch a secure link to reset your customer account credentials.
                </div>

                {resetSentMsg ? (
                  <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resetSentMsg}</span>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="recovery-email-input" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-2">
                      Registered Email Address
                    </label>
                    <div className="relative rounded-full border border-[#4A4A4A]/25 bg-white px-5 py-3.5 flex items-center gap-3 focus-within:border-[#E27D60] focus-within:ring-2 focus-within:ring-[#E27D60]/20 transition-all shadow-xs">
                      <input
                        id="recovery-email-input"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="customer@example.com"
                        autoFocus
                        required
                        className="w-full bg-transparent text-sm font-bold text-[#2E2E2E] placeholder-[#4A4A4A]/50 focus:outline-none tracking-wide"
                      />
                    </div>
                  </div>
                )}

                {!resetSentMsg && (
                  <button
                    type="submit"
                    disabled={isSendingReset || !forgotEmail.trim()}
                    className="w-full mt-2 py-4 px-6 rounded-full bg-[#E27D60] hover:bg-[#D26B4E] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-sm transition-all duration-150 cursor-pointer min-h-[50px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <span>Send Recovery Email</span>
                    )}
                  </button>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setResetSentMsg(null);
                    }}
                    className="text-xs text-[#2E2E2E] hover:underline font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Mobile Login</span>
                  </button>
                </div>
              </form>
            )}

            {/* Divider: Thin line with "or continue with" text in center */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#4A4A4A]/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-[#4A4A4A] font-bold tracking-wider select-none">
                  or continue with
                </span>
              </div>
            </div>

            {/* Alternate Action: Quick Demo Login Button */}
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isDemoLoading || isLoading}
              className="w-full py-3.5 px-6 rounded-full border border-[#4A4A4A]/25 bg-white hover:bg-[#FAF3E7] active:bg-[#F5E6CC] text-[#2E2E2E] font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {isDemoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#2E2E2E]" />
                  <span>Loading Demo Account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#E27D60]" />
                  <span>Quick Demo Login</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Link: Need a repair? Book a service */}
          <div className="pt-6 border-t border-[#4A4A4A]/15 text-center">
            <p className="text-xs sm:text-sm text-[#4A4A4A]">
              Need a repair?{' '}
              <button
                type="button"
                onClick={navigateToBooking}
                className="font-extrabold text-[#E27D60] hover:text-[#D26B4E] underline transition-colors cursor-pointer"
              >
                Book a service
              </button>
            </p>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: THE VISUAL SHOWCASE (Hidden on mobile/tablet, 50% on desktop) */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex flex-col justify-between p-6 xl:p-8 bg-white border-l border-[#4A4A4A]/15">
          
          {/* Aesthetic Container with Warm Cream tint */}
          <div className="w-full h-full rounded-3xl bg-[#FAF3E7] border border-[#4A4A4A]/20 p-8 xl:p-10 flex flex-col justify-between items-center relative overflow-hidden shadow-inner">
            
            {/* Top Badge: Approved Chirala Services */}
            <div className="w-full flex justify-between items-center z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#2E2E2E] text-xs font-bold border border-[#4A4A4A]/20 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D4F1E]" />
                <span>Approved Chirala Technicians</span>
              </span>

              <span className="text-[11px] font-bold text-[#2D4F1E] uppercase tracking-wider bg-[#2D4F1E]/10 px-2.5 py-1 rounded-full border border-[#2D4F1E]/20">
                Electrical &bull; Plumbing
              </span>
            </div>

            {/* Main Visual: Welcoming Illustration & Floating Card */}
            <div className="relative my-auto w-full max-w-md flex flex-col items-center justify-center py-4">
              
              {/* Illustration Frame */}
              <div className="w-full max-h-[380px] rounded-2xl overflow-hidden shadow-md border-2 border-white relative group">
                <img
                  src="/handyman-showcase.png"
                  alt="Friendly Nivaro technician ready for repairs in a tidy Chirala home"
                  className="w-full h-full object-cover object-center transform transition-transform duration-500 group-hover:scale-102"
                  width={560}
                  height={420}
                />
              </div>

              {/* Floating UI Card: On-site quote policy */}
              <div className="absolute -bottom-4 right-2 sm:right-6 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-[#4A4A4A]/20 shadow-xl flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#2D4F1E]/10 border border-[#2D4F1E]/25 flex items-center justify-center text-[#2D4F1E] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-[#2E2E2E] text-sm sm:text-base leading-none block">
                    On-site quote
                  </span>
                  <span className="text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wider block mt-0.5">
                    Before work begins
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Text: Centered Headline & Subtext */}
            <div className="w-full text-center mt-6 pt-4 z-10">
              <h2 className="text-xl xl:text-2xl font-extrabold text-[#2E2E2E] tracking-tight">
                Reliable repairs at your doorstep.
              </h2>
              <p className="text-xs xl:text-sm text-[#4A4A4A] font-medium mt-1.5 max-w-sm mx-auto leading-relaxed">
                Serving Paparajuthota, Perala, Kothapeta, and Srinivas Colony.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
