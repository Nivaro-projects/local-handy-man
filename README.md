# Nivaro — Home Services, Made Simple

A modern, responsive, high-performance web application for **Nivaro**, connecting households across Chirala, Andhra Pradesh with skilled, dependable electricians and plumbers.

## 🛠️ Tech Stack & Features

- **Runtime & Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS with custom **Walnut Brown, Sage Green & Amber Glow** palette:
  - Deep Walnut: `#4A251D` (headings, brand accents, footer)
  - Medium Walnut: `#63362B` (hover accents)
  - Sage Green: `#5F7D6B` (badges, icons, section accents)
  - Soft Sage Tint: `#EEF3EF` (card highlights, surfaces)
  - Amber Glow: `#E59838` / `#D97706` (primary CTAs, focus rings)
  - Warm Cream: `#FDF6E4` (banner surfaces, logo framing)
- **Responsive & Mobile-First**:
  - `overflow-x: hidden` enforced on `html`, `body`, and `#root` with 0 horizontal scroll at 320px, 375px, 768px, and 1280px.
  - Smooth mobile navigation drawer with touch targets &ge; 44px.
  - Clickable phone links (`tel:+919491242781`) and email (`mailto:contact@nivaro.in`).
- **Complete Branding & Assets**:
  - Official emblem logo (`/logo.png`) integrated in sticky header and footer with smooth back-to-top scroll.
  - Favicon and Apple Touch icons configured in `index.html`.
- **Booking Flow & Success States**:
  - Form validation for service categories, Chirala neighborhoods, issue descriptions (&ge;10 chars), and future dates.
  - Polished Success Banner with generated reference ID (e.g. `LH-2026-XXXX`) and dismissible toast notification.
- **Error Handling & 404**:
  - Dedicated `NotFound` (404) page with brand logo, helpful messaging, and home navigation.
  - `ErrorBoundary` component to gracefully catch unexpected runtime errors with reload controls.
- **SEO & Performance**:
  - Dynamic page title, meta description, and OpenGraph tags.
  - Compressed WebP Unsplash images with explicit `width` & `height` attributes to prevent CLS.

## 🚀 Running the Project

```bash
# Start Vite development server
npm run dev

# Run TypeScript compilation and production build
npm run build

# Preview production build
npm run preview
```
