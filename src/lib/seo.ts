import { useEffect } from 'react';

// Canonical origin: change here (and in index.html, robots.txt, sitemap.xml) if the live domain differs.
export const SITE = {
  name: 'Nivaro',
  legalName: 'Nivaro / CLR Services',
  url: 'https://nivaro.in',
  phone: '+919491242781',
  phoneDisplay: '+91 94912 42781',
  email: 'contact@nivaro.in',
  city: 'Chirala',
  region: 'Andhra Pradesh',
  country: 'IN',
  logoPath: '/brand/nivaro-logo.png',
  iconPath: '/brand/nivaro-icon-512.png',
  opens: '08:00',
  closes: '19:30',
} as const;

export const SERVICE_AREAS = [
  'Paparajuthota',
  'Perala',
  'Kothapeta',
  'Srinivas Colony',
  'Vadarevu',
] as const;

const SERVICES = [
  {
    id: 'electrical-repairs',
    name: 'Electrical Repairs',
    serviceType: 'Electrician',
    description:
      'Electrician in Chirala for switchboards, sockets, MCB breakers, ceiling fans, lighting, wiring faults and appliance connections.',
  },
  {
    id: 'plumbing-repairs',
    name: 'Plumbing Repairs',
    serviceType: 'Plumber',
    description:
      'Plumber in Chirala for leaking taps, mixers, pipe joints, supply line leaks, blocked drains, sink clearance and overhead tank fittings.',
  },
] as const;

export interface SeoInput {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

const absolute = (path: string) => new URL(path, SITE.url).href;

const businessId = `${SITE.url}/#business`;

export function businessLd(): Record<string, unknown> {
  return {
    '@type': 'HomeAndConstructionBusiness',
    '@id': businessId,
    name: SITE.name,
    alternateName: SITE.legalName,
    url: `${SITE.url}/`,
    logo: absolute(SITE.logoPath),
    image: absolute(SITE.logoPath),
    telephone: SITE.phone,
    email: SITE.email,
    description:
      'Nivaro connects households in Chirala, Andhra Pradesh with approved local electricians and plumbers for electrical and plumbing repairs, with an on-site quote before work begins.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    areaServed: [
      { '@type': 'City', name: SITE.city },
      ...SERVICE_AREAS.map((area) => ({ '@type': 'Place', name: `${area}, Chirala` })),
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: SITE.opens,
        closes: SITE.closes,
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Home repair services in Chirala',
      itemListElement: SERVICES.map((service) => ({
        '@type': 'Offer',
        itemOffered: { '@id': `${SITE.url}/services#${service.id}` },
      })),
    },
  };
}

export function serviceLd(): Record<string, unknown>[] {
  return SERVICES.map((service) => ({
    '@type': 'Service',
    '@id': `${SITE.url}/services#${service.id}`,
    name: `${service.name} in Chirala`,
    serviceType: service.serviceType,
    description: service.description,
    provider: { '@id': businessId },
    areaServed: { '@type': 'City', name: SITE.city },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${SITE.url}/services`,
      servicePhone: SITE.phone,
    },
  }));
}

export function websiteLd(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: `${SITE.url}/`,
    name: SITE.name,
    inLanguage: 'en-IN',
    publisher: { '@id': businessId },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function faqLd(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applySeo(seo: SeoInput) {
  const url = absolute(seo.path);
  document.title = seo.title;
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:url', url);
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

  if (seo.description) {
    upsertMeta('name', 'description', seo.description);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('name', 'twitter:description', seo.description);
  }

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  document.head.querySelectorAll('script[data-seo-route]').forEach((el) => el.remove());
  if (seo.jsonLd?.length) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoRoute = 'true';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': seo.jsonLd });
    document.head.appendChild(script);
  }
}

/** Applies route metadata + JSON-LD. Pass null when the page owns its own metadata. */
export function useSeo(seo: SeoInput | null): void {
  const serialized = JSON.stringify(seo);
  useEffect(() => {
    const next: SeoInput | null = JSON.parse(serialized);
    if (next) applySeo(next);
  }, [serialized]);
}
