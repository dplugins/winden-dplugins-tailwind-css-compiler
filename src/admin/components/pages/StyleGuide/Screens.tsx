const Screens = ({ screens }: {screens: object}) => {
  return (
    <div className="overflow-x-scroll">
      {screens && Object.entries(screens).map(([label, size]) => (
        <div key={label} className="mb-4">
          <strong>{label}:</strong> {typeof size === 'object' ? `${Object.keys(size)[0]} ${size[Object.keys(size)[0]]}` : size}
          <div className='bg-element h-8 rounded' style={{ width: `${typeof size === 'object' ? size[Object.keys(size)[0]] : size}` }}></div>
        </div>
      ))}
    </div>
  );
};

export default Screens;
