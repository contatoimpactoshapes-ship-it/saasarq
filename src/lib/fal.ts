import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY!,
});

/**
 * Builds the FAL webhook callback URL for a generation job.
 *
 * If FAL_WEBHOOK_SECRET is set, appends it as a `secret` query param so the
 * webhook handler can reject forged requests via timingSafeEqual comparison.
 * FAL.ai calls the URL verbatim — it does not strip or alter query params.
 */
export function buildFalWebhookUrl(generationId: string): string | undefined {
  const base = process.env.FAL_WEBHOOK_URL;
  if (!base) return undefined;

  const url = new URL(base);
  url.searchParams.set("generationId", generationId);

  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (secret) url.searchParams.set("secret", secret);

  return url.toString();
}

export interface FalImageInput {
  prompt: string;
  image_size?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_images?: number;
  enable_safety_checker?: boolean;
  seed?: number;
}

export interface FalResult {
  requestId: string;
}

export async function submitFalJob(
  modelId: string,
  input: FalImageInput,
  webhookUrl?: string
): Promise<string> {
  return submitFalJobRaw(modelId, input as unknown as Record<string, unknown>, webhookUrl);
}

export async function submitFalJobRaw(
  modelId: string,
  input: Record<string, unknown>,
  webhookUrl?: string
): Promise<string> {
  const options: Parameters<typeof fal.queue.submit>[1] = { input };
  if (webhookUrl) options.webhookUrl = webhookUrl;
  const { request_id } = await fal.queue.submit(modelId, options);
  return request_id;
}

export async function getFalJobStatus(modelId: string, requestId: string) {
  return fal.queue.status(modelId, {
    requestId,
    logs: false,
  });
}

export async function getFalJobResult(modelId: string, requestId: string) {
  return fal.queue.result(modelId, { requestId });
}
