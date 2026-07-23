import React, { useEffect, useState } from 'react';
import { Activity, Brain, CloudSun, MapPin, RefreshCw, Thermometer, Waves } from 'lucide-react';
import { AgentRulesPanel, type AgentAction as RulesAgentAction } from '@/components/agent/AgentRulesPanel';
import { ConversationMemory, MemoryItem } from './ConversationMemory';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

type SafetyContext = {
  city: string;
  aqi?: number;
  temperature?: number;
  verdict?: string;
};

type AgentAction = {
  type: string;
  status: string;
};

type CitySuggestion = {
  value: string;
  subtitle?: string;
};

interface ChatSidebarProps {
  safetyData: SafetyContext | null;
  safetyLoading?: boolean;
  safetyError?: string | null;
  lastUpdated?: Date | null;
  currentCity?: string;
  agentActions?: AgentAction[];
  agentConfidence?: number | null;
  memory?: MemoryItem[];
  onCitySubmit?: (city: string) => void;
  onRefresh?: () => void;
  onMemoryRemove?: (item: MemoryItem) => void;
  onMemoryClear?: () => void;
  embedded?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

type Tab = 'context' | 'agent' | 'memory';

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  safetyData,
  safetyLoading = false,
  safetyError,
  lastUpdated,
  currentCity,
  agentActions = [],
  agentConfidence,
  memory = [],
  onCitySubmit,
  onRefresh,
  onMemoryRemove,
  onMemoryClear,
  embedded = false,
  isMobile = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('context');
  const [cityDraft, setCityDraft] = useState(currentCity || safetyData?.city || 'Delhi');
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  useEffect(() => {
    const updated = currentCity || safetyData?.city || 'Delhi';
    setCityDraft(updated);
  }, [currentCity, safetyData?.city]);

