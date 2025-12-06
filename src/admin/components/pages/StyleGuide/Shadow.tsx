const Shadow = ({ shadows }: { shadows: object }) => {
  const renderShadow = (value: any) => {
    if (Array.isArray(value)) {
      return value.map((shadow) => shadow.replace(/rgba?\(.*?\)/, ""));
    }
    return value.replace(/rgba?\(.*?\)/, "");
  };

  return (
    <div className="dark-invert">
      {Object.entries(shadows).map(([name, value]) => (
        <div key={name} className="mb-4">
          <strong>{name}:</strong>{" "}
          {typeof value === "string" ? value : value.join(", ")}
          <div
            className="w-24 h-24 rounded-lg bg-base-1 text-[#CBC9C9] dark:text-[#666666]"
            style={{ boxShadow: renderShadow(value) }}
          ></div>
        </div>
      ))}
    </div>
  );
};

export default Shadow;
