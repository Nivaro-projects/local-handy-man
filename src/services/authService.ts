import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  supabase, 
  isSupabaseConfigured, 
  isDemoModeAllowed, 
  getSupabaseConfigStatus 
} from './supabase';
import { AdminProfile } from '../types';
import { bffFetch } from '../lib/bffClient';

export interface AppAuthUser {
  id: string;
  uid: string; // backwards compatibility with existing UI
  email?: string;
  phone?: string;
  phoneNumber?: string; // backwards compatibility
  displayName?: string;
  role?: 'customer' | 'technician' | 'admin';
  isDemo?: boolean;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  getIdTokenResult?: () => Promise<{ claims: Record<string, any> }>;
  getIdToken?: (forceRefresh?: boolean) => Promise<string>;
}

export interface AuthStateSubscriber {
  (user: AppAuthUser | null): void;
}

export interface VerificationRateLimitInfo {
  canResend: boolean;
  remainingSeconds: number;
  attemptsCount: number;
  maxAttempts: number;
}

export interface ConfirmationResult {
  phone: string;
  isDemo: boolean;
  confirm: (code: string) => Promise<{ user: AppAuthUser }>;
}

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS_PER_WINDOW = 3;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

class AuthService {
  private activeConfirmation: ConfirmationResult | null = null;
  private lastSentTimestamp: number = 0;
  private attemptsInWindow: number = 0;
  private windowStartTimestamp: number = 0;
  private isOtpRequestInProgress: boolean = false;
  private subscribers: Set<AuthStateSubscriber> = new Set();
  private currentUser: AppAuthUser | null = null;
  private currentDemoUser: AppAuthUser | null = null;
  private isPasswordRecoveryActive: boolean = false;
  private recoverySubscribers: Set<(isActive: boolean) => void> = new Set();
  private isRestoringSession: boolean = false;

