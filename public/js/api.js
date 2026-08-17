const api = {
  async getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json();
  },

  async postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  },

  async del(url) {
    const res = await fetch(url, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  },

  getVersion() {
    return api.getJSON("/api/version");
  },
  getOrg() {
    return api.getJSON("/api/org");
  },
  getDefaults() {
    return api.getJSON("/api/config/defaults");
  },
  generate(config) {
    return api.postJSON("/api/generate", config);
  },
  listRuns() {
    return api.getJSON("/api/runs");
  },
  getRun(id) {
    return api.getJSON(`/api/runs/${id}`);
  },
  deleteRun(id) {
    return api.del(`/api/runs/${id}`);
  },
  disconnect() {
    return fetch("/oauth/logout", { method: "POST" });
  },
};
