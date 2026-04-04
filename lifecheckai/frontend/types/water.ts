export type WaterFlagStatus = "normal" | "caution" | "critical" | "unknown";
export type WaterTrendDirection = "up" | "down" | "stable";

export interface WaterStateOption {
  name: string;
  sample_count: number;
  station_count: number;
  years: number[];
}

export interface WaterStation {
  id: string;
  code?: string | null;
  name: string;
  sample_count: number;
  latest_year?: number | null;
  years: number[];
  distance_km?: number | null;
}

export interface WaterParameterStatus {
  param: string;
  label: string;
  unit: string;
  value: number | null;
  status: WaterFlagStatus;
  ideal_min?: number | null;
  ideal_max?: number | null;
  critical_min?: number | null;
  critical_max?: number | null;
  message: string;
}

export interface WaterResolvedPlace {
  city?: string | null;
  formatted_address?: string | null;
  state?: string | null;
}

export interface WaterPrediction {
  state: string;
  scope: "state" | "station" | "nearby";
  matched_station?: {
    id: string;
    code?: string | null;
    name: string;
  } | null;
  matched_location?: string | null;
  distance_km?: number | null;
  resolved_place?: WaterResolvedPlace | null;
  nearby_stations: WaterStation[];
  year: number;
  available_years: number[];
  sample_count: number;
  station_count?: number | null;
  prediction: "Drinkable" | "Not Drinkable";
  confidence: number;
  drinkable_probability: number;
  not_drinkable_probability: number;
  risk_level: string;
  parameters: Record<string, number | null>;
  parameter_statuses: WaterParameterStatus[];
  violations: WaterParameterStatus[];
  recommendations: string[];
  model_version: string;
}

export interface WaterTrendOverview {
  latest: number | null;
  first: number | null;
  change: number | null;
  direction: WaterTrendDirection;
}

export interface WaterTrends {
  state: string;
  scope: "state" | "station" | "nearby";
  matched_station?: {
    id: string;
    code?: string | null;
    name: string;
  } | null;
  matched_location?: string | null;
  distance_km?: number | null;
  resolved_place?: WaterResolvedPlace | null;
  nearby_stations: WaterStation[];
  years: number[];
  parameters: Record<string, Array<number | null>>;
  sample_counts: Record<string, number>;
  overview: Record<string, WaterTrendOverview>;
}

export interface WaterModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  oob_score: number;
  confusion_matrix: number[][];
  total_samples: number;
  train_samples: number;
  test_samples: number;
  class_distribution: {
    drinkable: number;
    not_drinkable: number;
  };
  feature_importance: Record<string, number>;
  dataset_years: number[];
  label_definition: string;
  model_version: string;
}

export interface WaterStatesResponse {
  states: WaterStateOption[];
  dataset_years: number[];
  count: number;
}

export interface WaterStationsResponse {
  state: string;
  stations: WaterStation[];
  count: number;
}

export interface WaterNearbyResponse {
  resolved_place?: WaterResolvedPlace | null;
  prediction: WaterPrediction;
  trends: WaterTrends;
}
