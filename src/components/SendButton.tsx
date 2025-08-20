// components/svg/SendButton.tsx
import React from 'react';
import './tokenize.css'

// Optional: Import styles if using CSS Modules
// import styles from './DiagramStyles.module.css';

interface SendButtonProps {
  x: number;
  y: number;
  // Add other props like width/height if they vary
}

const SendButton = ({ x, y }: SendButtonProps) => {
   const width = 90;  // Standardized width
   const height = 34; // Standardized height

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        className="rect-send-button" // Use consistent class
        rx="8"
       />
      <text
        x={width / 2}
        y={height / 2}
        className="text-send-label" // Use consistent class
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Send
      </text>
    </g>
  );
};

export default SendButton;