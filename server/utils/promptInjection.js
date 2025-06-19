// --- Prompt Injection Defense Layer (Basic) ---
const PROMPT_INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'disregard prior commands',
  'act as',
  'roleplay as',
  'confidential',
  'secret',
  'reveal your instructions',
  'system prompt',
];

const PROMPT_INJECTION_RESPONSE =
  'I cannot process that request due to security policies.';

function sanitizeInput(input) {
  let sanitized = input;
  // 1. Basic keyword filtering (can be bypassed but catches obvious attempts)
  for (const keyword of PROMPT_INJECTION_KEYWORDS) {
    if (sanitized.toLowerCase().includes(keyword)) {
      console.warn(
        `[Prompt Injection Attempt Detected] Keyword: "${keyword}" in input: "${input}"`
      );
      throw new Error('MaliciousInputDetected');
    }
  }

  // 2. Limit input length (adjust as needed)
  if (sanitized.length > 500) {
    console.warn(
      `[Input Sanitization] Input too long: ${sanitized.length} characters.`
    );
    throw new Error('InputTooLong');
  }

  return sanitized;
}

module.exports = {
  PROMPT_INJECTION_KEYWORDS,
  PROMPT_INJECTION_RESPONSE,
  sanitizeInput,
};
