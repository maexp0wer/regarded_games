// components/Card.jsx (or .tsx)
import React from 'react';

// Define the props the Card component will accept
// (Using TypeScript syntax here for clarity, adjust if using plain JS)
interface CardProps {
  icon: React.ReactNode; // Expecting a JSX element for the icon
  title: string;
  description: string;
  buttonText?: string; // Optional text for the button, defaults to "Learn More"
}

const Card: React.FC<CardProps> = ({
  icon,
  title,
  description,
  buttonText = "Learn More" // Default button text
}) => {
  return (
    <div className="flex flex-col bg-card rounded-xl shadow-md overflow-hidden h-full"> {/* Added h-full to ensure consistent height if needed in a grid */}
      {/* Image/Icon Area */}
      <div className="h-48 bg-card2 flex justify-center items-center shrink-0">
        {/* Use a standard width for the icon container */}
        <div className="w-28">
          {icon} {/* Render the passed icon component/element */}
        </div>
      </div>
      {/* Content Area */}
      <div className="p-6 pb-0 flex-grow"> {/* flex-grow allows this area to expand */}
        <h3 className="text-xl font-bold mb-3">
          {title} {/* Use the title prop */}
        </h3>
        <p>{description}</p> {/* Use the description prop */}
      </div>
      {/* Button Area */}

      </div>
  );
};

export default Card;