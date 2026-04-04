# Water Quality Components

This directory contains a comprehensive suite of React components and utilities for displaying and analyzing water quality data. These components are designed to work with the LifeCheck AI platform's water quality monitoring features.

## Components

### WaterStateMap
Interactive map component displaying water quality metrics across Indian states.

**Props:**
- `onStateSelect` (function, optional): Callback when a state is selected
- `selectedState` (string, optional): Currently selected state name

**Features:**
- Grid-based state selection
- WQI color-coded status display
- Visual WQI scale legend
- Hover interactions

**Usage:**
```tsx
import { WaterStateMap } from '@/components/water';

export default function StateSelector() {
  return (
    <WaterStateMap
      onStateSelect={(state) => console.log(`Selected: ${state}`)}
      selectedState="Maharashtra"
    />
  );
}
```

---

### WaterComparison
Detailed comparison view of individual water quality parameters for a specific location.

**Props:**
- `parameters` (Parameter[]): Array of water quality parameters
- `location` (string): Location name
- `timestamp` (string, optional): Data timestamp

**Parameter Interface:**
```typescript
interface Parameter {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  range: { min: number; max: number };
  status: 'safe' | 'warning' | 'danger';
}
```

**Features:**
- Individual parameter cards with progress bars
- Trend indicators (up/down/stable)
- Status color coding
- Safe/Warning/Danger summary stats

**Usage:**
```tsx
import { WaterComparison } from '@/components/water';

const params = [
  {
    name: 'pH',
    value: 7.2,
    trend: 'stable',
    unit: 'pH',
    range: { min: 6.5, max: 8.5 },
    status: 'safe'
  }
];

export default function ComparisonView() {
  return (
    <WaterComparison 
      parameters={params}
      location="Delhi"
      timestamp={new Date().toLocaleString()}
    />
  );
}
```

---

### WaterMetrics
Summary display of key water quality metrics with expandable details.

**Props:**
- `metrics` (Metric[]): Array of metrics to display
- `isLoading` (boolean, optional): Loading state
- `onMetricClick` (function, optional): Callback when metric is clicked

**Metric Interface:**
```typescript
interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: 'wqi' | 'parameter' | 'health-impact';
  status: 'safe' | 'warning' | 'danger';
  historicalValue?: number; // For calculating change percentage
}
```

**Features:**
- Expandable metric cards
- Change percentage calculation and display
- Type-specific icons
- Status badges
- Loading skeleton UI

**Usage:**
```tsx
import { WaterMetrics } from '@/components/water';

const metrics = [
  {
    id: 'wqi',
    name: 'Water Quality Index',
    value: 75,
    unit: 'WQI',
    type: 'wqi',
    status: 'safe',
    historicalValue: 72
  }
];

export default function MetricsDisplay() {
  return (
    <WaterMetrics 
      metrics={metrics}
      isLoading={false}
      onMetricClick={(id) => console.log(`Clicked: ${id}`)}
    />
  );
}
```

---

### WaterInfoCard
Flexible informational card for displaying water quality information with status indicators.

**Props:**
- `title` (string): Card title
- `description` (string, optional): Descriptive text
- `value` (string | number, optional): Main value to display
- `status` ('safe' | 'warning' | 'danger' | 'info'): Status type
- `icon` (ReactNode, optional): Custom icon
- `trend` ('up' | 'down' | 'stable', optional): Trend indicator
- `children` (ReactNode, optional): Custom content
- `onClick` (function, optional): Click handler
- `className` (string, optional): Additional CSS classes

**Features:**
- Automatic status-based color scheme
- Icon display with background
- Trend indicators
- Flexible content area
- Alert icon for danger status

**Usage:**
```tsx
import { WaterInfoCard } from '@/components/water';
import { Droplets } from 'lucide-react';

export default function InfoDisplay() {
  return (
    <WaterInfoCard
      title="pH Level"
      description="Current pH measurement"
      value={7.2}
      status="safe"
      icon={<Droplets />}
      trend="stable"
    />
  );
}
```

---

### WaterChart
Time-series visualization of water quality parameters.

**Props:**
- `data` (DataPoint[]): Array of data points
- `title` (string): Chart title
- `unit` (string): Measurement unit
- `min` (number, optional): Minimum scale value
- `max` (number, optional): Maximum scale value
- `threshold` (number, optional): Warning threshold
- `isLoading` (boolean, optional): Loading state

**DataPoint Interface:**
```typescript
interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
}
```

**Features:**
- Bar-based time-series visualization
- Hover tooltips with values
- Automatic color coding (green/yellow/orange/red)
- Scale legend
- Average and latest value display

**Usage:**
```tsx
import { WaterChart } from '@/components/water';

const data = [
  { timestamp: '10:00', value: 7.2 },
  { timestamp: '11:00', value: 7.4 },
  { timestamp: '12:00', value: 7.1 }
];

export default function ChartDisplay() {
  return (
    <WaterChart
      data={data}
      title="pH Readings (24h)"
      unit="pH"
      min={6}
      max={8}
      threshold={7.5}
    />
  );
}
```

