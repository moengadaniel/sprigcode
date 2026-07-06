# @sprigcode/cli

CLI for Sprigcode semantic edit transactions.

## What it provides

`@sprigcode/cli` exposes the `sprigcode` binary for validating, checking,
applying, and explaining Sprigcode transactions.

## Install

```bash
npm install -D @sprigcode/cli
```

## Usage

After local install:

```bash
npx sprigcode --help
npx sprigcode validate transaction.sprigcode.json
npx sprigcode apply transaction.sprigcode.json --workspace .
```

For one-off use without installing:

```bash
npx @sprigcode/cli --help
npx @sprigcode/cli validate transaction.sprigcode.json
npx @sprigcode/cli apply transaction.sprigcode.json --workspace .
```

## Repository

https://github.com/moengadaniel/sprigcode

## License

Apache-2.0
