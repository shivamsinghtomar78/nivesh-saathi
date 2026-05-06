export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New conversation";
  if (cleaned.length <= 60) return cleaned;

  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated}...`;
}
