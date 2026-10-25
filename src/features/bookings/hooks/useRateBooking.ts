import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bffFetch } from '@/lib/bffClient';

interface RateBookingPayload {
  bookingId: string;
  rating: number; // 1 to 5
  reviewText?: string;
  expectedVersion: number;
}

export function useRateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, rating, reviewText, expectedVersion }: RateBookingPayload) => {
      return bffFetch(`/bookings/${bookingId}/rate`, {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { rating, reviewText, expectedVersion },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
