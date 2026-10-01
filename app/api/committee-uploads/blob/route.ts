import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUserId } from "@/lib/auth-api";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/committee-upload";

// Issues a short-lived token so the browser can upload straight to Vercel Blob,
// bypassing the 4.5MB serverless request body limit.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_MIME_TYPES,
        maximumSizeInBytes: MAX_FILE_SIZE,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error("committee-uploads blob token failed:", err);
    const message = err instanceof Error ? err.message : "Could not start upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
