const runHistoryView = {
  async render() {
    const listEl = document.getElementById("history-list");
    const detailEl = document.getElementById("history-detail");
    detailEl.innerHTML = "";
    listEl.innerHTML = "Loading…";

    let runs;
    try {
      runs = await api.listRuns();
    } catch (err) {
      listEl.textContent = `Failed to load run history: ${err.message}`;
      return;
    }

    if (runs.length === 0) {
      listEl.innerHTML = '<p class="hint">No runs yet. Generate some data from the Configuration tab.</p>';
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr><th>Created</th><th>Status</th><th>Org</th></tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    runs.forEach((run) => {
      const tr = document.createElement("tr");
      tr.className = "run-row";
      tr.innerHTML = `
        <td>${new Date(run.createdAt).toLocaleString()}</td>
        <td><span class="status-badge status-${run.status}">${run.status.replace(/_/g, " ")}</span></td>
        <td>${escapeHtml(run.orgUsername)}</td>
      `;
      tr.addEventListener("click", () => this.renderDetail(run.id));
      tbody.appendChild(tr);
    });

    listEl.innerHTML = "";
    listEl.appendChild(table);
  },

  async renderDetail(runId) {
    const detailEl = document.getElementById("history-detail");
    detailEl.innerHTML = "Loading run detail…";

    let run;
    try {
      run = await api.getRun(runId);
    } catch (err) {
      detailEl.textContent = `Failed to load run: ${err.message}`;
      return;
    }

    detailEl.innerHTML = "";
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.innerHTML = `
      <p><strong>Run</strong> <code>${escapeHtml(run.id)}</code>
        <span class="status-badge status-${run.status}">${run.status.replace(/_/g, " ")}</span></p>
      <p>Org: ${escapeHtml(run.orgUsername)} (${escapeHtml(run.orgInstanceUrl)})</p>
      <p>Created: ${new Date(run.createdAt).toLocaleString()}${
      run.completedAt ? ` · Completed: ${new Date(run.completedAt).toLocaleString()}` : ""
    }</p>
      <p>App version at time of run: ${escapeHtml(run.summary?.version ?? "unknown")}</p>
      <p>Live (not-yet-deleted) records: ${run.liveRecordCount}</p>
    `;
    card.appendChild(header);

    if (run.summary && run.summary.stages) {
      const table = document.createElement("table");
      table.innerHTML = `
        <thead><tr><th>Object</th><th>Requested</th><th>Created</th><th>Failed</th></tr></thead>
        <tbody>
          ${run.summary.stages
            .map(
              (s) =>
                `<tr><td>${escapeHtml(s.objectType)}</td><td>${s.requested}</td><td>${s.created}</td><td>${s.failed}</td></tr>`
            )
            .join("")}
        </tbody>
      `;
      card.appendChild(table);
    }

    if (run.liveRecordCount > 0) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger";
      deleteBtn.textContent = "Delete Run Data";
      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Delete ${run.liveRecordCount} record(s) created by this run from Salesforce?`)) return;
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting…";
        try {
          const result = await api.deleteRun(run.id);
          alert(`Deleted ${result.deleted} record(s). ${result.failed} failed.`);
          this.render();
          this.renderDetail(run.id);
        } catch (err) {
          alert(`Delete failed: ${err.message}`);
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Delete Run Data";
        }
      });
      card.appendChild(deleteBtn);
    } else {
      const cleaned = document.createElement("p");
      cleaned.className = "hint";
      cleaned.textContent = "All records from this run have been deleted (or none were created).";
      card.appendChild(cleaned);
    }

    detailEl.appendChild(card);
  },
};
