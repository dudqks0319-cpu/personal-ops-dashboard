import { NextRequest, NextResponse } from "next/server";
import {
  LAUNCHPAD_DESCRIPTION_MAX,
  LAUNCHPAD_NAME_MAX,
  normalizeLaunchpadUrl,
} from "@/lib/launchpad";
import { updateData } from "@/lib/store";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedBody = await parseJsonBody(req);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const { body } = parsedBody;
  const hasKnownField =
    body.name !== undefined
    || body.url !== undefined
    || body.description !== undefined
    || body.enabled !== undefined
    || body.action !== undefined;

  if (!hasKnownField) {
    return NextResponse.json(
      { error: "at least one of name, url, description, enabled, action is required" },
      { status: 400 },
    );
  }

  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  if (body.action !== undefined && body.action !== "launch") {
    return NextResponse.json({ error: "unsupported action" }, { status: 400 });
  }

  let parsedName: string | null = null;
  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }

    parsedName = body.name.trim();
    if (!parsedName) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    if (parsedName.length > LAUNCHPAD_NAME_MAX) {
      return NextResponse.json(
        { error: `name must be ${LAUNCHPAD_NAME_MAX} characters or fewer` },
        { status: 400 },
      );
    }
  }

  let parsedUrl: string | null = null;
  if (body.url !== undefined) {
    parsedUrl = normalizeLaunchpadUrl(body.url);
    if (!parsedUrl) {
      return NextResponse.json({ error: "valid http/https url is required" }, { status: 400 });
    }
  }

  let parsedDescription: string | null = null;
  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 });
    }

    parsedDescription = body.description.trim();
    if (parsedDescription.length > LAUNCHPAD_DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `description must be ${LAUNCHPAD_DESCRIPTION_MAX} characters or fewer` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await updateData((data) => {
      const item = data.launchpad.find((launchpad) => launchpad.id === id);

      if (!item) {
        return { ok: false as const, status: 404, error: "launchpad item not found" };
      }

      let changed = false;
      const now = new Date().toISOString();

      if (parsedName !== null && item.name !== parsedName) {
        item.name = parsedName;
        changed = true;
      }

      if (parsedUrl !== null && item.url !== parsedUrl) {
        const duplicated = data.launchpad.some(
          (launchpad) => launchpad.id !== id && launchpad.url === parsedUrl,
        );
        if (duplicated) {
          return {
            ok: false as const,
            status: 409,
            error: "another launchpad item already uses this url",
          };
        }

        item.url = parsedUrl;
        changed = true;
      }

      if (parsedDescription !== null && item.description !== parsedDescription) {
        item.description = parsedDescription;
        changed = true;
      }

      if (typeof body.enabled === "boolean" && item.enabled !== body.enabled) {
        item.enabled = body.enabled;
        changed = true;
      }

      if (body.action === "launch") {
        if (!item.enabled) {
          return {
            ok: false as const,
            status: 400,
            error: "launchpad item is disabled",
          };
        }

        item.launchCount += 1;
        item.lastLaunchedAt = now;
        changed = true;
      }

      if (changed) {
        item.updatedAt = now;
      }

      return { ok: true as const, item };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.item);
  } catch {
    return NextResponse.json({ error: "failed to update launchpad item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await updateData((data) => {
      const prevLength = data.launchpad.length;
      data.launchpad = data.launchpad.filter((item) => item.id !== id);

      if (data.launchpad.length === prevLength) {
        return { ok: false as const, status: 404, error: "launchpad item not found" };
      }

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed to delete launchpad item" }, { status: 500 });
  }
}
