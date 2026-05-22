import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY!,
});

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
