export async function sendPasswordResetEmail(email: string, tenantId?: string) {
  return { email, tenantId };
}

