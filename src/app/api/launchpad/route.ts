import { NextRequest, NextResponse } from "next/server";
import {
  LAUNCHPAD_DESCRIPTION_MAX,
  LAUNCHPAD_NAME_MAX,
  normalizeLaunchpadUrl,
} from "@/lib/launchpad";
import { makeId, readData, updateData } from "@/lib/store";

type ParsedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

async function parseJsonBody(req: NextRequest): Promise<ParsedBody> {
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "json object body is required" }, { status: 400 }),
      };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid json body" }, { status: 400 }),
    };
  }
}

export async function GET() {
  try {
    const data = await readData();
    const items = [...data.launchpad].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "failed to load launchpad" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const nameRaw = parsedBody.body.name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > LAUNCHPAD_NAME_MAX) {
    return NextResponse.json(
      { error: `name must be ${LAUNCHPAD_NAME_MAX} characters or fewer` },
      { status: 400 },
    );
  }

  const url = normalizeLaunchpadUrl(parsedBody.body.url);
  if (!url) {
    return NextResponse.json({ error: "valid http/https url is required" }, { status: 400 });
  }

  let description = "";
  if (parsedBody.body.description !== undefined) {
    if (typeof parsedBody.body.description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 });
    }

    description = parsedBody.body.description.trim();
    if (description.length > LAUNCHPAD_DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `description must be ${LAUNCHPAD_DESCRIPTION_MAX} characters or fewer` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await updateData((data) => {
      if (data.launchpad.some((item) => item.url === url)) {
        return {
          ok: false as const,
          status: 409,
          error: "launchpad item with this url already exists",
        };
      }

      const now = new Date().toISOString();
      const item = {
        id: makeId(),
        name,
        url,
        description,
        enabled: true,
        launchCount: 0,
        lastLaunchedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      data.launchpad.unshift(item);
      return { ok: true as const, item };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "failed to save launchpad item" }, { status: 500 });
  }
}
