// components/svg/VoteDiagram1.tsx (Example Path)
import React, { SVGProps } from 'react';

// Keep the props interface if needed, but width/height might become optional
// if always controlled by CSS
interface RulesDiagramProps extends SVGProps<SVGSVGElement> {
  // width?: number | string; // Make optional or remove if controlled by CSS
  // height?: number | string; // Make optional or remove if controlled by CSS
  className?: string;
  // Add viewBox prop if it can change, otherwise hardcode it
  viewBox?: string;
}

export const VoteDiagramStep1: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      {/* Optional: Add a <title> inside for accessibility */}
      {/* <title id="diagramTitle">Vote Diagram Step X</title> */}

      {/* Your existing SVG content */}
      <g transform="translate(-681 -191)">
        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};


export const VoteDiagramStep2: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      {/* Optional: Add a <title> inside for accessibility */}
      {/* <title id="diagramTitle">Vote Diagram Step X</title> */}

      {/* Your existing SVG content */}
      <g transform="translate(-681 -191)">
        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>

        {/* Top Middle Box (Renter) */}
        <rect
          x="869"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(930.139 212)">
          Renter
        </text>
        <text {...textPrimaryStyle} transform="translate(979.139 212)"></text>
        <rect
          x="887"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(922.889 268)">
          ZuhausR
        </text>
        <text {...textPrimaryStyle} transform="translate(986.389 268)"></text>
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};


export const VoteDiagramStep3: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      {/* Optional: Add a <title> inside for accessibility */}
      {/* <title id="diagramTitle">Vote Diagram Step X</title> */}

      {/* Your existing SVG content */}
      <g transform="translate(-681 -191)">
        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>

        {/* Top Middle Box (Renter) */}
        <rect
          x="869"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(930.139 212)">
          Renter
        </text>
        <text {...textPrimaryStyle} transform="translate(979.139 212)"></text>
        <rect
          x="887"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(922.889 268)">
          ZuhausR
        </text>
        <text {...textPrimaryStyle} transform="translate(986.389 268)"></text>

        {/* Top Right Box (Coin Holder) */}
        <rect
          x="1059"
          y="192"
          width="171"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1102.43 212)">
          Coin Holder
        </text>
        <text {...textPrimaryStyle} transform="translate(1186.6 212)"></text>
        <rect
          x="1077"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1115.68 268)">
          Zuhausi
        </text>
        <text {...textPrimaryStyle} transform="translate(1173.35 268)"></text>
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};

export const VoteDiagramStep4: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      {/* Optional: Add a <title> inside for accessibility */}
      {/* <title id="diagramTitle">Vote Diagram Step X</title> */}

      {/* Your existing SVG content */}
      <g transform="translate(-681 -191)">

        {/* Middle Large Box (Total Vote) */}
        <rect
          x="700"
          y="410"
          width="512"
          height="88" // Height adjustment from previous step
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(919.931 490)">
          Total Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(991.931 490)"></text>
        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>

        {/* Top Middle Box (Renter) */}
        <rect
          x="869"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(930.139 212)">
          Renter
        </text>
        <text {...textPrimaryStyle} transform="translate(979.139 212)"></text>
        <rect
          x="887"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(922.889 268)">
          ZuhausR
        </text>
        <text {...textPrimaryStyle} transform="translate(986.389 268)"></text>

        {/* Top Right Box (Coin Holder) */}
        <rect
          x="1059"
          y="192"
          width="171"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1102.43 212)">
          Coin Holder
        </text>
        <text {...textPrimaryStyle} transform="translate(1186.6 212)"></text>
        <rect
          x="1077"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1115.68 268)">
          Zuhausi
        </text>
        <text {...textPrimaryStyle} transform="translate(1173.35 268)"></text>

        {/* Owner Vote Box */}
        <rect
          x="715"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(742.775 455)">
          Owner Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(826.775 455)"></text>

        {/* Renter Vote Box */}
        <rect
          x="884"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(911.528 455)">
          Renter Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(996.361 455)"></text>

        {/* Coin Vote Box */}
        <rect
          x="1054"
          y="427"
          width="139"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1089.97 455)">
          Coin Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1157.13 455)"></text>
        
        {/* Shortened Arrow from Owner Box */}
        <path
          d="M768.167 316.5 L 768.167 322.377 L 766.833 322.377 L 766.833 316.5 Z M771.5 321.043 L 767.5 329.043 L 763.5 321.043 Z"
          fill="var(--color-text)"
        />

        {/* Owner Vote Button */}
        <rect
          x="698"
          y="335"
          width="140"
          height="33"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(751.637 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(784.637 358)"></text>

        {/* Shortened Arrow from Renter Box */}
        <path
          d="M953.167 317.5 L 953.167 323.377 L 951.833 323.377 L 951.833 317.5 Z M956.5 322.043 L 952.5 330.043 L 948.5 322.043 Z"
          fill="var(--color-text)"
        />
        
        {/* Renter Vote Button */}
        <rect
          x="884"
          y="335"
          width="140"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(937.444 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(970.444 358)"></text>

        

        {/* Shortened Arrow from Coin Holder Box */}
        <path
          d="M1146.17 317.5 L 1146.17 323.377 L 1144.83 323.377 L 1144.83 317.5 Z M1149.5 322.043 L 1145.5 330.043 L 1141.5 322.043 Z"
          fill="var(--color-text)"
        />

        {/* Coin Holder/Coin Vote Button */}
        <rect
          x="1077"
          y="335"
          width="139"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1130.04 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1163.04 358)"></text>

        {/* Shortened Arrow from Owner Vote Button */}
        <path
          d="M770.5 373.3 L 782.6 416.0 L 781.3 416.4 L 769.2 373.7 Z M785.4 413.8 L 783.7 422.6 L 777.7 416.0 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Renter Vote Button */}
        <path
          d="M955.167 374.5 L 955.167 416.685 L 953.833 416.685 L 953.833 374.5 Z M958.5 415.352 L 954.5 423.352 L 950.5 415.352 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Coin Vote Button */}
        <path
          d="M2.42 4.41 L 19.39 47.75 L 18.15 48.23 L 1.18 4.89 Z M22.01 45.29 L 21.19 54.20 L 14.56 48.21 Z"
          fill="var(--color-text)"
          transform="matrix(-1 0 0 1 1147.49 369.5)"
        />
        
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};


