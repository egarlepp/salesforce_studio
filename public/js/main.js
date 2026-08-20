window.appState = { connected: false, org: null };

window.mainNav = {
  current: "connect",

  switchTo(view) {
    this.current = view;
    document.querySelectorAll(".view").forEach((el) => {
      el.classList.toggle("hidden", el.id !== `view-${view}`);
    });
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    if (view === "connect") connectView.render();
    if (view === "configure") configFormView.render();
    if (view === "history") runHistoryView.render();
  },
};

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => window.mainNav.switchTo(btn.dataset.view));
});

async function init() {
  try {
    const { version } = await api.getVersion();
    document.getElementById("app-version").textContent = `Salesforce Studio v${version}`;
  } catch {
    // version display is best-effort
  }

  await connectView.render();
  window.mainNav.switchTo(window.appState.connected ? "configure" : "connect");
}

init();
