const Width = ({ widths }: { widths: object }) => {
  return (
    <div>
      {Object.entries(widths).map(([key, value]) => (
        <div key={key} className="mb-4">
          <strong>{key}:</strong> {value}
          <div className="bg-base-2 rounded max-w-7xl overflow-x-scroll">
            <div
              className="bg-element h-8 rounded"
              style={{ width: value }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Width;
