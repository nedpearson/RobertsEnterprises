import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  Building2,
  Briefcase,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from 'lucide-react';
import { PLANS, type CommercialPlan } from '@/config/commercialCatalog';

const planIcons: Record<CommercialPlan, JSX.Element> = {
  essentials: <Store className="w-9 h-9 text-brand-primary" />,
  growth: <TrendingUp className="w-9 h-9 text-brand-primary" />,
  pro: <Briefcase className="w-9 h-9 text-brand-primary" />,
  enterprise: <Building2 className="w-9 h-9 text-brand-primary" />,
};

const publishedCompetitorCosts = [
  ['Additional Elite store', '$120/mo'],
  ['API access', '$50/mo per enabled location'],
  ['Client Portal', '$110/mo first location; $60/mo additional'],
  ['Reputation Management', '$119/mo'],
  ['Tuxedo Rentals', '$99/mo'],
];

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSelectPlan = (planId: CommercialPlan) => {
    navigate(`/signup?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-brand-primary selection:text-white">
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/" className="text-2xl font-serif text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white text-lg font-bold">V</span>
              VowOS
            </Link>
            <div className="hidden md:flex gap-8 text-sm font-medium text-stone-600">
              <Link to="/#features" className="hover:text-stone-900 transition-colors">Platform</Link>
              <Link to="/pricing" className="text-stone-900">Pricing</Link>
              <Link to="/demo" className="hover:text-stone-900 transition-colors">Interactive Demo</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="hidden sm:inline-flex">Log In</Button>
            <Button onClick={() => navigate('/demo')} className="bg-brand-primary text-white hover:bg-brand-secondary">Explore VowOS</Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="py-20 md:py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto mb-14">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
              <Sparkles className="h-4 w-4" /> Bridal software built as an operating system
            </div>
            <h1 className="text-4xl md:text-6xl font-serif text-stone-900 tracking-tight mb-6">
              Start with the boutique. Scale to the entire organization.
            </h1>
            <p className="text-lg md:text-xl text-stone-600 leading-relaxed mb-9">
              VowOS packages the platform by operating maturity—not by creating a different product for every store. Your organization, brands, locations, customers and history stay on one data model as you grow.
            </p>

            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${!isAnnual ? 'text-stone-900' : 'text-stone-500'}`}>Monthly</span>
              <button
                type="button"
                aria-label="Toggle annual billing"
                className="relative w-14 h-8 rounded-full bg-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors data-[state=checked]:bg-brand-primary"
                data-state={isAnnual ? 'checked' : 'unchecked'}
                onClick={() => setIsAnnual((value) => !value)}
              >
                <span className={`absolute top-1 left-0 bg-white w-6 h-6 rounded-full shadow transition-transform duration-200 ${isAnnual ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? 'text-stone-900' : 'text-stone-500'}`}>
                Annual agreement
                <span className="text-[10px] uppercase tracking-widest bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full font-bold">~20% lower</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {(Object.entries(PLANS) as [CommercialPlan, (typeof PLANS)[CommercialPlan]][]).map(([planId, planDef]) => {
              const isPopular = planId === 'growth';
              const price = isAnnual ? planDef.annual : planDef.monthly;
              return (
                <Card key={planId} className={`relative flex flex-col overflow-visible ${isPopular ? 'border-brand-primary shadow-xl ring-1 ring-brand-primary/20' : 'border-stone-200'}`}>
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-primary text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
                      Best for growing boutiques
                    </div>
                  )}
                  <CardHeader className="pt-8 pb-4">
                    <div className="mb-4">{planIcons[planId]}</div>
                    <CardTitle className="text-2xl font-serif text-stone-900">{planDef.label}</CardTitle>
                    <CardDescription className="text-xs font-semibold text-brand-primary uppercase tracking-wider mt-1">{planDef.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-6">
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-stone-900">${price}</span>
                      <span className="text-stone-500">/mo</span>
                    </div>
                    {isAnnual && <p className="-mt-2 mb-4 text-xs text-stone-400">monthly equivalent, annual agreement</p>}
                    <p className="text-sm text-stone-600 min-h-[72px]">{planDef.description}</p>

                    <div className="my-5 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                      <div className="font-semibold text-stone-800">{planDef.includedUsers === 'unlimited' ? 'Unlimited' : planDef.includedUsers} users</div>
                      <div>{planDef.includedLocations === 'unlimited' ? 'Unlimited locations' : `${planDef.includedLocations} location${planDef.includedLocations === 1 ? '' : 's'}`}</div>
                      <div className="mt-1 text-stone-400">{planDef.includedFeatures.length} catalog capabilities entitled</div>
                    </div>

                    <div className="space-y-3">
                      {planDef.highlights.map((highlight) => (
                        <div key={highlight} className="flex items-start gap-2.5 text-sm text-stone-700">
                          <Check className="w-4 h-4 mt-0.5 text-brand-primary shrink-0" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-7">
                    <Button
                      className={`w-full ${isPopular ? 'bg-brand-primary text-white hover:bg-brand-secondary' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                      size="lg"
                      onClick={() => handleSelectPlan(planId)}
                    >
                      {planId === 'enterprise' ? 'Configure Enterprise' : 'Start with this plan'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-stone-500">
            Public list pricing shown in USD. Payment processing, SMS carrier/provider usage, advertising spend and other third-party services may have separate provider charges. Enterprise and approved add-on agreements may use negotiated effective pricing shown in your VowOS account before billing.
          </p>
        </section>

        <section className="border-y border-stone-200 bg-white py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">Compare total operating cost</div>
                <h2 className="mt-3 text-3xl md:text-4xl font-serif text-stone-900">Compare the whole stack, not only the base subscription.</h2>
                <p className="mt-5 text-base leading-relaxed text-stone-600">
                  BridalLive is an established bridal-specific platform and a useful benchmark. Its public pricing currently lists several capabilities as separate monthly charges. VowOS is being packaged around broader organization-level operating tiers so retailers can see what is entitled, what is optional and what still requires a third-party provider.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 p-5">
                    <ShieldCheck className="h-6 w-6 text-brand-primary" />
                    <h3 className="mt-3 font-semibold text-stone-900">One entitlement model</h3>
                    <p className="mt-2 text-sm text-stone-600">Plan entitlement, platform overrides and organization feature visibility resolve through one canonical subscription path.</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 p-5">
                    <Building2 className="h-6 w-6 text-brand-primary" />
                    <h3 className="mt-3 font-semibold text-stone-900">Organization first</h3>
                    <p className="mt-2 text-sm text-stone-600">A client organization can operate brands and locations without fragmenting the customer and operating model into unrelated systems.</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 p-5">
                    <Sparkles className="h-6 w-6 text-brand-primary" />
                    <h3 className="mt-3 font-semibold text-stone-900">AI on operational context</h3>
                    <p className="mt-2 text-sm text-stone-600">Higher VowOS tiers expose AI and forecasting capabilities against authorized CRM, inventory, workforce and growth context instead of a separate generic assistant.</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 p-5">
                    <TrendingUp className="h-6 w-6 text-brand-primary" />
                    <h3 className="mt-3 font-semibold text-stone-900">Growth connected to revenue</h3>
                    <p className="mt-2 text-sm text-stone-600">Pro and Enterprise connect campaign, attribution, cost-per-lead and reporting capabilities to the same customer and sales model.</p>
                  </div>
                </div>
              </div>

              <Card className="border-stone-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif">BridalLive published add-on reference</CardTitle>
                  <CardDescription>For total-cost comparison only. These are BridalLive's publicly posted prices, not VowOS charges.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                    {publishedCompetitorCosts.map(([label, price]) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="text-stone-600">{label}</span>
                        <span className="text-right font-semibold text-stone-900">{price}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-stone-500">
                    Source: BridalLive public pricing page, reviewed August 2026. BridalLive base-plan pricing is not reproduced here because its current public page does not expose those dollar amounts in the comparison table.
                  </p>
                  <a
                    href="https://www.bridallive.com/pricing"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Verify BridalLive pricing <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 max-w-6xl mx-auto px-6">
          <div className="rounded-2xl bg-stone-900 px-6 py-12 text-center text-white md:px-12">
            <h2 className="text-3xl md:text-4xl font-serif">The plan should fit the operation—not overwhelm the staff.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-stone-300">
              Start with the capabilities your team needs today. Included optional modules can be hidden in organization settings without deleting their data, then turned back on as the business evolves.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="bg-brand-primary text-white px-8" onClick={() => navigate('/demo')}>
                Explore Interactive Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-stone-600 bg-transparent text-white hover:bg-stone-800 hover:text-white" onClick={() => navigate('/signup?plan=growth')}>
                Start with Growth
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-stone-950 text-stone-400 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="text-xl font-serif text-white">VowOS</div>
          <div className="text-xs">© 2026 VowOS. Public pricing and feature availability are subject to the applicable service agreement.</div>
        </div>
      </footer>
    </div>
  );
}
