import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, Check } from 'lucide-react';

interface SubscriptionSettings {
  enabled: boolean;
  cities: string[];
  threshold: number;
}

interface AlertSubscriptionProps {
  onSubscribe?: (settings: SubscriptionSettings) => void;
}

export const AlertSubscription: React.FC<AlertSubscriptionProps> = ({ onSubscribe }) => {
  const [enabled, setEnabled] = useState(false);
  const [cities, setCities] = useState<string[]>(['Delhi']);
  const [threshold, setThreshold] = useState(150);
  const [newCity, setNewCity] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lifecheck_alert_subscription');
    if (saved) {
      const settings = JSON.parse(saved);
      setEnabled(settings.enabled);
      setCities(settings.cities);
      setThreshold(settings.threshold);
    }
  }, []);

  const handleSave = () => {
    const settings = { enabled, cities, threshold };
    localStorage.setItem('lifecheck_alert_subscription', JSON.stringify(settings));
    
    if (enabled && 'Notification' in window) {
      Notification.requestPermission();
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSubscribe?.(settings);
  };

  const handleAddCity = () => {
    if (newCity.trim() && !cities.includes(newCity)) {
      setCities([...cities, newCity.trim()]);
      setNewCity('');
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };

  const allCities = [
    'Delhi', 'Mumbai', 'Bangalore', 'Chennai',
    'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad'
  ];

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">Alert Notifications</h3>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-border/50">
        <div>
          <div className="font-semibold text-white text-sm">Enable Notifications</div>
          <div className="text-xs text-muted-foreground">Get browser alerts for safety updates</div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 animate-slide-down">
          {/* City selection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Monitor Cities
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {cities.map((city) => (
                <div
                  key={city}
                  className="px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs font-medium flex items-center gap-2"
                >
                  {city}
                  <button
                    onClick={() => handleRemoveCity(city)}
                    className="hover:text-blue-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add city */}
            <div className="flex gap-2">
              <select
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-border text-white text-sm outline-none focus:border-accent-blue transition-colors"
              >
                <option value="">Add another city...</option>
                {allCities
                  .filter(c => !cities.includes(c))
                  .map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
              </select>
              <button
                onClick={handleAddCity}
                disabled={!newCity}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-1 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* AQI Threshold */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Notify When AQI Exceeds
            </label>
            <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-border/50">
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="text-2xl font-bold text-white w-16 text-right">{threshold}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Current AQI levels: Poor (150+), Very Poor (200+), Hazardous (300+)
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        } flex items-center justify-center gap-2`}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          'Save Preferences'
        )}
      </button>

      <div className="text-xs text-muted-foreground text-center">
        Notifications work only in supported browsers
      </div>
    </div>
  );
};
