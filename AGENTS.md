<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reelmark Next.js rules

Sources of truth: the Next.js 16 guides for [fetching data](https://nextjs.org/docs/app/getting-started/fetching-data), [mutating data](https://nextjs.org/docs/app/getting-started/mutating-data), [caching](https://nextjs.org/docs/app/getting-started/caching), [error handling](https://nextjs.org/docs/app/getting-started/error-handling), [images](https://nextjs.org/docs/app/getting-started/images), and [metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images). Read the matching local guides `06-fetching-data.md`, `07-mutating-data.md`, `08-caching.md`, `10-error-handling.md`, `12-images.md`, and `14-metadata-and-og-images.md` before changing these systems.

- Default to async Server Components and `server-only` data modules for initial page data, Supabase queries, and authenticated data. Never expose service credentials or privileged query logic to Client Components.
- Authenticate and authorize every user-scoped read on the server; keep Supabase RLS enabled as defense in depth. Do not treat hiding UI as authorization.
- Use Client Component fetching only for browser-driven interactions such as debounced catalog search, polling, or user-triggered refresh. Route Handlers are trust boundaries: validate input and return actionable errors.
- In Next.js 16, `fetch` is not cached by default. Keep user-specific data uncached. Only introduce `'use cache'` for public or safely shareable data after defining its freshness and invalidation policy and confirming Cache Components are enabled.
- Identical `fetch` calls are memoized within the React tree. For repeated Supabase/database reads in one request, use `React.cache` in a server-only module instead of duplicating queries or drilling data through unrelated components. `React.cache` is request-scoped, not persistent caching.
- Start independent requests together and await them with `Promise.all`. Keep dependent requests sequential. Use `Promise.allSettled` only when partial rendering is explicitly acceptable.
- Stream slow, uncached sections with a nearby `<Suspense>` boundary and a skeleton shaped like the final UI. Use `loading.tsx` for route-level loading, but remember that runtime access in a layout, including `cookies()`, can block before that fallback appears.
- Keep the dashboard auth check in the protected server layout, then stream slower page data below it. Do not move authentication to the client to make loading appear faster.
- Resolve promises on the server by default. Pass an unresolved promise to a Client Component and read it with React `use()` only when the client boundary genuinely needs streamed data, and always wrap it in `<Suspense>`.
- Do not add SWR or TanStack Query until the feature needs a client cache, polling, optimistic updates, or focus revalidation that native server fetching does not cover.
- Preload only to remove a demonstrated waterfall. Keep `preload()` beside the consuming component and ensure the underlying request is deduplicated through identical `fetch`, `React.cache`, or an appropriate Cache Component.
- Every data surface must distinguish loading, empty, and error states. Never convert a failed Supabase or TMDB request into a misleading empty collection or “synced” status.

## Mutating data

- Prefer Server Actions for mutations initiated by Reelmark UI forms or controls. Keep Route Handlers for extension traffic, webhooks, or consumers that require an explicit HTTP API contract.
- Treat every Server Action as a public POST endpoint. Authenticate, authorize resource ownership, and validate all `FormData` or payload values with Zod inside the action; never rely on hidden controls or protected pages.
- Return expected failures, such as validation, duplicate, provider, or permission messages, as a typed result for `useActionState`. Throw only unexpected failures that should reach an error boundary.
- Use native `<form action={serverAction}>` when progressive enhancement is useful. Show a pending state, prevent accidental duplicate submission, and keep the result available through an `aria-live="polite"` region.
- After a successful mutation, choose the smallest refresh mechanism: `refresh()` for uncached current-route data, `revalidatePath()` for a known cached route, or tag invalidation for shared tagged data. Do not call multiple mechanisms without a concrete need.
- Call cache invalidation before `redirect()`. `redirect()` throws a framework control-flow exception, so keep it outside broad `try/catch` blocks and do not place required code after it.
- Mutations triggered from effects must represent a real lifecycle event and be idempotent. Do not use `useEffect` as the default way to submit data.

## Caching

- `cacheComponents` is currently disabled in this project. Do not add `'use cache'`, `cacheLife`, `cacheTag`, or private/remote cache directives unless the feature explicitly enables Cache Components and includes a cache invalidation plan.
- Keep authenticated Supabase reads fresh by default. Never place data from one user in a shared cache. Prefer request-scoped `React.cache` only to deduplicate identical server reads during one render.
- If Cache Components are enabled later, pair every cache directive with an explicit `cacheLife` and tag mutable shared data so its mutation can invalidate it deliberately.
- Cache only data with a clear sharing and freshness contract, such as stable public TMDB metadata. Stream request-specific history, session, device, and extension status behind `<Suspense>` instead of sharing it across users.
- Runtime APIs such as `cookies()`, `headers()`, `params`, and `searchParams` must not be read inside a shared cached function. Extract the needed value and pass it as an argument, or use a deliberately reviewed private-cache boundary.
- Remember that default server cache storage may be per-instance and ephemeral in serverless deployments. Do not depend on it for correctness, authentication, rate limiting, or durable application state.

## Error handling

- Separate expected errors from bugs. Expected request, validation, authentication, conflict, and provider failures are rendered or returned explicitly; unexpected failures are thrown and handled by the nearest error boundary.
- Add route-level `error.tsx` boundaries around important dashboard segments and offer a clear retry action. Error boundaries are Client Components; log the original error but show users safe, actionable copy without secrets or raw provider messages.
- Error boundaries do not catch event-handler or post-render async errors. Catch those in the handler, store a typed error state, and announce the recovery step in the UI. Errors thrown inside `startTransition` may bubble to the boundary.
- Use `notFound()` plus `not-found.tsx` only when the requested resource truly does not exist. Use `redirect()` for auth or workflow navigation, not as generic error handling.
- Add `global-error.tsx` only for root-layout failures; it must render its own `<html>` and `<body>`. Prefer narrower boundaries so the dashboard shell remains usable when one section fails.
- Never swallow a data exception and return `[]`, `null`, or a success response unless that value is genuinely valid. Preserve enough structured server logging to distinguish configuration, authorization, provider, and database failures.

## Images

- Use `next/image` for posters, backdrops, avatars, and other content images. Use a static import for bundled local assets so Next.js can infer dimensions and blur data; images referenced from `public` need explicit `width` and `height`, or `fill` inside a sized, positioned parent.
- Remote images need explicit dimensions or `fill`. Keep `images.remotePatterns` narrow by protocol, hostname, and path; TMDB artwork must stay restricted to `https://image.tmdb.org/t/p/**` rather than allowing arbitrary remote URLs.
- Every meaningful image needs concise, descriptive `alt` text. Use `alt=""` only when the image is decorative and adjacent text already conveys the same content.
- Supply an accurate responsive `sizes` value whenever `fill` or CSS makes the rendered width vary across mobile, tablet, and desktop. Preserve the poster or backdrop aspect ratio to prevent layout shift.
- Keep default lazy loading for off-screen artwork. Set `preload` only on the single image that is genuinely the route's LCP candidate; do not use the deprecated `priority` prop.
- Render an intentional local fallback when TMDB has no poster path. Do not send missing, malformed, or user-controlled URLs to the image optimizer.
- Dynamic imports for local images must use the narrowest static path prefix possible; never let external input choose an unrestricted filesystem path.

## Metadata and social images

- Export a typed `Metadata` object from a layout or page when values are static. Use `generateMetadata` only for route-specific data, and keep both APIs in Server Components.
- When a page and `generateMetadata` need the same database or provider record, share a `server-only` loader wrapped in React `cache` so the request is deduplicated without creating a persistent cross-user cache.
- Define `metadataBase` before using relative canonical, Open Graph, or Twitter URLs. Give public landing and title-detail routes a unique title, description, canonical URL, and share image; keep authenticated dashboard metadata generic.
- Prefer App Router metadata files: `favicon.ico`, `icon.*`, `apple-icon.*`, `opengraph-image.*`, `twitter-image.*`, `robots.ts`, and `sitemap.ts`. Place route-specific assets in that route segment; the closest file overrides its ancestors.
- Generate dynamic share cards with `opengraph-image.tsx` and `ImageResponse` only when route data must appear in the image. Use `1200x630`, flexbox or absolute positioning, and the supported CSS subset; CSS grid is not supported.
- Never expose a user's watch history, identity, extension state, or other private dashboard data in metadata, canonical URLs, or generated social images.
- Metadata may stream for normal browsers but blocks for crawlers. Its data source must work without client state and must fail to safe public metadata rather than leaking raw provider or database errors.
