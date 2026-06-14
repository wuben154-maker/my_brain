# packages/core — public API (M0)

> Platform-agnostic TypeScript kernel for `apps/mobile` and legacy shells.

## Allowed exports (`src/index.ts`)

| Area | Symbols |
|------|---------|
| User evolution | `UserMode`, `UserModeProfile`, `AdaptiveSignal`, `USER_MODES`, `isUserMode` |
| Errors | `ProviderConfigError`, `StorageInitError`, `SchemaMigrationError`, … |
| Env | `AppEnv`, `ReadAppEnv`, `DEFAULT_APP_ENV` |
| Providers | `VoiceProvider`, `LlmProvider`, `NewsSource`, mock factories |
| Storage port | `StoragePort`, `STORAGE_SCHEMA_VERSION` |
| Invariants | `CORE_INVARIANTS` |

## Forbidden in this package

React, React Native, Zustand, `import.meta.env`, `VITE_*`, DOM, Web Audio, UI/CSS libraries.

Enforced by `pnpm --filter @my-brain/core run lint:boundaries`.

## Wave 1 scope (M0)

Types, error classes, provider **interfaces**, mock factories, env **types** only.  
Legacy `src/domain/**` migration continues in M1; store-coupled modules stay out until deps injection.