export const VoteDiagramStep5: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      
      <g transform="translate(-681 -191)">
        {/* Background Rectangle */}
        <rect
          x="681"
          y="391"
          width="549"
          height="275" // Reverted height adjustment from previous step
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />

        {/* Text placeholders and title */}
        <text {...textPrimaryStyle} transform="translate(893.515 655)"></text>
        <text {...textPrimaryStyle} transform="translate(911.015 655)">
          Rules Contract
        </text>
        <text {...textPrimaryStyle} transform="translate(1018.35 655)"></text>

        {/* Middle Large Box (Total Vote) */}
        <rect
          x="700"
          y="410"
          width="512"
          height="88" // Height adjustment from previous step
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(919.931 490)">
          Total Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(991.931 490)"></text>
        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>

        {/* Top Middle Box (Renter) */}
        <rect
          x="869"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(930.139 212)">
          Renter
        </text>
        <text {...textPrimaryStyle} transform="translate(979.139 212)"></text>
        <rect
          x="887"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(922.889 268)">
          ZuhausR
        </text>
        <text {...textPrimaryStyle} transform="translate(986.389 268)"></text>

        {/* Top Right Box (Coin Holder) */}
        <rect
          x="1059"
          y="192"
          width="171"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1102.43 212)">
          Coin Holder
        </text>
        <text {...textPrimaryStyle} transform="translate(1186.6 212)"></text>
        <rect
          x="1077"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1115.68 268)">
          Zuhausi
        </text>
        <text {...textPrimaryStyle} transform="translate(1173.35 268)"></text>

        {/* Owner Vote Box */}
        <rect
          x="715"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(742.775 455)">
          Owner Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(826.775 455)"></text>

        {/* Renter Vote Box */}
        <rect
          x="884"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(911.528 455)">
          Renter Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(996.361 455)"></text>

        {/* Coin Vote Box */}
        <rect
          x="1054"
          y="427"
          width="139"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1089.97 455)">
          Coin Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1157.13 455)"></text>

        {/* Shortened Arrow from Owner Box */}
        <path
          d="M768.167 316.5 L 768.167 322.377 L 766.833 322.377 L 766.833 316.5 Z M771.5 321.043 L 767.5 329.043 L 763.5 321.043 Z"
          fill="var(--color-text)"
        />

        {/* Owner Vote Button */}
        <rect
          x="698"
          y="335"
          width="140"
          height="33"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(751.637 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(784.637 358)"></text>

        {/* Shortened Arrow from Renter Box */}
        <path
          d="M953.167 317.5 L 953.167 323.377 L 951.833 323.377 L 951.833 317.5 Z M956.5 322.043 L 952.5 330.043 L 948.5 322.043 Z"
          fill="var(--color-text)"
        />

        {/* Renter Vote Button */}
        <rect
          x="884"
          y="335"
          width="140"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(937.444 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(970.444 358)"></text>

        {/* Shortened Arrow from Coin Holder Box */}
        <path
          d="M1146.17 317.5 L 1146.17 323.377 L 1144.83 323.377 L 1144.83 317.5 Z M1149.5 322.043 L 1145.5 330.043 L 1141.5 322.043 Z"
          fill="var(--color-text)"
        />

        {/* Coin Holder/Coin Vote Button */}
        <rect
          x="1077"
          y="335"
          width="139"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1130.04 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1163.04 358)"></text>

        {/* Shortened Arrow from Owner Vote Button */}
        <path
          d="M770.5 373.3 L 782.6 416.0 L 781.3 416.4 L 769.2 373.7 Z M785.4 413.8 L 783.7 422.6 L 777.7 416.0 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Renter Vote Button */}
        <path
          d="M955.167 374.5 L 955.167 416.685 L 953.833 416.685 L 953.833 374.5 Z M958.5 415.352 L 954.5 423.352 L 950.5 415.352 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Coin Vote Button */}
        <path
          d="M2.42 4.41 L 19.39 47.75 L 18.15 48.23 L 1.18 4.89 Z M22.01 45.29 L 21.19 54.20 L 14.56 48.21 Z"
          fill="var(--color-text)"
          transform="matrix(-1 0 0 1 1147.49 369.5)"
        />
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};

