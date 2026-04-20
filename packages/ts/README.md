# @sprigcode/ts

TypeScript and TSX adapter for Sprigcode semantic edit transactions.

## What it provides

`@sprigcode/ts` adds TypeScript project loading, anchor resolution, operation
planning, and typecheck verification for the current v0.1 Sprigcode workflow.

## Install

```bash
npm install @sprigcode/core @sprigcode/ts
```

## Usage

```ts
import { createTransaction, validateTransactionDocument } from "@sprigcode/core";
import { typescriptAdapter } from "@sprigcode/ts";

const document = validateTransactionDocument({
  version: "0.1",
  language: "typescript",
  ops: []
});

const tx = await createTransaction({
  document,
  workspace: process.cwd(),
  adapters: [typescriptAdapter()]
});
```

## Repository

https://github.com/eat-apples/sprigcode

## License

Apache-2.0

