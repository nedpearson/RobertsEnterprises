import { useEffect, useState } from 'react';
import { Building2, Check, ExternalLink, ShieldCheck, Sparkles, Store, TrendingUp, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MotionFadeIn, MotionHoverCard, MotionStaggerContainer } from '@/components/motion/MotionWrapper';
import { PLAN_ORDER, PLANS, VOWOS_CATALOG, type CommercialPlan } from '@/config/commercialCatalog';

const competitorReference = [
  ['Additional Elite store', '$120/mo'],
  ['API access', '$50/mo per enabled location'],
  ['Client Portal', '$110/mo first location; $60/mo additional'],
  ['Reputation Management', '$119/mo'],
  ['Tuxedo Rentals', '$99/mo'],
];

const planIcon = (plan: CommercialPlan) => {
  if (plan === 'essentials') return <Store className="h-6 w-6" />;
  if (plan === 'growth') return <TrendingUp className="h-6 w-6" />;
  if (plan === 'pro') return <Workflow className="h-6 w-6" />;
  return <Building2 className="h-6 w-6" />;
};

export function PricingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B12] text-stone-300 font-sans selection:bg-rose-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080B12]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-900/30 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block font-serif text-xl font-bold text-white tracking-tight">VowOS</span>
              <span className="block text-[9px] uppercase tracking-[0.18em] text-stone-500">Bridal Retail OS</span>
            </div>
          </a>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/compare')}
              className="hidden md:flex rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Compare Platforms
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#080B12] transition-transform hover:scale-105"
            >
              Explore Demo
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute top-0 inset-x-0 h-[650px] bg-gradient-to-b from-rose-500/10 via-violet-500/5 to-transparent pointer-events-none"
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <MotionFadeIn className="text-center max-w-4xl mx-auto mb-16">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
              One price book · one entitlement engine · one organization model
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-[1.02]">
              Bridal software that grows into an operating system.
            </h1>
            <p className="text-lg md:text-xl text-stone-400 mb-10 leading-relaxed">
              Start with appointments, CRM, sales and inventory. Add automation, ecommerce, attribution, AI and portfolio controls without migrating your organization to another product.
            </p>

            <div className="inline-flex items-center rounded-full border border-white/10 bg-[#141a29] p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${!annual ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${annual ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-white'}`}
              >
                Annual
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">~20% lower</span>
              </button>
            </div>
          </MotionFadeIn>

          <MotionStaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const price = annual ? plan.annual : plan.monthly;
              const highlight = planId === 'growth';
              return (
                <MotionHoverCard
                  key={planId}
                  className={`relative rounded-3xl p-7 flex flex-col ${
                    highlight
                      ? 'bg-gradient-to-b from-[#1a1525] to-[#0c0f1a] border-2 border-rose-500/50 shadow-2xl shadow-rose-900/20 xl:-translate-y-3'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg whitespace-nowrap">
                      Best for growing boutiques
                    </div>
                  )}

                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-rose-300 ring-1 ring-white/10">
                    {planIcon(planId)}
                  </div>
                  <h3 className="text-2xl font-bold text-white">{plan.label}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-rose-300">{plan.tagline}</p>
                  <p className="mt-4 text-sm leading-relaxed text-stone-400 min-h-[84px]">{plan.description}</p>

                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">${price}</span>
                      <span className="text-stone-500">/mo</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">{annual ? 'monthly equivalent, annual agreement' : 'month-to-month list price'}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-stone-400">
                    <div className="font-semibold text-white">{plan.includedUsers === 'unlimited' ? 'Unlimited' : plan.includedUsers} users</div>
                    <div>{plan.includedLocations === 'unlimited' ? 'Unlimited locations' : `${plan.includedLocations} location${plan.includedLocations === 1 ? '' : 's'}`}</div>
                    <div className="mt-1 text-stone-500">{plan.includedFeatures.length} entitled catalog capabilities</div>
                  </div>

                  <button
                    onClick={() => navigate(`/signup?plan=${planId}&billing=${annual ? 'annual' : 'monthly'}`)}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all my-6 ${
                      highlight
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    {planId === 'enterprise' ? 'Configure Enterprise' : 'Start with this plan'}
                  </button>

                  <div className="flex-1 space-y-3">
                    {plan.highlights.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-sm text-stone-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </MotionHoverCard>
              );
            })}
          </MotionStaggerContainer>

          <MotionFadeIn delay={0.25} className="mt-20 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 md:p-10">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">Why VowOS is structured differently</div>
              <h2 className="mt-3 text-3xl font-serif font-bold text-white">A client is an organization—not a pile of disconnected store accounts.</h2>
              <p className="mt-4 text-stone-400 leading-relaxed">
                VowOS keeps organization, brands, locations, users, customers, inventory, transactions, growth data and integrations in one governed hierarchy. Higher tiers unlock more capability against the same operating model instead of forcing a re-platform later.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Canonical entitlements', 'Billing, platform overrides and tenant feature visibility resolve through the same subscription path.'],
                  ['Connected growth', 'Pro and Enterprise connect advertising, attribution and cost-per-lead capabilities to customer and sales data.'],
                  ['Omnichannel operations', 'Shopify entitlement, inventory, purchasing and multi-location reporting share the same tenant context.'],
                  ['AI with boundaries', 'AI capabilities are plan-controlled and operate on authorized organization context rather than inventing business metrics.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/10 p-5">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <h3 className="mt-3 font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-400">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#111622] p-8 md:p-10">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Published competitor reference</div>
              <h2 className="mt-3 text-2xl font-serif font-bold text-white">Compare total operating cost, not only the base plan.</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                BridalLive is an established bridal-specific platform and a useful benchmark. Its public pricing page currently lists these items separately. They are shown only to make total-cost comparisons easier.
              </p>

              <div className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {competitorReference.map(([label, price]) => (
                  <div key={label} className="flex items-center justify-between gap-4 bg-white/[0.025] px-4 py-3.5 text-sm">
                    <span className="text-stone-400">{label}</span>
                    <span className="text-right font-semibold text-white">{price}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-stone-500">
                Source: BridalLive public pricing page, reviewed August 2026. Its current public comparison table does not display base-plan dollar amounts, so VowOS does not manufacture them here.
              </p>
              <a
                href="https://www.bridallive.com/pricing"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200"
              >
                Verify BridalLive pricing <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </MotionFadeIn>

          <MotionFadeIn delay={0.35} className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-blue-500/10 p-8 text-center md:p-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Configure the software around the team—not the other way around.</h2>
            <p className="mx-auto mt-4 max-w-3xl text-stone-400">
              Every plan has a governed feature catalog. Included optional capabilities can be hidden from daily navigation without deleting data, while higher-tier features remain locked until the organization upgrades or receives an approved entitlement.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={() => navigate('/demo')} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[#080B12] hover:bg-stone-100">Explore the live demo</button>
              <button onClick={() => navigate('/compare')} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">See competitor comparison</button>
            </div>
          </MotionFadeIn>

          <p className="mx-auto mt-10 max-w-4xl text-center text-xs leading-relaxed text-stone-500">
            VowOS prices are public list prices in USD. Payment processing, carrier/SMS usage, advertising spend and other third-party provider charges are separate when applicable. Contracted Enterprise or approved add-on pricing is stored as the organization's effective price and shown before billing.
          </p>
        </div>
      </main>
    </div>
  );
}
