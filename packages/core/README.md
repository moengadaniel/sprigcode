# @sprigcode/core

Core engine for Sprigcode semantic edit transactions.

## What it provides

`@sprigcode/core` contains the language-agnostic transaction lifecycle, typed
errors, low-level text edit application, diff reporting, rollback, and result
objects.

## Install

```bash
npm install @sprigcode/core
```

## Usage

```ts
import { createTransaction, validateTransactionDocument } from "@sprigcode/core";

const document = validateTransactionDocument({
  version: "0.1",
  language: "typescript",
  ops: []
});

const tx = await createTransaction({
  document,
  workspace: process.cwd(),
  adapters: []
});
```

Use `@sprigcode/core` together with a language adapter such as `@sprigcode/ts`.

## Repository

https://github.com/eat-apples/sprigcode

## License

Apache-2.0

