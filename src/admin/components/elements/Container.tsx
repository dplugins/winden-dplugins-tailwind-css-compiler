import * as React from "react";

interface Props {
  children: React.ReactNode;
}

function Container(props: Props) {
  return (
    <div className="border mx-auto my-24 h-fit w-full max-w-[600px] bg-base">
      {props.children}
    </div>
  );
}

export { Container };
