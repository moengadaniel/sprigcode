# Password Reset Hardening

This example shows why Sprigcode is different from raw diffs or unrestricted
`write_file`.

The transaction does five coordinated edits:

1. Adds a new import for `rateLimit`.
2. Adds a required `tenantId` parameter to `requestPasswordReset`.
3. Updates direct call sites with an explicit `tenantId` value.
4. Extends the audit event object literal with `tenantId`.
5. Inserts a rate-limit check before the email send and updates the call
   expression to pass the new argument.

A raw diff could represent the final text, but it would not explain intent or
let the engine validate anchor uniqueness, match counts, idempotence, or
call-site updates. Sprigcode makes those semantics explicit.

