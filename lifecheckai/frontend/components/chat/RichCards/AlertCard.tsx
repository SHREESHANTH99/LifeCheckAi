import React from 'react';

interface AlertCardProps {
  alerts: Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high';
    timeAgo: string;
  }>;
  city: string;
}

const getSeverityColor = (severity: string) => {
  if (severity === 'high') return { dot: 'bg-red-500', border: 'border-red-500/30', bg: 'bg-red-500/10' };
  if (severity === 'medium') return { dot: 'bg-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' };
  return { dot: 'bg-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/10' };
};

export const AlertCard: React.FC<AlertCardProps> = ({ alerts, city }) => {
  if (!alerts || alerts.length === 0) return null;

  const topAlerts = alerts.slice(0, 3);
  const highestSeverity = alerts[0]?.severity || 'low';
  const colors = getSeverityColor(highestSeverity);

  return (
    <div className={`my-3 border-l-4 ${colors.border} ${colors.bg} rounded-lg p-4 animate-slide-down`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <span className="font-semibold text-white">Active Alerts — {city}</span>
      </div>

      <div className="space-y-2">
        {topAlerts.map((alert) => {
          const alertColor = getSeverityColor(alert.severity);
          return (
            <div key={alert.id} className="flex items-start gap-2">
              <div className={`${alertColor.dot} w-2 h-2 rounded-full mt-1.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{alert.title}</div>
                <div className="text-xs text-muted-foreground">{alert.timeAgo}</div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > 3 && (
        <button className="mt-3 text-xs text-accent-blue hover:text-blue-300 transition-colors">
          View {alerts.length - 3} more alerts →
        </button>
      )}
    </div>
  );
};
