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

type DashboardData = {
  tasks: Task[];
  focusSessions: FocusSession[];
  journals: Journal[];
  events: CalendarEvent[];
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "dashboard.json");

const defaultData: DashboardData = {
  tasks: [],
  focusSessions: [],
  journals: [],
  events: [],
};

export async function readData(): Promise<DashboardData> {
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    return JSON.parse(raw) as DashboardData;
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
