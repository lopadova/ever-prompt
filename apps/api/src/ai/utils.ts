/**
 * Strip markdown JSON fences from LLM responses.
 * Models often return ```json ... ``` even when told not to.
 */
export function stripJsonFences(text: string): string {
  let cleaned = text.trim();
  // Remove ```json or ``` at the start
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
  }
  // Remove trailing ```
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}
