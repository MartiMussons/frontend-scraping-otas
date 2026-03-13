import { HORIZON_OPTIONS } from "@/features/dashboard/constants";
import { useHorizonSelection } from "@/features/dashboard/HorizonSelectionContext";

export function HorizonTabs() {
  const { selectedHorizon, setSelectedHorizon } = useHorizonSelection();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Horizon (days)</h2>
      <div className="flex flex-wrap gap-2">
        {HORIZON_OPTIONS.map((horizon) => {
          const isActive = selectedHorizon === horizon;

          return (
            <button
              key={horizon}
              type="button"
              onClick={() => setSelectedHorizon(horizon)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {horizon}
            </button>
          );
        })}
      </div>
    </section>
  );
}
