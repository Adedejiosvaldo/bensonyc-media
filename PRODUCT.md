# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Church website:** prospective visitors, youth members, and families looking for service information, first-visit guidance, church events, and updates.
- **Media website:** current MFM Benson Youth Church media-unit members and people considering serving. Prospective members need a public introduction and a route to join; members use authenticated tools for departments, onboarding, rosters, availability, content planning, publishing, and insights.

## Product Purpose

The project serves two separate websites for MFM Benson Youth Church: a public church site and a public media-unit site with a distinct authenticated workspace. The church site helps people understand the church and plan a visit. The media site introduces the media departments and routes recruits and members into the appropriate onboarding or workspace flow.

Success means a church visitor can understand when and where to attend and what to expect, while a media recruit can understand the teams and next step without confusing those tasks with church information. Existing public content lists Sunday service at 8:00am, but its time and the full street address are marked unconfirmed in `content/church.ts`.

## Positioning

These are separate products with different audiences, purposes, and visual identities—not one combined church-and-media homepage. The media site supports the work that carries church services and stories beyond Sunday; the church site serves visitors and the congregation. Cross-links may connect them, but should make the destination clear.

## Operating Context

- The church experience is available at `/church`; middleware can serve it at the root of a configured `CHURCH_HOST` domain.
- The media public landing page is rooted at `/`; member operations live in authenticated routes such as `/home`, `/roster`, `/availability`, `/content`, `/departments`, `/onboarding`, `/social`, and `/insights`.
- Both experiences are currently implemented in one Next.js project and can be served through separate domains using host configuration.
- Public church data is maintained in `content/church.ts`; department and media-team guidance is maintained in `content/departments.ts` and `content/brand.ts`.

## Capabilities and Constraints

- Preserve the existing Next.js, Supabase, and Vercel implementation and its authentication, roster, content-planning, social-publishing, and calendar behavior.
- Keep church and media public experiences visually distinct and audience-specific.
- Use existing confirmed copy, facts, and integrations. Do not invent church addresses, service details, testimonials, membership counts, or photographs.
- The full street address, service time, and start/end times remain unconfirmed in the source.
- Exact production domain names are open; existing routing supports a configured church host.

## Brand Commitments

- Church name: MFM Benson Youth Church. Parent organization: Mountain of Fire and Miracles Ministries. Motto: “Citadel of Greatness.”
- Media brand: Benson YC Media / MFM Benson Youth Church Media Unit.
- The existing logo is at `public/logo.png`; brand colors and media-asset guidance are documented in `content/brand.ts`.
- The user explicitly requires separate looks for the church and media sites. Do not blend them into one shared landing-page identity.

## Evidence on Hand

- Existing copy and service information in `content/church.ts` (some key logistics are explicitly unconfirmed).
- Department roles and operating practices in `content/departments.ts`.
- Media graphics rules and content series in `content/brand.ts`.
- One logo asset: `public/logo.png` (the README notes that the current image is only 96px).
- No church/service/member photography or approved testimonials are present in `public/`; do not fabricate them.

## Product Principles

1. Keep the church visitor journey and media-team journey distinct and easy to identify.
2. Make real visitor logistics easy to find and never imply unverified details are confirmed.
3. Make media-team roles and the next step clear to recruits without compromising the member workspace.
4. Use authentic church content and evidence; do not substitute decorative placeholders for community proof.
5. Preserve accessibility and usability across mobile and desktop.

## Accessibility & Inclusion

Keep both sites responsive and keyboard-usable, with visible focus, readable contrast, and reduced-motion support. The church experience should work for first-time visitors who may not know MFM terminology.
