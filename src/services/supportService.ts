import { SupportTicket, SupportTicketIssueType, SupportTicketStatus } from '../types';
import { bffFetch } from '../lib/bffClient';
import { supabase } from '../lib/supabase';

export type SupportTicketChangeListener = (tickets: SupportTicket[]) => void;

class SupportService {
  private tickets: SupportTicket[] = [];
  private listeners: Set<SupportTicketChangeListener> = new Set();

  public subscribe(listener: SupportTicketChangeListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getAllTickets());
    } catch (e) {
      console.error('Error in support tickets subscriber:', e);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getAllTickets();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Error notifying support subscriber:', e);
      }
    });
  }

  public getAllTickets(): SupportTicket[] {
    return [...this.tickets];
  }

  // Hydrate server data without notifying; the dashboard applies the returned
  // list, so a notification would only trigger a redundant local-state reload.
  public hydrateTickets(tickets: SupportTicket[]): void {
    this.tickets = [...tickets];
  }

  public async fetchAllTickets(): Promise<SupportTicket[]> {
    const { tickets } = await bffFetch<{ tickets: SupportTicket[] }>('/support/tickets');
    this.tickets = tickets;
    this.notifyListeners();
    return this.getAllTickets();
  }

  /**
   * Strictly authorized getter for customer support tickets.
   * Enforces requesterUid === targetCustomerId.
   */
  public getTicketsForCustomer(
    requesterUid: string | null | undefined, 
    targetCustomerId: string
  ): SupportTicket[] {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: Authentication required to access support tickets.');
    }
    if (requesterUid !== targetCustomerId) {
      throw new Error('403 Forbidden: Access denied. Cannot view support tickets belonging to another customer.');
    }
    return this.tickets
      .filter((t) => t.customerId === targetCustomerId)
      .map((t) => ({ ...t }));
  }

  public getTicketsForBooking(bookingId: string): SupportTicket[] {
    return this.tickets.filter((t) => t.bookingId.toLowerCase() === bookingId.toLowerCase());
  }

  public async createTicket(
    requesterUid: string,
    bookingId: string,
    issueType: SupportTicketIssueType,
    description: string
  ): Promise<SupportTicket> {
    if (!requesterUid) {
      throw new Error('401 Unauthorized: You must be authenticated to submit a support ticket.');
    }

    // The BFF derives customer name, phone and id from the JWT and booking row.
    const newTicket = await bffFetch<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: {
        bookingId: bookingId.trim().toUpperCase(),
        issueType,
        description: description.trim(),
      },
    });

    this.tickets = [newTicket, ...this.tickets.filter((t) => t.id !== newTicket.id)];
    this.notifyListeners();
    return newTicket;
  }

  public async updateTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
    resolutionNote?: string
  ): Promise<SupportTicket> {
    const updated = await bffFetch<SupportTicket>(`/support/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      body: {
        status,
        ...(resolutionNote !== undefined ? { resolutionNote } : {}),
      },
    });

    this.tickets = this.tickets.map((t) => (t.id === updated.id ? updated : t));
    this.notifyListeners();
    return updated;
  }

  public async resolveTicket(ticketId: string, resolutionNote?: string): Promise<SupportTicket> {
    return this.updateTicketStatus(ticketId, 'Resolved', resolutionNote);
  }

  public resetToZero(): void {
    this.tickets = [];
    this.notifyListeners();
  }
}

export const supportService = new SupportService();

export async function getCustomerTickets(): Promise<SupportTicket[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { tickets } = await bffFetch<{ tickets: SupportTicket[] }>('/support/my-tickets');
  supportService.hydrateTickets(tickets);
  return tickets;
}