export const VoteDiagramStep6: React.FC<RulesDiagramProps> = ({
  className = '',
  // Use a default viewBox based on original dimensions
  viewBox = '0 0 550 481', // <-- IMPORTANT: Use original dimensions here
  ...props // Pass other SVG props like fill, stroke etc.
}) => {
  // Style objects for cleaner JSX
  const textPrimaryStyle = {
    fill: 'var(--color-text)', // Use your theme variables
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 16,
  };
  const rectRadius = 5;

  return (
    <svg
      // REMOVED fixed width and height attributes
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      // ADDED viewBox attribute
      viewBox={viewBox}
      // Apply passed className for CSS scaling + any other classes
      className={className}
      // Keep preserveAspectRatio for uniform scaling (default but good practice)
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby="diagramTitle"
      role="img"
      // Pass down other props
      {...props}
    >
      {/* Optional: Add a <title> inside for accessibility */}
      {/* <title id="diagramTitle">Vote Diagram Step X</title> */}

      {/* Your existing SVG content */}
      <g transform="translate(-681 -191)">

        {/* Background Rectangle */}
        <rect
          x="681"
          y="391"
          width="549"
          height="275" // Reverted height adjustment from previous step
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />

        {/* Text placeholders and title */}
        <text {...textPrimaryStyle} transform="translate(893.515 655)"></text>
        <text {...textPrimaryStyle} transform="translate(911.015 655)">
          Rules Contract
        </text>
        <text {...textPrimaryStyle} transform="translate(1018.35 655)"></text>

        {/* Middle Large Box (Total Vote) */}
        <rect
          x="700"
          y="410"
          width="512"
          height="88" // Height adjustment from previous step
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(919.931 490)">
          Total Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(991.931 490)"></text>
        {/* Bottom Left Box */}
        <rect
          x="700"
          y="536"
          width="139"
          height="97"
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(726.878 572)">
          Rent ceiling
        </text>
        <text {...textPrimaryStyle} transform="translate(711.625 591)">
          based on staple
        </text>
        <text {...textPrimaryStyle} transform="translate(747.125 610)">
          goods
        </text>
        <text {...textPrimaryStyle} transform="translate(791.625 610)"></text>

        {/* Bottom Middle Box */}
        <rect
          x="884"
          y="538"
          width="140"
          height="97"
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(925.024 574)">
          Amount
        </text>
        <text {...textPrimaryStyle} transform="translate(913.191 593)">
          withheld in
        </text>
        <text {...textPrimaryStyle} transform="translate(901.444 612)">
          Property Vault
        </text>
        <text {...textPrimaryStyle} transform="translate(1006.44 612)"></text>
        {/* Bottom Right Box */}
        <rect
          x="1073"
          y="536"
          width="139"
          height="96"
          fill="var(--color-card2)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1096.32 571)">
          Amount DAO
        </text>
        <text {...textPrimaryStyle} transform="translate(1100.07 590)">
          receives for
        </text>
        <text {...textPrimaryStyle} transform="translate(1114.57 609)">
          minting
        </text>
        <text {...textPrimaryStyle} transform="translate(1170.4 609)"></text>

        

        {/* Top Left Box (Owner) */}
        <rect
          x="681"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(743.264 212)">
          Owner
        </text>
        <text {...textPrimaryStyle} transform="translate(791.43 212)"></text>
        <rect
          x="700"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)" // Use theme variable
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(735.18 268)">
          ZuhausO
        </text>
        <text {...textPrimaryStyle} transform="translate(799.514 268)"></text>

        {/* Top Middle Box (Renter) */}
        <rect
          x="869"
          y="192"
          width="172"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(930.139 212)">
          Renter
        </text>
        <text {...textPrimaryStyle} transform="translate(979.139 212)"></text>
        <rect
          x="887"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(922.889 268)">
          ZuhausR
        </text>
        <text {...textPrimaryStyle} transform="translate(986.389 268)"></text>

        {/* Top Right Box (Coin Holder) */}
        <rect
          x="1059"
          y="192"
          width="171"
          height="119"
          fill="var(--color-card)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1102.43 212)">
          Coin Holder
        </text>
        <text {...textPrimaryStyle} transform="translate(1186.6 212)"></text>
        <rect
          x="1077"
          y="229"
          width="135"
          height="65"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1115.68 268)">
          Zuhausi
        </text>
        <text {...textPrimaryStyle} transform="translate(1173.35 268)"></text>

        {/* Owner Vote Box */}
        <rect
          x="715"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(742.775 455)">
          Owner Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(826.775 455)"></text>

        {/* Renter Vote Box */}
        <rect
          x="884"
          y="427"
          width="140"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(911.528 455)">
          Renter Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(996.361 455)"></text>

        {/* Coin Vote Box */}
        <rect
          x="1054"
          y="427"
          width="139"
          height="42"
          fill="var(--color-primary3)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1089.97 455)">
          Coin Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1157.13 455)"></text>

        {/* Shortened Arrow from Owner Box */}
        <path
          d="M768.167 316.5 L 768.167 322.377 L 766.833 322.377 L 766.833 316.5 Z M771.5 321.043 L 767.5 329.043 L 763.5 321.043 Z"
          fill="var(--color-text)"
        />

        {/* Owner Vote Button */}
        <rect
          x="698"
          y="335"
          width="140"
          height="33"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(751.637 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(784.637 358)"></text>

        {/* Shortened Arrow from Renter Box */}
        <path
          d="M953.167 317.5 L 953.167 323.377 L 951.833 323.377 L 951.833 317.5 Z M956.5 322.043 L 952.5 330.043 L 948.5 322.043 Z"
          fill="var(--color-text)"
        />

        {/* Renter Vote Button */}
        <rect
          x="884"
          y="335"
          width="140"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(937.444 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(970.444 358)"></text>

        {/* Shortened Arrow from Coin Holder Box */}
        <path
          d="M1146.17 317.5 L 1146.17 323.377 L 1144.83 323.377 L 1144.83 317.5 Z M1149.5 322.043 L 1145.5 330.043 L 1141.5 322.043 Z"
          fill="var(--color-text)"
        />

        {/* Coin Holder/Coin Vote Button */}
        <rect
          x="1077"
          y="335"
          width="139"
          height="34"
          fill="var(--color-secondary)"
          rx={rectRadius}
          ry={rectRadius}
        />
        <text {...textPrimaryStyle} transform="translate(1130.04 358)">
          Vote
        </text>
        <text {...textPrimaryStyle} transform="translate(1163.04 358)"></text>

        {/* Shortened Arrow from Owner Vote Button */}
        <path
          d="M770.5 373.3 L 782.6 416.0 L 781.3 416.4 L 769.2 373.7 Z M785.4 413.8 L 783.7 422.6 L 777.7 416.0 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Renter Vote Button */}
        <path
          d="M955.167 374.5 L 955.167 416.685 L 953.833 416.685 L 953.833 374.5 Z M958.5 415.352 L 954.5 423.352 L 950.5 415.352 Z"
          fill="var(--color-text)"
        />
        {/* Shortened Arrow from Coin Vote Button */}
        <path
          d="M2.42 4.41 L 19.39 47.75 L 18.15 48.23 L 1.18 4.89 Z M22.01 45.29 L 21.19 54.20 L 14.56 48.21 Z"
          fill="var(--color-text)"
          transform="matrix(-1 0 0 1 1147.49 369.5)"
        />
      </g>
      {/* Add other SVG elements for different steps here */}
    </svg>
  );
};