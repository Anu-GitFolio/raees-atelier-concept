import {
  products,
  ApiError,
  quote,
  resolveLine,
  validateProfile,
} from "./domain.js";
const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const statement = (db, sql, ...params) => db.prepare(sql).bind(...params);
const one = (db, sql, ...params) => statement(db, sql, ...params).first();
const hash = async (token) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
function state(row) {
  return {
    cart: quote(JSON.parse(row.cart)),
    wishlist: JSON.parse(row.wishlist),
    profile: JSON.parse(row.profile),
    revision: row.revision,
    expires: row.expires,
  };
}
async function body(req) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("invalid_request", 415);
  const reader = req.body?.getReader();
  let size = 0,
    parts = [];
  if (!reader) throw new ApiError("invalid_request");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new ApiError("request_too_large", 413);
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new ApiError("invalid_request");
  }
}
async function api(req, env) {
  const url = new URL(req.url),
    path = url.pathname,
    db = env.DB,
    now = Date.now();
  if (path === "/api/catalog" && req.method === "GET")
    return json({ products, asOf: "2026-09-16" }, 200, {
      "Cache-Control": "public, max-age=300",
    });
  if (
    req.method !== "GET" &&
    (req.headers.get("Origin") !== url.origin ||
      req.headers.get("X-Requested-With") !== "raees-concept")
  )
    throw new ApiError("forbidden", 403);
  const raw = req.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)raees_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  let sid = raw ? await hash(raw) : "",
    row = sid
      ? await one(
          db,
          "SELECT * FROM sessions WHERE id = ? AND expires > ?",
          sid,
          now,
        )
      : null;
  let cookie;
  if (!row) {
    if (path !== "/api/session" || req.method !== "POST")
      throw new ApiError("session_expired", 401);
    const fresh = token();
    sid = await hash(fresh);
    await db.batch([
      statement(
        db,
        "DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires < ? LIMIT 100)",
        now,
      ),
      statement(
        db,
        "INSERT INTO sessions (id, expires) VALUES (?, ?)",
        sid,
        now + 30 * 86400000,
      ),
    ]);
    row = await one(db, "SELECT * FROM sessions WHERE id = ?", sid);
    cookie = `raees_session=${fresh}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol === "https:" ? "; Secure" : ""}`;
  }
  const respond = (data, status = 200) =>
    json(data, status, cookie ? { "Set-Cookie": cookie } : {});
  if (path === "/api/session" && req.method === "POST")
    return respond(state(row));
  if (path === "/api/state" && req.method === "GET") return respond(state(row));
  if (path === "/api/orders" && req.method === "GET") {
    const result = await statement(
      db,
      "SELECT id,items,subtotal,shipping,total,created FROM orders WHERE session_id = ? ORDER BY created DESC LIMIT 50",
      sid,
    ).all();
    return respond({
      orders: result.results.map((o) => ({ ...o, items: JSON.parse(o.items) })),
    });
  }
  if (path.startsWith("/api/orders/") && req.method === "GET") {
    const order = await one(
      db,
      "SELECT id,items,subtotal,shipping,total,created FROM orders WHERE id = ? AND session_id = ?",
      path.slice(12),
      sid,
    );
    if (!order) throw new ApiError("not_found", 404);
    return respond({ order: { ...order, items: JSON.parse(order.items) } });
  }
  if (req.method === "GET") throw new ApiError("not_found", 404);
  const limited = await statement(
    db,
    "UPDATE sessions SET requests = CASE WHEN window < ? THEN 1 ELSE requests + 1 END, window = CASE WHEN window < ? THEN ? ELSE window END WHERE id = ? AND (window < ? OR requests < 120) RETURNING id",
    now - 60000,
    now - 60000,
    now,
    sid,
    now - 60000,
  ).first();
  if (!limited) throw new ApiError("rate_limited", 429);
  const data = await body(req);
  if (path === "/api/reset" && req.method === "POST") {
    await statement(db, "DELETE FROM sessions WHERE id = ?", sid).run();
    return json({ deleted: true }, 200, {
      "Set-Cookie": `raees_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${url.protocol === "https:" ? "; Secure" : ""}`,
    });
  }
  if (path === "/api/orders" && req.method === "POST") {
    if (typeof data.key !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(data.key))
      throw new ApiError("invalid_request");
    const old = await one(
      db,
      "SELECT id FROM orders WHERE session_id = ? AND idempotency_key = ?",
      sid,
      data.key,
    );
    if (old) return respond({ orderId: old.id, state: state(row) });
    if (data.revision !== row.revision) throw new ApiError("conflict", 409);
    const q = quote(JSON.parse(row.cart));
    if (!q.items.length) throw new ApiError("empty_cart");
    const id = crypto.randomUUID();
    await db.batch([
      statement(
        db,
        "INSERT INTO orders (id,session_id,idempotency_key,items,subtotal,shipping,total,created) SELECT ?,id,?,?,?,?,?,? FROM sessions WHERE id = ? AND revision = ? AND (SELECT count(*) FROM orders WHERE session_id = ?) < 50 ON CONFLICT(session_id,idempotency_key) DO NOTHING",
        id,
        data.key,
        JSON.stringify(q.items),
        q.subtotal,
        q.shipping,
        q.total,
        now,
        sid,
        data.revision,
        sid,
      ),
      statement(
        db,
        "UPDATE sessions SET cart = '[]', revision = revision + 1 WHERE id = ? AND revision = ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND session_id = ?)",
        sid,
        data.revision,
        id,
        sid,
      ),
    ]);
    const order = await one(
      db,
      "SELECT id FROM orders WHERE session_id = ? AND idempotency_key = ?",
      sid,
      data.key,
    );
    if (!order) throw new ApiError("conflict", 409);
    row = await one(db, "SELECT * FROM sessions WHERE id = ?", sid);
    return respond({ orderId: order.id, state: state(row) }, 201);
  }
  if (data.revision !== row.revision) throw new ApiError("conflict", 409);
  let column, value;
  if (path === "/api/cart" && req.method === "PUT") {
    const q = quote(data.items);
    column = "cart";
    value = JSON.stringify(
      q.items.map(({ productId, variantId, quantity }) => ({
        productId,
        variantId,
        quantity,
      })),
    );
  } else if (path === "/api/wishlist" && req.method === "PUT") {
    if (
      !Array.isArray(data.ids) ||
      data.ids.length > 29 ||
      data.ids.some((id) => !products.some((p) => p.id === id))
    )
      throw new ApiError("invalid_product");
    column = "wishlist";
    value = JSON.stringify([...new Set(data.ids)]);
  } else if (path === "/api/profile" && req.method === "PUT") {
    column = "profile";
    value = JSON.stringify(validateProfile(data));
  } else if (path === "/api/reorder" && req.method === "POST") {
    if (
      typeof data.orderId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(data.orderId)
    )
      throw new ApiError("invalid_request");
    const order = await one(
      db,
      "SELECT items FROM orders WHERE id = ? AND session_id = ?",
      data.orderId,
      sid,
    );
    if (!order) throw new ApiError("not_found", 404);
    const current = JSON.parse(row.cart);
    for (const line of JSON.parse(order.items)) {
      resolveLine(line);
      const match = current.find((l) => l.variantId === line.variantId);
      if (match) match.quantity = Math.min(10, match.quantity + line.quantity);
      else
        current.push({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
        });
    }
    quote(current);
    column = "cart";
    value = JSON.stringify(current);
  } else throw new ApiError("not_found", 404);
  // Column is selected only from the fixed allowlist above; values are always bound.
  const result = await statement(
    db,
    `UPDATE sessions SET ${column} = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING *`,
    value,
    sid,
    data.revision,
  ).first();
  if (!result) throw new ApiError("conflict", 409);
  return respond(state(result));
}
export default {
  async fetch(req, env) {
    let res;
    try {
      const url = new URL(req.url);
      if (url.pathname.startsWith("/api/")) res = await api(req, env);
      else {
        const target = new URL(req.url);
        if (
          !/\.[a-z0-9]+$/i.test(target.pathname) &&
          !target.pathname.startsWith("/__qa/")
        )
          target.pathname = "/";
        res = await env.ASSETS.fetch(new Request(target, req));
      }
    } catch (err) {
      if (!(err instanceof ApiError))
        console.error("Request failed", err.message);
      res = json(
        {
          error: err instanceof ApiError ? err.message : "service_unavailable",
        },
        err.status || 503,
      );
    }
    const secure = new Response(res.body, res);
    secure.headers.set("X-Content-Type-Options", "nosniff");
    secure.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secure.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    secure.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
    );
    return secure;
  },
};
