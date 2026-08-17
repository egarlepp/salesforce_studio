const connectView = {
  async render() {
    const el = document.getElementById("connect-status");
    el.textContent = "Checking connection…";
    try {
      const org = await api.getOrg();
      el.innerHTML = "";

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <p><strong>Connected as:</strong> ${escapeHtml(org.username)}</p>
        <p><strong>Org:</strong> ${escapeHtml(org.organizationName)}
          (${escapeHtml(org.organizationType)}${org.isSandbox ? ", Sandbox" : ""})</p>
        <p><strong>Instance:</strong> ${escapeHtml(org.instanceUrl)}</p>
      `;

      const disconnectBtn = document.createElement("button");
      disconnectBtn.className = "btn btn-secondary";
      disconnectBtn.textContent = "Disconnect";
      disconnectBtn.addEventListener("click", async () => {
        await api.disconnect();
        window.location.reload();
      });
      card.appendChild(disconnectBtn);

      el.appendChild(card);
      window.appState.connected = true;
      window.appState.org = org;
    } catch (err) {
      window.appState.connected = false;
      el.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = "Not connected to a Salesforce org yet.";
      const link = document.createElement("a");
      link.className = "btn";
      link.href = "/oauth/login";
      link.textContent = "Connect to Salesforce";
      el.appendChild(p);
      el.appendChild(link);
    }
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
