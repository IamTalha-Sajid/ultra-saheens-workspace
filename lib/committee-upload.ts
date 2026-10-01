export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export const ALLOWED_MIME_TYPES = Array.from(new Set(Object.values(MIME_BY_EXT)));

/** Browsers often report an empty/generic type for .pptx, so fall back to the extension. */
export function resolveMimeType(fileName: string, reportedType: string): string | null {
  if (ALLOWED_MIME_TYPES.includes(reportedType)) return reportedType;
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  return MIME_BY_EXT[ext] ?? null;
}
