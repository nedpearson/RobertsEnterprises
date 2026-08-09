import { type ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ title, description, icon, action, className = '' }: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl ${className}`}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{description}</p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};
