
import React from 'react';

interface EInkButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
}

const EInkButton: React.FC<EInkButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '',
  disabled = false
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-black uppercase tracking-tighter transition-all duration-75 select-none border-4 border-black rounded-sm active:translate-y-1 active:translate-x-1 active:shadow-none";
  
  const variants = {
    primary: "bg-black text-white active:bg-neutral-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    secondary: "bg-white text-black active:bg-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    outline: "bg-transparent text-black border-dashed shadow-none hover:bg-neutral-50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-20 grayscale pointer-events-none' : ''} ${className}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default EInkButton;
