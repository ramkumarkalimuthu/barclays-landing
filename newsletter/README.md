# Barclays Corporate Banking Newsletter

This folder contains a static HTML email mockup for a Barclays Corporate Banking quarterly update.

## Preview locally

1. Open `newsletter.html` directly in a browser to check the layout quickly.
2. For a more realistic preview, run a simple local server from this folder:




3. For client testing, review it in Outlook desktop, Outlook web, Gmail web, and Apple Mail to catch rendering differences.

## Client-specific issues to watch for

- Outlook desktop is the biggest constraint: it can ignore modern CSS and mobile styles, so the template uses table-based layouts and Microsoft-specific conditional markup (`<!--[if mso]-->`) to keep it stable.
- Some styling is intentionally progressive-enhancement only; older or stricter email clients may not apply the full mobile layout or advanced spacing rules.
- Image paths and links are currently local or placeholder values; before sending for real, they need to be hosted and updated to production URLs.
- Email clients vary on fonts, button rendering, and dark-mode handling, so the design uses safe fallbacks and solid background colors.
- Gmail and other clients may strip or rewrite some inline CSS, so final QA should confirm spacing, button appearance, and text sizing in the target clients.

This is a design and build sample rather than an official Barclays send.
