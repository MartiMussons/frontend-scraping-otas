export const dashboardQueryKeys = {
  sources: (tourCode: string) => ["sources", tourCode] as const,
  latestPrices: (tourCode: string, horizon: number, rangeDays?: number, otaName?: string) =>
    ["latest-prices", tourCode, horizon, rangeDays ?? "", otaName ?? ""] as const,
  latestAvailability: (tourCode: string, horizon: number, rangeDays?: number, otaName?: string) =>
    ["latest-availability", tourCode, horizon, rangeDays ?? "", otaName ?? ""] as const,
  priceTimeseries: (tourCode: string, horizon: number, fromDate?: string, toDate?: string) =>
    ["price-timeseries", tourCode, horizon, fromDate ?? "", toDate ?? ""] as const,
  availabilityHeatmap: (tourCode: string, otaName?: string, fromDate?: string, toDate?: string, rangeDays?: number) =>
    ["availability-heatmap", tourCode, otaName ?? "", fromDate ?? "", toDate ?? "", rangeDays ?? ""] as const,
  availabilityDayDetail: (tourCode: string, targetDate: string, otaName?: string) =>
    ["availability-day-detail", tourCode, targetDate, otaName ?? ""] as const,
  viatorListing: () => ["viator-listing"] as const,
};
