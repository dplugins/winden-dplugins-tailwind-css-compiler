const Typography = (
  { fontSizes, fontFamilies, fontWeight, letterSpacing, lineHeights }
  : { fontSizes: object, fontFamilies: object, fontWeight: object, letterSpacing: object, lineHeights: object }
) => {
  const fontSizeEntries = fontSizes ? Object.entries(fontSizes) : [];
  const fontFamilyEntries = fontFamilies ? Object.entries(fontFamilies) : [];
  const fontWeightEntries = fontWeight ? Object.entries(fontWeight) : [];
  const letterSpacingEntries = letterSpacing ? Object.entries(letterSpacing) : [];
  const lineHeightsEntries = lineHeights ? Object.entries(lineHeights) : [];

  // Filter out invalid font family entries (additional safety measure)
  const validFontFamilyEntries = fontFamilyEntries.filter(([familyName, value]) => {
    // Exclude font weights and other non-font-family properties
    const isFontWeight = familyName.includes('weight') || familyName.includes('font-weight');
    const isFontFeature = familyName.includes('feature') || familyName.includes('variation');
    const isFontVariation = familyName.includes('variation');
    const isDefaultFont = familyName.includes('default');
    const hasInvalidChars = familyName.includes('(') || familyName.includes(')') || familyName.includes(';');
    
    return !isFontWeight && !isFontFeature && !isFontVariation && !isDefaultFont && !hasInvalidChars;
  });

  // Filter out invalid font size entries (additional safety measure)
  const validFontSizeEntries = fontSizeEntries.filter(([sizeName, value]) => {
    // Exclude line-height and shadow properties
    const isLineHeight = sizeName.includes('line-height') || sizeName.includes('line-height');
    const isShadow = sizeName.includes('shadow') || sizeName.startsWith('shadow');
    const hasInvalidChars = sizeName.includes('(') || sizeName.includes(')') || sizeName.includes(';');
    
    return !isLineHeight && !isShadow && !hasInvalidChars;
  });

  return (
    <div>
      <section className='mb-24 mt-2'>
        <h4 className='text-2xl mb-8'>Font Families</h4>
        {validFontFamilyEntries.length === 0 ? <p>No font families available.</p> : (
          validFontFamilyEntries.map(([familyName, value]) => (
            <div key={`family-${familyName}`}>
              <hr />
              <p>{familyName}</p>
              <p className='text-2xl' style={{ fontFamily: value }}>The quick brown fox jumps over the lazy dog.</p>
            </div>
          ))
        )}
      </section>

      <section className='mb-24 mt-2'>
        <h4 className='text-2xl mb-8'>Font Sizes</h4>
        {validFontSizeEntries.length === 0 ? <p>No font sizes available.</p> : (
          validFontSizeEntries.map(([className, value]) => {
            const size = Array.isArray(value) ? value[0] : value;
            const lineHeight = Array.isArray(value) ? value[1]?.lineHeight : value;

            // Check if this is a fluid value (contains clamp)
            const isFluid = typeof size === 'string' && size.includes('clamp(');
            let minSize = size;
            let maxSize = size;

            if (isFluid) {
              // Extract min and max from clamp(min, preferred, max)
              const clampMatch = size.match(/clamp\(([^,]+),\s*[^,]+,\s*([^)]+)\)/);
              if (clampMatch) {
                minSize = clampMatch[1].trim();
                maxSize = clampMatch[2].trim();
              }
            }

            return (
              <div className='py-6' key={`size-${className}`}>
                <hr />
                <p>{className}: {size} / {lineHeight}</p>
                {isFluid ? (
                  <div className="flex flex-col gap-2">
                    <p className='element' style={{ fontSize: minSize, lineHeight: 1, margin: 0 }}>The quick brown fox jumps over the lazy dog.</p>
                    <p className='element-2' style={{ fontSize: maxSize, lineHeight: 1, margin: 0 }}>The quick brown fox jumps over the lazy dog.</p>
                  </div>
                ) : (
                  <p className='w-full' style={{ fontSize: size, lineHeight: lineHeight }}>The quick brown fox jumps over the lazy dog.</p>
                )}
              </div>
            )
          })
        )}
      </section>

      <section className='mb-24 mt-2'>
        <h4 className='text-2xl mb-8'>Font Weights</h4>
        {Object.entries(fontWeight).length === 0 ? (
          <p>No font weights available.</p>
        ) : (
          Object.entries(fontWeight).map(([weightName, value]) => (
            <div key={`weight-${weightName}`}>
              <hr />
              <p>{weightName}: {value}</p>
              <p className='text-2xl' style={{ fontWeight: value }}>The quick brown fox jumps over the lazy dog.</p>
            </div>
          ))
        )}
      </section>

      <section className='mb-24 mt-2'>
        <h4 className='text-2xl mb-8'>Letter Spacing</h4>
        {letterSpacingEntries.length === 0 ? <p>No letter spacing available.</p> : (
          letterSpacingEntries.map(([key, value]) => (
            <div key={`spacing-${key}`}>
              <hr />
              <p>{key}: {value}</p>
              <p className='text-2xl' style={{ letterSpacing: value }}>The quick brown fox jumps over the lazy dog.</p>
            </div>
          ))
        )}
      </section>

      <section className='mb-24 mt-2 line-height-guide'>
        <h4 className='text-2xl mb-8'>Line Heights</h4>
        {lineHeightsEntries.length === 0 ? <p>No line heights available.</p> : (
          lineHeightsEntries.map(([key, value]) => (
            <div key={`height-${key}`} style={{ lineHeight: value }}>
              <hr />
              <p>{key}: {value}</p>
              <p className='text-2xl py-8 max-w-4xl' >
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Facere maxime inventore, aperiam similique consectetur architecto facilis nam iste accusamus hic quam distinctio vitae, consequatur quaerat maiores quas! Voluptatum, deserunt repudiandae.
              </p>
            </div>
          ))
        )}
      </section>

      <style>{`
        .line-height-guide .text-2xl {
          line-height: inherit !important;
        }
`}</style>


    </div>
  );
};

export default Typography;
