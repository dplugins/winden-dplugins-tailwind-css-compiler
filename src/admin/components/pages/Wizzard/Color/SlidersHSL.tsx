import React, { useEffect } from 'react'
import Slider from './SliderColorElement'
import { hslToRgb } from './hslToRgb'

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface HslSlidersProps {
  /** Current HSL color */
  hsl: HSL;
  /** Callback when color changes */
  onChange: (hsl: HSL) => void;
}

/**
 * HSL color sliders with dynamic gradient backgrounds
 */
const HslSliders: React.FC<HslSlidersProps> = ({ hsl, onChange }) => {
  // Round HSL values to prevent decimal display
  const roundedHsl: HSL = {
    h: Math.round(hsl.h || 0),
    s: Math.round(hsl.s || 0),
    l: Math.round(hsl.l || 0)
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--hue', String(roundedHsl.h))
    document.documentElement.style.setProperty('--saturation', `${roundedHsl.s}%`)
    document.documentElement.style.setProperty('--lightness', `${roundedHsl.l}%`)
  }, [roundedHsl.h, roundedHsl.s, roundedHsl.l])

  const handleSliderChange = (name: string, value: number) => {
    // Ensure the value is rounded when updating
    const roundedValue = Math.round(value);
    const newHsl = { ...hsl, [name]: roundedValue }
    onChange(newHsl)
  }

  const generateLightnessGradient = (): string => {
    const startColor = hslToRgb(roundedHsl.h, roundedHsl.s, 0)
    const midColor = hslToRgb(roundedHsl.h, roundedHsl.s, 50)
    const endColor = hslToRgb(roundedHsl.h, roundedHsl.s, 100)
    return `linear-gradient(to right, rgb(${Math.round(startColor.r)}, ${Math.round(startColor.g)}, ${Math.round(startColor.b)}), rgb(${Math.round(midColor.r)}, ${Math.round(midColor.g)}, ${Math.round(midColor.b)}), rgb(${Math.round(endColor.r)}, ${Math.round(endColor.g)}, ${Math.round(endColor.b)}))`
  }

  const getThumbColor = (): string => {
    const { r, g, b } = hslToRgb(roundedHsl.h, roundedHsl.s, roundedHsl.l)
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  return (
    <div className="flex flex-col gap-4">
      <Slider
        name="h"
        value={roundedHsl.h}
        min={0}
        max={360}
        label="H"
        onChange={handleSliderChange}
        gradient="linear-gradient(to right, red, yellow, green, cyan, blue, magenta, red)"
        thumbColor={`hsl(${roundedHsl.h}, 100%, 50%)`}
      />
      <Slider
        name="s"
        value={roundedHsl.s}
        min={0}
        max={100}
        label="S"
        onChange={handleSliderChange}
        gradient={`linear-gradient(to right, hsl(${roundedHsl.h}, 0%, 50%), hsl(${roundedHsl.h}, 100%, 50%))`}
        thumbColor={`hsl(${roundedHsl.h}, ${roundedHsl.s}%, 50%)`}
      />
      <Slider
        name="l"
        value={roundedHsl.l}
        min={0}
        max={100}
        label="L"
        onChange={handleSliderChange}
        gradient={generateLightnessGradient()}
        thumbColor={getThumbColor()}
      />
    </div>
  )
}

export default HslSliders
