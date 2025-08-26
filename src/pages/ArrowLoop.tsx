import React from "react";

interface ArrowLoopProps {
  x?: number; // starting x
  y?: number; // starting y
  loops?: number; // number of loops (2-3)
  size?: number; // size of loop
  direction?: "left" | "right"; // spiral direction
}

const ArrowLoop: React.FC<ArrowLoopProps> = ({
  x = 100,
  y = 100,
  loops = 2,
  size = 60,
  direction = "right",
}) => {
  const path = [];
  let cx = x;
  let cy = y;
  let angle = 0;

  for (let i = 0; i < loops * 36; i++) {
    angle += 10;
    const rad = (angle * Math.PI) / 180;
    const r = (size * angle) / (360 * loops);
    cx = x + (direction === "right" ? r * Math.cos(rad) : -r * Math.cos(rad));
    cy = y + r * Math.sin(rad);
    path.push(`${cx},${cy}`);
  }

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ top: 0, left: 0 }}
      width="100%"
      height="100%"
    >
      <polyline
        points={path.join(" ")}
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#arrowhead)"
      />
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="4"
          refY="2"
          orient="auto"
          fill="white"
        >
          <path d="M0,0 L0,4 L4,2 Z" />
        </marker>
      </defs>
    </svg>
  );
};

export default ArrowLoop;
