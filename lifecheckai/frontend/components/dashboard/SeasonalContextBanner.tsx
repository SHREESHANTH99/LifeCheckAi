import React, { useState, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface SeasonalContextBannerProps {
  dismissible?: boolean;
}

interface SeasonContextData {
  season: string;
  icon: string;
  alertTitle: string;
  alertMessage: string;
  advice: string;
  color: string;
  bgColor: string;
}

export const SeasonalContextBanner: React.FC<SeasonalContextBannerProps> = ({ dismissible = true }) => {
  const [dismissed, setDismissed] = useState(false);

  const seasonal = useMemo((): SeasonContextData => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Winter/Smog (Oct 15 - Jan 31)
    if ((month === 10 && day >= 15) || month === 11 || month === 12 || month === 1) {
      return {
        season: '🍂 Winter Smog Season',
        icon: '🍂',
        alertTitle: 'Peak Pollution Season',
        alertMessage: 'North India enters peak pollution season. AQI spikes expected in the coming weeks.',
        advice: 'Keep N95 masks ready. Limit early morning outdoor activity. Monitor air quality daily.',
        color: 'text-amber-200',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
      };
    }

    // Pre-Monsoon Heat (Mar 1 - Jun 15)
    if ((month === 3) || month === 4 || month === 5 || (month === 6 && day <= 15)) {
      return {
        season: '🌡️ Pre-Monsoon Heat Season',
        icon: '🌡️',
        alertTitle: 'Rising Temperatures & Dust Storms',
        alertMessage: 'Pre-monsoon heat and dust storms ahead. Temperature and AQI will fluctuate.',
        advice: 'Check UV and heat index daily. Avoid outdoor exposure 11AM-4PM. Stay hydrated.',
        color: 'text-orange-200',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
      };
    }

    // Monsoon (Jun 15 - Sep 30)
    if ((month === 6 && day > 15) || month === 7 || month === 8 || month === 9) {
      return {
        season: '🌧️ Monsoon Season',
        icon: '🌧️',
        alertTitle: 'Heavy Rain & Flood Risk',
        alertMessage: 'Monsoon brings heavy rains, humidity, and flood risk in affected states.',
        advice: 'Check flood warnings before travel. Watch for water contamination. Use umbrellas.',
        color: 'text-blue-200',
        bgColor: 'bg-blue-500/10 border-blue-500/30',
      };
    }

    // Pollen Season (Feb)
    if (month === 2) {
      return {
        season: '🌸 Pollen Season',
        icon: '🌸',
        alertTitle: 'Tree Pollen Peaks',
        alertMessage: 'Tree pollen peaks in February-March, especially in North India.',
        advice: 'Allergy sufferers should take preventive antihistamines. Keep windows closed.',
        color: 'text-green-200',
        bgColor: 'bg-green-500/10 border-green-500/30',
      };
    }

    // Default (stable season)
    return {
      season: '☀️ Stable Season',
      icon: '☀️',
      alertTitle: 'Generally Good Conditions',
      alertMessage: 'Current season shows relatively stable air quality.',
      advice: 'Continue monitoring daily. Practice regular safety precautions.',
      color: 'text-emerald-200',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    };
  }, []);

  if (dismissed) return null;

  return (
    <div className={`border ${seasonal.bgColor} rounded-lg p-4 animate-slide-down`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{seasonal.icon}</span>
            <h3 className={`font-semibold ${seasonal.color}`}>{seasonal.season}</h3>
          </div>

          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />
            <div>
              <div className={`font-semibold text-sm ${seasonal.color} mb-1`}>
                {seasonal.alertTitle}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{seasonal.alertMessage}</p>
              <p className="text-sm text-white">
                <strong>Advice:</strong> {seasonal.advice}
              </p>
            </div>
          </div>
        </div>

        {dismissible && (
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem('dismissed_seasonal_banner', 'true');
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <button className="text-xs text-accent-blue hover:text-blue-300 transition-colors">
          Learn More About This Season →
        </button>
      </div>
    </div>
  );
};
