import React, { useState } from 'react';
import { Star, MessageSquare, Sparkles, Filter, ExternalLink, Send, Mail, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function ReputationCenter() {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      name: 'Sarah Jenkins',
      initials: 'SJ',
      rating: 5,
      time: '2 days ago on Google',
      color: 'bg-indigo-50 text-indigo-700',
      text: "I had the most amazing experience at Magnolia! Jessica was my stylist and she was incredibly patient. She listened to what I wanted and the third dress I tried on was THE ONE. Highly recommend to any bride looking for a stress-free experience.",
      status: 'Needs Reply',
      draft: "Hi Sarah! Thank you so much for the glowing review. We are thrilled to hear that Jessica was able to help you find 'the one'! It was our pleasure to provide a stress-free experience for your big day. Congratulations!"
    }
  ]);
  const [published, setPublished] = useState<number[]>([]);

  const handlePublish = (id: number) => {
    setPublished([...published, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Review & Reputation Center</h1>
          <p className="text-sm text-stone-500 mt-1">
            Monitor and respond to customer reviews across all your physical locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-brand-primary/20">
            <Sparkles className="w-4 h-4" /> Auto-Draft Replies
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-center">
                <p className="text-5xl font-bold text-stone-900 mb-2">4.9</p>
                <div className="flex justify-center gap-1 text-amber-500 mb-2">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-sm text-stone-500">Based on 342 reviews</p>
              </div>
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((rating, idx) => {
                  const counts = [310, 24, 5, 1, 2];
                  const max = 310;
                  const pct = (counts[idx] / max) * 100;
                  return (
                    <div key={rating} className="flex items-center gap-3 text-xs">
                      <div className="w-8 text-stone-600 font-medium flex items-center gap-1 justify-end">{rating} <Star className="w-3 h-3" /></div>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-8 text-stone-500 text-right">{counts[idx]}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-stone-200 shadow-sm mt-6">
            <CardHeader className="pb-3 border-b border-stone-100">
              <CardTitle className="text-sm text-stone-900">Review Automation</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50">
                <div>
                  <h4 className="text-sm font-medium text-stone-900 flex items-center gap-2"><Send className="w-4 h-4 text-emerald-600" /> Post-Sale SMS</h4>
                  <p className="text-xs text-stone-500 mt-1">Send a review request via SMS 1 hour after checkout.</p>
                </div>
                <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50">
                <div>
                  <h4 className="text-sm font-medium text-stone-900 flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /> Post-Pickup Email</h4>
                  <p className="text-xs text-stone-500 mt-1">Send a review request via Email the day after final pickup.</p>
                </div>
                <div className="w-8 h-5 bg-stone-200 rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Review Card 1 */}
          {reviews.map((r) => (
            <Card key={r.id} className={`bg-white shadow-sm relative transition-all duration-500 ${published.includes(r.id) ? 'border-emerald-200 shadow-md' : 'border-brand-primary/20'}`}>
              {!published.includes(r.id) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-brand-primary/20">
                  {r.status}
                </div>
              )}
              {published.includes(r.id) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-50 text-emerald-700 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Replied
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${r.color} flex items-center justify-center font-bold border border-current/20`}>
                      {r.initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-900">{r.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <div className="flex gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-stone-300'}`} />
                          ))}
                        </div>
                        <span>•</span>
                        <span>{r.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {r.text}
                </p>
                
                {!published.includes(r.id) ? (
                  <div className="mt-4 p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> AI Suggested Reply
                      </span>
                    </div>
                    <textarea 
                      className="w-full bg-white border border-brand-primary/20 rounded-lg p-3 text-sm text-stone-700 focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none h-24"
                      defaultValue={r.draft}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <button className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-sm font-semibold transition-colors">
                        Discard
                      </button>
                      <button 
                        onClick={() => handlePublish(r.id)}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        Publish Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pl-4 border-l-2 border-emerald-200 bg-emerald-50/50 p-3 rounded-r-xl">
                    <p className="text-xs text-stone-500 font-semibold mb-1">Response from Owner (Just now)</p>
                    <p className="text-sm text-stone-700">{r.draft}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Review Card 2 */}
          <Card className="bg-white border-stone-200 shadow-sm opacity-70">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
                    MT
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900">Megan Taylor</h4>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <div className="flex gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 text-stone-300" />
                      </div>
                      <span>•</span>
                      <span>1 week ago on Yelp</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed mb-4">
                Beautiful selection of dresses but the store was a bit crowded on Saturday. My stylist was great though!
              </p>
              <div className="pl-4 border-l-2 border-stone-200">
                <p className="text-xs text-stone-500 font-semibold mb-1">Response from Owner (6 days ago)</p>
                <p className="text-sm text-stone-600">
                  Thank you for visiting, Megan! Saturdays are definitely our busiest days. We're so glad you loved the selection and your stylist. We hope to see you again soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
