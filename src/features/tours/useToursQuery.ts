import { useQuery } from "@tanstack/react-query";

import { getTours } from "@/api/market";
import { toursQueryKeys } from "@/features/tours/queryKeys";

export function useToursQuery() {
  return useQuery({
    queryKey: toursQueryKeys.all,
    queryFn: ({ signal }) => getTours(signal),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
