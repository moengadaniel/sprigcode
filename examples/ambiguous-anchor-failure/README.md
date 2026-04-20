# Ambiguous Anchor Failure

This example is intentionally supposed to fail.

There are two matching calls to `sendPasswordResetEmail` in the same file. The
transaction tries to insert a statement before that call using a non-unique
anchor. Sprigcode should return `ANCHOR_NOT_UNIQUE` instead of guessing.

