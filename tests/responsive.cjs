"use strict";
const path = require("path");
const os = require("os");
const fs = require("fs");
const http = require("http");
const assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "..");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const CACHED_PW = "C:/Users/Ramkumar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const VIEWPORTS = [[320,568],[360,800],[375,667],[390,844],[414,896],[560,800],[561,800],[720,960],[721,960],[768,1024],[820,1180],[860,900],[861,900],[1000,800],[1001,800],[1024,768],[1366,768],[1440,900],[1920,1080],[844,390]];
const SMOKE = [[390,844],[768,1024],[1440,900]];
const TAB_IDS = ["tab-loan-calculator","tab-business-information","tab-authorised-signatories","tab-contact-details"];
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };
const GRID_SPECS = [
  [".service-grid", w => w > 1000 ? 4 : w > 720 ? 2 : 1],
  [".hero-inner", w => w > 860 ? 2 : 1],
  [".why-inner", w => w > 1000 ? 2 : 1],
  [".growth-steps", w => w > 560 ? 3 : 1],
  [".global-inner", w => w > 560 ? 2 : 1],
  [".calc-grid", w => w > 720 ? 3 : w > 560 ? 2 : 1],
  [".field-row", w => w > 720 ? 2 : 1],
  [".footer-main", w => w > 1000 ? 4 : w > 560 ? 3 : 2]
];
let playwright;
try {
  playwright = require("playwright");
} catch (e1) {
  try {
    playwright = require(process.env.PLAYWRIGHT_MODULE);
  } catch (e2) {
    playwright = require(CACHED_PW);
  }
}
const results = [];
const browserFailures = [];
const shotKeys = new Set();
function record(browser, viewport, state, check, ok, message, diagnostics) {
  results.push({ browser, viewport, state, check, ok, message, diagnostics });
}
async function soft(page, browser, viewport, state, check, fn) {
  try {
    await fn();
    record(browser, viewport, state, check, true);
  } catch (err) {
    record(browser, viewport, state, check, false, err.message);
    if (page) {
      const key = browser + "-" + viewport + "-" + state;
      if (!shotKeys.has(key)) {
        shotKeys.add(key);
        try {
          await page.screenshot({ path: path.join(os.tmpdir(), "barclays-responsive-fail-" + key.replace(/[^a-z0-9]+/gi, "-") + ".png") });
        } catch (e) {}
      }
    }
  }
}
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p;
      try {
        p = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      } catch (e) {
        res.writeHead(400);
        res.end();
        return;
      }
      if (p === "/") p = "/index.html";
      if (p === "/favicon.ico") p = "/assets/Eagle_RGB_Cyan_Large.svg";
      const fp = path.normalize(path.join(ROOT, p));
      if (fp !== ROOT && !fp.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}
