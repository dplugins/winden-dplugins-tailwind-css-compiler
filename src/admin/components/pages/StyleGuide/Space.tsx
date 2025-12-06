const Space = ({ classNames }: {classNames: object}) => {
  return (
    <div>
      {Object.entries(classNames).map(([key, value]) => {
        // Check if this is a fluid value (contains clamp)
        const isFluid = typeof value === 'string' && value.includes('clamp(');
        let minValue = value;
        let maxValue = value;

        if (isFluid) {
          // Extract min and max from clamp(min, preferred, max)
          const clampMatch = value.match(/clamp\(([^,]+),\s*[^,]+,\s*([^)]+)\)/);
          if (clampMatch) {
            minValue = clampMatch[1].trim();
            maxValue = clampMatch[2].trim();
          }
        }

        return (
          <div key={key} className='mb-4'>
            <p>Space {key}: {value}</p>
            {isFluid ? (
              <div className="flex gap-2 items-center">
                <div style={{ height: minValue, width: minValue }} className='bg-element element'></div>
                <div style={{ height: maxValue, width: maxValue }} className='bg-element element-2'></div>
              </div>
            ) : (
              <div style={{ height: value, width: value }} className='bg-element'></div>
            )}
          </div>
        );
      })}

        <p>By default the spacing scale is inherited by the <code>padding</code>, <code>margin</code>, <code>width</code>, <code>minWidth</code>, <code>maxWidth</code>, <code>height</code>, <code>minHeight</code>, <code>maxHeight</code>, <code>gap</code>, <code>inset</code>, <code>space</code>, <code>translate</code>, <code>scrollMargin</code>, and <code>scrollPadding</code> core plugins.</p>
    </div>
  );
};

export default Space;
