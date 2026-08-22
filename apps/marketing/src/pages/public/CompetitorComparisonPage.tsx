import { useEffect } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ExternalLink,
  Link as LinkIcon,
  MessageSquareText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const comparisonRows = [
  {
    icon: <Building2 className="w-4 h-4 text-blue-400" />,
    title: 'Multi-location operating model',
    question: 'How does the system scale when one client runs multiple locations or brands?',
    bridalLive: 'Elite publicly includes two store locations; BridalLive lists additional stores at $120/month.',
    vowos: 'VowOS models the client as an organization with governed brands, locations, memberships, subscriptions and feature entitlements beneath it.',
  },
  {
    icon: <Target className="w-4 h-4 text-emerald-400" />,
    title: 'Marketing → revenue attribution',
    question: 'Can growth data connect back to the customer and sale?',
    bridalLive: 'BridalLive documents marketing/eCommerce integrations including analytics and pixel tooling. Exact attribution depth depends on the configured products and services.',
    vowos: 'VowOS Pro/Enterprise catalog capabilities include leads, campaigns, Google/Meta data, attribution and cost-per-lead against the same customer and sales model.',
  },
  {
    icon: <MessageSquareText className="w-4 h-4 text-amber-400" />,
    title: 'Customer communication & automation',
    question: 'Can the staff automate follow-up without losing the conversation history?',
    bridalLive: 'Smart Flows automate email, SMS, tasks and customer categories; two-way texting is listed in the software plan matrix.',
    vowos: 'VowOS combines customer follow-up features with a two-way SMS worker, consent checks, inbound webhook idempotency and organization-scoped communication history.',
  },
  {
    icon: <ShoppingBag className="w-4 h-4 text-violet-400" />,
    title: 'Commerce & inventory',
    question: 'Can online and store operations share inventory context?',
    bridalLive: 'BridalLive offers an eCommerce product that synchronizes inventory, orders and customer records with BridalLive.',
    vowos: 'VowOS Pro includes Shopify entitlement alongside inventory, purchasing, transfers and organization/location controls so connected-commerce data stays in the operating model.',
  },
  {
    icon: <LinkIcon className="w-4 h-4 text-cyan-400" />,
    title: 'API & extensibility',
    question: 'What happens when the retailer needs a custom integration?',
    bridalLive: 'BridalLive API access is available on Elite, requires approval/testing and is publicly listed at $50/month per enabled location.',
    vowos: 'VowOS Enterprise includes a developer-API entitlement in the public plan catalog, with tenant authorization and integration-health controls designed into the platform layer.',
  },
  {
    icon: <Workflow className="w-4 h-4 text-orange-400" />,
    title: 'Accounting integration model',
    question: 'How should accounting stay in sync with bridal retail operations?',
    bridalLive: 'BridalLive documents a one-way QuickBooks export of summarized accounting entries rather than individual transaction sync.',
    vowos: 'VowOS has an accounting-integration entitlement in Pro. Connector availability is surfaced during onboarding; VowOS does not claim two-way QuickBooks support until that connector is production-certified.',
  },
  {
    icon: <Sparkles className="w-4 h-4 text-rose-400" />,
    title: 'AI & operational intelligence',
    question: 'Is AI separate from the operating data or governed as a platform capability?',
    bridalLive: 'BridalLive continues to expand its operating workflows; its public pricing page is centered on retail modules and add-ons.',
    vowos: 'VowOS has plan-governed AI advisor, forecasting and insight capabilities designed to use authorized CRM, inventory, workforce and growth context. Beta capabilities are labeled rather than represented as universally available.',
  },
];

const publishedFees = [
  ['Additional Elite store', '$120/mo'],
  ['API access', '$50/mo/location'],
  ['Client Portal', '$110 first location; $60 additional'],
  ['Reputation Management', '$119/mo'],
  ['Tuxedo Rentals', '$99/mo'],
];

