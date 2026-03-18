export interface Institution {
  institution_id: number;
  school_name: string;
  city: string;
  state: string;
  zip: string;
  longitude: number | null;
  latitude: number | null;
  ownership: number | null;
  predominant_degree: number | null;
  student_size: number | null;
  avg_net_price: number | null;
  completion_rate: number | null;
  median_earnings: number | null;
  median_debt: number | null;
}

export interface FieldOfStudy {
  institution_id: number;
  school_name: string;
  credential_level: number;
  credential_description: string;
  cip_code: number;
  cip_title: string;
  completers: number | null;
  median_earnings_1yr: number | null;
  median_earnings_4yr: number | null;
  median_debt: number | null;
}

export interface FilterMeta {
  states: string[];
  ownership: { value: number; label: string }[];
  predominant_degree: { value: number; label: string }[];
}

export interface SummaryStats {
  total_institutions: number;
  median_earnings_median: number | null;
  median_debt_median: number | null;
  avg_net_price_median: number | null;
}
