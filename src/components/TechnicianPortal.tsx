import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wrench, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Lock, 
  LogOut, 
  RefreshCw, 
  MessageCircle, 
  UserCheck, 
  Clock3, 
  XCircle, 
  Play, 
  KeyRound, 
  X, 
  ShieldAlert, 
  Mail, 
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  BookingRecord, 
  BookingStatus,
  ChiralaNeighborhood, 
  ServiceCategory, 
  TechnicianAvailability, 
  TechnicianRecord, 
  TechnicianRegistrationData 
} from '../types';
import { technicianService } from '../services/technicianService';
import { bookingService } from '../services/bookingService';
import { authService, ConfirmationResult } from '../services/authService';
import { supabase, isSupabaseConfigured, isDemoModeAllowed } from '../services/supabase';

interface TechnicianPortalProps {
  onBackToHome?: () => void;
  initialTab?: 'login' | 'register';
}

const NEIGHBORHOODS: ChiralaNeighborhood[] = [
  'Paparajuthota',
  'Perala',
  'Kothapeta',
  'Srinivas Colony',
];

/* Nivaro Brand System: Warm Cream #F5E6CC, Charcoal Grey #4A4A4A, Terracotta Orange #E27D60, Forest Green #2D4F1E (Legacy: #4A251D #E59838 #5F7D6B #FDF6E4 #EEF3EF #DCE6E1) */
export const TechnicianPortal: React.FC<TechnicianPortalProps> = ({ 
  onBackToHome,
  initialTab 
}) => {
  // Current logged in technician
  const [currentTech, setCurrentTech] = useState<TechnicianRecord | null>(() => {
    return technicianService.getCurrentTechnician();
  });

  // Auth Tab: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('tab=register') || search.includes('register') || hash.includes('register')) {
        return 'register';
      }
    }
    if (initialTab) return initialTab;
    return 'login';
  });

  // Keep authTab in sync if initialTab or URL search changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const hash = window.location.hash;
      if (search.includes('tab=register') || search.includes('register') || hash.includes('register')) {
        setAuthTab('register');
        return;
      }
    }
    if (initialTab) {
      setAuthTab(initialTab);
    }
  }, [initialTab]);

  // Login form state
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginPhoneOrEmail, setLoginPhoneOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Technician Phone OTP login state
  const [techOtpPhone, setTechOtpPhone] = useState('');
  const [techOtpStep, setTechOtpStep] = useState<'phone' | 'otp'>('phone');
  const [techOtpCode, setTechOtpCode] = useState('');
  const [techConfirmation, setTechConfirmation] = useState<any>(null);
  const [techOtpCooldown, setTechOtpCooldown] = useState(0);

  // Forgot Password Modal state (Supabase Auth)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailOrPhone, setForgotEmailOrPhone] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentMessage, setResetSentMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Recovery Flow State (Supabase Auth)
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isTechPath = window.location.pathname.includes('/technician') || window.location.hash.includes('#technician');
      if (isTechPath) {
        const s = window.location.search;
        const h = window.location.hash;
        return s.includes('code=') || s.includes('type=recovery') || h.includes('type=recovery') || s.includes('error=') || h.includes('error=') || authService.isRecoveryMode();
      }
    }
    return false;
  });
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Register form state
  const [regStep, setRegStep] = useState<'details' | 'otp'>('details');
  const [regData, setRegData] = useState<TechnicianRegistrationData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    serviceCategory: 'Electrical Repairs',
    neighborhood: 'Perala',
  });
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regConfirmation, setRegConfirmation] = useState<ConfirmationResult | null>(null);
  const [regOtpCooldown, setRegOtpCooldown] = useState<number>(0);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  // Dashboard & Job States
  const [techBookings, setTechBookings] = useState<BookingRecord[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsQueryError, setBookingsQueryError] = useState<string | null>(null);
  const [activeJobFilter, setActiveJobFilter] = useState<'all' | 'in_progress' | 'upcoming' | 'completed'>('all');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [isUpdatingDuty, setIsUpdatingDuty] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [selectedJobDetails, setSelectedJobDetails] = useState<BookingRecord | null>(null);
  const [completingJob, setCompletingJob] = useState<BookingRecord | null>(null);
  const [completionBillInput, setCompletionBillInput] = useState('');
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Scheduling conflict');

  // Sync current technician and subscribe to real-time technician changes
  useEffect(() => {
    technicianService.fetchFromSupabase().catch(() => {});

    // Proactively restore active technician session from persistence or Supabase session
    technicianService.restoreTechnicianSession().then((restored) => {
      if (restored) {
        setCurrentTech({ ...restored });
      }
    }).catch(() => {});

    const unsubTech = technicianService.subscribe(() => {
      const updated = technicianService.getCurrentTechnician();
      setCurrentTech(updated ? { ...updated } : null);
    });

    return () => unsubTech();
  }, []);

  // Listen to recovery session and check recovery parameters on mount
  useEffect(() => {
    const unsubRecovery = authService.onPasswordRecovery((active) => {
      const isTechPath = window.location.pathname.includes('/technician') || window.location.hash.includes('#technician');
      if (active && isTechPath) {
        setIsRecoveryMode(true);
      }
    });

    const verifyRecoveryUrl = async () => {
      const isTechPath = window.location.pathname.includes('/technician') || window.location.hash.includes('#technician');
      if (isTechPath) {
        const res = await authService.checkPasswordRecoveryUrl();
        if (res.isRecovery) {
          setIsRecoveryMode(true);
          if (res.error) {
            setRecoveryError(res.error);
          }
        }
      }
    };
    verifyRecoveryUrl();

    return () => {
      unsubRecovery();
    };
  }, []);

  // Load bookings for authenticated technician
  const loadBookings = useCallback(async () => {
    if (!currentTech) {
      setTechBookings([]);
      return;
    }

    setIsLoadingBookings(true);
    setBookingsQueryError(null);

    try {
      if (isSupabaseConfigured() && currentTech.supabaseUid) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('assigned_technician_id', currentTech.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(error.message || 'Failed to query jobs from Supabase.');
        }

        if (data) {
          const mapped: BookingRecord[] = data.map((row: any) => ({
            id: row.id,
            customerId: row.customer_id || undefined,
            customerDisplayId: row.customer_display_id || undefined,
            fullName: row.full_name,
            phoneNumber: row.phone,
            serviceCategory: row.service_category,
            neighborhood: row.neighborhood,
            address: row.address,
            description: row.description,
            preferredDate: row.preferred_date,
            timeSlot: row.time_slot,
            serviceRating: row.service_rating || 0,
            status: row.status as BookingStatus,
            assignedTechnicianId: row.assigned_technician_id || undefined,
            assignedTechnicianDisplayId: row.assigned_technician_display_id || undefined,
            finalBillAmount: row.final_bill_amount ? Number(row.final_bill_amount) : undefined,
            createdAt: row.created_at,
            statusHistory: [
              {
                status: row.status,
                timestamp: row.created_at,
                note: `Current Status: ${row.status}`,
              }
            ],
          }));

          setTechBookings(mapped);
          return;
        }
      }

      // Local sandbox fallback
      const assigned = bookingService.getBookingsForTechnician(currentTech.id);
      setTechBookings(assigned);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query technician jobs from database.';
      setBookingsQueryError(msg);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [currentTech]);

  // Subscribe to real-time bookings assigned to this technician
  useEffect(() => {
    if (!currentTech) {
      setTechBookings([]);
      return;
    }

    loadBookings();

    const unsubBookings = bookingService.subscribe(() => {
      loadBookings();
    });

    return () => unsubBookings();
  }, [currentTech, loadBookings]);

  // Tick down OTP cooldowns
  useEffect(() => {
    if (techOtpCooldown > 0) {
      const timer = setTimeout(() => {
        setTechOtpCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [techOtpCooldown]);

  useEffect(() => {
    if (regOtpCooldown > 0) {
      const timer = setTimeout(() => {
        setRegOtpCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [regOtpCooldown]);

  // Handle Login via Password (Supabase Auth)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const identifier = loginPhoneOrEmail.trim();
    if (!identifier || !loginPassword) {
      setLoginError('Please enter both your registered Phone/Email and Password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      let loginIdentifier = identifier;
      let matchedTech: TechnicianRecord | null = null;

      // If entered as phone number, find the registered technician
      if (/^[6-9]\d{9}$/.test(identifier.replace(/\D/g, '').slice(-10))) {
        const cleanPhone = identifier.replace(/\D/g, '').slice(-10);
        matchedTech = technicianService.findByPhone(cleanPhone);
        // If technician profile has a registered email, use it; otherwise use phone directly
        loginIdentifier = matchedTech?.email || cleanPhone;
      } else {
        matchedTech = technicianService.findByEmail(identifier);
      }

      // 1. Authenticate with Supabase Auth (supports email or phone number directly)
      const authUser = await authService.loginTechnicianAuth(loginIdentifier, loginPassword);

      // 2. Synchronize and retrieve the technician profile from Supabase
      const tech = await technicianService.syncTechnicianProfileOnLogin(authUser.uid, identifier);

      // 3. Handle missing profiles safely: do not create new accounts on login flow
      if (!tech) {
        await authService.logout();
        throw new Error('Access denied: No technician partner profile found for this account. Please register as a partner first.');
      }

      if (tech.status === 'Rejected') {
        setCurrentTech(tech);
        throw new Error(`Access restricted: Your technician application was not approved. ${tech.rejectedReason || ''}`);
      }

      setCurrentTech(tech);
      setLoginPhoneOrEmail('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid technician credentials. Access denied.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Safe isolated demo technician login for localhost sandbox
  const handleQuickDemoSession = () => {
    try {
      setLoginError(null);
      const demoTech = technicianService.loginDemoTechnicianSession();
      // Seed demo jobs in sandbox for realistic display
      bookingService.seedDemoBookings('tech-demo-sandbox');
      setCurrentTech(demoTech);
      setNotification(`Logged in as demo partner: ${demoTech.fullName}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setLoginError(err.message || 'Demo technician authentication failed.');
    }
  };

  // Handle Technician Phone OTP
  const handleSendTechOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);

    const cleanPhone = techOtpPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setLoginError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const techRecord = technicianService.findByPhone(cleanPhone);
    if (!techRecord) {
      setLoginError(`Access denied: Mobile number +91 ${cleanPhone} is not registered as a technician. Please join as a partner first.`);
      return;
    }

    if (techRecord.status !== 'Approved') {
      setLoginError(`Access restricted: Your technician application is currently "${techRecord.status}". Only approved technicians can access the dispatch console.`);
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await authService.sendPhoneOtp(cleanPhone);
      setTechConfirmation(result);
      setTechOtpStep('otp');
      setTechOtpCooldown(60);
      setNotification(`Verification code dispatched to +91 ${cleanPhone}.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setLoginError(err.message || 'Failed to dispatch verification SMS.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyTechOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError(null);

    const cleanCode = techOtpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setLoginError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const authUser = await authService.verifyOtp(techConfirmation, cleanCode);
      const cleanPhone = techOtpPhone.replace(/\D/g, '').slice(-10);
      const tech = technicianService.handleAuthenticatedSession(authUser.uid, cleanPhone)
        || technicianService.findByPhone(cleanPhone);

      if (!tech || tech.status !== 'Approved') {
        throw new Error('Access denied: Unauthorized technician application status.');
      }

      setCurrentTech(tech);
      setTechOtpPhone('');
      setTechOtpCode('');
      setTechOtpStep('phone');
      setNotification(`Welcome back, ${tech.fullName}!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Forgot Password via Supabase Authentication
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setResetSentMessage(null);

    const input = forgotEmailOrPhone.trim();
    if (!input) {
      setForgotError('Please enter your registered email or 10-digit mobile number.');
      return;
    }

    setIsSendingReset(true);
    try {
      let emailToSend = input;
      if (!input.includes('@')) {
        const cleanPhone = input.replace(/\D/g, '').slice(-10);
        const tech = technicianService.findByPhone(cleanPhone);
        if (!tech) {
          throw new Error('Phone number not registered in technician database.');
        }
        if (!tech.email) {
          throw new Error('This technician account was registered without an email. Please sign in directly using Phone OTP.');
        }
        emailToSend = tech.email;
      }

      await authService.sendTechnicianPasswordReset(emailToSend);
      setResetSentMessage(`A secure password reset link has been dispatched to ${emailToSend}. Please open the link in your email to reset your credentials.`);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to dispatch password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Secure Technician Password Update via Supabase Auth updateUser
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew || cleanNew.length < 6) {
      setRecoveryError('Password must be at least 6 characters long.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setRecoveryError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.updateTechnicianPassword(cleanNew);
      setRecoverySuccess(
        'Your technician password has been updated successfully! Please log in with your new credentials.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsRecoveryMode(false);
        setRecoverySuccess(null);
        setNotification('Password updated successfully. Please enter your new credentials.');
        setTimeout(() => setNotification(null), 5000);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update technician password.';
      setRecoveryError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Validate Register Form
  const validateReg = (): boolean => {
    const errors: Record<string, string> = {};

    if (!regData.fullName.trim() || regData.fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters.';
    }

    const cleanPhone = regData.phoneNumber.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phoneNumber = 'Enter a valid 10-digit Indian mobile number (e.g. 9491242781).';
    }

    if (regData.email && regData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!regData.serviceCategory) {
      errors.serviceCategory = 'Please select your service specialization (Electrical or Plumbing).';
    }

    if (!regData.neighborhood) {
      errors.neighborhood = 'Please select your primary Chirala locality.';
    }

    if (!regPassword || regPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Send SMS OTP for technician partner registration
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    if (!validateReg()) return;

    const cleanPhone = regData.phoneNumber.replace(/\D/g, '').slice(-10);
    const cleanEmail = regData.email?.trim().toLowerCase() || null;

    // Check duplicate phone or email in registered technicians
    if (technicianService.findByPhone(cleanPhone)) {
      setRegErrors({ phoneNumber: `Mobile number +91 ${cleanPhone} is already registered as a technician.` });
      return;
    }
    if (cleanEmail && technicianService.findByEmail(cleanEmail)) {
      setRegErrors({ email: `Email ${cleanEmail} is already registered with a technician profile.` });
      return;
    }

    setIsRegistering(true);
    setRegErrors({});
    try {
      const result = await authService.sendPhoneOtp(cleanPhone);
      setRegConfirmation(result);
      setRegStep('otp');
      setRegOtpCooldown(60);
      setNotification(`Verification code dispatched to +91 ${cleanPhone}.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setRegErrors({ general: err.message || 'Failed to dispatch verification SMS.' });
    } finally {
      setIsRegistering(false);
    }
  };

  // Step 2: Verify SMS OTP & Create Partner Application with normalized email (null if omitted)
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    setRegErrors({});

    const cleanCode = regOtpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setRegErrors({ otp: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsRegistering(true);
    try {
      const cleanPhone = regData.phoneNumber.replace(/\D/g, '').slice(-10);
      const normalizedEmail = regData.email?.trim() || null;

      // 1. Verify Phone OTP with Supabase Auth to establish authenticated session
      const authUser = await authService.registerTechnicianWithPhoneOtp(
        regConfirmation,
        cleanCode,
        regPassword.trim() || undefined,
        normalizedEmail || undefined
      );

      // 2. Register technician profile with normalized email (null if omitted, never placeholder fake emails)
      const tech = await technicianService.registerTechnician({
        ...regData,
        phoneNumber: cleanPhone,
        email: normalizedEmail || undefined,
      }, authUser.uid);

      setCurrentTech(tech);
      setNotification('Technician application registered successfully and pending review!');
      setTimeout(() => setNotification(null), 5000);
      setRegStep('details');
      setRegOtpCode('');
      setRegPassword('');
    } catch (err: any) {
      setRegErrors({ otp: err.message || 'Registration verification failed. Please check the code and try again.' });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Error signing out from auth service:', e);
    }
    technicianService.logout();
    setCurrentTech(null);
    setLoginError(null);
    setTechBookings([]);
  };

  // On Duty / Checked Out control with persistence to Supabase
  const handleToggleDuty = async () => {
    if (!currentTech || isUpdatingDuty) return;

    const nextAvailability: TechnicianAvailability = 
      currentTech.availability === 'Available' ? 'Offline' : 'Available';

    setIsUpdatingDuty(true);
    try {
      const updated = await technicianService.setAvailabilityAsync(currentTech.id, nextAvailability);
      setCurrentTech({ ...updated });
      const statusLabel = nextAvailability === 'Available' ? 'On Duty' : 'Checked Out';
      setNotification(`Duty status updated to "${statusLabel}".`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update duty status.';
      setNotification(`Duty update failed: ${msg}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsUpdatingDuty(false);
    }
  };

  // Authorized Status Transitions on Jobs
  const handleUpdateJobStatus = async (
    bookingId: string, 
    nextStatus: BookingStatus, 
    billAmount?: number, 
    note?: string
  ) => {
    if (!currentTech) return;

    const targetJob = techBookings.find((b) => b.id === bookingId);
    if (!targetJob) return;

    // Strict authorization guard: Verify technician is authorized for this job
    if (targetJob.assignedTechnicianId && targetJob.assignedTechnicianId !== currentTech.id) {
      setNotification('403 Forbidden: You are not authorized to modify jobs assigned to another technician.');
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setUpdatingJobId(bookingId);

    try {
      if (isSupabaseConfigured() && currentTech.supabaseUid) {
        const updatePayload: any = {
          status: nextStatus,
        };
        if (nextStatus === 'Completed' && typeof billAmount === 'number') {
          updatePayload.final_bill_amount = billAmount;
        }

        const { error } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq('id', bookingId)
          .eq('assigned_technician_id', currentTech.id);

        if (error) {
          throw new Error(error.message || `Failed to update job status in Supabase.`);
        }
      }

      // Update in-memory / session store
      if (nextStatus === 'Accepted') {
        bookingService.acceptJob(bookingId);
      } else if (nextStatus === 'In Progress') {
        bookingService.startWork(bookingId);
      } else if (nextStatus === 'Completed') {
        bookingService.completeJob(bookingId, billAmount || 350);
      } else {
        bookingService.updateBookingStatus(bookingId, nextStatus, note, currentTech.id);
      }

      await loadBookings();
      setNotification(`Job ${bookingId} status transitioned to "${nextStatus}".`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed.';
      setNotification(`Failed to update status: ${msg}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleConfirmUnableToAttend = async () => {
    if (!rejectingBookingId) return;
    bookingService.reportUnableToAttend(rejectingBookingId, rejectReason);
    setNotification(`Job ${rejectingBookingId} released back to dispatch queue: "${rejectReason}".`);
    setRejectingBookingId(null);
    setRejectReason('Scheduling conflict');
    await loadBookings();
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCompleteWithBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingJob) return;

    const parsedBill = parseFloat(completionBillInput);
    if (isNaN(parsedBill) || parsedBill <= 0) {
      alert('Please enter a valid bill amount in Rupees (e.g. 450).');
      return;
    }

    await handleUpdateJobStatus(completingJob.id, 'Completed', parsedBill);
    setCompletingJob(null);
    setCompletionBillInput('');
    if (selectedJobDetails?.id === completingJob.id) {
      setSelectedJobDetails(null);
    }
  };

  const handleNavigateHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to extract a clear, human-readable service title from job description or fallback to serviceCategory
  const getJobServiceTitle = (job: BookingRecord): string => {
    if (!job.description) return job.serviceCategory;
    const cleanDesc = job.description.trim();
    // Split on em-dash, en-dash, hyphen, colon, or newline
    const firstSegment = cleanDesc.split(/[\n\r—–\-:]/)[0].trim();
    if (firstSegment.length >= 3 && firstSegment.length <= 45) {
      return firstSegment;
    }
    if (firstSegment.length > 45) {
      return firstSegment.slice(0, 42) + '...';
    }
    return job.serviceCategory;
  };

  // Statistic calculations derived strictly from actual records
  const inProgressJobs = techBookings.filter((b) => b.status === 'In Progress');
  const upcomingJobs = techBookings.filter((b) => b.status === 'Assigned' || b.status === 'Accepted' || b.status === 'New');

  const todayDateStr = new Date().toLocaleDateString('en-GB');
  const todayIsoStr = new Date().toISOString().slice(0, 10);
  const completedTodayJobs = techBookings.filter((b) => {
    if (b.status !== 'Completed') return false;
    const isTodayCompleted = b.completedAt && b.completedAt.startsWith(todayIsoStr);
    const isTodayPreferred = b.preferredDate === todayDateStr;
    return isTodayCompleted || isTodayPreferred;
  });

  const awaitingPartsJobs = techBookings.filter((b) => {
    const hasPartReason = b.unableToAttendReason && b.unableToAttendReason.toLowerCase().includes('part');
    const hasPartNote = b.statusHistory && b.statusHistory.some((h) => 
      h.note && (h.note.toLowerCase().includes('part') || h.note.toLowerCase().includes('review'))
    );
    return Boolean(hasPartReason || hasPartNote);
  });

  // Filtered jobs according to active tab
  const filteredJobs = techBookings.filter((job) => {
    if (activeJobFilter === 'in_progress') return job.status === 'In Progress';
    if (activeJobFilter === 'upcoming') return job.status === 'Assigned' || job.status === 'Accepted' || job.status === 'New';
    if (activeJobFilter === 'completed') return job.status === 'Completed';
    return true; // 'all'
  });

  // =========================================================================
  // VIEW: RECOVERY SCREEN (When Technician opens email reset link)
  // =========================================================================
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#4A4A4A]/20 shadow-sm p-6 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-xl bg-[#FAF3E7] p-1.5 border border-[#4A4A4A]/20 shadow-xs flex items-center justify-center mx-auto">
              <KeyRound className="w-8 h-8 text-[#2E2E2E]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2E2E2E] tracking-tight">Nivaro</h1>
              <h2 className="text-2xl font-bold text-[#2E2E2E] mt-1">Reset Technician Password</h2>
              <p className="text-xs font-medium text-[#4A4A4A] mt-0.5">
                Set a new secure password for your Chirala technician account.
              </p>
            </div>
          </div>

          {recoveryError && (
            <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-2 flex-1">
                <span>{recoveryError}</span>
                {recoveryError.toLowerCase().includes('expired') && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoveryError(null);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-bold text-[#2E2E2E] underline hover:text-[#381a14] cursor-pointer"
                    >
                      Request a new password reset email
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {recoverySuccess ? (
            <div className="space-y-4">
              <div role="status" className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Password Reset Confirmed</p>
                  <p className="text-xs font-medium leading-relaxed">{recoverySuccess}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoverySuccess(null);
                }}
                className="w-full py-3 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer min-h-[46px]"
              >
                Return to Technician Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="tech-new-password" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    id="tech-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A4A4A] hover:text-[#2E2E2E] rounded cursor-pointer"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4 text-[#2E2E2E]" /> : <Eye className="w-4 h-4 text-[#2E2E2E]" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#4A4A4A] mt-1 font-medium">Must be at least 6 characters long.</p>
              </div>

              <div>
                <label htmlFor="tech-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    id="tech-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Re-enter your new password"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A4A4A] hover:text-[#2E2E2E] rounded cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-[#2E2E2E]" /> : <Eye className="w-4 h-4 text-[#2E2E2E]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating Password in Supabase...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-white" aria-hidden="true" />
                    <span>Reset Technician Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-[#4A4A4A]/20">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(false);
                setRecoveryError(null);
                setRecoverySuccess(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E2E2E] hover:underline transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Technician Sign In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: AUTHENTICATION (When No Technician Logged In)
  // =========================================================================
  if (!currentTech) {
    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 font-sans relative overflow-x-hidden">
        <div className="w-full max-w-lg relative z-10">
          
          {/* Card Container */}
          <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 shadow-sm p-6 sm:p-10 space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              {/* Official Nivaro Wordmark on Dark Backing */}
              <div className="h-14 px-5 py-2.5 rounded-2xl bg-black border border-[#4A4A4A]/30 shadow-xs flex items-center justify-center mx-auto w-fit">
                <img
                  src="/brand/nivaro-logo.png"
                  alt="Nivaro"
                  className="h-9 w-auto object-contain"
                  width={1024}
                  height={342}
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#2E2E2E] mt-1">
                  Technician Sign In
                </h2>
                <p className="text-xs font-medium text-[#4A4A4A] mt-0.5">
                  Chirala Electricians &amp; Plumbers Workspace
                </p>
              </div>
            </div>

            {/* Notification Toast */}
            {notification && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notification}</span>
              </div>
            )}

            {/* Tab Switcher: Login vs Register */}
            <div className="flex rounded-xl bg-[#F5E6CC] p-1 border border-[#4A4A4A]/20">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setLoginError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  authTab === 'login' 
                    ? 'bg-[#4A4A4A] text-white shadow-xs' 
                    : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
                }`}
              >
                Technician Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setRegErrors({}); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  authTab === 'register' 
                    ? 'bg-[#4A4A4A] text-white shadow-xs' 
                    : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
                }`}
              >
                Join as Partner
              </button>
            </div>

            {/* TAB 1: LOGIN FORM */}
            {authTab === 'login' && (
              <div className="space-y-4">
                {/* Method Switcher: Password vs Phone OTP */}
                <div className="flex rounded-lg bg-[#FAF3E7] p-1 border border-[#4A4A4A]/20">
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('password'); setLoginError(null); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      loginMethod === 'password'
                        ? 'bg-white text-[#2E2E2E] shadow-xs'
                        : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
                    }`}
                  >
                    Password Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('otp'); setLoginError(null); setTechOtpStep('phone'); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-white text-[#2E2E2E] shadow-xs'
                        : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
                    }`}
                  >
                    Phone OTP Sign In
                  </button>
                </div>

                {loginError && (
                  <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Sub-form 1: Password Login */}
                {loginMethod === 'password' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                        Registered Mobile or Email *
                      </label>
                      <input
                        type="text"
                        value={loginPhoneOrEmail}
                        onChange={(e) => setLoginPhoneOrEmail(e.target.value)}
                        placeholder="e.g. 9848012345 or tech@nivaro.in"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter Password"
                          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A4A4A] hover:text-[#2E2E2E] cursor-pointer"
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4 text-[#2E2E2E]" /> : <Eye className="w-4 h-4 text-[#2E2E2E]" />}
                        </button>
                      </div>

                      {/* Forgot Password Link */}
                      <div className="flex justify-end mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotModal(true);
                            setForgotEmailOrPhone(loginPhoneOrEmail);
                            setForgotError(null);
                            setResetSentMessage(null);
                          }}
                          className="text-xs font-bold text-[#2E2E2E] hover:underline transition-colors underline-offset-2 cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 text-[#E27D60]" />
                      <span>{isLoggingIn ? 'Signing In...' : 'Sign In as Technician'}</span>
                    </button>
                  </form>
                )}

                {/* Sub-form 2: Phone OTP Login */}
                {loginMethod === 'otp' && (
                  <div className="space-y-4">
                    {techOtpStep === 'phone' ? (
                      <form onSubmit={handleSendTechOtp} className="space-y-4" noValidate>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                            Registered 10-Digit Mobile Number *
                          </label>
                          <div className="flex rounded-xl border border-[#4A4A4A]/20 bg-[#FAF3E7] focus-within:bg-white focus-within:border-[#2D4F1E] focus-within:ring-1 focus-within:ring-[#5F7D6B] transition-colors overflow-hidden">
                            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F5E6CC] border-r border-[#4A4A4A]/20 text-xs font-bold text-[#2E2E2E] select-none shrink-0">
                              <Phone className="w-3.5 h-3.5 text-[#2D4F1E]" aria-hidden="true" />
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={techOtpPhone}
                              onChange={(e) => setTechOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="9848012345"
                              maxLength={10}
                              required
                              className="w-full px-3.5 py-2.5 bg-transparent text-sm font-bold text-[#2E2E2E] focus:outline-none"
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-[#4A4A4A]">
                            Only approved registered technicians can sign in via OTP. Real SMS verification requires an active SMS gateway.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoggingIn || techOtpPhone.replace(/\D/g, '').length !== 10}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4 text-[#E27D60]" />
                          <span>{isLoggingIn ? 'Sending OTP...' : 'Send Verification Code (OTP)'}</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyTechOtp} className="space-y-4" noValidate>
                        <div className="p-3 rounded-xl bg-[#FAF3E7] border border-[#4A4A4A]/20 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[#4A4A4A] block text-[10px] uppercase font-bold">Sent to:</span>
                            <span className="font-bold text-[#2E2E2E] text-sm">+91 {techOtpPhone.replace(/\D/g, '').slice(-10)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setTechOtpStep('phone'); setTechOtpCode(''); setLoginError(null); }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#2E2E2E] hover:underline cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Edit Number</span>
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                            6-Digit Verification Code *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={techOtpCode}
                            onChange={(e) => setTechOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="••••••"
                            maxLength={6}
                            required
                            className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 rounded-xl border-2 border-[#4A4A4A]/20 text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E]"
                          />
                        </div>

                        {/* Resend Cooldown */}
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#4A4A4A]">
                            {techOtpCooldown > 0 ? `Resend in ${techOtpCooldown}s` : "Didn't receive code?"}
                          </span>
                          <button
                            type="button"
                            onClick={handleSendTechOtp}
                            disabled={techOtpCooldown > 0 || isLoggingIn}
                            className="font-bold text-[#2E2E2E] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                          >
                            Resend Code
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoggingIn || techOtpCode.trim().length !== 6}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>{isLoggingIn ? 'Verifying...' : 'Verify Code & Sign In'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Safe Quick Demo Technician Login (Local Developer Sandbox Only) */}
                {isDemoModeAllowed() && (
                  <div className="pt-2">
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-[#4A4A4A]/20" />
                      <span className="flex-shrink mx-3 text-xs font-semibold text-[#4A4A4A]">developer demo mode</span>
                      <div className="flex-grow border-t border-[#4A4A4A]/20" />
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickDemoSession}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FAF3E7] hover:bg-[#faeed0] text-[#2E2E2E] border border-[#E59838] font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer min-h-[46px]"
                    >
                      <Sparkles className="w-4 h-4 text-[#E27D60]" />
                      <span>Quick Demo Technician Login</span>
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: REGISTRATION FORM */}
            {authTab === 'register' && (
              <div className="space-y-4">
                {regErrors.general && (
                  <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{regErrors.general}</span>
                  </div>
                )}

                {regStep === 'details' ? (
                  <form onSubmit={handleInitiateRegister} className="space-y-4" noValidate>
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={regData.fullName}
                        onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                      />
                      {regErrors.fullName && <p className="mt-1 text-xs text-rose-600 font-semibold">{regErrors.fullName}</p>}
                    </div>

                    {/* Mobile & Email (Optional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                          10-Digit Mobile *
                        </label>
                        <input
                          type="tel"
                          value={regData.phoneNumber}
                          onChange={(e) => setRegData({ ...regData, phoneNumber: e.target.value })}
                          placeholder="e.g. 9491242781"
                          maxLength={10}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        />
                        {regErrors.phoneNumber && <p className="mt-1 text-xs text-rose-600 font-semibold">{regErrors.phoneNumber}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                          Email (optional)
                        </label>
                        <input
                          type="email"
                          value={regData.email}
                          onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                          placeholder="ramesh@gmail.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        />
                        {regErrors.email && <p className="mt-1 text-xs text-rose-600 font-semibold">{regErrors.email}</p>}
                      </div>
                    </div>

                    {/* Specialization & Locality */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                          Specialization *
                        </label>
                        <select
                          value={regData.serviceCategory}
                          onChange={(e) => setRegData({ ...regData, serviceCategory: e.target.value as ServiceCategory })}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-xs sm:text-sm font-bold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        >
                          <option value="Electrical Repairs">Electrical Repairs</option>
                          <option value="Plumbing Repairs">Plumbing Repairs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                          Chirala Locality *
                        </label>
                        <select
                          value={regData.neighborhood}
                          onChange={(e) => setRegData({ ...regData, neighborhood: e.target.value as ChiralaNeighborhood })}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-xs sm:text-sm font-bold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        >
                          {NEIGHBORHOODS.map((nh) => (
                            <option key={nh} value={nh}>{nh}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                        Password (Min 6 Characters) *
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create a secure password"
                          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A4A4A] hover:text-[#2E2E2E] cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4 text-[#2E2E2E]" /> : <Eye className="w-4 h-4 text-[#2E2E2E]" />}
                        </button>
                      </div>
                      {regErrors.password && <p className="mt-1 text-xs text-rose-600 font-semibold">{regErrors.password}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#E27D60] hover:bg-[#D26B4E] text-white text-[#2E2E2E] font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4 text-[#2E2E2E]" />
                      <span>{isRegistering ? 'Sending OTP...' : 'Send Verification OTP & Register'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyRegisterOtp} className="space-y-4" noValidate>
                    <div className="p-3 rounded-xl bg-[#FAF3E7] border border-[#4A4A4A]/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#4A4A4A] block text-[10px] uppercase font-bold">Verification code sent to:</span>
                        <span className="font-bold text-[#2E2E2E] text-sm">+91 {regData.phoneNumber.replace(/\D/g, '').slice(-10)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setRegStep('details'); setRegOtpCode(''); setRegErrors({}); }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#2E2E2E] hover:underline cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                    </div>

                    {regErrors.otp && (
                      <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{regErrors.otp}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                        6-Digit Verification Code *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={regOtpCode}
                        onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        maxLength={6}
                        required
                        className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 rounded-xl border-2 border-[#4A4A4A]/20 text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E]"
                      />
                    </div>

                    {/* Resend Cooldown */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[#4A4A4A]">
                        {regOtpCooldown > 0 ? `Resend in ${regOtpCooldown}s` : "Didn't receive code?"}
                      </span>
                      <button
                        type="button"
                        onClick={handleInitiateRegister}
                        disabled={regOtpCooldown > 0 || isRegistering}
                        className="font-bold text-[#2E2E2E] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Resend Code
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering || regOtpCode.trim().length !== 6}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{isRegistering ? 'Verifying & Registering...' : 'Verify Code & Complete Application'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Back to Home Link */}
            <div className="pt-2 text-center border-t border-[#4A4A4A]/20">
              <button
                type="button"
                onClick={handleNavigateHome}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E2E2E] hover:underline transition-colors cursor-pointer py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Customer Homepage</span>
              </button>
            </div>

          </div>

          <p className="text-center text-[11px] text-[#4A4A4A] font-medium mt-4">
            Nivaro &bull; Home Services, Made Simple &bull; Chirala, AP
          </p>

        </div>

        {/* Password Reset Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 max-w-md w-full p-6 sm:p-8 space-y-5 shadow-lg animate-in fade-in zoom-in-95">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF3E7] p-1 border border-[#4A4A4A]/20 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#2E2E2E]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2E2E2E]">
                      Reset Technician Password
                    </h3>
                    <p className="text-xs text-[#4A4A4A] font-medium">
                      Verified Technician Password Reset
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 rounded-lg text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7] transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {resetSentMessage ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p>{resetSentMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setResetSentMessage(null);
                    }}
                    className="w-full py-3 rounded-xl bg-[#4A4A4A] text-white font-bold text-xs shadow-xs cursor-pointer hover:bg-[#381a14]"
                  >
                    Return to Technician Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                  <p className="text-xs text-[#4A4A4A] leading-relaxed font-medium">
                    Enter your registered email address or 10-digit mobile number. A verified password reset link will be dispatched securely.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                      Registered Email or 10-Digit Mobile *
                    </label>
                    <input
                      type="text"
                      value={forgotEmailOrPhone}
                      onChange={(e) => setForgotEmailOrPhone(e.target.value)}
                      placeholder="e.g. tech@nivaro.in or 9491242781"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-white border border-[#4A4A4A]/20 hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="px-5 py-2.5 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Mail className="w-3.5 h-3.5 text-white" />
                      <span>{isSendingReset ? 'Dispatching...' : 'Send Reset Link'}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PENDING APPROVAL GATE (For Unapproved or Rejected Technicians)
  // =========================================================================
  if (currentTech.status !== 'Approved') {
    const isRejected = currentTech.status === 'Rejected';

    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 font-sans overflow-x-hidden">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#4A4A4A]/20 shadow-sm p-8 sm:p-10 space-y-6 text-center">
          
          <div className="w-16 h-16 rounded-xl bg-[#FAF3E7] p-1.5 border border-[#4A4A4A]/20 shadow-xs flex items-center justify-center mx-auto">
            {isRejected ? (
              <XCircle className="w-8 h-8 text-rose-600" />
            ) : (
              <Clock3 className="w-8 h-8 text-[#E27D60] animate-pulse" />
            )}
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border mb-3 ${
              isRejected 
                ? 'bg-rose-50 text-rose-900 border-rose-300' 
                : 'bg-[#FAF3E7] text-[#2E2E2E] border-[#E59838]'
            }`}>
              {isRejected ? <XCircle className="w-3.5 h-3.5 text-rose-600" /> : <Clock3 className="w-3.5 h-3.5 text-[#E27D60]" />}
              <span>{currentTech.status}</span>
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-[#2E2E2E]">
              {isRejected ? 'Application Not Approved' : 'Account Pending Admin Approval'}
            </h2>

            <p className="text-xs sm:text-sm text-[#4A4A4A] mt-2 leading-relaxed">
              {isRejected ? (
                <>Your application was reviewed and could not be approved at this time. Reason: {currentTech.rejectedReason || 'Verification check required.'}</>
              ) : (
                <>Your technician account is pending admin approval by Nivaro operations. Once approved by the admin, you will receive jobs in your dashboard.</>
              )}
            </p>
          </div>

          {/* Registered Details Summary */}
          <div className="bg-[#FAF3E7] p-4 rounded-xl border border-[#4A4A4A]/20 text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Technician Name:</span>
              <strong className="text-[#2E2E2E]">{currentTech.fullName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Registered Category:</span>
              <strong className="text-[#2E2E2E]">{currentTech.serviceCategory}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Chirala Locality:</span>
              <strong className="text-[#2E2E2E]">{currentTech.neighborhood}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A4A4A]">Technician ID:</span>
              <strong className="text-[#2E2E2E]">{currentTech.displayId || currentTech.id}</strong>
            </div>
          </div>

          {/* Nivaro Operations Contact */}
          <div className="p-3.5 rounded-xl bg-[#F5E6CC] border border-[#4A4A4A]/20 text-xs text-[#2E2E2E]">
            <span>Need prompt assistance? Contact Nivaro Operations directly at </span>
            <a href="tel:+919491242781" className="font-bold text-[#2E2E2E] hover:underline">
              +91 94912 42781
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const refreshed = technicianService.getCurrentTechnician();
                setCurrentTech(refreshed ? { ...refreshed } : null);
                setNotification('Status refreshed.');
                setTimeout(() => setNotification(null), 2000);
              }}
              className="flex-1 py-3 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[46px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Check Approval Status</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="py-3 px-5 rounded-xl bg-white border border-[#4A4A4A]/20 hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[46px]"
            >
              <LogOut className="w-3.5 h-3.5 text-[#2E2E2E]" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: APPROVED TECHNICIAN WORKSPACE DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex flex-col font-sans overflow-x-hidden">
      
      {/* Top Header */}
      <header className="bg-[#4A4A4A] text-white border-b-2 border-[#2D4F1E] py-4 px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Technician Greeting */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Official Nivaro Wordmark on Dark Backing */}
            <div className="h-11 px-3.5 py-1.5 rounded-xl bg-black border border-white/20 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/brand/nivaro-logo.png"
                alt="Nivaro"
                className="h-7 w-auto object-contain"
                width={1024}
                height={342}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Hello, {currentTech.fullName}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#FAF3E7] text-[#2E2E2E] px-2.5 py-0.5 rounded-full border border-[#E59838]/40">
                  {currentTech.serviceCategory}
                </span>
              </div>
              <p className="text-xs text-[#E5E0D6] mt-0.5 font-medium">
                {currentTech.neighborhood}, Chirala &bull; ID: {currentTech.displayId || currentTech.id}
              </p>
            </div>
          </div>

          {/* Right Header Controls: On Duty / Checked Out control & Logout */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
            
            {/* On Duty / Checked Out Control (Persists to Supabase technicians.availability) */}
            <button
              type="button"
              onClick={handleToggleDuty}
              disabled={isUpdatingDuty}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[40px] ${
                currentTech.availability === 'Available'
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 hover:bg-emerald-900'
                  : 'bg-stone-800 text-stone-300 border-stone-600 hover:bg-stone-700'
              }`}
              title="Click to toggle On Duty / Checked Out status"
            >
              {isUpdatingDuty ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ${
                  currentTech.availability === 'Available' ? 'bg-emerald-400 animate-pulse' : 'bg-stone-400'
                }`} />
              )}
              <span>{currentTech.availability === 'Available' ? 'On Duty' : 'Checked Out'}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer border border-white/20 min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            {/* Public Website */}
            <button
              type="button"
              onClick={handleNavigateHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E27D60] hover:bg-[#D26B4E] text-white text-[#2E2E2E] text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2E2E2E]" />
              <span>Website</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Notification Toast */}
        {notification && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2.5 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Database Query Error Banner */}
        {bookingsQueryError && (
          <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Database Error Loading Assigned Jobs</p>
                <p className="text-xs text-rose-800 font-normal mt-0.5">{bookingsQueryError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadBookings}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Retry Query</span>
            </button>
          </div>
        )}

        {/* 4 Top Statistic Cards (Calculated from Actual Records) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: In Progress */}
          <div 
            onClick={() => setActiveJobFilter('in_progress')}
            className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-[#E59838] ${
              activeJobFilter === 'in_progress' ? 'border-[#E59838] ring-1 ring-[#E27D60]' : 'border-[#4A4A4A]/20'
            }`}
          >
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
              In Progress
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E2E2E]">
                {inProgressJobs.length}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAF3E7] flex items-center justify-center text-[#E27D60]">
                <Play className="w-4 h-4 fill-[#E59838]" />
              </div>
            </div>
            <span className="text-[11px] text-[#4A4A4A] mt-1.5 block font-medium">
              Active repairs on-site
            </span>
          </div>

          {/* Card 2: Upcoming Jobs */}
          <div 
            onClick={() => setActiveJobFilter('upcoming')}
            className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-[#2D4F1E] ${
              activeJobFilter === 'upcoming' ? 'border-[#2D4F1E] ring-1 ring-[#5F7D6B]' : 'border-[#4A4A4A]/20'
            }`}
          >
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
              Upcoming Jobs
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E2E2E]">
                {upcomingJobs.length}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F5E6CC] flex items-center justify-center text-[#2D4F1E]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] text-[#4A4A4A] mt-1.5 block font-medium">
              Assigned &amp; accepted
            </span>
          </div>

          {/* Card 3: Completed Today */}
          <div 
            onClick={() => setActiveJobFilter('completed')}
            className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-[#2D4F1E] ${
              activeJobFilter === 'completed' ? 'border-[#2D4F1E] ring-1 ring-[#5F7D6B]' : 'border-[#4A4A4A]/20'
            }`}
          >
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
              Completed Today
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E2E2E]">
                {completedTodayJobs.length}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
            </div>
            <span className="text-[11px] text-[#4A4A4A] mt-1.5 block font-medium">
              Finished &amp; billed today
            </span>
          </div>

          {/* Card 4: Awaiting Parts / Review */}
          <div 
            className="bg-white p-4 sm:p-5 rounded-2xl border border-[#4A4A4A]/20 shadow-xs"
          >
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
              Awaiting Parts / Review
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#2E2E2E]">
                {awaitingPartsJobs.length}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FAF3E7] flex items-center justify-center text-[#4A4A4A]">
                <AlertCircle className="w-4 h-4 text-[#4A4A4A]" />
              </div>
            </div>
            <span className="text-[11px] text-[#4A4A4A] mt-1.5 block font-medium">
              Parts required or review
            </span>
          </div>

        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap rounded-xl bg-white p-1 border border-[#4A4A4A]/20 shadow-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveJobFilter('all')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeJobFilter === 'all'
                ? 'bg-[#4A4A4A] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
            }`}
          >
            <span>All Jobs</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeJobFilter === 'all' ? 'bg-[#E27D60] text-[#2E2E2E]' : 'bg-[#F5E6CC] text-[#2E2E2E]'
            }`}>
              {techBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveJobFilter('in_progress')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeJobFilter === 'in_progress'
                ? 'bg-[#4A4A4A] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
            }`}
          >
            <span>In Progress</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeJobFilter === 'in_progress' ? 'bg-[#E27D60] text-[#2E2E2E]' : 'bg-[#F5E6CC] text-[#2E2E2E]'
            }`}>
              {inProgressJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveJobFilter('upcoming')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeJobFilter === 'upcoming'
                ? 'bg-[#4A4A4A] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
            }`}
          >
            <span>Upcoming Jobs</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeJobFilter === 'upcoming' ? 'bg-[#E27D60] text-[#2E2E2E]' : 'bg-[#F5E6CC] text-[#2E2E2E]'
            }`}>
              {upcomingJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveJobFilter('completed')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeJobFilter === 'completed'
                ? 'bg-[#4A4A4A] text-white shadow-xs'
                : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
            }`}
          >
            <span>Completed</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeJobFilter === 'completed' ? 'bg-[#E27D60] text-[#2E2E2E]' : 'bg-[#F5E6CC] text-[#2E2E2E]'
            }`}>
              {techBookings.filter((b) => b.status === 'Completed').length}
            </span>
          </button>
        </div>

        {/* Job List Cards */}
        <div className="space-y-4">
          {isLoadingBookings ? (
            <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2D4F1E] mx-auto" />
              <p className="text-xs font-bold text-[#4A4A4A]">Loading assigned jobs from database...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#4A4A4A]/20 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#FAF3E7] text-[#2E2E2E] flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6 text-[#2D4F1E]" />
              </div>
              <h3 className="text-base font-bold text-[#2E2E2E]">No jobs in this category</h3>
              <p className="text-xs text-[#4A4A4A] max-w-sm mx-auto">
                {activeJobFilter === 'all'
                  ? `When Nivaro dispatch operations assign an ${currentTech.serviceCategory.toLowerCase()} request in Chirala to you, it will appear here.`
                  : `There are currently 0 jobs filtered under "${activeJobFilter}". Select "All Jobs" to view your full history.`}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isUpdatingThisJob = updatingJobId === job.id;

              return (
                <div 
                  key={job.id} 
                  className="bg-white rounded-2xl border border-[#4A4A4A]/20 p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#2D4F1E] transition-all"
                >
                  {/* Card Header: Job ID, Status Badge & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#4A4A4A]/20">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-[#2E2E2E] bg-[#FAF3E7] border border-[#4A4A4A]/20 px-2.5 py-1 rounded-lg">
                        {job.id}
                      </span>

                      {/* Status Badges */}
                      {job.status === 'New' && (
                        <span className="text-xs font-bold uppercase bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>New</span>
                        </span>
                      )}
                      {job.status === 'Assigned' && (
                        <span className="text-xs font-bold uppercase bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-700" />
                          <span>Assigned</span>
                        </span>
                      )}
                      {job.status === 'Accepted' && (
                        <span className="text-xs font-bold uppercase bg-[#FAF3E7] text-[#2E2E2E] border border-[#E59838] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#E27D60]" />
                          <span>Accepted</span>
                        </span>
                      )}
                      {job.status === 'In Progress' && (
                        <span className="text-xs font-bold uppercase bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-purple-700 fill-purple-700" />
                          <span>In Progress</span>
                        </span>
                      )}
                      {job.status === 'Completed' && (
                        <span className="text-xs font-bold uppercase bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: View Details & Update Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetails(job)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-[#4A4A4A]/20 hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs transition-colors cursor-pointer min-h-[38px]"
                      >
                        View Details
                      </button>

                      {/* Status Action: New -> In Progress directly or Accept / Unable */}
                      {job.status === 'New' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => handleUpdateJobStatus(job.id, 'In Progress')}
                            className="px-3.5 py-2 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px] disabled:opacity-50"
                          >
                            {isUpdatingThisJob ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white" />}
                            <span>Start Work (Arrived)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => handleUpdateJobStatus(job.id, 'Accepted')}
                            className="px-3 py-2 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px] disabled:opacity-50"
                          >
                            {isUpdatingThisJob ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            <span>Accept Job</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => setRejectingBookingId(job.id)}
                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px]"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Unable to Attend</span>
                          </button>
                        </>
                      )}

                      {/* Status Action: Assigned -> In Progress directly or Accept / Unable */}
                      {job.status === 'Assigned' && (
                        <>
                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => handleUpdateJobStatus(job.id, 'In Progress')}
                            className="px-3.5 py-2 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px] disabled:opacity-50"
                          >
                            {isUpdatingThisJob ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white" />}
                            <span>Start Work (Arrived)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => handleUpdateJobStatus(job.id, 'Accepted')}
                            className="px-3 py-2 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px] disabled:opacity-50"
                          >
                            {isUpdatingThisJob ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            <span>Accept Job</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingThisJob}
                            onClick={() => setRejectingBookingId(job.id)}
                            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px]"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Unable to Attend</span>
                          </button>
                        </>
                      )}

                      {/* Status Action: Accepted -> In Progress */}
                      {job.status === 'Accepted' && (
                        <button
                          type="button"
                          disabled={isUpdatingThisJob}
                          onClick={() => handleUpdateJobStatus(job.id, 'In Progress')}
                          className="px-3.5 py-2 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px] disabled:opacity-50"
                        >
                          {isUpdatingThisJob ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white" />}
                          <span>Start Work (Arrived)</span>
                        </button>
                      )}

                      {/* Status Action: In Progress -> Complete Job */}
                      {job.status === 'In Progress' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingJob(job);
                              setCompletionBillInput(job.finalBillAmount ? String(job.finalBillAmount) : '350');
                            }}
                            className="px-4 py-2 rounded-xl bg-[#E27D60] hover:bg-[#D26B4E] text-white text-[#2E2E2E] font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all min-h-[38px]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#2E2E2E]" />
                            <span>Mark Completed</span>
                          </button>
                        </div>
                      )}

                      {/* Completed Badge Indicator */}
                      {job.status === 'Completed' && (
                        <span className="text-xs font-bold text-[#2E2E2E] bg-[#FAF3E7] border border-[#4A4A4A]/20 px-3 py-1.5 rounded-lg">
                          Billed: ₹{job.finalBillAmount || 0}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer, Service Title, Locality & Schedule Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[#4A4A4A] font-bold block mb-1 uppercase tracking-wider text-[11px]">
                        Service &amp; Customer
                      </span>
                      <h4 className="text-sm font-bold text-[#2E2E2E] block mb-0.5">
                        {getJobServiceTitle(job)}
                      </h4>
                      <span className="text-xs font-semibold text-[#2D4F1E] block mb-0.5">
                        {job.serviceCategory}
                      </span>
                      <span className="text-xs font-semibold text-[#4A4A4A] block">
                        Customer: {job.fullName}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <a
                          href={`tel:${job.phoneNumber}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F5E6CC] hover:bg-[#dce6e1] text-[#2E2E2E] font-bold text-xs border border-[#4A4A4A]/20 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#2D4F1E]" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/91${job.phoneNumber.replace(/\D/g, '').slice(-10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors border border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-[#4A4A4A] font-bold block mb-1 uppercase tracking-wider text-[11px]">
                        Chirala Address &amp; Locality
                      </span>
                      <span className="text-sm font-bold text-[#2E2E2E] flex items-center gap-1 mb-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2D4F1E]" />
                        {job.neighborhood}
                      </span>
                      <span className="text-[#4A4A4A] block font-medium">
                        {job.address}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#4A4A4A] font-bold block mb-1 uppercase tracking-wider text-[11px]">
                        Scheduled Timing
                      </span>
                      <span className="text-sm font-bold text-[#2E2E2E] flex items-center gap-1 mb-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#2D4F1E]" />
                        {job.preferredDate}
                      </span>
                      <span className="text-[#4A4A4A] block flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#4A4A4A]" />
                        {job.timeSlot}
                      </span>
                    </div>
                  </div>

                  {/* Reported Issue Scope */}
                  <div className="bg-[#FAF3E7] p-3 rounded-xl border border-[#4A4A4A]/20 text-xs">
                    <span className="font-bold text-[#2E2E2E] block mb-0.5">Reported Issue:</span>
                    <p className="text-[#4A4A4A] font-medium leading-relaxed">{job.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedJobDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-lg animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-[#4A4A4A]/20 pb-3">
              <div>
                <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block">Job Details</span>
                <h3 className="text-lg font-bold text-[#2E2E2E] mt-0.5">
                  {selectedJobDetails.id} &bull; {selectedJobDetails.serviceCategory}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobDetails(null)}
                className="p-1.5 rounded-lg text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#FAF3E7] p-4 rounded-xl border border-[#4A4A4A]/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Current Status:</span>
                  <strong className="text-[#2E2E2E] uppercase">{selectedJobDetails.status}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Customer Name:</span>
                  <strong className="text-[#2E2E2E]">{selectedJobDetails.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Phone Number:</span>
                  <strong className="text-[#2E2E2E]">+91 {selectedJobDetails.phoneNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Locality:</span>
                  <strong className="text-[#2E2E2E]">{selectedJobDetails.neighborhood}, Chirala</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Full Address:</span>
                  <span className="text-[#2E2E2E] text-right font-medium max-w-[65%]">{selectedJobDetails.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Scheduled:</span>
                  <strong className="text-[#2E2E2E]">{selectedJobDetails.preferredDate} ({selectedJobDetails.timeSlot})</strong>
                </div>
                {selectedJobDetails.finalBillAmount && (
                  <div className="flex justify-between pt-1 border-t border-[#4A4A4A]/20">
                    <span className="text-[#4A4A4A] font-bold">Final Billed Amount:</span>
                    <strong className="text-[#2D4F1E] text-sm font-bold">₹{selectedJobDetails.finalBillAmount}</strong>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-[#2E2E2E] block mb-1">Issue Description:</span>
                <p className="p-3 bg-[#F5E6CC] rounded-xl text-[#4A4A4A] font-medium leading-relaxed">
                  {selectedJobDetails.description}
                </p>
              </div>

              {/* Communication Links */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`tel:${selectedJobDetails.phoneNumber}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5E6CC] hover:bg-[#dce6e1] text-[#2E2E2E] font-bold border border-[#4A4A4A]/20 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#2D4F1E]" />
                  <span>Call Customer</span>
                </a>
                <a
                  href={`https://wa.me/91${selectedJobDetails.phoneNumber.replace(/\D/g, '').slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#4A4A4A]/20">
              <button
                type="button"
                onClick={() => setSelectedJobDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#4A4A4A] hover:bg-[#3D3D3D] text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMPLETE JOB MODAL (WITH FINAL BILL AMOUNT) */}
      {completingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 max-w-md w-full p-6 sm:p-8 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2E2E2E]">
                  Complete Job {completingJob.id}
                </h3>
                <p className="text-xs text-[#4A4A4A]">
                  Enter the final bill collected from {completingJob.fullName}.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteWithBill} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                  Final Bill Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#4A4A4A]">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={completionBillInput}
                    onChange={(e) => setCompletionBillInput(e.target.value)}
                    placeholder="e.g. 350"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-sm font-bold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E]"
                  />
                </div>
                <p className="text-[11px] text-[#4A4A4A] mt-1 font-medium">
                  Standard Chirala service benchmark: ₹250 – ₹600 depending on repair parts.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#4A4A4A]/20">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingJob(null);
                    setCompletionBillInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#4A4A4A]/20 hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingJobId === completingJob.id}
                  className="px-5 py-2.5 rounded-xl bg-[#2D4F1E] hover:bg-[#244018] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingJobId === completingJob.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Confirm &amp; Complete Job</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* UNABLE TO ATTEND MODAL */}
      {rejectingBookingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 max-w-md w-full p-6 sm:p-8 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2E2E2E]">
                  Unable to Attend Job {rejectingBookingId}
                </h3>
                <p className="text-xs text-[#4A4A4A]">
                  Select a reason so dispatch operations can reassign this customer.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                Reason *
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#4A4A4A]/20 text-xs sm:text-sm font-medium text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#2D4F1E]"
              >
                <option value="Scheduling conflict">Scheduling conflict / Prior booking</option>
                <option value="Customer unreachable">Customer unreachable / Phone switched off</option>
                <option value="Outside accessible area">Outside accessible area in Chirala</option>
                <option value="Specialized parts needed">Specialized parts or tools required</option>
                <option value="Health emergency">Health / Personal emergency</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#4A4A4A]/20">
              <button
                type="button"
                onClick={() => setRejectingBookingId(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#4A4A4A]/20 hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnableToAttend}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
              >
                Confirm &amp; Release Job
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TechnicianPortal;