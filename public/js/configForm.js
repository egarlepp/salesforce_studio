const configFormView = {
  state: null,

  async render() {
    const statusEl = document.getElementById("config-status");
    const formEl = document.getElementById("config-form");
    formEl.innerHTML = "";
    statusEl.textContent = "";

    if (!this.state) {
      try {
        this.state = await api.getDefaults();
      } catch (err) {
        statusEl.textContent = `Failed to load defaults: ${err.message}`;
        return;
      }
    }

    const state = this.state;

    formEl.appendChild(
      this.renderObjectSection("Account", [
        this.numberField("Count (10-250)", state.account, "count", { min: 10, max: 250, step: 1 }),
        this.weightedList("Industry weights", state.account.industries),
        this.numberRange("Annual Revenue", state.account.annualRevenue),
        this.numberRange("Number of Employees", state.account.numberOfEmployees),
      ])
    );

    formEl.appendChild(
      this.renderObjectSection("Contact", [
        this.numberField("Count (10-250)", state.contact, "count", { min: 10, max: 250, step: 1 }),
        this.numberRange("Contacts per Account (ratio)", state.contact.accountRatio, { min: 0, max: 50 }),
        this.weightedList("Title weights", state.contact.titles),
        this.weightedList("Lead Source weights", state.contact.leadSources),
      ])
    );

    formEl.appendChild(
      this.renderObjectSection("Opportunity", [
        this.numberField("Count (10-250)", state.opportunity, "count", { min: 10, max: 250, step: 1 }),
        this.numberRange("Opportunities per Account (ratio)", state.opportunity.accountRatio, { min: 0, max: 20 }),
        this.probabilityField("Campaign attach rate", state.opportunity, "campaignAttachRate"),
        this.numberRange("Amount ($)", state.opportunity.amount, { min: 0, max: 10_000_000 }),
        this.weightedList("Stage weights", state.opportunity.stages),
        this.dateRange("Close Date range", state.opportunity.closeDate),
      ])
    );

    formEl.appendChild(
      this.renderObjectSection("Campaign", [
        this.numberField("Count (10-250)", state.campaign, "count", { min: 10, max: 250, step: 1 }),
        this.weightedList("Type weights", state.campaign.types),
        this.weightedList("Status weights", state.campaign.statuses),
        this.dateRange("Start/End Date range", state.campaign.dateRange),
        this.numberRange("Budgeted Cost ($)", state.campaign.budgetedCost, { min: 0, max: 1_000_000 }),
      ])
    );

    formEl.appendChild(
      this.renderObjectSection("Campaign Member", [
        this.numberRange("Contacts per Campaign (ratio)", state.campaignMember.contactsPerCampaign, {
          min: 0,
          max: 500,
        }),
        this.weightedList("Status weights", state.campaignMember.statuses),
      ])
    );

    formEl.appendChild(this.renderBackdatingSection(state.backdating));

    const submitRow = document.createElement("div");
    submitRow.className = "field-row";
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn";
    submitBtn.textContent = "Generate Data";
    submitRow.appendChild(submitBtn);
    formEl.appendChild(submitRow);

    formEl.onsubmit = (e) => {
      e.preventDefault();
      window.generateView.startGeneration(this.state);
      window.mainNav.switchTo("results");
    };
  },

  renderObjectSection(title, fields) {
    const section = document.createElement("div");
    section.className = "object-section";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    section.appendChild(h3);
    fields.forEach((f) => section.appendChild(f));
    return section;
  },

  numberField(label, obj, key, opts = {}) {
    const row = document.createElement("div");
    row.className = "field-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    if (opts.min !== undefined) input.min = opts.min;
    if (opts.max !== undefined) input.max = opts.max;
    input.step = opts.step ?? "any";
    input.value = obj[key];
    input.addEventListener("input", () => {
      obj[key] = Number(input.value);
    });
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  },

  probabilityField(label, obj, key) {
    const row = document.createElement("div");
    row.className = "field-row";
    const lbl = document.createElement("label");
    lbl.textContent = `${label} (0-1)`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.max = 1;
    input.step = 0.05;
    input.value = obj[key];
    input.addEventListener("input", () => {
      obj[key] = Number(input.value);
    });
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  },

  numberRange(label, range, opts = {}) {
    const row = document.createElement("div");
    row.className = "field-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const minInput = document.createElement("input");
    minInput.type = "number";
    if (opts.min !== undefined) minInput.min = opts.min;
    if (opts.max !== undefined) minInput.max = opts.max;
    minInput.value = range.min;
    minInput.addEventListener("input", () => {
      range.min = Number(minInput.value);
    });
    const to = document.createElement("span");
    to.textContent = "to";
    const maxInput = document.createElement("input");
    maxInput.type = "number";
    if (opts.min !== undefined) maxInput.min = opts.min;
    if (opts.max !== undefined) maxInput.max = opts.max;
    maxInput.value = range.max;
    maxInput.addEventListener("input", () => {
      range.max = Number(maxInput.value);
    });
    row.appendChild(lbl);
    row.appendChild(minInput);
    row.appendChild(to);
    row.appendChild(maxInput);
    return row;
  },

  dateRange(label, range) {
    const row = document.createElement("div");
    row.className = "field-row";
    const lbl = document.createElement("label");
    lbl.textContent = label;
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.value = range.start;
    startInput.addEventListener("input", () => {
      range.start = startInput.value;
    });
    const to = document.createElement("span");
    to.textContent = "to";
    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.value = range.end;
    endInput.addEventListener("input", () => {
      range.end = endInput.value;
    });
    row.appendChild(lbl);
    row.appendChild(startInput);
    row.appendChild(to);
    row.appendChild(endInput);
    return row;
  },

  weightedList(label, options) {
    const wrap = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.textContent = label;
    lbl.style.display = "block";
    lbl.style.marginBottom = "0.25rem";
    lbl.style.fontSize = "0.9rem";
    wrap.appendChild(lbl);

    const list = document.createElement("div");
    list.className = "weighted-list";
    wrap.appendChild(list);

    const renderRows = () => {
      list.innerHTML = "";
      options.forEach((opt, idx) => {
        const row = document.createElement("div");
        row.className = "weighted-row";

        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.value = opt.value;
        valueInput.addEventListener("input", () => {
          opt.value = valueInput.value;
        });

        const weightInput = document.createElement("input");
        weightInput.type = "number";
        weightInput.min = 0.1;
        weightInput.step = 0.1;
        weightInput.value = opt.weight;
        weightInput.addEventListener("input", () => {
          opt.weight = Number(weightInput.value);
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "remove-row-btn";
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove";
        removeBtn.addEventListener("click", () => {
          if (options.length <= 1) return;
          options.splice(idx, 1);
          renderRows();
        });

        row.appendChild(valueInput);
        row.appendChild(weightInput);
        row.appendChild(removeBtn);
        list.appendChild(row);
      });

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "add-row-btn";
      addBtn.textContent = "+ Add option";
      addBtn.addEventListener("click", () => {
        options.push({ value: "New Value", weight: 1 });
        renderRows();
      });
      list.appendChild(addBtn);
    };

    renderRows();
    return wrap;
  },

  renderBackdatingSection(backdating) {
    const section = document.createElement("div");
    section.className = "object-section";
    const h3 = document.createElement("h3");
    h3.textContent = "Backdate Created Date";
    section.appendChild(h3);

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      "Optional. Requires your org to grant the connected user the \"Set Audit Fields upon " +
      "Record Creation\" permission — if it isn't available, the app falls back to real creation " +
      "timestamps automatically and tells you in the results.";
    section.appendChild(hint);

    const enableRow = document.createElement("div");
    enableRow.className = "field-row";
    const enableLbl = document.createElement("label");
    enableLbl.textContent = "Enable backdating";
    const enableInput = document.createElement("input");
    enableInput.type = "checkbox";
    enableInput.checked = !!backdating.enabled;

    const rangeRow = this.dateRange(
      "Created Date range",
      backdating.createdDateRange ?? { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }
    );
    backdating.createdDateRange = backdating.createdDateRange ?? {
      start: new Date().toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    };
    rangeRow.style.display = backdating.enabled ? "flex" : "none";

    enableInput.addEventListener("change", () => {
      backdating.enabled = enableInput.checked;
      rangeRow.style.display = backdating.enabled ? "flex" : "none";
    });

    enableRow.appendChild(enableLbl);
    enableRow.appendChild(enableInput);
    section.appendChild(enableRow);
    section.appendChild(rangeRow);

    return section;
  },
};
