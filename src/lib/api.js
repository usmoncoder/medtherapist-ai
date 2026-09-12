// Yagona fetch o'ramchisi: JSON, xato kodlari va tarmoq uzilishi bir joyda
export async function api(path, { method = "GET", body, lang, signal } = {}) {
  try {
    const res = await fetch(path, {
      method,
      signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(lang ? { "x-lang": lang } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: data || { code: "SERVER_ERROR" } };
    }
    return { ok: true, status: res.status, data: data || {} };
  } catch (e) {
    if (e.name === "AbortError") return { ok: false, aborted: true, error: { code: "NETWORK" } };
    return { ok: false, status: 0, error: { code: "NETWORK" } };
  }
}

export const get = (p, o) => api(p, { ...o, method: "GET" });
export const post = (p, body, o) => api(p, { ...o, method: "POST", body });
export const patch = (p, body, o) => api(p, { ...o, method: "PATCH", body });
export const del = (p, o) => api(p, { ...o, method: "DELETE" });
