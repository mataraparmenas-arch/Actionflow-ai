export interface GuardResult {
  isSafe: boolean;
  riskLevel: "low" | "medium" | "high";
  threatType?: "INJECTION_ATTEMPT" | "SYSTEM_OVERRIDE" | "ARBITRARY_CODE" | "SQL_INJECTION";
  reason?: string;
  sanitizedInput: string;
}

const INJECTION_PATTERNS: Array<{ regex: RegExp; threat: GuardResult["threatType"]; reason: string }> = [
  {
    regex: /(?:ignore|disregard|forget|bypass)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|prompts|rules|commands)/i,
    threat: "SYSTEM_OVERRIDE",
    reason: "Attempt to override core system instructions or guardrails detected.",
  },
  {
    regex: /(?:you are now|pretend you are|act as|switch to)\s+(?:dan|developer mode|god mode|jailbroken|unrestricted)/i,
    threat: "INJECTION_ATTEMPT",
    reason: "Role hijacking or developer-mode jailbreak pattern detected.",
  },
  {
    regex: /(?:rm\s+-rf|sudo\s+|chmod\s+\d+|cat\s+\/etc|curl\s+http|wget\s+http|nc\s+-e|bash\s+-i)/i,
    threat: "ARBITRARY_CODE",
    reason: "Attempted invocation of unauthorized system shell commands detected.",
  },
  {
    regex: /(?:;\s*drop\s+table|--\s*|union\s+select|select\s+\*\s+from\s+pg_)/i,
    threat: "SQL_INJECTION",
    reason: "Attempted raw SQL injection syntax detected.",
  },
];

export function inspectPromptSafety(rawInput: string): GuardResult {
  const trimmed = rawInput.trim();

  for (const { regex, threat, reason } of INJECTION_PATTERNS) {
    if (regex.test(trimmed)) {
      return {
        isSafe: false,
        riskLevel: "high",
        threatType: threat,
        reason,
        sanitizedInput: trimmed,
      };
    }
  }

  // Remove potential null-bytes and non-printable control characters
  const sanitized = trimmed.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");

  return {
    isSafe: true,
    riskLevel: "low",
    sanitizedInput: sanitized,
  };
}