async function launchBrowser(name) {
  return playwright.chromium.launch({ executablePath: name === "chrome" ? CHROME : EDGE, headless: true });
}
async function checkFonts(page) {
  const info = await page.evaluate(() => {
    const fam = {};
    for (const f of document.fonts) {
      if (/Fraunces|Inter/.test(f.family)) {
        fam[f.family] = fam[f.family] || { total: 0, loaded: 0 };
        fam[f.family].total++;
        if (f.status === "loaded") fam[f.family].loaded++;
      }
    }
    return { fam, checkF: document.fonts.check("16px Fraunces"), checkI: document.fonts.check("16px Inter") };
  });
  for (const family of ["Fraunces", "Inter"]) {
    const f = info.fam[family];
    assert.ok(f && f.loaded >= 1, family + " no loaded face " + JSON.stringify(info.fam));
  }
  assert.ok(info.checkF, "Fraunces unavailable");
  assert.ok(info.checkI, "Inter unavailable");
}
async function checkImages(page) {
  const imgs = await page.evaluate(() => Array.from(document.querySelectorAll(".logo-eagle, .logo-wordmark, .hero-visual img")).map(i => ({ src: i.getAttribute("src"), complete: i.complete, nw: i.naturalWidth })));
  for (const img of imgs) assert.ok(img.complete && img.nw > 0, "image not loaded " + JSON.stringify(img));
}
async function checkOverflow(page) {
  const o = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".form-section-nav") || el.classList.contains("skip-link")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 0.5 || r.left < -0.5) {
        offenders.push({ sel: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""), left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, width: Math.round(r.width * 10) / 10 });
      }
    }
    return { sw: document.documentElement.scrollWidth, cw: vw, bsw: document.body.scrollWidth, offenders: offenders.slice(0, 12) };
  });
  assert.ok(o.sw <= o.cw && o.bsw <= o.cw, "horizontal overflow sw=" + o.sw + " cw=" + o.cw + " bsw=" + o.bsw + " offenders=" + JSON.stringify(o.offenders));
}
async function checkHeader(page) {
  const h = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const rect = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10 }; };
    const cta = document.querySelector(".header-cta");
    const links = Array.from(document.querySelectorAll(".nav-list a")).map(a => { const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10 }; });
    return { vw, logo: rect(document.querySelector(".logo")), nav: rect(document.querySelector(".main-nav")), cta: rect(cta), ctaVisible: cta.getClientRects().length > 0, links };
  });
  assert.ok(h.logo.left >= -0.5 && h.logo.right <= h.vw + 0.5, "logo out of viewport " + JSON.stringify(h.logo));
  assert.ok(h.nav.left >= -0.5 && h.nav.right <= h.vw + 0.5, "nav out of viewport " + JSON.stringify(h.nav));
  if (h.ctaVisible) assert.ok(h.cta.left >= -0.5 && h.cta.right <= h.vw + 0.5, "cta out of viewport " + JSON.stringify(h.cta));
  assert.ok(h.logo.right <= h.nav.left + 0.5, "logo overlaps nav " + JSON.stringify({ logo: h.logo, nav: h.nav }));
  if (h.ctaVisible) assert.ok(h.nav.right <= h.cta.left + 0.5, "nav overlaps cta " + JSON.stringify({ nav: h.nav, cta: h.cta }));
  if (h.links.length && h.links[0].height > 0) {
    for (let i = 0; i < h.links.length; i++) {
      const l = h.links[i];
      assert.ok(l.left >= -0.5 && l.right <= h.vw + 0.5, "link out of viewport " + JSON.stringify(l));
      assert.ok(l.height <= 30, "link wrapped " + JSON.stringify(l));
      if (i > 0) assert.ok(h.links[i - 1].right <= l.left + 0.5, "links overlap " + JSON.stringify([h.links[i - 1], l]));
    }
    const tops = h.links.map(l => l.top);
    assert.ok(Math.max(...tops) - Math.min(...tops) <= 1, "links on different lines " + JSON.stringify(h.links));
  }
}
async function checkGrids(page, w) {
  const data = await page.evaluate((sels) => {
    const out = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.getClientRects().length === 0) continue;
        out.push({ sel, cols: getComputedStyle(el).gridTemplateColumns.split(/\s+/).length });
      }
    }
    return out;
  }, GRID_SPECS.map(s => s[0]));
  for (const d of data) {
    const expected = GRID_SPECS.find(s => s[0] === d.sel)[1](w);
    assert.equal(d.cols, expected, d.sel + " cols=" + d.cols + " expected=" + expected + " at width " + w);
  }
}
async function checkFieldsetBounds(page) {
  const fb = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const container = document.querySelector(".enquiry-inner").getBoundingClientRect();
    const fieldsets = [];
    const controls = [];
    for (const fs of document.querySelectorAll(".form-fieldset")) {
      if (fs.getClientRects().length === 0) continue;
      const r = fs.getBoundingClientRect();
      fieldsets.push({ id: fs.id, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, inVp: r.left >= -0.5 && r.right <= vw + 0.5, inContainer: r.left >= container.left - 1 && r.right <= container.right + 1 });
    }
    for (const el of document.querySelectorAll(".form-fieldset input, .form-fieldset select, .form-fieldset textarea, .form-fieldset button")) {
      if (el.getClientRects().length === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -0.5 || r.right > vw + 0.5) controls.push({ sel: el.id || el.className, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 });
    }
    return { vw, container: { left: Math.round(container.left * 10) / 10, right: Math.round(container.right * 10) / 10 }, fieldsets, controls };
  });
  for (const f of fb.fieldsets) {
    assert.ok(f.inVp, "fieldset " + f.id + " outside viewport " + JSON.stringify(f));
    assert.ok(f.inContainer, "fieldset " + f.id + " outside container " + JSON.stringify(f));
  }
  assert.deepEqual(fb.controls, [], "controls outside viewport " + JSON.stringify(fb.controls));
}
async function checkNavVisibility(page, w) {
  const nv = await page.evaluate(() => {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    return { toggle: toggle.getClientRects().length > 0, nav: nav.getClientRects().length > 0, expanded: toggle.getAttribute("aria-expanded") };
  });
  if (w <= 860) {
    assert.ok(nv.toggle, "navToggle hidden at " + w);
    assert.ok(!nv.nav, "primaryNav visible at " + w);
  } else {
    assert.ok(!nv.toggle, "navToggle visible at " + w);
    assert.ok(nv.nav, "primaryNav hidden at " + w);
  }
}
async function runViewport(browser, name, base, w, h) {
  const vp = w + "x" + h;
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const localFailed = [];
  const pageErrors = [];
  page.on("requestfailed", r => { if (r.url().startsWith(base)) localFailed.push(r.url()); });
  page.on("pageerror", e => pageErrors.push(String(e)));
  try {
    await page.goto(base, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await soft(page, name, vp, "default", "fonts-loaded", () => checkFonts(page));
    await soft(page, name, vp, "default", "images-loaded", () => checkImages(page));
    await soft(page, name, vp, "default", "no-local-request-failures", () => assert.deepEqual(localFailed, [], "local failed requests " + JSON.stringify(localFailed)));
    await soft(page, name, vp, "default", "no-page-errors", () => assert.deepEqual(pageErrors, [], "page errors " + JSON.stringify(pageErrors)));
    await soft(page, name, vp, "default", "no-overflow", () => checkOverflow(page));
    await soft(page, name, vp, "default", "header-bounds", () => checkHeader(page));
    await soft(page, name, vp, "default", "grids", () => checkGrids(page, w));
    await soft(page, name, vp, "default", "nav-visibility", () => checkNavVisibility(page, w));
    await soft(page, name, vp, "default", "sticky-header", async () => {
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(150);
      const st = await page.evaluate(() => ({ top: document.querySelector(".site-header").getBoundingClientRect().top, pos: getComputedStyle(document.querySelector(".site-header")).position }));
      assert.equal(st.pos, "sticky");
      assert.ok(Math.abs(st.top) <= 1, "header top " + st.top + " after scroll");
    });
    await soft(page, name, vp, "default", "tab-nav-scroll", async () => {
      const ns = await page.evaluate(() => {
        const nav = document.querySelector(".form-section-nav");
        const last = document.getElementById("tab-contact-details");
        nav.scrollLeft = nav.scrollWidth;
        const r = last.getBoundingClientRect();
        const nr = nav.getBoundingClientRect();
        return { scrollLeft: nav.scrollLeft, maxScroll: nav.scrollWidth - nav.clientWidth, lastInNav: r.left >= nr.left - 1 && r.right <= nr.right + 1, docSW: document.documentElement.scrollWidth, docCW: document.documentElement.clientWidth };
      });
      assert.ok(ns.lastInNav, "last tab not reachable " + JSON.stringify(ns));
      assert.ok(ns.docSW <= ns.docCW, "doc x-scroll from tab nav " + JSON.stringify(ns));
    });
    for (const tabId of TAB_IDS) {
      const state = "panel:" + tabId;
      await soft(page, name, vp, state, "tab-activate", async () => {
        await page.click("#" + tabId);
        const t = await page.evaluate((id) => {
          const tab = document.getElementById(id);
          const panel = document.getElementById(tab.getAttribute("aria-controls"));
          const others = Array.from(document.querySelectorAll('[role="tab"]')).filter(x => x.id !== id).map(x => ({ id: x.id, sel: x.getAttribute("aria-selected"), hidden: document.getElementById(x.getAttribute("aria-controls")).hidden }));
          return { sel: tab.getAttribute("aria-selected"), panelHidden: panel.hidden, others };
        }, tabId);
        assert.equal(t.sel, "true", tabId + " not selected");
        assert.ok(!t.panelHidden, tabId + " panel hidden");
        for (const o of t.others) {
          assert.equal(o.sel, "false", o.id + " still selected");
          assert.ok(o.hidden, o.id + " panel visible");
        }
      });
      await soft(page, name, vp, state, "no-overflow", () => checkOverflow(page));
      await soft(page, name, vp, state, "fieldset-bounds", () => checkFieldsetBounds(page));
      await soft(page, name, vp, state, "grids", () => checkGrids(page, w));
    }
    await soft(page, name, vp, "keyboard", "tab-keys", async () => {
      await page.click("#tab-loan-calculator");
      await page.focus("#tab-loan-calculator");
      const seq = [["ArrowRight", "tab-business-information"], ["ArrowRight", "tab-authorised-signatories"], ["ArrowRight", "tab-contact-details"], ["ArrowRight", "tab-loan-calculator"], ["ArrowLeft", "tab-contact-details"], ["Home", "tab-loan-calculator"], ["End", "tab-contact-details"]];
      for (const [key, expected] of seq) {
        await page.keyboard.press(key);
        const k = await page.evaluate(() => ({ active: document.activeElement.id, sel: document.activeElement.getAttribute("aria-selected"), panelHidden: document.getElementById(document.activeElement.getAttribute("aria-controls")).hidden }));
        assert.equal(k.active, expected, key + " active=" + k.active);
        assert.equal(k.sel, "true", key + " not selected");
        assert.ok(!k.panelHidden, key + " panel hidden");
      }
    });
    if (w <= 860) {
      await soft(page, name, vp, "nav-toggle", "toggle-open", async () => {
        await page.click("#navToggle");
        const open = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const nav = document.getElementById("primaryNav");
          const links = Array.from(nav.querySelectorAll("a")).map(a => { const r = a.getBoundingClientRect(); return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 }; });
          return { expanded: document.getElementById("navToggle").getAttribute("aria-expanded"), navVisible: nav.getClientRects().length > 0, links, vw };
        });
        assert.equal(open.expanded, "true");
        assert.ok(open.navVisible, "nav not visible after toggle");
        for (const l of open.links) assert.ok(l.left >= -0.5 && l.right <= open.vw + 0.5, "link out of viewport " + JSON.stringify(l));
      });
      await soft(page, name, vp, "nav-toggle", "toggle-close-on-link", async () => {
        await page.click(".nav-list a[href='#services']");
        const closed = await page.evaluate(() => ({ expanded: document.getElementById("navToggle").getAttribute("aria-expanded"), navVisible: document.getElementById("primaryNav").getClientRects().length > 0 }));
        assert.equal(closed.expanded, "false");
        assert.ok(!closed.navVisible, "nav still visible after link click");
      });
    }
    await soft(page, name, vp, "business:sole-trader", "conditional-fields", async () => {
      await page.click("#tab-business-information");
      await page.selectOption("#businessType", "sole-trader");
      const s = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sf = document.getElementById("soleTraderFields");
        const lf = document.getElementById("limitedCompanyFields");
        const r = sf.getBoundingClientRect();
        return { soleHidden: sf.hidden, limHidden: lf.hidden, tr: document.getElementById("tradingName").required, utr: document.getElementById("utr").required, cn: document.getElementById("companyName").required, ch: document.getElementById("companiesHouseNumber").required, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, vw };
      });
      assert.ok(!s.soleHidden && s.limHidden, "sole-trader visibility wrong " + JSON.stringify(s));
      assert.ok(s.tr && s.utr && !s.cn && !s.ch, "required flags wrong " + JSON.stringify(s));
      assert.ok(s.left >= -0.5 && s.right <= s.vw + 0.5, "soleTraderFields out of viewport " + JSON.stringify(s));
    });
    await soft(page, name, vp, "business:sole-trader", "no-overflow", () => checkOverflow(page));
    await soft(page, name, vp, "business:limited-company", "conditional-fields", async () => {
      await page.selectOption("#businessType", "limited-company");
      const s = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sf = document.getElementById("soleTraderFields");
        const lf = document.getElementById("limitedCompanyFields");
        const r = lf.getBoundingClientRect();
        return { soleHidden: sf.hidden, limHidden: lf.hidden, tr: document.getElementById("tradingName").required, utr: document.getElementById("utr").required, cn: document.getElementById("companyName").required, ch: document.getElementById("companiesHouseNumber").required, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, vw };
      });
      assert.ok(s.soleHidden && !s.limHidden, "limited-company visibility wrong " + JSON.stringify(s));
      assert.ok(!s.tr && !s.utr && s.cn && s.ch, "required flags wrong " + JSON.stringify(s));
      assert.ok(s.left >= -0.5 && s.right <= s.vw + 0.5, "limitedCompanyFields out of viewport " + JSON.stringify(s));
    });
    await soft(page, name, vp, "business:limited-company", "no-overflow", () => checkOverflow(page));
    await soft(page, name, vp, "business:empty", "conditional-fields", async () => {
      await page.selectOption("#businessType", "");
      const s = await page.evaluate(() => ({ soleHidden: document.getElementById("soleTraderFields").hidden, limHidden: document.getElementById("limitedCompanyFields").hidden, tr: document.getElementById("tradingName").required, cn: document.getElementById("companyName").required }));
      assert.ok(s.soleHidden && s.limHidden && !s.tr && !s.cn, "empty state wrong " + JSON.stringify(s));
    });
    await soft(page, name, vp, "signatories", "add-remove", async () => {
      await page.click("#tab-authorised-signatories");
      const c0 = await page.evaluate(() => document.querySelectorAll("[data-signatory]").length);
      assert.equal(c0, 1, "initial signatory count " + c0);
      await page.click("#addSignatory");
      await page.click("#addSignatory");
      const c2 = await page.evaluate(() => document.querySelectorAll("[data-signatory]").length);
      assert.equal(c2, 3, "after add count " + c2);
      await page.click(".signatory-remove >> nth=0");
      const c3 = await page.evaluate(() => document.querySelectorAll("[data-signatory]").length);
      assert.equal(c3, 2, "after remove count " + c3);
    });
    await soft(page, name, vp, "signatories:expanded", "no-overflow", () => checkOverflow(page));
    await soft(page, name, vp, "signatories:expanded", "fieldset-bounds", () => checkFieldsetBounds(page));
    await soft(page, name, vp, "calculator", "scenarios", async () => {
      await page.click("#tab-loan-calculator");
      const strip = (s) => parseFloat(s.replace(/[^0-9.]/g, ""));
      await page.fill("#loanAmount", "12000");
      await page.fill("#interestRate", "0");
      await page.fill("#loanTerm", "1");
      const c1 = strip(await page.textContent("#repaymentOutput"));
      assert.ok(Math.abs(c1 - 1000) < 0.005, "12000/0/1 = " + c1);
      await page.fill("#loanAmount", "150000");
      await page.fill("#interestRate", "6.5");
      await page.fill("#loanTerm", "5");
      const c2 = strip(await page.textContent("#repaymentOutput"));
      const r = 0.065 / 12;
      const n = 60;
      const expected = (150000 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      assert.ok(Math.abs(c2 - Math.round(expected * 100) / 100) < 0.005, "150000/6.5/5 = " + c2 + " expected " + Math.round(expected * 100) / 100);
      await page.fill("#loanAmount", "0");
      const c3 = strip(await page.textContent("#repaymentOutput"));
      assert.equal(c3, 0, "principal 0 = " + c3);
      await page.fill("#loanAmount", "150000");
      await page.fill("#loanTerm", "0");
      const c4 = strip(await page.textContent("#repaymentOutput"));
      assert.equal(c4, 0, "term 0 = " + c4);
    });
    await soft(page, name, vp, "validation", "business-empty-submit", async () => {
      await page.click("#tab-business-information");
      await page.click("#continueToSignatories");
      const bi = await page.evaluate(() => ({
        status: document.getElementById("businessFormStatus").textContent,
        invalid: document.getElementById("businessType").getAttribute("aria-invalid"),
        err: document.getElementById("businessType-error").textContent,
        tabSel: document.getElementById("tab-business-information").getAttribute("aria-selected")
      }));
      assert.equal(bi.status, "Please correct the highlighted business fields.");
      assert.equal(bi.invalid, "true");
      assert.equal(bi.err, "Business structure is required.");
      assert.equal(bi.tabSel, "true");
    });
    await soft(page, name, vp, "validation", "business-valid-continue", async () => {
      await page.selectOption("#businessType", "sole-trader");
      await page.fill("#tradingName", "Northside Design");
      await page.fill("#utr", "1234567890");
      await page.click("#continueToSignatories");
      const bv = await page.evaluate(() => ({ tabSel: document.getElementById("tab-authorised-signatories").getAttribute("aria-selected"), panelHidden: document.getElementById("authorised-signatories").hidden }));
      assert.equal(bv.tabSel, "true");
      assert.ok(!bv.panelHidden, "signatories panel hidden after continue");
    });
    await soft(page, name, vp, "validation", "signatories-valid-continue", async () => {
      const nSig = await page.locator(".sig-name").count();
      for (let i = 0; i < nSig; i++) {
        await page.locator(".sig-name").nth(i).fill("Alex Morgan " + i);
        await page.locator(".sig-role").nth(i).fill("Director");
        await page.locator(".sig-email").nth(i).fill("alex" + i + "@example.com");
      }
      await page.click("#continueToContact");
      const sv = await page.evaluate(() => ({ tabSel: document.getElementById("tab-contact-details").getAttribute("aria-selected"), panelHidden: document.getElementById("contact-details").hidden }));
      assert.equal(sv.tabSel, "true");
      assert.ok(!sv.panelHidden, "contact panel hidden after continue");
    });
    await soft(page, name, vp, "validation", "contact-invalid-submit", async () => {
      await page.click("#contact-details button[type=submit]");
      const ci = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const errs = Array.from(document.querySelectorAll("#contact-details .field-error")).filter(e => e.textContent).map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 }; });
        return { status: document.getElementById("formStatus").textContent, invalid: document.getElementById("fullName").getAttribute("aria-invalid"), err: document.getElementById("fullName-error").textContent, errs, vw };
      });
      assert.equal(ci.status, "Please fix the highlighted fields and try again.");
      assert.equal(ci.invalid, "true");
      assert.equal(ci.err, "Full name is required.");
      for (const e of ci.errs) assert.ok(e.left >= -0.5 && e.right <= ci.vw + 0.5, "error out of viewport " + JSON.stringify(e));
    });
  } finally {
    await context.close();
  }
}
async function runSmoke(browser, name, base, w, h) {
  const vp = w + "x" + h;
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const cdnFail = [];
  const localFail = [];
  const consoleErr = [];
  const pageErr = [];
  page.on("requestfailed", r => { if (r.url().includes("cdn.jsdelivr.net")) cdnFail.push(r.url()); else if (r.url().startsWith(base)) localFail.push(r.url()); });
  page.on("console", m => { if (m.type() === "error") consoleErr.push(m.text()); });
  page.on("pageerror", e => pageErr.push(String(e)));
  try {
    await page.goto(base, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    for (const sel of ["#top", "#services", "#why", "#growth", "#global-banking", "#enquiry"]) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }
    await page.waitForFunction(() => {
      const all = (sel) => Array.from(document.querySelectorAll(sel)).map(el => parseFloat(getComputedStyle(el).opacity));
      const groups = [all(".service-card"), all(".growth-step"), all(".global-capability"), all(".why-quote"), all(".growth .section-head"), all(".global-copy")];
      return groups.every(g => g.length > 0 && g.every(x => x > 0));
    }, undefined, { timeout: 5000 }).catch(() => {});
    await soft(page, name, vp, "smoke", "gsap-content-visible", async () => {
      const op = await page.evaluate(() => {
        const all = (sel) => Array.from(document.querySelectorAll(sel)).map(el => parseFloat(getComputedStyle(el).opacity));
        return { heroH1: all(".hero h1"), cards: all(".service-card"), growth: all(".growth-step"), global: all(".global-capability"), why: all(".why-quote"), growthHead: all(".growth .section-head"), globalCopy: all(".global-copy") };
      });
      for (const [k, v] of Object.entries(op)) assert.ok(v.length > 0 && v.every(x => x > 0), "opacity " + k + " " + JSON.stringify(v));
      const vis = await page.evaluate(() => ["#top h1", "#services h2", "#why h2", "#growth-title", "#global-title", "#enquiry h2"].map(sel => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); return { sel, vis: getComputedStyle(el).visibility !== "hidden" && r.width > 0 }; }));
      for (const v of vis) assert.ok(v.vis, "heading not visible " + v.sel);
    });
    await soft(page, name, vp, "smoke", "no-overflow", () => checkOverflow(page));
    for (const u of cdnFail) record(name, vp, "smoke", "cdn-request-failed", false, u);
    for (const u of localFail) record(name, vp, "smoke", "local-request-failed", false, u);
    for (const e of pageErr) record(name, vp, "smoke", "page-error", false, e);
    for (const e of consoleErr) record(name, vp, "smoke", "console-error", false, e);
  } finally {
    await context.close();
  }
}
async function main() {
  const filterArg = process.argv.find(a => a.startsWith("--browser="));
  const filter = filterArg ? filterArg.split("=")[1] : null;
  const server = await startServer();
  const base = "http://127.0.0.1:" + server.address().port + "/";
  const names = ["chrome", "edge"].filter(n => !filter || n === filter);
  const browsers = [];
  for (const name of names) {
    try {
      browsers.push({ name, browser: await launchBrowser(name) });
    } catch (err) {
      browserFailures.push({ name, error: String(err).slice(0, 500) });
    }
  }
  try {
    for (const { name, browser } of browsers) {
      for (const [w, h] of VIEWPORTS) await runViewport(browser, name, base, w, h);
      for (const [w, h] of SMOKE) await runSmoke(browser, name, base, w, h);
    }
  } finally {
    for (const { browser } of browsers) await browser.close().catch(() => {});
    server.close();
  }
  const reportPath = writeReport();
  printSummary(reportPath, names);
  process.exitCode = results.some(r => !r.ok) || browserFailures.length > 0 ? 1 : 0;
}
function writeReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    browsers: ["chrome", "edge"],
    viewports: VIEWPORTS.length,
    smoke: SMOKE.length,
    browserFailures,
    summary: { total: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length },
    failures: results.filter(r => !r.ok),
    results
  };
  const reportPath = path.join(os.tmpdir(), "barclays-responsive-results.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}
function printSummary(reportPath, names) {
  const failed = results.filter(r => !r.ok);
  const skipped = browserFailures.reduce((acc, bf) => acc + VIEWPORTS.length + SMOKE.length, 0);
  console.log("Barclays responsive tests");
  console.log("Browsers: " + names.join(", "));
  console.log("Viewports: " + VIEWPORTS.length + " reduced-motion + " + SMOKE.length + " normal-motion smoke per browser");
  if (browserFailures.length) {
    console.log("Browser launch failures (skipped " + skipped + " runs):");
    for (const bf of browserFailures) console.log("  " + bf.name + ": " + bf.error);
  }
  console.log("Summary: total=" + results.length + " passed=" + results.filter(r => r.ok).length + " failed=" + failed.length);
  const groups = {};
  for (const f of failed) {
    const key = f.browser + " " + f.viewport + " " + f.state;
    (groups[key] = groups[key] || []).push(f);
  }
  for (const [key, fs] of Object.entries(groups)) {
    console.log("FAIL " + key);
    for (const f of fs) console.log("  - " + f.check + ": " + f.message);
  }
  console.log("Report: " + reportPath);
}
main().catch(err => {
  console.error("Harness error: " + (err && err.stack ? err.stack : err));
  process.exitCode = 1;
});
