import React from "react";
import "./SliderColorElement.css";
import { Input } from "@el/Input";

interface SliderColorElementProps {
  /** Slider name/identifier */
  name: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Display label */
  label: string;
  /** Change handler */
  onChange: (name: string, value: number) => void;
  /** CSS gradient for slider background */
  gradient: string;
  /** Color for slider thumb */
  thumbColor: string;
}

/**
 * Custom color slider with gradient background and numeric input
 */
const SliderColorElement: React.FC<SliderColorElementProps> = ({
  name,
  value,
  min,
  max,
  label,
  onChange,
  gradient,
  thumbColor,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, parseInt(e.target.value));
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className={`slider slider-${name}`}
        style={{
          background: gradient,
          // @ts-ignore - CSS custom property
          "--thumb-color": thumbColor,
        }}
      />
      <div className="relative flex items-center">
        <label className="absolute z-20 left-4">{label}: </label>
        <Input
          className="relative z-10 min-w-[100px] bg-transparent py-1 pr-0 text-right"
          type="number"
          name={name}
          max={max}
          min={min}
          value={value}
          onChange={handleChange}
          style={{ marginLeft: "10px", width: "50px" }}
        />
      </div>
    </div>
  );
};

export default SliderColorElement;
