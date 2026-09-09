import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassScheduleCard } from './GlassScheduleCard';
import { StateOfDayBar } from './StateOfDayBar';

import { HERO_IMAGE } from '@/data/vowosData';

const currentHeroImage = {
  url: HERO_IMAGE,
  avif: HERO_IMAGE, // We'll just use the same URL if AVIF isn't explicitly provided
  lqip: '', 
  photographer: 'VowOS',
  photographerUrl: '#',
  alt: 'Bridal atelier',
};

function getGreeting(firstName?: string, timezone?: string): { text: string; timeLabel: string; dateLabel: string } {
  const now = timezone
    ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    : new Date();
  const hour = now.getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = firstName ? `, ${firstName}` : '';
  const text = `${salutation}${name}`;
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { text, timeLabel, dateLabel };
}

interface HeroSectionProps {
  businessId?: string;
  locationId: string | 'all';
}

export function HeroSection({ businessId, locationId }: HeroSectionProps) {
  const { profile, tenant } = useAuth();
  const firstName = profile?.name?.split(' ')[0];
  const timezone = (tenant as any)?.timezone || undefined;

  const heroImage = currentHeroImage;

  // Tick the greeting every minute so the time-of-day salutation stays fresh
  const [greeting, setGreeting] = useState(() => getGreeting(firstName, timezone));
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting(firstName, timezone)), 60_000);
    return () => clearInterval(id);
  }, [firstName, timezone]);

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animClass = prefersReducedMotion ? '' : 'animate-hero-rise';

  return (
    <section
      data-tour-id="hero-banner"
      className="relative w-full overflow-hidden"
      style={{
        // Mobile gets a shorter hero so the alerts and KPIs are reachable
        // without scrolling past a full screen of photograph.
        height: 'clamp(230px, 42vh, 520px)',
        backgroundColor: '#241a20',
        backgroundImage: `url(${heroImage.lqip})`,
        backgroundSize: 'cover',
        backgroundPosition: '33% center',
      }}
      aria-label="Today dashboard hero"
    >
      {/* Background image */}
      <picture>
        <source srcSet={heroImage.avif} type="image/avif" />
        <img
          src={heroImage.url}
          alt={heroImage.alt}
          loading="eager"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: '33% center',
          }}
          // LQIP inline background while loading
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </picture>

      {/* LQIP is painted as the section's own background (see style on <section>),
          so the real image composites OVER it instead of being covered by it. */}

      {/* Directional scrim for legibility */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--vowos-hero-scrim)', zIndex: 1 }}
        aria-hidden="true"
      />

      {/* Bottom dissolve into page background */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'var(--vowos-hero-bottom-fade)', zIndex: 2 }}
        aria-hidden="true"
      />

      {/* Content layer */}
      <div
        className="relative h-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 px-6 md:px-10 pt-8 pb-10"
        style={{ zIndex: 3 }}
      >
        {/* LEFT: greeting + date + state of day */}
        <div className="flex flex-col gap-3 max-w-xl">
          {/* Date line */}
          <p
            className={`text-xs md:text-sm font-semibold tracking-[0.15em] uppercase text-white/80 ${animClass}`}
            style={prefersReducedMotion ? undefined : { animationDelay: '0ms' }}
          >
            {greeting.dateLabel}
          </p>

          {/* Hero greeting */}
          <h1
            className={`font-serif text-white leading-[1.05] ${animClass}`}
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              animationDelay: prefersReducedMotion ? undefined : '60ms',
            }}
          >
            {greeting.text}
          </h1>

          {/* State of day */}
          <div
            className={animClass}
            style={prefersReducedMotion ? undefined : { animationDelay: '120ms' }}
          >
            <StateOfDayBar businessId={businessId} locationId={locationId} />
          </div>
        </div>

        {/* RIGHT: glass schedule card */}
        <div
          className={`w-full lg:w-80 xl:w-96 shrink-0 ${animClass}`}
          style={prefersReducedMotion ? undefined : { animationDelay: '180ms' }}
        >
          <GlassScheduleCard businessId={businessId} locationId={locationId} />
        </div>
      </div>

      {/* Photo credit (WCAG: decorative, so aria-hidden) */}
      {heroImage.photographer !== 'VowOS' && (
        <div
          className="absolute bottom-3 right-4 text-[10px] text-white/50 z-10"
          aria-hidden="true"
        >
          Photo:{' '}
          <a
            href={heroImage.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/80 transition-colors"
            tabIndex={-1}
          >
            {heroImage.photographer}
          </a>
        </div>
      )}
    </section>
  );
}
