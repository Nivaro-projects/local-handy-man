import { 
  TechnicianRecord, 
  TechnicianRegistrationData, 
  TechnicianStatus, 
  TechnicianAvailability, 
  ServiceCategory 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { authService } from './authService';

export type TechnicianChangeListener = (technicians: TechnicianRecord[]) => void;

const STORAGE_KEY = 'lh_technicians_data';
const CURRENT_TECH_KEY = 'lh_current_technician_id';

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

class TechnicianService {
  private technicians: TechnicianRecord[] = [];
  private listeners: Set<TechnicianChangeListener> = new Set();
  private currentTechnicianId: string | null = null;
  private isLoading: boolean = false;
  private loadError: string | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined' && isSupabaseConfigured()) {
      this.fetchFromSupabase().catch((err) => {
        console.warn('Initial technician fetch note:', err);
      });
      this.initRealtimeSubscription();
    }
  }

  private initRealtimeSubscription(): void {
    if (!isSupabaseConfigured() || this.realtimeChannel) return;
    try {
      this.realtimeChannel = supabase
        .channel('public:technicians_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'technicians' },
          () => {
            this.fetchFromSupabase().catch((err) => {
              console.warn('Realtime technician sync note:', err);
            });
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime technician subscription note:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = getStorageItem(STORAGE_KEY);
      if (data) {
        const raw: any[] = JSON.parse(data);
        this.technicians = raw.map((item) => {
          const { password, ...safe } = item;
          return safe as TechnicianRecord;
        });
      } else {
        // Starts strictly at ZERO - no hardcoded mock records
        this.technicians = [];
      }
      this.currentTechnicianId = getStorageItem(CURRENT_TECH_KEY);
    } catch (e) {
      console.warn('Error reading technicians from storage:', e);
      this.technicians = [];
      this.currentTechnicianId = null;
    }
  }

  private saveToStorage(): void {
    try {
      const sanitized = this.technicians.map((t) => {
        const { ...safe } = t as any;
        delete safe.password;
        return safe;
      });
      setStorageItem(STORAGE_KEY, JSON.stringify(sanitized));
      if (this.currentTechnicianId) {
        setStorageItem(CURRENT_TECH_KEY, this.currentTechnicianId);
      } else {
        removeStorageItem(CURRENT_TECH_KEY);
      }
    } catch (e) {
      console.warn('Error saving technicians to storage:', e);
    }
  }

  public subscribe(listener: TechnicianChangeListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getAllTechnicians());
    } catch (e) {
      console.error('Error in technician subscriber:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.saveToStorage();
    const snapshot = this.getAllTechnicians();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Error notifying technician subscriber:', e);
      }
    });
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getLoadError(): string | null {
    return this.loadError;
  }

  /**
   * Fetches genuine technician records from Supabase database.
   * Preserves genuine database records; sets error state if query fails.
   */
  public async fetchFromSupabase(): Promise<TechnicianRecord[]> {
    if (!isSupabaseConfigured()) {
      return [...this.technicians];
    }

    this.isLoading = true;
    this.loadError = null;

    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('registered_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      this.technicians = (data || []).map((row: any, idx: number) => ({
        id: row.id,
        displayId: row.display_id || `TECH-${String(idx + 1).padStart(5, '0')}`,
        supabaseUid: row.auth_user_id || undefined,
        firebaseUid: row.auth_user_id || undefined,
        fullName: row.full_name,
        phoneNumber: (row.phone || '').replace(/\D/g, '').slice(-10),
        email: row.email || undefined,
        serviceCategory: row.service_category,
        neighborhood: row.neighborhood,
        status: row.status,
        availability: row.availability,
        registeredAt: row.registered_at,
        approvedAt: row.approved_at || undefined,
        rejectedReason: row.rejected_reason || undefined,
        authProvider: 'supabase-auth',
      }));

      this.saveToStorage();
      this.notifyListeners();
      return [...this.technicians];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query technician records from Supabase.';
      this.loadError = msg;
      this.notifyListeners();
      throw new Error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Resets in-memory and session storage to zero.
   */
  public resetToZero(): void {
    this.technicians = [];
    this.currentTechnicianId = null;
    this.loadError = null;
    this.notifyListeners();
  }

  /**
   * Registers a new technician partner.
   * New applications strictly default to 'Pending Approval'.
   * Prevents duplicate applications for the same user ID or phone number.
   * Persists record to Supabase technicians table when configured.
   */
  public async registerTechnician(
    data: TechnicianRegistrationData,
    supabaseUid?: string
  ): Promise<TechnicianRecord> {
    const cleanedPhone = data.phoneNumber.trim().replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }

    // Check duplicate in memory
    const cleanEmail = data.email?.trim().toLowerCase();
    const existing = this.technicians.find(
      (t) => t.phoneNumber.replace(/\D/g, '').slice(-10) === cleanedPhone || 
             (supabaseUid && t.supabaseUid === supabaseUid) ||
             (cleanEmail && t.email && t.email.toLowerCase() === cleanEmail)
    );
    if (existing) {
      const reason = cleanEmail && existing.email && existing.email.toLowerCase() === cleanEmail
        ? `Email ${cleanEmail} is already registered with a technician profile.`
        : `Mobile number +91 ${cleanedPhone} or this account is already registered as a technician.`;
      throw new Error(reason);
    }

    if (isSupabaseConfigured()) {
      // 1. Verify active session to prevent unauthenticated client RLS violations
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      // If active session exists, verify supabaseUid matches session user
      if (sessionUser && supabaseUid && sessionUser.id !== supabaseUid) {
        throw new Error('Authenticated user ID does not match the registration identity.');
      }

      // If no session exists at all on Supabase, unauthenticated insert violates RLS
      if (!sessionUser && !supabaseUid) {
        throw new Error('Authentication session is not active. Please log in before registering your technician profile.');
      }

      // Validate that supabaseUid is a valid UUID format before sending to Postgres
      const isValidUuid = typeof supabaseUid === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supabaseUid);

      const newRow = {
        auth_user_id: isValidUuid ? supabaseUid : null,
        full_name: data.fullName.trim(),
        phone: cleanedPhone,
        email: data.email?.trim() || null,
        service_category: data.serviceCategory,
        neighborhood: data.neighborhood,
        status: 'Pending Approval',
        availability: 'Available',
        registered_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('technicians')
        .insert(newRow)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message.toLowerCase().includes('unique') || error.message.toLowerCase().includes('duplicate')) {
          throw new Error(`A technician profile is already registered for mobile +91 ${cleanedPhone} or this account.`);
        }
        if (error.code === '23503' || error.message.includes('technicians_auth_user_id_fkey')) {
          throw new Error('Authentication user account not found in Supabase Auth. Please ensure your login credentials are created before profile registration.');
        }
        if (error.code === '42501' || error.message.toLowerCase().includes('row-level security') || error.message.toLowerCase().includes('rls')) {
          throw new Error('Registration rejected by database row-level security policy. Please ensure you are authenticated with your technician account.');
        }
        throw new Error(error.message || 'Failed to persist technician registration in Supabase.');
      }

      const record: TechnicianRecord = {
        id: inserted.id,
        displayId: inserted.display_id || `TECH-${String(this.technicians.length + 1).padStart(5, '0')}`,
        supabaseUid: inserted.auth_user_id || supabaseUid,
        firebaseUid: inserted.auth_user_id || supabaseUid,
        fullName: inserted.full_name,
        phoneNumber: inserted.phone,
        email: inserted.email || undefined,
        serviceCategory: inserted.service_category,
        neighborhood: inserted.neighborhood,
        status: inserted.status,
        availability: inserted.availability,
        registeredAt: inserted.registered_at,
        authProvider: 'supabase-auth',
      };

      this.technicians.unshift(record);
      this.currentTechnicianId = record.id;
      this.saveToStorage();
      this.notifyListeners();
      return record;
    }

    // Local sandbox fallback when Supabase is offline/unconfigured
    const seqNum = this.technicians.length + 1;
    const formattedDisplayId = `TECH-${String(seqNum).padStart(5, '0')}`;
    const uniqueId = `TECH-UUID-${String(seqNum).padStart(5, '0')}`;
    const newRecord: TechnicianRecord = {
      id: uniqueId,
      displayId: formattedDisplayId,
      supabaseUid,
      firebaseUid: supabaseUid,
      fullName: data.fullName.trim(),
      phoneNumber: cleanedPhone,
      email: data.email?.trim() || undefined,
      serviceCategory: data.serviceCategory as ServiceCategory,
      neighborhood: data.neighborhood as any,
      status: 'Pending Approval',
      availability: 'Available',
      registeredAt: new Date().toISOString(),
      authProvider: 'supabase-auth',
    };

    this.technicians.unshift(newRecord);
    this.currentTechnicianId = uniqueId;
    this.saveToStorage();
    this.notifyListeners();
    return newRecord;
  }

  /**
   * Establishes a verified session for a technician authenticated via Supabase Auth
   */
  public handleAuthenticatedSession(supabaseUid: string, emailOrPhone: string): TechnicianRecord | null {
    const query = emailOrPhone.trim().toLowerCase();
    const queryPhone = query.replace(/\D/g, '').slice(-10);

    const match = this.technicians.find((t) => {
      const matchUid = (t.supabaseUid && t.supabaseUid === supabaseUid) || 
                       (t.firebaseUid && t.firebaseUid === supabaseUid);
      const matchPhone = queryPhone && t.phoneNumber.slice(-10) === queryPhone;
      const matchEmail = t.email && t.email.toLowerCase() === query;
      return matchUid || matchPhone || matchEmail;
    });

    if (match) {
      match.supabaseUid = supabaseUid;
      match.firebaseUid = supabaseUid;
      this.currentTechnicianId = match.id;
      this.saveToStorage();
      this.notifyListeners();
      return match;
    }

    return null;
  }

  /**
   * Securely syncs and retrieves a technician's profile upon successful Supabase authentication.
   * If a technician record exists in Supabase for the authenticated user, updates local state and returns it.
   * If auth_user_id in Supabase is not yet linked, links it safely using the verified auth UID.
   * If no profile exists, returns null without creating any new authentication accounts.
   */
  public async syncTechnicianProfileOnLogin(
    authUserId: string,
    emailOrPhone: string
  ): Promise<TechnicianRecord | null> {
    const query = emailOrPhone.trim().toLowerCase();
    const queryPhone = query.replace(/\D/g, '').slice(-10);

    if (isSupabaseConfigured()) {
      try {
        // 1. First attempt lookup by verified auth_user_id
        const { data: byAuthId, error: errAuthId } = await supabase
          .from('technicians')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (byAuthId && !errAuthId) {
          const mapped = this.mapDatabaseRowToRecord(byAuthId);
          this.upsertLocalTechnician(mapped);
          this.currentTechnicianId = mapped.id;
          this.saveToStorage();
          this.notifyListeners();
          return mapped;
        }

        // 2. Lookup by phone or email if auth_user_id is not yet set
        const filterParts: string[] = [];
        if (queryPhone) filterParts.push(`phone.eq.${queryPhone}`);
        if (query.includes('@')) filterParts.push(`email.eq.${query}`);

        if (filterParts.length > 0) {
          const { data: byContact, error: errContact } = await supabase
            .from('technicians')
            .select('*')
            .or(filterParts.join(','))
            .maybeSingle();

          if (byContact && !errContact) {
            const isValidUuid = typeof authUserId === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId);

            let rowToUse = byContact;
            // Only update auth_user_id if it's currently unlinked or mismatched and is a valid UUID
            if (isValidUuid && (!byContact.auth_user_id || byContact.auth_user_id !== authUserId)) {
              const { data: updated, error: updateErr } = await supabase
                .from('technicians')
                .update({ auth_user_id: authUserId })
                .eq('id', byContact.id)
                .select()
                .maybeSingle();

              if (!updateErr && updated) {
                rowToUse = updated;
              }
            }

            const mapped = this.mapDatabaseRowToRecord(rowToUse);
            this.upsertLocalTechnician(mapped);
            this.currentTechnicianId = mapped.id;
            this.saveToStorage();
            this.notifyListeners();
            return mapped;
          }
        }
      } catch (err) {
        console.warn('Error querying technician profile from Supabase on login:', err);
      }
    }

    // Fallback to in-memory / session storage
    return this.handleAuthenticatedSession(authUserId, emailOrPhone);
  }

  private mapDatabaseRowToRecord(row: any): TechnicianRecord {
    return {
      id: row.id,
      displayId: row.display_id || undefined,
      supabaseUid: row.auth_user_id || undefined,
      firebaseUid: row.auth_user_id || undefined,
      fullName: row.full_name,
      phoneNumber: (row.phone || '').replace(/\D/g, '').slice(-10),
      email: row.email || undefined,
      serviceCategory: row.service_category,
      neighborhood: row.neighborhood,
      status: row.status,
      availability: row.availability,
      registeredAt: row.registered_at,
      approvedAt: row.approved_at || undefined,
      rejectedReason: row.rejected_reason || undefined,
      authProvider: 'supabase-auth',
    };
  }

  private upsertLocalTechnician(tech: TechnicianRecord): void {
    const idx = this.technicians.findIndex((t) => t.id === tech.id);
    if (idx !== -1) {
      this.technicians[idx] = tech;
    } else {
      this.technicians.unshift(tech);
    }
  }

  /**
   * Restores an active technician session from persistence or active Supabase session.
   * Avoids prompting for OTP or re-authenticating when an active valid session exists.
   */
  public async restoreTechnicianSession(): Promise<TechnicianRecord | null> {
    const current = this.getCurrentTechnician();
    if (current) {
      return current;
    }

    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (user) {
        const identifier = user.phone || user.email || '';
        const synced = await this.syncTechnicianProfileOnLogin(user.id, identifier);
        if (synced) {
          return synced;
        }
      }
    } catch (e) {
      console.warn('Error restoring technician session:', e);
    }

    return null;
  }

  public getCurrentTechnician(): TechnicianRecord | null {
    if (!this.currentTechnicianId) return null;
    return this.technicians.find((t) => t.id === this.currentTechnicianId) || null;
  }

  public setCurrentTechnician(tech: TechnicianRecord | null): void {
    this.currentTechnicianId = tech ? tech.id : null;
    this.saveToStorage();
  }

  public logout(): void {
    this.currentTechnicianId = null;
    this.saveToStorage();
  }

  public findByPhone(phone: string): TechnicianRecord | null {
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (!cleaned) return null;
    return this.technicians.find((t) => t.phoneNumber.replace(/\D/g, '').slice(-10) === cleaned) || null;
  }

  public findByEmail(email: string): TechnicianRecord | null {
    const query = email.trim().toLowerCase();
    if (!query) return null;
    return this.technicians.find((t) => t.email && t.email.toLowerCase() === query) || null;
  }

  /**
   * Admin action: Updates technician approval status (Approved or Rejected).
   * Persists change to Supabase database and updates local state.
   */
  public async updateTechnicianStatus(
    id: string, 
    newStatus: TechnicianStatus, 
    reason?: string
  ): Promise<TechnicianRecord | null> {
    if (isSupabaseConfigured()) {
      const updatePayload: any = {
        status: newStatus,
        approved_at: newStatus === 'Approved' ? new Date().toISOString() : null,
        rejected_reason: newStatus === 'Rejected' ? (reason || 'Application details could not be verified.') : null,
      };

      const { data, error } = await supabase
        .from('technicians')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || `Failed to update technician status to ${newStatus}.`);
      }

      const targetIndex = this.technicians.findIndex((t) => t.id === id);
      const mappedRecord: TechnicianRecord = {
        id: data.id,
        displayId: data.display_id || (targetIndex !== -1 ? this.technicians[targetIndex].displayId : undefined),
        supabaseUid: data.auth_user_id || undefined,
        firebaseUid: data.auth_user_id || undefined,
        fullName: data.full_name,
        phoneNumber: data.phone,
        email: data.email || undefined,
        serviceCategory: data.service_category,
        neighborhood: data.neighborhood,
        status: data.status,
        availability: data.availability,
        registeredAt: data.registered_at,
        approvedAt: data.approved_at || undefined,
        rejectedReason: data.rejected_reason || undefined,
        authProvider: 'supabase-auth',
      };

      if (targetIndex !== -1) {
        this.technicians[targetIndex] = mappedRecord;
      } else {
        this.technicians.unshift(mappedRecord);
      }

      this.saveToStorage();
      this.notifyListeners();
      return mappedRecord;
    }

    // Local storage fallback
    const tech = this.technicians.find((t) => t.id === id);
    if (!tech) return null;

    tech.status = newStatus;
    if (newStatus === 'Approved') {
      tech.approvedAt = new Date().toISOString();
      tech.rejectedReason = undefined;
    } else if (newStatus === 'Rejected') {
      tech.rejectedReason = reason || 'Does not meet local craftsmanship verification standards.';
    }

    this.saveToStorage();
    this.notifyListeners();
    return { ...tech };
  }

  /**
   * Set specific availability status with awaited Supabase persistence
   */
  public async setAvailabilityAsync(id: string, availability: TechnicianAvailability): Promise<TechnicianRecord> {
    const tech = this.technicians.find((t) => t.id === id);
    if (!tech) throw new Error('Technician record not found.');

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('technicians')
        .update({ availability })
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Failed to update technician availability in database.');
      }
    }

    tech.availability = availability;
    this.saveToStorage();
    this.notifyListeners();
    return { ...tech };
  }

  /**
   * Safe isolated demo technician login for localhost development testing.
   * Strictly disabled in production.
   */
  public loginDemoTechnicianSession(): TechnicianRecord {
    const authUser = authService.loginDemoTechnician();
    let demoTech = this.technicians.find(
      (t) => t.id === 'tech-demo-sandbox' || (authUser.phone && t.phoneNumber === authUser.phone)
    );

    if (!demoTech) {
      demoTech = {
        id: 'tech-demo-sandbox',
        displayId: 'TECH-00001',
        supabaseUid: authUser.uid,
        firebaseUid: authUser.uid,
        fullName: authUser.displayName || 'Technician (Demo Sandbox)',
        phoneNumber: authUser.phone || '9848012345',
        email: authUser.email,
        serviceCategory: 'Electrical Repairs',
        neighborhood: 'Perala',
        status: 'Approved',
        availability: 'Available',
        registeredAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        authProvider: 'supabase-auth',
        isDemo: true,
      };
      this.technicians.unshift(demoTech);
    } else {
      demoTech.status = 'Approved';
      demoTech.supabaseUid = authUser.uid;
      demoTech.availability = 'Available';
    }

    this.currentTechnicianId = demoTech.id;
    this.saveToStorage();
    this.notifyListeners();
    return { ...demoTech };
  }

  /**
   * Toggle technician availability
   */
  public toggleAvailability(id: string): TechnicianRecord | null {
    const tech = this.technicians.find((t) => t.id === id);
    if (!tech) return null;

    const nextAvail: TechnicianAvailability = tech.availability === 'Available' ? 'Offline' : 'Available';
    return this.updateAvailability(id, nextAvail);
  }

  /**
   * Set specific availability status
   */
  public updateAvailability(id: string, availability: TechnicianAvailability): TechnicianRecord | null {
    const tech = this.technicians.find((t) => t.id === id);
    if (!tech) return null;

    tech.availability = availability;

    if (isSupabaseConfigured()) {
      supabase
        .from('technicians')
        .update({ availability })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase availability update note:', error.message);
        });
    }

    this.saveToStorage();
    this.notifyListeners();
    return { ...tech };
  }

  public getAllTechnicians(): TechnicianRecord[] {
    return [...this.technicians];
  }

  public getApprovedTechnicians(): TechnicianRecord[] {
    return this.technicians.filter((t) => t.status === 'Approved');
  }

  public getPendingTechnicians(): TechnicianRecord[] {
    return this.technicians.filter((t) => t.status === 'Pending Approval');
  }

  public getRejectedTechnicians(): TechnicianRecord[] {
    return this.technicians.filter((t) => t.status === 'Rejected');
  }

  public getAvailableTechnicians(category?: ServiceCategory): TechnicianRecord[] {
    return this.technicians.filter((t) => {
      const isApproved = t.status === 'Approved';
      const isAvail = t.availability === 'Available';
      const matchesCat = category ? t.serviceCategory === category : true;
      return isApproved && isAvail && matchesCat;
    });
  }

  /**
   * Categorized counts for Admin Dashboard
   */
  public getCounts(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    return {
      total: this.technicians.length,
      pending: this.technicians.filter((t) => t.status === 'Pending Approval').length,
      approved: this.technicians.filter((t) => t.status === 'Approved').length,
      rejected: this.technicians.filter((t) => t.status === 'Rejected').length,
    };
  }
}

export const technicianService = new TechnicianService();