export function CompetitorComparisonPage() {
  const navigate = useNavigate();

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
              <span className="block text-[9px] uppercase tracking-[0.18em] text-stone-500">Platform comparison</span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/pricing')} className="hidden sm:block rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              Pricing
            </button>
            <button onClick={() => navigate('/demo')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#080B12] transition-transform hover:scale-105">
              Explore Demo
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-rose-500/15 rounded-full blur-[140px] pointer-events-none" />

        <section className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-rose-300 mb-8">
            <BarChart3 className="w-4 h-4" /> VowOS vs BridalLive · reviewed August 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-[1.02] mb-6">
            Respect the category leader.<br />Build for what bridal retail becomes next.
          </h1>
          <p className="text-lg md:text-xl text-stone-400 max-w-3xl mx-auto leading-relaxed">
            BridalLive is an established bridal-specific operating platform. VowOS is being built around a broader organization, brand and location architecture with native entitlement controls, connected growth data and AI-ready operations. This comparison uses public BridalLive documentation and deliberately avoids invented base prices or unsupported claims.
          </p>
        </section>

        <section className="max-w-7xl mx-auto px-6 mt-16 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="hidden md:grid md:grid-cols-3 bg-[#0c101a] border-b border-white/10">
              <div className="p-7"><h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Capability</h3></div>
              <div className="p-7 border-l border-white/5 bg-[#141a29]"><h3 className="text-xl font-bold text-stone-300 text-center">BridalLive</h3></div>
              <div className="p-7 border-l border-white/5 bg-gradient-to-b from-rose-900/35 to-[#141a29]"><h3 className="text-xl font-bold text-white text-center">VowOS direction & current architecture</h3></div>
            </div>

            <div className="divide-y divide-white/5">
              {comparisonRows.map((row) => (
                <div key={row.title} className="grid grid-cols-1 md:grid-cols-3 hover:bg-white/[0.02] transition-colors">
                  <div className="p-6 md:p-7">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ring-1 ring-white/5">{row.icon}</div>
                      <h4 className="font-semibold text-white text-base">{row.title}</h4>
                    </div>
                    <p className="text-sm text-stone-500">{row.question}</p>
                  </div>
                  <div className="p-6 md:p-7 border-t md:border-t-0 md:border-l border-white/5 bg-[#141a29]/50">
                    <div className="md:hidden mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">BridalLive</div>
                    <p className="text-sm leading-relaxed text-stone-400">{row.bridalLive}</p>
                  </div>
                  <div className="p-6 md:p-7 border-t md:border-t-0 md:border-l border-white/5 bg-gradient-to-r from-rose-500/5 to-transparent">
                    <div className="md:hidden mb-2 text-[10px] font-bold uppercase tracking-widest text-rose-300">VowOS</div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <p className="text-sm leading-relaxed text-stone-300">{row.vowos}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 mt-14 relative z-10 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#111622] p-8">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Published BridalLive add-on reference</div>
            <div className="mt-5 divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
              {publishedFees.map(([label, price]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-3.5 text-sm">
                  <span className="text-stone-400">{label}</span>
                  <span className="text-right font-semibold text-white">{price}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              These are competitor charges copied from BridalLive's public pricing page for comparison. VowOS does not reproduce a BridalLive base subscription price because the current public comparison table does not show one.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
              <ShieldCheck className="h-4 w-4" /> Source-backed comparison
            </div>
            <h2 className="mt-3 text-3xl font-serif font-bold text-white">Verify the competitor facts yourself.</h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Product comparisons age quickly. We link directly to the public sources used here so a retailer can inspect BridalLive's latest pricing, API rules and QuickBooks integration model instead of relying on a sales-page caricature.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['Pricing & add-ons', 'https://www.bridallive.com/pricing'],
                ['API FAQ', 'https://help.bridallive.com/hc/en-us/articles/31075841322772-BridalLive-API-FAQ'],
                ['QuickBooks overview', 'https://help.bridallive.com/hc/en-us/articles/46868724506388-BridalLive-QuickBooks-Integration-Overview'],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10">
                  {label}<ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 text-center max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-5">Evaluate VowOS on the workflows that matter.</h2>
          <p className="text-stone-400 mb-8">
            Use the interactive demo, then compare appointment intake, customer history, inventory, sales, reporting, feature controls and multi-location administration against the system you use today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/demo')} className="w-full sm:w-auto rounded-full bg-rose-500 px-8 py-4 text-sm font-bold text-white hover:bg-rose-600">Explore Interactive Demo</button>
            <button onClick={() => navigate('/pricing')} className="w-full sm:w-auto rounded-full border border-white/20 bg-transparent px-8 py-4 text-sm font-bold text-white hover:bg-white/5">See VowOS Pricing</button>
          </div>
        </section>
      </main>
    </div>
  );
}
