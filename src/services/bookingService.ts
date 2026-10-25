import { 
  BookingFormData, 
  BookingRecord, 
  BookingStatus, 
  ChiralaNeighborhood, 
  CustomerInvoice,
  ServiceCategory, 
  TimeSlot,
  CommissionConfig,
  CommissionRecord,
  MarketplaceFinancialSummary,
  PaymentMethod
} from '../types';
import { paymentService } from './paymentService';
import { supabase, isSupabaseConfigured } from './supabase';

const isValidUuid = (id: unknown): boolean =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export type BookingChangeListener = (bookings: BookingRecord[]) => void;

export interface BookingStats {
  total: number;
  newCount: number;
  inProgress: number;
  completed: number;
  commissionCollected: number;
  commissionDue: number;
  estimatedCommission: number;
  totalCustomerBills: number;
  totalTechnicianPayouts: number;
  avgRating: string;
  ratingCount: number;
}

const STORAGE_KEY = 'lh_bookings_data';
const COMMISSIONS_KEY = 'lh_commissions_data';
const COMMISSION_CONFIG_KEY = 'lh_commission_config';

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

/**
 * Booking, Commission & Dispatch Service
 * 
 * - Persists within localStorage + sessionStorage so cross-route
 *   navigation and tab refreshes work smoothly.
 * - Starts at ZERO initially.
 * - Separates Customer Bills, Technician Payouts, and Marketplace Commission.
 * - Configurable commission rates (percentage or fixed).
 * - Distinguishes between Commission Due (uncollected) and Commission Collected.
 * - Prevents duplicate commission calculation.
 */
class BookingService {
  private bookings: BookingRecord[] = [];
  private commissions: CommissionRecord[] = [];
  private commissionConfig: CommissionConfig = {
    type: 'percentage',
    rate: 10, // Default: 10% marketplace fee
    updatedAt: new Date().toISOString(),
    updatedBy: 'Default Policy',
  };
  private listeners: Set<BookingChangeListener> = new Set();
  private simulateFailure: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const bData = getStorageItem(STORAGE_KEY);
      this.bookings = bData ? JSON.parse(bData) : [];

      const cData = getStorageItem(COMMISSIONS_KEY);
      this.commissions = cData ? JSON.parse(cData) : [];

