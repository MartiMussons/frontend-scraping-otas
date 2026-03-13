export type UUID = string;

export interface TourResponse {
  id: UUID;
  internal_code: string;
  attraction: string;
  variant: string;
  city: string;
  market: string;
  is_active: boolean;
}

export interface SourceResponse {
  id: UUID;
  tour_id: UUID;
  ota_name: string;
  external_product_id: string;
  product_url: string;
  default_currency: string;
  default_locale: string;
  is_active: boolean;
}

export interface PricePointResponse {
  id: number;
  ota_source_id: UUID;
  ota_name: string | null;
  target_date: string;
  horizon_days: number;
  slot_time: string | null;
  language_code: string | null;
  option_name: string | null;
  detail_tour_name?: string | null;
  currency_code: string;
  list_price: string;
  final_price: string | null;
  popularity_count_yesterday: number | null;
  popularity_label: string | null;
  observed_at: string;
}

export interface AvailabilityPointResponse {
  id: number;
  ota_source_id: UUID;
  ota_name: string | null;
  target_date: string;
  horizon_days: number;
  slot_time: string | null;
  language_code: string | null;
  option_name: string | null;
  detail_tour_name?: string | null;
  is_available: boolean;
  seats_available: number | null;
  observed_at: string;
}

export interface LatestPricesResponse {
  tour_code: string;
  observed_at: string | null;
  items: PricePointResponse[];
}

export interface LatestAvailabilityResponse {
  tour_code: string;
  observed_at: string | null;
  items: AvailabilityPointResponse[];
}

export interface PriceTimeseriesResponse {
  tour_code: string;
  items: PricePointResponse[];
}

export interface HeatmapDayResponse {
  target_date: string;
  level: "high" | "medium" | "low" | "no-data";
  availability_rate: number;
  available_slots: number;
  total_slots: number;
  avg_final_price: string | null;
  currency_code: string | null;
}

export interface AvailabilityKpiResponse {
  availability_rate_7d: number;
  availability_rate_30d: number;
  sold_out_days: number;
  critical_slots: number;
  wow_current_week_rate: number;
  wow_previous_week_rate: number;
  wow_delta: number;
}

export interface AvailabilityHeatmapResponse {
  tour_code: string;
  ota_name: string | null;
  from_date: string;
  to_date: string;
  observed_at: string | null;
  kpis: AvailabilityKpiResponse;
  days: HeatmapDayResponse[];
}

export interface AvailabilityDaySlotResponse {
  target_date: string;
  slot_time: string | null;
  is_available: boolean;
  seats_available: number | null;
  ota_name: string | null;
  option_name: string | null;
  detail_tour_name?: string | null;
  language_code: string | null;
  final_price: string | null;
  list_price: string | null;
  currency_code: string | null;
  popularity_count_yesterday: number | null;
  popularity_label: string | null;
  observed_at: string;
}

export interface AvailabilityDayDetailResponse {
  tour_code: string;
  ota_name: string | null;
  target_date: string;
  observed_at: string | null;
  slots: AvailabilityDaySlotResponse[];
}

/**
 * A single tour card scraped from the Viator attraction listing page
 * by `scraping/viator/listing_scraper.py`.
 * All numeric fields are serialised as strings — parse them with Number() when needed.
 */
export interface ViatorTourCard {
  name: string;
  price_eur: string | null;  // e.g. "47"
  rating: string | null;     // e.g. "4.7"
  reviews: string | null;    // e.g. "3091"
  duration: string | null;   // e.g. "1 hour 15 minutes"
  badges: string[];          // ["Best Seller", "Likely to Sell Out", ...]
  url: string;               // absolute detail URL
  captured_at: string;       // ISO UTC datetime
  source_listing: string;    // the listing page this card was scraped from
}
