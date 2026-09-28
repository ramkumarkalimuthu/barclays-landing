# Barclays Corporate Banking Landing Page

A responsive, static landing page and enquiry form prototype.

## Run the page

Open `index.html` directly in a modern browser. No build step or package installation is required.

To serve it locally from this directory with Node.js installed:

```sh
npx serve .
```

Open the local URL printed by the command. A local server is useful for testing asset loading and browser behavior consistently.

## Stack and libraries

- HTML5, CSS3, and vanilla JavaScript; no framework or project build system.
- GSAP 3 and ScrollTrigger, loaded from jsDelivr for scroll animations.
- Fraunces and Inter font files are self-hosted in `assets/fonts/` and declared in `css/fonts.css`.
- Barclays logo and hero imagery are stored in `assets/`.

Internet access is needed for the GSAP CDN files. Without them, the page content and form still work, but the GSAP scroll animations are unavailable.
