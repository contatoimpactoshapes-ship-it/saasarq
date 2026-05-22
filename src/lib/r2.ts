import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function saveImageFromUrl(
  imageUrl: string,
  generationId: string,
  index: number
): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = imageUrl.includes(".png") ? "png" : "webp";
  const key = `generations/${generationId}/${index}.${ext}`;
  return uploadToR2(key, buffer, `image/${ext}`);
}

/** Infer content-type and extension from a URL or Content-Type header. */
function inferMedia(url: string, contentTypeHeader?: string | null): { ext: string; mime: string } {
  const lower = url.toLowerCase().split("?")[0];
  if (contentTypeHeader?.startsWith("video/")) {
    const ext = contentTypeHeader.split("/")[1]?.split(";")[0] ?? "mp4";
    return { ext, mime: contentTypeHeader };
  }
  if (contentTypeHeader?.startsWith("audio/")) {
    const ext = contentTypeHeader.split("/")[1]?.split(";")[0] ?? "mp3";
    return { ext, mime: contentTypeHeader };
  }
  if (lower.endsWith(".mp4") || lower.includes(".mp4")) return { ext: "mp4", mime: "video/mp4" };
  if (lower.endsWith(".webm")) return { ext: "webm", mime: "video/webm" };
  if (lower.endsWith(".mov")) return { ext: "mov", mime: "video/quicktime" };
  if (lower.endsWith(".mp3")) return { ext: "mp3", mime: "audio/mpeg" };
  if (lower.endsWith(".wav")) return { ext: "wav", mime: "audio/wav" };
  if (lower.endsWith(".ogg")) return { ext: "ogg", mime: "audio/ogg" };
  if (lower.endsWith(".png")) return { ext: "png", mime: "image/png" };
  // default fallback — webp for images
  return { ext: "webp", mime: "image/webp" };
}

/**
 * Generic media archival: works for images, video, and audio.
 * Replaces `saveImageFromUrl` for new tool types.
 */
export async function saveMediaFromUrl(
  mediaUrl: string,
  generationId: string,
  index: number
): Promise<string> {
  const response = await fetch(mediaUrl);
  const contentTypeHeader = response.headers.get("content-type");
  const { ext, mime } = inferMedia(mediaUrl, contentTypeHeader);
  const buffer = Buffer.from(await response.arrayBuffer());
  const key = `generations/${generationId}/${index}.${ext}`;
  return uploadToR2(key, buffer, mime);
}
