import React from 'react';
import { Input } from '@el/Input';

interface FontDetailProps {
  label: string;
  value: string;
}

/**
 * Font detail display component
 */
const FontDetail: React.FC<FontDetailProps> = ({ label, value }) => (
  <Input
    label={label}
    type="text"
    value={value}
    disabled={true}
    readOnly={true}
    className="w-full"
  />
);

interface DynamicFontFamilyProps {
  entries: Record<string, string>;
  title: string;
}

/**
 * Display dynamic font family entries from builders
 * @param entries - Font family entries
 * @param title - Section title
 */
export const DynamicFontFamily: React.FC<DynamicFontFamilyProps> = ({ entries, title }) => {
  return (
    <div className="mt-24 w-full flex flex-col">
      <h2 className="text-2xl font-bold mb-8">{title}</h2>
      <div className="space-y-8">
        {Object.entries(entries).map(([name, value]) => (
          <div className="flex w-full items-end gap-8 mt-6" key={name}>
            <FontDetail label="Font Name" value={name} />
            <FontDetail label="Font Value" value={value} />
          </div>
        ))}
      </div>
    </div>
  );
};
