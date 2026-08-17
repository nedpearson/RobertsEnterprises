import React from 'react';
import { Star, MessageSquare, Sparkles, Filter, ExternalLink, Send, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';

export function ReputationCenter() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Review & Reputation Center</h1>
          <p className="text-sm text-stone-400 mt-1">
            Monitor and respond to customer reviews across all your physical locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Auto-Draft Replies
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-[#1c1a1f] border-white/5">
            <CardContent className="p-5">
              <div className="text-center">
                <p className="text-5xl font-bold text-white mb-2">4.9</p>
                <div className="flex justify-center gap-1 text-amber-400 mb-2">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-sm text-stone-400">Based on 342 reviews</p>
              </div>
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((rating, idx) => {
                  const counts = [310, 24, 5, 1, 2];
                  const max = 310;
                  const pct = (counts[idx] / max) * 100;
                  return (
                    <div key={rating} className="flex items-center gap-3 text-xs">
                      <div className="w-8 text-stone-400 font-medium flex items-center gap-1 justify-end">{rating} <Star className="w-3 h-3" /></div>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-8 text-stone-500 text-right">{counts[idx]}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1c1a1f] border-white/5 mt-6">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm">Review Automation</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white flex items-center gap-2"><Send className="w-4 h-4 text-emerald-400" /> Post-Sale SMS</h4>
                  <p className="text-xs text-stone-400 mt-1">Send a review request via SMS 1 hour after checkout.</p>
                </div>
                <div className="w-8 h-5 bg-brand-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> Post-Pickup Email</h4>
                  <p className="text-xs text-stone-400 mt-1">Send a review request via Email the day after final pickup.</p>
                </div>
                <div className="w-8 h-5 bg-white/10 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-stone-400 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Review Card 1 */}
          <Card className="bg-[#1c1a1f] border-brand-primary/20 relative">
            <div className="absolute top-0 right-0 px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-brand-primary/20">
              Needs Reply
            </div>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    SJ
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Sarah Jenkins</h4>
                    <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                      <div className="flex gap-0.5 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      <span>•</span>
                      <span>2 days ago on Google</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed">
                I had the most amazing experience at Magnolia! Jessica was my stylist and she was incredibly patient. She listened to what I wanted and the third dress I tried on was THE ONE. Highly recommend to any bride looking for a stress-free experience.
              </p>
              
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> AI Suggested Reply
                  </span>
                </div>
                <textarea 
                  className="w-full bg-transparent border-0 text-sm text-stone-300 p-0 focus:ring-0 resize-none h-16"
                  defaultValue="Hi Sarah! Thank you so much for the glowing review. We are thrilled to hear that Jessica was able to help you find 'the one'! It was our pleasure to provide a stress-free experience for your big day. Congratulations!"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 rounded text-xs font-semibold transition-colors">
                    Discard
                  </button>
                  <button className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded text-xs font-semibold transition-colors">
                    Publish Reply
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Card 2 */}
          <Card className="bg-[#1c1a1f] border-white/5 opacity-70">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    MT
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Megan Taylor</h4>
                    <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                      <div className="flex gap-0.5 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 text-stone-600" />
                      </div>
                      <span>•</span>
                      <span>1 week ago on Yelp</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-stone-300 leading-relaxed mb-4">
                Beautiful selection of dresses but the store was a bit crowded on Saturday. My stylist was great though!
              </p>
              <div className="pl-4 border-l-2 border-white/10">
                <p className="text-xs text-stone-500 font-semibold mb-1">Response from Owner (6 days ago)</p>
                <p className="text-sm text-stone-400">
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
