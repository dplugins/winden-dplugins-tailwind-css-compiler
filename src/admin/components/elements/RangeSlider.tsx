import React from 'react';
import classNames from 'classnames';

/**
 * Range slider input with label and value display.
 *
 * @example
 * ```tsx
 * <RangeSlider
 *   label="Font Size"
 *   min={12}
 *   max={72}
 *   value={fontSize}
 *   onChange={handleChange}
 *   unit="px"
 * />
 * ```
 */
interface RangeSliderProps {
  /** Label text for the slider */
  label: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Optional unit to display after the value */
  unit?: string;
  /** Additional CSS classes */
  className?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  value,
  onChange,
  unit = '',
  className
}) => (
  <label>
    <div className=' space-x-2'>
      <span>{label}:</span><span>{value}{unit}</span>
    </div>

    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      className={classNames("w-full mr-2 accent-slate-600 border-transparent", className)}
    />

  </label>
);

export default RangeSlider;
