import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HORIZON_OPTIONS, KNOWN_OTA_NAMES, otaColor, otaLabel } from "@/features/dashboard/constants";
import { useHorizonSelection } from "@/features/dashboard/HorizonSelectionContext";
import {
  useLatestAvailabilityQuery,
  useLatestPricesQuery,
  usePriceTimeseriesQuery,
  useSourcesQuery,
} from "@/features/dashboard/useDashboardQueries";
import { ViatorListingPanel } from "@/features/dashboard/ViatorListingPanel";
import { useTourSelection } from "@/features/tours/TourSelectionContext";
import { useToursQuery } from "@/features/tours/useToursQuery";
import type { AvailabilityPointResponse, PricePointResponse } from "@/types/market";
import { formatUtcToLocal } from "@/utils/datetime";
import { formatCurrency, parseDecimalToNumber } from "@/utils/number";

const CHART_COLORS = ["#2563eb", "#f97316", "#16a34a", "#7c3aed", "#dc2626"];

type PriceLevel = "low" | "medium" | "high" | "none";

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getPriceValue(item: PricePointResponse): number | null {
  return parseDecimalToNumber(item.final_price ?? item.list_price);
}

function buildSnapshotKey(params: {
  targetDate: string;
  optionName: string | null;
  slotTime: string | null;
  otaName: string | null;
}): string {
  return [params.targetDate, params.optionName ?? "", params.slotTime ?? "", params.otaName ?? ""].join("|");
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isoDateFromObservedAt(observedAt: string): string {
  return observedAt.slice(0, 10);
}

export function DashboardPage() {
  const { selectedTourCode, setSelectedTourCode } = useTourSelection();
  const { selectedHorizon, setSelectedHorizon } = useHorizonSelection();

  const { data: tours, isLoading: isToursLoading, isError: isToursError, refetch: refetchTours } = useToursQuery();
  const { data: sources } = useSourcesQuery(selectedTourCode);
  const [selectedOtas, setSelectedOtas] = useState<string[]>([]);
  const singleSelectedOta = selectedOtas.length === 1 ? selectedOtas[0] : undefined;

  const todayDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const fromDate = useMemo(() => formatDateLocal(todayDate), [todayDate]);
  const toDate = useMemo(() => formatDateLocal(addDays(todayDate, selectedHorizon)), [todayDate, selectedHorizon]);

  const {
    data: latestPrices,
    isLoading: isPricesLoading,
    isError: isPricesError,
    refetch: refetchPrices,
  } = useLatestPricesQuery(selectedTourCode, selectedHorizon, selectedHorizon, singleSelectedOta);
  const {
    data: latestAvailability,
    isLoading: isAvailabilityLoading,
    isError: isAvailabilityError,
    refetch: refetchAvailability,
  } = useLatestAvailabilityQuery(selectedTourCode, selectedHorizon, selectedHorizon, singleSelectedOta);

  const {
    data: priceTimeseries,
    isLoading: isTimeseriesLoading,
    isError: isTimeseriesError,
    refetch: refetchTimeseries,
  } = usePriceTimeseriesQuery(selectedTourCode, selectedHorizon, fromDate || undefined, toDate || undefined);

  useEffect(() => {
    if (!tours || tours.length === 0) return;

    const isSelectionValid = selectedTourCode
      ? tours.some((tour) => tour.internal_code === selectedTourCode)
      : false;

    if (!isSelectionValid) {
      setSelectedTourCode(tours[0].internal_code);
    }
  }, [selectedTourCode, setSelectedTourCode, tours]);

  const otaOptions = useMemo(() => {
    // Always include all registered OTAs (GYG + Viator + …) so they appear in the
    // filter immediately, even before any data has been scraped for them.
    const set = new Set<string>(KNOWN_OTA_NAMES);

    for (const source of sources ?? []) {
      if (source.ota_name) set.add(source.ota_name);
    }

    for (const item of latestPrices?.items ?? []) {
      if (item.ota_name) set.add(item.ota_name);
    }

    for (const item of latestAvailability?.items ?? []) {
      if (item.ota_name) set.add(item.ota_name);
    }

    for (const item of priceTimeseries?.items ?? []) {
      if (item.ota_name) set.add(item.ota_name);
    }

    return [...set].sort((a, b) => {
      // Registered OTAs come first in their configured order.
      const aIndex = KNOWN_OTA_NAMES.indexOf(a);
      const bIndex = KNOWN_OTA_NAMES.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [latestAvailability?.items, latestPrices?.items, priceTimeseries?.items, sources]);

  const [expandedPriceRows, setExpandedPriceRows] = useState<string[]>([]);
  const [showAllTours, setShowAllTours] = useState(false);
  const [tourSearchTerm, setTourSearchTerm] = useState("");

  useEffect(() => {
    if (otaOptions.length === 0) {
      setSelectedOtas([]);
      return;
    }

    setSelectedOtas((previous) => {
      if (previous.length === 0) return otaOptions;

      const filtered = previous.filter((ota) => otaOptions.includes(ota));
      return filtered.length === 0 ? otaOptions : filtered;
    });
  }, [otaOptions]);

  const filteredLatestPrices = useMemo(() => {
    const items = latestPrices?.items ?? [];
    if (selectedOtas.length === 0) return items;
    return items.filter((item) => item.ota_name && selectedOtas.includes(item.ota_name));
  }, [latestPrices?.items, selectedOtas]);

  const filteredLatestAvailability = useMemo(() => {
    const items = latestAvailability?.items ?? [];
    if (selectedOtas.length === 0) return items;
    return items.filter((item) => item.ota_name && selectedOtas.includes(item.ota_name));
  }, [latestAvailability?.items, selectedOtas]);

  const filteredTimeseries = useMemo(() => {
    const items = priceTimeseries?.items ?? [];
    if (selectedOtas.length === 0) return items;
    return items.filter((item) => item.ota_name && selectedOtas.includes(item.ota_name));
  }, [priceTimeseries?.items, selectedOtas]);

  const avgPriceValue = useMemo(() => {
    const values = filteredLatestPrices
      .map((item) => getPriceValue(item))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return null;

    return values.reduce((acc, value) => acc + value, 0) / values.length;
  }, [filteredLatestPrices]);

  const primaryCurrency = useMemo(() => {
    return filteredLatestPrices[0]?.currency_code ?? latestPrices?.items[0]?.currency_code ?? "EUR";
  }, [filteredLatestPrices, latestPrices?.items]);

  const availabilityRate = useMemo(() => {
    if (filteredLatestAvailability.length === 0) return null;

    const available = filteredLatestAvailability.filter((item) => item.is_available).length;
    return (available / filteredLatestAvailability.length) * 100;
  }, [filteredLatestAvailability]);

  const activeListings = useMemo(() => {
    const uniqueSources = new Set(filteredLatestPrices.map((item) => item.ota_source_id));
    return uniqueSources.size;
  }, [filteredLatestPrices]);

  const groupedPriceRows = useMemo(() => {
    const availabilityByKey = new Map(
      filteredLatestAvailability.map((item) => [
        buildSnapshotKey({
          targetDate: item.target_date,
          optionName: item.option_name,
          slotTime: item.slot_time,
          otaName: item.ota_name,
        }),
        item,
      ]),
    );

    const grouped = new Map<
      string,
      {
        groupKey: string;
        otaName: string | null;
        optionName: string | null;
        currencyCode: string;
        prices: Array<{ targetDate: string; value: number }>;
        availabilityItems: AvailabilityPointResponse[];
        popularityCountYesterday: number | null;
      }
    >();

    [...filteredLatestPrices]
      .sort((a, b) => {
        const priceA = getPriceValue(a);
        const priceB = getPriceValue(b);

        if (priceA !== null && priceB !== null && priceA !== priceB) {
          return priceA - priceB;
        }

        if (a.target_date !== b.target_date) {
          return a.target_date.localeCompare(b.target_date);
        }

        return (a.option_name ?? "").localeCompare(b.option_name ?? "");
      })
      .forEach((priceItem) => {
        const groupKey = [
          priceItem.ota_name ?? "",
          priceItem.option_name ?? "",
          priceItem.slot_time ?? "",
          priceItem.language_code ?? "",
        ].join("|");

        const group = grouped.get(groupKey) ?? {
          groupKey,
          otaName: priceItem.ota_name,
          optionName: priceItem.option_name,
          currencyCode: priceItem.currency_code,
          prices: [],
          availabilityItems: [],
          popularityCountYesterday: null,
        };

        const numericPrice = getPriceValue(priceItem);
        if (numericPrice !== null) {
          group.prices.push({ targetDate: priceItem.target_date, value: numericPrice });
        }

        const key = buildSnapshotKey({
          targetDate: priceItem.target_date,
          optionName: priceItem.option_name,
          slotTime: priceItem.slot_time,
          otaName: priceItem.ota_name,
        });

        const availability = availabilityByKey.get(key);
        if (availability) {
          group.availabilityItems.push(availability);
        }

        if (typeof priceItem.popularity_count_yesterday === "number") {
          group.popularityCountYesterday =
            group.popularityCountYesterday === null
              ? priceItem.popularity_count_yesterday
              : Math.max(group.popularityCountYesterday, priceItem.popularity_count_yesterday);
        }

        grouped.set(groupKey, group);
      });

    return [...grouped.values()]
      .map((group) => {
        const avgPrice =
          group.prices.length > 0
            ? group.prices.reduce((acc, item) => acc + item.value, 0) / group.prices.length
            : null;

        const availabilityRate =
          group.availabilityItems.length > 0
            ? group.availabilityItems.filter((item) => item.is_available).length / group.availabilityItems.length
            : null;

        const orderedPrices = [...group.prices].sort((a, b) => a.targetDate.localeCompare(b.targetDate));

        return {
          groupKey: group.groupKey,
          otaName: group.otaName,
          optionName: group.optionName,
          avgPrice,
          currencyCode: group.currencyCode,
          daysCovered: orderedPrices.length,
          availabilityRate,
          popularityCountYesterday: group.popularityCountYesterday,
          orderedPrices,
        };
      })
      .sort((a, b) => {
        if (a.avgPrice !== null && b.avgPrice !== null && a.avgPrice !== b.avgPrice) {
          return a.avgPrice - b.avgPrice;
        }

        if (a.otaName !== b.otaName) {
          return (a.otaName ?? "").localeCompare(b.otaName ?? "");
        }

        return (a.optionName ?? "").localeCompare(b.optionName ?? "");
      })
      .map((group) => {
        const priceTooltip =
          group.orderedPrices.length > 0
            ? group.orderedPrices
                .map((item) => `${item.targetDate}: ${formatCurrency(item.value, group.currencyCode)}`)
                .join("\n")
            : "No prices available";

        return {
          ...group,
          priceTooltip,
        };
      });
  }, [filteredLatestAvailability, filteredLatestPrices]);

  const normalizedTourSearchTerm = useMemo(() => tourSearchTerm.trim().toLowerCase(), [tourSearchTerm]);

  const searchFilteredGroupedRows = useMemo(() => {
    if (!normalizedTourSearchTerm) return groupedPriceRows;

    return groupedPriceRows.filter((row) =>
      (row.optionName ?? "").toLowerCase().includes(normalizedTourSearchTerm),
    );
  }, [groupedPriceRows, normalizedTourSearchTerm]);

  const popularPriceRows = useMemo(
    () => searchFilteredGroupedRows.filter((row) => row.popularityCountYesterday !== null),
    [searchFilteredGroupedRows],
  );

  const priceRows = useMemo(
    () => (showAllTours ? searchFilteredGroupedRows.slice(0, 30) : popularPriceRows.slice(0, 30)),
    [popularPriceRows, searchFilteredGroupedRows, showAllTours],
  );

  const priceStats = useMemo(() => {
    const values = groupedPriceRows
      .map((row) => row.avgPrice)
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return {
        cheapest: null,
        highest: null,
        spread: null,
      };
    }

    const cheapest = Math.min(...values);
    const highest = Math.max(...values);

    return {
      cheapest,
      highest,
      spread: highest - cheapest,
    };
  }, [groupedPriceRows]);

  const availabilityCalendar = useMemo(() => {
    const startDate = todayDate;
    const totalDays = Math.max(selectedHorizon, 0) + 1;

    const pricesByDate = new Map<string, number[]>();
    for (const item of filteredLatestPrices) {
      const value = getPriceValue(item);
      if (value === null) continue;

      const list = pricesByDate.get(item.target_date) ?? [];
      list.push(value);
      pricesByDate.set(item.target_date, list);
    }

    const days: Array<{
      date: string;
      dayNumber: number;
      monthLabel: string;
      priceLevel: PriceLevel;
      avgPrice: number | null;
    }> = [];

    const allDailyAvgPrices = Array.from(pricesByDate.values())
      .map((values) => values.reduce((acc, value) => acc + value, 0) / values.length)
      .filter((value) => Number.isFinite(value));

    const minDailyPrice = allDailyAvgPrices.length > 0 ? Math.min(...allDailyAvgPrices) : null;
    const maxDailyPrice = allDailyAvgPrices.length > 0 ? Math.max(...allDailyAvgPrices) : null;

    for (let index = 0; index < totalDays; index += 1) {
      const date = addDays(startDate, index);
      const iso = formatDateLocal(date);
      const dayPrices = pricesByDate.get(iso) ?? [];
      const avgPrice = dayPrices.length > 0 ? dayPrices.reduce((acc, value) => acc + value, 0) / dayPrices.length : null;

      let priceLevel: PriceLevel = "none";

      if (avgPrice !== null && minDailyPrice !== null && maxDailyPrice !== null) {
        if (maxDailyPrice === minDailyPrice) {
          priceLevel = "medium";
        } else {
          const normalized = (avgPrice - minDailyPrice) / (maxDailyPrice - minDailyPrice);
          if (normalized < 0.34) {
            priceLevel = "low";
          } else if (normalized < 0.67) {
            priceLevel = "medium";
          } else {
            priceLevel = "high";
          }
        }
      }

      days.push({
        date: iso,
        dayNumber: date.getDate(),
        monthLabel: date.toLocaleDateString(undefined, { month: "short" }),
        priceLevel,
        avgPrice,
      });
    }

    const monthSections: Array<{
      monthKey: string;
      monthLabel: string;
      leadingEmpty: number;
      days: Array<{
        date: string;
        dayNumber: number;
        monthLabel: string;
        priceLevel: PriceLevel;
        avgPrice: number | null;
      }>;
    }> = [];

    let currentSection: {
      monthKey: string;
      monthLabel: string;
      leadingEmpty: number;
      days: Array<{
        date: string;
        dayNumber: number;
        monthLabel: string;
        priceLevel: PriceLevel;
        avgPrice: number | null;
      }>;
    } | null = null;

    for (const day of days) {
      const dayDate = new Date(`${day.date}T00:00:00`);
      const monthKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}`;

      if (!currentSection || currentSection.monthKey !== monthKey) {
        if (currentSection) monthSections.push(currentSection);

        currentSection = {
          monthKey,
          monthLabel: dayDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          leadingEmpty: dayDate.getDay(),
          days: [],
        };
      }

      currentSection.days.push(day);
    }

    if (currentSection) {
      monthSections.push(currentSection);
    }

    return {
      monthLabel: `From ${fromDate} to ${toDate}`,
      days,
      monthSections,
    };
  }, [filteredLatestPrices, fromDate, selectedHorizon, toDate, todayDate]);

  const chartData = useMemo(() => {
    const sourceItems = selectedHorizon > 0 ? filteredLatestPrices : filteredTimeseries;
    const byDate = new Map<string, Record<string, number[]>>();

    for (const item of sourceItems) {
      if (!item.ota_name) continue;
      const value = getPriceValue(item);
      if (value === null) continue;

      const day = selectedHorizon > 0 ? item.target_date : isoDateFromObservedAt(item.observed_at);
      const dateBucket = byDate.get(day) ?? {};
      const otaBucket = dateBucket[item.ota_name] ?? [];

      otaBucket.push(value);
      dateBucket[item.ota_name] = otaBucket;
      byDate.set(day, dateBucket);
    }

    const rows = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, otaMap]) => {
        const row: Record<string, number | string | null> = {
          date,
          label: dayLabel(date),
        };

        for (const ota of selectedOtas) {
          const values = otaMap[ota] ?? [];
          row[ota] = values.length === 0 ? null : values.reduce((acc, value) => acc + value, 0) / values.length;
        }

        return row;
      });

    return rows;
  }, [filteredLatestPrices, filteredTimeseries, selectedHorizon, selectedOtas]);

  const otaPriceSummary = useMemo(() => {
    const summary = new Map<string, { count: number; total: number }>();

    for (const item of filteredLatestPrices) {
      if (!item.ota_name) continue;
      const value = getPriceValue(item);
      if (value === null) continue;

      const previous = summary.get(item.ota_name) ?? { count: 0, total: 0 };
      summary.set(item.ota_name, {
        count: previous.count + 1,
        total: previous.total + value,
      });
    }

    return [...summary.entries()].map(([ota, value]) => ({
      ota,
      average: value.total / value.count,
    }));
  }, [filteredLatestPrices]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <h1 className="text-3xl font-semibold tracking-tight">Competitive Intelligence Dashboard</h1>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <section className="rounded-md border border-slate-300 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="tour-select">
                Select Tour:
              </label>
              <select
                id="tour-select"
                className="min-w-[320px] rounded border border-slate-300 px-3 py-2 text-sm"
                value={selectedTourCode ?? ""}
                onChange={(event) => setSelectedTourCode(event.target.value)}
                disabled={isToursLoading || !tours || tours.length === 0}
              >
                {(tours ?? []).map((tour) => (
                  <option key={tour.id} value={tour.internal_code}>
                    {tour.attraction} - {tour.variant}
                  </option>
                ))}
              </select>
              {isToursError ? (
                <button
                  type="button"
                  onClick={() => {
                    void refetchTours();
                  }}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                >
                  Retry
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Horizon:</span>
              <div className="flex items-center gap-1 rounded border border-slate-300 bg-slate-50 p-1">
                {HORIZON_OPTIONS.map((option) => {
                  const active = option === selectedHorizon;
                  const label = option === 0 ? "Today" : `+${option} Days`;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedHorizon(option)}
                      className={`rounded px-3 py-1 text-sm font-medium ${
                        active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">OTAs:</span>
              <div className="flex flex-wrap items-center gap-2 rounded border border-slate-300 bg-slate-50 px-2 py-1.5">
                {otaOptions.length === 0 ? <span className="text-xs text-slate-500">No OTAs</span> : null}
                {otaOptions.map((ota) => (
                  <label key={ota} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedOtas.includes(ota)}
                      onChange={(event) => {
                        setSelectedOtas((previous) => {
                          if (event.target.checked) return [...new Set([...previous, ota])];
                          return previous.filter((value) => value !== ota);
                        });
                      }}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: otaColor(ota) }}
                    />
                    {otaLabel(ota)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-4">
          <MetricCard
            title="Average Price"
            value={avgPriceValue !== null ? formatCurrency(avgPriceValue, primaryCurrency) : "N/A"}
            loading={isPricesLoading}
            subtitle={`Observed ${formatUtcToLocal(latestPrices?.observed_at ?? null)}`}
            details={selectedOtas.map((ota) => {
              const entry = otaPriceSummary.find((item) => item.ota === ota);
              return entry
                ? `${otaLabel(ota)}: ${formatCurrency(entry.average, primaryCurrency)}`
                : `${otaLabel(ota)}: N/A`;
            })}
            onRetry={
              isPricesError
                ? () => {
                    void refetchPrices();
                  }
                : undefined
            }
          />

          <MetricCard
            title="Cheapest Price"
            value={priceStats.cheapest !== null ? formatCurrency(priceStats.cheapest, primaryCurrency) : "N/A"}
            loading={isPricesLoading}
            subtitle="Lowest latest snapshot price"
            details={[
              `Highest: ${priceStats.highest !== null ? formatCurrency(priceStats.highest, primaryCurrency) : "N/A"}`,
              `Spread: ${priceStats.spread !== null ? formatCurrency(priceStats.spread, primaryCurrency) : "N/A"}`,
            ]}
            onRetry={
              isPricesError
                ? () => {
                    void refetchPrices();
                  }
                : undefined
            }
          />

          <MetricCard
            title="Availability Rate"
            value={availabilityRate !== null ? `${availabilityRate.toFixed(0)}%` : "N/A"}
            loading={isAvailabilityLoading}
            subtitle={`Observed ${formatUtcToLocal(latestAvailability?.observed_at ?? null)}`}
            details={selectedOtas.map((ota) => {
              const otaItems = filteredLatestAvailability.filter((item) => item.ota_name === ota);
              if (otaItems.length === 0) return `${otaLabel(ota)}: N/A`;
              const available = otaItems.filter((item) => item.is_available).length;
              const rate = (available / otaItems.length) * 100;
              return `${otaLabel(ota)}: ${rate.toFixed(0)}%`;
            })}
            onRetry={
              isAvailabilityError
                ? () => {
                    void refetchAvailability();
                  }
                : undefined
            }
          />

          <MetricCard
            title="Active Listings"
            value={String(activeListings)}
            loading={isPricesLoading}
            subtitle="Unique OTA sources in latest price snapshot"
            details={selectedOtas.map((ota) => {
              const count = new Set(
                filteredLatestPrices
                  .filter((item) => item.ota_name === ota)
                  .map((item) => item.ota_source_id),
              ).size;
              return `${otaLabel(ota)}: ${count}`;
            })}
            onRetry={
              isPricesError
                ? () => {
                    void refetchPrices();
                  }
                : undefined
            }
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded border border-slate-300 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <h2 className="text-xl font-semibold text-slate-800">Popular Tours</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tourSearchTerm}
                  onChange={(event) => setTourSearchTerm(event.target.value)}
                  placeholder="Search tour name (e.g. sagrada familia)"
                  className="w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowAllTours((previous) => !previous);
                  }}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                >
                  {showAllTours ? "Show Popular Tours" : "See All Tours"}
                </button>
              </div>
            </header>
            <div className="overflow-x-auto">
              {isPricesLoading ? <div className="h-44 animate-pulse bg-slate-100" /> : null}
              {!isPricesLoading && isPricesError ? (
                <div className="p-4">
                  <p className="text-sm text-red-700">Failed to load popular tours.</p>
                  <button
                    type="button"
                    onClick={() => {
                      void refetchPrices();
                    }}
                    className="mt-2 rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {!isPricesLoading && !isPricesError && priceRows.length === 0 ? (
                <p className="p-4 text-sm text-slate-600">
                  {showAllTours
                    ? "No tours match your search for this tour/horizon."
                    : "No popular tours match your search for this tour/horizon."}
                </p>
              ) : null}
              {!isPricesLoading && !isPricesError && priceRows.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-2">OTA</th>
                      <th className="px-4 py-2">Tour</th>
                      <th className="px-4 py-2">Characteristics</th>
                      <th className="px-4 py-2">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceRows.map((row) => {
                      const isExpanded = expandedPriceRows.includes(row.groupKey);
                      const detailParams = new URLSearchParams();

                      if (selectedTourCode) detailParams.set("tour_code", selectedTourCode);
                      if (fromDate) detailParams.set("from_date", fromDate);
                      if (toDate) detailParams.set("to_date", toDate);
                      if (row.otaName) detailParams.set("ota_name", row.otaName);
                      if (row.optionName) detailParams.set("option_name", row.optionName);

                      const detailHref = `/availability?${detailParams.toString()}`;

                      return (
                        <Fragment key={row.groupKey}>
                          <tr className="border-t border-slate-100">
                            <td className="px-4 py-2 font-medium text-slate-700">{row.otaName ? otaLabel(row.otaName) : "N/A"}</td>
                            <td className="px-4 py-2 text-slate-700">
                              <div className="flex items-center gap-2">
                                <a
                                  href={detailHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir detalle de horarios en nueva pestaña"
                                  className="max-w-[420px] truncate text-left text-blue-700 underline-offset-2 hover:underline"
                                >
                                  {row.optionName ?? "N/A"}
                                </a>
                                <button
                                  type="button"
                                  title={row.priceTooltip}
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                                  onClick={() => {
                                    setExpandedPriceRows((previous) =>
                                      previous.includes(row.groupKey)
                                        ? previous.filter((value) => value !== row.groupKey)
                                        : [...previous, row.groupKey],
                                    );
                                  }}
                                >
                                  Ver precios
                                </button>
                              </div>
                              {row.popularityCountYesterday !== null ? (
                                <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                  Popular ({row.popularityCountYesterday} reservas ayer)
                                </span>
                              ) : (
                                <span className="ml-2 text-xs text-slate-500">No popularity signal</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-700">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{row.daysCovered} days</span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                                  Availability: {row.availabilityRate !== null ? `${(row.availabilityRate * 100).toFixed(0)}%` : "N/A"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-slate-800">
                              {row.avgPrice !== null ? formatCurrency(row.avgPrice, row.currencyCode) : "N/A"}
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr className="border-t border-slate-100 bg-slate-50">
                              <td colSpan={4} className="px-4 py-3">
                                <div className="grid gap-1 text-xs text-slate-700 md:grid-cols-2 lg:grid-cols-3">
                                  {row.orderedPrices.length === 0 ? <span>No prices available.</span> : null}
                                  {row.orderedPrices.map((item) => (
                                    <span key={`${row.groupKey}-${item.targetDate}`}>
                                      {item.targetDate}: {formatCurrency(item.value, row.currencyCode)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
            </div>
          </article>

          <article className="rounded border border-slate-300 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-4 py-2 text-xl font-semibold text-slate-800">
              <Link to="/availability" className="hover:underline">
                Availability Overview
              </Link>
            </header>
            <div className="px-4 py-3">
              {isAvailabilityLoading ? <div className="h-44 animate-pulse rounded bg-slate-100" /> : null}
              {!isAvailabilityLoading && isAvailabilityError ? (
                <div>
                  <p className="text-sm text-red-700">Failed to load availability data.</p>
                  <button
                    type="button"
                    onClick={() => {
                      void refetchAvailability();
                    }}
                    className="mt-2 rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {!isAvailabilityLoading && !isAvailabilityError && availabilityCalendar.days.every((day) => day.priceLevel === "none") ? (
                <p className="text-sm text-slate-600">No snapshot yet for this tour/horizon.</p>
              ) : null}
              {!isAvailabilityLoading && !isAvailabilityError && availabilityCalendar.days.some((day) => day.priceLevel !== "none") ? (
                <>
                  <div className="mb-3 text-center text-lg font-semibold text-slate-700">{availabilityCalendar.monthLabel}</div>
                  <div className="space-y-4">
                    {availabilityCalendar.monthSections.map((section) => (
                      <div key={section.monthKey}>
                        <p className="mb-2 text-center text-base font-semibold text-slate-700">{section.monthLabel}</p>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
                          <div>S</div>
                          <div>M</div>
                          <div>T</div>
                          <div>W</div>
                          <div>T</div>
                          <div>F</div>
                          <div>S</div>
                        </div>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                          {Array.from({ length: section.leadingEmpty }).map((_, index) => (
                            <div key={`empty-${section.monthKey}-${index}`} className="h-8 rounded bg-transparent" />
                          ))}
                          {section.days.map((day) => (
                            <div
                              key={day.date}
                              title={
                                day.avgPrice !== null
                                  ? `${day.date} · Avg price: ${formatCurrency(day.avgPrice, primaryCurrency)}`
                                  : `${day.date} · Avg price: N/A`
                              }
                              className={`flex h-8 items-center justify-center rounded text-sm font-medium ${getPriceClassName(day.priceLevel)}`}
                            >
                              {day.dayNumber}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                    <LegendDot color="bg-green-500" label="Low Price" />
                    <LegendDot color="bg-amber-400" label="Mid Price" />
                    <LegendDot color="bg-red-500" label="High Price" />
                  </div>
                </>
              ) : null}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded border border-slate-300 bg-white shadow-sm">
          <header className="border-b border-slate-200 px-4 py-2 text-xl font-semibold text-slate-800">Price Trend Analysis</header>
          <div className="h-[340px] p-4">
            {isTimeseriesLoading ? <div className="h-full animate-pulse rounded bg-slate-100" /> : null}
            {!isTimeseriesLoading && isTimeseriesError ? (
              <div>
                <p className="text-sm text-red-700">Failed to load price trends.</p>
                <button
                  type="button"
                  onClick={() => {
                    void refetchTimeseries();
                  }}
                  className="mt-2 rounded bg-red-600 px-2 py-1 text-xs text-white"
                >
                  Retry
                </button>
              </div>
            ) : null}
            {!isTimeseriesLoading && !isTimeseriesError && chartData.length === 0 ? (
              <p className="text-sm text-slate-600">No snapshot yet for this tour/horizon.</p>
            ) : null}
            {!isTimeseriesLoading && !isTimeseriesError && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value !== "number") return "N/A";
                      return formatCurrency(value, primaryCurrency);
                    }}
                  />
                  <Legend />
                  {selectedOtas.map((ota, index) => (
                    <Line
                      key={ota}
                      type="monotone"
                      dataKey={ota}
                      name={otaLabel(ota)}
                      stroke={otaColor(ota, CHART_COLORS[index % CHART_COLORS.length])}
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </section>

        <ViatorListingPanel />
      </main>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  loading: boolean;
  details: string[];
  onRetry?: () => void;
}

function MetricCard({ title, value, subtitle, loading, details, onRetry }: MetricCardProps) {
  return (
    <article className="rounded border border-slate-300 bg-white p-4 shadow-sm">
      <h2 className="text-center text-2xl font-semibold text-slate-700">{title}</h2>
      {loading ? <div className="mt-4 h-12 animate-pulse rounded bg-slate-100" /> : <p className="mt-2 text-center text-5xl font-bold text-slate-800">{value}</p>}
      <p className="mt-2 text-center text-xs text-slate-500">{subtitle}</p>
      {details.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-slate-700">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 rounded bg-red-600 px-2 py-1 text-xs text-white">
          Retry
        </button>
      ) : null}
    </article>
  );
}

interface LegendDotProps {
  color: string;
  label: string;
}

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function getPriceClassName(level: PriceLevel): string {
  if (level === "low") return "bg-green-500 text-white";
  if (level === "medium") return "bg-amber-400 text-slate-900";
  if (level === "high") return "bg-red-500 text-white";
  return "bg-slate-200 text-slate-500";
}
