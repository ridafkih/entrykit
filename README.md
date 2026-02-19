<div align="center">
  <h1>entrykit</h1>
  <p>Structured entrypoints for Node.js services.</p>
  <p>A tiny wrapper for defining service entrypoints with validated environment variables, setup/teardown lifecycle hooks, and graceful shutdown handling. Built on <a href="https://github.com/arktypeio/arktype">ArkType</a> for runtime type-safe env parsing.</p>
  <span>
    <a href="#installation">Installation</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#usage">Usage</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#api">API</a>
    <span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
    <a href="#contribute">Contribute</a>
  </span>
</div>
<hr>

## Installation

To install entrykit, simply use your favourite Node.js package manager.

```bash
bun add entrykit
```

```bash
pnpm add entrykit
```

```bash
yarn add entrykit
```

```bash
npm install entrykit
```

## Usage

### Basic Entrypoint

```ts
import { entry } from "entrykit";

entry({
  name: "my-service",
  main: () => {
    console.log("Service started.");
    return () => console.log("Shutting down.");
  },
});
```

The function returned from `main` is automatically registered as a `SIGTERM` and `SIGINT` handler for graceful shutdown.

### Environment Validation

Use the re-exported `type` from ArkType to define and validate your environment variables at startup.

```ts
import { entry, type } from "entrykit";

entry({
  name: "api-server",
  env: type({
    DATABASE_URL: "string",
    PORT: "string",
  }),
  main: ({ env }) => {
    // env.DATABASE_URL and env.PORT are validated and typed
    console.log(`Connecting to ${env.DATABASE_URL}`);
  },
});
```

If any required variable is missing or fails validation, ArkType throws before `main` ever runs.

### Setup Lifecycle

For services that need async initialization (database connections, cache warming, etc.), use the `setup` function. Its return value is passed to `main` as `extras`.

```ts
import { entry, type } from "entrykit";

entry({
  name: "api-server",
  env: type({
    DATABASE_URL: "string",
    PORT: "string",
  }),
  setup: async ({ env }) => {
    const db = await connectToDatabase(env.DATABASE_URL);
    return { db };
  },
  main: ({ env, extras }) => {
    // extras.db is the resolved value from setup
    startServer(extras.db, env.PORT);

    return () => extras.db.disconnect();
  },
});
```

## API

### `entry(options)`

Defines and immediately runs a service entrypoint. Returns `Promise<MaybeCleanupFunction>`.

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Service name |
| `env` | `Type` | ArkType schema for `process.env` validation |
| `setup` | `(options: { env }) => MaybePromise<T>` | Optional async setup, result passed to `main` as `extras` |
| `main` | `(options: { env, extras? }) => MaybePromise<CleanupFn>` | Service entrypoint, may return a cleanup function |

If `main` returns a function, it is registered as a handler for both `SIGTERM` and `SIGINT`.

### Re-exports

`type` is re-exported from `arktype` for convenience, so you don't need it as a direct dependency.

## Contribute

Feel free to contribute to the repository. Pull requests and issues with feature requests are _super_ welcome!
