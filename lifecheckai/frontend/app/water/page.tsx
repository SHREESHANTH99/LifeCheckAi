"use client";

import { useState, useEffect, useCallback } from "react";
import { WaterWave } from "@/components/ui/WaterWave";
import {
  Droplets,
  FlaskConical,
  Activity,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Brain,
  ChevronDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* ── Types ───────────────────────────────────────────── */
interface Prediction {
  state: string;
  matched_location?: string | null;
  distance_km?: number | null;
  nearby_stations?: string[];
  year: number;
  sample_count: number;
  prediction: string;
  confidence: number;
  drinkable_probability: number;
  not_drinkable_probability: number;
  parameters: Record<string, number | null>;
  violations: { param: string; value: number; limit: number | string }[];
  bis_limits: Record<string, number>;
}

interface Trends {
  state: string;
  matched_location?: string | null;
  distance_km?: number | null;
  years: number[];
  parameters: Record<string, (number | null)[]>;
  sample_counts: Record<number, number>;
}

interface Analysis {
  state: string;
  prediction: string;
  analysis: {
    summary: string;
    contamination_causes: string[];
    health_risks: string[];
    remediation: string[];
    regional_factors: string;
  } | null;
}

interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  total_samples: number;
  feature_importance: Record<string, number>;
  class_distribution: { drinkable: number; not_drinkable: number };
}

/* ── Helper ──────────────────────────────────────────── */
const PARAM_LABELS: Record<string, string> = {
  ph: "pH", tds: "TDS (mg/L)", conductivity: "Conductivity (μS/cm)",
  bod: "BOD (mg/L)", nitrate: "Nitrate (mg/L)",
  fecal_coliform: "Fecal Coliform", total_coliform: "Total Coliform",
  fluoride: "Fluoride (mg/L)", arsenic: "Arsenic (mg/L)",
  temperature: "Temperature (°C)",
};

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
  "#14b8a6", "#6366f1",
];

