const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const referralScript = fs.readFileSync(path.join(root, "assets", "referral.js"), "utf8");

function runReferral(url, options = {}) {
  const codeElement = { textContent: "Loading…" };
  const copyButton = {
    classList: { add() {} },
    addEventListener() {},
  };
  const parsedUrl = new URL(url);
  const storage = new Map();
  let redirectUrl = null;
  const context = {
    URLSearchParams,
    decodeURIComponent,
    document: {
      readyState: "complete",
      referrer: options.referrer || "",
      querySelector(selector) {
        return selector === "[data-invite-code]" ? codeElement : copyButton;
      },
    },
    navigator: {},
    window: {
      localStorage: {
        getItem(key) {
          if (options.storageThrows) throw new Error("Storage unavailable");
          return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
          if (options.storageThrows) throw new Error("Storage unavailable");
          storage.set(key, value);
        },
      },
      location: {
        href: parsedUrl.href,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        replace(destination) {
          redirectUrl = destination;
        },
      },
    },
  };

  vm.runInNewContext(referralScript, context);
  return { code: codeElement.textContent, redirectUrl, storage };
}

test("campaign paths redirect to the existing App Store destination", () => {
  const google = runReferral("https://invite.ask-chef.com/google-C-01");
  const instagram = runReferral("https://invite.ask-chef.com/instagram-01/");

  assert.equal(google.redirectUrl, "https://apps.apple.com/app/id6761346875");
  assert.equal(instagram.redirectUrl, "https://apps.apple.com/app/id6761346875");
});

test("keeps the existing query-parameter referral format", () => {
  const result = runReferral("https://invite.ask-chef.com/referral?code=FRIEND-123");

  assert.equal(result.code, "FRIEND-123");
  assert.equal(result.redirectUrl, null);
});

test("prefers an explicit query code when one is supplied", () => {
  const result = runReferral("https://invite.ask-chef.com/google-C-01?code=OVERRIDE");
  const event = JSON.parse(result.storage.get("askchef.attribution.latest"));

  assert.equal(event.referralCode, "OVERRIDE");
});

test("does not treat the root or referral route name as a code", () => {
  assert.equal(runReferral("https://invite.ask-chef.com/").code, "No invite code included");
  assert.equal(runReferral("https://invite.ask-chef.com/referral").code, "No invite code included");
});

test("records campaign attribution and all incoming query parameters", () => {
  const incomingUrl = "https://invite.ask-chef.com/google-C-01?utm_source=google&utm_medium=cpc&utm_campaign=C-01&utm_content=a&utm_content=b&utm_term=recipes&gclid=test-click&gbraid=test-gbraid&wbraid=test-wbraid";
  const result = runReferral(incomingUrl, { referrer: "https://www.google.com/" });
  const event = JSON.parse(result.storage.get("askchef.attribution.latest"));
  const history = JSON.parse(result.storage.get("askchef.attribution.visits"));

  assert.equal(result.storage.get("askchef.referralCode"), "google-C-01");
  assert.equal(event.referralCode, "google-C-01");
  assert.equal(event.fullIncomingUrl, incomingUrl);
  assert.equal(event.pathname, "/google-C-01");
  assert.equal(event.gclid, "test-click");
  assert.equal(event.gbraid, "test-gbraid");
  assert.equal(event.wbraid, "test-wbraid");
  assert.equal(event.utm_source, "google");
  assert.equal(event.utm_medium, "cpc");
  assert.equal(event.utm_campaign, "C-01");
  assert.equal(event.utm_content, "a");
  assert.equal(event.utm_term, "recipes");
  assert.equal(event.referrer, "https://www.google.com/");
  assert.deepEqual(Array.from(event.queryParameters.utm_content), ["a", "b"]);
  assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(history.length, 1);
});

test("redirects even when browser storage is unavailable", () => {
  const result = runReferral("https://invite.ask-chef.com/google-C-01", {
    storageThrows: true,
  });

  assert.equal(result.redirectUrl, "https://apps.apple.com/app/id6761346875");
});

test("the campaign route and fallback load the immediate redirect script", () => {
  const campaignPage = fs.readFileSync(path.join(root, "google-C-01", "index.html"), "utf8");
  const fallbackPage = fs.readFileSync(path.join(root, "404.html"), "utf8");

  assert.match(campaignPage, /src="\/assets\/referral\.js"/);
  assert.match(fallbackPage, /src="\/assets\/referral\.js"/);
});

test("every published page includes the Google Ads base tag", () => {
  const pages = [
    "index.html",
    path.join("referral", "index.html"),
    path.join("google-C-01", "index.html"),
    "404.html",
  ];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /googletagmanager\.com\/gtag\/js\?id=AW-18429256609/);
    assert.match(html, /gtag\('config', 'AW-18429256609'\)/);
  }
});
