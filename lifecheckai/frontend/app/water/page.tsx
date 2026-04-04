"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Waves,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { WaterWave } from "@/components/ui/WaterWave";
import {
  WATER_PARAMETER_META,
  fetchWaterModelMetrics,
  fetchWaterNearby,
  fetchWaterPrediction,
  fetchWaterStates,
  fetchWaterStations,
  fetchWaterTrends,
  formatWaterValue,
  trendTone,
} from "@/lib/water";
import type {
  WaterFlagStatus,
  WaterModelMetrics,
  WaterPrediction,
  WaterStateOption,
  WaterStation,
  WaterTrends,
} from "@/types/water";

const DEFAULT_PARAMETER = "tds";

function getFlagClasses(status: WaterFlagStatus): string {
  if (status === "critical") return "border-danger/40 bg-danger/10 text-danger";
  if (status === "caution") return "border-warning/40 bg-warning/10 text-warning";
  if (status === "normal") return "border-safe/40 bg-safe/10 text-safe";
  return "border-border-default bg-white/5 text-text-secondary";
}

function getBarTone(status: WaterFlagStatus): string {
  if (status === "critical") return "#ef4444";
  if (status === "caution") return "#f59e0b";
  if (status === "normal") return "#22c55e";
  return "#64748b";
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-3 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function FlagBadge({ status }: { status: WaterFlagStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getFlagClasses(status)}`}
    >
      {status}
    </span>
  );
}

export default function WaterPage() {
  const [states, setStates] = useState<WaterStateOption[]>([]);
  const [datasetYears, setDatasetYears] = useState<number[]>([]);
  const [stations, setStations] = useState<WaterStation[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [stationQuery, setStationQuery] = useState("");
  const [stationMenuOpen, setStationMenuOpen] = useState(false);
  const [activeParameter, setActiveParameter] = useState(DEFAULT_PARAMETER);
  const [prediction, setPrediction] = useState<WaterPrediction | null>(null);
  const [trends, setTrends] = useState<WaterTrends | null>(null);
  const [metrics, setMetrics] = useState<WaterModelMetrics | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const pendingStationIdRef = useRef<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function boot() {
      setBootLoading(true);
      try {
        const [statePayload, metricsPayload] = await Promise.all([
          fetchWaterStates(),
          fetchWaterModelMetrics(),
        ]);
        if (ignore) return;
        console.log("DEBUG: statePayload", statePayload);
        console.log("DEBUG: metricsPayload", metricsPayload);

        // Backend might return strings or objects depending on version/environment
        const normalizedStates = (statePayload.states || []).map((s: any) =>
          typeof s === 'string' ? { name: s, station_count: 0, sample_count: 0, years: [] } : s
        );

        setStates(normalizedStates);
        setDatasetYears(statePayload.dataset_years || []);
        setMetrics(metricsPayload);
      } catch (nextError) {
        if (ignore) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load water intelligence.");
      } finally {
        if (!ignore) setBootLoading(false);
      }
    }

    boot();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedState) {
      setStations([]);
      return;
    }

    let ignore = false;

    async function loadStations() {
      setStationsLoading(true);
      try {
        const payload = await fetchWaterStations(selectedState);
        if (ignore) return;
        setStations(payload.stations);

        const pending = pendingStationIdRef.current;
        if (pending) {
          const matched = payload.stations.find((station) => station.id === pending);
          if (matched) {
            setSelectedStationId(matched.id);
            setStationQuery(matched.name);
          }
          pendingStationIdRef.current = null;
        }
      } catch (nextError) {
        if (ignore) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load monitoring locations.");
      } finally {
        if (!ignore) setStationsLoading(false);
      }
    }

    loadStations();
    return () => {
      ignore = true;
    };
  }, [selectedState]);

  useEffect(() => {
    if (!trends) return;
    const available = Object.entries(trends.parameters)
      .filter(([, values]) => values.some((value) => value !== null))
      .map(([key]) => key);
    if (available.length > 0 && !available.includes(activeParameter)) {
      setActiveParameter(available[0]);
    }
  }, [trends, activeParameter]);

  const selectedStateSummary = useMemo(
    () => states.find((state) => state.name === selectedState) ?? null,
    [selectedState, states],
  );

  const filteredStateOptions = useMemo(() => {
    const query = stateQuery.trim().toLowerCase();
    return query
      ? states.filter((state) => state.name.toLowerCase().includes(query))
      : states;
  }, [stateQuery, states]);

  const filteredStations = useMemo(() => {
    const query = stationQuery.trim().toLowerCase();
    const matched = query
      ? stations.filter((station) => station.name.toLowerCase().includes(query))
      : stations;
    return matched.slice(0, 8);
  }, [stationQuery, stations]);

  const visibleParameters = useMemo(
    () => prediction?.parameter_statuses.filter((item) => item.value !== null) ?? [],
    [prediction],
  );

  const topFeatures = useMemo(
    () => (metrics ? Object.entries(metrics.feature_importance).slice(0, 8) : []),
    [metrics],
  );

  const trendChartData = useMemo(() => {
    if (!trends) return [];
    return trends.years
      .map((year, index) => ({
        year,
        value: trends.parameters[activeParameter]?.[index] ?? null,
      }))
      .filter((item) => item.value !== null);
  }, [activeParameter, trends]);

  const comparisonChartData = useMemo(() => {
    if (!prediction) return [];
    return prediction.parameter_statuses
      .filter((item) => item.value !== null && item.ideal_max !== undefined && item.ideal_max !== null)
      .map((item) => {
        const idealMax = item.ideal_max ?? 0;
        return {
          name: item.label,
          ratio: idealMax === 0 ? (item.value! > 0 ? 100 : 0) : (item.value! / idealMax) * 100,
          status: item.status,
        };
      });
  }, [prediction]);

  async function runAnalysis(overrides?: {
    state?: string;
    stationId?: string;
    location?: string;
  }) {
    const targetState = overrides?.state ?? selectedState;
    const targetStationId = overrides?.stationId ?? (selectedStationId || undefined);
    const typedLocation =
      overrides?.location ??
      (!targetStationId ? stationQuery.trim() || undefined : undefined);

    if (!targetState) {
      setError("Choose a state before running the water analysis.");
      return;
    }

    setAnalysisLoading(true);
    setError(null);

    try {
      const [nextPrediction, nextTrends] = await Promise.all([
        fetchWaterPrediction({
          state: targetState,
          stationId: targetStationId,
          location: typedLocation,
        }),
        fetchWaterTrends({
          state: targetState,
          stationId: targetStationId,
          location: typedLocation,
        }),
      ]);

      setPrediction(nextPrediction);
      setTrends(nextTrends);

      if (nextPrediction.scope === "nearby" && nextPrediction.matched_location) {
        setLocationNotice(`Using the nearest monitored water source around ${nextPrediction.matched_location}.`);
      } else if (nextPrediction.scope === "station" && nextPrediction.matched_location) {
        setLocationNotice(`Showing monitoring-location data for ${nextPrediction.matched_location}.`);
      } else if (typedLocation) {
        setLocationNotice(
          `No exact monitoring-location match was found for "${typedLocation}". Showing the ${targetState} average and closest recommendations.`,
        );
      } else {
        setLocationNotice(`Showing the latest statewide groundwater profile for ${targetState}.`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to analyze this water profile.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Browser geolocation is not available in this environment.");
      return;
    }

    setNearbyLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const payload = await fetchWaterNearby(
        position.coords.latitude,
        position.coords.longitude,
      );

      setPrediction(payload.prediction);
      setTrends(payload.trends);
      setSelectedState(payload.prediction.state);
      pendingStationIdRef.current = payload.prediction.matched_station?.id ?? null;
      if (payload.prediction.matched_station?.id) {
        setSelectedStationId(payload.prediction.matched_station.id);
      }
      setStationQuery(payload.prediction.matched_location || "");
      setLocationNotice(
        payload.prediction.matched_location
          ? `Detected ${payload.resolved_place?.formatted_address || payload.resolved_place?.city || "your location"} and linked it to ${payload.prediction.matched_location}.`
          : `Detected ${payload.resolved_place?.formatted_address || payload.resolved_place?.city || "your location"} and loaded the closest state-level groundwater view.`,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to use your current location.");
    } finally {
      setNearbyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(0,212,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(124,58,237,0.18),_transparent_35%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,15,30,0.98))] p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(0,212,255,0.16),_transparent_55%)] lg:block" />
          <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <Droplets className="h-7 w-7 text-accent-cyan" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-accent-cyan">Water Quality Intelligence</p>
                  <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                    State-aware water safety, monitoring locations, and year-wise mineral trends
                  </h1>
                </div>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
                Pick a state, refine it to a monitoring location, or use your current location.
                The page now reads the eight available groundwater datasets directly from the backend,
                recommends station matches for the selected state, and scores drinkability with a Random Forest model.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1">
              <MiniStat label="States Covered" value={String(states?.length || 0)} tone="text-white" />
            </div>
          </div>
        </section>

        <SectionCard
          title="Search Water Data"
          subtitle="State selection powers the monitoring-location recommendations automatically."
          icon={<Search className="h-5 w-5 text-accent-cyan" />}
        >
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.25fr_auto_auto]">
            <div className="relative space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                State
              </label>
              <div className="relative">
                <input
                  value={stateQuery || (selectedState && states.find(s => s.name === selectedState)?.name) || ""}
                  placeholder="Select a state"
                  onFocus={() => setStateMenuOpen(true)}
                  onBlur={() => window.setTimeout(() => setStateMenuOpen(false), 150)}
                  onChange={(event) => {
                    setSelectedState("");
                    setStateQuery(event.target.value);
                    setStateMenuOpen(true);
                  }}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-accent-cyan"
                />
                <Search className="absolute right-4 top-3.5 h-5 w-5 text-text-muted" />
              </div>

              {stateMenuOpen && (
                <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f172acc] p-2 shadow-2xl backdrop-blur-xl">
                  {filteredStateOptions.length > 0 ? (
                    filteredStateOptions.map((state) => (
                      <button
                        key={state.name}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          pendingStationIdRef.current = null;
                          setSelectedState(state.name);
                          setStateQuery(state.name);
                          setSelectedStationId("");
                          setStationQuery("");
                          setPrediction(null);
                          setTrends(null);
                          setLocationNotice(null);
                          setError(null);
                          setStateMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-white/5"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{state.name}</p>
                          <p className="mt-1 text-[11px] text-text-secondary">
                            {state.station_count} stations • {state.years.join(", ")}
                          </p>
                        </div>
                        {selectedState === state.name && <CheckCircle2 className="h-4 w-4 text-safe" />}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl px-3 py-4 text-sm text-text-secondary">
                      No states matched this query.
                    </div>
                  )}
                </div>
              )}
              {selectedStateSummary ? (
                <p className="text-xs text-text-secondary">
                  {selectedStateSummary.station_count} monitoring locations across {selectedStateSummary.years.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="relative space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Monitoring Location
              </label>
              <div className="relative">
                <input
                  value={stationQuery}
                  disabled={!selectedState}
                  placeholder={selectedState ? "Search a monitoring location in the selected state" : "Select a state first"}
                  onFocus={() => setStationMenuOpen(true)}
                  onBlur={() => window.setTimeout(() => setStationMenuOpen(false), 150)}
                  onChange={(event) => {
                    setSelectedStationId("");
                    setStationQuery(event.target.value);
                    setStationMenuOpen(true);
                  }}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-12 text-sm text-white outline-none transition focus:border-accent-cyan disabled:cursor-not-allowed disabled:opacity-50"
                />
                {stationsLoading ? (
                  <Loader2 className="absolute right-4 top-3.5 h-5 w-5 animate-spin text-text-muted" />
                ) : (
                  <FlaskConical className="absolute right-4 top-3.5 h-5 w-5 text-text-muted" />
                )}
              </div>

              {stationMenuOpen && selectedState && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0f172acc] p-2 shadow-2xl backdrop-blur-xl">
                  {filteredStations.length > 0 ? (
                    filteredStations.map((station) => (
                      <button
                        key={station.id}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSelectedStationId(station.id);
                          setStationQuery(station.name);
                          setStationMenuOpen(false);
                        }}
                        className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-white/5"
                      >
                        <div>
                          <p className="text-sm text-white">{station.name}</p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {station.sample_count} records • latest {station.latest_year || "n/a"}
                          </p>
                        </div>
                        {station.code ? (
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-text-muted">
                            #{station.code}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl px-3 py-4 text-sm text-text-secondary">
                      No monitoring locations matched this search. You can still analyze the whole state.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => runAnalysis()}
              disabled={!selectedState || analysisLoading}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-violet px-5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:self-end"
            >
              {analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Waves className="h-4 w-4" />}
              Analyze
            </button>

            <button
              onClick={handleUseMyLocation}
              disabled={nearbyLoading}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-accent-cyan/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 lg:self-end"
            >
              {nearbyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Use My Location
            </button>
          </div>
        </SectionCard>

        {error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {locationNotice ? (
          <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/10 px-4 py-3 text-sm text-accent-cyan">
            {locationNotice}
          </div>
        ) : null}

        {bootLoading ? (
          <LoadingPanel label="Loading water intelligence..." />
        ) : prediction ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard
                title="Drinkability Score"
                subtitle={`Latest monitored year: ${prediction.year}`}
                icon={
                  prediction.prediction === "Drinkable" ? (
                    <ShieldCheck className="h-5 w-5 text-safe" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-danger" />
                  )
                }
              >
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6">
                    <WaterWave
                      percentage={prediction.drinkable_probability}
                      isDrinkable={prediction.prediction === "Drinkable"}
                      size={190}
                    />
                    <p className={`mt-5 text-xl font-semibold ${prediction.prediction === "Drinkable" ? "text-safe" : "text-danger"}`}>
                      {prediction.prediction}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-muted">
                      confidence {prediction.confidence.toFixed(1)}%
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Drinkable Prob." value={`${prediction.drinkable_probability.toFixed(1)}%`} tone="text-safe" />
                    <MiniStat label="Risk Level" value={prediction.risk_level} tone="text-warning" />
                    <MiniStat label="Samples Used" value={String(prediction.sample_count)} tone="text-white" />
                    <MiniStat
                      label="Station Scope"
                      value={
                        prediction.scope === "state"
                          ? "State Avg"
                          : prediction.scope === "nearby"
                            ? "Nearby"
                            : "Exact Station"
                      }
                      tone="text-accent-cyan"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Location Context"
                subtitle="Where this prediction came from and what the model recommends next."
                icon={<MapPin className="h-5 w-5 text-accent-violet" />}
              >
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">State</p>
                      <p className="mt-2 text-lg font-semibold text-white">{prediction.state}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Monitoring Location</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {prediction.matched_location || "Statewide aggregate"}
                      </p>
                      {prediction.distance_km ? (
                        <p className="mt-1 text-xs text-text-secondary">{prediction.distance_km.toFixed(1)} km away</p>
                      ) : null}
                    </div>
                  </div>

                  {prediction.resolved_place?.formatted_address ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Resolved Address</p>
                      <p className="mt-2 text-sm text-white">{prediction.resolved_place.formatted_address}</p>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Recommended Actions</p>
                    <div className="mt-3 space-y-2">
                      {prediction.recommendations.map((recommendation) => (
                        <div key={recommendation} className="flex items-start gap-2 text-sm text-text-secondary">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                          <span>{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {prediction.nearby_stations.length > 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Monitoring Suggestions</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {prediction.nearby_stations.map((station) => (
                          <button
                            key={station.id}
                            onClick={() => {
                              setSelectedStationId(station.id);
                              setStationQuery(station.name);
                              runAnalysis({
                                state: prediction.state,
                                stationId: station.id,
                              });
                            }}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white transition hover:border-accent-cyan/40 hover:bg-white/10"
                          >
                            {station.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Mineral And Safety Flags"
              subtitle="Normal, caution, and critical bands are shown per parameter."
              icon={<FlaskConical className="h-5 w-5 text-accent-cyan" />}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {visibleParameters.map((parameter) => (
                  <div
                    key={parameter.param}
                    className={`rounded-3xl border p-4 ${getFlagClasses(parameter.status)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] opacity-80">{parameter.label}</p>
                        <p className="mt-3 text-2xl font-semibold">
                          {formatWaterValue(parameter.param, parameter.value)}
                        </p>
                        {parameter.unit ? <p className="mt-1 text-xs opacity-70">{parameter.unit}</p> : null}
                      </div>
                      <FlagBadge status={parameter.status} />
                    </div>
                    <p className="mt-4 text-sm leading-6 opacity-90">{parameter.message}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <SectionCard
              title="How This Flow Works"
              subtitle="The water page now follows the clean data pipeline end-to-end."
              icon={<Droplets className="h-5 w-5 text-accent-cyan" />}
            >
              <div className="space-y-3 text-sm leading-7 text-text-secondary">
                <p>1. Pick a state to unlock that state’s monitoring locations.</p>
                <p>2. Choose an exact monitoring location or type a query to fall back to the closest state suggestion.</p>
                <p>3. Use “Use My Location” to reverse-geocode your device location and map it to a nearby monitored source.</p>
                <p>4. Review the Random Forest drinkability prediction, the excessive-parameter flags, and the year-wise trends.</p>
              </div>
            </SectionCard>

          </div>
        )}

        {prediction ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard
              title="Year-wise Trend Explorer"
              subtitle="Switch between parameters to inspect the yearly groundwater profile."
              icon={<TrendingUp className="h-5 w-5 text-accent-cyan" />}
            >
              {analysisLoading && !trends ? (
                <LoadingPanel label="Loading yearly trends..." />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(trends?.parameters || {})
                      .filter((parameter) => trends?.parameters[parameter]?.some((value) => value !== null))
                      .map((parameter) => (
                        <button
                          key={parameter}
                          onClick={() => setActiveParameter(parameter)}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                            activeParameter === parameter
                              ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan"
                              : "border-white/10 bg-white/5 text-text-secondary hover:border-accent-cyan/30 hover:text-white"
                          }`}
                        >
                          {WATER_PARAMETER_META[parameter]?.label || parameter}
                        </button>
                      ))}
                  </div>

                  <div className="h-[320px] rounded-3xl border border-white/10 bg-white/5 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} width={62} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid rgba(148,163,184,0.18)",
                            borderRadius: "16px",
                            color: "#ffffff",
                          }}
                        />
                        <ReferenceLine y={1000000} strokeOpacity={0} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={WATER_PARAMETER_META[activeParameter]?.accent || "#00D4FF"}
                          strokeWidth={3}
                          dot={{ r: 4, fill: WATER_PARAMETER_META[activeParameter]?.accent || "#00D4FF" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {Object.entries(trends?.overview || {}).map(([parameter, summary]) => (
                      <div
                        key={parameter}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                          {WATER_PARAMETER_META[parameter]?.label || parameter}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">
                          {summary.latest !== null ? formatWaterValue(parameter, summary.latest) : "No data"}
                        </p>
                        <p className={`mt-2 text-xs uppercase tracking-[0.16em] ${trendTone(summary.direction)}`}>
                          {summary.direction === "stable" ? "stable trend" : `${summary.direction} trend`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Excess Vs Desirable Limit"
              subtitle="100% means the latest value has reached the desirable limit."
              icon={<BarChart3 className="h-5 w-5 text-accent-violet" />}
            >
              <div className="h-[420px] rounded-3xl border border-white/10 bg-white/5 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(value) => `${Math.round(value)}%`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#e2e8f0", fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(148,163,184,0.18)",
                        borderRadius: "16px",
                        color: "#ffffff",
                      }}
                    />
                    <ReferenceLine x={100} stroke="#f59e0b" strokeDasharray="5 5" />
                    <Bar dataKey="ratio" radius={[0, 12, 12, 0]}>
                      {comparisonChartData.map((entry) => (
                        <Cell key={entry.name} fill={getBarTone(entry.status as WaterFlagStatus)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        ) : null}


        {prediction?.violations.length ? (
          <SectionCard
            title="Current Water Alerts"
            subtitle="Parameters that are already above the desirable or critical thresholds."
            icon={<AlertTriangle className="h-5 w-5 text-danger" />}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {prediction.violations.map((violation) => (
                <div key={violation.param} className="rounded-3xl border border-danger/25 bg-danger/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{violation.label}</p>
                    <FlagBadge status={violation.status} />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-danger">
                    {formatWaterValue(violation.param, violation.value)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">{violation.unit || "measured value"}</p>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{violation.message}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
