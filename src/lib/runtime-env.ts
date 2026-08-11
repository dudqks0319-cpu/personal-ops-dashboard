import { defineEnv, fields } from "@youngbin-studio/env";
import { nextEnv } from "@youngbin-studio/env/adapters/next";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function parseDashboardEnv(source: EnvironmentSource = process.env) {
  return defineEnv({
    app: "personal-ops-dashboard",
    environment: source.NODE_ENV ?? "development",
    server: {
      NODE_ENV: fields.enum(["development", "test", "production"] as const, {
        default: "development",
      }),
      DASHBOARD_STORAGE_MODE: fields.enum(["file"] as const, { default: "file" }),
    },
    client: {},
  }).parse(nextEnv({ server: source, client: {} })).server;
}

export const dashboardEnv = parseDashboardEnv();
