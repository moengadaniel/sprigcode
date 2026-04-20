import { sendPasswordResetEmail } from "@/lib/mail";
import { saveAuditEvent } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function requestPasswordReset(email: string, tenantId: string) {
  const auditEvent = {
    type: "password_reset_requested",
    where: {
      email,
      tenantId: tenantId
    }
  };

  saveAuditEvent(auditEvent);
  await rateLimit.check(email);
  await sendPasswordResetEmail(email, tenantId);
}
