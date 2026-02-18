import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const data = await readData();
  const task = data.tasks.find((item) => item.id === id);

  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  if (typeof body?.done === "boolean") {
    task.done = body.done;
  }

  await writeData(data);
  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await readData();
  const prevLength = data.tasks.length;
  data.tasks = data.tasks.filter((item) => item.id !== id);

  if (data.tasks.length === prevLength) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  await writeData(data);
  return NextResponse.json({ ok: true });
}
