import { sendPasswordResetEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function requestPasswordReset(email: string) {
  await rateLimit.check(email);
  await sendPasswordResetEmail(email);
}
