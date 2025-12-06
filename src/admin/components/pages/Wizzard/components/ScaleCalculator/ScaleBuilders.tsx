import React from 'react';

interface ScaleBuildersProps {
  entries: Record<string, string>;
  title: string;
  spacing?: boolean;
  font?: boolean;
  borderRadius?: boolean;
}

/**
 * Preview component for builder scale values
 * @param entries - Scale entries to display
 * @param title - Title for the preview section
 * @param spacing - Whether this is a spacing scale
 * @param font - Whether this is a font scale
 * @param borderRadius - Whether this is a border radius scale
 */
export const ScaleBuilders: React.FC<ScaleBuildersProps> = ({
  entries,
  title,
  spacing,
  font,
  borderRadius
}) => {
  return (
    <div className="mt-24 space-y-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      {font && (
        <>
          {Object.entries(entries).map(([key, value]) => (
            <div className="flex flex-col gap-2" key={key}>
              <p
                className="max-w-[50vw] overflow-hidden text-ellipsis whitespace-nowrap text-element"
                style={{ fontSize: value }}
              >
                {key}: The quick brown fox jumps over the lazy dog.
              </p>
              <div className="border border-input bg-base-1 rounded-md px-3 py-2 text-sm flex mb-8">
                {value}
              </div>
            </div>
          ))}
        </>
      )}
      {spacing && (
        <>
          {Object.entries(entries).map(([key, value]) => (
            <div className="flex flex-col gap-2" key={key}>
              <div
                className="aspect-square bg-element"
                style={{ width: value }}
              ></div>
              <div className="border border-input bg-base-1 rounded-md px-3 py-2 text-sm flex mb-8">
                {key}: {value}
              </div>
            </div>
          ))}
        </>
      )}
      {borderRadius && (
        <>
          {Object.entries(entries).map(([key, value]) => (
            <div className="flex flex-col gap-2" key={key}>
              <h2>Marko</h2>
              <div
                className="aspect-square bg-element"
                style={{ width: '10px', height: '10px' }}
              ></div>
              <div className="border border-input bg-base-1 rounded-md px-3 py-2 text-sm flex mb-8">
                {key}: {value}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
