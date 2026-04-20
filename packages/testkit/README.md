# @sprigcode/testkit

Fixture and golden-test utilities for Sprigcode adapters.

## What it provides

`@sprigcode/testkit` helps adapter and engine authors run golden before/after
tests against temporary workspaces.

## Install

```bash
npm install @sprigcode/core @sprigcode/testkit
```

## Usage

```ts
import { runGoldenCase } from "@sprigcode/testkit";

await runGoldenCase("/path/to/example", []);
```

## Repository

https://github.com/eat-apples/sprigcode

## License

Apache-2.0

