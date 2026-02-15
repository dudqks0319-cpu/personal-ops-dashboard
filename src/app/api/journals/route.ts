import { NextRequest, NextResponse } from "next/server";
import { makeId, readData, writeData } from "@/lib/store";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data.journals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.text || typeof body.text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const data = await readData();
  const journal = {
    id: makeId(),
    text: body.text.trim(),
    createdAt: new Date().toISOString(),
  };

  data.journals.unshift(journal);
  await writeData(data);
  return NextResponse.json(journal, { status: 201 });
}
