# AskChef referral site

Static GitHub Pages site for `invite.ask-chef.com`.

## Published routes

- `/google-C-01` — Google Ads campaign redirect
- `/<referral-code>` — generic campaign-code redirect fallback for future links
- `/referral?code=EXAMPLE` — referral landing page and App Store fallback
- `/.well-known/apple-app-site-association` — Apple Universal Links association
- `/apple-app-site-association` — duplicate legacy Apple lookup location

Campaign paths record the incoming attribution data locally and immediately
redirect to `https://apps.apple.com/app/id6761346875`. The existing
`/referral?code=EXAMPLE` page retains its code display and App Store button.

Referral pages first read the existing `code` query parameter and otherwise use a
single path segment as the code. Codes are trimmed and limited to 80 characters.
This keeps `/referral?code=EXAMPLE` working while allowing campaign links such as
`/google-C-01`, `/google-P-01`, `/instagram-01`, and `/recipe-site-a` to redirect.

Before redirecting, the browser stores the referral code, latest attribution
event, and the 20 most recent events in `localStorage`. Each event includes the
full incoming URL, timestamp, path, all query parameters, Google click IDs, UTM
parameters, and browser referrer. Storage failure is ignored so it cannot prevent
the App Store redirect. This repository has no analytics or backend endpoint, so
the stored events remain local to that browser and are not centrally reported.

GitHub Pages cannot configure wildcard rewrites. The launch campaign therefore has
a real `/google-C-01/index.html` so it returns HTTP 200, while `404.html` performs
the same redirect for new single-segment campaign paths without a code change.
Add a matching directory for any future advertising destination that must also
return HTTP 200 to crawlers and ad validators.

## GitHub Pages setup

Publish the repository root from the default branch and configure the custom
domain as `invite.ask-chef.com`. The `CNAME` file preserves that domain and the
empty `.nojekyll` file makes Pages deploy dot-prefixed directories such as
`.well-known` without Jekyll filtering them out.

## AASA hosting caveat

Apple expects the extensionless association file to be returned directly over
HTTPS, without redirects, as JSON. GitHub Pages does not provide per-path response
header configuration, so the response MIME type for an extensionless file cannot
be forced to `application/json` from this repository.

This repository uses the safest Pages-only arrangement: `.nojekyll` plus identical
extensionless AASA files at both Apple-supported locations. After deployment,
verify the live status, redirects, content type, and body:

```sh
curl -i https://invite.ask-chef.com/.well-known/apple-app-site-association
curl -i https://invite.ask-chef.com/apple-app-site-association
```

Both URLs should return `200` with no redirect and the JSON in this repository.
If the live response has an unacceptable MIME type or Apple does not ingest it,
GitHub Pages alone cannot correct the header. Put a header-configurable static host
or CDN in front of the domain and explicitly serve this path as
`Content-Type: application/json`.
