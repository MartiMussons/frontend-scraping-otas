export const HORIZON_OPTIONS = [0, 7, 30, 90, 180] as const;

export type HorizonOption = (typeof HORIZON_OPTIONS)[number];

/**
 * Metadata for known OTA platforms.
 * Add a new entry here to register a new OTA across the whole dashboard
 * (display name, brand colour, order in the filter).
 */
export const OTA_CONFIG: Record<string, { label: string; color: string }> = {
  getyourguide: { label: "GetYourGuide", color: "#ff5533" },
  viator: { label: "Viator", color: "#172753" },
};

/** Ordered list of known OTA keys – used to pre-populate the OTA filter. */
export const KNOWN_OTA_NAMES = Object.keys(OTA_CONFIG);

/** Returns the branded display label for an OTA key (falls back to the raw key). */
export function otaLabel(otaKey: string): string {
  return OTA_CONFIG[otaKey]?.label ?? otaKey;
}

/** Returns the brand colour for an OTA key (falls back to a generic slate). */
export function otaColor(otaKey: string, fallback = "#64748b"): string {
  return OTA_CONFIG[otaKey]?.color ?? fallback;
}
