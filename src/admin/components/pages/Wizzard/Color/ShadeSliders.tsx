import React from 'react'
import { Input } from "@el/Input";

interface SliderConfig {
  label: string;
  key: 'shades' | 'maxLightness' | 'minLightness';
  min: number;
  max: number;
}

const sliderConfig: SliderConfig[] = [
  { label: 'Number of shades', key: 'shades', min: 1, max: 15 },
  { label: 'Lightest point', key: 'maxLightness', min: 50, max: 100 },
  { label: 'Darkest point', key: 'minLightness', min: 0, max: 50 }
];

interface SliderShadeElementProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const SliderShadeElement: React.FC<SliderShadeElementProps> = ({ label, value, min, max, onChange }) => {
  return (
    <div className="relative flex items-center grow border-border border-r last:border-none">
      <label className="absolute z-30 left-4 text-xs">{label}: </label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="relative z-10 min-w-[100px] bg-transparent py-1 pr-0 text-right !border-none !border-r w-full px-4 !m-0"
      />
    </div>
  );
};

interface ShadeSlidersProps {
  /** Number of color shades to generate */
  shades: number;
  /** Minimum lightness value (darkest) */
  minLightness: number;
  /** Maximum lightness value (lightest) */
  maxLightness: number;
  /** Callback when shades count changes */
  onShadesChange: (value: number) => void;
  /** Callback when minimum lightness changes */
  onMinLightnessChange: (value: number) => void;
  /** Callback when maximum lightness changes */
  onMaxLightnessChange: (value: number) => void;
}

/**
 * Sliders for controlling color shade generation parameters
 */
const ShadeSliders: React.FC<ShadeSlidersProps> = ({
  shades,
  minLightness,
  maxLightness,
  onShadesChange,
  onMinLightnessChange,
  onMaxLightnessChange
}) => {
  const handleChange: Record<'shades' | 'maxLightness' | 'minLightness', (value: number) => void> = {
    shades: onShadesChange,
    maxLightness: onMaxLightnessChange,
    minLightness: onMinLightnessChange
  };

  const values: Record<'shades' | 'maxLightness' | 'minLightness', number> = {
    shades,
    maxLightness,
    minLightness
  };

  return (
    <div className="flex border border-input rounded-md w-full overflow-hidden">
      {sliderConfig.map(({ label, key, min, max }) => (
        <SliderShadeElement
          key={key}
          label={label}
          value={values[key]}
          min={min}
          max={max}
          onChange={handleChange[key]}
        />
      ))}
    </div>
  );
};

export default ShadeSliders;
