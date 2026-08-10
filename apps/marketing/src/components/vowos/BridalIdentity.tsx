import { useState } from 'react';
import { Customer, formatDate } from '@/data/vowosData';
import { Camera } from 'lucide-react';

export type IdentitySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface BridalIdentityProps {
  customer: Customer | { id?: string; name: string; email?: string; status?: string; weddingDate?: string; profilePhotoUrl?: string; profilePhotoUpdatedAt?: string };
  size?: IdentitySize;
  showName?: boolean;
  showStatus?: boolean;
  showWeddingDate?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  onPhotoClick?: () => void;
  showEditOverlay?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<IdentitySize, { box: string; text: string; editBadge: string }> = {
  xs: { box: 'h-6 w-6', text: 'text-[10px]', editBadge: 'p-0.5' },
  sm: { box: 'h-8 w-8', text: 'text-xs', editBadge: 'p-1' },
  md: { box: 'h-10 w-10', text: 'text-sm', editBadge: 'p-1.5' },
  lg: { box: 'h-16 w-16', text: 'text-xl', editBadge: 'p-2' },
  xl: { box: 'h-24 w-24', text: 'text-3xl', editBadge: 'p-2.5' },
};

export default function BridalIdentity({
  customer,
  size = 'md',
  showName = false,
  showStatus = false,
  showWeddingDate = false,
  clickable = false,
  onClick,
  onPhotoClick,
  showEditOverlay = false,
  className = '',
}: BridalIdentityProps) {
  const [imageError, setImageError] = useState(false);

  const initials = customer.name
    ? customer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'B';

  const photoUrl = !imageError && customer.profilePhotoUrl ? customer.profilePhotoUrl : null;
  const sizeConfig = SIZE_CLASSES[size];

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (onPhotoClick) {
      e.stopPropagation();
      onPhotoClick();
    } else if (onClick) {
      onClick();
    }
  };

  const avatarElement = (
    <div
      onClick={handleAvatarClick}
      className={`relative group flex-shrink-0 rounded-full overflow-hidden ${sizeConfig.box} ${
        clickable || onPhotoClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
      title={`Bride profile for ${customer.name}`}
    >
      {photoUrl ? (
        <img
          src={customer.profilePhotoUpdatedAt ? `${photoUrl}?v=${encodeURIComponent(customer.profilePhotoUpdatedAt)}` : photoUrl}
          alt={customer.name ? `Profile photo of ${customer.name}` : 'Bride profile photo'}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover rounded-full shadow-2xs"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 font-semibold text-white shadow-2xs ${sizeConfig.text}`}>
          {initials}
        </div>
      )}

      {showEditOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className="h-4 w-4 text-white drop-shadow-sm" />
        </div>
      )}
    </div>
  );

  if (!showName && !showStatus && !showWeddingDate) {
    return avatarElement;
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 ${clickable && onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {avatarElement}
      <div className="min-w-0 flex-1">
        {showName && (
          <p className={`font-medium text-stone-900 truncate ${clickable && onClick ? 'group-hover:text-brand-primary transition-colors' : ''}`}>
            {customer.name}
          </p>
        )}
        {(showStatus || showWeddingDate) && (
          <div className="flex items-center gap-2 text-xs text-stone-500 truncate">
            {showStatus && customer.status && (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                {customer.status}
              </span>
            )}
            {showWeddingDate && customer.weddingDate && (
              <span className="truncate">Wedding: {formatDate(customer.weddingDate)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
