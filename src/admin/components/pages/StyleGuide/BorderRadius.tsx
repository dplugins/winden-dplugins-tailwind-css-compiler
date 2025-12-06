const BorderRadius = ({ borderRadiusObj }: {borderRadiusObj: object}) => {
  return (
    <div>
      {Object.entries(borderRadiusObj).map(([key, value]) => {
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
          <div key={key} className="mb-4">
            <strong>{key}:</strong> {value}
            {isFluid ? (
              <div className="flex gap-2 items-center">
                <div
                  className='bg-element text-element-foreground w-24 h-24 flex items-center justify-center element'
                  style={{ borderRadius: minValue }}
                >
                  {minValue}
                </div>
                <div
                  className='bg-element text-element-foreground w-24 h-24 flex items-center justify-center element-2'
                  style={{ borderRadius: maxValue }}
                >
                  {maxValue}
                </div>
              </div>
            ) : (
              <div
                className='bg-element text-element-foreground w-24 h-24 flex items-center justify-center'
                style={{ borderRadius: value }}
              >
                {value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BorderRadius;
