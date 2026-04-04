import React, { useState } from 'react';
import { ArrowRight, Loader } from 'lucide-react';

interface HeroDemoProps {
  onSearch?: (city: string) => void;
  isLoading?: boolean;
}

interface DemoResult {
  city: string;
  aqi: number;
  temp: number;
  status: 'SAFE' | 'CAUTION' | 'UNSAFE';
}

export const HeroInstantDemo: React.FC<HeroDemoProps> = ({ onSearch, isLoading = false }) => {
  const [inputCity, setInputCity] = useState('');
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputCity.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/check-safety?city=${encodeURIComponent(inputCity)}`);
      if (response.ok) {
        const data = await response.json();
        setDemoResult({
          city: data.city || inputCity,
          aqi: data.aqi || 0,
          temp: data.temperature || 0,
          status: data.verdict || 'CAUTION',
        });
      }
    } catch {
      console.error('Search failed');
    } finally {
      setSearching(false);
    }

    onSearch?.(inputCity);
  };

  const getStatusColor = (status: string) => {
    if (status === 'SAFE') return { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300', dot: 'bg-green-500' };
    if (status === 'CAUTION') return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300', dot: 'bg-yellow-500' };
    return { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', dot: 'bg-red-500' };
  };

  const colors = demoResult ? getStatusColor(demoResult.status) : {};

  return (
    <div className="py-8 space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Try: Delhi, Mumbai, Bangalore..."
            value={inputCity}
            onChange={(e) => setInputCity(e.target.value)}
            disabled={searching || isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-border text-white placeholder-gray-500 outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputCity.trim() || searching || isLoading}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center gap-2"
          >
            {searching ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Check
          </button>
        </div>
      </form>

      {/* Results Card */}
      {demoResult && (
        <div
          className={`border-l-4 ${colors.border} ${colors.bg} rounded-lg p-4 backdrop-blur-sm animate-slide-down`}
          style={{ borderLeftColor: colors.dot }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-white mb-3">{demoResult.city}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">AQI</div>
                  <div className="text-2xl font-bold text-white">{demoResult.aqi}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Temp</div>
                  <div className="text-2xl font-bold text-white">{demoResult.temp}°C</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${colors.text}`}>
                    {demoResult.status}
                  </div>
                </div>
              </div>
            </div>
            <button className="text-xs text-accent-blue hover:text-blue-300 transition-colors">
              Full Report →
            </button>
          </div>
        </div>
      )}

      {/* Suggested searches */}
      <div className="flex flex-wrap gap-2 pt-2">
        {['Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'].map((city) => (
          <button
            key={city}
            onClick={() => {
              setInputCity(city);
              setTimeout(() => {
                handleSearch({ preventDefault: () => {} } as React.FormEvent);
              }, 100);
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-gray-800/30 hover:border-accent-blue hover:bg-blue-500/10 transition-all text-muted-foreground hover:text-white"
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
};
