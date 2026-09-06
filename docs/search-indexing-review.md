# Search indexing review — September 6, 2026

## Confirmed defects and fixes

- `robots.txt` blocked `/_nuxt/`, including the JavaScript, CSS, fonts, and generated assets needed to render public pages. These assets are now crawlable. Private/admin route exclusions remain.
- The article sitemap requested unsupported API parameters (`limit=5000`, `sort=newest`); the profile sitemap requested an unsupported limit of 500. Both swallowed API errors and published empty XML with HTTP 200. Articles now use `limit=50`, `sort=new`, public visibility, and cursor pagination. Profiles use the supported top-50 discovery endpoint. Upstream errors or malformed responses return HTTP 503 with `no-store` instead of advertising that every URL disappeared.
- Removed `/leaderboard` and `/who-to-follow` from the static sitemap because those routes are intentionally noindex/access-gated.
- Removed generated “today” modification dates. Article dates come from persisted modification/publication timestamps; other sitemaps omit dates when no accurate modification timestamp is available.
- `/register` redirects permanently to the unified login/signup page, and article comments link directly there. `/a` and `/a/` redirect to the article listing. The article canonical fallback uses the route ID while loading instead of creating a link to `/a/`.

## Search Console evidence

The supplied report has 215 indexed URLs and 115 excluded URLs. The domain property includes `merch.menofhunger.com`; its exclusions are not all web-app defects.

- The inspected robots-blocked URLs are predominantly merch localization/currency URLs and private app pages. The web asset directory was the actionable rendering defect.
- Inspected noindex examples are RSS/Atom feeds and an internal search URL. Preserve those exclusions.
- The two 404 examples are `/register` and `/a/`, handled above.
- All three inspected canonical conflicts are merch currency variants: `/en-sek/pages/terms-of-service`, `/en-myr/pages/returns-faq`, and `/en-aud/pages/privacy-policy`. Their canonical/market configuration belongs to the commerce platform, outside this repository.
- Sample crawled-but-unindexed public posts and `/u/worthy` returned HTTP 200, server-rendered content, index/follow directives, and self-canonical URLs. No blanket indexing block was found on those samples. Google still decides whether to index individual pages.

## Validation and rollout

Focused sitemap tests cover public-only pagination, deduplication, repeated cursors, valid dates/XML escaping, supported API parameters, and retryable upstream failures. No production content or Search Console validation state was changed as part of these fixes.

After deploying web:

1. Confirm `/robots.txt`, `/sitemap.xml`, and its three child sitemaps return the intended content. Articles and profiles must contain URLs when the public API has content. Verify the two legacy redirects.
2. Resubmit `https://menofhunger.com/sitemap.xml` in Search Console. Use URL Inspection's live test on representative public articles, profiles, and posts; request indexing for the most important affected URLs.
3. Validate the fixed errors after the deployed responses are confirmed. Keep expected private/feed/redirect exclusions; a zero-exclusion count is not the goal. Review merch currency canonicals in the store's own platform.

Indexing is not immediate or guaranteed. Do not remove privacy/access restrictions to reduce an exclusion count.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [request a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
