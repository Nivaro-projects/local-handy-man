import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  RefreshCw,
  IndianRupee,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldAlert,
  Users,
  UserCheck,
  X,
  Mail,
  KeyRound,
  Settings,
  DollarSign,
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  BookingRecord, 
  BookingStatus, 
  TechnicianRecord, 
  SupportTicket, 
  SupportTicketStatus,
  AdminProfile,
  CommissionConfig
} from '../types';
import { bookingService } from '../services/bookingService';
import { technicianService } from '../services/technicianService';
import { supportService } from '../services/supportService';
import { authService, isSupabaseConfigured } from '../services/authService';

export interface AdminDashboardProps {
  onBackToHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToHome }) => {
  // Authentication State via Supabase Auth
  // Starts denied. The console renders only after /api/me confirms an active
  // public.admin_users row; email addresses never grant access.
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);

  const [adminEmail, setAdminEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

  // Verified Email Password Reset Flow States (Supabase Auth)
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isLoadingForgot, setIsLoadingForgot] = useState<boolean>(false);

  // New Password Setting State (When arriving via Supabase Recovery link/code)
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const s = window.location.search;
      const h = window.location.hash;
      const p = window.location.pathname;
      return p.includes('reset-password') || s.includes('code=') || s.includes('type=recovery') || h.includes('type=recovery') || s.includes('error=') || h.includes('error=') || authService.isRecoveryMode();
    }
    return false;
  });
  const [recoveryRole, setRecoveryRole] = useState<'admin' | 'technician' | 'customer' | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Commission Settings Modal
  const [showCommissionModal, setShowCommissionModal] = useState<boolean>(false);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig>(() => bookingService.getCommissionConfig());
  const [tempCommType, setTempCommType] = useState<'percentage' | 'fixed'>(commissionConfig.type);
  const [tempCommRate, setTempCommRate] = useState<number>(commissionConfig.rate);

  // Admin View Tab: 'bookings' | 'technicians' | 'support' | 'financials'
  const [adminTab, setAdminTab] = useState<'bookings' | 'technicians' | 'support' | 'financials'>('bookings');

  // Bookings Data & Filter States
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Technicians Data State & Query Status
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([]);
  const [isLoadingTechs, setIsLoadingTechs] = useState<boolean>(false);
  const [techsQueryError, setTechsQueryError] = useState<string | null>(null);
  const [techFilterCategory, setTechFilterCategory] = useState<string>('All');
  const [techFilterStatus, setTechFilterStatus] = useState<string>('All');
  const [actionInProgressTechId, setActionInProgressTechId] = useState<string | null>(null);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('All');
  const [supportQueryError, setSupportQueryError] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  // Selected technician for assignment per booking: map of bookingId -> technicianId
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});

  // Listen to Supabase Auth state for real-time cryptographic authorization
  useEffect(() => {
    const unsubAuth = authService.subscribe(async (authUser) => {
      if (authUser) {
        if (authService.isRecoveryMode()) {
          return; // Do not auto-open operations console if user is currently in recovery flow
        }
        const isAdmin = await authService.isUserAdmin(authUser);
        if (isAdmin) {
          setAdminUser({
            uid: authUser.uid,
            email: authUser.email || 'admin@nivaro.in',
            displayName: authUser.displayName || 'Administrator',
            role: 'admin',
            tokenIssuedAt: new Date().toISOString(),
          });
        } else {
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
    });

    // Check for password recovery callback and URL parameters
    const unsubRecovery = authService.onPasswordRecovery((active) => {
      if (active) {
        setIsRecoveryMode(true);
      }
    });

    const verifyRecoveryUrl = async () => {
      const res = await authService.checkPasswordRecoveryUrl();
      if (res.isRecovery) {
        setIsRecoveryMode(true);
        if (res.error) {
          setRecoveryError(res.error);
        } else {
          const role = await authService.getRecoveryUserRole();
          setRecoveryRole(role);
        }
      }
    };
    verifyRecoveryUrl();

    return () => {
      unsubAuth();
      unsubRecovery();
    };
  }, []);

  // Subscribe to real-time updates from bookingService, technicianService & supportService
  useEffect(() => {
    const unsubBookings = bookingService.subscribe((updatedBookings) => {
      setBookings(updatedBookings);
    });

    const unsubTechs = technicianService.subscribe((updatedTechs) => {
      setTechnicians(updatedTechs);
      setIsLoadingTechs(technicianService.getIsLoading());
      setTechsQueryError(technicianService.getLoadError());
    });

    const unsubTickets = supportService.subscribe((updatedTickets) => {
      setTickets(updatedTickets);
    });

    // Query real technician records from Supabase on dashboard mount
    const loadInitialTechs = async () => {
      setIsLoadingTechs(true);
      setTechsQueryError(null);
      try {
        await technicianService.fetchFromSupabase();
      } catch (err: unknown) {
        setTechsQueryError((err as Error).message || 'Failed to load technician records from Supabase.');
      } finally {
        setIsLoadingTechs(false);
      }
    };
    loadInitialTechs();

    // Query real booking records from Supabase on dashboard mount
    const loadInitialBookings = async () => {
      try {
        await bookingService.fetchFromSupabase();
      } catch (err: unknown) {
        console.warn('Failed to load initial bookings from Supabase:', err);
      }
    };
    loadInitialBookings();

    return () => {
      unsubBookings();
      unsubTechs();
      unsubTickets();
    };
  }, []);

  // The support list is privileged, so fetch it only after /api/me has
  // confirmed an active admin (including restored sessions).
  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    setSupportQueryError(null);
    supportService.fetchAllTickets().catch((err: unknown) => {
      if (!cancelled) {
        setSupportQueryError((err as Error).message || 'Failed to load support tickets.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adminUser?.uid]);

  /**
   * Secure Admin Login using Supabase Authentication
   * Validates credentials against managed auth provider and verifies server-side admin claims
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoadingAuth(true);

    try {
      const profile = await authService.loginAdmin(adminEmail, password);
      setAdminUser(profile);
      setAdminEmail('');
      setPassword('');
      setNotification(`Welcome, ${profile.displayName}. Authorized Operations Console Unlocked.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Access denied.';
      setLoginError(msg);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  /**
   * Secure Password Reset via Supabase Authentication
   * Dispatches a verified email reset link directly from the managed provider
   */
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setIsLoadingForgot(true);

    try {
      await authService.sendAdminPasswordReset(forgotEmail);
      setForgotSuccess(
        `A secure password reset email has been dispatched to ${forgotEmail}. Please open the link in your inbox to reset your administrator credentials.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setForgotError(msg);
    } finally {
      setIsLoadingForgot(false);
    }
  };

  /**
   * Secure Admin Password Update via Supabase Auth updateUser
   * Validates matching passwords, length requirements, and updates password in Supabase.
   */
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
      if (recoveryRole === 'technician') {
        await authService.updateTechnicianPassword(cleanNew);
        setRecoverySuccess(
          'Your technician password has been updated successfully! Please log in with your new credentials.'
        );
      } else if (recoveryRole === 'customer') {
        await authService.updateCustomerPassword(cleanNew);
        setRecoverySuccess(
          'Your customer password has been updated successfully! Please log in with your new credentials.'
        );
      } else if (recoveryRole === 'admin') {
        await authService.updateAdminPassword(cleanNew);
        setRecoverySuccess(
          'Your administrator password has been updated successfully! Please log in with your new password.'
        );
      } else {
        const result = await authService.updateRecoveryPassword(cleanNew);
        setRecoveryRole(result.role);
        setRecoverySuccess(
          result.role === 'admin'
            ? 'Your administrator password has been updated successfully! Please log in with your new password.'
            : result.role === 'technician'
            ? 'Your technician password has been updated successfully! Please log in with your new credentials.'
            : 'Your customer password has been updated successfully! Please log in with your new credentials.'
        );
      }
      setNewPassword('');
      setConfirmPassword('');
      // After short timeout, return to login view
      setTimeout(() => {
        setIsRecoveryMode(false);
        setRecoverySuccess(null);
        if (recoveryRole === 'technician') {
          window.history.pushState({}, '', '/technician');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (recoveryRole === 'customer') {
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          setNotification('Password updated successfully. Please enter your new credentials.');
          setTimeout(() => setNotification(null), 5000);
        }
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update administrator password.';
      setRecoveryError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  /**
   * Secure Admin Logout
   */
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setAdminUser(null);
    setAdminEmail('');
    setPassword('');
    setLoginError(null);
  };

  const handleStatusChange = (id: string, newStatus: BookingStatus) => {
    const updated = bookingService.updateBookingStatus(
      id,
      newStatus,
      `Admin updated status to ${newStatus}`,
      adminUser?.uid
    );
    if (updated) {
      setNotification(`Booking Ref #${id} updated to "${newStatus}"`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAssignTechnician = (bookingId: string) => {
    const selectedTechId = assignSelections[bookingId];
    if (!selectedTechId) {
      alert('Please select an approved technician to assign.');
      return;
    }

    const tech = technicians.find((t) => t.id === selectedTechId);
    if (!tech) return;

    const updated = bookingService.assignTechnician(
      bookingId, 
      tech.id, 
      tech.fullName, 
      tech.phoneNumber,
      adminUser?.uid,
      tech.displayId
    );
    if (updated) {
      setNotification(`Job ${bookingId} assigned to technician ${tech.fullName} (${tech.id}).`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleApproveTechnician = async (techId: string) => {
    setActionInProgressTechId(techId);
    try {
      const updated = await technicianService.updateTechnicianStatus(techId, 'Approved');
      if (updated) {
        setNotification(`Technician ${updated.fullName} approved! Record updated in Supabase database.`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to approve technician application in Supabase.');
    } finally {
      setActionInProgressTechId(null);
    }
  };

  const handleRejectTechnician = async (techId: string) => {
    const reason = prompt('Enter rejection reason (optional):', 'Application details could not be verified.');
    if (reason !== null) {
      setActionInProgressTechId(techId);
      try {
        const updated = await technicianService.updateTechnicianStatus(techId, 'Rejected', reason.trim() || undefined);
        if (updated) {
          setNotification(`Technician ${updated.fullName} marked as Rejected in Supabase.`);
          setTimeout(() => setNotification(null), 4000);
        }
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to reject technician application in Supabase.');
      } finally {
        setActionInProgressTechId(null);
      }
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const note = prompt('Enter administrative resolution note:', 'Customer contacted; issue rectified by technician on-site.');
    if (note === null) return;

    try {
      await supportService.resolveTicket(ticketId, note.trim() || 'Resolved by Chirala operations.');
      setNotification(`Support ticket #${ticketId} marked as Resolved.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to resolve the support ticket.');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: SupportTicketStatus) => {
    try {
      await supportService.updateTicketStatus(ticketId, status);
      setNotification(`Support ticket #${ticketId} status changed to "${status}".`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update the support ticket status.');
    }
  };

  /**
   * Admin settles and marks commission as collected
   */
  const handleMarkCommissionCollected = (commissionId: string) => {
    try {
      bookingService.markCommissionCollected(adminUser?.uid || 'ADMIN', commissionId);
      setNotification(`Commission record #${commissionId} marked as Collected & Settled.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update commission settlement.');
    }
  };

  /**
   * Save updated commission settings
   */
  const handleSaveCommissionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempCommRate <= 0) {
      alert('Commission rate must be greater than zero.');
      return;
    }

    try {
      const updated = bookingService.updateCommissionConfig(adminUser?.uid || 'ADMIN', {
        type: tempCommType,
        rate: tempCommRate,
      });
      setCommissionConfig(updated);
      setShowCommissionModal(false);
      setNotification(`Commission policy updated: ${updated.type === 'percentage' ? `${updated.rate}%` : `Fixed ₹${updated.rate}`}.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update commission settings.');
    }
  };

  const handleManualRefresh = async () => {
    setBookings(bookingService.getAllSessionBookings());
    setCommissionConfig(bookingService.getCommissionConfig());
    setIsLoadingTechs(true);
    setTechsQueryError(null);
    setSupportQueryError(null);
    let supportLoadFailed = false;
    try {
      await supportService.fetchAllTickets();
    } catch (err: unknown) {
      supportLoadFailed = true;
      setSupportQueryError((err as Error).message || 'Failed to refresh support tickets.');
    }
    try {
      await technicianService.fetchFromSupabase();
    } catch (err: unknown) {
      setTechsQueryError((err as Error).message || 'Failed to refresh technicians from Supabase.');
    } finally {
      setIsLoadingTechs(false);
    }
    setNotification(
      supportLoadFailed
        ? 'Dashboard refreshed, but support tickets could not be loaded.'
        : 'Dashboard refreshed with latest data from Supabase.'
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleResetToZero = () => {
    bookingService.resetToZero();
    technicianService.resetToZero();
    supportService.resetToZero();
    setNotification('All bookings, ratings, technician lists, support tickets, and commission records reset to 0.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleNavigateToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Live KPI metrics from bookingService
  const stats = bookingService.getStats();
  const allCommissions = bookingService.getAllCommissions();

  // Filtered booking records
  const filteredBookings = bookings.filter((b) => {
    if (selectedNeighborhood !== 'All' && b.neighborhood !== selectedNeighborhood) return false;
    if (selectedStatus !== 'All' && b.status !== selectedStatus) return false;
    if (selectedCategory !== 'All' && b.serviceCategory !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchName = b.fullName.toLowerCase().includes(q);
      const matchPhone = b.phoneNumber.toLowerCase().includes(q);
      const matchAddress = b.address.toLowerCase().includes(q);
      const matchTech = (b.assignedTechnicianName || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPhone && !matchAddress && !matchTech) return false;
    }
    return true;
  });

  // Filtered technicians
  const totalTechsCount = technicians.length;
  const pendingTechs = technicians.filter((t) => t.status === 'Pending Approval');
  const approvedTechs = technicians.filter((t) => t.status === 'Approved');
  const rejectedTechs = technicians.filter((t) => t.status === 'Rejected');

  const filteredTechnicians = technicians.filter((t) => {
    if (techFilterCategory !== 'All' && t.serviceCategory !== techFilterCategory) return false;
    if (techFilterStatus !== 'All' && t.status !== techFilterStatus) return false;
    return true;
  });

  // Filtered support tickets
  const filteredTickets = tickets.filter((t) => {
    if (ticketFilterStatus !== 'All' && t.status !== ticketFilterStatus) return false;
    return true;
  });

  // Status badge styling helper
  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case 'New':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Contacted':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Assigned':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Accepted':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'In Progress':
        return 'bg-amber-200 text-amber-900 border-amber-400 animate-pulse';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // =========================================================================
  // VIEW 0: ADMIN PASSWORD RECOVERY / RESET SCREEN (SUPABASE AUTH)
  // =========================================================================
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0CEAF] shadow-sm p-6 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            {/* Official Nivaro Wordmark on Dark Backing */}
            <div className="h-14 px-5 py-2.5 rounded-2xl bg-black border border-[#4A4A4A]/30 shadow-sm flex items-center justify-center mx-auto w-fit">
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
                {recoveryRole === 'technician' 
                  ? 'Reset Technician Password' 
                  : recoveryRole === 'customer' 
                  ? 'Reset Customer Password' 
                  : 'Reset Admin Password'}
              </h2>
              <p className="text-xs font-medium text-[#4A4A4A] mt-0.5">
                {recoveryRole === 'technician'
                  ? 'Set a new secure password for your technician partner account'
                  : recoveryRole === 'customer'
                  ? 'Set a new secure password for your customer account'
                  : 'Set a new secure password for your administrator account'}
              </p>
            </div>
          </div>

          {recoveryError && (
            <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-2">
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
                      className="text-xs font-bold text-[#2E2E2E] underline hover:text-[#4A342A] cursor-pointer"
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
              <div role="status" className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoverySuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoverySuccess(null);
                  if (recoveryRole === 'technician') {
                    window.history.pushState({}, '', '/technician');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } else if (recoveryRole === 'customer') {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="w-full py-3 rounded-lg bg-[#2E2E2E] hover:bg-[#4A342A] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                {recoveryRole === 'technician' 
                  ? 'Proceed to Technician Sign In' 
                  : recoveryRole === 'customer' 
                  ? 'Proceed to Customer Sign In' 
                  : 'Proceed to Admin Sign In'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border border-[#E0CEAF] text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60] transition-colors"
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
                <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (recoveryError) setRecoveryError(null);
                    }}
                    placeholder="Re-enter your new password"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border border-[#E0CEAF] text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60] transition-colors"
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
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white shadow-sm font-bold text-sm shadow-sm transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#2E2E2E]" />
                    <span>Updating Password in Supabase...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-[#2E2E2E]" aria-hidden="true" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-[#E0CEAF]">
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
              <span>Back to Admin Sign In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ADMIN LOGIN SCREEN (MANAGED TRUSTED AUTHENTICATION)
  // =========================================================================
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0CEAF] shadow-sm p-6 sm:p-10 space-y-6">
          
          <div className="text-center space-y-2">
            {/* Official Nivaro Wordmark on Dark Backing */}
            <div className="h-14 px-5 py-2.5 rounded-2xl bg-black border border-[#4A4A4A]/30 shadow-sm flex items-center justify-center mx-auto w-fit">
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
                Admin Sign In
              </h2>
              <p className="text-xs font-medium text-[#4A4A4A] mt-0.5">
                Authorized Chirala Operations &amp; Dispatch Console
              </p>
            </div>
          </div>

          {notification && (
            <div 
              role="status" 
              className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{notification}</span>
            </div>
          )}

          {loginError && (
            <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              <span>{loginError}</span>
            </div>
          )}

          {!isSupabaseConfigured() && (
            <div role="alert" className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Administrator sign-in is temporarily unavailable. Please contact support.</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                Administrator Email *
              </label>
              <input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="admin@nivaro.in"
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg border border-[#E0CEAF] text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1.5">
                Password *
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Enter administrator password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-[#E0CEAF] text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#4A4A4A] hover:text-[#2E2E2E] rounded cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-[#2E2E2E]" aria-hidden="true" /> : <Eye className="w-4 h-4 text-[#2E2E2E]" />}
                </button>
              </div>
              
              {/* Forgot Password Link */}
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotEmail(adminEmail || '');
                    setForgotSuccess(null);
                    setForgotError(null);
                  }}
                  className="text-xs font-bold text-[#2E2E2E] hover:underline transition-colors underline-offset-2 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingAuth || !isSupabaseConfigured()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white shadow-sm font-bold text-sm shadow-sm transition-colors cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAuth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#2E2E2E]" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#2E2E2E]" aria-hidden="true" />
                  <span>Log In to Dispatch Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-[#E0CEAF]">
            <button
              type="button"
              onClick={handleNavigateToHome}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2E2E2E] hover:underline transition-colors cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Public Website</span>
            </button>
          </div>

        </div>

        {/* Verified Email Password Reset Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E0CEAF] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-lg animate-in fade-in zoom-in-95">
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FAF3E7] p-1 border border-[#E0CEAF] flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#2E2E2E]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#2E2E2E]">
                      Reset Admin Password
                    </h3>
                    <p className="text-xs text-[#4A4A4A] font-medium">
                      Verified Administrator Password Reset
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
                <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div role="status" className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{forgotSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 rounded-lg bg-[#2E2E2E] hover:bg-[#4A342A] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                  <p className="text-xs text-[#4A4A4A] leading-relaxed font-medium">
                    Enter your registered administrator email address. A secure password reset link will be dispatched directly to your inbox.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                      Registered Admin Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@nivaro.in"
                        required
                        className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[#E0CEAF] text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60]"
                      />
                      <Mail className="w-4 h-4 text-[#4A4A4A] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 rounded-lg bg-white border border-[#E0CEAF] hover:bg-[#FAF3E7] text-[#2E2E2E] font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingForgot}
                      className="px-5 py-2.5 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white shadow-sm font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingForgot ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
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
  // VIEW 2: AUTHENTICATED ADMIN DISPATCH DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-cream text-walnut-deep flex flex-col font-sans">
      {adminUser?.isDemo && (
        <div className="bg-amber-500 text-walnut-deep text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm">
          <Sparkles className="w-4 h-4 text-walnut-deep shrink-0" />
          <span>LOCAL DEV DEMO SANDBOX: Logged in with isolated test admin identity. Real Supabase production data is isolated.</span>
        </div>
      )}
      
      {/* Top Admin Header */}
      <header className="bg-walnut-deep text-white border-b-4 border-amber-glow py-4 px-4 sm:px-8 sticky top-0 z-30 shadow-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-[#E27D60] text-white px-2.5 py-0.5 rounded-full">
                  Admin Operations ({adminUser.email})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Chirala Ops &bull; Paparajuthota, Perala, Kothapeta &amp; Srinivas Colony
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                setTempCommType(commissionConfig.type);
                setTempCommRate(commissionConfig.rate);
                setShowCommissionModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-glow/20 hover:bg-amber-glow/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer border border-amber-glow/40"
              title="Configure Marketplace Commission Policy"
            >
              <Settings className="w-3.5 h-3.5 text-amber-glow" aria-hidden="true" />
              <span>Commission Settings ({commissionConfig.type === 'percentage' ? `${commissionConfig.rate}%` : `₹${commissionConfig.rate}`})</span>
            </button>

            <button
              type="button"
              onClick={handleResetToZero}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-900/60 text-white text-xs font-bold transition-colors cursor-pointer border border-white/20"
              title="Reset all session data back to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset All to 0</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-800/80 hover:bg-rose-800 text-white text-xs font-bold transition-colors cursor-pointer border border-rose-600"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Logout</span>
            </button>

            <button
              type="button"
              onClick={handleNavigateToHome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-glow hover:bg-amber-hover text-walnut-deep text-xs sm:text-sm font-extrabold shadow-subtle transition-all cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Public Site</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {notification && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* 6 Comprehensive Admin Financial & KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-sage-border shadow-subtle">
            <span className="text-xs font-bold text-walnut-medium uppercase tracking-wider block mb-1">Total Bookings</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-walnut-deep">{stats.total}</span>
              <TrendingUp className="w-4 h-4 text-sage" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-walnut-medium mt-1 block">Live Requests</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-subtle">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">New / Action</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-900">{stats.newCount}</span>
              <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-amber-800 mt-1 block">Awaiting Dispatch</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-subtle">
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">In Progress</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-900">{stats.inProgress}</span>
              <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-purple-800 mt-1 block">With Technicians</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-400 bg-amber-50/50 shadow-subtle">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1">Commission Due</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-800">₹{stats.commissionDue}</span>
              <DollarSign className="w-4 h-4 text-amber-600" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-amber-700 mt-1 font-semibold block">Uncollected &bull; Completed</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 shadow-subtle">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block mb-1">Commission Collected</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-900">₹{stats.commissionCollected}</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-emerald-800 mt-1 font-semibold block">Verified Settlements</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-subtle">
            <span className="text-xs font-bold text-sky-900 uppercase tracking-wider block mb-1">Tech Payouts</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-sky-900">₹{stats.totalTechnicianPayouts}</span>
              <Users className="w-4 h-4 text-sky-600" aria-hidden="true" />
            </div>
            <span className="text-[11px] text-sky-800 mt-1 font-semibold block">Craftsmen Earnings</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-2xl bg-white p-1.5 border border-sage-border shadow-subtle">
          <button
            type="button"
            onClick={() => setAdminTab('bookings')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              adminTab === 'bookings'
                ? 'bg-walnut-deep text-white shadow-subtle'
                : 'text-walnut-deep hover:bg-cream-light'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Service Bookings ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('technicians')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              adminTab === 'technicians'
                ? 'bg-walnut-deep text-white shadow-subtle'
                : 'text-walnut-deep hover:bg-cream-light'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Technicians ({totalTechsCount})</span>
            {pendingTechs.length > 0 && (
              <span className="bg-amber-400 text-walnut-deep text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {pendingTechs.length} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('support')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              adminTab === 'support'
                ? 'bg-walnut-deep text-white shadow-subtle'
                : 'text-walnut-deep hover:bg-cream-light'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Support Tickets ({tickets.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: SERVICE BOOKINGS & COMMISSION SETTLEMENT */}
        {/* =================================================================== */}
        {adminTab === 'bookings' && (
          <div className="space-y-4">
            
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-sage-border shadow-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-walnut-medium absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Ref #, customer name, phone, address, or technician..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-sage-border text-xs sm:text-sm font-semibold text-walnut-deep bg-cream-light focus:outline-none focus:border-amber-glow"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none"
                >
                  <option value="All">All Chirala Wards</option>
                  <option value="Paparajuthota">Paparajuthota</option>
                  <option value="Perala">Perala</option>
                  <option value="Kothapeta">Kothapeta</option>
                  <option value="Srinivas Colony">Srinivas Colony</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  <option value="Electrical Repairs">Electrical Repairs</option>
                  <option value="Plumbing Repairs">Plumbing Repairs</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Accepted">Accepted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Empty State */}
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-sage-border p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-cream p-2 border border-amber-glow flex items-center justify-center mx-auto text-amber-900">
                  <Calendar className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-walnut-deep">
                    No service requests found
                  </h3>
                  <p className="text-xs text-walnut-medium mt-1 max-w-md mx-auto">
                    New customer service bookings submitted from the homepage will appear here in real time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((b) => {
                  const matchingApprovedTechs = technicians.filter(
                    (t) => t.status === 'Approved' && t.serviceCategory === b.serviceCategory
                  );
                  const comm = allCommissions.find((c) => c.bookingId === b.id);
                  const isCompleted = b.status === 'Completed';

                  return (
                    <div 
                      key={b.id}
                      className="bg-white rounded-3xl border-2 border-sage-border/80 shadow-subtle hover:border-amber-glow transition-all p-5 sm:p-6 space-y-4"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sage-border/40">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-black text-walnut-deep bg-amber-cream border border-amber-glow/40 px-3 py-1 rounded-xl">
                            {b.id}
                          </span>
                          <span className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(b.status)}`}>
                            {b.status}
                          </span>
                          <span className="text-xs font-bold text-walnut-deep flex items-center gap-1.5 bg-sage-light px-2.5 py-0.5 rounded-full border border-sage-border">
                            <Wrench className="w-3.5 h-3.5 text-sage" aria-hidden="true" />
                            {b.serviceCategory}
                          </span>
                          {b.assignedTechnicianName && (
                            <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                              <span>Assigned: {b.assignedTechnicianName}</span>
                            </span>
                          )}
                        </div>

                        {/* Status Change Control */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-walnut-medium">Change Status:</span>
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                            className="px-3 py-1.5 rounded-xl border-2 border-walnut-deep text-xs font-extrabold text-walnut-deep bg-amber-cream focus:outline-none cursor-pointer"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Accepted">Accepted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-walnut-medium font-bold block mb-0.5 uppercase tracking-wider">Customer</span>
                          <span className="font-extrabold text-sm text-walnut-deep block">{b.fullName}</span>
                          <a
                            href={`tel:${b.phoneNumber}`}
                            className="text-sage hover:text-amber-hover font-bold inline-flex items-center gap-1.5 mt-0.5 underline-offset-2 hover:underline"
                          >
                            <Phone className="w-3.5 h-3.5 text-sage" />
                            <span>+91 {b.phoneNumber}</span>
                          </a>
                        </div>

                        <div>
                          <span className="text-walnut-medium font-bold block mb-0.5 uppercase tracking-wider">Chirala Locality</span>
                          <span className="font-extrabold text-sm text-walnut-deep flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-glow" />
                            {b.neighborhood}
                          </span>
                          <span className="text-walnut-medium block mt-0.5 font-medium line-clamp-1">{b.address}</span>
                        </div>

                        <div>
                          <span className="text-walnut-medium font-bold block mb-0.5 uppercase tracking-wider">Preferred Time</span>
                          <span className="font-extrabold text-sm text-walnut-deep flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-glow" />
                            {b.preferredDate}
                          </span>
                          <span className="text-walnut-medium block mt-0.5 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-sage" />
                            {b.timeSlot}
                          </span>
                        </div>

                        <div>
                          <span className="text-walnut-medium font-bold block mb-0.5 uppercase tracking-wider">Customer ID</span>
                          <span className="text-[11px] font-mono font-bold text-walnut-deep block truncate">
                            {b.customerDisplayId || b.customerId || 'Guest Booking'}
                          </span>
                          {b.serviceRating && b.serviceRating > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-amber-600 font-bold">
                              <span>Rating: {b.serviceRating} ★</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Problem Description */}
                      <div className="bg-cream-light p-3 rounded-xl text-xs border border-sage-border/60">
                        <span className="font-bold text-walnut-deep block mb-1">Problem Description:</span>
                        <p className="text-walnut-medium font-medium">{b.description}</p>
                        {b.unableToAttendReason && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-semibold">
                            ⚠️ Technician reported unable to attend: "{b.unableToAttendReason}"
                          </div>
                        )}
                      </div>

                      {/* Technician Assignment Section */}
                      <div className="bg-sage-light/60 p-3.5 rounded-xl border border-sage-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-sage shrink-0" />
                          <span className="font-bold text-walnut-deep">
                            {b.assignedTechnicianName 
                              ? `Currently Assigned To: ${b.assignedTechnicianName}`
                              : `Assign Approved ${b.serviceCategory} Technician:`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {matchingApprovedTechs.length === 0 ? (
                            <span className="text-rose-700 font-bold text-[11px] bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                              No approved {b.serviceCategory} technicians available.
                            </span>
                          ) : (
                            <>
                              <select
                                value={assignSelections[b.id] || b.assignedTechnicianId || ''}
                                onChange={(e) => setAssignSelections({ ...assignSelections, [b.id]: e.target.value })}
                                className="px-3 py-1.5 rounded-xl border-2 border-sage-border text-xs font-bold text-walnut-deep bg-white focus:outline-none focus:border-amber-glow"
                              >
                                <option value="">-- Choose Approved Technician --</option>
                                {matchingApprovedTechs.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.displayId ? `${t.displayId} - ` : ''}{t.fullName} ({t.neighborhood}) {t.availability === 'Offline' ? '[Offline]' : ''}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleAssignTechnician(b.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-glow hover:bg-amber-hover text-walnut-deep font-extrabold text-xs shadow-subtle cursor-pointer whitespace-nowrap"
                              >
                                {b.assignedTechnicianId ? 'Reassign' : 'Assign & Dispatch'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Completed Job & Commission Settlement Card */}
                      {isCompleted && (
                        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-walnut-deep text-sm">
                                Final Bill: ₹{b.finalBillAmount || 0}
                              </span>
                              {comm && (
                                <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase border ${
                                  comm.status === 'Commission Collected'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-amber-200 text-amber-900 border-amber-400'
                                }`}>
                                  {comm.status}
                                </span>
                              )}
                            </div>
                            {comm && (
                              <p className="text-walnut-medium">
                                Marketplace Fee ({comm.rateApplied}): <strong>₹{comm.marketplaceCommission}</strong> &bull; Technician Payout: <strong>₹{comm.technicianPayout}</strong>
                              </p>
                            )}
                          </div>

                          {comm && comm.status === 'Commission Due' && (
                            <button
                              type="button"
                              onClick={() => handleMarkCommissionCollected(comm.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-subtle transition-all cursor-pointer whitespace-nowrap"
                            >
                              ✓ Confirm Settlement &amp; Collect
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: TECHNICIANS MANAGEMENT */}
        {/* =================================================================== */}
        {adminTab === 'technicians' && (
          <div className="space-y-6">
            
            {/* Supabase Error Alert Banner */}
            {techsQueryError && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="font-bold">Failed to load technician records from Supabase: </strong>
                    <span>{techsQueryError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingTechs(true);
                    technicianService.fetchFromSupabase()
                      .then(() => setTechsQueryError(null))
                      .catch((err) => setTechsQueryError((err as Error).message))
                      .finally(() => setIsLoadingTechs(false));
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Supabase Query</span>
                </button>
              </div>
            )}

            {/* 4 Categorized Metric Cards for Real Technician Statuses */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-sage-border shadow-subtle">
                <span className="text-xs font-bold text-walnut-medium uppercase tracking-wider block mb-1">Total Registered</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-walnut-deep">{totalTechsCount}</span>
                  <Users className="w-4 h-4 text-walnut-medium" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-walnut-medium mt-1 block">Profiles in Supabase</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-subtle ${
                pendingTechs.length > 0 
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950' 
                  : 'bg-white border-sage-border'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider block mb-1 text-amber-800">Pending Approvals</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-900">{pendingTechs.length}</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-amber-700 mt-1 block font-semibold">
                  {pendingTechs.length > 0 ? 'Requires Admin Verification' : 'All applications reviewed'}
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-subtle">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block mb-1">Approved &amp; Active</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-900">{approvedTechs.length}</span>
                  <UserCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-emerald-700 mt-1 block">Eligible for Dispatch</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-subtle">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider block mb-1">Rejected</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-900">{rejectedTechs.length}</span>
                  <ShieldAlert className="w-4 h-4 text-rose-600" aria-hidden="true" />
                </div>
                <span className="text-[11px] text-rose-700 mt-1 block">Declined Applications</span>
              </div>
            </div>

            {/* Loading State when querying Supabase */}
            {isLoadingTechs && technicians.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-sage-border shadow-subtle text-center space-y-3">
                <Loader2 className="w-8 h-8 text-sage animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-walnut-deep">Querying Technician Records from Supabase...</h4>
                <p className="text-xs text-walnut-medium">Fetching real registered craftsmen profiles and verification records.</p>
              </div>
            ) : (
              <>
                {/* Dedicated Section: Pending Technician Approvals */}
                {pendingTechs.length > 0 && (
                  <div className="bg-amber-50/50 rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-subtle">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <h4 className="text-base font-extrabold text-amber-950">
                            Pending Technician Approvals ({pendingTechs.length})
                          </h4>
                        </div>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          New local craftsmen applications awaiting identity and trade verification in Chirala before dispatch access is granted.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-extrabold border border-amber-300">
                        Action Required
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingTechs.map((t) => {
                        const isActioning = actionInProgressTechId === t.id;
                        return (
                          <div key={t.id} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3 shadow-sm hover:border-amber-300 transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-walnut-deep text-sm block">{t.fullName}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF3E7] text-[#2E2E2E] border border-sage-border">
                                    {t.displayId || t.id}
                                  </span>
                                </div>
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-cream-light text-walnut-deep border border-sage-border mt-1">
                                  {t.serviceCategory}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                Pending
                              </span>
                            </div>

                            <div className="text-xs text-walnut-medium space-y-1 bg-cream-light/60 p-2.5 rounded-lg border border-sage-border/50">
                              <p className="flex items-center justify-between">
                                <span>Phone:</span>
                                <strong className="text-walnut-deep font-mono">+91 {t.phoneNumber}</strong>
                              </p>
                              {t.email && (
                                <p className="flex items-center justify-between">
                                  <span>Email:</span>
                                  <strong className="text-walnut-deep truncate max-w-[150px]">{t.email}</strong>
                                </p>
                              )}
                              <p className="flex items-center justify-between">
                                <span>Ward / Locality:</span>
                                <strong className="text-walnut-deep">{t.neighborhood}</strong>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>Applied:</span>
                                <span className="text-walnut-medium">
                                  {t.registeredAt ? new Date(t.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                                </span>
                              </p>
                            </div>

                            <div className="pt-2 border-t border-sage-border/40 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => handleApproveTechnician(t.id)}
                                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                              >
                                {isActioning ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Approve Partner</span>
                              </button>
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => handleRejectTechnician(t.id)}
                                className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                              >
                                {isActioning ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Technicians Directory */}
                <div className="bg-white p-5 rounded-2xl border border-sage-border shadow-subtle space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-walnut-deep">
                        Technician Directory &amp; Status
                      </h3>
                      <p className="text-xs text-walnut-medium">
                        All registered craftsmen profiles recorded in the Supabase database.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={techFilterCategory}
                        onChange={(e) => setTechFilterCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none min-h-[38px]"
                      >
                        <option value="All">All Categories</option>
                        <option value="Electrical Repairs">Electrical Repairs</option>
                        <option value="Plumbing Repairs">Plumbing Repairs</option>
                      </select>

                      <select
                        value={techFilterStatus}
                        onChange={(e) => setTechFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none min-h-[38px]"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {totalTechsCount === 0 ? (
                    <div className="p-10 text-center space-y-2 border-2 border-dashed border-sage-border rounded-xl bg-cream-light/30">
                      <Users className="w-8 h-8 text-walnut-medium/50 mx-auto" />
                      <h4 className="text-sm font-bold text-walnut-deep">0 Technicians Registered</h4>
                      <p className="text-xs text-walnut-medium max-w-md mx-auto">
                        No technician records are stored in Supabase yet. When local electricians and plumbers submit an application via the Technician Portal, their profile will appear here for review.
                      </p>
                    </div>
                  ) : filteredTechnicians.length === 0 ? (
                    <div className="p-8 text-center text-xs text-walnut-medium border-2 border-dashed border-sage-border rounded-xl">
                      No technicians match the selected filters.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTechnicians.map((t) => {
                        const isActioning = actionInProgressTechId === t.id;
                        return (
                          <div key={t.id} className="bg-white rounded-2xl border-2 border-sage-border p-5 space-y-3 shadow-subtle hover:border-walnut-deep/30 transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-black text-walnut-deep text-sm block">{t.fullName}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF3E7] text-[#2E2E2E] border border-sage-border">
                                    {t.displayId || t.id}
                                  </span>
                                </div>
                                <span className="text-xs text-sage font-bold">{t.serviceCategory}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                t.status === 'Approved' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                t.status === 'Pending Approval' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {t.status}
                              </span>
                            </div>

                            <div className="text-xs text-walnut-medium space-y-1">
                              <p>Phone: <strong>+91 {t.phoneNumber}</strong></p>
                              {t.email && <p>Email: <strong>{t.email}</strong></p>}
                              <p>Ward: <strong>{t.neighborhood}</strong></p>
                              <p>Availability: <strong>{t.availability}</strong></p>
                              {t.approvedAt && (
                                <p className="text-[11px] text-emerald-700">
                                  Approved on: {new Date(t.approvedAt).toLocaleDateString('en-IN')}
                                </p>
                              )}
                              {t.status === 'Rejected' && t.rejectedReason && (
                                <p className="text-[11px] text-rose-700">
                                  Reason: {t.rejectedReason}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-sage-border/40 flex items-center gap-2">
                              {t.status !== 'Approved' && (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleApproveTechnician(t.id)}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  <span>Approve</span>
                                </button>
                              )}
                              {t.status !== 'Rejected' && (
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleRejectTechnician(t.id)}
                                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  <span>Reject</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: SUPPORT TICKETS */}
        {/* =================================================================== */}
        {adminTab === 'support' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-sage-border shadow-subtle flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-walnut-deep">Support Tickets &amp; Disputes</h3>
                <p className="text-xs text-walnut-medium">Investigate customer problem reports submitted across Chirala wards.</p>
              </div>
              <select
                value={ticketFilterStatus}
                onChange={(e) => setTicketFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-sage-border text-xs font-bold text-walnut-deep bg-cream-light focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Review">In Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {supportQueryError && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-subtle">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                <div>
                  <strong className="font-bold">Failed to load support tickets: </strong>
                  <span>{supportQueryError}</span>
                </div>
              </div>
            )}

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-sage-border p-10 text-center text-xs text-walnut-medium">
                No support tickets found for the selected filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl border-2 border-sage-border p-5 space-y-3 shadow-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-walnut-deep">{t.id}</span>
                        <span className="text-xs font-bold text-sage">Ref: {t.bookingId}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        t.status === 'In Review' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="text-xs text-walnut-deep space-y-1">
                      <p><strong>Customer:</strong> {t.customerName} (+91 {t.customerPhone})</p>
                      <p><strong>Issue:</strong> {t.issueType}</p>
                      <p className="p-3 rounded-xl bg-cream-light border border-sage-border">{t.description}</p>
                    </div>

                    {t.resolutionNote && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                        <strong>Resolution Note:</strong> {t.resolutionNote}
                      </div>
                    )}

                    <div className="pt-2 border-t border-sage-border/40 flex items-center justify-end gap-2">
                      {t.status !== 'Resolved' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateTicketStatus(t.id, 'In Review')}
                            className="px-3 py-1.5 rounded-xl border border-sage-border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                          >
                            Set In Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveTicket(t.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-subtle cursor-pointer"
                          >
                            Resolve Ticket
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Commission Configuration Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-sage-border max-w-md w-full p-6 sm:p-8 space-y-5 shadow-hover animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-cream p-1 border border-amber-glow flex items-center justify-center">
                  <Settings className="w-5 h-5 text-amber-glow" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-walnut-deep">
                    Marketplace Commission Policy
                  </h3>
                  <p className="text-xs text-sage font-semibold">
                    Configure Dispatch Fees
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
                className="p-1.5 rounded-lg text-walnut-medium hover:text-walnut-deep hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionConfig} className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-walnut-deep block">
                  Fee Structure Type
                </span>
                <div className="flex gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="commType"
                      checked={tempCommType === 'percentage'}
                      onChange={() => setTempCommType('percentage')}
                    />
                    <span>Percentage of Customer Bill (%)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="commType"
                      checked={tempCommType === 'fixed'}
                      onChange={() => setTempCommType('fixed')}
                    />
                    <span>Fixed Flat Fee (₹)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-walnut-deep mb-1">
                  {tempCommType === 'percentage' ? 'Commission Percentage (%)' : 'Fixed Fee Amount (₹)'} *
                </label>
                <input
                  type="number"
                  min={1}
                  max={tempCommType === 'percentage' ? 50 : 2000}
                  value={tempCommRate}
                  onChange={(e) => setTempCommRate(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-sage-border text-sm font-bold text-walnut-deep bg-cream-light focus:outline-none focus:border-amber-glow"
                />
                <p className="text-[11px] text-walnut-medium mt-1">
                  {tempCommType === 'percentage'
                    ? `e.g. On a ₹500 job, marketplace receives ₹${Math.round(500 * (tempCommRate / 100))} and technician receives ₹${Math.round(500 * (1 - tempCommRate / 100))}.`
                    : `e.g. Fixed fee of ₹${tempCommRate} deducted per completed service.`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-sage-border/60">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-sage-border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-glow hover:bg-amber-hover text-walnut-deep font-extrabold text-xs shadow-subtle cursor-pointer"
                >
                  Save Policy Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
