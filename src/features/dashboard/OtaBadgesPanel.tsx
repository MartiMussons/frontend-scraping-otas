import { useTourSelection } from "@/features/tours/TourSelectionContext";
import { useSourcesQuery } from "@/features/dashboard/useDashboardQueries";

export function OtaBadgesPanel() {
  const { selectedTourCode } = useTourSelection();
  const { data, isLoading, isError, refetch } = useSourcesQuery(selectedTourCode);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">OTA Sources</h2>

      {!selectedTourCode ? <p className="mt-3 text-sm text-slate-600">Select a tour to load sources.</p> : null}

      {selectedTourCode && isLoading ? <div className="mt-3 h-10 w-full animate-pulse rounded-md bg-slate-200" /> : null}

      {selectedTourCode && isError ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">Failed to load OTA sources.</p>
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

      {selectedTourCode && !isLoading && !isError && data && data.length === 0 ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No sources found.</p>
      ) : null}

      {selectedTourCode && !isLoading && !isError && data && data.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {data.map((source) => (
            <li key={source.id}>
              <a
                href={source.product_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {source.ota_name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