      const cfgData = getStorageItem(COMMISSION_CONFIG_KEY);
      if (cfgData) {
        this.commissionConfig = JSON.parse(cfgData);
      }
    } catch (e) {
      console.warn('Error reading booking/commission data from storage:', e);
      this.bookings = [];
      this.commissions = [];
    }
  }

  private saveToStorage(): void {
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(this.bookings));
      setStorageItem(COMMISSIONS_KEY, JSON.stringify(this.commissions));
      setStorageItem(COMMISSION_CONFIG_KEY, JSON.stringify(this.commissionConfig));
    } catch (e) {
      console.warn('Error saving booking/commission data to storage:', e);
    }
  }

  /**
   * Subscribe to real-time changes in the booking store
   */
  public subscribe(listener: BookingChangeListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getAllSessionBookings());
    } catch (e) {
      console.error('Error firing initial booking subscriber:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.saveToStorage();
    const snapshot = this.getAllSessionBookings();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Error notifying booking subscriber:', e);
      }
    });
  }

  public setSimulateFailure(value: boolean) {
    this.simulateFailure = value;
  }

  public getSimulateFailure(): boolean {
    return this.simulateFailure;
  }

  /**
   * Reset store back to zero
   */
  public resetToZero(): void {
    this.bookings = [];
    this.commissions = [];
    this.commissionConfig = {
      type: 'percentage',
      rate: 10,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Default Policy',
    };
    removeStorageItem(STORAGE_KEY);
    removeStorageItem(COMMISSIONS_KEY);
    removeStorageItem(COMMISSION_CONFIG_KEY);
    paymentService.resetToZero();
    this.notifyListeners();
  }

  /**
   * Creates a new booking with validation, remote Supabase persistence, and simulated network latency
   */
  public async createBooking(
    data: BookingFormData, 
    customerId?: string,
    customerDisplayId?: string
  ): Promise<BookingRecord> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (this.simulateFailure) {
      throw new Error(
        'Simulated network error: Unable to reach dispatch service. Please check your connection or call us directly at +91 94912 42781.'
      );
    }

    const uniqueNum = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `LH-2026-${uniqueNum}`;
    const nowIso = new Date().toISOString();

    const targetCustomerId = customerId || data.customerId;
    const dbCustomerId = isValidUuid(targetCustomerId) ? targetCustomerId : null;

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('bookings')
        .insert({
          id: referenceId,
          customer_id: dbCustomerId,
          customer_display_id: customerDisplayId || null,
          full_name: data.fullName.trim(),
          phone: data.phoneNumber.trim(),
          service_category: data.serviceCategory as ServiceCategory,
          neighborhood: data.neighborhood as ChiralaNeighborhood,
          address: data.address.trim(),
          description: data.description.trim(),
          preferred_date: data.preferredDate.trim(),
          time_slot: data.timeSlot as TimeSlot,
          service_rating: data.serviceRating || 0,
          status: 'New',
          created_at: nowIso,
        });

      if (error) {
        throw new Error(error.message || 'Failed to save booking to database.');
      }
    }

    const record: BookingRecord = {
      id: referenceId,
      customerId: targetCustomerId || undefined,
      customerDisplayId: customerDisplayId || undefined,
      fullName: data.fullName.trim(),
      phoneNumber: data.phoneNumber.trim(),
      serviceCategory: data.serviceCategory as ServiceCategory,
      neighborhood: data.neighborhood as ChiralaNeighborhood,
      address: data.address.trim(),
      description: data.description.trim(),
      preferredDate: data.preferredDate.trim(),
      timeSlot: data.timeSlot as TimeSlot,
      serviceRating: data.serviceRating || 5,
      status: 'New',
      createdAt: nowIso,
      statusHistory: [
        {
          status: 'New',
          timestamp: nowIso,
          note: 'Request received and placed in local dispatch queue.',
        },
      ],
    };

    this.bookings.unshift(record);
    this.saveToStorage();
    this.notifyListeners();
    return record;
  }

  /**
   * Fetches real booking records from Supabase database for dispatch management.
   */
  public async fetchFromSupabase(): Promise<BookingRecord[]> {
    if (!isSupabaseConfigured()) {
      return [...this.bookings];
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const remoteList: BookingRecord[] = data.map((row: any) => ({
          id: row.id,
          customerId: row.customer_id || undefined,
          customerDisplayId: row.customer_display_id || undefined,
          fullName: row.full_name,
          phoneNumber: row.phone,
          serviceCategory: row.service_category as ServiceCategory,
          neighborhood: row.neighborhood as ChiralaNeighborhood,
          address: row.address,
          description: row.description,
          preferredDate: row.preferred_date,
          timeSlot: row.time_slot as TimeSlot,
          serviceRating: row.service_rating || 0,
          status: row.status as BookingStatus,
          assignedTechnicianId: row.assigned_technician_id || undefined,
          assignedTechnicianDisplayId: row.assigned_technician_display_id || undefined,
          finalBillAmount: row.final_bill_amount ? Number(row.final_bill_amount) : undefined,
          createdAt: row.created_at,
          statusHistory: [
            {
              status: row.status as BookingStatus,
              timestamp: row.created_at,
              note: `Current Status: ${row.status}`,
            },
          ],
        }));

        const map = new Map<string, BookingRecord>();
        this.bookings.forEach((b) => map.set(b.id, b));
        remoteList.forEach((b) => map.set(b.id, b));
        this.bookings = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.saveToStorage();
        this.notifyListeners();
      }

      return [...this.bookings];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query bookings from Supabase.';
      console.warn('BookingService fetchFromSupabase note:', msg);
      throw new Error(msg);
    }
  }

  /**
   * Fetches authentic customer bookings from Supabase with RLS verification,
   * falling back to local session store.
   */
  public async fetchBookingsForCustomer(
    requesterUid: string | null | undefined,
    targetCustomerId: string
  ): Promise<BookingRecord[]> {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access customer booking records.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot view records belonging to another customer.');
    }

    if (!isSupabaseConfigured() || !isValidUuid(targetCustomerId)) {
      return this.getBookingsForCustomer(requesterUid, targetCustomerId);
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const remoteList: BookingRecord[] = data.map((row: any) => ({
          id: row.id,
          customerId: row.customer_id || undefined,
          customerDisplayId: row.customer_display_id || undefined,
          fullName: row.full_name,
          phoneNumber: row.phone,
          serviceCategory: row.service_category as ServiceCategory,
          neighborhood: row.neighborhood as ChiralaNeighborhood,
          address: row.address,
          description: row.description,
          preferredDate: row.preferred_date,
          timeSlot: row.time_slot as TimeSlot,
          serviceRating: row.service_rating || 0,
          status: row.status as BookingStatus,
          assignedTechnicianId: row.assigned_technician_id || undefined,
          assignedTechnicianDisplayId: row.assigned_technician_display_id || undefined,
          finalBillAmount: row.final_bill_amount ? Number(row.final_bill_amount) : undefined,
          createdAt: row.created_at,
          statusHistory: [
            {
              status: row.status as BookingStatus,
              timestamp: row.created_at,
              note: `Current Status: ${row.status}`,
            },
          ],
        }));

        const map = new Map<string, BookingRecord>();
        this.bookings.forEach((b) => map.set(b.id, b));
        remoteList.forEach((b) => map.set(b.id, b));
        this.bookings = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.saveToStorage();
        this.notifyListeners();
      }

      return this.getBookingsForCustomer(requesterUid, targetCustomerId);
    } catch (err: unknown) {
      console.warn('BookingService fetchBookingsForCustomer note:', err);
      return this.getBookingsForCustomer(requesterUid, targetCustomerId);
    }
  }

  /**
   * Advance or change the status of a booking
   */
  public updateBookingStatus(
    id: string, 
    newStatus: BookingStatus, 
    note?: string,
    _requesterUid?: string
  ): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === id);
    if (!item) return null;

    item.status = newStatus;
    item.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status transitioned to ${newStatus}`,
    });

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase updateBookingStatus note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Customer cancels an unassigned service booking ('New' or 'Contacted').
   * Prevents cancelling jobs once assigned or in-progress.
   */
  public async cancelBooking(
    bookingId: string,
    requesterUid: string | null | undefined,
    reason?: string
  ): Promise<BookingRecord | null> {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to cancel a booking.');
    }

    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    if (item.customerId && item.customerId !== requesterUid) {
      throw new Error('403 Forbidden: You can only cancel your own service bookings.');
    }

    if (item.status !== 'New' && item.status !== 'Contacted') {
      throw new Error(
        `Cannot cancel booking in "${item.status}" status. Only pending or unassigned requests can be cancelled directly.`
      );
    }

    const nowIso = new Date().toISOString();
    item.status = 'Cancelled';
    item.statusHistory.push({
      status: 'Cancelled',
      timestamp: nowIso,
      note: reason ? `Customer cancelled: "${reason}"` : 'Customer cancelled booking request.',
    });

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', bookingId)
        .eq('customer_id', requesterUid);

      if (error) {
        console.warn('Supabase cancelBooking note:', error.message);
      }
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Admin assigns a technician to a booking
   */
  public assignTechnician(
    bookingId: string, 
    technicianId: string, 
    technicianName: string,
    technicianPhone?: string,
    _adminUid?: string,
    technicianDisplayId?: string
  ): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    const nowIso = new Date().toISOString();
    item.status = 'Assigned';
    item.assignedTechnicianId = technicianId;
    item.assignedTechnicianName = technicianName;
    item.assignedTechnicianDisplayId = technicianDisplayId;
    if (technicianPhone) {
      item.assignedTechnicianPhone = technicianPhone;
    }
    item.assignedAt = nowIso;
    item.statusHistory.push({
      status: 'Assigned',
      timestamp: nowIso,
      note: `Job assigned to technician ${technicianName} (ID: ${technicianDisplayId || technicianId})`,
    });

    if (isSupabaseConfigured() && _adminUid) {
      const dbTechId = isValidUuid(technicianId) ? technicianId : null;
      supabase
        .from('bookings')
        .update({
          status: 'Assigned',
          assigned_technician_id: dbTechId,
          assigned_technician_display_id: technicianDisplayId || null,
        })
        .eq('id', bookingId)
        .then(({ error }) => {
          if (error) console.warn('Supabase assignTechnician note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Technician accepts an assigned job
   */
  public acceptJob(bookingId: string): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    const nowIso = new Date().toISOString();
    item.status = 'Accepted';
    item.acceptedAt = nowIso;
    item.statusHistory.push({
      status: 'Accepted',
      timestamp: nowIso,
      note: `Technician ${item.assignedTechnicianName || ''} accepted the assignment.`,
    });

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({ status: 'Accepted' })
        .eq('id', bookingId)
        .then(({ error }) => {
          if (error) console.warn('Supabase acceptJob note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Technician reports unable to attend
   */
  public reportUnableToAttend(bookingId: string, reason: string): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    const nowIso = new Date().toISOString();
    item.status = 'Contacted';
    item.unableToAttendReason = reason;
    const prevTechName = item.assignedTechnicianName;
    item.assignedTechnicianId = undefined;
    item.assignedTechnicianName = undefined;

    item.statusHistory.push({
      status: 'Contacted',
      timestamp: nowIso,
      note: `Technician ${prevTechName || ''} reported unable to attend: "${reason}". Returned to dispatch queue.`,
    });

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({
          status: 'Contacted',
          assigned_technician_id: null,
          assigned_technician_display_id: null,
        })
        .eq('id', bookingId)
        .then(({ error }) => {
          if (error) console.warn('Supabase reportUnableToAttend note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Technician starts work on site
   */
  public startWork(bookingId: string): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    const nowIso = new Date().toISOString();
    item.status = 'In Progress';
    item.startedAt = nowIso;
    item.statusHistory.push({
      status: 'In Progress',
      timestamp: nowIso,
      note: 'Technician arrived on-site and commenced repair work.',
    });

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({ status: 'In Progress' })
        .eq('id', bookingId)
        .then(({ error }) => {
          if (error) console.warn('Supabase startWork note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  // ===============================================================
  // FINANCIAL CALCULATIONS & COMMISSION LOGIC
  // ===============================================================

  /**
   * Calculates marketplace commission and technician payout based on configured rules
   * Separates customer bill, technician payout, and marketplace commission.
   */
  public calculateCommission(amount: number): {
    customerBill: number;
    marketplaceCommission: number;
    technicianPayout: number;
    rateApplied: string;
  } {
    const customerBill = Math.max(0, amount);
    let marketplaceCommission = 0;
    let rateApplied = '';

    if (this.commissionConfig.type === 'percentage') {
      marketplaceCommission = Math.round(customerBill * (this.commissionConfig.rate / 100));
      rateApplied = `${this.commissionConfig.rate}% Commission`;
    } else {
      marketplaceCommission = Math.min(customerBill, this.commissionConfig.rate);
      rateApplied = `Fixed ₹${this.commissionConfig.rate} Fee`;
    }

    const technicianPayout = Math.max(0, customerBill - marketplaceCommission);

    return {
      customerBill,
      marketplaceCommission,
      technicianPayout,
      rateApplied,
    };
  }

  /**
   * Technician marks job complete with verified final bill amount
   * Automatically calculates commission according to active policy
   * Initial status is 'Commission Due' (uncollected until settlement).
   * Prevents duplicate commission calculation if processed multiple times.
   */
  public completeJob(
    bookingId: string, 
    finalBillAmount: number,
    paymentMethod: PaymentMethod = 'Cash on Completion'
  ): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === bookingId);
    if (!item) return null;

    const nowIso = new Date().toISOString();
    item.status = 'Completed';
    item.completedAt = nowIso;
    item.finalBillAmount = finalBillAmount;
    item.statusHistory.push({
      status: 'Completed',
      timestamp: nowIso,
      note: `Service completed. Final customer bill: ₹${finalBillAmount}.`,
    });

    // Commission Calculation (Idempotent: prevents duplicate commission entries)
    const existingComm = this.commissions.find((c) => c.bookingId === bookingId);
    const calc = this.calculateCommission(finalBillAmount);

    if (!existingComm) {
      const commRecord: CommissionRecord = {
        id: `COMM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        bookingId: item.id,
        technicianId: item.assignedTechnicianId || 'UNASSIGNED',
        customerBill: calc.customerBill,
        marketplaceCommission: calc.marketplaceCommission,
        technicianPayout: calc.technicianPayout,
        status: 'Commission Due', // Uncollected until confirmed settlement
        rateApplied: calc.rateApplied,
        createdAt: nowIso,
      };
      this.commissions.unshift(commRecord);
    } else {
      // Re-calculate if final bill was adjusted
      existingComm.customerBill = calc.customerBill;
      existingComm.marketplaceCommission = calc.marketplaceCommission;
      existingComm.technicianPayout = calc.technicianPayout;
      existingComm.rateApplied = calc.rateApplied;
    }

    // Persist verified payment in paymentService if customer identity is present
    if (item.customerId) {
      try {
        paymentService.recordVerifiedPayment(item.assignedTechnicianId || 'SYSTEM_TECH', {
          bookingId: item.id,
          customerId: item.customerId,
          technicianId: item.assignedTechnicianId,
          amount: finalBillAmount,
          paymentMethod,
          paymentStatus: 'Paid',
          verifiedBy: 'Technician',
          notes: 'Cash/UPI paid directly on completion.',
        });
      } catch (e) {
        // If payment already exists, avoid duplicate
        console.warn('Payment record note:', e);
      }
    }

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({
          status: 'Completed',
          final_bill_amount: finalBillAmount,
        })
        .eq('id', bookingId)
        .then(({ error }) => {
          if (error) console.warn('Supabase completeJob note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Admin updates the configurable marketplace commission policy
   */
  public updateCommissionConfig(
    adminUid: string | null | undefined, 
    newConfig: Partial<CommissionConfig>
  ): CommissionConfig {
    if (!adminUid) {
      throw new Error('401 Unauthorized: Only authenticated administrators can configure commission rates.');
    }

    this.commissionConfig = {
      ...this.commissionConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid,
    };

    this.notifyListeners();
    return { ...this.commissionConfig };
  }

  public getCommissionConfig(): CommissionConfig {
    return { ...this.commissionConfig };
  }

  /**
   * Admin marks commission as collected (Settled) upon payment verification
   */
  public markCommissionCollected(
    adminUid: string | null | undefined, 
    commissionId: string
  ): CommissionRecord {
    if (!adminUid) {
      throw new Error('401 Unauthorized: Only authenticated administrators can mark commission collected.');
    }

    const comm = this.commissions.find((c) => c.id === commissionId);
    if (!comm) {
      throw new Error(`Commission record #${commissionId} not found.`);
    }

    comm.status = 'Commission Collected';
    comm.collectedAt = new Date().toISOString();
    comm.collectedBy = adminUid;

    this.notifyListeners();
    return { ...comm };
  }

  public getAllCommissions(): CommissionRecord[] {
    return [...this.commissions];
  }

  /**
   * Returns comprehensive marketplace financial summary
   * Separates Total Customer Bills, Technician Payouts, Estimated, Due, and Collected.
   */
  public getFinancialSummary(): MarketplaceFinancialSummary {
    const totalCustomerBills = this.commissions.reduce((sum, c) => sum + c.customerBill, 0);
    const totalTechnicianPayouts = this.commissions.reduce((sum, c) => sum + c.technicianPayout, 0);
    const commissionDue = this.commissions
      .filter((c) => c.status === 'Commission Due')
      .reduce((sum, c) => sum + c.marketplaceCommission, 0);
    const commissionCollected = this.commissions
      .filter((c) => c.status === 'Commission Collected')
      .reduce((sum, c) => sum + c.marketplaceCommission, 0);

    // Estimated Commission for in-progress jobs (Standard Chirala inspection benchmark ₹350)
    const inProgressCount = this.bookings.filter(
      (b) => b.status === 'In Progress' || b.status === 'Assigned' || b.status === 'Accepted'
    ).length;
    const estimatedBenchmarkBill = 350;
    const estCalc = this.calculateCommission(estimatedBenchmarkBill);
    const estimatedCommission = inProgressCount * estCalc.marketplaceCommission;

    return {
      totalCustomerBills,
      totalTechnicianPayouts,
      estimatedCommission,
      commissionDue,
      commissionCollected,
      commissionAdjustments: 0,
    };
  }

  /**
   * Get all bookings assigned to a specific technician
   */
  public getBookingsForTechnician(technicianId: string): BookingRecord[] {
    return this.bookings.filter((b) => b.assignedTechnicianId === technicianId);
  }

  /**
   * Seeds isolated demo bookings in memory/sessionStorage for local testing
   */
  public seedDemoBookings(demoCustomerId: string): void {
    if (this.bookings.some((b) => b.customerId === demoCustomerId)) return;

    const now = Date.now();
    const todayStr = new Date().toLocaleDateString('en-GB');

    const demo1: BookingRecord = {
      id: 'LH-2026-1011',
      customerId: demoCustomerId,
      fullName: 'Satya Sarma (Demo Resident)',
      phoneNumber: '9491242781',
      serviceCategory: 'Electrical Repairs',
      neighborhood: 'Perala',
      address: 'H.No 4-12, Near Gandhi Statue, Perala, Chirala',
      description: 'Ceiling Fan Repair — Regulator replacement and bearing noise fix in living room',
      preferredDate: todayStr,
      timeSlot: 'Morning (8:00 AM – 12:00 PM)',
      serviceRating: 0,
      status: 'Assigned',
      assignedTechnicianId: 'tech-demo-sandbox',
      assignedTechnicianName: 'Ramesh Babu (Demo Electrician)',
      assignedTechnicianPhone: '9848012345',
      createdAt: new Date(now - 3600000).toISOString(),
      statusHistory: [
        {
          status: 'New',
          timestamp: new Date(now - 3600000).toISOString(),
          note: 'Request received and placed in local dispatch queue.',
        },
        {
          status: 'Assigned',
          timestamp: new Date(now - 1800000).toISOString(),
          note: 'Assigned to Ramesh Babu (Perala Electrician)',
        },
      ],
    };

    const demo2: BookingRecord = {
      id: 'LH-2026-1012',
      customerId: demoCustomerId,
      fullName: 'K. Venkat Rao (Demo Resident)',
      phoneNumber: '9491242781',
      serviceCategory: 'Plumbing Repairs',
      neighborhood: 'Paparajuthota',
      address: 'Plot 18, Ward 6, Paparajuthota, Chirala',
      description: 'Leaking Tap Fix — Kitchen sink mixer and drain pipe leakage repair',
      preferredDate: todayStr,
      timeSlot: 'Afternoon (12:00 PM – 4:00 PM)',
      serviceRating: 5,
      status: 'Completed',
      assignedTechnicianId: 'tech-demo-sandbox',
      assignedTechnicianName: 'Ramesh Babu (Demo Electrician)',
      assignedTechnicianPhone: '9848012345',
      finalBillAmount: 450,
      createdAt: new Date(now - 86400000).toISOString(),
      completedAt: new Date(now - 1800000).toISOString(),
      statusHistory: [
        {
          status: 'Completed',
          timestamp: new Date(now - 1800000).toISOString(),
          note: 'Work completed. Final bill ₹450 collected.',
        },
      ],
    };

    const demo3: BookingRecord = {
      id: 'LH-2026-1013',
      customerId: demoCustomerId,
      fullName: 'Suresh Varma (Demo Resident)',
      phoneNumber: '9491242781',
      serviceCategory: 'Electrical Repairs',
      neighborhood: 'Kothapeta',
      address: 'H.No 12-4, Near Clock Tower, Kothapeta, Chirala',
      description: 'Main Distribution Box MCB Tripping & Switchboard Inspection',
      preferredDate: todayStr,
      timeSlot: 'Morning (8:00 AM – 12:00 PM)',
      serviceRating: 0,
      status: 'In Progress',
      assignedTechnicianId: 'tech-demo-sandbox',
      assignedTechnicianName: 'Ramesh Babu (Demo Electrician)',
      assignedTechnicianPhone: '9848012345',
      createdAt: new Date(now - 7200000).toISOString(),
      startedAt: new Date(now - 1200000).toISOString(),
      statusHistory: [
        {
          status: 'In Progress',
          timestamp: new Date(now - 1200000).toISOString(),
          note: 'Technician arrived on-site and commenced repair work.',
        },
      ],
    };

    const demo4: BookingRecord = {
      id: 'LH-2026-1014',
      customerId: demoCustomerId,
      fullName: 'Lakshmi Devi (Demo Resident)',
      phoneNumber: '9491242781',
      serviceCategory: 'Plumbing Repairs',
      neighborhood: 'Srinivas Colony',
      address: 'Plot 7, Street 3, Srinivas Colony, Chirala',
      description: 'Drainage Pipe Blockage — Awaiting replacement PVC parts from hardware store',
      preferredDate: todayStr,
      timeSlot: 'Evening (4:00 PM – 7:30 PM)',
      serviceRating: 0,
      status: 'Accepted',
      unableToAttendReason: 'Specialized plumbing parts required for drainage pipe replacement',
      assignedTechnicianId: 'tech-demo-sandbox',
      assignedTechnicianName: 'Ramesh Babu (Demo Electrician)',
      assignedTechnicianPhone: '9848012345',
      createdAt: new Date(now - 10800000).toISOString(),
      acceptedAt: new Date(now - 5400000).toISOString(),
      statusHistory: [
        {
          status: 'Accepted',
          timestamp: new Date(now - 5400000).toISOString(),
          note: 'Technician accepted job. Specialized plumbing parts required.',
        },
      ],
    };

    this.bookings.push(demo1, demo2, demo3, demo4);
    this.notifyListeners();

    try {
      paymentService.recordVerifiedPayment('system', {
        bookingId: demo2.id,
        customerId: demoCustomerId,
        technicianId: 'tech-demo-sandbox',
        amount: 850,
        paymentMethod: 'UPI',
        paymentStatus: 'Paid',
        notes: 'Demo Payment for Overhead Tank Pipe Repair',
      });
    } catch {
      // Ignored if already exists
    }
  }

  /**
   * Update customer rating on completed booking
   */
  public updateBookingRating(
    id: string, 
    rating: number, 
    feedback?: string
  ): BookingRecord | null {
    const item = this.bookings.find((b) => b.id === id);
    if (!item) return null;

    item.serviceRating = rating;
    if (feedback) {
      item.statusHistory.push({
        status: item.status,
        timestamp: new Date().toISOString(),
        note: `Customer rated ${rating} ★: "${feedback}"`,
      });
    }

    if (isSupabaseConfigured()) {
      supabase
        .from('bookings')
        .update({
          service_rating: rating,
        })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase rating update note:', error.message);
        });
    }

    const updated = { ...item };
    this.notifyListeners();
    return updated;
  }

  /**
   * Strictly authorized getter for customer bookings.
   */
  public getBookingsForCustomer(
    requesterUid: string | null | undefined, 
    targetCustomerId: string
  ): BookingRecord[] {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access customer booking records.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot view records belonging to another customer.');
    }
    return this.bookings
      .filter((b) => b.customerId === targetCustomerId)
      .map((b) => ({ ...b }));
  }

  /**
   * Strictly authorized getter for customer invoices.
   */
  public getInvoicesForCustomer(
    requesterUid: string | null | undefined,
    targetCustomerId: string
  ): CustomerInvoice[] {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access payment and invoice records.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot view payment records belonging to another customer.');
    }
    return this.bookings
      .filter((b) => b.customerId === targetCustomerId && b.status === 'Completed' && b.finalBillAmount)
      .map((b) => {
        const comm = this.commissions.find((c) => c.bookingId === b.id);
        return {
          id: `INV-${b.id.replace('LH-', '')}`,
          bookingId: b.id,
          customerId: targetCustomerId,
          serviceCategory: b.serviceCategory,
          neighborhood: b.neighborhood,
          amount: b.finalBillAmount || 0,
          platformFee: comm ? comm.marketplaceCommission : 0,
          paidAt: b.completedAt || b.createdAt,
          paymentMethod: 'Cash',
          status: 'Paid',
        };
      });
  }

  public getBooking(id: string): BookingRecord | undefined {
    return this.bookings.find((b) => b.id === id);
  }

  public getAllSessionBookings(): BookingRecord[] {
    return [...this.bookings];
  }

  public getStats(): BookingStats {
    const total = this.bookings.length;
    const newCount = this.bookings.filter((b) => b.status === 'New').length;
    const inProgress = this.bookings.filter(
      (b) => b.status === 'Contacted' || b.status === 'Assigned' || b.status === 'Accepted' || b.status === 'In Progress'
    ).length;
    const completed = this.bookings.filter((b) => b.status === 'Completed').length;
    
    const finances = this.getFinancialSummary();

    const ratedBookings = this.bookings.filter((b) => typeof b.serviceRating === 'number' && b.serviceRating > 0);
    const avgRating = ratedBookings.length > 0 
      ? (ratedBookings.reduce((sum, b) => sum + b.serviceRating, 0) / ratedBookings.length).toFixed(1)
      : '0.0';

    return {
      total,
      newCount,
      inProgress,
      completed,
      commissionCollected: finances.commissionCollected,
      commissionDue: finances.commissionDue,
      estimatedCommission: finances.estimatedCommission,
      totalCustomerBills: finances.totalCustomerBills,
      totalTechnicianPayouts: finances.totalTechnicianPayouts,
      avgRating,
      ratingCount: ratedBookings.length,
    };
  }
}

export const bookingService = new BookingService();
