import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  LogOut, 
  ShieldAlert, 
  PlusCircle, 
  Send,
  HelpCircle,
  Clock3,
  CalendarCheck,
  Receipt,
  CreditCard,
  XCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2
} from 'lucide-react';
import { 
  BookingRecord, 
  CustomerProfile, 
  SupportTicket, 
  SupportTicketIssueType,
  CustomerInvoice,
  PaymentRecord
} from '../types';
import { bookingService } from '../services/bookingService';
import { customerService } from '../services/customerService';
import { getCustomerTickets, supportService } from '../services/supportService';
import { technicianService } from '../services/technicianService';
import { paymentService } from '../services/paymentService';
import { authService } from '../services/authService';

interface CustomerDashboardProps {
  onBackToHome?: () => void;
  onOpenBooking?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onBackToHome,
  onOpenBooking,
}) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    return customerService.getCurrentCustomer();
  });

  const [activeTab, setActiveTab] = useState<'bookings' | 'payments' | 'invoices' | 'support'>('bookings');
  const [customerBookings, setCustomerBookings] = useState<BookingRecord[]>([]);
  const [customerTickets, setCustomerTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [ticketLoadError, setTicketLoadError] = useState<string | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [customerPayments, setCustomerPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Rating modal/inline state per booking: bookingId -> { rating, note }
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [ratingNotes, setRatingNotes] = useState<Record<string, string>>({});
  const [submittingRatingId, setSubmittingRatingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Problem reporting form state
  const [ticketBookingId, setTicketBookingId] = useState<string>('');
  const [ticketIssueType, setTicketIssueType] = useState<SupportTicketIssueType>('Work Quality');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);

  // Recovery Flow State (Supabase Auth)
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isCustPath = window.location.pathname.includes('/customer') || window.location.hash.includes('#customer');
      if (isCustPath) {
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

  // Subscribe to customer recovery parameters on mount
  useEffect(() => {
    const unsubRecovery = authService.onPasswordRecovery((active) => {
      const isCustPath = window.location.pathname.includes('/customer') || window.location.hash.includes('#customer');
      if (active && isCustPath) {
        setIsRecoveryMode(true);
      }
    });

    const verifyRecoveryUrl = async () => {
      const isCustPath = window.location.pathname.includes('/customer') || window.location.hash.includes('#customer');
      if (isCustPath) {
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

  // Subscribe to customer session updates
  useEffect(() => {
    const unsubCustomer = customerService.subscribe((current) => {
      setCustomer(current ? { ...current } : null);
    });
    return () => unsubCustomer();
  }, []);

  // Reload customer bookings, tickets, invoices, and payments with strict authorization
  useEffect(() => {
    if (!customer) {
      setCustomerBookings([]);
      setCustomerTickets([]);
      setCustomerInvoices([]);
      setCustomerPayments([]);
      return;
    }

    const loadData = () => {
      try {
        const bList = bookingService.getBookingsForCustomer(customer.id, customer.id);
        setCustomerBookings(bList);
        bookingService.fetchBookingsForCustomer(customer.id, customer.id).catch((err) => {
          console.warn('Customer bookings remote sync note:', err);
        });
      } catch (err) {
        console.error('Failed loading authorized bookings:', err);
        setCustomerBookings([]);
      }

      try {
        const tList = supportService.getTicketsForCustomer(customer.id, customer.id);
        setCustomerTickets(tList);
      } catch (err) {
        console.error('Failed loading authorized tickets:', err);
        setCustomerTickets([]);
      }

      try {
        const invList = bookingService.getInvoicesForCustomer(customer.id, customer.id);
        setCustomerInvoices(invList);
      } catch (err) {
        console.error('Failed loading authorized invoices:', err);
        setCustomerInvoices([]);
      }

      setIsLoadingPayments(true);
      setPaymentError(null);
      try {
        const pList = paymentService.getPaymentsForCustomer(customer.id, customer.id);
        setCustomerPayments(pList);
      } catch (err: any) {
        console.error('Failed loading authorized payments:', err);
        setPaymentError(err.message || 'Failed to load authorized payments.');
        setCustomerPayments([]);
      } finally {
        setIsLoadingPayments(false);
      }
    };

    loadData();

    const unsubBookings = bookingService.subscribe(() => loadData());
    const unsubSupport = supportService.subscribe(() => loadData());
    const unsubPayments = paymentService.subscribe(() => loadData());

    return () => {
      unsubBookings();
      unsubSupport();
      unsubPayments();
    };
  }, [customer?.id]);

  // Hydrate this customer's tickets from the server. The BFF scopes rows to the JWT.
  useEffect(() => {
    if (!customer) {
      setIsLoadingTickets(false);
      setTicketLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingTickets(true);
    setTicketLoadError(null);

    getCustomerTickets()
      .then((tickets) => {
        if (!cancelled) setCustomerTickets(tickets);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed loading customer support tickets:', err);
        setTicketLoadError('Could not load your support tickets. Please refresh.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTickets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?.id]);

  const handleLogout = () => {
    customerService.logout();
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleNavigateHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleBookService = () => {
    if (onOpenBooking) {
      onOpenBooking();
    } else {
      window.history.pushState({}, '', '/#booking');
      window.dispatchEvent(new PopStateEvent('popstate'));
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit Rating
  const handleRateJob = (bookingId: string, ratingValue: number) => {
    const note = ratingNotes[bookingId] || '';
    const updated = bookingService.updateBookingRating(bookingId, ratingValue, note);
    if (updated) {
      setNotification(`Thank you! Your ${ratingValue}-star rating has been recorded.`);
      setSubmittingRatingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Cancel Service Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!customer?.id) return;
    if (!window.confirm('Are you sure you want to cancel this service booking?')) return;
    setCancellingBookingId(bookingId);
    try {
      await bookingService.cancelBooking(bookingId, customer.id);
      setNotification('Your service booking request has been cancelled.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel booking.';
      alert(msg);
    } finally {
      setCancellingBookingId(null);
    }
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);

    if (!customer) return;

    if (!ticketBookingId.trim()) {
      setTicketError('Please select or specify the relevant Booking Reference ID.');
      return;
    }

    if (!ticketDescription.trim() || ticketDescription.trim().length < 10) {
      setTicketError('Please provide a description of the issue (at least 10 characters).');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const newTicket = await supportService.createTicket(
        customer.id,
        ticketBookingId.trim(),
        ticketIssueType,
        ticketDescription.trim()
      );

      setNotification(`Support ticket #${newTicket.id} submitted successfully.`);
      setTicketDescription('');
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setTicketError(err.message || 'Failed to submit support ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleOpenReportForBooking = (bookingId: string) => {
    setTicketBookingId(bookingId);
    setActiveTab('support');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  /**
   * Secure Customer Password Update via Supabase Auth updateUser
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
      await authService.updateCustomerPassword(cleanNew);
      setRecoverySuccess(
        'Your password has been updated successfully! You can now sign in with your new credentials.'
      );
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsRecoveryMode(false);
        setRecoverySuccess(null);
        setNotification('Password updated successfully. Please sign in with your new credentials.');
        setTimeout(() => setNotification(null), 5000);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update customer password.';
      setRecoveryError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // =========================================================================
  // VIEW: RECOVERY SCREEN (When Customer opens email reset link)
  // =========================================================================
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-[#FAF3E7] text-[#2E2E2E] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E0CEAF] shadow-sm p-6 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-xl bg-[#FAF3E7] p-1.5 border border-[#E0CEAF] shadow-sm flex items-center justify-center mx-auto">
              <KeyRound className="w-8 h-8 text-[#2E2E2E]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2E2E2E] tracking-tight">Nivaro</h1>
              <h2 className="text-2xl font-bold text-[#2E2E2E] mt-1">Reset Customer Password</h2>
              <p className="text-xs font-medium text-[#4A4A4A] mt-0.5">
                Set a new secure password for your Chirala customer account.
              </p>
            </div>
          </div>

          {recoveryError && (
            <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <span>{recoveryError}</span>
                {recoveryError.toLowerCase().includes('expired') && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(false);
                        setRecoveryError(null);
                        window.history.pushState({}, '', '/login');
                        window.dispatchEvent(new PopStateEvent('popstate'));
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

          {recoverySuccess && (
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
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full py-3 rounded-lg bg-[#2E2E2E] hover:bg-[#4A342A] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                Sign In to Your Account
              </button>
            </div>
          )}

          {!recoverySuccess && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2E2E2E] mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E0CEAF] bg-white text-[#2E2E2E] placeholder-[#4A4A4A]/60 focus:outline-none focus:ring-2 focus:ring-[#E27D60] pr-10"
                    disabled={isUpdatingPassword}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] hover:text-[#2E2E2E]"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2E2E2E] mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E0CEAF] bg-white text-[#2E2E2E] placeholder-[#4A4A4A]/60 focus:outline-none focus:ring-2 focus:ring-[#E27D60] pr-10"
                    disabled={isUpdatingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] hover:text-[#2E2E2E]"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#4A4A4A] space-y-1 pt-1">
                <p>• Password must be at least 6 characters long.</p>
                <p>• Both passwords must match.</p>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] disabled:opacity-50 text-[#2E2E2E] font-bold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#E0CEAF] text-center">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="text-xs text-[#2E2E2E] hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, prompt to log in or return home
  if (!customer) {
    return (
      <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] flex flex-col justify-center items-center px-4 py-12 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#4A4A4A]/20 shadow-md p-8 text-center space-y-5">
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
            <h2 className="text-xl font-bold text-[#2E2E2E]">
              Customer Account Session
            </h2>
            <p className="text-xs text-[#4A4A4A] font-semibold uppercase tracking-wider mt-1">
              Please sign in to view your bookings
            </p>
          </div>

          <p className="text-xs text-[#4A4A4A] leading-relaxed">
            You are currently signed out. Please return to the homepage and click &quot;Sign In&quot; to view your bookings and report problems.
          </p>

          <button
            type="button"
            onClick={handleNavigateHome}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5E6CC] text-[#2E2E2E] font-sans flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-[#4A4A4A]/15 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="p-2 rounded-lg text-[#2E2E2E] hover:bg-[#FAF3E7] border border-[#4A4A4A]/20 transition-colors cursor-pointer"
              title="Return to homepage"
            >
              <ArrowLeft className="w-5 h-5 text-[#2E2E2E]" />
            </button>

            <div className="flex items-center gap-3">
              {/* Official Nivaro Wordmark on Dark Backing */}
              <div className="h-10 px-3.5 py-1.5 rounded-xl bg-black border border-[#4A4A4A]/25 flex items-center justify-center shadow-xs shrink-0">
                <img
                  src="/brand/nivaro-logo.png"
                  alt="Nivaro"
                  className="h-6 w-auto object-contain"
                  width={1024}
                  height={342}
                />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-[#2E2E2E] leading-tight">
                  My Account Dashboard
                </h1>
                <p className="text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider">
                  Chirala Ward Services &bull; Nivaro
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#2E2E2E]">
                {customer.fullName}
              </span>
              <span className="text-[11px] font-medium text-[#4A4A4A]">
                +91 {customer.phoneNumber}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBookService}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-white" />
              <span>Book New Service</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#4A4A4A]/20 hover:bg-rose-50 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
              title="Log Out of Customer Account"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Notification Toast */}
        {notification && (
          <div role="status" className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Profile Card & Tab Switcher */}
        <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#2E2E2E]">
                Hello, {customer.fullName}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FAF3E7] text-[#2E2E2E] text-[10px] font-bold uppercase border border-[#4A4A4A]/20">
                {customer.displayId || customer.id}
              </span>
            </div>
            <p className="text-xs text-[#4A4A4A]">
              Registered Phone: <strong className="text-[#2E2E2E]">+91 {customer.phoneNumber}</strong>
              {customer.email && <> &bull; Email: <strong className="text-[#2E2E2E]">{customer.email}</strong></>}
            </p>
          </div>

          <div className="flex flex-wrap rounded-xl bg-[#FAF3E7] p-1 border border-[#4A4A4A]/15 w-full md:w-auto gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 md:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-[#4A4A4A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
              }`}
            >
              My Bookings ({customerBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`flex-1 md:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-[#4A4A4A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
              }`}
            >
              Payment History ({customerPayments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 md:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-[#4A4A4A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
              }`}
            >
              Invoices ({customerInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className={`flex-1 md:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-[#4A4A4A] text-white shadow-xs'
                  : 'text-[#4A4A4A] hover:text-[#2E2E2E]'
              }`}
            >
              Report a Problem ({customerTickets.length})
            </button>
          </div>
        </div>

        {/* TAB 1: MY BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2E2E2E] tracking-tight">
                Active &amp; Past Service Bookings
              </h2>
              <button
                type="button"
                onClick={handleBookService}
                className="text-xs font-bold text-[#E27D60] hover:text-[#D26B4E] hover:underline cursor-pointer"
              >
                + Book another service
              </button>
            </div>

            {customerBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#4A4A4A]/20 p-10 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-[#FAF3E7] p-2 border border-[#4A4A4A]/20 flex items-center justify-center mx-auto text-[#E27D60]">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2E2E2E]">
                    No bookings yet
                  </h3>
                  <p className="text-xs text-[#4A4A4A] mt-1 max-w-md mx-auto leading-relaxed">
                    Your service bookings will appear here once you book a service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBookService}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>Book a Service</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {customerBookings.map((b) => {
                  const resolvedTechPhone = b.assignedTechnicianPhone || 
                    (b.assignedTechnicianId 
                      ? technicianService.getAllTechnicians().find(t => t.id === b.assignedTechnicianId)?.phoneNumber 
                      : undefined) || '9491242781';

                  const isCompleted = b.status === 'Completed';

                  return (
                    <div 
                      key={b.id}
                      className="bg-white rounded-2xl border border-[#4A4A4A]/20 shadow-sm hover:border-[#E27D60] transition-all p-5 sm:p-6 space-y-4"
                    >
                      {/* Top Bar: Ref ID, Category & Live Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#4A4A4A]/15">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-[#FAF3E7] border border-[#4A4A4A]/15 text-[#2E2E2E] font-bold text-xs sm:text-sm">
                            {b.id}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-[#2E2E2E]">
                            {b.serviceCategory}
                          </span>
                        </div>

                        {/* Accessible Status Badge (icon + text + border) */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            b.status === 'Completed'
                              ? 'bg-[#2D4F1E]/10 text-[#2D4F1E] border-[#2D4F1E]/30'
                              : b.status === 'In Progress' || b.status === 'Accepted'
                              ? 'bg-[#E27D60]/10 text-[#E27D60] border-[#E27D60]/30'
                              : b.status === 'Assigned'
                              ? 'bg-[#4A4A4A]/10 text-[#2E2E2E] border-[#4A4A4A]/30'
                              : b.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-[#FAF3E7] text-[#4A4A4A] border-[#4A4A4A]/20'
                          }`}>
                            {b.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2D4F1E] shrink-0" />}
                            {(b.status === 'In Progress' || b.status === 'Accepted') && <Clock className="w-3.5 h-3.5 text-[#E27D60] shrink-0" />}
                            {b.status === 'Assigned' && <Calendar className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />}
                            {b.status === 'Cancelled' && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                            {b.status === 'New' && <AlertCircle className="w-3.5 h-3.5 text-[#4A4A4A] shrink-0" />}
                            <span>{b.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                            Locality &amp; Address
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-[#2E2E2E]">
                            <MapPin className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />
                            <span>{b.neighborhood}, Chirala</span>
                          </div>
                          <p className="text-[#4A4A4A] truncate">{b.address}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                            Scheduled Date &amp; Time
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-[#2E2E2E]">
                            <Calendar className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />
                            <span>{b.preferredDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#4A4A4A]">
                            <Clock className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />
                            <span>{b.timeSlot}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                            Issue Description
                          </span>
                          <p className="text-[#2E2E2E] font-medium line-clamp-2">
                            {b.description || 'No specific description provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Assigned Technician Banner (If Assigned) */}
                      {b.assignedTechnicianName && (
                        <div className="p-3.5 rounded-xl bg-[#FAF3E7] border border-[#E27D60]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] flex items-center justify-center text-[#2E2E2E] font-bold shrink-0">
                              <Wrench className="w-4 h-4 text-[#2E2E2E]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#2E2E2E] text-sm">
                                Assigned Technician: {b.assignedTechnicianName}
                              </p>
                              <p className="text-[#4A4A4A] font-medium">
                                Direct Contact: +91 {resolvedTechPhone}
                              </p>
                            </div>
                          </div>

                          <a
                            href={`tel:+91${resolvedTechPhone}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-[#2E2E2E] font-bold text-xs shadow-sm transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#2E2E2E]" />
                            <span>Call Technician</span>
                          </a>
                        </div>
                      )}

                      {/* Interactive Star Rating Widget (For Completed Jobs) */}
                      {isCompleted && (
                        <div className="p-4 rounded-xl bg-[#FAF3E7] border border-[#E0CEAF] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#2E2E2E]">
                              Rate Technician Service
                            </span>
                            <span className="text-xs font-bold text-[#2E2E2E]">
                              {b.serviceRating ? `${b.serviceRating} / 5 Stars` : 'Tap stars to rate'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const activeStars = hoverRating[b.id] !== undefined ? hoverRating[b.id] : (b.serviceRating || 0);
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onMouseEnter={() => setHoverRating(prev => ({ ...prev, [b.id]: star }))}
                                  onMouseLeave={() => setHoverRating(prev => {
                                    const copy = { ...prev };
                                    delete copy[b.id];
                                    return copy;
                                  })}
                                  onClick={() => {
                                    setSubmittingRatingId(b.id);
                                    handleRateJob(b.id, star);
                                  }}
                                  className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                                  aria-label={`Rate ${star} star`}
                                >
                                  <Star 
                                    className={`w-6 h-6 ${
                                      star <= activeStars 
                                        ? 'text-amber-500 fill-amber-500' 
                                        : 'text-slate-300'
                                    }`} 
                                  />
                                </button>
                              );
                            })}
                          </div>

                          {submittingRatingId === b.id && (
                            <div className="pt-2 flex gap-2">
                              <input
                                type="text"
                                placeholder="Optional feedback (e.g., prompt and neat work!)"
                                value={ratingNotes[b.id] || ''}
                                onChange={(e) => setRatingNotes({ ...ratingNotes, [b.id]: e.target.value })}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-[#E0CEAF] text-xs bg-white text-[#2E2E2E] focus:outline-none focus:border-[#E27D60]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRateJob(b.id, b.serviceRating || 5)}
                                className="px-3 py-1.5 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] font-bold text-xs text-[#2E2E2E] transition-colors cursor-pointer"
                              >
                                Save Review
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E0CEAF] text-xs">
                        <span className="text-[#4A4A4A]">
                          Created: {new Date(b.createdAt).toLocaleDateString()}
                          {b.finalBillAmount ? ` • Final Bill: ₹${b.finalBillAmount}` : ''}
                        </span>

                        <div className="flex items-center gap-3">
                          {(b.status === 'New' || b.status === 'Contacted') && (
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(b.id)}
                              disabled={cancellingBookingId === b.id}
                              className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 hover:underline font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{cancellingBookingId === b.id ? 'Cancelling...' : 'Cancel Request'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenReportForBooking(b.id)}
                            className="inline-flex items-center gap-1.5 text-[#2E2E2E] hover:underline font-bold transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-[#2E2E2E]" />
                            <span>Report an Issue</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REPORT A PROBLEM / SUPPORT FORM & TICKETS */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Column */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E0CEAF] p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF3E7] p-1.5 border border-[#E27D60]/40 flex items-center justify-center text-[#2E2E2E]">
                    <ShieldAlert className="w-4 h-4 text-[#2E2E2E]" />
                  </div>
                  <h2 className="text-base font-bold text-[#2E2E2E]">
                    Submit Support Ticket
                  </h2>
                </div>
                <p className="text-xs text-[#4A4A4A]">
                  Report any service quality, billing, or technician issues directly to Chirala operations.
                </p>
              </div>

              {ticketError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{ticketError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTicket} className="space-y-3.5" noValidate>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                    Related Booking Reference *
                  </label>
                  {customerBookings.length > 0 ? (
                    <select
                      value={ticketBookingId}
                      onChange={(e) => setTicketBookingId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E0CEAF] text-xs sm:text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60]"
                      required
                    >
                      <option value="">-- Select Your Booking --</option>
                      {customerBookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.id} &bull; {b.serviceCategory} ({b.preferredDate})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. LH-2026-4821"
                      value={ticketBookingId}
                      onChange={(e) => setTicketBookingId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E0CEAF] text-xs sm:text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                    Issue Category *
                  </label>
                  <select
                    value={ticketIssueType}
                    onChange={(e) => setTicketIssueType(e.target.value as SupportTicketIssueType)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E0CEAF] text-xs sm:text-sm font-semibold text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60]"
                  >
                    <option value="Work Quality">Work Quality / Repair Defect</option>
                    <option value="Delayed Arrival">Delayed Arrival / No Show</option>
                    <option value="Billing Dispute">Billing Dispute / Overcharging</option>
                    <option value="Technician Behavior">Technician Behavior</option>
                    <option value="Incomplete Work">Incomplete Work</option>
                    <option value="Other">Other Inquiry / Assistance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2E2E2E] mb-1">
                    Problem Details *
                  </label>
                  <textarea
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Please explain what went wrong and how we can resolve it for you..."
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E0CEAF] text-xs sm:text-sm font-medium text-[#2E2E2E] bg-[#FAF3E7] focus:bg-white focus:outline-none focus:border-[#E27D60]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-[#2E2E2E] font-bold text-sm shadow-sm transition-colors cursor-pointer min-h-[44px]"
                >
                  <Send className="w-4 h-4 text-[#2E2E2E]" />
                  <span>{isSubmittingTicket ? 'Submitting...' : 'Submit Support Ticket'}</span>
                </button>
              </form>

              <div className="p-3 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] text-[11px] text-[#2E2E2E] space-y-1">
                <p className="font-bold">Need Immediate Help?</p>
                <p className="text-[#4A4A4A]">
                  Call Nivaro Chirala Helpline directly at{' '}
                  <a href="tel:+919491242781" className="font-bold underline text-[#2E2E2E]">
                    +91 94912 42781
                  </a>.
                </p>
              </div>
            </div>

            {/* Tickets List Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#2E2E2E]">
                  My Support Tickets &amp; Resolutions ({customerTickets.length})
                </h3>
              </div>

              {ticketLoadError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{ticketLoadError}</span>
                </div>
              )}

              {isLoadingTickets && (
                <div className="bg-white rounded-2xl border border-[#E0CEAF] p-8 text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-[#2E2E2E] mx-auto animate-spin" />
                  <h4 className="text-sm font-bold text-[#2E2E2E]">
                    Loading support tickets
                  </h4>
                </div>
              )}

              {!isLoadingTickets && !ticketLoadError && customerTickets.length === 0 && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-[#E0CEAF] p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-[#2E2E2E]">
                    No active support tickets
                  </h4>
                  <p className="text-xs text-[#4A4A4A] max-w-sm mx-auto">
                    Any reported problems or complaints regarding your bookings will appear here with live admin resolution updates.
                  </p>
                </div>
              )}

              {!isLoadingTickets && customerTickets.length > 0 && (
                <div className="space-y-3">
                  {customerTickets.map((t) => (
                    <div 
                      key={t.id}
                      className="bg-white rounded-2xl border border-[#E0CEAF] p-5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] text-[#2E2E2E] text-xs font-bold">
                            {t.id}
                          </span>
                          <span className="text-xs font-semibold text-[#2E2E2E]">
                            Ref: {t.bookingId}
                          </span>
                        </div>

                        {/* Accessible Status Indicator (icon + text + border) */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : t.status === 'In Review'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                        }`}>
                          {t.status === 'Resolved' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                          {t.status === 'In Review' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                          {t.status !== 'Resolved' && t.status !== 'In Review' && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                          <span>{t.status}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4A4A] block">
                          Category: {t.issueType}
                        </span>
                        <p className="text-xs text-[#2E2E2E] font-medium mt-0.5 leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      {t.resolutionNote && (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                          <span className="font-bold text-emerald-900 block mb-0.5">
                            Admin Resolution:
                          </span>
                          <p className="text-emerald-800">
                            {t.resolutionNote}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#E0CEAF] flex items-center justify-between text-[11px] text-[#4A4A4A]">
                        <span className="flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5 text-[#2E2E2E]" />
                          <span>Reported: {new Date(t.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-[#2E2E2E]">
                          <HelpCircle className="w-3.5 h-3.5 text-[#2E2E2E]" />
                          <span>Visible to Chirala Dispatch Admin</span>
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB: PAYMENT HISTORY (STRICT SERVER-AUTHORIZED LEDGER) */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#2E2E2E] tracking-tight">
                  Customer Payment History
                </h2>
                <p className="text-xs text-[#4A4A4A]">
                  Official receipts and authenticated transaction records for services completed in Chirala.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FAF3E7] border border-[#E27D60] text-[#2E2E2E] text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Identity: {customer.displayId || customer.id}</span>
                </span>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingPayments && (
              <div className="bg-white rounded-2xl border border-[#E0CEAF] p-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#E27D60] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#2E2E2E]">Retrieving verified payment history...</p>
                <p className="text-xs text-[#4A4A4A]">Enforcing server-side authorization check (requesterUid === targetCustomerId)</p>
              </div>
            )}

            {/* Error State */}
            {paymentError && (
              <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{paymentError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customer) {
                      setIsLoadingPayments(true);
                      setPaymentError(null);
                      try {
                        const pList = paymentService.getPaymentsForCustomer(customer.id, customer.id);
                        setCustomerPayments(pList);
                      } catch (err: any) {
                        setPaymentError(err.message || 'Failed to load authorized payments.');
                      } finally {
                        setIsLoadingPayments(false);
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingPayments && !paymentError && customerPayments.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-[#E0CEAF] p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-xl bg-[#FAF3E7] p-2 border border-[#E27D60]/40 flex items-center justify-center mx-auto text-[#2E2E2E]">
                  <CreditCard className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2E2E2E]">
                    No payment records found
                  </h3>
                  <p className="text-xs text-[#4A4A4A] mt-1 max-w-md mx-auto">
                    Authentic payment records are generated only upon completed service and verified settlement. No fabricated transactions are displayed.
                  </p>
                </div>
              </div>
            )}

            {/* Authorized Payment Records List */}
            {!isLoadingPayments && !paymentError && customerPayments.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {customerPayments.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-[#E0CEAF] shadow-sm hover:border-[#E27D60] transition-all p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#E0CEAF]">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] text-[#2E2E2E] font-bold text-xs sm:text-sm">
                          {p.id}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-[#2E2E2E]">
                          Ref: {p.bookingId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Accessible Status Indicator (icon + text + border) */}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          p.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : p.status === 'Refunded'
                            ? 'bg-rose-50 text-rose-900 border-rose-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {p.status === 'Paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {p.status === 'Refunded' && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          {p.status !== 'Paid' && p.status !== 'Refunded' && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          <span>{p.status}</span>
                        </span>

                        {p.refundStatus && p.refundStatus !== 'None' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-purple-50 text-purple-900 border-purple-200">
                            Refund: {p.refundStatus} {p.refundAmount ? `(₹${p.refundAmount})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Payment Method
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-[#2E2E2E]">
                          <CreditCard className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />
                          <span>{p.paymentMethod}</span>
                        </div>
                        <p className="text-[#4A4A4A]">Created: {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Customer ID
                        </span>
                        <p className="font-bold text-[#2E2E2E] text-sm">{customer.displayId || p.customerId}</p>
                        {p.paidAt && (
                          <p className="text-[#4A4A4A]">Settled: {new Date(p.paidAt).toLocaleTimeString()}</p>
                        )}
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Paid Amount
                        </span>
                        <p className="text-2xl font-bold text-[#2E2E2E]">
                          ₹{p.amount}
                        </p>
                        <p className="text-[11px] text-[#4A4A4A] font-medium">Nivaro Authorized Service</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E0CEAF] text-xs">
                      <span className="text-[#4A4A4A]">
                        {p.notes || 'Verified Nivaro Chirala Transaction'}
                      </span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Server-Authorized Transaction Record</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#2E2E2E] tracking-tight">
                  Invoices &amp; Payment History
                </h2>
                <p className="text-xs text-[#4A4A4A]">
                  Verified invoices for completed home services in Chirala.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FAF3E7] border border-[#E0CEAF] text-[#2E2E2E] text-xs font-semibold">
                  Payment: Cash or UPI on Completion
                </span>
              </div>
            </div>

            {customerInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-[#E0CEAF] p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-xl bg-[#FAF3E7] p-2 border border-[#E27D60]/40 flex items-center justify-center mx-auto text-[#2E2E2E]">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2E2E2E]">
                    No billing invoices generated yet
                  </h3>
                  <p className="text-xs text-[#4A4A4A] mt-1 max-w-md mx-auto">
                    Invoices and digital receipts will appear here once an assigned electrician or plumber completes your service request and records the final bill.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {customerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl border border-[#E0CEAF] shadow-sm hover:border-[#E27D60] transition-all p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#E0CEAF]">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] text-[#2E2E2E] font-bold text-xs sm:text-sm">
                          {inv.id}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-[#2E2E2E]">
                          Ref: {inv.bookingId}
                        </span>
                      </div>

                      {/* Accessible Status Indicator (icon + text + border) */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300'
                      }`}>
                        {inv.status === 'Paid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span>{inv.status}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Service Performed
                        </span>
                        <p className="font-bold text-[#2E2E2E] text-sm">{inv.serviceCategory}</p>
                        <p className="text-[#4A4A4A]">{inv.neighborhood}, Chirala</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Payment Mode
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-[#2E2E2E]">
                          <CreditCard className="w-3.5 h-3.5 text-[#2E2E2E] shrink-0" />
                          <span>{inv.paymentMethod}</span>
                        </div>
                        <p className="text-[#4A4A4A]">Paid Date: {new Date(inv.paidAt).toLocaleDateString()}</p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <span className="text-[#4A4A4A] font-bold uppercase tracking-wider text-[10px] block">
                          Total Amount Due
                        </span>
                        <p className="text-2xl font-bold text-[#2E2E2E]">
                          ₹{inv.amount}
                        </p>
                        <p className="text-[11px] text-[#4A4A4A] font-medium">Includes inspection &amp; labour</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E0CEAF] text-xs">
                      <span className="text-[#4A4A4A]">
                        Customer ID: {customer.displayId || inv.customerId}
                      </span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Authorized Official Receipt &bull; Nivaro Chirala</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
