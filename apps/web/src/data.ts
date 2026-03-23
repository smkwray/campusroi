import type { Institution, FieldOfStudy, FilterMeta, SummaryStats } from "./types";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const cache: Record<string, unknown> = {};

async function fetchJSON<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  if (cache[url]) return cache[url] as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const data = await res.json();
  cache[url] = data;
  return data as T;
}

/**
 * Fetch a JSONL file and parse it into a Map keyed by each line's "key" field.
 * Each line has format: {"key": <id>, "records": [...]}
 * The map is cached so the file is only fetched once.
 */
async function fetchJSONLMap<T>(path: string): Promise<Map<string | number, T[]>> {
  const url = `${BASE}${path}`;
  if (cache[url]) return cache[url] as Map<string | number, T[]>;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const text = await res.text();
  const map = new Map<string | number, T[]>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as { key: string | number; records: T[] };
    map.set(entry.key, entry.records);
  }
  cache[url] = map;
  return map;
}

export const loadInstitutions = () => fetchJSON<Institution[]>("/data/institutions.json");
export const loadFilters = () => fetchJSON<FilterMeta>("/data/filters.json");
export const loadSummary = () => fetchJSON<SummaryStats>("/data/summary.json");
export const loadSearchIndex = () =>
  fetchJSON<Pick<Institution, "institution_id" | "school_name" | "city" | "state">[]>("/data/search_index.json");

export interface CIPAggregate {
  cip_code: number;
  cip_title: string;
  program_count: number;
  institution_count: number;
  total_completers: number | null;
  median_earnings_1yr: number | null;
  median_earnings_4yr: number | null;
  median_debt: number | null;
}

export const loadCIPAggregates = () => fetchJSON<CIPAggregate[]>("/data/cip_aggregates.json");

export async function loadFieldsByCIP(cipCode: number): Promise<FieldOfStudy[]> {
  const map = await fetchJSONLMap<FieldOfStudy>("/data/fields.jsonl");
  return map.get(cipCode) ?? [];
}

export async function loadFieldsByInstitution(unitid: number): Promise<FieldOfStudy[]> {
  const map = await fetchJSONLMap<FieldOfStudy>("/data/institution_fields.jsonl");
  return map.get(unitid) ?? [];
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "\u2014";
  return "$" + Math.round(value).toLocaleString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "\u2014";
  return (value * 100).toFixed(1) + "%";
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "\u2014";
  return Math.round(value).toLocaleString();
}

export const OWNERSHIP_LABELS: Record<number, string> = {
  1: "Public",
  2: "Private nonprofit",
  3: "Private for-profit",
};

export const DEGREE_LABELS: Record<number, string> = {
  0: "Not classified",
  1: "Certificate",
  2: "Associate",
  3: "Bachelor\u2019s",
  4: "Graduate",
};

export function getCompletionRate(inst: { completion_rate: number | null; completion_rate_l4: number | null }): {
  value: number | null;
  label: string;
} {
  if (inst.completion_rate != null) return { value: inst.completion_rate, label: "Completion (4yr)" };
  if (inst.completion_rate_l4 != null) return { value: inst.completion_rate_l4, label: "Completion (<4yr)" };
  return { value: null, label: "Completion" };
}
