import React from "react";

interface FluxaLogoProps {
  size?: number;
  fillColor?: string;
  className?: string;
}

export const FluxaLogo: React.FC<FluxaLogoProps> = ({
  size = 20,
  fillColor = "currentColor",
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="32" cy="32" r="30" fill={fillColor} opacity="0.15" />
      <path
        d="M20 38C22 42 27 46 32 46C39 46 44 41 44 34C44 28 40 24 34 24C30 24 27 26 26 28"
        stroke={fillColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="3" fill={fillColor} />
      <circle cx="40" cy="24" r="3" fill={fillColor} />
    </svg>
  );
};
