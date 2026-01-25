import React from 'react';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onButtonClick: () => void;
  buttonText?: string;
}

const Card: React.FC<CardProps> = ({
  icon,
  title,
  description,
  onButtonClick,
  buttonText = "Learn More"
}) => {
  
  let sizedIcon = icon;

  if (React.isValidElement(icon)) {
    const originalProps = icon.props as { className?: string };
    const newClassName = `max-w-full max-h-full object-contain ${originalProps.className || ''}`.trim();

    // --- THE FINAL FIX ---
    // We assert the type of `icon` here to tell TypeScript that it is an element
    // whose props can include a `className`. This satisfies the strict requirements
    // of `React.cloneElement` and resolves the overload error.
    sizedIcon = React.cloneElement(
      icon as React.ReactElement<{ className?: string }>,
      {
        className: newClassName,
      }
    );
  }

  return (
    <div className="flex flex-col bg-card rounded-xl shadow-md overflow-hidden h-full">
      <div className="h-48 bg-card2 flex justify-center items-center shrink-0 p-8">
        {sizedIcon}
      </div>

      <div className="p-6 pb-0 grow">
        <h3 className="text-xl font-bold mb-3">
          {title}
        </h3>
        <p className='text-sm'>{description}</p>
      </div>

      <div className='mt-auto text-right p-5 pr-12'>
        <button onClick={onButtonClick} className="text-primary hover:underline">
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default Card;