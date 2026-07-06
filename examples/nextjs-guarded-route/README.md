# Next.js Guarded Route

This example shows a small Next.js-style route handler where Sprigcode inserts
an authorization guard before a sensitive call.

It is not a full Next.js app. The fixture is intentionally small so the semantic
edit is easy to review.

## Scenario

`src/app/api/billing/route.ts` charges a customer:

```ts
import { chargeCustomer } from "@/lib/billing";

export async function POST(request: Request) {
  const body = await request.json();

  const invoice = await chargeCustomer(body.customerId, body.amount);

  return Response.json({ invoiceId: invoice.id });
}
```

The transaction:

- adds `requireAdmin` from `@/lib/authz`
- inserts `await requireAdmin(request);` before the `chargeCustomer` call
- requires exactly one match
- requires the transaction to be idempotent

## Run it

```bash
npx @sprigcode/cli apply examples/nextjs-guarded-route/transaction.sprigcode.json --workspace examples/nextjs-guarded-route/before
```

From a local build, use:

```bash
node packages/cli/dist/index.js apply examples/nextjs-guarded-route/transaction.sprigcode.json --workspace examples/nextjs-guarded-route/before
```

## Expected result

```ts
import { chargeCustomer } from "@/lib/billing";
import { requireAdmin } from "@/lib/authz";

export async function POST(request: Request) {
  const body = await request.json();

  await requireAdmin(request);
  const invoice = await chargeCustomer(body.customerId, body.amount);

  return Response.json({ invoiceId: invoice.id });
}
```

## What this proves

The example demonstrates a realistic guarded-route edit using only the current
operation set. It preserves unrelated code, targets a specific sensitive call,
adds the required import, and refuses if the call anchor is not unique.
