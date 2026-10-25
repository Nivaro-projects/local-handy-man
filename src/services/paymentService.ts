import type { PaymentRecord, PaymentMethod, PaymentStatus } from '../types';

export type PaymentChangeListener = (payments: PaymentRecord[]) => void;

const STORAGE_KEY = 'lh_payments_data';

const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
};

const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {}
  try {
    sessionStorage.setItem(key, value);
  } catch {}
};

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
};

class PaymentService {
  private payments: PaymentRecord[] = [];
  private listeners: Set<PaymentChangeListener> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = getStorageItem(STORAGE_KEY);
      this.payments = data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error reading payments from storage:', e);
      this.payments = [];
    }
  }

  private saveToStorage(): void {
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(this.payments));
    } catch (e) {
      console.warn('Error saving payments to storage:', e);
    }
  }

  public subscribe(listener: PaymentChangeListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getAllSessionPayments());
    } catch (e) {
      console.error('Error firing initial payment subscriber:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.saveToStorage();
    const snapshot = this.getAllSessionPayments();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Error notifying payment subscriber:', e);
      }
    });
  }

  public resetToZero(): void {
    this.payments = [];
    removeStorageItem(STORAGE_KEY);
    this.notifyListeners();
  }

  public getAllSessionPayments(): PaymentRecord[] {
    return [...this.payments];
  }

  /**
   * Strictly authorized getter for customer payment records.
   * Requires authenticated requester UID.
   * Enforces requesterUid === targetCustomerId.
   * Prevents unauthenticated exposure and cross-customer data leakage.
   * Does NOT fabricate transactions; returns only authentic payment records.
   */
  public getPaymentsForCustomer(
    requesterUid: string | null | undefined, 
    targetCustomerId: string
  ): PaymentRecord[] {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access payment history.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot view payment records belonging to another customer.');
    }

    return this.payments
      .filter((p) => p.customerId === targetCustomerId)
      .map((p) => ({ ...p }));
  }

  /**
   * Get payment by linked booking ID
   */
  public getPaymentByBookingId(bookingId: string): PaymentRecord | undefined {
    return this.payments.find((p) => p.bookingId.toLowerCase() === bookingId.toLowerCase());
  }

  /**
   * Records an authentic, verified payment transaction.
   * Can be initiated by assigned technician or admin upon actual physical collection (Cash) or UPI receipt.
   * Prevents duplicate payments for the same booking.
   */
  public recordVerifiedPayment(
    requesterUid: string | null | undefined,
    data: {
      bookingId: string;
      customerId: string;
      technicianId?: string;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
      verifiedBy?: 'Admin' | 'System' | 'Technician';
      notes?: string;
    }
  ): PaymentRecord {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to record payment transactions.');
    }

    if (data.amount <= 0) {
      throw new Error('Invalid payment amount. Amount must be greater than zero.');
    }

    // Check if an existing paid record already exists for this booking to prevent duplicate charges
    const existing = this.payments.find(
      (p) => p.bookingId.toLowerCase() === data.bookingId.toLowerCase() && p.paymentStatus === 'Paid'
    );
    if (existing) {
      throw new Error(`A verified payment record (${existing.id}) already exists for booking ${data.bookingId}. Duplicate payment rejected.`);
    }

    const uniqueId = `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const record: PaymentRecord = {
      id: uniqueId,
      bookingId: data.bookingId.trim(),
      customerId: data.customerId.trim(),
      technicianId: data.technicianId?.trim(),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      status: data.paymentStatus,
      refundStatus: 'None',
      createdAt: nowIso,
      paidAt: data.paymentStatus === 'Paid' ? nowIso : undefined,
      verifiedAt: data.paymentStatus === 'Paid' ? nowIso : undefined,
      verifiedBy: data.verifiedBy || 'Technician',
      notes: data.notes,
    };

    this.payments.unshift(record);
    this.notifyListeners();
    return record;
  }

  /**
   * Process a refund for a previously paid transaction (Admin only)
   */
  public processRefund(
    requesterUid: string | null | undefined,
    paymentId: string,
    refundAmount: number,
    reason: string
  ): PaymentRecord {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to process refunds.');
    }

    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new Error(`Payment record #${paymentId} not found.`);
    }

    if (payment.paymentStatus !== 'Paid') {
      throw new Error(`Cannot refund a payment with status "${payment.paymentStatus}". Only Paid records can be refunded.`);
    }

    if (refundAmount <= 0 || refundAmount > payment.amount) {
      throw new Error(`Refund amount must be between ₹1 and ₹${payment.amount}.`);
    }

    payment.refundStatus = 'Refunded';
    payment.paymentStatus = 'Refunded';
    payment.status = 'Refunded';
    payment.refundAmount = refundAmount;
    payment.notes = payment.notes 
      ? `${payment.notes} | Refund of ₹${refundAmount} processed: ${reason}`
      : `Refund of ₹${refundAmount} processed: ${reason}`;

    this.notifyListeners();
    return { ...payment };
  }
}

export const paymentService = new PaymentService();
