async function sendPasswordResetEmail(email: string) {
  return email;
}

export async function requestPasswordReset(primaryEmail: string, backupEmail: string) {
  await sendPasswordResetEmail(primaryEmail);
  await sendPasswordResetEmail(backupEmail);
}

