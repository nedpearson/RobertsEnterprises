

export type StatusType = 'active' | 'pending' | 'cancelled' | 'error' | 'success' | 'neutral';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusBadge = ({ status, label, className = '' }: StatusBadgeProps) => {
  const styles = {
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    neutral: 'bg-white/10 text-gray-200 border-white/20',
  };

  const defaultLabels = {
    active: 'Active',
    pending: 'Pending',
    cancelled: 'Cancelled',
    error: 'Error',
    success: 'Success',
    neutral: 'Unknown',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]} ${className}`}>
      {label || defaultLabels[status]}
    </span>
  );
};
