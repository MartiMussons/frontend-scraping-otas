import { useEffect } from "react";

import { useTourSelection } from "@/features/tours/TourSelectionContext";
import { useToursQuery } from "@/features/tours/useToursQuery";

export function TourSelector() {
  const { selectedTourCode, setSelectedTourCode } = useTourSelection();
  const { data: tours, isLoading, isError, refetch } = useToursQuery();

  useEffect(() => {
    if (!tours || tours.length === 0) return;

    const hasSelected = selectedTourCode
      ? tours.some((tour) => tour.internal_code === selectedTourCode)
      : false;

    if (!hasSelected) {
      setSelectedTourCode(tours[0].internal_code);
    }
  }, [selectedTourCode, setSelectedTourCode, tours]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Monitored Tour</h2>
      </header>

      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded-md bg-slate-200" />
      ) : null}

      {isError ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">Failed to load tours.</p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && tours && tours.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No tours found.</div>
      ) : null}

      {!isLoading && !isError && tours && tours.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor="tour-selector" className="block text-sm font-medium text-slate-700">
            Tour
          </label>
          <select
            id="tour-selector"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={selectedTourCode ?? ""}
            onChange={(event) => {
              setSelectedTourCode(event.target.value);
            }}
          >
            {tours.map((tour) => (
              <option key={tour.id} value={tour.internal_code}>
                {tour.attraction} · {tour.variant} ({tour.city})
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </section>
  );
}
