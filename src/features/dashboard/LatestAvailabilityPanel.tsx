import { useMemo } from "react";

import { useHorizonSelection } from "@/features/dashboard/HorizonSelectionContext";
import { useLatestAvailabilityQuery } from "@/features/dashboard/useDashboardQueries";
import { useTourSelection } from "@/features/tours/TourSelectionContext";
import { formatUtcToLocal } from "@/utils/datetime";

export function LatestAvailabilityPanel() {
  const { selectedTourCode } = useTourSelection();
  const { selectedHorizon } = useHorizonSelection();
  const { data, isLoading, isError, refetch } = useLatestAvailabilityQuery(selectedTourCode, selectedHorizon);

  const summary = useMemo(() => {
    if (!data || data.items.length === 0) return null;

    const available = data.items.filter((item) => item.is_available).length;
    const unavailable = data.items.length - available;

    return {
      available,
      unavailable,
      total: data.items.length,
    };
  }, [data]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Latest Availability</h2>
          <p className="mt-1 text-xs text-slate-500">Observed: {formatUtcToLocal(data?.observed_at ?? null)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">H+{selectedHorizon}</span>
      </header>

      {!selectedTourCode ? <p className="mt-3 text-sm text-slate-600">Select a tour to load availability snapshot.</p> : null}

      {selectedTourCode && isLoading ? <div className="mt-3 h-20 w-full animate-pulse rounded-md bg-slate-200" /> : null}

      {selectedTourCode && isError ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">Failed to load latest availability.</p>
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

      {selectedTourCode && !isLoading && !isError && data && data.items.length === 0 ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          No latest availability snapshot available.
        </p>
      ) : null}

      {selectedTourCode && !isLoading && !isError && data && data.items.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Rows" value={String(summary?.total ?? 0)} />
          <Stat label="Available" value={String(summary?.available ?? 0)} />
          <Stat label="Unavailable" value={String(summary?.unavailable ?? 0)} />
        </div>
      ) : null}
    </section>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
