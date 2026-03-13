import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useHorizonSelection } from "@/features/dashboard/HorizonSelectionContext";
import {
  useAvailabilityDayDetailQuery,
  useAvailabilityHeatmapQuery,
  useLatestAvailabilityQuery,
  useSourcesQuery,
} from "@/features/dashboard/useDashboardQueries";
import { useTourSelection } from "@/features/tours/TourSelectionContext";
import { useToursQuery } from "@/features/tours/useToursQuery";
import { formatCurrency, parseDecimalToNumber } from "@/utils/number";

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: formatDateLocal(first),
    to: formatDateLocal(last),
  };
}

function getDaysAheadFromToday(targetYmd: string): number {
  const [year, month, day] = targetYmd.split("-").map(Number);
  if (!year || !month || !day) return 0;

  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(year, month - 1, day);
  const diffMs = target.getTime() - todayLocal.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  return Math.max(0, diffDays);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenizeNormalized(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function hasTokenOverlap(filterValue: string, candidateValue: string): boolean {
  const filterTokens = tokenizeNormalized(filterValue);
  const candidateTokens = new Set(tokenizeNormalized(candidateValue));

  if (filterTokens.length === 0 || candidateTokens.size === 0) return false;

  let overlapCount = 0;
  for (const token of filterTokens) {
    if (candidateTokens.has(token)) overlapCount += 1;
  }

  const minimumOverlap = Math.min(3, Math.max(1, Math.floor(filterTokens.length * 0.4)));
  return overlapCount >= minimumOverlap;
}

function matchesOptionFilter(filterValue: string, optionName?: string | null, detailTourName?: string | null): boolean {
  const normalizedFilter = normalizeText(filterValue);
  if (!normalizedFilter) return true;

  const normalizedDetail = normalizeText(detailTourName ?? "");

  // When detail_tour_name is available, use it as the authoritative match.
  // This prevents "sagrada familia" token bleed across different GYG listings.
  if (normalizedDetail) {
    if (normalizedDetail.includes(normalizedFilter) || normalizedFilter.includes(normalizedDetail)) {
      return true;
    }
    // Stricter token overlap (50%) to avoid false positives from shared generic words
    const filterTokens = tokenizeNormalized(normalizedFilter);
    const detailTokens = new Set(tokenizeNormalized(normalizedDetail));
    if (filterTokens.length === 0 || detailTokens.size === 0) return false;
    let overlapCount = 0;
    for (const token of filterTokens) {
      if (detailTokens.has(token)) overlapCount += 1;
    }
    const strictMinimum = Math.min(3, Math.max(1, Math.ceil(filterTokens.length * 0.5)));
    return overlapCount >= strictMinimum;
  }

  // No detail_tour_name (old data without enrichment): fall back to option_name matching
  const normalizedOption = normalizeText(optionName ?? "");
  if (normalizedOption.includes(normalizedFilter) || normalizedFilter.includes(normalizedOption)) {
    return true;
  }
  return hasTokenOverlap(normalizedFilter, normalizedOption);
}

export function AvailabilityDetailPage() {
  const [searchParams] = useSearchParams();
  const { selectedTourCode, setSelectedTourCode } = useTourSelection();
  const { selectedHorizon } = useHorizonSelection();
  const { data: tours } = useToursQuery();
  const { data: sources } = useSourcesQuery(selectedTourCode);

  const requestedTourCode = searchParams.get("tour_code")?.trim() ?? "";
  const requestedOta = searchParams.get("ota_name")?.trim() ?? "";
  const requestedOptionName = searchParams.get("option_name")?.trim() ?? "";
  const requestedFromDate = searchParams.get("from_date")?.trim() ?? "";
  const requestedToDate = searchParams.get("to_date")?.trim() ?? "";
  const requestedTargetDate = searchParams.get("target_date")?.trim() ?? "";

  const dateDefaults = useMemo(() => getMonthDateRange(), []);
  const [fromDate, setFromDate] = useState(requestedFromDate || dateDefaults.from);
  const [toDate, setToDate] = useState(requestedToDate || dateDefaults.to);
  const [selectedOtas, setSelectedOtas] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [optionFilter, setOptionFilter] = useState(requestedOptionName);
  const appliedRequestedTourCodeRef = useRef<string | null>(null);
  const appliedRequestedTargetDateRef = useRef<string | null>(null);
  const todayYmd = useMemo(() => formatDateLocal(new Date()), []);

  useEffect(() => {
    if (!tours || tours.length === 0) return;

    const requestedTourExists = requestedTourCode
      ? tours.some((tour) => tour.internal_code === requestedTourCode)
      : false;

    if (
      requestedTourExists
      && requestedTourCode
      && appliedRequestedTourCodeRef.current !== requestedTourCode
    ) {
      appliedRequestedTourCodeRef.current = requestedTourCode;
      setSelectedTourCode(requestedTourCode);
      return;
    }

    const isSelectionValid = selectedTourCode
      ? tours.some((tour) => tour.internal_code === selectedTourCode)
      : false;

    if (!isSelectionValid) {
      setSelectedTourCode(tours[0].internal_code);
    }
  }, [requestedTourCode, selectedTourCode, setSelectedTourCode, tours]);

  const otaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const source of sources ?? []) {
      if (source.ota_name) set.add(source.ota_name);
    }

    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sources]);

  useEffect(() => {
    if (otaOptions.length === 0) {
      setSelectedOtas([]);
      return;
    }

    setSelectedOtas((previous) => {
      if (previous.length === 0) {
        if (requestedOta && otaOptions.includes(requestedOta)) {
          return [requestedOta];
        }

        return otaOptions;
      }

      const filtered = previous.filter((ota) => otaOptions.includes(ota));
      return filtered.length === 0 ? otaOptions : filtered;
    });
  }, [otaOptions, requestedOta]);

  const singleSelectedOta = selectedOtas.length === 1 ? selectedOtas[0] : undefined;

  const latestRangeDays = useMemo(() => getDaysAheadFromToday(toDate), [toDate]);

  const { data: latestAvailabilityFallback } = useLatestAvailabilityQuery(
    selectedTourCode,
    selectedHorizon,
    latestRangeDays,
    singleSelectedOta,
  );

  const { data: heatmap, isLoading: isHeatmapLoading, isError: isHeatmapError } = useAvailabilityHeatmapQuery(
    selectedTourCode,
    {
      otaName: singleSelectedOta,
      fromDate,
      toDate,
    },
  );

  const preferredDateForFilter = useMemo(() => {
    const normalizedFilter = optionFilter.trim();
    if (!normalizedFilter) return null;

    const matchedDates = new Set<string>();
    for (const item of latestAvailabilityFallback?.items ?? []) {
      if (item.target_date < todayYmd) continue;
      if (matchesOptionFilter(normalizedFilter, item.option_name, item.detail_tour_name)) {
        matchedDates.add(item.target_date);
      }
    }

    if (matchedDates.size === 0) return null;
    return [...matchedDates].sort((a, b) => a.localeCompare(b))[0] ?? null;
  }, [latestAvailabilityFallback?.items, optionFilter, todayYmd]);

  useEffect(() => {
    if (!heatmap || heatmap.days.length === 0) {
      setSelectedDate(null);
      return;
    }

    const valid = new Set(heatmap.days.map((day) => day.target_date));
    const futureOrToday = heatmap.days
      .map((day) => day.target_date)
      .filter((date) => date >= todayYmd)
      .sort((a, b) => a.localeCompare(b));

    if (
      requestedTargetDate
      && valid.has(requestedTargetDate)
      && requestedTargetDate >= todayYmd
      && appliedRequestedTargetDateRef.current !== requestedTargetDate
    ) {
      appliedRequestedTargetDateRef.current = requestedTargetDate;
      setSelectedDate(requestedTargetDate);
      return;
    }

    if (selectedDate && valid.has(selectedDate) && selectedDate >= todayYmd) {
      return;
    }

    if (preferredDateForFilter && valid.has(preferredDateForFilter)) {
      setSelectedDate(preferredDateForFilter);
      return;
    }

    setSelectedDate(futureOrToday[0] ?? null);
  }, [heatmap, preferredDateForFilter, requestedTargetDate, selectedDate, todayYmd]);

  const { data: dayDetail, isLoading: isDayLoading, isError: isDayError } = useAvailabilityDayDetailQuery(
    selectedTourCode,
    selectedDate,
    singleSelectedOta,
  );

  const monthSections = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();
    const end = toDate ? new Date(`${toDate}T00:00:00`) : start;

    const safeStart = start <= end ? start : end;
    const safeEnd = end >= start ? end : start;

    const byDate = new Map((heatmap?.days ?? []).map((day) => [day.target_date, day]));

    const fallbackByDate = new Map<
      string,
      {
        availabilityRate: number;
        availableSlots: number;
        totalSlots: number;
        level: "high" | "medium" | "low" | "no-data";
      }
    >();

    for (const item of latestAvailabilityFallback?.items ?? []) {
      const current = fallbackByDate.get(item.target_date) ?? {
        availabilityRate: 0,
        availableSlots: 0,
        totalSlots: 0,
        level: "no-data" as const,
      };

      const nextTotal = current.totalSlots + 1;
      const nextAvailable = current.availableSlots + (item.is_available ? 1 : 0);
      const nextRate = nextTotal > 0 ? nextAvailable / nextTotal : 0;

      let nextLevel: "high" | "medium" | "low" | "no-data" = "no-data";
      if (nextRate >= 0.75) nextLevel = "high";
      else if (nextRate >= 0.35) nextLevel = "medium";
      else if (nextTotal > 0) nextLevel = "low";

      fallbackByDate.set(item.target_date, {
        availabilityRate: nextRate,
        availableSlots: nextAvailable,
        totalSlots: nextTotal,
        level: nextLevel,
      });
    }

    const dayValuesByDate = new Map<
      string,
      {
        level: "high" | "medium" | "low" | "no-data";
        avgFinalPrice: string | null;
        currencyCode: string | null;
        availabilityRate: number;
        availableSlots: number;
        totalSlots: number;
      }
    >();

    let dayCursor = new Date(safeStart);
    while (dayCursor <= safeEnd) {
      const iso = formatDateLocal(dayCursor);
      const value = byDate.get(iso);
      const fallback = fallbackByDate.get(iso);

      const effectiveLevel =
        value && value.level !== "no-data"
          ? value.level
          : fallback
            ? fallback.level
            : "no-data";

      const effectiveAvailabilityRate =
        value && value.level !== "no-data"
          ? value.availability_rate
          : fallback
            ? fallback.availabilityRate
            : 0;

      const effectiveAvailableSlots =
        value && value.level !== "no-data"
          ? value.available_slots
          : fallback
            ? fallback.availableSlots
            : 0;

      const effectiveTotalSlots =
        value && value.level !== "no-data"
          ? value.total_slots
          : fallback
            ? fallback.totalSlots
            : 0;

      dayValuesByDate.set(iso, {
        level: effectiveLevel,
        avgFinalPrice: value?.avg_final_price ?? null,
        currencyCode: value?.currency_code ?? null,
        availabilityRate: effectiveAvailabilityRate,
        availableSlots: effectiveAvailableSlots,
        totalSlots: effectiveTotalSlots,
      });

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    const sections: Array<{
      monthKey: string;
      monthLabel: string;
      leadingEmpty: number;
      days: Array<{
        date: string;
        dayNumber: number;
        isPast: boolean;
        level: "high" | "medium" | "low" | "no-data";
        avgFinalPrice: string | null;
        currencyCode: string | null;
        availabilityRate: number;
        availableSlots: number;
        totalSlots: number;
      }>;
    }> = [];

    let sectionCursor = new Date(safeStart);
    while (sectionCursor <= safeEnd) {
      const sectionYear = sectionCursor.getFullYear();
      const sectionMonth = sectionCursor.getMonth();
      const monthStart = new Date(sectionYear, sectionMonth, 1);
      const monthEnd = new Date(sectionYear, sectionMonth + 1, 0);

      const rangeStart = sectionCursor > monthStart ? sectionCursor : monthStart;
      const rangeEnd = monthEnd < safeEnd ? monthEnd : safeEnd;

      const days: Array<{
        date: string;
        dayNumber: number;
        isPast: boolean;
        level: "high" | "medium" | "low" | "no-data";
        avgFinalPrice: string | null;
        currencyCode: string | null;
        availabilityRate: number;
        availableSlots: number;
        totalSlots: number;
      }> = [];

      let dateCursor = new Date(rangeStart);
      while (dateCursor <= rangeEnd) {
        const iso = formatDateLocal(dateCursor);
        const value = dayValuesByDate.get(iso);

        days.push({
          date: iso,
          dayNumber: dateCursor.getDate(),
          isPast: iso < todayYmd,
          level: value?.level ?? "no-data",
          avgFinalPrice: value?.avgFinalPrice ?? null,
          currencyCode: value?.currencyCode ?? null,
          availabilityRate: value?.availabilityRate ?? 0,
          availableSlots: value?.availableSlots ?? 0,
          totalSlots: value?.totalSlots ?? 0,
        });

        dateCursor.setDate(dateCursor.getDate() + 1);
      }

      sections.push({
        monthKey: `${sectionYear}-${String(sectionMonth + 1).padStart(2, "0")}`,
        monthLabel: rangeStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        leadingEmpty: rangeStart.getDay(),
        days,
      });

      sectionCursor = new Date(rangeEnd);
      sectionCursor.setDate(sectionCursor.getDate() + 1);
    }

    return sections;
  }, [fromDate, heatmap?.days, latestAvailabilityFallback?.items, toDate, todayYmd]);

  const sortedSlots = useMemo(() => {
    if (!dayDetail) return [];

    const normalizedFilter = normalizeText(optionFilter);
    if (!normalizedFilter) {
      return [...dayDetail.slots].sort((a, b) => (a.slot_time ?? "99:99:99").localeCompare(b.slot_time ?? "99:99:99"));
    }

    const relatedOptionNames = new Set<string>();
    for (const item of latestAvailabilityFallback?.items ?? []) {
      const optionName = item.option_name ?? "";
      if (matchesOptionFilter(normalizedFilter, optionName, item.detail_tour_name)) {
        if (optionName.trim()) relatedOptionNames.add(optionName);
      }
    }

    const filteredSlots = dayDetail.slots.filter((slot) => {
      const slotOptionName = slot.option_name ?? "";
      return (
        matchesOptionFilter(normalizedFilter, slotOptionName, slot.detail_tour_name)
        || relatedOptionNames.has(slotOptionName)
      );
    });

    return [...filteredSlots].sort((a, b) => (a.slot_time ?? "99:99:99").localeCompare(b.slot_time ?? "99:99:99"));
  }, [dayDetail, latestAvailabilityFallback?.items, optionFilter]);

  const groupedSlots = useMemo(() => {
    const groups = new Map<string, typeof sortedSlots>();

    for (const slot of sortedSlots) {
      const key = slot.slot_time ?? "__NO_TIME__";
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "__NO_TIME__") return 1;
      if (b === "__NO_TIME__") return -1;
      return a.localeCompare(b);
    });
  }, [sortedSlots]);

  const timedGroups = useMemo(
    () => groupedSlots.filter(([slotTime]) => slotTime !== "__NO_TIME__"),
    [groupedSlots],
  );

  const timedSlotCount = useMemo(
    () => timedGroups.reduce((acc, [, slots]) => acc + slots.length, 0),
    [timedGroups],
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <h1 className="text-3xl font-semibold tracking-tight">Availability Detail</h1>
          <Link to="/" className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600">
            Volver al dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-4 px-6 py-6">
        <section className="rounded border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label htmlFor="tour-select-detail" className="block text-xs font-semibold uppercase text-slate-500">
                Tour
              </label>
              <select
                id="tour-select-detail"
                className="mt-1 min-w-[320px] rounded border border-slate-300 px-3 py-2 text-sm"
                value={selectedTourCode ?? ""}
                onChange={(event) => setSelectedTourCode(event.target.value)}
              >
                {(tours ?? []).map((tour) => (
                  <option key={tour.id} value={tour.internal_code}>
                    {tour.attraction} - {tour.variant}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="from-date-detail" className="block text-xs font-semibold uppercase text-slate-500">
                From
              </label>
              <input
                id="from-date-detail"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="to-date-detail" className="block text-xs font-semibold uppercase text-slate-500">
                To
              </label>
              <input
                id="to-date-detail"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Horizon</p>
              <p className="mt-1 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm">+{selectedHorizon} days</p>
            </div>
            <div className="min-w-[320px]">
              <label htmlFor="option-filter-detail" className="block text-xs font-semibold uppercase text-slate-500">
                Tour/Option filter
              </label>
              <input
                id="option-filter-detail"
                type="text"
                value={optionFilter}
                onChange={(event) => setOptionFilter(event.target.value)}
                placeholder="e.g. sagrada familia"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {otaOptions.map((ota) => (
              <label key={ota} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm">
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
                {ota}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-2xl font-semibold text-slate-800">Availability Heatmap</h2>

          {isHeatmapLoading ? <div className="h-64 animate-pulse rounded bg-slate-100" /> : null}
          {!isHeatmapLoading && isHeatmapError ? <p className="text-sm text-red-700">Failed to load heatmap.</p> : null}
          {!isHeatmapLoading && !isHeatmapError ? (
            <>
              <div className="space-y-5">
                {monthSections.map((section) => (
                  <div key={section.monthKey}>
                    <p className="mb-3 text-center text-xl font-semibold text-slate-700">{section.monthLabel}</p>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
                      <div>S</div>
                      <div>M</div>
                      <div>T</div>
                      <div>W</div>
                      <div>T</div>
                      <div>F</div>
                      <div>S</div>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {Array.from({ length: section.leadingEmpty }).map((_, index) => (
                        <div key={`detail-empty-${section.monthKey}-${index}`} className="h-16 rounded" />
                      ))}
                      {section.days.map((day) => {
                        const parsedPrice = day.avgFinalPrice ? parseDecimalToNumber(day.avgFinalPrice) : null;
                        return (
                          <button
                            key={day.date}
                            type="button"
                            disabled={day.isPast}
                            onClick={() => {
                              if (!day.isPast) {
                                setSelectedDate(day.date);
                              }
                            }}
                            className={`h-16 rounded text-base font-semibold ${day.isPast ? "bg-slate-300 text-slate-500 cursor-not-allowed" : getHeatmapClassName(day.level)} ${
                              !day.isPast && selectedDate === day.date ? "ring-2 ring-slate-900" : ""
                            }`}
                            title={`${day.date} · Avg price: ${
                              parsedPrice !== null
                                ? formatCurrency(parsedPrice, day.currencyCode ?? "EUR")
                                : "N/A"
                            } · Availability: ${(day.availabilityRate * 100).toFixed(0)}% · Slots: ${day.availableSlots}/${day.totalSlots}${day.isPast ? " · Past date" : ""}`}
                          >
                            {day.dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                <LegendDot color="bg-green-500" label="High availability" />
                <LegendDot color="bg-amber-400" label="Medium" />
                <LegendDot color="bg-red-500" label="Low" />
                <LegendDot color="bg-slate-300" label="No data" />
              </div>
            </>
          ) : null}
        </section>

        <section className="rounded border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-2xl font-semibold text-slate-800">
            Day Detail {selectedDate ? `· ${selectedDate}` : ""}
          </h2>

          {!isDayLoading && !isDayError && sortedSlots.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-800">
                Tours con hora: {timedSlotCount}
              </span>
            </div>
          ) : null}

          {isDayLoading ? <div className="h-40 animate-pulse rounded bg-slate-100" /> : null}
          {!isDayLoading && isDayError ? <p className="text-sm text-red-700">Failed to load day detail.</p> : null}
          {!isDayLoading && !isDayError && sortedSlots.length === 0 ? (
            <p className="text-sm text-slate-600">
              {optionFilter.trim()
                ? "No slots match the current option filter for selected day."
                : "No slots for selected day."}
            </p>
          ) : null}
          {!isDayLoading && !isDayError && sortedSlots.length > 0 ? (
            <div className="space-y-3">
              {timedGroups.length === 0 ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No hay tours con hora para este día.
                </p>
              ) : null}

              {timedGroups.map(([slotTime, slots]) => (
                <section key={slotTime} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-2 text-lg font-semibold text-slate-800">Horario {slotTime.slice(0, 5)}</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {slots.map((slot, index) => {
                      const priceValue = parseDecimalToNumber(slot.final_price ?? slot.list_price);
                      return (
                        <article
                          key={`${slotTime}-${slot.option_name ?? "no-option"}-${index}`}
                          className="rounded border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-base font-semibold text-slate-800">{slot.option_name ?? "N/A"}</p>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                slot.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {slot.is_available ? "Disponible" : "No disponible"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span>Idioma: {slot.language_code ?? "N/A"}</span>
                            <span>
                              {slot.seats_available !== null ? `Quedan ${slot.seats_available} plazas` : "Plazas: N/A"}
                            </span>
                            <span>
                              Precio: {priceValue !== null ? formatCurrency(priceValue, slot.currency_code ?? "EUR") : "N/A"}
                            </span>
                            <span>
                              Popularidad: {slot.popularity_count_yesterday !== null
                                ? `${slot.popularity_label ?? "popular"} (${slot.popularity_count_yesterday})`
                                : "No signal"}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function getHeatmapClassName(level: "high" | "medium" | "low" | "no-data"): string {
  if (level === "high") return "bg-green-500 text-white";
  if (level === "medium") return "bg-amber-400 text-slate-900";
  if (level === "low") return "bg-red-500 text-white";
  return "bg-slate-200 text-slate-500";
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
