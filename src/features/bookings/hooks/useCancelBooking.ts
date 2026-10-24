import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bffFetch } from '@/lib/bffClient';

interface CancelBookingPayload {
  bookingId: string;
  reason: string;
  expectedVersion: number;
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason, expectedVersion }: CancelBookingPayload) => {
      return bffFetch(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { reason, expectedVersion },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
