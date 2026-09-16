import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:8787";
function client() {
  let cookie = "";
  return async (path, method = "GET", body, extra = {}) => {
    const r = await fetch(base + "/api/" + path, {
      method,
      headers: {
        Origin: base,
        "X-Requested-With": "raees-concept",
        "Content-Type": "application/json",
        Cookie: cookie,
        ...extra,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, body: await r.json(), headers: r.headers };
  };
}
test("Complete persistent journey, server pricing, isolation, conflict and idempotency", async () => {
  const a = client(),
    b = client();
  const {
    body: { products },
  } = await a("catalog");
  const p = products.find((p) => p.id === "raeesi"),
    v = p.variants[0];
  let s = (await a("session", "POST", {})).body;
  assert.equal(s.revision, 0);
  let other = (await b("session", "POST", {})).body;
  let r = await a("wishlist", "PUT", { ids: [p.id], revision: s.revision });
  assert.equal(r.status, 200);
  s = r.body;
  assert.deepEqual(s.wishlist, [p.id]);
  assert.deepEqual((await b("state")).body.wishlist, []);
  r = await a("cart", "PUT", {
    items: [{ productId: p.id, variantId: v.id, quantity: 2, price: 1 }],
    revision: s.revision,
    total: 1,
  });
  assert.equal(r.status, 200);
  s = r.body;
  assert.equal(s.cart.subtotal, 70000);
  assert.equal(s.cart.total, 72500);
  assert.equal(
    (await a("cart", "PUT", { items: [], revision: 0 })).status,
    409,
  );
  assert.equal(
    (
      await a("cart", "PUT", {
        items: [{ productId: p.id, variantId: v.id, quantity: -1 }],
        revision: s.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a("cart", "PUT", {
        items: [{ productId: "bad", variantId: v.id, quantity: 1 }],
        revision: s.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a(
        "cart",
        "PUT",
        { items: [], revision: s.revision },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  const key = crypto.randomUUID();
  const results = await Promise.all([
    a("orders", "POST", { key, revision: s.revision }),
    a("orders", "POST", { key, revision: s.revision }),
  ]);
  assert.ok(
    results.every((x) => [200, 201].includes(x.status)),
    JSON.stringify(results),
  );
  assert.equal(results[0].body.orderId, results[1].body.orderId);
  const history = (await a("orders")).body.orders;
  assert.equal(history.length, 1);
  assert.equal(history[0].total, 72500);
  assert.equal(
    (await a("orders/" + history[0].id)).body.order.id,
    history[0].id,
  );
  assert.equal((await b("orders/" + history[0].id)).status, 404);
  assert.equal((await a("state")).body.cart.items.length, 0);
  assert.equal((await b("orders")).body.orders.length, 0);
  assert.equal(
    (
      await b("reorder", "POST", {
        orderId: history[0].id,
        revision: other.revision,
      })
    ).status,
    404,
  );
  s = (await a("state")).body;
  r = await a("reorder", "POST", {
    orderId: history[0].id,
    revision: s.revision,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.cart.items[0].quantity, 2);
  s = r.body;
  r = await a("profile", "PUT", {
    family: "floral",
    format: "perfume",
    budget: 35000,
    revision: s.revision,
  });
  assert.equal(r.status, 200);
  assert.equal((await a("state")).body.profile.family, "floral");
  assert.equal((await a("reset", "POST", {})).status, 200);
  assert.equal((await a("state")).status, 401);
  assert.equal((await a("session", "POST", {})).body.wishlist.length, 0);
  await a("reset", "POST", {});
  await b("reset", "POST", {});
});
test("Invalid inputs, availability, duplicate lines and threshold calculations", async () => {
  const c = client();
  let s = (await c("session", "POST", {})).body;
  const {
    body: { products },
  } = await c("catalog");
  const unavailable = products.find((p) => !p.variants[0].available);
  assert.equal(
    (
      await c("cart", "PUT", {
        items: [
          {
            productId: unavailable.id,
            variantId: unavailable.variants[0].id,
            quantity: 1,
          },
        ],
        revision: s.revision,
      })
    ).body.error,
    "unavailable",
  );
  const p = products.find((p) => p.id === "raeesi"),
    line = { productId: p.id, variantId: p.variants[0].id, quantity: 3 };
  assert.equal(
    (await c("cart", "PUT", { items: [line, line], revision: s.revision }))
      .status,
    400,
  );
  assert.equal(
    (
      await c("profile", "PUT", {
        family: "<script>",
        format: "any",
        budget: 1,
        revision: s.revision,
      })
    ).status,
    400,
  );
  const r = await c("cart", "PUT", { items: [line], revision: s.revision });
  assert.equal(r.status, 200);
  assert.equal(r.body.cart.shipping, 0);
  assert.equal(r.body.cart.total, 105000);
  assert.equal(
    (await c("orders", "POST", { key: "bad", revision: r.body.revision }))
      .status,
    400,
  );
  await c("reset", "POST", {});
});
test("Malformed bodies return controlled errors and request sizes are bounded", async () => {
  const c = client();
  const s = (await c("session", "POST", {})).body;
  assert.equal((await c("cart", "PUT", null)).status, 400);
  assert.equal(
    (await c("reorder", "POST", { revision: s.revision })).status,
    400,
  );
  assert.equal(
    (await c("cart", "PUT", { items: [null], revision: s.revision })).status,
    400,
  );
  assert.equal(
    (await c("cart", "PUT", { items: "not-an-array", revision: s.revision }))
      .status,
    400,
  );
  assert.equal(
    (await c("wishlist", "PUT", { ids: ["missing"], revision: s.revision }))
      .status,
    400,
  );
  assert.equal(
    (
      await c("cart", "PUT", {
        padding: "x".repeat(9000),
        items: [],
        revision: s.revision,
      })
    ).status,
    413,
  );
  await c("reset", "POST", {});
});
