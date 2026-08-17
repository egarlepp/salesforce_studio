const generateView = {
  async startGeneration(config) {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    const loading = document.createElement("p");
    loading.textContent = "Generating data in your Salesforce org… this may take a few seconds.";
    container.appendChild(loading);

    try {
      const { runId, summary } = await api.generate(config);
      this.renderSummary(container, runId, summary);
    } catch (err) {
      container.innerHTML = "";
      const errBox = document.createElement("div");
      errBox.className = "card";
      errBox.innerHTML = `<p><strong>Generation failed:</strong> ${escapeHtml(err.message)}</p>`;
      container.appendChild(errBox);
    }
  },

  renderSummary(container, runId, summary) {
    container.innerHTML = "";

    const backdatingMessages = {
      unsupported:
        "Your org doesn't grant permission to set CreatedDate — records were created with today's date instead. Business date fields were still applied as configured.",
      applied: "CreatedDate backdating was applied to newly created records.",
      not_requested: null,
    };
    const backdatingMsg = backdatingMessages[summary.createdDateBackdating];
    if (backdatingMsg) {
      const box = document.createElement("div");
      box.className = "warning-box";
      box.textContent = backdatingMsg;
      container.appendChild(box);
    }

    if (summary.warnings && summary.warnings.length > 0) {
      summary.warnings.forEach((w) => {
        const box = document.createElement("div");
        box.className = "warning-box";
        box.textContent = w;
        container.appendChild(box);
      });
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr><th>Object</th><th>Requested</th><th>Created</th><th>Failed</th></tr>
      </thead>
      <tbody>
        ${summary.stages
          .map(
            (s) =>
              `<tr><td>${escapeHtml(s.objectType)}</td><td>${s.requested}</td><td>${s.created}</td><td>${s.failed}</td></tr>`
          )
          .join("")}
      </tbody>
    `;
    container.appendChild(table);

    if (summary.errors && summary.errors.length > 0) {
      const details = document.createElement("details");
      const summaryEl = document.createElement("summary");
      summaryEl.textContent = `${summary.errors.length} error(s) — click to expand`;
      details.appendChild(summaryEl);

      const list = document.createElement("ul");
      list.className = "error-list";
      summary.errors.forEach((e) => {
        const li = document.createElement("li");
        li.textContent = `[${e.objectType} #${e.recordIndex}] ${e.errorCode ? e.errorCode + ": " : ""}${e.errorMessage}`;
        list.appendChild(li);
      });
      details.appendChild(list);
      container.appendChild(details);
    }

    const link = document.createElement("p");
    link.innerHTML = `Run ID: <code>${escapeHtml(runId)}</code>. See it any time in <a href="#" id="results-history-link">Run History</a>.`;
    container.appendChild(link);
    document.getElementById("results-history-link").addEventListener("click", (e) => {
      e.preventDefault();
      window.mainNav.switchTo("history");
    });
  },
};
