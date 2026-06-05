import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reportMediaMaxBytes, reportMediaMimeTypes } from "@/lib/validation";
import type { MediaType } from "@/lib/types";

const mimeToMediaType: Record<string, MediaType> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/webm": "video",
  "video/mp4": "video",
  "audio/webm": "audio",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/wav": "audio",
};

function cleanFileName(value: string) {
  return (
    value
      .replace(/[^\w.\- ]+/g, "")
      .trim()
      .slice(0, 160) || "media"
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Media file is required" },
      { status: 400 },
    );
  }

  if (!(reportMediaMimeTypes as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported media type" },
      { status: 415 },
    );
  }

  if (file.size > reportMediaMaxBytes) {
    return NextResponse.json(
      { error: "Media must be 3 MB or smaller" },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const media = {
    type: mimeToMediaType[file.type],
    url: `data:${file.type};base64,${bytes.toString("base64")}`,
    name: cleanFileName(file.name),
    status: "uploaded" as const,
  };

  return NextResponse.json({ media }, { status: 201 });
}
