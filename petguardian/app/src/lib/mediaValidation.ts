/**
 * Media type/size validation (Doc 04 §9: "Media uploads constrained by type and
 * size"). Pure functions, unit-tested. Mirrors the bucket's allowed_mime_types and
 * stays at or under the 50 MiB bucket cap set in migration 0011.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MiB (matches the bucket cap)

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;

export type MediaKind = 'photo' | 'video';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

export function kindFromMime(mime: string): MediaKind | null {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) return 'photo';
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mime)) return 'video';
  return null;
}

export function extFromMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin';
}

/** Returns an error string, or null if the file is an acceptable type and size. */
export function validateMedia(
  mime: string | null | undefined,
  sizeBytes: number | null | undefined,
): string | null {
  if (!mime) return 'Unknown file type.';
  const kind = kindFromMime(mime);
  if (!kind) return 'Unsupported file type. Use JPG, PNG, WEBP, HEIC, MP4, or MOV.';
  if (sizeBytes != null) {
    const max = kind === 'photo' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (sizeBytes > max) {
      const mb = Math.floor(max / 1024 / 1024);
      return `File is too large. Max ${mb} MB for ${kind === 'photo' ? 'photos' : 'videos'}.`;
    }
  }
  return null;
}
