import { requestPasswordReset } from "@/auth/reset-password";

export async function handlePasswordReset(email: string, tenantId: string) {
  await requestPasswordReset(email, tenantId);
}

