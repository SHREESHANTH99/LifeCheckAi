/**
 * Water Quality Utilities
 * Provides helper functions for water quality calculations, thresholds, and data formatting
 */

/**
 * Water Quality Index (WQI) Calculation
 * Based on weighted average of different water parameters
 */
export const calculateWQI = (parameters: {
  ph?: number;
  turbidity?: number;
  orp?: number;
  conductivity?: number;
  do?: number;
  temperature?: number;
}): number => {
  let totalScore = 0;
  let count = 0;

  // pH Score (7 is ideal)
  if (parameters.ph !== undefined) {
    const phScore = parameters.ph >= 6.5 && parameters.ph <= 8.5 ? 100 : Math.max(0, 100 - Math.abs(parameters.ph - 7) * 10);
    totalScore += phScore * 0.25;
    count += 0.25;
  }

  // Turbidity Score (lower is better, 0-5 NTU is ideal)
  if (parameters.turbidity !== undefined) {
    const turbidityScore = Math.max(0, 100 - (parameters.turbidity / 5) * 100);
    totalScore += turbidityScore * 0.25;
    count += 0.25;
  }

  // Dissolved Oxygen (DO) Score (8-10 mg/L is ideal)
  if (parameters.do !== undefined) {
    const doScore = parameters.do >= 8 && parameters.do <= 10 ? 100 : Math.max(0, (parameters.do / 10) * 100);
    totalScore += doScore * 0.25;
    count += 0.25;
  }

  // Conductivity Score (lower is better for freshwater)
  if (parameters.conductivity !== undefined) {
    const conductivityScore = Math.max(0, 100 - (parameters.conductivity / 2000) * 100);
    totalScore += conductivityScore * 0.25;
    count += 0.25;
  }

  return count > 0 ? totalScore / count : 0;
};

/**
 * Get WQI Status
 * Returns status string based on WQI value
 */
export const getWQIStatus = (wqi: number): 'SAFE' | 'MODERATE' | 'POOR' | 'VERY_POOR' => {
  if (wqi >= 80) return 'SAFE';
  if (wqi >= 60) return 'MODERATE';
  if (wqi >= 40) return 'POOR';
  return 'VERY_POOR';
};

/**
 * Get Parameter Status
 * Returns safety status for individual parameters
 */
export const getParameterStatus = (
  parameterName: string,
  value: number
): 'safe' | 'warning' | 'danger' => {
  const thresholds = getParameterThresholds(parameterName);

  if (value <= thresholds.safe) return 'safe';
  if (value <= thresholds.warning) return 'warning';
  return 'danger';
};

/**
 * Get Parameter Thresholds
 * Returns safe, warning, and danger thresholds for water parameters
 */
export const getParameterThresholds = (parameterName: string) => {
  const thresholds: Record<string, { safe: number; warning: number; danger: number }> = {
    pH: { safe: 8.5, warning: 9, danger: 10 },
    turbidity: { safe: 5, warning: 10, danger: 25 },
    temperature: { safe: 30, warning: 35, danger: 40 },
    conductivity: { safe: 1000, warning: 2000, danger: 3000 },
    dissolvedOxygen: { safe: 6, warning: 4, danger: 2 },
    ammonia: { safe: 0.1, warning: 0.5, danger: 1 },
    nitrate: { safe: 10, warning: 20, danger: 50 },
    phosphate: { safe: 0.1, warning: 0.5, danger: 1 },
    hardness: { safe: 120, warning: 180, danger: 360 },
    iron: { safe: 0.3, warning: 1, danger: 3 },
    manganese: { safe: 0.1, warning: 0.3, danger: 1 },
    coliform: { safe: 0, warning: 1, danger: 10 },
  };

  return thresholds[parameterName] || { safe: 70, warning: 85, danger: 100 };
};

/**
 * Format Water Quality Data
 * Standardizes water quality data from API responses
 */
export const formatWaterQualityData = (rawData: any) => {
  return {
    location: rawData.location || 'Unknown',
    wqi: rawData.wqi || 0,
    status: getWQIStatus(rawData.wqi || 0),
    timestamp: rawData.timestamp || new Date().toISOString(),
    parameters: rawData.parameters || {},
    lastUpdated: rawData.lastUpdated || new Date(),
  };
};

/**
 * Compare Water Quality Trends
 * Analyzes trends between two data points
 */
export const analyzeWaterTrend = (previous: number, current: number): 'up' | 'down' | 'stable' => {
  const changePercent = ((current - previous) / previous) * 100;

  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
};

/**
 * Get Health Warnings for Water Quality
 * Returns health implications based on water quality parameters
 */
export const getHealthWarnings = (wqi: number): string[] => {
  const warnings: string[] = [];

  if (wqi < 40) {
    warnings.push('Avoid drinking without treatment');
    warnings.push('Use for bathing with caution');
    warnings.push('Not recommended for fishing');
  } else if (wqi < 60) {
    warnings.push('Boil before drinking');
    warnings.push('Safe for general use');
    warnings.push('May affect sensitive populations');
  } else if (wqi < 80) {
    warnings.push('Generally safe for drinking');
    warnings.push('Safe for all recreational activities');
    warnings.push('Suitable for agricultural use');
  } else {
    warnings.push('Safe for all uses');
    warnings.push('Excellent water quality');
    warnings.push('No health concerns');
  }

  return warnings;
};

/**
 * Calculate Purity Score
 * Returns a purity percentage based on multiple parameters
 */
export const calculatePurityScore = (parameters: Record<string, number>): number => {
  const scores = Object.entries(parameters).map(([name, value]) => {
    const paramScore = getParameterStatus(name, value);
    switch (paramScore) {
      case 'safe':
        return 100;
      case 'warning':
        return 60;
      case 'danger':
        return 20;
      default:
        return 50;
    }
  });

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
};

/**
 * Format Water Measurement
 * Formats water measurements with appropriate units and precision
 */
export const formatWaterMeasurement = (value: number, unit: string): string => {
  const precision = ['pH', 'ORP'].includes(unit) ? 2 : 1;

  return `${value.toFixed(precision)} ${unit}`;
};

/**
 * Get Recommended Actions
 * Returns actionable recommendations based on water quality
 */
export const getRecommendedActions = (parameters: Record<string, number>): string[] => {
  const actions: string[] = [];

  const thresholds = {
    pH: { min: 6.5, max: 8.5 },
    turbidity: { max: 5 },
    do: { min: 6 },
    conductivity: { max: 1000 },
  };

  // Check pH
  if (parameters.pH && (parameters.pH < thresholds.pH.min || parameters.pH > thresholds.pH.max)) {
    actions.push('pH adjustment may be needed');
  }

  // Check turbidity
  if (parameters.turbidity && parameters.turbidity > (thresholds.turbidity.max || 5)) {
    actions.push('Consider filtration to reduce turbidity');
  }

  // Check dissolved oxygen
  if (parameters.do && parameters.do < (thresholds.do.min || 6)) {
    actions.push('Increase aeration or water circulation');
  }

  // Check conductivity
  if (parameters.conductivity && parameters.conductivity > (thresholds.conductivity.max || 1000)) {
    actions.push('May need water softening treatment');
  }

  return actions;
};
