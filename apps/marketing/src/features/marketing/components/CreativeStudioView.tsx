import { useState } from 'react';
import { MarketingCreative } from '../types/marketingTypes';
import { getMarketingCreatives } from '../api/marketingApi';
import { Image, ShieldAlert, CheckCircle2, Lock, Sparkles, Crop } from 'lucide-react';

export default function CreativeStudioView() {
  const [creatives] = useState<MarketingCreative[]>(getMarketingCreatives());
  const [activeBrandKit, setActiveBrandKit] = useState<'ido' | 'proper'>('ido');

  return (
    <div className="space-y-6 select-none max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Creative Studio &amp; Brand Kits</h2>
        <p className="text-xs text-stone-500">Centralized ad creative management with strict brand identity isolation and bride photo privacy controls.</p>
      </div>

      {/* Bride Photo Privacy Banner */}
      <div className="rounded-2xl border border-status-warning/20 bg-status-warning/10/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900">Bride Photo Marketing Consent Safeguard</h4>
          <p className="text-status-warning leading-relaxed mt-0.5">
            By default, private bride fitting photographs and customer identity images are strictly unavailable to the Creative Studio unless explicit written marketing consent is documented.
          </p>
        </div>
      </div>

      {/* Brand Kit Selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveBrandKit('ido')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeBrandKit === 'ido' ? 'border-brand-primary bg-brand-soft/50 shadow-2xs' : 'border-stone-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">Brand Kit 1</span>
          <h3 className="text-sm font-bold text-stone-900 mt-0.5">I Do Bridal Couture</h3>
          <p className="text-xs text-stone-500 mt-1">Couture bridal gowns, private fitting suites, blush &amp; charcoal tones.</p>
        </button>

        <button
          onClick={() => setActiveBrandKit('proper')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeBrandKit === 'proper' ? 'border-stone-900 bg-stone-900 text-white shadow-2xs' : 'border-stone-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Brand Kit 2</span>
          <h3 className="text-sm font-bold text-white mt-0.5">Proper &amp; Co. Boutique</h3>
          <p className="text-xs text-stone-300 mt-1">Ready-to-wear, accessories, modern footwear &amp; Shopify ecommerce.</p>
        </button>
      </div>

      {/* AI Social Reel Content Studio */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-rose-50/40 to-stone-50 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">AI Social &amp; Reel Content Studio</h3>
              <p className="text-xs text-stone-600">Auto-generate Instagram Reel captions, TikTok scripts, and carousel hashtags mapped to live inventory.</p>
            </div>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">
            {activeBrandKit === 'ido' ? 'I Do Bridal Couture' : 'Proper & Co.'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-900">✨ Instagram Reel: Monique Lhuillier Trunk Show</span>
              <span className="text-[10px] text-stone-400 font-semibold">Ready to post</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-serif italic">
              "Say yes to timeless romance 💍 ✨ Step inside our private Covington boutique fitting suite as we showcase the newest Fall Monique Lhuillier trunk show collection. Limited appointments available this weekend! Link in bio to book your private suite. 💖"
            </p>
            <p className="text-[10px] text-violet-700 font-bold tracking-wide">
              #IDoBridalCouture #MoniqueLhuillier #BatonRougeBride #CovingtonBridal #SayYesToTheDress
            </p>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-900">🎥 TikTok Script: "Find Your Gown Silhouette"</span>
              <span className="text-[10px] text-stone-400 font-semibold">15s Audio Hook</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed font-mono">
              [Hook]: "3 gown silhouettes every Baton Rouge bride needs to try on in 2026..."
              <br />
              [Scene 1]: A-Line Pearl silk gown with cathedral train.
              <br />
              [Scene 2]: Fitted Galia Lahav mermaid silhouette.
              <br />
              [CTA]: "Comment 'GLOW' to get private appointment slots!"
            </p>
            <p className="text-[10px] text-violet-700 font-bold tracking-wide">
              #BridalTikTok #WeddingGownInspo #SouthernBride #BridalBoutique
            </p>
          </div>
        </div>
      </div>

      {/* Creative Assets Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-900 text-sm">Approved Ad Creatives ({creatives.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creatives.map((c) => (
            <div key={c.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-bold uppercase text-[10px] text-stone-700">
                  {c.brand} · Aspect Ratio {c.aspectRatio}
                </span>
                <span className="font-bold text-status-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {c.approvalStatus.toUpperCase()}
                </span>
              </div>

              <div className="flex gap-3">
                <img src={c.mediaAssetUrl} alt={c.name} className="h-24 w-24 rounded-xl object-cover border border-stone-200 flex-shrink-0" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-stone-900">{c.headline}</h4>
                  <p className="text-stone-600 line-clamp-2">{c.primaryText}</p>
                  <p className="text-stone-400 font-semibold">CTA: {c.callToAction}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
