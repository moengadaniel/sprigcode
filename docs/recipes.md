# Recipes

## Problem

Users will eventually want reusable higher-level edit flows, not just
individual operations.

## Current design choice

Recipes are intentionally deferred in v0.1.

The project is still proving the primitive:

- typed transactions
- semantic anchors
- deterministic planning
- typed refusal

## Limitation

Adding recipe abstractions too early would hide gaps in the primitive and make
the supported surface look larger than it is.

## What to do next

For now, use the examples directory and explicit transaction documents as the
recipe layer.
