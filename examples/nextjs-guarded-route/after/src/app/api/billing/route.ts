import { chargeCustomer } from "@/lib/billing";
import { requireAdmin } from "@/lib/authz";

export async function POST(request: Request) {
  const body = await request.json();

  await requireAdmin(request);
  const invoice = await chargeCustomer(body.customerId, body.amount);

  return Response.json({ invoiceId: invoice.id });
}
