# @sprigcode/schema

JSON schema for the Sprigcode Transaction Format.

## What it provides

`@sprigcode/schema` exports the schema and a small validation helper for the
transaction document shape used by Sprigcode.

## Install

```bash
npm install @sprigcode/schema
```

## Usage

```ts
import { sprigcodeSchema, validateTransactionShape } from "@sprigcode/schema";

const result = validateTransactionShape({
  version: "0.1",
  language: "typescript",
  ops: []
});

console.log(result.valid);
console.log(sprigcodeSchema.$schema);
```

## Repository

https://github.com/moengadaniel/sprigcode

## License

Apache-2.0
