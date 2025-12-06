import React from 'react';
import { Input } from '@el/Input';

interface BreakpointDetailProps {
  label: string;
  value: string | number;
}

/**
 * Breakpoint detail display component
 */
const BreakpointDetail: React.FC<BreakpointDetailProps> = ({ label, value }) => (
  <Input
    label={label}
    type="text"
    value={String(value)}
    disabled={true}
    readOnly={true}
    className="w-full"
  />
);

interface DynamicBreakpointsProps {
  entries: Record<string, string | number | { max: string }>;
  title: string;
}

/**
 * Display dynamic breakpoint entries from builders
 * @param entries - Breakpoint entries
 * @param title - Section title
 */
export const DynamicBreakpoints: React.FC<DynamicBreakpointsProps> = ({ entries, title }) => {
  return (
    <div className="mt-24 w-full flex flex-col">
      <h2 className="text-2xl font-bold mb-8">{title}</h2>
      <div className="space-y-8">
        {Object.entries(entries).map(([name, value]) => (
          <div className="flex w-full items-end gap-8 mt-6" key={name}>
            <BreakpointDetail label="Breakpoint Name" value={name} />
            <BreakpointDetail label="Breakpoint Value" value={typeof value === 'object' ? value.max : value} />
            {typeof value === 'object' && value.max && (
              <BreakpointDetail label="Direction" value="Desktop First" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DynamicBreakpoints;