  useEffect(() => {
    const query = cityDraft.trim();
    if (query.length < 2) {
      setCitySuggestions([]);
      setLoadingCitySuggestions(false);
      return;
    }

    let active = true;
    setLoadingCitySuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/location-suggestions?q=${encodeURIComponent(query)}&limit=6`
        ).catch(() => null);

        if (!response?.ok || !active) {
          if (active) {
            setCitySuggestions([]);
          }
          return;
        }

        const payload = await response.json();
        const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
        const mapped = suggestions
          .map((entry: { city?: string; formatted_address?: string }) => ({
            value: entry.city || entry.formatted_address || '',
            subtitle: entry.formatted_address,
          }))
          .filter((entry: CitySuggestion) => !!entry.value)
          .slice(0, 6);

        if (active) {
          setCitySuggestions(mapped);
          setShowCitySuggestions(true);
        }
      } finally {
        if (active) {
          setLoadingCitySuggestions(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cityDraft]);

  const handleSubmitCity = () => {
    const nextCity = cityDraft.trim() || 'Delhi';
    onCitySubmit?.(nextCity);
    setShowCitySuggestions(false);
  };

  const handleSuggestionSelect = (city: string) => {
    setCityDraft(city);
    onCitySubmit?.(city);
    setShowCitySuggestions(false);
  };

  const currentAqi = safetyData?.aqi;
  const currentTemp = safetyData?.temperature;

  const getAqiMeta = (aqi?: number) => {
    if (aqi === undefined) {
      return {
        label: 'Unknown',
        tone: 'text-slate-300 bg-slate-500/20 border-slate-400/20',
      };
    }
    if (aqi <= 50) {
      return {
        label: 'Good',
        tone: 'text-emerald-200 bg-emerald-500/20 border-emerald-400/20',
      };
    }
    if (aqi <= 100) {
      return {
        label: 'Moderate',
        tone: 'text-amber-200 bg-amber-500/20 border-amber-400/20',
      };
    }
    if (aqi <= 200) {
      return {
        label: 'Unhealthy',
        tone: 'text-orange-200 bg-orange-500/20 border-orange-400/20',
      };
    }
    return {
      label: 'Severe',
      tone: 'text-red-200 bg-red-500/20 border-red-400/20',
    };
  };

  const getRiskText = (verdict?: string) => {
    const value = (verdict || '').toLowerCase();
    if (value.includes('good') || value.includes('low')) {
      return 'Low risk for most people. Outdoor activity is generally fine.';
    }
    if (value.includes('moderate')) {
      return 'Moderate risk. Sensitive groups should limit prolonged exposure.';
    }
    if (value.includes('high') || value.includes('unhealthy') || value.includes('severe')) {
      return 'Elevated risk. Reduce outdoor exposure and use protection.';
    }
    return 'Ask the assistant for a personalized safety recommendation.';
  };

  const aqiMeta = getAqiMeta(currentAqi);
  const aqiBarWidth = Math.max(0, Math.min(((currentAqi || 0) / 300) * 100, 100));
  const mappedAgentActions: RulesAgentAction[] = agentActions.map((action, idx) => {
    const status = action.status.toLowerCase();
    const isBlocked = status.includes('block') || status.includes('deny') || status.includes('unsafe');

    return {
      timestamp: new Date(Date.now() - idx * 1000),
      actionType: action.type,
      decision: isBlocked ? 'BLOCKED' : 'ALLOWED',
      reason: action.status,
    };
  });

  const formattedUpdatedAt = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const contextContent = (
    <div className={embedded ? 'space-y-3 p-3 sm:p-4' : 'space-y-4 p-4'}>
      <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(37,99,235,0.18),rgba(15,23,42,0.82))] p-4 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Current City</div>
            <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
              <MapPin className="h-4 w-4 text-blue-200" />
              <span>{safetyData?.city || currentCity || 'Delhi'}</span>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-blue-100">
            Live Context
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <input
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
              onFocus={() => setShowCitySuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowCitySuggestions(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitCity();
                }
              }}
              placeholder="Type a city, e.g. Chennai"
              className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-400/50"
            />

            {showCitySuggestions && (citySuggestions.length > 0 || loadingCitySuggestions) && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 shadow-2xl">
                {loadingCitySuggestions && (
                  <div className="px-3 py-2 text-xs text-slate-400">Loading suggestions...</div>
                )}
                {!loadingCitySuggestions && citySuggestions.map((entry, idx) => (
                  <button
                    key={`${entry.value}-${idx}`}
                    type="button"
                    onMouseDown={() => handleSuggestionSelect(entry.value)}
                    className="w-full border-b border-white/5 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/10"
                  >
                    <div className="text-sm text-white">{entry.value}</div>
                    {entry.subtitle && (
                      <div className="mt-0.5 truncate text-[11px] text-slate-400">{entry.subtitle}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitCity}
              className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-white/25 hover:bg-white/15"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-300/80">
          {safetyLoading ? 'Refreshing live safety data...' : `Last updated: ${formattedUpdatedAt}`}
        </div>
        {safetyError && (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {safetyError}
          </div>
        )}
      </div>

      {safetyData ? (
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Activity className="h-3.5 w-3.5" />
                Live Snapshot
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${aqiMeta.tone}`}>
                {aqiMeta.label}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-mono">AQI</div>
                <div className="mt-1 text-lg font-semibold text-white font-mono">{currentAqi ?? '--'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-mono">Temp</div>
                <div className="mt-1 text-lg font-semibold text-white font-mono">{currentTemp !== undefined ? `${currentTemp}°` : '--'}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-mono">Risk</div>
                <div className="mt-1 truncate text-sm font-semibold text-white font-mono">{safetyData.verdict || 'Unknown'}</div>
              </div>
            </div>

            {currentAqi !== undefined && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>AQI scale</span>
                  <span>{currentAqi} / 300</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-red-400"
                    style={{ width: `${aqiBarWidth}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(8,47,73,0.45),rgba(3,7,18,0.82))] p-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              <CloudSun className="h-3.5 w-3.5" />
              Environmental Summary
            </div>
            <div className="mt-2 space-y-2 text-sm text-slate-200">
              <div className="inline-flex items-center gap-2">
                <Waves className="h-4 w-4 text-blue-300" />
                <span>Air quality is currently marked as {aqiMeta.label.toLowerCase()}.</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-300" />
                <span>
                  {currentTemp !== undefined
                    ? `Temperature is ${currentTemp}°C.`
                    : 'Temperature data is currently unavailable.'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {getRiskText(safetyData.verdict)}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
          No data loaded yet. Use the city editor above to start.
        </div>
      )}
    </div>
  );

  const tabButtons = (
    <div className="flex bg-white/5 rounded-xl p-1 mx-4 mt-4 border border-white/10">
      <button
        onClick={() => setActiveTab('context')}
        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          activeTab === 'context'
            ? 'bg-accent-cyan/15 text-accent-cyan shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        Context
      </button>
      <button
        onClick={() => setActiveTab('agent')}
        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          activeTab === 'agent'
            ? 'bg-accent-cyan/15 text-accent-cyan shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        Agent
      </button>
      <button
        onClick={() => setActiveTab('memory')}
        className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          activeTab === 'memory'
            ? 'bg-accent-cyan/15 text-accent-cyan shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        Memory
      </button>
    </div>
  );

  const tabContent = (
    <div className={embedded ? 'max-h-[68vh] overflow-y-auto' : 'flex-1 overflow-y-auto'}>
      {activeTab === 'context' && contextContent}

      {activeTab === 'agent' && (
        <div className="p-4">
          <AgentRulesPanel
            actions={mappedAgentActions}
            lastConfidence={agentConfidence ?? undefined}
            isActive={safetyLoading}
            className="w-full max-w-none static"
          />
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(34,197,94,0.14),rgba(15,23,42,0.84))] p-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
              <Brain className="h-3.5 w-3.5" />
              Memory Context
            </div>
            <div className="mt-2 text-sm text-slate-200">
              Saved chat context helps the assistant keep your city and safety preferences in scope.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70">
            <ConversationMemory
              memory={memory}
              onRemove={onMemoryRemove}
              onClear={onMemoryClear}
              exchangeCount={memory.length}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#091121] sm:mx-4">
        <div className="overflow-x-auto">{tabButtons}</div>
        <div>{tabContent}</div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="hidden w-80 flex-col border-l border-border bg-gradient-to-b from-[#0b1222] via-[#09142b] to-[#060c18] lg:flex">
          {/* Tabs */}
          {tabButtons}

          {/* Tab content */}
          {tabContent}
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Overlay */}
          <div
            className="flex-1 bg-black/50"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <div className="bg-gray-900 border-t border-border rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-border p-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Context &amp; Info</div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {contextContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
