import React from "react";

type TooltipProps = {
  text: string;
};

export const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  return (
    <span className="tooltip relative">
      <span className="tooltip-text absolute left-1/2 bottom-full mb-2 hidden w-max -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-md">
        {text}
      </span>
      <style jsx>{`
        .tooltip:hover .tooltip-text {
          display: block;
        }
      `}</style>
    </span>
  );
};