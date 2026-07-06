import { chargeCustomer } from "@/lib/billing";

export async function POST(request: Request) {
  const body = await request.json();

  const invoice = await chargeCustomer(body.customerId, body.amount);

  return Response.json({ invoiceId: invoice.id });
}
