import React, { useState, useEffect, useRef } from 'react';
// Minimal inline SVGs (no decorative icon library)
import { 
  authService, 
  ConfirmationResult, 
  VerificationRateLimitInfo
} from '../services/authService';
import { customerService } from '../services/customerService';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'login' | 'signup';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step 1: 'phone' -> Step 2: 'otp' -> Step 3: 'forgot'
  const [step, setStep] = useState<'phone' | 'otp' | 'forgot'>('phone');
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);

  // Auth confirmation & rate-limiting state
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<VerificationRateLimitInfo>(() => authService.getRateLimitInfo());
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  // Synchronize cooldown timer
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

  // Focus OTP input upon transitioning to step 2
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Reset modal state when closed or opened
  useEffect(() => {
    if (isOpen) {
      const activeCustomer = customerService.getCurrentCustomer();
      const activeAuthUser = authService.getCurrentUser();
      if (activeCustomer || activeAuthUser) {
        onSuccess();
        onClose();
        return;
      }
      setErrorMsg(null);
      setSuccessMsg(null);
      setOtpCode('');
      setRateLimitInfo(authService.getRateLimitInfo());
    } else {
      setStep('phone');
      setConfirmationResult(null);
      setIsLoading(false);
      setCustomerEmail('');
      setForgotEmail('');
      setResetSentMsg(null);
    }
  }, [isOpen, onSuccess, onClose]);

  if (!isOpen) return null;

  // Clean raw phone to 10 digits
  const cleanPhoneDigits = (raw: string) => raw.replace(/\D/g, '').slice(-10);

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

    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setErrorMsg('Please enter a valid email address, or leave it blank.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.sendPhoneOtp(clean);
      setConfirmationResult(result);
      setStep('otp');
      setCooldownSeconds(60);
      setRateLimitInfo(authService.getRateLimitInfo());
      setSuccessMsg(`SMS verification code sent to +91 ${clean}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification SMS.';
      setErrorMsg(msg);
      setRateLimitInfo(authService.getRateLimitInfo());
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
      setRateLimitInfo(authService.getRateLimitInfo());
      setSuccessMsg(`A new verification code has been generated for +91 ${clean}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification SMS.';
      setErrorMsg(msg);
      setRateLimitInfo(authService.getRateLimitInfo());
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
      // Verify OTP through AuthService
      const authUser = await authService.verifyOtp(confirmationResult, cleanOtp);

      // Establish customer profile bound to stable Provider UID
      const cleanEmail = customerEmail.trim() || undefined;
      customerService.handleAuthenticatedSession(
        authUser.uid,
        authUser.phoneNumber || cleanPhoneDigits(phone),
        fullName.trim() || undefined,
        cleanEmail
      );

      setSuccessMsg('Phone verified successfully! Loading your bookings...');

      setTimeout(() => {
        setIsLoading(false);
        onSuccess();
        onClose();
      }, 700);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
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
        `If an account exists for ${email}, a secure password recovery link has been sent. Please check your inbox.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery email.';
      setErrorMsg(msg);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E0CEAF] max-w-md w-full p-6 sm:p-8 space-y-5  animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Official Nivaro Wordmark on Dark Backing */}
            <div className="h-10 px-3 py-1.5 rounded-xl bg-black border border-[#4A4A4A]/30 flex items-center shadow-xs shrink-0">
              <img
                src="/brand/nivaro-logo.png"
                alt="Nivaro"
                className="h-6 w-auto object-contain"
                width={1024}
                height={342}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2E2E] tracking-tight">
                {step === 'phone' ? 'Customer Sign In' : step === 'otp' ? 'Verify Mobile OTP' : 'Customer Account Recovery'}
              </h2>
              {step === 'otp' && (
                <p className="text-xs text-[#4A4A4A] font-semibold uppercase tracking-wider mt-0.5">
                  Enter 6-Digit Passcode
                </p>
              )}
              {step === 'forgot' && (
                <p className="text-xs text-[#4A4A4A] font-semibold uppercase tracking-wider mt-0.5">
                  Reset Password via Email
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            
<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>
          </button>
        </div>

        {/* Security Notice Pill */}
        <div className="p-3 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] flex items-center gap-2.5 text-xs text-[#2E2E2E] font-medium">
          <span className="font-bold text-[#2E2E2E]">[✓]</span>
          <span>Verified Phone OTP is required to protect your service &amp; payment records.</span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5">
            <span className="font-bold text-rose-600">[!]</span>
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <span className="font-bold text-emerald-600">[✓]</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: ENTER PHONE NUMBER */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                Full Name (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Satya Sarma"
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[#E0CEAF] text-sm font-medium text-[#2E2E2E] bg-[#FAF3E7] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#E27D60] focus:ring-1 focus:ring-[#E27D60]"
                />
                
<svg className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
</svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                Email (optional)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. satya@gmail.com"
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[#E0CEAF] text-sm font-medium text-[#2E2E2E] bg-[#FAF3E7] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#E27D60] focus:ring-1 focus:ring-[#E27D60]"
                />
                <svg className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                10-Digit Mobile Number *
              </label>
              <div className="flex rounded-lg border border-[#E0CEAF] bg-[#FAF3E7] focus-within:bg-[#FFFFFF] focus-within:border-[#E27D60] focus-within:ring-1 focus-within:ring-[#E27D60] transition-colors overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#FAF3E7] border-r border-[#E0CEAF] text-xs font-bold text-[#2E2E2E] select-none shrink-0">
                  
<svg className="w-3.5 h-3.5 text-[#2E2E2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
</svg>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    // Normalize pasted numbers: strip leading 91 (if 12 digits) or leading 0 (if 11 digits)
                    const normalized = digits.length > 10 && digits.startsWith('91') 
                      ? digits.slice(2, 12) 
                      : digits.length > 10 && digits.startsWith('0')
                      ? digits.slice(1, 11)
                      : digits.slice(0, 10);
                    setPhone(normalized);
                  }}
                  placeholder="9491242781"
                  maxLength={10}
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 bg-transparent text-sm font-bold text-[#2E2E2E] placeholder-[#4A4A4A]/50 focus:outline-none tracking-wide disabled:opacity-60"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#4A4A4A]">
                We will send a 6-digit verification code to this mobile number.
              </p>
            </div>

            {rateLimitInfo.attemptsCount > 0 && (
              <div className="text-[11px] text-[#4A4A4A] font-medium text-center">
                Verification requests: {rateLimitInfo.attemptsCount} of {rateLimitInfo.maxAttempts}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || cleanPhoneDigits(phone).length !== 10}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white shadow-sm font-bold text-sm  transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span>...</span>
                  <span>Requesting OTP...</span>
                </>
              ) : (
                <>
                  
                  <span>Send Verification Code (OTP)</span>
                </>
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

        {/* STEP 2: ENTER OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
            <div className="p-3 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#4A4A4A] block text-[10px] uppercase font-bold">Sent to:</span>
                <span className="font-bold text-[#2E2E2E] text-sm">+91 {cleanPhoneDigits(phone)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2E2E2E] hover:underline cursor-pointer"
              >
                <span>&larr;</span>
                <span>Edit Number</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                6-Digit Verification Code *
              </label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                required
                disabled={isLoading}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 rounded-lg border-2 border-[#E0CEAF] text-[#2E2E2E] bg-[#FAF3E7] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#E27D60] disabled:opacity-60"
              />
            </div>

            {/* Resend & Cooldown */}
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#4A4A4A]">
                {cooldownSeconds > 0 ? (
                  `Resend available in ${cooldownSeconds}s`
                ) : (
                  'Didn\'t receive code?'
                )}
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldownSeconds > 0 || isLoading}
                className="inline-flex items-center gap-1 font-bold text-[#2E2E2E] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                
                <span>Resend OTP</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.trim().length !== 6}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-[#2E2E2E] font-bold text-sm  transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span>...</span>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  
<svg className="w-4 h-4 text-[#2E2E2E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
</svg>
                  <span>Verify &amp; Open My Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: FORGOT PASSWORD EMAIL RECOVERY */}
        {step === 'forgot' && (
          <form onSubmit={handleSendPasswordReset} className="space-y-4" noValidate>
            <div className="p-3 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] text-xs text-[#4A4A4A]">
              Enter your registered email address. We will dispatch a secure link to reset your customer account password.
            </div>

            {resetSentMsg && (
              <div role="status" className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <span className="font-bold text-emerald-600">[✓]</span>
                <span>{resetSentMsg}</span>
              </div>
            )}

            {!resetSentMsg && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E0CEAF] text-sm font-medium text-[#2E2E2E] bg-[#FAF3E7] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#E27D60] focus:ring-1 focus:ring-[#E27D60]"
                />
              </div>
            )}

            {!resetSentMsg && (
              <button
                type="submit"
                disabled={isSendingReset || !forgotEmail.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-[#2E2E2E] font-bold text-sm transition-colors cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingReset ? (
                  <span>Sending Recovery Link...</span>
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
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2E2E2E] hover:underline cursor-pointer"
              >
                <span>&larr;</span>
                <span>Back to Mobile OTP Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer info & Nivaro branding */}
        <div className="pt-2 text-center border-t border-[#E0CEAF] space-y-1">
          <p className="text-[11px] text-[#4A4A4A]">
            Nivaro &bull; Home Services, Made Simple &bull; Chirala, AP
          </p>
        </div>

      </div>
    </div>
  );
};
