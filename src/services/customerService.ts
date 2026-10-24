import { CustomerProfile } from '../types';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from './supabase';

export type CustomerChangeListener = (currentCustomer: CustomerProfile | null) => void;

const STORAGE_KEY = 'lh_customers_data';
const CURRENT_CUSTOMER_KEY = 'lh_current_customer_id';

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

class CustomerService {
  private customers: CustomerProfile[] = [];
  private currentCustomerId: string | null = null;
  private listeners: Set<CustomerChangeListener> = new Set();

  constructor() {
    this.loadFromStorage();
    // Listen to Supabase Auth state changes to keep customer session cryptographically synchronized
    authService.subscribe((authUser) => {
      if (authUser) {
        this.handleAuthenticatedSession(authUser.uid, authUser.phoneNumber || undefined);
      }
    });
  }

  private loadFromStorage(): void {
    try {
      const data = getStorageItem(STORAGE_KEY);
      this.customers = data ? JSON.parse(data) : [];
      this.currentCustomerId = getStorageItem(CURRENT_CUSTOMER_KEY);
    } catch (e) {
      console.warn('Error reading customers from storage:', e);
      this.customers = [];
      this.currentCustomerId = null;
    }
  }

  private saveToStorage(): void {
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(this.customers));
      if (this.currentCustomerId) {
        setStorageItem(CURRENT_CUSTOMER_KEY, this.currentCustomerId);
      } else {
        removeStorageItem(CURRENT_CUSTOMER_KEY);
      }
    } catch (e) {
      console.warn('Error saving customers to storage:', e);
    }
  }

  public subscribe(listener: CustomerChangeListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getCurrentCustomer());
    } catch (e) {
      console.error('Error firing initial customer subscriber:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.saveToStorage();
    const current = this.getCurrentCustomer();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (e) {
        console.error('Error notifying customer subscriber:', e);
      }
    });
  }

  /**
   * Returns current authenticated customer profile strictly verifying active auth
   */
  public getCurrentCustomer(): CustomerProfile | null {
    if (!this.currentCustomerId) return null;
    return this.customers.find((c) => c.id === this.currentCustomerId) || null;
  }

  /**
   * Strictly authorized getter for a customer profile.
   * Enforces that the requester's authenticated UID matches the target customerId.
   */
  public getAuthorizedProfile(requesterUid: string, targetCustomerId: string): CustomerProfile {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access customer profile.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot access profile belonging to another customer.');
    }
    const profile = this.customers.find((c) => c.id === targetCustomerId);
    if (!profile) {
      throw new Error('404 Not Found: Customer profile not found.');
    }
    return { ...profile };
  }

  /**
   * Called upon successful cryptographic provider authentication (e.g. Supabase Phone OTP or Email)
   */
  public handleAuthenticatedSession(
    uid: string, 
    phoneNumber?: string, 
    fullName?: string,
    email?: string
  ): CustomerProfile {
    if (!uid) {
      throw new Error('Cannot establish customer session without verified provider UID.');
    }

    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
    const existingIndex = this.customers.findIndex((c) => c.id === uid);

    if (existingIndex !== -1) {
      const existing = this.customers[existingIndex];
      // Keep existing displayId or generate sequential displayId
      const stableDisplayId = existing.displayId || `CUS-${String(this.customers.length).padStart(5, '0')}`;
      const updated: CustomerProfile = {
        ...existing,
        displayId: stableDisplayId,
        phoneNumber: cleanPhone || existing.phoneNumber,
        fullName: fullName?.trim() || existing.fullName,
        email: email?.trim() || existing.email,
        authProvider: uid.includes('demo') ? 'demo-sandbox' : 'supabase-auth',
        isDemo: uid.includes('demo'),
      };
      this.customers[existingIndex] = updated;
      this.currentCustomerId = uid;
      this.notifyListeners();
      return updated;
    }

    // Allocate stable sequential 5-digit display ID
    const initialDisplayId = `CUS-${String(this.customers.length + 1).padStart(5, '0')}`;
    const newCustomer: CustomerProfile = {
      id: uid, // Stable Provider UUID
      displayId: initialDisplayId,
      fullName: (fullName || '').trim() || (uid.includes('demo') ? 'Chirala Resident (Demo Sandbox)' : 'Chirala Resident'),
      phoneNumber: cleanPhone || '9491242781',
      email: email?.trim() || undefined,
      authProvider: uid.includes('demo') ? 'demo-sandbox' : 'supabase-auth',
      isDemo: uid.includes('demo'),
      createdAt: new Date().toISOString(),
    };

    this.customers.unshift(newCustomer);
    this.currentCustomerId = uid;
    this.notifyListeners();

    // Query or synchronize display_id from Supabase customers table if configured
    if (typeof window !== 'undefined' && isSupabaseConfigured() && !uid.includes('demo')) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('display_id')
            .eq('id', uid)
            .maybeSingle();

          if (!error && data?.display_id) {
            const idx = this.customers.findIndex((c) => c.id === uid);
            if (idx !== -1 && this.customers[idx].displayId !== data.display_id) {
              this.customers[idx].displayId = data.display_id;
              this.notifyListeners();
            }
          } else if (!error && !data) {
            const { data: insData } = await supabase
              .from('customers')
              .insert({
                id: uid,
                full_name: newCustomer.fullName,
                phone: newCustomer.phoneNumber,
                email: newCustomer.email || null,
              })
              .select('display_id')
              .single();

            if (insData?.display_id) {
              const idx = this.customers.findIndex((c) => c.id === uid);
              if (idx !== -1) {
                this.customers[idx].displayId = insData.display_id;
                this.notifyListeners();
              }
            }
          }
        } catch {
          // Non-blocking sync error
        }
      })();
    }

    return newCustomer;
  }

  /**
   * Quick demo customer login for localhost development testing
   */
  public loginDemoCustomer(): CustomerProfile {
    const authUser = authService.loginDemoCustomer();
    return this.handleAuthenticatedSession(
      authUser.uid,
      '9491242781',
      'Chirala Resident (Demo Sandbox)',
      'customer.demo@clrservices.local'
    );
  }

  /**
   * Securely logs out the customer
   */
  public async logout(): Promise<void> {
    this.currentCustomerId = null;
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Error during provider sign out:', e);
    }
    this.notifyListeners();
  }

  public resetToZero(): void {
    this.customers = [];
    this.currentCustomerId = null;
    this.notifyListeners();
  }
}

export const customerService = new CustomerService();
