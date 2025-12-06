import React from 'react'
import { Input } from "@el/Input";
import "./SliderColorElement.css";
import tinycolor from 'tinycolor2'

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface OKLAB {
  L: number;
  a: number;
  b: number;
}

interface OKLCH {
  L: number;
  C: number;
  H: number;
}

interface OklchSliderProps {
  name: string;
  sliderValue: number;
  displayValue: number;
  min: string;
  max: string;
  step: string;
  label: string;
  onChange: (name: string, value: number) => void;
  gradient: string;
  thumbColor: string;
  disabled?: boolean;
}

/**
 * Custom OKLCH Slider Component that shows actual OKLCH values
 */
const OklchSlider: React.FC<OklchSliderProps> = ({
  name,
  sliderValue,
  displayValue,
  min,
  max,
  step,
  label,
  onChange,
  gradient,
  thumbColor,
  disabled = false
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, parseInt(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = parseFloat(e.target.value);
    let sliderVal: number;

    // Convert display value back to slider range
    if (name === 'L') {
      sliderVal = Math.round(inputVal * 100); // 0-1 → 0-100
    } else if (name === 'C') {
      sliderVal = Math.round(inputVal * 250); // 0-0.4 → 0-100
    } else if (name === 'H') {
      sliderVal = Math.round((inputVal / 360) * 100); // 0-360 → 0-100
    } else {
      sliderVal = 0;
    }

    // Ensure it's within bounds
    sliderVal = Math.max(0, Math.min(100, sliderVal));
    onChange(name, sliderVal);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        type="range"
        name={name}
        min="0"
        max="100"
        value={sliderValue}
        onChange={handleSliderChange}
        className={`slider slider-${name}`}
        style={{
          background: gradient,
          // @ts-ignore - CSS custom property
          "--thumb-color": thumbColor,
        }}
        disabled={disabled}
      />
      <div className="relative flex items-center">
        <label className="absolute z-20 left-4">{label}: </label>
        <Input
          className="relative z-10 min-w-[100px] bg-transparent py-1 pr-0 text-right"
          type="number"
          name={name}
          step={step}
          value={displayValue}
          onChange={handleInputChange}
          style={{ marginLeft: "10px", width: "70px" }}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

interface OklchSlidersProps {
  /** Current RGB color */
  color: RGB;
  /** Callback when color changes */
  onChange: (color: RGB) => void;
}

/**
 * OKLCH color sliders with perceptually uniform color space
 */
const OklchSliders: React.FC<OklchSlidersProps> = ({ color, onChange }) => {
  // Convert RGB to OKLAB first, then to OKLCH
  const rgbToOklab = (rgb: RGB): OKLAB => {
    // Convert sRGB to linear RGB
    const srgbToLinear = (c: number): number => {
      c = c / 255;
      if (c <= 0.04045) {
        return c / 12.92;
      }
      return Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const lr = srgbToLinear(rgb.r || 0);
    const lg = srgbToLinear(rgb.g || 0);
    const lb = srgbToLinear(rgb.b || 0);

    // Convert linear RGB to OKLAB
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    const l_cbrt = Math.sign(l) * Math.pow(Math.abs(l), 1/3);
    const m_cbrt = Math.sign(m) * Math.pow(Math.abs(m), 1/3);
    const s_cbrt = Math.sign(s) * Math.pow(Math.abs(s), 1/3);

    const L = 0.2104542553 * l_cbrt + 0.7936177850 * m_cbrt - 0.0040720468 * s_cbrt;
    const a = 1.9779984951 * l_cbrt - 2.4285922050 * m_cbrt + 0.4505937099 * s_cbrt;
    const b = 0.0259040371 * l_cbrt + 0.7827717662 * m_cbrt - 0.8086757660 * s_cbrt;

    return { L, a, b };
  };

  // Convert OKLAB to OKLCH
  const oklabToOklch = (lab: OKLAB): OKLCH => {
    const { L, a, b } = lab;
    const C = Math.sqrt(a * a + b * b);
    let H = Math.atan2(b, a) * 180 / Math.PI;
    if (H < 0) H += 360;

    return { L, C, H };
  };

  // Convert OKLCH to OKLAB
  const oklchToOklab = (lch: OKLCH): OKLAB => {
    const { L, C, H } = lch;
    const hRad = H * Math.PI / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    return { L, a, b };
  };

  // Convert OKLAB to RGB
  const oklabToRgb = (L: number, a: number, b: number): RGB => {
    // Convert OKLAB to linear RGB
    const l = L + 0.3963377774 * a + 0.2158037573 * b;
    const m = L - 0.1055613458 * a - 0.0638541728 * b;
    const s = L - 0.0894841775 * a - 1.2914855480 * b;

    const l3 = l * l * l;
    const m3 = m * m * m;
    const s3 = s * s * s;

    const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    // Convert linear RGB to sRGB
    const linearToSrgb = (c: number): number => {
      if (c <= 0.0031308) {
        return 12.92 * c;
      }
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };

    const r = Math.max(0, Math.min(255, Math.round(linearToSrgb(lr) * 255)));
    const g = Math.max(0, Math.min(255, Math.round(linearToSrgb(lg) * 255)));
    const b_rgb = Math.max(0, Math.min(255, Math.round(linearToSrgb(lb) * 255)));

    return { r, g, b: b_rgb };
  };

  // Get current OKLCH values from RGB color
  const oklab = rgbToOklab(color);
  const oklch = oklabToOklch(oklab);

  // Use higher precision for calculations
  const displayOklch = {
    L: Math.round(oklch.L * 100) / 100,  // 0-1 range
    C: Math.round(oklch.C * 100) / 100,  // 0-0.4 range
    H: Math.round(oklch.H * 10) / 10     // 0-360 range
  };

  const handleSliderChange = (name: string, value: number) => {
    let newOklch = { ...displayOklch };

    if (name === 'L') {
      newOklch.L = value / 100; // Convert from 0-100 to 0-1
    } else if (name === 'C') {
      newOklch.C = value / 250; // Convert from 0-100 to 0-0.4
    } else if (name === 'H') {
      newOklch.H = (value / 100) * 360; // Convert from 0-100 to 0-360
    }

    // Convert OKLCH back to OKLAB, then to RGB
    const newOklab = oklchToOklab(newOklch);
    const newRgb = oklabToRgb(newOklab.L, newOklab.a, newOklab.b);
    onChange(newRgb);
  };

  // Convert OKLCH values to slider ranges (0-100)
  const sliderValues = {
    L: Math.round(displayOklch.L * 100), // 0-1 → 0-100
    C: Math.round(displayOklch.C * 250), // 0-0.4 → 0-100
    H: Math.round((displayOklch.H / 360) * 100) // 0-360 → 0-100
  };

  const generateLightnessGradient = (): string => {
    const steps = 5;
    const gradientStops: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const L = i / steps;
      const newOklab = oklchToOklab({ L, C: displayOklch.C, H: displayOklch.H });
      const rgb = oklabToRgb(newOklab.L, newOklab.a, newOklab.b);
      gradientStops.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }

    return `linear-gradient(to right, ${gradientStops.join(', ')})`;
  };

  const generateChromaGradient = (): string => {
    const steps = 5;
    const gradientStops: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const C = (i / steps) * 0.4; // 0 to 0.4
      const newOklab = oklchToOklab({ L: displayOklch.L, C, H: displayOklch.H });
      const rgb = oklabToRgb(newOklab.L, newOklab.a, newOklab.b);
      gradientStops.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }

    return `linear-gradient(to right, ${gradientStops.join(', ')})`;
  };

  const generateHueGradient = (): string => {
    const steps = 12;
    const gradientStops: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const H = (i / steps) * 360; // 0 to 360
      const newOklab = oklchToOklab({ L: displayOklch.L, C: displayOklch.C, H });
      const rgb = oklabToRgb(newOklab.L, newOklab.a, newOklab.b);
      gradientStops.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }

    return `linear-gradient(to right, ${gradientStops.join(', ')})`;
  };

  const getThumbColor = (): string => {
    return `rgb(${Math.round(color.r || 0)}, ${Math.round(color.g || 0)}, ${Math.round(color.b || 0)})`;
  };

  return (
    <div className="flex flex-col gap-4">
      <OklchSlider
        name="L"
        sliderValue={sliderValues.L}
        displayValue={displayOklch.L}
        min="0"
        max="1"
        step="0.01"
        label="L"
        onChange={handleSliderChange}
        gradient={generateLightnessGradient()}
        thumbColor={getThumbColor()}
      />
      <OklchSlider
        name="C"
        sliderValue={sliderValues.C}
        displayValue={displayOklch.C}
        min="0"
        max="0.4"
        step="0.01"
        label="C"
        onChange={handleSliderChange}
        gradient={generateChromaGradient()}
        thumbColor={getThumbColor()}
      />
      <OklchSlider
        name="H"
        sliderValue={sliderValues.H}
        displayValue={displayOklch.H}
        min="0"
        max="360"
        step="0.1"
        label="H"
        onChange={handleSliderChange}
        gradient={generateHueGradient()}
        thumbColor={getThumbColor()}
      />
    </div>
  )
}

export default OklchSliders
