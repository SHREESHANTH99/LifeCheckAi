/**
 * Water Quality Components - Type Definitions & Interfaces
 * 
 * This file provides all TypeScript interfaces and types used across
 * the water quality components, hooks, and utilities.
 * 
 * Import this file to ensure type safety when working with water data.
 */

/* ── Water Quality Data ──────────────────────────── */

/**
 * Main water quality data response
 */
export interface WaterQualityData {
  wqi: number;
  status: 'SAFE' | 'MODERATE' | 'POOR' | 'VERY_POOR';
  location: string;
  timestamp: string;
  parameters: Record<string, number | null>;
  metrics: Metric[];
  temperature?: number;
  ph?: number;
  turbidity?: number;
  conductivity?: number;
  dissolvedOxygen?: number;
  ammonia?: number;
  nitrate?: number;
  phosphate?: number;
  hardness?: number;
  iron?: number;
  manganese?: number;
  coliform?: number;
}

/**
 * Individual water quality metric
 */
export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: 'wqi' | 'parameter' | 'health-impact';
  status: 'safe' | 'warning' | 'danger';
  historicalValue?: number;
}

/**
 * Water quality parameter with comparison data
 */
export interface Parameter {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  range: { min: number; max: number };
  status: 'safe' | 'warning' | 'danger';
}

/**
 * Historical water quality data point
 */
export interface WaterHistoryDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  wqi?: number;
  temperature?: number;
  ph?: number;
}

/**
 * Water quality recommendation
 */
export interface WaterRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
  icon?: React.ReactNode;
}

/**
 * Water quality alert
 */
export interface WaterAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  location?: string;
  parameter?: string;
}

/* ── Component Props ─────────────────────────────── */

/**
 * WaterStateMap Props
 */
export interface WaterStateMapProps {
  onStateSelect?: (state: string) => void;
  selectedState?: string;
}

/**
 * WaterComparison Props
 */
export interface WaterComparisonProps {
  parameters: Parameter[];
  location: string;
  timestamp?: string;
}

/**
 * WaterMetrics Props
 */
export interface WaterMetricsProps {
  metrics: Metric[];
  isLoading?: boolean;
  onMetricClick?: (metricId: string) => void;
}

/**
 * WaterInfoCard Props
 */
