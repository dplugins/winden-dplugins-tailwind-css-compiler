import { useState, useEffect } from "react";
import { Button } from "@el/Button";

const Filter = ({ filterNames }) => {
  const [isSticky, setIsSticky] = useState(false);

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const stickyClassTriggerHeight = 8; // Adjust based on when you want the shadow to appear
    setIsSticky(scrollTop > stickyClassTriggerHeight);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      console.error(`Target element with ID "${id}" not found.`);
    }
  };

  return (
    <div
      className={`flex gap-4 p-4 pl-8 bg-base-1 border-b border-border sticky z-50 top-[32px] ${
        isSticky ? "shadow-md" : ""
      }`}
    >
      {filterNames.map((name, index) => (
        <Button
          variant="ghost"
          key={index}
          onClick={() =>
            handleClick(`${name.toLowerCase().replace(/\s+/g, "-")}`)
          }
        >
          {name}
        </Button>
      ))}
    </div>
  );
};

export default Filter;
