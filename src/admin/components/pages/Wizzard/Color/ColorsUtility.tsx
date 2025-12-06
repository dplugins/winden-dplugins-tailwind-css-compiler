import React from 'react';

/**
 * Utility colors preview component
 * Displays transparent, white, and black color swatches
 */
const ColorsUtility: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 mt-16">
      <style>
        {`.transparent {
          background-image: linear-gradient(45deg, #c7c7c7 16.67%, #ebebeb 16.67%, #ebebeb 50%, #c7c7c7 50%, #c7c7c7 66.67%, #ebebeb 66.67%, #ebebeb 100%);
          background-size: 12.73px 12.73px;
        }`}
      </style>
      <h2 className="text-2xl font-semibold">Utility colors: Preview</h2>
      <div>
        <div className="preview group flex w-full grow items-center gap-8 rounded-lg border border-solid border-border bg-base-1 py-2 px-4 shadow-sm">
          <div className="flex -space-x-4 ">
            <div className="h-10 w-10 rounded-full border border-solid border-border transparent"></div>
            <div className="h-10 w-10 rounded-full border border-solid border-border bg-[white]"></div>
            <div className="h-10 w-10 rounded-full border border-solid border-border bg-[black]"></div>
          </div>
          <h2 className="ml-auto text-md font-semibold">Utility colors</h2>
        </div>
      </div>
    </div>
  );
};

export default ColorsUtility;
