import { Heart, Sparkles } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { formatCents } from '@/data/vowosData';

interface FavoritesGalleryProps {
  wishlist: string[];
  onToggleWishlist: (name: string) => void;
}

export function FavoritesGallery({ wishlist, onToggleWishlist }: FavoritesGalleryProps) {
  const { allGowns } = useVowosData();

  // We take the first 6 gowns for the catalog demonstration
  const catalogGowns = allGowns.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="bg-brand-soft p-4 rounded-xl border border-border-subtle text-xs text-brand-secondary leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="font-bold block text-sm">Pre-Appointment Fitting Rack</span>
          <span>Select gowns &amp; accessories to have pre-pulled in your fitting suite prior to your visit.</span>
        </div>
        <span className="bg-brand-primary-hover text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm shrink-0">
          <Sparkles className="h-4 w-4" /> {wishlist.length} Items Pre-Pulled
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {catalogGowns.map((g) => {
          const isSelected = wishlist.includes(g.id);
          return (
            <div key={g.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between group">
              <div className="relative h-64 w-full overflow-hidden">
                <img 
                  src={g.image} 
                  alt={g.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => onToggleWishlist(g.id)}
                    className="p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${isSelected ? 'fill-rose-500 text-brand-primary' : 'text-stone-400'}`} />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 line-clamp-1" title={g.name}>{g.name}</h4>
                  <p className="text-xs text-stone-500 font-mono mt-1">{g.style} · {formatCents(g.priceCents)}</p>
                </div>

                <button
                  onClick={() => onToggleWishlist(g.id)}
                  className={`w-full rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary-hover text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {isSelected ? 'In Fitting Rack' : 'Add to Fitting Rack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
