/**
 * Water Components Integration Example
 * 
 * This file demonstrates how to integrate the new water quality components
 * with the existing water page functionality.
 */

"use client";

import { useState, useEffect } from "react";
import { Droplets, RefreshCw } from "lucide-react";
import {
  WaterStateMap,
  WaterComparison,
  WaterMetrics,
  WaterChart,
  WaterRecommendations,
  WaterInfoCard,
} from "@/components/water";
import { useWaterQuality, useWaterHistory, useWaterRecommendations } from "@/hooks/useWaterQuality";

interface WaterDashboardProps {
  initialLocation?: string;
}

/**
 * Example Implementation 1: Basic Water Quality Dashboard
 * Shows how to use the components in a simple dashboard layout
 */
export function BasicWaterDashboard({ initialLocation = "Delhi" }: WaterDashboardProps) {
  const [location, setLocation] = useState(initialLocation);
  const { data, loading, error, refetch } = useWaterQuality(location);

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 font-medium">Error loading water data</p>
        <p className="text-red-300 text-sm mt-1">{error.message}</p>
        <button
          onClick={refetch}
          className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Water Quality Dashboard</h1>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* State Selection */}
      <WaterStateMap onStateSelect={setLocation} selectedState={location} />

      {/* Current Metrics */}
      {data && (
        <>
          <WaterMetrics
            metrics={data.metrics}
            isLoading={loading}
            onMetricClick={(id) => console.log(`Clicked metric: ${id}`)}
          />

          {/* Parameter Comparison */}
          <WaterComparison
            parameters={Object.entries(data.parameters).map(([name, value]) => ({
              name,
              value,
              unit: getParameterUnit(name),
              trend: Math.random() > 0.5 ? "up" : "down",
              range: getParameterRange(name),
              status: getParameterStatus(name, value),
            }))}
            location={location}
          />
        </>
      )}
    </div>
  );
}

/**
 * Example Implementation 2: Advanced Dashboard with Historical Data
 * Shows how to combine real-time data with historical trends
 */
