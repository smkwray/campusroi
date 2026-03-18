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
export const loadFieldsByCIP = (cipCode: number) =>
  fetchJSON<FieldOfStudy[]>(`/data/fields/${cipCode}.json`);
export const loadFieldsByInstitution = (unitid: number) =>
  fetchJSON<FieldOfStudy[]>(`/data/institution_fields/${unitid}.json`);

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
