import React from 'react';

interface OwnershipTokenBoxProps {
  x: number;
  y: number;
}

const OwnershipTokenBox = ({ x, y }: OwnershipTokenBoxProps) => {
  const width = 136;
  const height = 66;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8" // <<< Added rounded corners
        className="rect-ownership-token"
      />
      <text x={width / 2} y={height * 0.35} className="text-ownership-token" textAnchor="middle" dominantBaseline="middle">
        Ownership
      </text>
      <text x={width / 2} y={height * 0.65} className="text-ownership-token" textAnchor="middle" dominantBaseline="middle">
        Token
      </text>
    </g>
  );
};
export default OwnershipTokenBox;