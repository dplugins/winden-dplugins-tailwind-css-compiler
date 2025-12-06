import React from 'react'
import Slider from './SliderColorElement'

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface RgbSlidersProps {
  /** Current RGB color */
  color: RGB;
  /** Callback when color changes */
  onChange: (color: RGB) => void;
}

/**
 * RGB color sliders with gradient backgrounds
 */
const RgbSliders: React.FC<RgbSlidersProps> = ({ color, onChange }) => {
  // Round RGB values to prevent decimal display
  const roundedColor: RGB = {
    r: Math.round(color.r || 0),
    g: Math.round(color.g || 0),
    b: Math.round(color.b || 0),
    a: color.a // Keep alpha as-is since it can be decimal
  };

  const handleSliderChange = (name: string, value: number) => {
    // Ensure the value is rounded when updating
    const roundedValue = Math.round(value);
    onChange({ ...color, [name]: roundedValue })
  }

  const getGradient = (component: 'r' | 'g' | 'b'): string => {
    switch (component) {
      case 'r':
        return `linear-gradient(to right, rgb(0, ${roundedColor.g}, ${roundedColor.b}), rgb(255, ${roundedColor.g}, ${roundedColor.b}))`
      case 'g':
        return `linear-gradient(to right, rgb(${roundedColor.r}, 0, ${roundedColor.b}), rgb(${roundedColor.r}, 255, ${roundedColor.b}))`
      case 'b':
        return `linear-gradient(to right, rgb(${roundedColor.r}, ${roundedColor.g}, 0), rgb(${roundedColor.r}, ${roundedColor.g}, 255))`
      default:
        return ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(['r', 'g', 'b'] as const).map((component) => (
        <Slider
          key={component}
          name={component}
          value={roundedColor[component]}
          min={0}
          max={255}
          label={component.toUpperCase()}
          onChange={handleSliderChange}
          gradient={getGradient(component)}
          thumbColor={`rgb(${component === 'r' ? roundedColor.r : 0}, ${component === 'g' ? roundedColor.g : 0}, ${component === 'b' ? roundedColor.b : 0})`}
        />
      ))}
    </div>
  )
}

export default RgbSliders
