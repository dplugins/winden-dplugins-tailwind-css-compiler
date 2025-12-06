import { Button } from "@el/Button";

const Title = ({ text, link }: { text: string; link: string }) => {
  // Transform text to lowercase and replace spaces with dashes
  const id = text.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="relative overflow-unset">
      <div id={id}>&nbsp;</div>
      <div className="sticky top-[180px]">
        {/* Use the id variable as the value for id attribute */}
        <h2 className="text-4xl font-bold">{text}</h2>
        {link && (
          <Button
            variant="link"
            className="p-0"
            onClick={() => window.open(link, "_blank")}
          >
            View docs ↗
          </Button>
        )}
      </div>
    </div>
  );
};

export default Title;
