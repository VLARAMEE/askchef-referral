(() => {
  const APP_STORE_URL = "https://apps.apple.com/app/id6761346875";
  const STORAGE_KEYS = {
    referralCode: "askchef.referralCode",
    latestVisit: "askchef.attribution.latest",
    visitHistory: "askchef.attribution.visits",
  };
  const params = new URLSearchParams(window.location.search);
  const pathSegments = window.location.pathname
    .split("/")
    .filter(Boolean);
  let pathCode = "";

  if (pathSegments.length === 1 && pathSegments[0] !== "referral") {
    try {
      pathCode = decodeURIComponent(pathSegments[0]);
    } catch {
      pathCode = pathSegments[0];
    }
  }

  const rawCode = params.get("code") || pathCode;
  const inviteCode = rawCode ? rawCode.trim().slice(0, 80) : "";

  if (!inviteCode) {
    showReferralCode("");
    return;
  }

  // A single path segment is a campaign URL. Existing /referral?code= links
  // retain their landing-page behavior.
  if (pathCode) {
    recordReferralVisit(inviteCode);
    window.location.replace(APP_STORE_URL);
    return;
  }

  showReferralCode(inviteCode);

  function recordReferralVisit(referralCode) {
    const queryParameters = {};

    params.forEach((value, key) => {
      if (!(key in queryParameters)) {
        queryParameters[key] = value;
      } else if (Array.isArray(queryParameters[key])) {
        queryParameters[key].push(value);
      } else {
        queryParameters[key] = [queryParameters[key], value];
      }
    });

    const event = {
      referralCode,
      fullIncomingUrl: window.location.href,
      timestamp: new Date().toISOString(),
      pathname: window.location.pathname,
      queryParameters,
      gclid: params.get("gclid"),
      gbraid: params.get("gbraid"),
      wbraid: params.get("wbraid"),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      referrer: document.referrer || null,
    };

    try {
      const storedHistory = JSON.parse(
        window.localStorage.getItem(STORAGE_KEYS.visitHistory) || "[]",
      );
      const visitHistory = Array.isArray(storedHistory) ? storedHistory : [];

      visitHistory.push(event);
      window.localStorage.setItem(STORAGE_KEYS.referralCode, referralCode);
      window.localStorage.setItem(STORAGE_KEYS.latestVisit, JSON.stringify(event));
      window.localStorage.setItem(
        STORAGE_KEYS.visitHistory,
        JSON.stringify(visitHistory.slice(-20)),
      );
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
      // Attribution failure must never block the App Store redirect.
    }
  }

  function showReferralCode(referralCode) {
    const render = () => {
      const codeElement = document.querySelector("[data-invite-code]");
      const copyButton = document.querySelector("[data-copy-code]");

      if (!codeElement || !copyButton) {
        return;
      }

      if (!referralCode) {
        codeElement.textContent = "No invite code included";
        return;
      }

      codeElement.textContent = referralCode;
      copyButton.classList.add("is-visible");

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(referralCode);
          copyButton.textContent = "Code copied";
        } catch {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(codeElement);
          selection.removeAllRanges();
          selection.addRange(range);
          copyButton.textContent = "Code selected — copy it now";
        }
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", render, { once: true });
    } else {
      render();
    }
  }
})();
