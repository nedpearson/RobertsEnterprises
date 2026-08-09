import { type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card = ({ className = '', variant = 'default', children, ...props }: CardProps) => {
  const baseStyles = 'bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden';
  
  const variants = {
    default: '',
    elevated: 'shadow-xl shadow-black/20',
    outlined: 'border-2 border-white/30',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-6 py-4 border-b border-white/10 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`px-6 py-4 bg-black/20 border-t border-white/10 ${className}`} {...props}>
    {children}
  </div>
);