export function AdvancedWaterDashboard({ initialLocation = "Delhi" }: WaterDashboardProps) {
  const [location, setLocation] = useState(initialLocation);
  const { data: currentData, loading: currentLoading } = useWaterQuality(location);
  const { data: history, loading: historyLoading } = useWaterHistory(location, "day");
  const { recommendations, loading: recsLoading } = useWaterRecommendations(location);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar: State Selection and Key Info */}
      <div className="lg:col-span-1 space-y-4">
        <WaterStateMap onStateSelect={setLocation} selectedState={location} />

        {currentData && (
          <>
            <WaterInfoCard
              title="Water Quality Index"
              value={currentData.wqi.toFixed(1)}
              status={getWQIStatus(currentData.wqi)}
              description="Overall water quality assessment"
            />

            <WaterInfoCard
              title="Temperature"
              value={`${currentData.temperature?.toFixed(1)}°C`}
              status={getTemperatureStatus(currentData.temperature)}
              description="Current water temperature"
            />

            <WaterRecommendations
              recommendations={recommendations}
              isLoading={recsLoading}
            />
          </>
        )}
      </div>

      {/* Main Content: Charts and Analysis */}
      <div className="lg:col-span-2 space-y-6">
        {/* Historical Trend */}
        {!historyLoading && history.length > 0 && (
          <WaterChart
            data={history.map((h) => ({
              timestamp: new Date(h.timestamp).toLocaleTimeString(),
              value: h.wqi,
            }))}
            title="24-Hour WQI Trend"
            unit="WQI"
            min={0}
            max={100}
            threshold={60}
          />
        )}

        {/* Current Metrics Grid */}
        {currentData && (
          <>
            <WaterMetrics metrics={currentData.metrics} isLoading={currentLoading} />

            {/* Parameter Comparison */}
            <WaterComparison
              parameters={Object.entries(currentData.parameters).map(([name, value]) => ({
                name,
                value,
                unit: getParameterUnit(name),
                trend: "stable",
                range: getParameterRange(name),
                status: getParameterStatus(name, value),
              }))}
              location={location}
              timestamp={new Date(currentData.timestamp).toLocaleString()}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Example Implementation 3: Multi-State Comparison View
 * Shows how to compare water quality across multiple locations
 */
export function MultiStateComparisonView() {
  const locations = ["Delhi", "Mumbai", "Bangalore", "Chennai"];
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Delhi"]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Multi-State Water Quality Comparison</h1>

        {/* Location Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() =>
                setSelectedLocations((prev) =>
                  prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
                )
              }
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                selectedLocations.includes(loc)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedLocations.map((location) => (
          <ComparisonCard key={location} location={location} />
        ))}
      </div>
    </div>
  );
}

/**
 * Helper Component: Comparison Card for individual location
 */
function ComparisonCard({ location }: { location: string }) {
  const { data, loading } = useWaterQuality(location);

  if (loading) {
    return (
      <div className="h-48 bg-gray-800/30 rounded-lg border border-border/50 animate-pulse" />
    );
  }

  if (!data) {
    return (
      <div className="h-48 bg-gray-800/30 rounded-lg border border-border/50 flex items-center justify-center">
        <p className="text-muted-foreground">No data</p>
      </div>
    );
  }

  return (
    <WaterInfoCard
      title={location}
      value={data.wqi.toFixed(1)}
      status={getWQIStatus(data.wqi)}
      description="Water Quality Index"
    >
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <span className="text-white font-medium">{data.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">pH:</span>
          <span className="text-white font-medium">{data.ph?.toFixed(2) || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Temperature:</span>
          <span className="text-white font-medium">
            {data.temperature?.toFixed(1) || "N/A"}°C
          </span>
        </div>
      </div>
    </WaterInfoCard>
  );
}

/**
 * Example Implementation 4: Integrated Page with Existing Functionality
 * Shows how to combine new components with existing water page features
 */
export function IntegratedWaterPage() {
  const [location, setLocation] = useState("Delhi");
  const { data: currentData, loading: currentLoading } = useWaterQuality(location);
  const { data: history } = useWaterHistory(location, "week");

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Droplets size={22} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold">Water Quality Intelligence</h1>
        </div>
        <p className="text-gray-400 ml-13">Real-time monitoring &amp; analysis</p>
      </div>

      {/* New Water Components Section */}
      <div className="space-y-6">
        {/* Section 1: Location Selection */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Select Location</h2>
          <WaterStateMap onStateSelect={setLocation} selectedState={location} />
        </section>

        {currentData && (
          <>
            {/* Section 2: Key Metrics */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Current Quality Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <WaterInfoCard
                  title="WQI"
                  value={currentData.wqi.toFixed(1)}
                  status={getWQIStatus(currentData.wqi)}
                  description="Water Quality Index"
                />
                <WaterInfoCard
                  title="pH"
                  value={currentData.ph?.toFixed(2)}
                  status={getParameterStatus("pH", currentData.ph)}
                  description="Acidity/Alkalinity"
                />
                <WaterInfoCard
                  title="Temperature"
                  value={`${currentData.temperature?.toFixed(1)}°C`}
                  status={getTemperatureStatus(currentData.temperature)}
                  description="Current Temperature"
                />
                <WaterInfoCard
                  title="Conductivity"
                  value={currentData.conductivity?.toFixed(0)}
                  status={getParameterStatus("conductivity", currentData.conductivity)}
                  description="in µS/cm"
                />
              </div>
            </section>

            {/* Section 3: Detailed Metrics */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">All Parameters</h2>
              <WaterMetrics
                metrics={currentData.metrics}
                isLoading={currentLoading}
              />
            </section>

            {/* Section 4: Historical Trends */}
            {history.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Weekly Trend</h2>
                <WaterChart
                  data={history.map((h) => ({
                    timestamp: new Date(h.timestamp).toLocaleDateString(),
                    value: h.wqi,
                  }))}
                  title="Water Quality Index"
                  unit="WQI"
                  min={0}
                  max={100}
                />
              </section>
            )}

            {/* Section 5: Parameter Comparison */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Detailed Analysis</h2>
              <WaterComparison
                parameters={Object.entries(currentData.parameters).map(([name, value]) => ({
                  name,
                  value,
                  unit: getParameterUnit(name),
                  trend: "stable",
                  range: getParameterRange(name),
                  status: getParameterStatus(name, value),
                }))}
                location={location}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Helper Functions ───────────────────────────────────────── */

function getParameterUnit(name: string): string {
  const units: Record<string, string> = {
    pH: "pH",
    temperature: "°C",
    turbidity: "NTU",
    conductivity: "µS/cm",
    dissolvedOxygen: "mg/L",
    ammonia: "mg/L",
    nitrate: "mg/L",
    phosphate: "mg/L",
  };
  return units[name] || "units";
}

function getParameterRange(name: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 10, max: 40 },
    turbidity: { min: 0, max: 10 },
    conductivity: { min: 0, max: 2000 },
    dissolvedOxygen: { min: 0, max: 14 },
    ammonia: { min: 0, max: 2 },
    nitrate: { min: 0, max: 50 },
  };
  return ranges[name] || { min: 0, max: 100 };
}

function getParameterStatus(
  name: string,
  value?: number
): "safe" | "warning" | "danger" {
  if (!value) return "warning";

  const thresholds: Record<string, { safe: number; warning: number }> = {
    pH: { safe: 8.5, warning: 9 },
    temperature: { safe: 30, warning: 35 },
    turbidity: { safe: 5, warning: 10 },
    conductivity: { safe: 1000, warning: 1500 },
    dissolvedOxygen: { safe: 6, warning: 4 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "safe";

  if (value <= threshold.safe) return "safe";
  if (value <= threshold.warning) return "warning";
  return "danger";
}

function getTemperatureStatus(temp?: number): "safe" | "warning" | "danger" {
  if (!temp) return "warning";
  if (temp >= 10 && temp <= 30) return "safe";
  if (temp >= 0 && temp <= 40) return "warning";
  return "danger";
}

function getWQIStatus(wqi: number): "safe" | "warning" | "danger" {
  if (wqi >= 80) return "safe";
  if (wqi >= 60) return "warning";
  return "danger";
}