export interface WaterInfoCardProps {
  title: string;
  description?: string;
  value?: string | number;
  status?: 'safe' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * WaterChart Props
 */
export interface WaterChartProps {
  data: WaterHistoryDataPoint[];
  title: string;
  unit: string;
  min?: number;
  max?: number;
  threshold?: number;
  isLoading?: boolean;
}

/**
 * WaterRecommendations Props
 */
export interface WaterRecommendationsProps {
  recommendations: WaterRecommendation[];
  isLoading?: boolean;
}

/* ── Hook Return Types ──────────────────────────── */

/**
 * Return type for useWaterQuality hook
 */
export interface UseWaterQualityReturn {
  data: WaterQualityData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setLocation: (location: string) => void;
}

/**
 * Return type for useWaterAlerts hook
 */
export interface UseWaterAlertsReturn {
  alerts: WaterAlert[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Return type for useWaterHistory hook
 */
export interface UseWaterHistoryReturn {
  data: WaterHistoryDataPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Return type for useWaterRecommendations hook
 */
export interface UseWaterRecommendationsReturn {
  recommendations: WaterRecommendation[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Return type for useWaterComparison hook
 */
export interface UseWaterComparisonReturn {
  data: Record<string, WaterQualityData>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/* ── Status Types ───────────────────────────────── */

export type WQIStatus = 'SAFE' | 'MODERATE' | 'POOR' | 'VERY_POOR';
export type ParameterStatus = 'safe' | 'warning' | 'danger';
export type MetricType = 'wqi' | 'parameter' | 'health-impact';
export type Trend = 'up' | 'down' | 'stable';
export type Severity = 'low' | 'medium' | 'high';
export type HistoryPeriod = 'day' | 'week' | 'month';

/* ── Utility Function Types ──────────────────────── */

/**
 * WQI Calculation Input
 */
export interface WQICalculationInput {
  ph?: number;
  turbidity?: number;
  orp?: number;
  conductivity?: number;
  do?: number;
  temperature?: number;
}

/**
 * Parameter Threshold Definition
 */
export interface ParameterThreshold {
  safe: number;
  warning: number;
  danger: number;
}

/**
 * Health Warning
 */
export interface HealthWarning {
  message: string;
  severity: Severity;
}

/**
 * Recommended Action
 */
export interface RecommendedAction {
  action: string;
  reason: string;
  priority: Severity;
}

/* ── Color Scheme Types ──────────────────────────── */

export interface StatusColorScheme {
  bg: string;
  border: string;
  text: string;
  badge?: string;
  icon?: string;
}

export interface ColorSchemes {
  safe: StatusColorScheme;
  warning: StatusColorScheme;
  danger: StatusColorScheme;
  info: StatusColorScheme;
}

/* ── API Response Types ──────────────────────────── */

/**
 * Water Quality API Response
 */
export interface WaterQualityAPIResponse {
  wqi: number;
  status: WQIStatus;
  location: string;
  matched_location?: string | null;
  distance_km?: number | null;
  timestamp: string;
  parameters: Record<string, number | null>;
  metrics?: Metric[];
  temperature?: number;
  ph?: number;
  turbidity?: number;
  conductivity?: number;
  dissolvedOxygen?: number;
  ammonia?: number;
  nitrate?: number;
  phosphate?: number;
  hardness?: number;
  iron?: number;
  manganese?: number;
  coliform?: number;
}

/**
 * Water History API Response
 */
export interface WaterHistoryAPIResponse {
  location: string;
  period: HistoryPeriod;
  data: WaterHistoryDataPoint[];
  totalRecords: number;
}

/**
 * Water Alerts API Response
 */
export interface WaterAlertsAPIResponse {
  location: string;
  alerts: WaterAlert[];
  activeCount: number;
  timestamp: string;
}

/**
 * Water Recommendations API Response
 */
export interface WaterRecommendationsAPIResponse {
  location: string;
  recommendations: WaterRecommendation[];
  generatedAt: string;
  nextUpdate: string;
}

/* ── State Management Types ──────────────────────── */

/**
 * Water Data Store State
 */
export interface WaterDataState {
  currentLocation: string;
  data: WaterQualityData | null;
  history: WaterHistoryDataPoint[];
  alerts: WaterAlert[];
  recommendations: WaterRecommendation[];
  loading: {
    current: boolean;
    history: boolean;
    alerts: boolean;
    recommendations: boolean;
  };
  error: {
    current: Error | null;
    history: Error | null;
    alerts: Error | null;
    recommendations: Error | null;
  };
  lastUpdated: {
    current: Date | null;
    history: Date | null;
    alerts: Date | null;
    recommendations: Date | null;
  };
}

/* ── Configuration Types ─────────────────────────── */

/**
 * Water Quality Feature Configuration
 */
export interface WaterQualityConfig {
  apiBaseUrl: string;
  updateInterval: number; // milliseconds
  pollInterval: number; // milliseconds
  enablePolling: boolean;
  enableCache: boolean;
  cacheTimeout: number; // milliseconds
  timeZone: string;
  locale: string;
  theme: 'dark' | 'light';
}

/**
 * Water Parameter Configuration
 */
export interface WaterParameterConfig {
  name: string;
  displayName: string;
  unit: string;
  min: number;
  max: number;
  safeRange: { min: number; max: number };
  warningRange: { min: number; max: number };
  criticalRange: { min: number; max: number };
  priority: number;
}

/* ── Error Types ────────────────────────────────── */

/**
 * Water Quality Error
 */
export class WaterQualityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WaterQualityError';
  }
}

/* ── Utility Types ──────────────────────────────── */

/**
 * Pagination Info
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Date Range
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Location Info
 */
export interface LocationInfo {
  name: string;
  state: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  primaryWaterSource?: string;
}

/* ── Chart Types ────────────────────────────────── */

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp: string;
}

/**
 * Chart Configuration
 */
export interface ChartConfig {
  type: 'bar' | 'line' | 'area';
  title: string;
  unit: string;
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  colors?: string[];
}

/* ── Comparison Types ───────────────────────────── */

/**
 * Location Comparison
 */
export interface LocationComparison {
  location1: string;
  location2: string;
  data1: WaterQualityData;
  data2: WaterQualityData;
  differences: Record<string, number>;
}

/**
 * Trend Comparison
 */
export interface TrendComparison {
  location: string;
  parameter: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  trend: Trend;
}

/* ── Export All Types ───────────────────────────── */

/**
 * Type definitions for all component props and utilities
 */
export type * from './types';