  private isRecoverySession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('lh_password_recovery_active') === 'true';
    } catch {
      return false;
    }
  }

  private hasSupabaseAuthReady(): boolean {
    return isSupabaseConfigured() || isDemoModeAllowed();
  }

  private createDemoConfirmation(phone: string): ConfirmationResult {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    const demoPhone = `+91${normalizedPhone}`;
    const confirmation: ConfirmationResult = {
      phone: demoPhone,
      isDemo: true,
      confirm: async (code: string) => {
        const user = await this.verifyOtp(confirmation, code);
        return { user };
      },
    };

    this.activeConfirmation = confirmation;
    this.lastSentTimestamp = Date.now();
    this.attemptsInWindow += 1;
    return confirmation;
  }

  constructor() {
    // Check if initial URL indicates an incoming password recovery session
    const hasInitialRecoveryParam = typeof window !== 'undefined' && (
      window.location.pathname.includes('reset-password') ||
      window.location.search.includes('code=') || 
      window.location.search.includes('type=recovery') || 
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('error=') ||
      window.location.hash.includes('error=') ||
      this.isRecoverySession()
    );
    if (hasInitialRecoveryParam) {
      this.isPasswordRecoveryActive = true;
      try {
        sessionStorage.setItem('lh_password_recovery_active', 'true');
      } catch {}
    }

    // Listen to real Supabase Auth session updates
    if (typeof window !== 'undefined') {
      try {
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            this.isPasswordRecoveryActive = true;
            try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
            this.notifyRecoverySubscribers(true);
            // Do not notify normal subscribers to prevent automatically opening the main admin console
            return;
          }

          if (event === 'SIGNED_OUT') {
            this.isPasswordRecoveryActive = false;
            try { sessionStorage.removeItem('lh_password_recovery_active'); } catch {}
            this.notifyRecoverySubscribers(false);
            this.currentUser = null;
            this.currentDemoUser = null;
            this.notifySubscribers(null);
            return;
          }

          // In Supabase PKCE flow, code exchange triggers SIGNED_IN event.
          // If recovery was flagged or recovery URL params exist, hold recovery mode and do not auto-login to dashboard.
          const isUrlRecovery = 
            window.location.pathname.includes('reset-password') ||
            window.location.search.includes('code=') || 
            window.location.search.includes('type=recovery') || 
            window.location.hash.includes('type=recovery') ||
            this.isRecoverySession();

          if (this.isPasswordRecoveryActive || (event === 'SIGNED_IN' && isUrlRecovery)) {
            this.isPasswordRecoveryActive = true;
            try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
            this.notifyRecoverySubscribers(true);
            return;
          }

          if (session?.user) {
            // If in recovery mode, pause normal session notification
            if (this.isPasswordRecoveryActive) {
              return;
            }
            const mapped = this.mapSupabaseUser(session.user);
            this.currentUser = mapped;
            this.currentDemoUser = null;
            this.notifySubscribers(mapped);
          } else if (!this.currentDemoUser) {
            this.currentUser = null;
            this.notifySubscribers(null);
          }
        });

        // Proactively restore active session from storage
        this.restoreSession().catch(() => {});
      } catch (e) {
        console.warn('Supabase auth listener initialization note:', e);
      }
    }
  }

  /**
   * Proactively restores valid session from Supabase Auth persistence (localStorage)
   */
  public async restoreSession(): Promise<AppAuthUser | null> {
    if (this.currentDemoUser) return this.currentDemoUser;
    if (this.currentUser) return this.currentUser;

    if (typeof window === 'undefined' || !this.hasSupabaseAuthReady()) {
      return null;
    }

    if (this.isRestoringSession) return null;

    try {
      this.isRestoringSession = true;
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        if (!this.isPasswordRecoveryActive) {
          const mapped = this.mapSupabaseUser(data.session.user);
          this.currentUser = mapped;
          this.currentDemoUser = null;
          this.notifySubscribers(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('Session restoration note:', err);
    } finally {
      this.isRestoringSession = false;
    }

    return null;
  }

  private mapSupabaseUser(user: SupabaseUser): AppAuthUser {
    const role: 'customer' | 'technician' =
      user.app_metadata?.role === 'technician' || user.user_metadata?.role === 'technician'
        ? 'technician'
        : 'customer';

    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    return {
      id: user.id,
      uid: user.id,
      email: user.email,
      phone: user.phone,
      phoneNumber: user.phone,
      displayName,
      role,
      isDemo: false,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      getIdTokenResult: async () => ({
        claims: {
          role,
          email: user.email,
          phone: user.phone,
          ...(user.app_metadata || {}),
        },
      }),
      getIdToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || '';
      },
    };
  }

  private notifySubscribers(user: AppAuthUser | null): void {
    this.subscribers.forEach((sub) => {
      try {
        sub(user);
      } catch (err) {
        console.error('Error in auth subscriber:', err);
      }
    });
  }

  /**
   * Safe DOM helper for reCAPTCHA container compatibility (kept for backward-compatible call signatures)
   */
  public setupRecaptcha(_containerId: string): { clear: () => void } {
    return {
      clear: () => {},
    };
  }

  /**
   * Check rate-limiting and cooldown status
   */
  public getRateLimitInfo(): VerificationRateLimitInfo {
    const now = Date.now();
    
    if (now - this.windowStartTimestamp > LOCKOUT_WINDOW_MS) {
      this.attemptsInWindow = 0;
      this.windowStartTimestamp = now;
    }

    const elapsedSeconds = Math.floor((now - this.lastSentTimestamp) / 1000);
    const remainingSeconds = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);

    const isLockedOut = this.attemptsInWindow >= MAX_ATTEMPTS_PER_WINDOW;
    const canResend = !isLockedOut && remainingSeconds === 0;

    return {
      canResend,
      remainingSeconds,
      attemptsCount: this.attemptsInWindow,
      maxAttempts: MAX_ATTEMPTS_PER_WINDOW,
    };
  }

  /**
   * Formats raw 10-digit Indian phone number to E.164 standard (+91XXXXXXXXXX)
   */
  public formatToE164(rawPhone: string): string {
    const cleaned = rawPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    return `+91${cleaned}`;
  }

  /**
   * Initiates real phone OTP verification through Supabase Auth (or Sandboxed Demo Mode on localhost)
   */
  public async sendPhoneOtp(
    rawPhone: string,
    _appVerifier?: any
  ): Promise<ConfirmationResult> {
    const normalizedPhone = rawPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }

    const e164Phone = this.formatToE164(rawPhone);
    const now = Date.now();

    if (now - this.windowStartTimestamp > LOCKOUT_WINDOW_MS) {
      this.attemptsInWindow = 0;
      this.windowStartTimestamp = now;
    }

    if (this.attemptsInWindow >= MAX_ATTEMPTS_PER_WINDOW) {
      const waitMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (now - this.windowStartTimestamp)) / 60000);
      throw new Error(
        `Too many verification requests. To protect your account, please wait ${waitMinutes} minute(s) before requesting a new OTP.`
      );
    }

    const elapsedSeconds = Math.floor((now - this.lastSentTimestamp) / 1000);
    if (this.lastSentTimestamp > 0 && elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw new Error(`Please wait ${waitSeconds} second(s) before requesting another code.`);
    }

    if (this.isOtpRequestInProgress) {
      throw new Error('A verification request is already in progress. Please wait a moment.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        return this.createDemoConfirmation(rawPhone);
      }
      throw new Error(
        'SMS verification service is currently unavailable. Live Supabase credentials and an active SMS provider are required. Please try again later or contact support.'
      );
    }

    this.isOtpRequestInProgress = true;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
      });

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        const errCode = (error as any).code || '';
        if (
          errMsg.includes('unsupported phone provider') ||
          errCode === 'phone_provider_disabled' ||
          errMsg.includes('provider is disabled')
        ) {
          throw new Error(
            'SMS provider is not configured in Supabase. Please enable Phone provider & Twilio/SMS gateway in Supabase Dashboard (Auth > Providers > Phone). (Local developers can click Quick Demo Login on localhost).'
          );
        }
        throw new Error(error.message);
      }

      const confirmation: ConfirmationResult = {
        phone: e164Phone,
        isDemo: false,
        confirm: async (code: string) => {
          const user = await this.verifyOtp(confirmation, code);
          return { user };
        },
      };

      this.activeConfirmation = confirmation;
      this.lastSentTimestamp = Date.now();
      this.attemptsInWindow += 1;
      return confirmation;
    } catch (err: unknown) {
      throw new Error((err as Error).message || 'Failed to dispatch SMS verification code.');
    } finally {
      this.isOtpRequestInProgress = false;
    }
  }

  /**
   * Confirms verification code with strict provider verification.
   * Universal OTPs like '123456' or test bypasses are completely rejected.
   */
  public async verifyOtp(
    confirmationResult: ConfirmationResult | null,
    verificationCode: string
  ): Promise<AppAuthUser> {
    const targetConfirmation = confirmationResult || this.activeConfirmation;
    const cleanCode = verificationCode.trim();

    if (!targetConfirmation) {
      throw new Error('No active verification session. Please request a new OTP first.');
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        const demoUser: AppAuthUser = {
          id: 'demo-auth-user',
          uid: 'demo-auth-user',
          phone: targetConfirmation.phone,
          phoneNumber: targetConfirmation.phone,
          email: 'customer.demo@clrservices.local',
          displayName: 'Demo Customer',
          role: 'customer',
          isDemo: true,
          getIdTokenResult: async () => ({ claims: { role: 'customer', isDemo: true } }),
          getIdToken: async () => 'mock-demo-jwt',
        };

        this.activeConfirmation = null;
        this.attemptsInWindow = 0;
        this.currentDemoUser = demoUser;
        this.currentUser = demoUser;
        this.notifySubscribers(demoUser);
        return demoUser;
      }

      throw new Error(
        'SMS verification service is currently unavailable. Live Supabase credentials and an active SMS provider are required. Please try again later or contact support.'
      );
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: targetConfirmation.phone,
        token: cleanCode,
        type: 'sms',
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid or expired verification code. Please check your SMS and try again.');
      }

      this.activeConfirmation = null;
      this.attemptsInWindow = 0;
      const mapped = this.mapSupabaseUser(data.user);
      this.currentDemoUser = null;
      this.currentUser = mapped;
      this.notifySubscribers(mapped);
      return mapped;
    } catch (err: unknown) {
      throw new Error((err as Error).message || 'Verification failed. Please try again.');
    }
  }

  /**
   * Development-only one-click customer demo login for localhost testing.
   */
  public loginDemoCustomer(): AppAuthUser {
    if (!isDemoModeAllowed()) {
      throw new Error('403 Forbidden: Demo authentication is strictly disabled in production.');
    }

    const demoCustomer: AppAuthUser = {
      id: 'customer-demo-sandbox',
      uid: 'customer-demo-sandbox',
      email: 'customer.demo@clrservices.local',
      phoneNumber: '+919491242781',
      displayName: 'Chirala Resident (Demo Sandbox)',
      isDemo: true,
      getIdTokenResult: async () => ({ claims: { role: 'customer', isDemo: true } }),
      getIdToken: async () => 'mock-demo-customer-jwt',
    };

    this.currentDemoUser = demoCustomer;
    this.currentUser = demoCustomer;
    this.notifySubscribers(demoCustomer);
    return demoCustomer;
  }

  // ===============================================================
  // ADMINISTRATOR AUTHENTICATION (SUPABASE AUTH & DEMO ISOLATION)
  // ===============================================================

  /**
   * Verifies if a user has administrator privileges
   */
  public async isUserAdmin(user: AppAuthUser | SupabaseUser | null): Promise<boolean> {
    if (!user) return false;

    // Sandboxed demo admin in local development has no real JWT.
    if ((user as any).isDemo && isDemoModeAllowed() && (user as any).role === 'admin') {
      return true;
    }

    try {
      const profile = await bffFetch<{ role: string }>('/me');
      return profile.role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Authenticates administrator using Supabase Auth with verified credentials
   */
  public async loginAdmin(emailOrId: string, password: string): Promise<AdminProfile> {
    const cleanEmail = emailOrId.trim();
    if (!cleanEmail || !password) {
      throw new Error('Please provide both administrator email and password.');
    }

    const resolvedEmail = cleanEmail;

    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to log in with live administrator credentials.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error('Invalid administrator credentials. Access denied.');
    }

    const isAdmin = await this.isUserAdmin(data.user);
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('403 Forbidden: Access denied. This account does not possess administrator privileges.');
    }

    const mapped = this.mapSupabaseUser(data.user);
    this.currentDemoUser = null;
    this.notifySubscribers(mapped);

    return {
      uid: mapped.uid,
      email: mapped.email || resolvedEmail,
      displayName: mapped.displayName || 'Administrator',
      role: 'admin',
      tokenIssuedAt: new Date().toISOString(),
      isDemo: false,
    };
  }

  /**
   * Development-only one-click admin demo login for localhost testing.
   * Strictly blocked in production builds.
   */
  public loginDemoAdmin(): AdminProfile {
    if (!isDemoModeAllowed()) {
      throw new Error('403 Forbidden: Demo authentication is strictly disabled in production.');
    }

    const demoAdmin: AppAuthUser = {
      id: 'admin-demo-sandbox',
      uid: 'admin-demo-sandbox',
      email: 'admin.demo@clrservices.local',
      displayName: 'Admin Dispatch (Local Demo Sandbox)',
      role: 'admin',
      isDemo: true,
      getIdTokenResult: async () => ({ claims: { role: 'admin', isDemo: true } }),
      getIdToken: async () => 'mock-demo-admin-jwt',
    };

    this.currentDemoUser = demoAdmin;
    this.currentUser = demoAdmin;
    this.notifySubscribers(demoAdmin);

    return {
      uid: demoAdmin.uid,
      email: demoAdmin.email!,
      displayName: demoAdmin.displayName!,
      role: 'admin',
      tokenIssuedAt: new Date().toISOString(),
      isDemo: true,
    };
  }

  /**
   * Initiates password reset via Supabase Auth
   */
  public async sendAdminPasswordReset(adminEmail: string): Promise<void> {
    const resolvedEmail = adminEmail.trim();
    if (!resolvedEmail) {
      throw new Error('Please enter the administrator email address.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        return; // Simulated success in local demo mode
      }
      throw new Error('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
    });

    if (error) {
      throw new Error(error.message || 'Failed to dispatch password reset email.');
    }
  }

  /**
   * Subscribe to recovery state changes (fires when PASSWORD_RECOVERY event is triggered)
   */
  public onPasswordRecovery(callback: (isActive: boolean) => void): () => void {
    this.recoverySubscribers.add(callback);
    callback(this.isPasswordRecoveryActive);
    return () => {
      this.recoverySubscribers.delete(callback);
    };
  }

  private notifyRecoverySubscribers(active: boolean): void {
    this.recoverySubscribers.forEach((cb) => {
      try {
        cb(active);
      } catch (err) {
        console.error('Error notifying recovery subscriber:', err);
      }
    });
  }

  public isRecoveryMode(): boolean {
    return this.isPasswordRecoveryActive;
  }

  public setRecoveryMode(active: boolean): void {
    this.isPasswordRecoveryActive = active;
    try {
      if (active) {
        sessionStorage.setItem('lh_password_recovery_active', 'true');
      } else {
        sessionStorage.removeItem('lh_password_recovery_active');
      }
    } catch {}
    this.notifyRecoverySubscribers(active);
  }

  /**
   * Inspects current browser URL for Supabase Auth recovery tokens, PKCE codes, or error states.
   * Handles exchangeCodeForSession if PKCE code parameter (?code=...) is found.
   */
  public async checkPasswordRecoveryUrl(): Promise<{ isRecovery: boolean; error: string | null }> {
    if (typeof window === 'undefined') {
      return { isRecovery: false, error: null };
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hashString = window.location.hash.startsWith('#') 
      ? window.location.hash.substring(1) 
      : window.location.hash;
    const hashParams = new URLSearchParams(hashString);

    const errorParam = searchParams.get('error') || hashParams.get('error');
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

    if (errorParam || errorCode || errorDesc) {
      const decodedDesc = errorDesc ? decodeURIComponent(errorDesc).replace(/\+/g, ' ') : null;
      let friendlyError = decodedDesc || 'The password reset link is invalid or has expired.';
      if (errorCode === 'otp_expired' || friendlyError.toLowerCase().includes('expired')) {
        friendlyError = 'The password reset link has expired or has already been used. Please request a new password reset email.';
      }
      this.isPasswordRecoveryActive = true;
      this.notifyRecoverySubscribers(true);
      return { isRecovery: true, error: friendlyError };
    }

    const code = searchParams.get('code');
    if (code) {
      this.isPasswordRecoveryActive = true;
      try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
      this.notifyRecoverySubscribers(true);

      if (!isSupabaseConfigured()) {
        return { isRecovery: false, error: 'Supabase credentials not configured.' };
      }

      try {
        const { data: earlySession } = await supabase.auth.getSession();
        if (earlySession?.session?.user) {
          this.isPasswordRecoveryActive = true;
          try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
          this.notifyRecoverySubscribers(true);
          return { isRecovery: true, error: null };
        }
      } catch {
      }

      await new Promise((resolve) => setTimeout(resolve, 150));
      try {
        const { data: retrySession } = await supabase.auth.getSession();
        if (retrySession?.session?.user) {
          this.isPasswordRecoveryActive = true;
          try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
          this.notifyRecoverySubscribers(true);
          return { isRecovery: true, error: null };
        }
      } catch {}

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            this.isPasswordRecoveryActive = true;
            try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
            this.notifyRecoverySubscribers(true);
            return { isRecovery: true, error: null };
          }
          return { 
            isRecovery: true, 
            error: error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('both')
              ? 'The password reset link has expired or has already been used. Please request a new password reset email.'
              : error.message 
          };
        }

        if (data?.session) {
          this.isPasswordRecoveryActive = true;
          try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
          this.notifyRecoverySubscribers(true);
          return { isRecovery: true, error: null };
        }
      } catch (err: unknown) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          this.isPasswordRecoveryActive = true;
          try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
          this.notifyRecoverySubscribers(true);
          return { isRecovery: true, error: null };
        }
        return { isRecovery: true, error: (err as Error).message || 'Failed to exchange verification code.' };
      }
    }

    const type = hashParams.get('type') || searchParams.get('type');
    if (type === 'recovery') {
      this.isPasswordRecoveryActive = true;
      try { sessionStorage.setItem('lh_password_recovery_active', 'true'); } catch {}
      this.notifyRecoverySubscribers(true);
      return { isRecovery: true, error: null };
    }

    if (this.isPasswordRecoveryActive || this.isRecoverySession()) {
      return { isRecovery: true, error: null };
    }

    return { isRecovery: false, error: null };
  }

  /**
   * Identifies the role of the user in the active recovery session.
   */
  public async getRecoveryUserRole(): Promise<'admin' | 'technician' | 'customer' | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) return null;

      const profile = await bffFetch<{ role: 'admin' | 'technician' | 'customer' }>('/me');
      return profile.role;
    } catch {
      return null;
    }
  }

  /**
   * Universal password update method that safely detects the recovery user's role,
   * performs strict admin privilege validation if updating an admin account,
   * and terminates the temporary session to require fresh login.
   */
  public async updateRecoveryPassword(newPassword: string): Promise<{ success: boolean; role: 'admin' | 'technician' | 'customer' }> {
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        this.isPasswordRecoveryActive = false;
        this.notifyRecoverySubscribers(false);
        return { success: true, role: 'customer' };
      }
      throw new Error('Supabase credentials not configured.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      throw new Error('No active recovery session found. Please open the password reset link from your email again.');
    }

    const role = (await this.getRecoveryUserRole()) ?? 'customer';

    const { data, error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update password.');
    }

    if (!data.user) {
      throw new Error('Supabase did not return updated user record. Please try again.');
    }

    this.isPasswordRecoveryActive = false;
    try { sessionStorage.removeItem('lh_password_recovery_active'); } catch {}
    this.notifyRecoverySubscribers(false);

    if (typeof window !== 'undefined') {
      const cleanPath = role === 'admin' ? '/admin' : role === 'technician' ? '/technician' : '/login';
      window.history.replaceState({}, document.title, cleanPath);
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut after recovery password reset note:', e);
    }

    this.notifySubscribers(null);
    return { success: true, role };
  }

  /**
   * Securely updates administrator password via Supabase Auth updateUser.
   * Requires a valid, active password recovery or authenticated session.
   */
  public async updateAdminPassword(newPassword: string): Promise<void> {
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        this.isPasswordRecoveryActive = false;
        this.notifyRecoverySubscribers(false);
        return; // Dev simulation
      }
      throw new Error('Supabase credentials not configured. Cannot update password.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      throw new Error('No active recovery session found. Please open the password reset link from your email again.');
    }

    const sessionUser = sessionData.session.user;
    const isAdmin = await this.isUserAdmin(sessionUser);
    if (!isAdmin) {
      await supabase.auth.signOut();
      this.isPasswordRecoveryActive = false;
      this.notifyRecoverySubscribers(false);
      throw new Error('403 Forbidden: Access denied. This account does not possess administrator privileges.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update administrator password.');
    }

    if (!data.user) {
      throw new Error('Supabase did not return updated user record. Please try again.');
    }

    this.isPasswordRecoveryActive = false;
    try { sessionStorage.removeItem('lh_password_recovery_active'); } catch {}
    this.notifyRecoverySubscribers(false);

    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.pathname.includes('/admin') ? '/admin' : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut after password reset note:', e);
    }

    this.notifySubscribers(null);
  }

  // ===============================================================
  // TECHNICIAN AUTHENTICATION (SUPABASE AUTH & DEMO ISOLATION)
  // ===============================================================

  /**
   * Registers a technician with Supabase Auth using verified Phone SMS OTP
   * without requiring an email address.
   */
  public async registerTechnicianWithPhoneOtp(
    confirmation: ConfirmationResult | null,
    otpCode: string,
    password?: string,
    optionalEmail?: string
  ): Promise<AppAuthUser> {
    if (!confirmation || !otpCode) {
      throw new Error('Please enter the 6-digit verification code sent to your mobile.');
    }

    const verifiedUser = await this.verifyOtp(confirmation, otpCode);

    if (isSupabaseConfigured() && !verifiedUser.isDemo) {
      const updatePayload: { password?: string; email?: string; data?: Record<string, any> } = {
        data: { role: 'technician' },
      };
      if (password && password.length >= 6) {
        updatePayload.password = password.trim();
      }
      if (optionalEmail && optionalEmail.trim()) {
        updatePayload.email = optionalEmail.trim().toLowerCase();
      }

      try {
        const { error: updateErr } = await supabase.auth.updateUser(updatePayload);
        if (updateErr) {
          console.warn('Optional credentials update note:', updateErr.message);
        }
      } catch (err) {
        console.warn('Optional credentials update exception:', err);
      }
    }

    return verifiedUser;
  }

  /**
   * Registers a technician with Supabase Auth via email credentials
   */
  public async registerTechnicianAuth(email: string, password: string): Promise<AppAuthUser> {
    if (!email || !password || password.length < 6) {
      throw new Error('Technician registration requires a valid email and password (minimum 6 characters).');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase credentials not configured. Please configure your live environment variables.');
    }

    const trimmedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          role: 'technician',
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Failed to register technician credentials.');
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const { data: existingSignIn, error: existingErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (existingErr || !existingSignIn?.user || !existingSignIn?.session) {
        throw new Error('This email is already registered with an account. Please log in with your existing password or use a different email.');
      }

      return this.mapSupabaseUser(existingSignIn.user);
    }

    if (!data.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInErr || !signInData?.session) {
        if (signInErr?.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Account created! A confirmation email has been dispatched. Please confirm your email address before partner profile registration.');
        }
        const { data: curSession } = await supabase.auth.getSession();
        if (!curSession?.session?.user) {
          throw new Error('Registration completed but an active authentication session could not be established. Please log in directly.');
        }
      }
    }

    return this.mapSupabaseUser(data.user);
  }

  /**
   * Logs in a technician via Supabase Auth using either registered Email or Phone number
   */
  public async loginTechnicianAuth(identifier: string, password: string): Promise<AppAuthUser> {
    if (!identifier || !password) {
      throw new Error('Please enter both your registered Phone/Email and Password.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to log in. (Local developers can click "Quick Demo Login" on localhost).'
      );
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');

    let signInCredentials: { email?: string; phone?: string; password: string };
    if (isEmail) {
      signInCredentials = { email: trimmed.toLowerCase(), password };
    } else {
      const cleanPhone = trimmed.replace(/\D/g, '').slice(-10);
      signInCredentials = { phone: `+91${cleanPhone}`, password };
    }

    const { data, error } = await supabase.auth.signInWithPassword(signInCredentials as any);

    if (error || !data.user) {
      throw new Error(error?.message || 'Invalid technician credentials. Access denied.');
    }

    const mapped = this.mapSupabaseUser(data.user);
    this.currentDemoUser = null;
    this.notifySubscribers(mapped);
    return mapped;
  }

  /**
   * Development-only one-click technician demo login for localhost testing.
   * Strictly blocked in production builds.
   */
  public loginDemoTechnician(): AppAuthUser {
    if (!isDemoModeAllowed()) {
      throw new Error('403 Forbidden: Demo authentication is strictly disabled in production.');
    }

    const demoTech: AppAuthUser = {
      id: 'tech-demo-sandbox',
      uid: 'tech-demo-sandbox',
      email: 'ramesh.electrician.demo@clrservices.local',
      phone: '9848012345',
      phoneNumber: '9848012345',
      displayName: 'Ramesh Babu (Demo Electrician)',
      role: 'technician',
      isDemo: true,
      user_metadata: {
        fullName: 'Ramesh Babu (Demo Electrician)',
        phoneNumber: '9848012345',
        trade: 'Electrical Repairs',
        neighborhood: 'Perala',
        status: 'Approved',
        availability: 'Available',
      },
      getIdTokenResult: async () => ({ claims: { role: 'technician', isDemo: true } }),
      getIdToken: async () => 'mock-demo-tech-jwt',
    };

    this.currentDemoUser = demoTech;
    this.currentUser = demoTech;
    this.notifySubscribers(demoTech);
    return demoTech;
  }

  /**
   * Dispatches password reset email to technician
   */
  public async sendTechnicianPasswordReset(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid technician email address.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) return;
      throw new Error('Supabase credentials not configured.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/technician` : undefined,
    });

    if (error) {
      throw new Error(error.message || 'Failed to dispatch technician password reset email.');
    }
  }

  /**
   * Securely updates technician password via Supabase Auth updateUser
   */
  public async updateTechnicianPassword(newPassword: string): Promise<void> {
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        this.isPasswordRecoveryActive = false;
        this.notifyRecoverySubscribers(false);
        return;
      }
      throw new Error('Supabase credentials not configured.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      throw new Error('No active recovery session found. Please open the password reset link from your email again.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update technician password.');
    }

    if (!data.user) {
      throw new Error('Supabase did not return updated user record. Please try again.');
    }

    this.isPasswordRecoveryActive = false;
    try { sessionStorage.removeItem('lh_password_recovery_active'); } catch {}
    this.notifyRecoverySubscribers(false);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/technician');
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut after technician password reset note:', e);
    }
    this.notifySubscribers(null);
  }

  /**
   * Dispatches password reset email to customer via Supabase Auth
   */
  public async sendCustomerPasswordReset(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid customer email address.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) return;
      throw new Error('Supabase credentials not configured.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/customer` : undefined,
    });

    if (error) {
      throw new Error(error.message || 'Failed to dispatch customer password reset email.');
    }
  }

  /**
   * Securely updates customer password via Supabase Auth updateUser
   */
  public async updateCustomerPassword(newPassword: string): Promise<void> {
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!isSupabaseConfigured()) {
      if (isDemoModeAllowed()) {
        this.isPasswordRecoveryActive = false;
        this.notifyRecoverySubscribers(false);
        return;
      }
      throw new Error('Supabase credentials not configured.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      throw new Error('No active recovery session found. Please open the password reset link from your email again.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to update customer password.');
    }

    if (!data.user) {
      throw new Error('Supabase did not return updated user record. Please try again.');
    }

    this.isPasswordRecoveryActive = false;
    try { sessionStorage.removeItem('lh_password_recovery_active'); } catch {}
    this.notifyRecoverySubscribers(false);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/customer');
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut after customer password reset note:', e);
    }
    this.notifySubscribers(null);
  }

  /**
   * Sign out current user from all sessions
   */
  public async logout(): Promise<void> {
    this.activeConfirmation = null;
    this.currentDemoUser = null;
    this.currentUser = null;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut note:', e);
    }
    this.notifySubscribers(null);
  }

  /**
   * Returns current authenticated user (or active dev demo user)
   */
  public getCurrentUser(): AppAuthUser | null {
    if (this.currentDemoUser) {
      return this.currentDemoUser;
    }
    return this.currentUser;
  }

  /**
   * Get fresh token
   */
  public async getIdToken(_forceRefresh = false): Promise<string | null> {
    if (this.currentDemoUser) {
      return 'mock-demo-jwt-token';
    }
    if (!this.hasSupabaseAuthReady()) {
      return null;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  /**
   * Subscribe to auth changes and ensure session restoration if pending
   */
  public subscribe(callback: AuthStateSubscriber): () => void {
    this.subscribers.add(callback);
    const existing = this.getCurrentUser();
    if (existing) {
      callback(existing);
    } else if (this.hasSupabaseAuthReady()) {
      this.restoreSession().catch(() => {});
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }
}

export const authService = new AuthService();
export { isSupabaseConfigured, isDemoModeAllowed, getSupabaseConfigStatus };
