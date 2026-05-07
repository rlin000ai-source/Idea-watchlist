import type { Entry } from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_FIELDS: Array<keyof Entry> = [
  "ticker",
  "exchange",
  "currency",
  "analysis_date",
  "anchor_price",
  "bull_target",
  "base_target",
  "bear_target",
  "thesis_oneliner",
  "catalysts",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateEntry(entry: Partial<Entry>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (entry.analysis_date && !ISO_DATE.test(entry.analysis_date)) {
    errors.push(`analysis_date must be YYYY-MM-DD, got: ${entry.analysis_date}`);
  }

  if (entry.analysis_date && ISO_DATE.test(entry.analysis_date)) {
    const today = new Date().toISOString().slice(0, 10);
    if (entry.analysis_date > today) {
      errors.push(`analysis_date cannot be in the future`);
    }
  }

  const numericFields: Array<keyof Entry> = [
    "anchor_price",
    "bull_target",
    "base_target",
    "bear_target",
  ];
  for (const f of numericFields) {
    const v = entry[f];
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v <= 0)) {
      errors.push(`${f} must be a positive number, got: ${v}`);
    }
  }

  if (
    typeof entry.bull_target === "number" &&
    typeof entry.base_target === "number" &&
    typeof entry.bear_target === "number"
  ) {
    if (!(entry.bear_target < entry.base_target && entry.base_target < entry.bull_target)) {
      errors.push(
        `Targets must satisfy bear < base < bull (got bear=${entry.bear_target}, base=${entry.base_target}, bull=${entry.bull_target})`,
      );
    }
  }

  if (
    typeof entry.anchor_price === "number" &&
    typeof entry.bear_target === "number" &&
    typeof entry.bull_target === "number"
  ) {
    if (entry.anchor_price < entry.bear_target || entry.anchor_price > entry.bull_target) {
      warnings.push(
        `anchor_price ${entry.anchor_price} sits outside bear–bull range — unusual but allowed`,
      );
    }
  }

  if (entry.catalysts !== undefined) {
    if (!Array.isArray(entry.catalysts)) {
      errors.push(`catalysts must be an array of strings`);
    } else if (entry.catalysts.length === 0) {
      errors.push(`catalysts must contain at least one item`);
    }
  }

  if (entry.thesis_oneliner && entry.thesis_oneliner.length > 300) {
    warnings.push(`thesis_oneliner is ${entry.thesis_oneliner.length} chars — consider tightening`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function entryKey(e: Pick<Entry, "ticker" | "exchange">): string {
  return `${e.ticker}::${e.exchange}`.toUpperCase();
}
