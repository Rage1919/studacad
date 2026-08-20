# SEO, accessibility, and performance operations

## Public discovery boundary

`https://studacad.com` is the only canonical origin. Public indexable routes are the homepage, policy and help content, `/become-a-tutor`, `/tutors`, approved `/tutors/[slug]` profiles, `/courses`, and published `/courses/[slug]` pages. Account, tutor workspace, administrator, support-case, booking, learning-entitlement, message, notification, referral, wallet, authentication, API, and legacy `/tutor?id=…` routes are `noindex` and excluded from the sitemap.

Marketplace filter queries deliberately canonicalize to `/tutors`. Public detail URLs use database-owned slugs. A tutor enters the sitemap only through the approved public marketplace view; a course enters only when its status is `published`. Structured data follows the same sources and never invents ratings, reviews, prices, availability, qualifications, or outcomes.

## Search release checks

1. Verify that every public page has a unique title and description, canonical URL, large Open Graph image, Twitter card, and accurate index directive.
2. Fetch `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest` on the production-like deployment. Confirm private paths are absent from the sitemap.
3. Validate Organization and WebSite data on the homepage, Breadcrumb data on public details, Course data on a published course, and Person data on an approved tutor.
4. Confirm filtered marketplace URLs resolve but canonicalize to `/tutors`; confirm the legacy `/tutor?id=…` route is `noindex`.
5. After DNS access exists, verify `studacad.com` in Google Search Console with `STUDACAD_GOOGLE_SITE_VERIFICATION` or DNS, submit `https://studacad.com/sitemap.xml`, and retain the dated result. Search Console verification does not require an analytics tag.

## Accessibility release checks

The target is WCAG 2.2 AA. CI checks the skip link, semantic main landmark, keyboard-opened dialog focus, Escape closure and focus restoration, reduced-motion override, labelled controls, stable image dimensions, and honest empty public states. Before public launch, test representative learner, tutor, and administrator journeys at 200% and 400% zoom, narrow mobile width, keyboard only, Windows High Contrast, one current screen reader/browser pairing, and reduced motion. Record tester, date, environment, pages, assistive technology, outcome, defects, and retest evidence.

Do not suppress focus outlines. Dialogs must trap focus while open and restore the triggering control when closed. Errors must be associated with the relevant input or announced by an alert/status region. Decorative images use empty alternatives; informative images use concise alternatives. New motion must respect `prefers-reduced-motion`.

## Performance budgets and monitoring

Public field targets at the 75th percentile are LCP ≤ 2.5 seconds, CLS ≤ 0.1, and INP ≤ 200 ms. CI fails when raw built client JavaScript exceeds 800 KB in total or 260 KB for one file, CSS exceeds 190 KB in total or 160 KB for one file, or the social image exceeds 100 KB. Browser checks use a looser local LCP ceiling of four seconds and CLS ceiling of 0.1 to catch regressions without pretending local timing is field data.

The approved tutor API uses a 60-second public cache with five minutes of stale-while-revalidate, and built static assets use fingerprinted filenames. Course pages and the sitemap are generated from current published server records; production CDN caching for them is a deployment decision that must be validated against publication latency. Authentication and private responses must never use shared public caching. There are no third-party scripts or remote font dependencies. Public editorial images request bounded source sizes, declare intrinsic dimensions, decode asynchronously, and load below-fold media lazily.

After deployment, capture server response time and Core Web Vitals by page type and device class. Optional real-user monitoring stays disabled until its purpose, retention, processor, consent basis, and policy text are reviewed. If enabled later, collect aggregate route templates and performance measurements only—never account IDs, tutor document references, booking IDs, message content, search text, email addresses, financial references, or full dynamic URLs.

## Ownership and rollback

The release owner runs the checklist; the engineering owner investigates search, accessibility, or performance regression; the policy owner approves any analytics or cookie change. Roll back using the immutable deployment procedure when a release makes a private route indexable, exposes protected data, breaks keyboard access to a critical action, exceeds the enforced asset budget, or causes a material Core Web Vitals regression. Re-run the checks after rollback and link the incident evidence in the release record.
