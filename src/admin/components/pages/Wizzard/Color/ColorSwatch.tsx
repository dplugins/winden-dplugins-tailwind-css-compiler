import React from 'react';
import { Swatch } from '@uiw/react-color';
import tinycolor from 'tinycolor2';

interface ColorSwatchProps {
  /** Current color value */
  color: string;
  /** Callback when color is changed */
  onChange: (color: { hex: string }) => void;
}

/**
 * Color swatch picker component with predefined color palette
 */
const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, onChange }) => {
  return (
    <Swatch
      color={tinycolor(color).toHexString()}
      onChange={onChange}
      rectRender={({ title, checked, style, onClick }) => (
        <div
          title={title}
          onClick={onClick}
          style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {checked && (
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '2px solid #000',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      )}
      colors={[
        '#D32F2F', '#C2185B', '#7B1FA2', '#512DA8', '#303F9F',
        '#1976D2', '#0288D1', '#0097A7', '#00796B', '#388E3C',
        '#689F38', '#AFB42B', '#FBC02D', '#FFA000', '#F57C00',
        '#E64A19', '#5D4037', '#616161', '#455A64'
      ]}
    />
  );
};

export default ColorSwatch;
