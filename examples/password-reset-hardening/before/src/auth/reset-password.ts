import { sendPasswordResetEmail } from "@/lib/mail";
import { saveAuditEvent } from "@/lib/audit";

export async function requestPasswordReset(email: string) {
  const auditEvent = {
    type: "password_reset_requested",
    where: {
      email
    }
  };

  saveAuditEvent(auditEvent);
  await sendPasswordResetEmail(email);
}

