import React from 'react';

interface TimelineAlert {
  id: string;
  time: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isResolved: boolean;
}

interface AlertTimelineProps {
  alerts: TimelineAlert[];
}

export const AlertTimeline: React.FC<AlertTimelineProps> = ({ alerts = [] }) => {
  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return { dot: 'bg-red-500', line: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300' };
    if (severity === 'high') return { dot: 'bg-orange-500', line: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-300' };
    if (severity === 'medium') return { dot: 'bg-yellow-500', line: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-300' };
    return { dot: 'bg-blue-500', line: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-300' };
  };

  const groupedByTime = alerts.reduce((acc, alert) => {
    const hour = alert.time.split(':')[0];
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(alert);
    return acc;
  }, {} as Record<string, TimelineAlert[]>);

  return (
    <div className="space-y-4">
      {/* Timeline line */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-700/30 to-gray-900/30" />

        {alerts.map((alert, idx) => {
          const colors = getSeverityColor(alert.severity);

          return (
            <div key={alert.id} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-12 flex items-center justify-center">
                <div
                  className={`w-3 h-3 rounded-full ${colors.dot} ring-4 ring-gray-900/50 z-10 ${
                    alert.isResolved ? 'opacity-40' : 'animate-pulse'
                  }`}
                />
              </div>

              {/* Alert card */}
              <div className={`flex-1 p-3 rounded-lg border ${colors.bg} border-gray-600/30 mb-2`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white text-sm">{alert.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{alert.time}</div>
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded ${colors.text}`}>
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
                {alert.isResolved && (
                  <div className="text-xs text-green-300 mt-2">✓ Resolved</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-sm">No alerts for this period</p>
        </div>
      )}
    </div>
  );
};
