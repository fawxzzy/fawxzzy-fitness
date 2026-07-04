import assert from "node:assert/strict";
import test from "node:test";

import { reconcileCancelledProCheckoutWithDeps } from "@/lib/billing/reconcile-cancelled-checkout";

function createAdminDouble(args: {
  pendingPurchase?: Record<string, unknown> | null;
  pendingPurchases?: Array<Record<string, unknown>>;
  selectError?: string | null;
  updateError?: string | null;
  updates?: Array<Record<string, unknown>>;
}) {
  const updates = args.updates ?? [];
  const pendingPurchases = args.pendingPurchases
    ?? (args.pendingPurchase ? [args.pendingPurchase] : []);

  return {
    from(table: string) {
      assert.equal(table, "billing_purchases");
      return {
        select() {
          return {
            eq() {
              return this;
            },
            async order() {
              return {
                data: pendingPurchases,
                error: args.selectError ? { message: args.selectError } : null,
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({
                    error: args.updateError ? { message: args.updateError } : null,
                  });
                },
              };
            },
          };
        },
      };
    },
    updates,
  };
}

function createStripeDouble(args: {
  status?: "open" | "complete" | "expired";
  paymentStatus?: string | null;
}) {
  const calls = {
    retrieve: [] as string[],
    expire: [] as string[],
  };

  return {
    calls,
    checkout: {
      sessions: {
        async retrieve(sessionId: string) {
          calls.retrieve.push(sessionId);
          return {
            id: sessionId,
            status: args.status ?? "open",
            payment_status: args.paymentStatus ?? "unpaid",
          };
        },
        async expire(sessionId: string) {
          calls.expire.push(sessionId);
          return { id: sessionId };
        },
      },
    },
  };
}

test("reconcileCancelledProCheckoutWithDeps returns noop when no pending purchase exists", async () => {
  const admin = createAdminDouble({ pendingPurchase: null });
  const stripe = createStripeDouble({});

  const result = await reconcileCancelledProCheckoutWithDeps("user-1", {
    admin: admin as never,
    stripe: stripe as never,
  });

  assert.deepEqual(result, {
    ok: true,
    status: "noop",
    purchaseId: null,
    purchaseIds: [],
  });
  assert.equal(stripe.calls.retrieve.length, 0);
  assert.equal(admin.updates.length, 0);
});

test("reconcileCancelledProCheckoutWithDeps expires open checkout sessions and marks the purchase cancelled", async () => {
  const admin = createAdminDouble({
    pendingPurchase: {
      id: "purchase-1",
      stripe_checkout_session_id: "cs_123",
    },
  });
  const stripe = createStripeDouble({ status: "open", paymentStatus: "unpaid" });

  const result = await reconcileCancelledProCheckoutWithDeps("user-1", {
    admin: admin as never,
    stripe: stripe as never,
  });

  assert.deepEqual(result, {
    ok: true,
    status: "cancelled",
    purchaseId: "purchase-1",
    purchaseIds: ["purchase-1"],
  });
  assert.deepEqual(stripe.calls.retrieve, ["cs_123"]);
  assert.deepEqual(stripe.calls.expire, ["cs_123"]);
  assert.deepEqual(admin.updates, [{ status: "cancelled" }]);
});

test("reconcileCancelledProCheckoutWithDeps leaves completed checkout sessions alone", async () => {
  const admin = createAdminDouble({
    pendingPurchase: {
      id: "purchase-2",
      stripe_checkout_session_id: "cs_complete",
    },
  });
  const stripe = createStripeDouble({ status: "complete", paymentStatus: "paid" });

  const result = await reconcileCancelledProCheckoutWithDeps("user-1", {
    admin: admin as never,
    stripe: stripe as never,
  });

  assert.deepEqual(result, {
    ok: true,
    status: "completed",
    purchaseId: "purchase-2",
    purchaseIds: ["purchase-2"],
  });
  assert.deepEqual(stripe.calls.retrieve, ["cs_complete"]);
  assert.deepEqual(stripe.calls.expire, []);
  assert.equal(admin.updates.length, 0);
});

test("reconcileCancelledProCheckoutWithDeps cancels every pending checkout receipt before a new attempt", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const admin = {
    from(table: string) {
      assert.equal(table, "billing_purchases");
      return {
        select() {
          return {
            eq() {
              return this;
            },
            order() {
              return Promise.resolve({
                data: [
                  { id: "purchase-new", stripe_checkout_session_id: "cs_new" },
                  { id: "purchase-old", stripe_checkout_session_id: "cs_old" },
                ],
                error: null,
              });
            },
          };
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  const stripe = createStripeDouble({ status: "open", paymentStatus: "unpaid" });

  const result = await reconcileCancelledProCheckoutWithDeps("user-1", {
    admin: admin as never,
    stripe: stripe as never,
  });

  assert.deepEqual(result, {
    ok: true,
    status: "cancelled",
    purchaseId: "purchase-new",
    purchaseIds: ["purchase-new", "purchase-old"],
  });
  assert.deepEqual(stripe.calls.retrieve, ["cs_new", "cs_old"]);
  assert.deepEqual(stripe.calls.expire, ["cs_new", "cs_old"]);
  assert.deepEqual(updates, [{ status: "cancelled" }, { status: "cancelled" }]);
});
