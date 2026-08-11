# Studio Kit env v0.1 adoption

- Artifact: `vendor/youngbin-studio-env-0.1.1.tgz`
- Exact package version: `0.1.1`
- Initial boundary: `NODE_ENV`, `DASHBOARD_STORAGE_MODE`
- Provider/key rename: none
- External resource change: none

## Rollback

Remove the package dependency and `src/lib/runtime-env.ts`, then restore the
file-backed `data` path in `src/lib/store.ts`. No data migration, credential
rotation, or provider rollback is required.
