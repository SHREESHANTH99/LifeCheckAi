import React, { ReactNode } from 'react';
import { AlertCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface WaterInfoCardProps {
  title: string;
  description?: string;
  value?: string | number;
  status?: 'safe' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export const WaterInfoCard: React.FC<WaterInfoCardProps> = ({
  title,
  description,
  value,
  status = 'info',
  icon,
  trend,
  children,
  onClick,
  className = '',
}) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'safe':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          icon: 'bg-green-500/30',
          text: 'text-green-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          icon: 'bg-yellow-500/30',
          text: 'text-yellow-400',
        };
      case 'danger':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          icon: 'bg-red-500/30',
          text: 'text-red-400',
        };
      default:
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          icon: 'bg-blue-500/30',
          text: 'text-blue-400',
        };
    }
  };

  const styles = getStatusStyles(status);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 ${styles.bg} ${styles.border} ${
        onClick ? 'cursor-pointer hover:border-opacity-100 transition-all' : ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {icon ? (
            <div className={`p-2 rounded-lg ${styles.icon} flex-shrink-0`}>
              <div className={`${styles.text}`}>{icon}</div>
            </div>
          ) : status === 'danger' ? (
            <div className={`p-2 rounded-lg ${styles.icon} flex-shrink-0`}>
              <AlertCircle className={`w-5 h-5 ${styles.text}`} />
            </div>
          ) : (
            <div className={`p-2 rounded-lg ${styles.icon} flex-shrink-0`}>
              <Info className={`w-5 h-5 ${styles.text}`} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {trend && (
          <div className="flex-shrink-0">
            {getTrendIcon()}
          </div>
        )}
      </div>

      {/* Value */}
      {value && (
        <div className="mb-3">
          <div className={`text-2xl font-bold ${styles.text}`}>{value}</div>
        </div>
      )}

      {/* Children */}
      {children && (
        <div className="mt-3 pt-3 border-t border-border/30">
          {children}
        </div>
      )}
    </div>
  );
};
