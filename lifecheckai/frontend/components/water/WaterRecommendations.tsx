import React from 'react';
import { CheckCircle, AlertTriangle, Droplets, Zap } from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
  icon?: React.ReactNode;
}

interface WaterRecommendationsProps {
  recommendations: Recommendation[];
  isLoading?: boolean;
}

export const WaterRecommendations: React.FC<WaterRecommendationsProps> = ({
  recommendations,
  isLoading = false,
}) => {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          icon: 'bg-red-500/30',
          text: 'text-red-400',
          badge: 'bg-red-500/30 text-red-300',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          icon: 'bg-yellow-500/30',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500/30 text-yellow-300',
        };
      case 'low':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          icon: 'bg-green-500/30',
          text: 'text-green-400',
          badge: 'bg-green-500/30 text-green-300',
        };
      default:
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          icon: 'bg-blue-500/30',
          text: 'text-blue-400',
          badge: 'bg-blue-500/30 text-blue-300',
        };
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <Zap className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-800/30 rounded-lg border border-border/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-4 text-center bg-gray-800/30 rounded-lg border border-border/50">
        <Droplets className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground">No recommendations at this time</p>
      </div>
    );
  }

  // Sort by severity (high, medium, low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...recommendations].sort(
    (a, b) => (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
              (severityOrder[b.severity as keyof typeof severityOrder] || 3)
  );

  return (
    <div className="space-y-3">
      {sorted.map((rec) => {
        const styles = getSeverityStyles(rec.severity);

        return (
          <div
            key={rec.id}
            className={`p-4 rounded-lg border-2 ${styles.bg} ${styles.border}`}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
              <div className={`p-2 rounded-lg ${styles.icon} flex-shrink-0 mt-0.5`}>
                <div className={styles.text}>{rec.icon || getIcon(rec.severity)}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0 ${styles.badge}`}>
                    {rec.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>

            {/* Action */}
            <button className={`text-xs font-semibold ${styles.text} hover:opacity-80 transition-opacity`}>
              {rec.action} →
            </button>
          </div>
        );
      })}

      {/* Summary Footer */}
      {recommendations.length > 0 && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-border/50 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Summary</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/70" />
              <span className="text-muted-foreground">
                {recommendations.filter(r => r.severity === 'high').length} Critical
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
              <span className="text-muted-foreground">
                {recommendations.filter(r => r.severity === 'medium').length} Medium
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500/70" />
              <span className="text-muted-foreground">
                {recommendations.filter(r => r.severity === 'low').length} Low
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
