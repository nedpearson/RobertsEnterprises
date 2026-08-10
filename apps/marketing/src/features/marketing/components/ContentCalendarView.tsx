import { useState } from 'react';
import { MarketingContentPost } from '../types/marketingTypes';
import { getMarketingContentPosts, createContentPost } from '../api/marketingApi';
import { Calendar as CalendarIcon, Plus, CheckCircle2, Instagram, Facebook, Video, Pin } from 'lucide-react';
import { Modal, btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { toast } from '@vowos/design-system';

export default function ContentCalendarView() {
  const [posts, setPosts] = useState<MarketingContentPost[]>(getMarketingContentPosts());
  const [showNewModal, setShowNewModal] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [providerInput, setProviderInput] = useState<'meta' | 'tiktok' | 'pinterest'>('meta');

  const handleCreatePost = () => {
    if (!captionInput.trim()) return;
    createContentPost({ caption: captionInput, provider: providerInput });
    setPosts(getMarketingContentPosts());
    setShowNewModal(false);
    setCaptionInput('');
    toast({ title: 'Post Scheduled!', description: 'Social content post added to calendar.' });
  };

  return (
    <div className="space-y-5 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Social Content Calendar</h2>
          <p className="text-xs text-stone-500">Plan, schedule, and preview organic posts across Instagram, Facebook, TikTok &amp; Pinterest.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Schedule New Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-bold uppercase text-[10px] text-stone-700">
                {p.brand} · {p.provider}
              </span>
              <span className="font-bold text-status-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Scheduled for {new Date(p.scheduledAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex gap-3">
              <img src={p.mediaUrl} alt="Post media" className="h-20 w-20 rounded-xl object-cover border border-stone-200 flex-shrink-0" />
              <p className="text-xs text-stone-700 leading-relaxed line-clamp-3">{p.caption}</p>
            </div>
          </div>
        ))}
      </div>

      {showNewModal && (
        <Modal open={true} onClose={() => setShowNewModal(false)} title="Schedule New Organic Social Post">
          <div className="space-y-4 max-w-md select-none">
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-stone-700">Platform</label>
              <select
                value={providerInput}
                onChange={(e) => setProviderInput(e.target.value as any)}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 font-bold text-stone-900 focus:outline-none"
              >
                <option value="meta">Meta (Instagram / Facebook)</option>
                <option value="tiktok">TikTok</option>
                <option value="pinterest">Pinterest</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-stone-700">Post Caption &amp; Hashtags</label>
              <textarea
                rows={4}
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="Write your post caption..."
                className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs font-medium text-stone-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNewModal(false)} className={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleCreatePost} className={btnPrimary}>
                Schedule Post
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
