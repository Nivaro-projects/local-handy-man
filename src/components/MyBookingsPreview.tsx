import React, { useState, useEffect } from 'react';
import { customerService } from '../services/customerService';
import { bookingService } from '../services/bookingService';
import { CustomerProfile, BookingRecord, BookingStatus } from '../types';

interface MyBookingsPreviewProps {
  onOpenCustomerAuth: () => void;
  onOpenCustomerDashboard: () => void;
}

// Accessible Status Badges with dedicated minimal borders (not relying on color alone)
const renderStatusBadge = (status: BookingStatus) => {
  switch (status) {
    case 'New':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-navy border border-slate-300">
          <span className="w-2 h-2 rounded-full bg-navy" />
          <span>New Request</span>
        </span>
      );
    case 'Contacted':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-navy border border-navy/30">
          <span className="w-2 h-2 rounded-full bg-navy" />
          <span>Contacted</span>
        </span>
      );
    case 'Assigned':
    case 'Accepted':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-navy text-gold border border-navy">
          <span className="w-2 h-2 rounded-full bg-gold" />
          <span>Technician Assigned</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold bg-gold text-navy border-2 border-navy">
          <span className="w-2 h-2 rounded-full bg-navy" />
          <span>In Progress</span>
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-navy border border-navy/30">
          <span className="w-2 h-2 rounded-full bg-[#2D6A3A]" />
          <span>Completed</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-[#8F1D2C] border border-[#8F1D2C]">
          <span className="w-2 h-2 rounded-full bg-[#8F1D2C]" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <span>{status}</span>
        </span>
      );
  }
};

export const MyBookingsPreview: React.FC<MyBookingsPreviewProps> = ({
  onOpenCustomerAuth,
  onOpenCustomerDashboard,
}) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    return customerService.getCurrentCustomer();
  });
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const unsubCustomer = customerService.subscribe((c) => {
      setCustomer(c ? { ...c } : null);
    });
    return () => unsubCustomer();
  }, []);

  useEffect(() => {
    const refresh = () => {
      const cur = customerService.getCurrentCustomer();
      if (cur) {
        try {
          const list = bookingService.getBookingsForCustomer(cur.id, cur.id);
          setBookings(list);
        } catch {
          setBookings([]);
        }
      } else {
        setBookings([]);
      }
    };

    refresh();
    const unsubBookings = bookingService.subscribe(() => {
      refresh();
    });
    return () => unsubBookings();
  }, [customer]);

  return (
    <section id="my-bookings" className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Customer portal
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-3">
            My bookings
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Track active repair requests and review service history for your Chirala home.
          </p>
        </div>

        {/* Content Box */}
        <div className="max-w-3xl">
          {customer ? (
            /* Logged-in Customer View */
            <div className="border border-slate-200 bg-white p-6 sm:p-8 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-200 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-navy border border-navy flex items-center justify-center text-gold text-xs font-bold">
                    {customer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy">
                      Logged in as {customer.fullName}
                    </h3>
                    <p className="text-xs text-slate-600">{customer.phoneNumber}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenCustomerDashboard}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:text-navy/80 underline cursor-pointer transition-colors"
                >
                  <span>Open Full Dashboard</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {bookings.length > 0 ? (
                /* Compact Active/Recent Bookings List */
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active &amp; recent requests ({bookings.length})
                  </p>

                  <div className="mt-2 border-t border-slate-200 divide-y divide-slate-200">
                    {bookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-navy">
                              {booking.id}
                            </span>
                            <span className="text-xs font-medium text-slate-600">&bull;</span>
                            <span className="text-xs font-semibold text-navy">
                              {booking.serviceCategory}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <span>Date: {booking.preferredDate}</span>
                            <span>&bull;</span>
                            <span>Slot: {booking.timeSlot.split(' ')[0]}</span>
                            <span>&bull;</span>
                            <span>Area: {booking.neighborhood}</span>
                          </div>

                          {booking.assignedTechnicianName && (
                            <p className="text-[11px] text-navy font-medium pt-1">
                              Assigned: {booking.assignedTechnicianName} {booking.assignedTechnicianPhone ? `(${booking.assignedTechnicianPhone})` : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center sm:flex-col items-end gap-2 shrink-0">
                          {renderStatusBadge(booking.status)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={onOpenCustomerDashboard}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-navy hover:bg-navy-raised text-white font-bold text-xs sm:text-sm shadow-sm transition-colors min-h-[40px] cursor-pointer"
                    >
                      <span>Manage All Bookings</span>
                    </button>

                    <a
                      href="#booking"
                      className="text-xs font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:text-navy/80"
                    >
                      + Book another repair
                    </a>
                  </div>
                </div>
              ) : (
                /* No bookings yet state */
                <div className="text-center py-6">
                  <h4 className="text-sm font-bold text-navy mb-1">
                    No active bookings found
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto mb-4">
                    You haven&apos;t submitted any service requests yet. Book electrical or plumbing repair for your Chirala home below.
                  </p>
                  <a
                    href="#booking"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-navy hover:bg-navy-raised text-white font-bold text-xs sm:text-sm shadow-sm transition-colors min-h-[40px]"
                  >
                    <span>Book a Service</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Logged-out Visitor Prompt */
            <div className="border border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-bold text-navy mb-2">
                Have an existing booking?
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Sign in with your mobile number to view active bookings and service history.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenCustomerAuth}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-navy hover:bg-navy-raised text-white font-bold text-sm shadow-sm transition-colors cursor-pointer min-h-[44px]"
                >
                  <span>Sign In</span>
                </button>
                <a
                  href="#booking"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-white text-navy border border-slate-500 font-semibold text-sm hover:bg-slate-100 hover:border-navy/40 transition-colors min-h-[44px]"
                >
                  Book New Service
                </a>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