export default function WaterPage() {
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [availableStations, setAvailableStations] = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [stationSearch, setStationSearch] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState({ prediction: false, trends: false, analysis: false, metrics: false, stations: false });
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false);

  /* Fetch states on mount */
  useEffect(() => {
    fetch(`${API}/api/water/states`)
      .then((r) => r.json())
      .then((d) => setStates(d.states || []))
      .catch(() => {});
    fetch(`${API}/api/water/model-metrics`)
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => {});
  }, []);

  /* Fetch stations when state change */
  useEffect(() => {
    if (!selectedState) {
      setAvailableStations([]);
      return;
    }
    setLoading(p => ({ ...p, stations: true }));
    fetch(`${API}/api/water/stations?state=${encodeURIComponent(selectedState)}`)
      .then(r => r.json())
      .then(d => {
        setAvailableStations(d.stations || []);
        setLoading(p => ({ ...p, stations: false }));
      })
      .catch(() => setLoading(p => ({ ...p, stations: false })));
  }, [selectedState]);

  /* Fetch data for selected state */
  const fetchStateData = useCallback(async (state: string, station?: string) => {
    setSelectedState(state);
    setStateDropdownOpen(false);
    setStationDropdownOpen(false);
    setPrediction(null);
    setTrends(null);
    setAnalysis(null);

    setLoading((p) => ({ ...p, prediction: true, trends: true }));

    try {
      let predUrl = `${API}/api/water/predict?state=${encodeURIComponent(state)}`;
      let trendsUrl = `${API}/api/water/trends?state=${encodeURIComponent(state)}`;
      if (station) {
        predUrl += `&location=${encodeURIComponent(station)}`;
        trendsUrl += `&location=${encodeURIComponent(station)}`;
      }

      const [predRes, trendRes] = await Promise.all([
        fetch(predUrl),
        fetch(trendsUrl),
      ]);
      if (predRes.ok) setPrediction(await predRes.json());
      if (trendRes.ok) setTrends(await trendRes.json());
    } catch {}
    setLoading((p) => ({ ...p, prediction: false, trends: false }));

    // Start AI analysis (slower)
    setLoading((p) => ({ ...p, analysis: true }));
    try {
      const res = await fetch(`${API}/api/water/analyze?state=${encodeURIComponent(state)}`);
      if (res.ok) setAnalysis(await res.json());
    } catch {}
    setLoading((p) => ({ ...p, analysis: false }));
  }, []);

  const filteredStations = availableStations.filter(s => 
    s.toLowerCase().includes(stationSearch.toLowerCase())
  );

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen py-8 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <Droplets size={22} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-family-grotesk)]">
            Water Quality <span className="text-accent-blue">Intelligence</span>
          </h1>
        </div>
        <p className="text-text-secondary text-sm sm:text-base ml-[52px]">
          Forcefully revealing supply-level water safety across India via direct Monitoring Points
        </p>
      </div>

      {/* Inputs Configuration */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-3xl bg-card p-4 rounded-xl border border-border-light shadow-sm">
        {/* State Selector */}
        <div className="relative flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">State <span className="text-unsafe">*</span></label>
          <button
            onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
            className="w-full h-[42px] flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-border-default text-left cursor-pointer hover:border-accent-blue/40 transition-colors"
          >
            <span className={selectedState ? "text-text-primary text-sm font-medium truncate" : "text-text-muted text-sm"}>
              {selectedState || "Select State..."}
            </span>
            <ChevronDown size={14} className={`text-text-secondary transition-transform ${stateDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {stateDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg card border border-border-light z-[60] shadow-lg">
              {states.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedState(s);
                    setSelectedStation("");
                    setStationSearch("");
                    setStateDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer ${
                    s === selectedState ? "text-accent-blue font-medium bg-accent-blue/5" : "text-text-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Station Selector */}
        <div className="relative flex-[1.5]">
          <label className="block text-xs font-medium text-text-secondary mb-1">Monitoring Location / Supply Point</label>
          <div className="relative">
            <input
              type="text"
              placeholder={loading.stations ? "Loading Supply Points..." : "e.g. Kolata Leather..."}
              value={selectedStation || stationSearch}
              onFocus={() => setStationDropdownOpen(true)}
              onChange={(e) => {
                setStationSearch(e.target.value);
                setSelectedStation("");
                setStationDropdownOpen(true);
              }}
              className="w-full h-[42px] px-4 py-2 rounded-lg border border-border-default bg-transparent text-sm focus:outline-none focus:border-accent-blue/60 transition-colors pr-10"
              disabled={!selectedState}
            />
            {loading.stations ? (
              <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-text-muted" />
            ) : (
              <ChevronDown size={16} className="absolute right-3 top-3 text-text-muted pointer-events-none" />
            )}
          </div>
          {stationDropdownOpen && selectedState && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg card border border-border-light z-[60] shadow-lg">
              {filteredStations.length > 0 ? (
                filteredStations.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedStation(s);
                      setStationSearch("");
                      setStationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs hover:bg-white/5 border-b border-border-light/50 last:border-0 transition-colors cursor-pointer ${
                      s === selectedStation ? "text-accent-blue font-medium bg-accent-blue/5" : "text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical size={12} className="opacity-50" />
                      {s}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-xs text-text-muted text-center italic">No stations found for "{stationSearch}"</div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => fetchStateData(selectedState, selectedStation || stationSearch)}
          disabled={!selectedState || loading.prediction}
          className="md:self-end h-[42px] px-6 bg-accent-blue text-white rounded-lg text-sm font-semibold hover:bg-accent-blue/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
        >
          {loading.prediction ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
          Analyze
        </button>
      </div>

      {/* Results Grid */}
      {selectedState && (
        <div className="space-y-6">
          {prediction && prediction.matched_location && (
            <div className="bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Info size={16} className="min-w-4 flex-shrink-0" />
              <div>
                <span>
                  Showing location-aware prediction for <strong>{prediction.matched_location}</strong>
                  {typeof prediction.distance_km === "number" && prediction.distance_km > 0 && ` (${prediction.distance_km} km from query)`}.
                </span>
                {prediction.nearby_stations && prediction.nearby_stations.length > 0 && (
                  <div className="mt-1 text-xs opacity-90 border-t border-accent-blue/20 pt-1">
                    <strong>Nearby Monitoring Stations Analyzed:</strong> {prediction.nearby_stations.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Row 1: Prediction + Parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ML Prediction Card */}
            <div className="lg:col-span-1">
              {loading.prediction ? (
                <LoadingCard title="ML Prediction" />
              ) : prediction ? (
                <div className="card h-full">
                  <div className="flex items-center gap-2 mb-4">
                    {prediction.prediction === "Drinkable" ? (
                      <ShieldCheck size={20} className="text-safe" />
                    ) : (
                      <ShieldAlert size={20} className="text-unsafe" />
                    )}
                    <h3 className="font-[family-name:var(--font-family-grotesk)] font-semibold text-lg">ML Prediction</h3>
                  </div>
                  <div className="py-6 flex flex-col items-center justify-center relative">
                    <WaterWave 
                      percentage={prediction.drinkable_probability} 
                      isDrinkable={prediction.prediction === "Drinkable"} 
                      size={180} 
                    />
                    <p className={`mt-6 text-xl font-bold uppercase tracking-wider shadow-glow-sm ${
                        prediction.prediction === "Drinkable" ? "text-safe" : "text-unsafe"
                    }`}>
                      {prediction.prediction}
                    </p>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mt-1">
                      ML Confidence: {prediction.confidence.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Year</span>
                      <span className="text-text-primary font-medium">{prediction.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Samples</span>
                      <span className="text-text-primary font-medium">{prediction.sample_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Drinkable prob.</span>
                      <span className="text-safe font-medium">{prediction.drinkable_probability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Not drinkable prob.</span>
                      <span className="text-unsafe font-medium">{prediction.not_drinkable_probability}%</span>
                    </div>
                  </div>

                  {/* Violations */}
                  {prediction.violations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-default">
                      <p className="text-xs font-medium text-unsafe flex items-center gap-1 mb-2">
                        <AlertTriangle size={14} /> BIS Limit Violations
                      </p>
                      {prediction.violations.map((v, i) => (
                        <div key={i} className="flex justify-between text-xs py-1">
                          <span className="text-text-secondary">{v.param}</span>
                          <span className="text-unsafe">
                            {typeof v.value === "number" ? v.value.toFixed(2) : v.value} <span className="text-text-muted">(limit: {v.limit})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Parameter Gauges */}
            <div className="lg:col-span-2">
              {loading.prediction ? (
                <LoadingCard title="Water Parameters" />
              ) : prediction ? (
                <div className="card h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <FlaskConical size={20} className="text-accent-cyan" />
                    <h3 className="font-[family-name:var(--font-family-grotesk)] font-semibold text-lg">Water Parameters</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(prediction.parameters).map(([key, val]) => {
                      if (val === null) return null;
                      const isViolation = prediction.violations.some((v) => v.param === key || v.param.toLowerCase() === key);
                      return (
                        <div
                          key={key}
                          className={`rounded-xl p-3 text-center border transition-colors ${
                            isViolation
                              ? "bg-unsafe/5 border-unsafe/20"
                              : "bg-bg-card border-border-default"
                          }`}
                        >
                          <p className="text-xs text-text-muted mb-1 truncate">{PARAM_LABELS[key] || key}</p>
                          <p className={`text-lg font-bold font-[family-name:var(--font-family-mono)] ${
                            isViolation ? "text-unsafe" : "text-text-primary"
                          }`}>
                            {typeof val === "number" ? (val > 100 ? val.toFixed(0) : val.toFixed(2)) : val}
                          </p>
                          {isViolation && (
                            <p className="text-[10px] text-unsafe mt-0.5 flex items-center justify-center gap-0.5">
                              <AlertTriangle size={10} /> Exceeds BIS
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Row 2: Trend Charts */}
          {(loading.trends || trends) && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-accent-green" />
                <h3 className="font-[family-name:var(--font-family-grotesk)] font-semibold text-lg">Year-over-Year Trends</h3>
              </div>
              {loading.trends ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-text-muted" />
                </div>
              ) : trends ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {["ph", "tds", "nitrate", "fluoride", "conductivity", "arsenic"].map((param, idx) => {
                    const data = trends.years.map((year, i) => ({
                      year,
                      value: trends.parameters[param]?.[i],
                    })).filter((d) => d.value !== null && d.value !== undefined);

                    if (data.length === 0) return null;

                    return (
                      <div key={param} className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                        <p className="text-sm font-medium text-text-secondary mb-3">{PARAM_LABELS[param] || param}</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                            <XAxis dataKey="year" tick={{ fill: "#8b9cbe", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#8b9cbe", fontSize: 12 }} width={50} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#111827",
                                border: "1px solid #1e2d45",
                                borderRadius: "12px",
                                color: "#f0f4ff",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 4, fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* Row 3: AI Analysis */}
          {(loading.analysis || analysis) && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={20} className="text-accent-purple" />
                <h3 className="font-[family-name:var(--font-family-grotesk)] font-semibold text-lg">Gemini AI Analysis</h3>
              </div>
              {loading.analysis ? (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Analyzing with Gemini AI...</span>
                </div>
              ) : analysis?.analysis ? (
                <div className="space-y-5">
                  {/* Summary */}
                  <div className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="text-accent-blue mt-0.5 shrink-0" />
                      <p className="text-sm text-text-primary leading-relaxed">{analysis.analysis.summary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contamination Causes */}
                    <div className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                      <p className="text-sm font-semibold text-accent-orange mb-3 flex items-center gap-2">
                        <AlertTriangle size={14} /> Contamination Causes
                      </p>
                      <ul className="space-y-2">
                        {analysis.analysis.contamination_causes?.map((c, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-accent-orange mt-1">•</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Health Risks */}
                    <div className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                      <p className="text-sm font-semibold text-unsafe mb-3 flex items-center gap-2">
                        <ShieldAlert size={14} /> Health Risks
                      </p>
                      <ul className="space-y-2">
                        {analysis.analysis.health_risks?.map((r, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-unsafe mt-1">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Remediation */}
                    <div className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                      <p className="text-sm font-semibold text-safe mb-3 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Remediation
                      </p>
                      <ul className="space-y-2">
                        {analysis.analysis.remediation?.map((r, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <span className="text-safe mt-1">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Regional Factors */}
                    <div className="bg-bg-card/50 rounded-xl p-4 border border-border-default">
                      <p className="text-sm font-semibold text-accent-cyan mb-3 flex items-center gap-2">
                        <Activity size={14} /> Regional Factors
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {analysis.analysis.regional_factors}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted py-4">AI analysis unavailable.</p>
              )}
            </div>
          )}

          {/* Row 4: Model Metrics */}
          {metrics && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={20} className="text-accent-yellow" />
                <h3 className="font-[family-name:var(--font-family-grotesk)] font-semibold text-lg">Model Performance</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Accuracy", value: metrics.accuracy, color: "text-accent-blue" },
                  { label: "Precision", value: metrics.precision, color: "text-accent-green" },
                  { label: "Recall", value: metrics.recall, color: "text-accent-yellow" },
                  { label: "F1 Score", value: metrics.f1_score, color: "text-accent-purple" },
                ].map((m) => (
                  <div key={m.label} className="bg-bg-card/50 rounded-xl p-4 text-center border border-border-default">
                    <p className={`text-2xl font-bold font-[family-name:var(--font-family-mono)] ${m.color}`}>
                      {(m.value * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted mt-1">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Feature Importance */}
              {metrics.feature_importance && (
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-3">Feature Importance</p>
                  <div className="space-y-2">
                    {Object.entries(metrics.feature_importance)
                      .sort(([, a], [, b]) => b - a)
                      .map(([feature, imp]) => (
                        <div key={feature} className="flex items-center gap-3">
                          <span className="text-xs text-text-muted w-28 truncate text-right">{PARAM_LABELS[feature] || feature}</span>
                          <div className="flex-1 h-5 bg-bg-card rounded-full overflow-hidden border border-border-default">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan transition-all duration-500"
                              style={{ width: `${Math.max(imp * 100 * 2, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary w-12 font-[family-name:var(--font-family-mono)]">
                            {(imp * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Class Distribution */}
              <div className="mt-4 pt-4 border-t border-border-default flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-safe" />
                  <span className="text-xs text-text-secondary">Drinkable: {metrics.class_distribution?.drinkable}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-unsafe" />
                  <span className="text-xs text-text-secondary">Not Drinkable: {metrics.class_distribution?.not_drinkable}</span>
                </div>
                <span className="text-xs text-text-muted ml-auto">Total: {metrics.total_samples} samples</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selectedState && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 flex items-center justify-center mx-auto mb-4">
            <Droplets size={36} className="text-accent-blue" />
          </div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-family-grotesk)] text-text-primary mb-2">
            Select a State
          </h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Choose an Indian state above to see ML-powered water drinkability predictions,
            parameter trends, and AI-generated contamination analysis.
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <div className="card h-full flex flex-col items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-accent-blue mb-3" />
      <p className="text-sm text-text-muted">Loading {title}...</p>
    </div>
  );
}
