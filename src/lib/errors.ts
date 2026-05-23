/**
 * Error sanitization layer.
 * All raw technical errors must pass through here before being shown to users.
 * Server logs receive full details; clients receive only friendly Portuguese messages.
 */

type ErrorPattern = [RegExp, string];

// Ordered: most specific first
const PATTERNS: ErrorPattern[] = [
  // Credits / quota
  [/insufficient.?credit|créditos insuficientes|not enough credit/i,
    "Créditos insuficientes para esta operação."],
  [/quota.?exceeded|limit.?exceeded|over.?capacity|usage.?limit/i,
    "Limite de uso atingido. Tente novamente em breve."],

  // Rate limiting
  [/rate.?limit|too.?many.?request|429/i,
    "Muitas solicitações simultâneas. Tente novamente em instantes."],

  // Authentication
  [/unauthorized|invalid.*key|invalid.*credential|no.*auth|api.*key|401/i,
    "Erro de autenticação do serviço."],

  // Timeout
  [/timeout|timed.?out|524|408|deadline/i,
    "A geração demorou mais que o esperado. Tente novamente."],

  // File / payload
  [/too.?large|file.?size|payload.?too|413|20.?mb/i,
    "Arquivo muito grande (máx 20 MB)."],
  [/invalid.*format|unsupported.*type|mime.?type|not.*image/i,
    "Formato de arquivo não suportado."],

  // Content policy
  [/content.?moderation|safety.*check|nsfw|harmful|policy/i,
    "Conteúdo não permitido pela política do serviço."],

  // Network
  [/network|ECONNREFUSED|ENOTFOUND|fetch.?fail|ERR_/i,
    "Falha de conexão. Verifique sua internet."],

  // Service unavailable
  [/service.?unavailable|503|502|bad.?gateway|upstream/i,
    "Serviço temporariamente indisponível. Tente novamente."],

  // Generic server error
  [/internal.?server|500|server.?error/i,
    "Erro interno do serviço. Tente novamente."],

  // Catch provider names that slipped through
  [/fal\.ai|fal\.run|replicate\.com|openai\.com|stabilityai|huggingface|anthropic/i,
    "Serviço temporariamente indisponível."],
];

const FALLBACK = "Algo deu errado. Tente novamente.";

/**
 * Converts a raw error (exception, string, or unknown) into a
 * user-friendly Portuguese message suitable for display in the UI.
 */
export function sanitizeError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message
    : typeof error === "string" ? error
    : String(error ?? "");

  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(raw)) return message;
  }

  return FALLBACK;
}

/**
 * Server-side helper: logs the full error to console and returns
 * a sanitized message safe to include in API responses.
 */
export function logAndSanitize(context: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  console.error(`[${context}]`, raw, error);
  return sanitizeError(error);
}
