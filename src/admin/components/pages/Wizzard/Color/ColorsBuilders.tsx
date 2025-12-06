import React from 'react';

interface ColorWithSlug {
  slug: string;
  color: string;
}

type ColorValue = string | ColorWithSlug[] | Record<string, string>;

interface ColorsBuildersProps {
  /** Section title */
  title: string;
  /** Color entries from page builders */
  colorEntries: Record<string, ColorValue>;
}

/**
 * Preview component for colors from page builders (FSE, Bricks, Oxygen)
 */
const ColorsBuilders: React.FC<ColorsBuildersProps> = ({ title, colorEntries }) => {
  return (
    <div className="flex flex-col gap-2 mt-24">
      <h2 className="text-2xl font-semibold">{title}: Preview</h2>
      {Object.entries(colorEntries).map(([colorGroup, colors]) => (
        <div key={colorGroup}>
          <div className="preview group flex w-full grow items-center gap-8 rounded-lg border border-solid border-border bg-base-1 py-2 px-4 shadow-sm">
            <div className="flex -space-x-4 ">
              {typeof colors === 'object' && Array.isArray(colors) ? (
                Object.keys(colors).map(key => {
                  const colorItem = (colors as ColorWithSlug[])[Number(key)];
                  const shouldAddBorder =
                    colorItem?.color === "#ffffff" ||
                    colorItem?.color === "rgb(255, 255, 255)" ||
                    colorItem?.color.toLowerCase() === "white";
                  return (
                    <div key={colorItem?.slug} className="flex items-center gap-4 ">
                      <div
                        className={`h-10 w-10 rounded-full ${shouldAddBorder ? "border border-solid border-border" : ""
                          }`}
                        style={{ background: colorItem?.color }}
                      ></div>
                    </div>
                  );
                })
              ) : typeof colors === 'object' ? (
                Object.entries(colors as Record<string, string>).map(([shade, hex]) => {
                  const shouldAddBorder =
                    hex === "#ffffff" ||
                    hex === "rgb(255, 255, 255)" ||
                    hex.toLowerCase() === "white";
                  return (
                    <div key={shade} className="flex items-center gap-4 ">
                      <div
                        className={`h-10 w-10 rounded-full ${shouldAddBorder ? "border border-solid border-border" : ""
                          }`}
                        style={{ background: hex }}
                      ></div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-4 ">
                  <div
                    className={`h-10 w-10 rounded-full ${(colors as string) === "#ffffff" || (colors as string) === "rgb(255, 255, 255)" || (colors as string).toLowerCase() === "white" ? "border border-solid border-border" : ""
                      }`}
                    style={{ background: colors as string }}
                  ></div>
                </div>
              )}
            </div>
            <h2 className="ml-auto text-md font-semibold">{colorGroup}</h2>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColorsBuilders;
