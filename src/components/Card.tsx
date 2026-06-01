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
    sizedIcon = React.cloneElement(
      icon as React.ReactElement<{ className?: string }>,
      { className: `max-w-full max-h-full object-contain ${originalProps.className || ''}`.trim() }
    );
  }

  return (
    <div className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden h-full transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1.5 hover:border-border2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15),0_0_20px_var(--color-purple-15)]">

      <div className="relative h-48 bg-card2 border-b border-border flex justify-center items-center shrink-0 p-8 overflow-hidden">
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'var(--subtle-glow)' }}
        />
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {sizedIcon}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5 grow">
        <h3 className="h3-app">
          {title}
        </h3>
        <p className="font-sans text-sm leading-relaxed text-text2">
          {description}
        </p>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={onButtonClick}
          className="group/cta font-mono text-xs font-bold uppercase tracking-widest text-purple hover:text-purple3-hover transition-all duration-150 ease-in-out active:translate-y-px flex items-center gap-1.5"
        >
          {buttonText}
          <span className="transition-transform duration-150 group-hover/cta:translate-x-0.5">&#8594;</span>
        </button>
      </div>
    </div>
  );
};

export default Card;
