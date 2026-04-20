import { sendPasswordResetEmail } from "@/lib/mail";

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(email);
}

