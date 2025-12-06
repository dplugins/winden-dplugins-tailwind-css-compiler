const AspectRatioDisplay = ({ classNames }: {classNames: Array<String>}) => {
  if (classNames.length === 0) {
    return null;
  }

  return (
    <div>
      <h3>Aspect Ratio:</h3>
      {classNames.map((className, index) => (
        <h5 key={index}>{className}</h5>
      ))}
    </div>
  );
};

export default AspectRatioDisplay;
