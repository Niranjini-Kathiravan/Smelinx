const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/** Types */
export type APIItem = {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  base_url?: string | null;
  docs_url?: string | null;
  contact_email?: string | null;
  owner_team?: string | null;
};

export type Version = {
  id: string;
  api_id: string;
  version: string;
  status: "active" | "deprecated" | "sunset";
  sunset_date?: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  api_id: string;
  version_id: string;
  type: "deprecate" | "sunset";
  scheduled_at: string;
  status: "pending" | "sent" | "canceled";
  created_at: string;
};

/** Helpers */
function isFetchResponse(x: any): x is Response {
  return (
    x &&
    typeof x === "object" &&
    typeof x.ok === "boolean" &&
    typeof x.status === "number" &&
    x.headers &&
    typeof x.headers.get === "function"
  );
}

async function parseOrThrow(res: any) {
  if (!isFetchResponse(res)) {
    throw new Error("Unexpected response object (not a fetch Response).");
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  try {
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const t = await res.text();
      data = t ? JSON.parse(t) : null;
    }
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    const err: any = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function j(url: string, init: RequestInit = {}) {
  return fetch(url, {
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    ...init,
  });
}

/** API client */
export const api = {
  // ---------- Auth ----------
  async login(email: string, password: string) {
    const r = await j(`${BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return parseOrThrow(r);
  },

  async signup(email: string, password: string, orgName: string) {
    const r = await j(`${BASE}/auth/signup`, {
      method: "POST",
      body: JSON.stringify({ email, password, org_name: orgName }), // camelCase
    });
    return parseOrThrow(r);
  },

  async refresh() {
    const r = await j(`${BASE}/auth/refresh`, { method: "POST" });
    return parseOrThrow(r);
  },

  async me() {
    let r = await j(`${BASE}/me`);
    if (isFetchResponse(r) && r.status === 401) {
      const rr = await j(`${BASE}/auth/refresh`, { method: "POST" });
      if (isFetchResponse(rr) && rr.ok) {
        r = await j(`${BASE}/me`);
      }
    }
    return parseOrThrow(r);
  },

  async logout() {
    const r = await j(`${BASE}/auth/logout`, { method: "POST" });
    return parseOrThrow(r);
  },

  // ---------- APIs ----------
  async listApis(): Promise<APIItem[] | null> {
    const r = await j(`${BASE}/apis`);
    return parseOrThrow(r);
  },

  async createApi(payload: {
    name: string;
    description?: string;
    base_url?: string;
    docs_url?: string;
    contact_email?: string;
    owner_team?: string;
  }): Promise<APIItem> {
    const r = await j(`${BASE}/apis`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseOrThrow(r);
  },

  async getApi(id: string): Promise<APIItem> {
    const r = await j(`${BASE}/apis/${id}`);
    return parseOrThrow(r);
  },

  async updateApi(
    id: string,
    payload: {
      name?: string;
      description?: string;
      base_url?: string;
      docs_url?: string;
      contact_email?: string;
      owner_team?: string;
    }
  ): Promise<APIItem> {
    const r = await j(`${BASE}/apis/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return parseOrThrow(r);
  },

  async deleteApi(id: string) {
    const r = await j(`${BASE}/apis/${id}`, { method: "DELETE" });
    return parseOrThrow(r);
  },

  // ---------- Versions ----------
  async listVersions(apiId: string): Promise<Version[] | null> {
    const r = await j(`${BASE}/apis/${apiId}/versions`);
    return parseOrThrow(r);
  },

  async createVersion(
    apiId: string,
    version: string,
    status: "active" | "deprecated" | "sunset",
    sunset_date?: string
  ): Promise<Version> {
    const r = await j(`${BASE}/apis/${apiId}/versions`, {
      method: "POST",
      body: JSON.stringify({ version, status, sunset_date }),
    });
    return parseOrThrow(r);
  },

  async updateVersionStatus(
    versionId: string,
    status: "active" | "deprecated" | "sunset",
    sunset_date?: string
  ): Promise<Version> {
    const r = await j(`${BASE}/versions/${versionId}`, {
      method: "PUT",
      body: JSON.stringify({ status, sunset_date }),
    });
    return parseOrThrow(r);
  },

  async deleteVersion(versionId: string) {
    const r = await j(`${BASE}/versions/${versionId}`, { method: "DELETE" });
    return parseOrThrow(r);
  },

  // ---------- Notifications ----------
  async listNotifications(apiId: string): Promise<Notification[] | null> {
    const r = await j(`${BASE}/apis/${apiId}/notifications`);
    return parseOrThrow(r);
  },

  async createNotification(
    apiId: string,
    payload: { version_id: string; type: "deprecate" | "sunset"; scheduled_at: string }
  ): Promise<Notification> {
    const r = await j(`${BASE}/apis/${apiId}/notifications`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return parseOrThrow(r);
  },

  async updateNotificationStatus(
    noteId: string,
    status: "pending" | "sent" | "canceled"
  ): Promise<Notification> {
    const r = await j(`${BASE}/notifications/${noteId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    return parseOrThrow(r);
  },

  async deleteNotification(noteId: string) {
    const r = await j(`${BASE}/notifications/${noteId}`, { method: "DELETE" });
    return parseOrThrow(r);
  },
};
