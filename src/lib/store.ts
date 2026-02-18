import { promises as fs } from "fs";
import path from "path";
import { normalizeLaunchpadUrl } from "@/lib/launchpad";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: "high" | "medium" | "low";
  createdAt: string;
};

export type FocusSession = {
  id: string;
  minutes: number;
  createdAt: string;
};

export type Journal = {
  id: string;
  text: string;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  when: string;
  createdAt: string;
};

export type LaunchpadItem = {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  launchCount: number;
  lastLaunchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  tasks: Task[];
  focusSessions: FocusSession[];
  journals: Journal[];
  events: CalendarEvent[];
  launchpad: LaunchpadItem[];
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "dashboard.json");
const backupFile = path.join(dataDir, "dashboard.backup.json");
const tempFile = path.join(dataDir, "dashboard.json.tmp");

const validPriorities = new Set<Task["priority"]>(["high", "medium", "low"]);
let writeQueue: Promise<void> = Promise.resolve();

function createDefaultData(): DashboardData {
  return {
    tasks: [],
    focusSessions: [],
    journals: [],
    events: [],
    launchpad: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asIsoString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return fallback;
  return new Date(timestamp).toISOString();
}

function asOptionalIsoString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function asFallbackId(prefix: string, index: number, seed?: unknown): string {
  const raw = typeof seed === "string" ? seed : `${index}`;
  const compact = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16) || `${index}`;
  return `${prefix}-${compact}-${index}`;
}

function asNonNegativeInteger(value: unknown, fallback = 0): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  if (next < 0) return 0;
  return Math.floor(next);
}

function normalizeData(raw: unknown): DashboardData {
  const candidate = isRecord(raw) ? raw : {};

  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.flatMap((item, index) => {
        if (!isRecord(item)) return [];

        const title = asTrimmedString(item.title);
        if (!title) return [];

        const createdAt = asIsoString(item.createdAt, new Date().toISOString());
        const priority = validPriorities.has(item.priority as Task["priority"])
          ? (item.priority as Task["priority"])
          : "medium";

        return [
          {
            id: asTrimmedString(item.id) ?? asFallbackId("task", index, title),
            title,
            done: Boolean(item.done),
            priority,
            createdAt,
          },
        ];
      })
    : [];

  const focusSessions = Array.isArray(candidate.focusSessions)
    ? candidate.focusSessions.flatMap((item, index) => {
        if (!isRecord(item)) return [];

        const minutes = asNonNegativeInteger(item.minutes, 25);
        if (minutes <= 0) return [];

        return [
          {
            id: asTrimmedString(item.id) ?? asFallbackId("focus", index, item.createdAt),
            minutes,
            createdAt: asIsoString(item.createdAt, new Date().toISOString()),
          },
        ];
      })
    : [];

  const journals = Array.isArray(candidate.journals)
    ? candidate.journals.flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const text = asTrimmedString(item.text);
        if (!text) return [];

        return [
          {
            id: asTrimmedString(item.id) ?? asFallbackId("journal", index, text),
            text,
            createdAt: asIsoString(item.createdAt, new Date().toISOString()),
          },
        ];
      })
    : [];

  const events = Array.isArray(candidate.events)
    ? candidate.events.flatMap((item, index) => {
        if (!isRecord(item)) return [];

        const title = asTrimmedString(item.title);
        if (!title) return [];

        return [
          {
            id: asTrimmedString(item.id) ?? asFallbackId("event", index, title),
            title,
            when: asIsoString(item.when, new Date().toISOString()),
            createdAt: asIsoString(item.createdAt, new Date().toISOString()),
          },
        ];
      })
    : [];

  const launchpad = Array.isArray(candidate.launchpad)
    ? candidate.launchpad.flatMap((item, index) => {
        if (!isRecord(item)) return [];

        const name = asTrimmedString(item.name);
        const url = normalizeLaunchpadUrl(item.url);
        if (!name || !url) return [];

        const createdAt = asIsoString(item.createdAt, new Date().toISOString());
        const updatedAt = asIsoString(item.updatedAt, createdAt);

        return [
          {
            id: asTrimmedString(item.id) ?? asFallbackId("launchpad", index, `${name}-${url}`),
            name,
            url,
            description: typeof item.description === "string" ? item.description.trim() : "",
            enabled: typeof item.enabled === "boolean" ? item.enabled : true,
            launchCount: asNonNegativeInteger(item.launchCount, 0),
            lastLaunchedAt: asOptionalIsoString(item.lastLaunchedAt),
            createdAt,
            updatedAt,
          },
        ];
      })
    : [];

  return {
    tasks,
    focusSessions,
    journals,
    events,
    launchpad,
  };
}

async function readAndNormalize(filePath: string): Promise<DashboardData> {
  const raw = await fs.readFile(filePath, "utf-8");
  return normalizeData(JSON.parse(raw));
}

async function writeDataToDisk(next: DashboardData) {
  await fs.mkdir(dataDir, { recursive: true });
  const payload = JSON.stringify(next, null, 2);

  try {
    await fs.copyFile(dataFile, backupFile);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;
    if (fileError.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(tempFile, payload, "utf-8");
  await fs.rename(tempFile, dataFile);
}

function enqueueWrite<T>(job: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(job, job);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readData(): Promise<DashboardData> {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    return await readAndNormalize(dataFile);
  } catch {
    try {
      const recovered = await readAndNormalize(backupFile);
      await writeDataToDisk(recovered);
      return recovered;
    } catch {
      const fallback = createDefaultData();
      await writeDataToDisk(fallback);
      return fallback;
    }
  }
}

export async function writeData(next: DashboardData) {
  const normalized = normalizeData(next);
  await enqueueWrite(async () => {
    await writeDataToDisk(normalized);
  });
}

export async function updateData<T>(mutate: (draft: DashboardData) => T | Promise<T>): Promise<T> {
  return enqueueWrite(async () => {
    const draft = await readData();
    const result = await mutate(draft);
    await writeDataToDisk(normalizeData(draft));
    return result;
  });
}

export function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
