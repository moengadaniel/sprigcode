export async function chargeCustomer(customerId: string, amount: number) {
  return {
    id: `${customerId}:${amount}`
  };
}
