const ColorDisplay = ({ colors }: { colors: object }) => {
  const isWhite = (color: string) => {
    const whiteColors = ["#fff", "#ffffff", "rgb(255, 255, 255)", "white"];
    return whiteColors.includes(color.toLowerCase());
  };

  const isValidColor = (value: string) => {
    // Filter out 'initial' and other non-color values
    return value !== 'initial' && value !== 'inherit' && value !== 'transparent';
  };

  return (
    <div className='overflow-x-auto'>
      <table className='table-auto w-full'>
        <tbody>
          {Object.entries(colors).map(([colorName, colorValues]) => (
            <tr key={colorName}>
              <th className="font-bold text-lg capitalize text-left align-baseline pt-2 w-[120px]">{colorName}</th>
              <td className="">
                <ul className="flex flex-wrap gap-1">
                  {typeof colorValues === 'object' ?
                    Object.entries(colorValues)
                      .filter(([_, value]) => isValidColor(value))
                      .map(([shade, value]) => (
                        <li key={`${colorName}-${shade}`} className="flex flex-col items-center group relative">
                          <span className='absolute  bottom-12 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-base-foreground p-2 text-base-1 rounded'>{value+''}</span>
                          <div className={`h-12 w-16 rounded mb-2 ${isWhite(value) ? 'border border-border' : ''}`} style={{ backgroundColor: `${value}` }}></div>
                          <span>{shade}</span>
                        </li>
                      )) :
                    isValidColor(colorValues) && (
                      <li className="flex flex-col items-center group relative">
                        <span className='absolute bottom-12 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-base-foreground p-2 text-base-1 rounded'>{colorValues}</span>
                        <div className={`h-12 w-16 rounded mb-2 ${isWhite(colorValues) ? 'border border-border' : ''}`} style={{ backgroundColor: colorValues }}></div>
                        <span>{colorName}</span>
                      </li>
                    )
                  }
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ColorDisplay;