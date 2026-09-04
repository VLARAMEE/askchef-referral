const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const referralScript = fs.readFileSync(path.join(root, "assets", "referral.js"), "utf8");

function renderReferral(url) {
  const codeElement = { textContent: "Loading…" };
  const copyButton = {
    classList: { add() {} },
    addEventListener() {},
  };
  const parsedUrl = new URL(url);
  const context = {
    URLSearchParams,
    decodeURIComponent,
    document: {
      querySelector(selector) {
        return selector === "[data-invite-code]" ? codeElement : copyButton;
      },
    },
    navigator: {},
    window: {
      location: parsedUrl,
    },
  };

  vm.runInNewContext(referralScript, context);
  return codeElement.textContent;
}

test("reads a referral code from a campaign path", () => {
  assert.equal(renderReferral("https://invite.ask-chef.com/google-C-01"), "google-C-01");
  assert.equal(renderReferral("https://invite.ask-chef.com/instagram-01/"), "instagram-01");
});

test("keeps the existing query-parameter referral format", () => {
  assert.equal(renderReferral("https://invite.ask-chef.com/referral?code=FRIEND-123"), "FRIEND-123");
});

test("prefers an explicit query code when one is supplied", () => {
  assert.equal(renderReferral("https://invite.ask-chef.com/google-C-01?code=OVERRIDE"), "OVERRIDE");
});

test("does not treat the root or referral route name as a code", () => {
  assert.equal(renderReferral("https://invite.ask-chef.com/"), "No invite code included");
  assert.equal(renderReferral("https://invite.ask-chef.com/referral"), "No invite code included");
});

test("the campaign route and fallback retain the App Store destination", () => {
  const expectedDestination = "https://apps.apple.com/app/id6761346875";
  const campaignPage = fs.readFileSync(path.join(root, "google-C-01", "index.html"), "utf8");
  const fallbackPage = fs.readFileSync(path.join(root, "404.html"), "utf8");

  assert.match(campaignPage, new RegExp(expectedDestination));
  assert.match(fallbackPage, new RegExp(expectedDestination));
  assert.match(campaignPage, /src="\/assets\/referral\.js"/);
  assert.match(fallbackPage, /src="\/assets\/referral\.js"/);
});
