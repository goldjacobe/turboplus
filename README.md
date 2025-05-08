# TurboPlus

A nicer interface to autocomplete turbo builds in your Turborepo monorepo.

## Installation

```bash
npm install -g turboplus
# or
yarn global add turboplus
```

## Usage

Run any turbo command with package selection:

```bash
tp <command>
```

For example:

```bash
tp build
```

This will open a fuzzy-finder interface that lets you select which package to run the command on. Once selected, it will execute:

```bash
turbo run build --filter=<selected-package>
```

## Features

- Fuzzy search through all packages in your Turborepo
- Works with any turbo command (build, test, lint, etc.)
- Automatically detects Turborepo packages and workspaces

## License

MIT