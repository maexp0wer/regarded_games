// components/CardPlain.jsx (or .tsx)

import React from 'react';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}

const CardPlain: React.FC<CardProps> = ({
  icon,
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col bg-card rounded-xl shadow-md overflow-hidden h-full">
      {/* Image/Icon Area */}
      <div className="h-48 bg-card2 flex justify-center items-center shrink-0">
        <div className="w-28">
          {icon}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-bold mb-3">
          {title}
        </h3>
        <div className="text-muted-foreground space-y-2">
          {description}
        </div>
      </div>
      
      {/* Actions Area */}
      {actions && (
        <div className="p-6 pt-4 flex justify-center items-center">
          {actions}
        </div>
      )}
    </div>
  );
};

export default CardPlain;