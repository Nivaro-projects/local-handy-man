export type ServiceCategory = 'Electrical Repairs' | 'Plumbing Repairs';

export type ChiralaNeighborhood =
  | 'Paparajuthota'
  | 'Perala'
  | 'Kothapeta'
  | 'Srinivas Colony';

export type TimeSlot =
  | 'Morning (8:00 AM – 12:00 PM)'
  | 'Afternoon (12:00 PM – 4:00 PM)'
  | 'Evening (4:00 PM – 7:30 PM)';

export type BookingStatus =
  | 'New'
  | 'Contacted'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface BookingFormData {
  fullName: string;
  phoneNumber: string;
  serviceCategory: ServiceCategory | '';
  neighborhood: ChiralaNeighborhood | '';
  address: string;
  description: string;
  preferredDate: string; // dd/mm/yyyy
  timeSlot: TimeSlot | '';
  serviceRating: number; // 1 to 5
  customerId?: string;
}

export interface BookingFormErrors {
  fullName?: string;
  phoneNumber?: string;
  serviceCategory?: string;
  neighborhood?: string;
  address?: string;
  description?: string;
  preferredDate?: string;
  timeSlot?: string;
  serviceRating?: string;
  consent?: string;
  general?: string;
}

export interface BookingRecord {
  id: string; // e.g. LH-2026-4821
  customerId?: string; // Verified customer UID
  customerDisplayId?: string; // e.g. CUS-00001
  fullName: string;
  phoneNumber: string;
  serviceCategory: ServiceCategory;
  neighborhood: ChiralaNeighborhood;
  address: string;
  description: string;
  preferredDate: string; // DD/MM/YYYY
  timeSlot: TimeSlot;
  serviceRating: number; // 1-5
  status: BookingStatus;
  createdAt: string;
  assignedTechnicianId?: string;
  assignedTechnicianDisplayId?: string; // e.g. TECH-00001
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  finalBillAmount?: number;
  unableToAttendReason?: string;
  statusHistory: Array<{
    status: BookingStatus;
    timestamp: string;
    note?: string;
  }>;
}

export type TechnicianStatus = 'Pending Approval' | 'Approved' | 'Rejected';
export type TechnicianAvailability = 'Available' | 'Offline';

export interface TechnicianRecord {
  id: string; // UUID primary key in Supabase
  displayId?: string; // Sequential 5-digit formatted ID, e.g. TECH-00001
  firebaseUid?: string; // Legacy Auth Provider UID
  supabaseUid?: string; // Supabase Authenticated Provider UID
  fullName: string;
  phoneNumber: string;
  email?: string;
  serviceCategory: ServiceCategory;
  neighborhood: ChiralaNeighborhood;
  status: TechnicianStatus;
  availability: TechnicianAvailability;
  registeredAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  authProvider?: string;
  isDemo?: boolean;
}

export interface TechnicianRegistrationData {
  fullName: string;
  phoneNumber: string;
  email?: string;
  serviceCategory: ServiceCategory | '';
  neighborhood: ChiralaNeighborhood | '';
}

export interface CustomerProfile {
  id: string; // Authenticated Provider UID (Supabase Auth UID)
  displayId?: string; // Sequential 5-digit formatted ID, e.g. CUS-00001
  fullName: string;
  phoneNumber: string; // 10 digits
  email?: string;
  createdAt: string;
  authProvider?: string;
  isDemo?: boolean;
}

export interface CustomerInvoice {
  id: string; // e.g. INV-2026-1001
  bookingId: string;
  customerId: string; // Verified customer UID
  serviceCategory: ServiceCategory;
  neighborhood: ChiralaNeighborhood;
  amount: number;
  platformFee: number;
  paidAt: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  status: 'Paid' | 'Pending';
}

// ==========================================
// Payment Records & Auditable Financial Models
// ==========================================
export type PaymentMethod = 'Cash on Completion' | 'UPI' | 'Card';
export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';
export type RefundStatus = 'None' | 'Requested' | 'Refunded';

export interface PaymentRecord {
  id: string; // e.g. PAY-2026-1001
  bookingId: string;
  customerId: string; // Verified customer UID
  technicianId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: PaymentStatus;
  refundStatus: RefundStatus;
  refundAmount?: number;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
  verifiedBy?: 'Admin' | 'System' | 'Technician';
  notes?: string;
}

// ==========================================
// Configurable Commission Architecture
// ==========================================
export type CommissionType = 'percentage' | 'fixed';
export type CommissionStatus = 'Estimated' | 'Commission Due' | 'Commission Collected';

export interface CommissionConfig {
  type: CommissionType;
  rate: number; // e.g. 10 (%) or 150 (₹)
  updatedAt: string;
  updatedBy: string;
}

export interface CommissionRecord {
  id: string; // e.g. COMM-2026-1001
  bookingId: string;
  technicianId: string;
  customerBill: number;
  marketplaceCommission: number;
  technicianPayout: number;
  status: CommissionStatus;
  rateApplied: string; // e.g. "10% Commission" or "Fixed ₹150"
  createdAt: string;
  collectedAt?: string;
  collectedBy?: string;
  notes?: string;
}

export interface MarketplaceFinancialSummary {
  totalCustomerBills: number;
  totalTechnicianPayouts: number;
  estimatedCommission: number;
  commissionDue: number;
  commissionCollected: number;
  commissionAdjustments: number;
}

// ==========================================
// Administrator Profile & Session
// ==========================================
export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  tokenIssuedAt: string;
  isDemo?: boolean;
}

export type SupportTicketIssueType = 
  | 'Work Quality'
  | 'Delayed Arrival'
  | 'Billing Dispute'
  | 'Technician Behavior'
  | 'Incomplete Work'
  | 'Other';

export type SupportTicketStatus = 'Open' | 'In Review' | 'Resolved';

export interface SupportTicket {
  id: string; // e.g. TKT-2026-1001
  bookingId: string;
  customerId: string; // Verified customer UID
  customerName: string;
  customerPhone: string;
  issueType: SupportTicketIssueType;
  description: string;
  createdAt: string;
  status: SupportTicketStatus;
  resolutionNote?: string;
}
