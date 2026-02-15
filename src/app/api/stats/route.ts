import { NextResponse } from "next/server";
import { readData } from "@/lib/store";

export async function GET() {
  const data = await readData();
  const totalTasks = data.tasks.length;
  const doneTasks = data.tasks.filter((t) => t.done).length;
  const focusMinutesToday = data.focusSessions
    .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString())
    .reduce((acc, cur) => acc + cur.minutes, 0);

  return NextResponse.json({
    totalTasks,
    doneTasks,
    focusMinutesToday,
    journalsCount: data.journals.length,
  });
}
