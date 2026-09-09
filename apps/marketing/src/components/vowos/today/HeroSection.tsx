import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassScheduleCard } from './GlassScheduleCard';
import { StateOfDayBar } from './StateOfDayBar';

// 4 curated Unsplash bridal/atelier editorial images.
// Rotated by day-of-year so the image never changes on refresh within a day.
const HERO_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2400&q=85&fm=webp',
    avif: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2400&q=85&fm=avif',
    lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH BwYIDAoMCwsKCwsNCxAQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAACAgJ/8QAIRAAAQMEAgMAAAAAAAAAAAAAAQIDBBEFBiExUWH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Aqex3Jut2y7XW5UYaaq5oCyVKHGEpG6UpHQJFO7Ld7Vt6mHqmkMuLdSAFOO5IHA7DCVKUeAByfAr/9k=',
    photographer: 'Photos by Lanty',
    photographerUrl: 'https://unsplash.com/@photosbylanty',
    alt: 'Soft daylight bridal atelier with gowns on rack',
  },
  {
    url: 'https://images.unsplash.com/photo-1583241475880-083f84372725?auto=format&fit=crop&w=2400&q=85&fm=webp',
    avif: 'https://images.unsplash.com/photo-1583241475880-083f84372725?auto=format&fit=crop&w=2400&q=85&fm=avif',
    lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAACQoI/8QAIBAAAgIDAQADAQAAAAAAAAAAAQIDBAUREiExBv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCq6ZpLY2oLvd9fZqZ1yMIjRSEiCIYIiNEYqxIoS1Yb4uo3c36HuQA01BqJnJqJqIAH/9k=',
    photographer: 'Charisse Kenion',
    photographerUrl: 'https://unsplash.com/@charissek',
    alt: 'Wedding veil detail in soft light',
  },
  {
    url: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?auto=format&fit=crop&w=2400&q=85&fm=webp',
    avif: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?auto=format&fit=crop&w=2400&q=85&fm=avif',
    lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNCxAQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAACQoG/8QAHxAAAgIDAQEBAQAAAAAAAAAAAQIDBAUREiEx/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCm6dp1vqirfNgXWR1yMIjRSEiCIYIiNEYqxIoS1Yb4uo3c36HuQAzVBqJrNqJqIAH/9k=',
    photographer: 'Arisa Chattasa',
    photographerUrl: 'https://unsplash.com/@golfarisa',
    alt: 'Bridal gown close-up in atelier morning light',
  },
  {
    url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=2400&q=85&fm=webp',
    avif: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=2400&q=85&fm=avif',
    lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAACQgH/8QAIBAAAgIDAQEBAQAAAAAAAAAAAQIDBAUREiExBv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCh6pp1rqirfNgXWR1yMIjRSEiCIYIiNEYqxIoS1Yb4uo3c36HuQAy1BqJrNqJqIAH/9k=',
    photographer: 'Everton Vila',
    photographerUrl: 'https://unsplash.com/@evertonvila',
    alt: 'Elegant wedding dress detail with soft drapery',
  },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

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

  const heroImage = HERO_IMAGES[getDayOfYear() % HERO_IMAGES.length];

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
            className={`text-[11px] font-medium tracking-[0.18em] uppercase text-white/70 ${animClass}`}
            style={prefersReducedMotion ? undefined : { animationDelay: '0ms' }}
          >
            {greeting.dateLabel}
          </p>

          {/* Hero greeting */}
          <h1
            className={`font-serif text-white leading-[1.05] ${animClass}`}
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
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
        {' / Unsplash'}
      </div>
    </section>
  );
}
