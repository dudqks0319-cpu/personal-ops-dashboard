import { NextRequest, NextResponse } from "next/server";
import { makeId, readData, writeData } from "@/lib/store";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data.tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const data = await readData();
  const task = {
    id: makeId(),
    title: body.title.trim(),
    priority: (body.priority as "high" | "medium" | "low") || "medium",
    done: false,
    createdAt: new Date().toISOString(),
  };

  data.tasks.unshift(task);
  await writeData(data);
  return NextResponse.json(task, { status: 201 });
}
