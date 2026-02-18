import { promises as fs } from "fs";
import path from "path";

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

const defaultData: DashboardData = {
  tasks: [],
  focusSessions: [],
  journals: [],
  events: [],
  launchpad: [],
};

function normalizeData(raw: unknown): DashboardData {
  const candidate = (raw ?? {}) as Partial<DashboardData>;

  return {
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    focusSessions: Array.isArray(candidate.focusSessions) ? candidate.focusSessions : [],
    journals: Array.isArray(candidate.journals) ? candidate.journals : [],
    events: Array.isArray(candidate.events) ? candidate.events : [],
    launchpad: Array.isArray(candidate.launchpad) ? candidate.launchpad : [],
  };
}

export async function readData(): Promise<DashboardData> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    return normalizeData(JSON.parse(raw));
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
}

export async function writeData(next: DashboardData) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(next, null, 2), "utf-8");
}

export function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
