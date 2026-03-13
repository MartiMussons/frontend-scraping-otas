import { useViatorListingQuery } from "@/features/dashboard/useDashboardQueries";
import type { ViatorTourCard } from "@/types/market";
import { formatUtcToLocal } from "@/utils/datetime";

export function ViatorListingPanel() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useViatorListingQuery();

  const snapshotAge = dataUpdatedAt
    ? Math.floor((Date.now() - dataUpdatedAt) / (1000 * 60 * 60))
    : null;

  return (
    <section className="mt-4 rounded border border-slate-300 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#172753" }}
          />
          <h2 className="text-xl font-semibold text-slate-800">Viator — Listing Snapshot</h2>
        </div>

        {data && data.length > 0 ? (
          <div className="flex items-center gap-3">
            {snapshotAge !== null && snapshotAge >= 24 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                ⚠ Snapshot older than 24 h
              </span>
            ) : null}
            <span className="text-xs text-slate-500">
              Captured: {data[0] ? formatUtcToLocal(data[0].captured_at) : "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {data.length} tours
            </span>
          </div>
        ) : null}
      </header>

      <div className="px-4 py-3">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3">
            <div>
              <p className="text-sm font-medium text-amber-800">Viator listing not available</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Run{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                  python -m scraping.viator.listing_scraper --no-headless
                </code>{" "}
                and make sure the{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                  GET /viator/listing
                </code>{" "}
                endpoint is running.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && (!data || data.length === 0) ? (
          <p className="text-sm text-slate-600">
            No Viator listing snapshot found. Run the listing scraper and restart the endpoint.
          </p>
        ) : null}

        {!isLoading && !isError && data && data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((tour) => (
              <ViatorTourCardItem key={tour.url} tour={tour} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ViatorTourCardItemProps {
  tour: ViatorTourCard;
}

function ViatorTourCardItem({ tour }: ViatorTourCardItemProps) {
  const price = tour.price_eur !== null ? Number(tour.price_eur) : null;
  const rating = tour.rating !== null ? Number(tour.rating) : null;
  const reviews = tour.reviews !== null ? Number(tour.reviews) : null;

  return (
    <article className="flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50 p-3 transition-shadow hover:shadow-md">
      <div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tour.badges.map((badge) => (
            <BadgeChip key={badge} label={badge} />
          ))}
        </div>

        <a
          href={tour.url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm font-semibold leading-snug text-slate-800 hover:text-blue-700 hover:underline"
        >
          {tour.name}
        </a>

        {tour.duration ? (
          <p className="mt-1 text-xs text-slate-500">{tour.duration}</p>
        ) : null}

        {rating !== null || reviews !== null ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
            {rating !== null ? (
              <span className="flex items-center gap-0.5 font-medium text-amber-600">
                ★ {rating.toFixed(1)}
              </span>
            ) : null}
            {reviews !== null ? (
              <span className="text-slate-400">({reviews.toLocaleString()} reviews)</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between">
        {price !== null ? (
          <span className="text-base font-bold text-slate-900">from €{price}</span>
        ) : (
          <span className="text-xs text-slate-400">Price N/A</span>
        )}
        <a
          href={tour.url}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-[#172753] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          View on Viator
        </a>
      </div>
    </article>
  );
}

interface BadgeChipProps {
  label: string;
}

function BadgeChip({ label }: BadgeChipProps) {
  const isPopular =
    label.toLowerCase().includes("best seller") ||
    label.toLowerCase().includes("bestseller") ||
    label.toLowerCase().includes("likely to sell");

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
        isPopular
          ? "bg-orange-100 text-orange-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}