---

### WaterRecommendations
Prioritized list of recommendations based on water quality analysis.

**Props:**
- `recommendations` (Recommendation[]): Array of recommendations
- `isLoading` (boolean, optional): Loading state

**Recommendation Interface:**
```typescript
interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
  icon?: React.ReactNode;
}
```

**Features:**
- Severity-based sorting (high → medium → low)
- Status-colored cards
- Icon support
- Action button
- Summary footer with counts

**Usage:**
```tsx
import { WaterRecommendations } from '@/components/water';

const recs = [
  {
    id: '1',
    title: 'High Turbidity Detected',
    description: 'Water turbidity is above safe levels',
    severity: 'high',
    action: 'View details'
  }
];

export default function RecommendationsView() {
  return (
    <WaterRecommendations recommendations={recs} />
  );
}
```

---

## Utility Functions (lib/water.ts)

### calculateWQI(parameters)
Calculates Water Quality Index from multiple parameters.

```typescript
const wqi = calculateWQI({
  ph: 7.2,
  turbidity: 2,
  do: 8,
  conductivity: 500
});
```

### getWQIStatus(wqi)
Returns status string based on WQI value.

```typescript
const status = getWQIStatus(75); // Returns: 'SAFE'
```

### getParameterStatus(parameterName, value)
Gets safety status for a specific parameter.

```typescript
const status = getParameterStatus('pH', 7.2); // Returns: 'safe'
```

### getParameterThresholds(parameterName)
Returns safe/warning/danger thresholds for a parameter.

```typescript
const thresholds = getParameterThresholds('turbidity');
// Returns: { safe: 5, warning: 10, danger: 25 }
```

### analyzeWaterTrend(previous, current)
Determines if a value is trending up, down, or stable.

```typescript
const trend = analyzeWaterTrend(7.0, 7.5); // Returns: 'up'
```

### getHealthWarnings(wqi)
Returns health implications based on WQI.

```typescript
const warnings = getHealthWarnings(40);
// Returns: ['Avoid drinking without treatment', ...]
```

### calculatePurityScore(parameters)
Calculates overall purity percentage.

```typescript
const score = calculatePurityScore({
  pH: 7.2,
  turbidity: 2,
  do: 8
});
```

### getRecommendedActions(parameters)
Generates actionable recommendations.

```typescript
const actions = getRecommendedActions({
  pH: 8.7,
  turbidity: 8,
  do: 5
});
```

---

## Color Scheme

Components use a consistent color scheme based on status:

- **Safe/Good**: Green (`bg-green-500/20`, `border-green-500/30`, `text-green-400`)
- **Warning/Moderate**: Yellow/Orange (`bg-yellow-500/20`, `text-yellow-400`)
- **Danger/Poor**: Red (`bg-red-500/20`, `border-red-500/30`, `text-red-400`)
- **Info**: Blue (`bg-blue-500/20`, `text-blue-400`)

---

## Integration Example

```tsx
import {
  WaterStateMap,
  WaterComparison,
  WaterMetrics,
  WaterChart,
  WaterRecommendations
} from '@/components/water';

export default function WaterQualityDashboard() {
  const [selectedState, setSelectedState] = useState('Delhi');
  const [waterData, setWaterData] = useState(null);

  useEffect(() => {
    // Fetch water data for selected state
    fetchWaterData(selectedState).then(setWaterData);
  }, [selectedState]);

  if (!waterData) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <WaterStateMap 
        onStateSelect={setSelectedState}
        selectedState={selectedState}
      />
      
      <WaterMetrics metrics={waterData.metrics} />
      
      <WaterChart
        data={waterData.history}
        title="24-Hour WQI Trend"
        unit="WQI"
      />
      
      <WaterComparison
        parameters={waterData.parameters}
        location={selectedState}
      />
      
      <WaterRecommendations
        recommendations={waterData.recommendations}
      />
    </div>
  );
}
```

---

## Dependencies

- React 18+
- TypeScript
- Tailwind CSS
- lucide-react (icons)

---

## Styling Notes

All components use:
- Tailwind CSS for styling
- Dark theme (`bg-gray-800/30`, dark cards)
- Consistent spacing and borders
- Responsive grid layouts
- Smooth transitions and hover effects

Customize by adjusting Tailwind class names in component files.

---

## Tips for Usage

1. **Data Validation**: Ensure all required props are provided
2. **Error Boundaries**: Wrap components in error boundaries for production
3. **Loading States**: Use `isLoading` props to show skeleton loaders
4. **Responsive Design**: Components are mobile-friendly by default
5. **Accessibility**: Components include semantic HTML and ARIA attributes where possible

---

## Future Enhancements

- [ ] Animated charts with animation library
- [ ] Real-time WebSocket data updates
- [ ] Export functionality (PDF/CSV)
- [ ] Advanced filtering and search
- [ ] Comparative analysis tools
- [ ] Alert notification system
- [ ] Custom threshold settings
- [ ] Multi-location comparison view
