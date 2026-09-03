(() => {
  const params = new URLSearchParams(window.location.search);
  const rawCode = params.get("code");
  const inviteCode = rawCode ? rawCode.trim().slice(0, 80) : "";
  const codeElement = document.querySelector("[data-invite-code]");
  const copyButton = document.querySelector("[data-copy-code]");

  if (!inviteCode) {
    codeElement.textContent = "No invite code included";
    return;
  }

  codeElement.textContent = inviteCode;
  copyButton.classList.add("is-visible");

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
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
})();
