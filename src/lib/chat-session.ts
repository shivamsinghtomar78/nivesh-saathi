export const ACTIVE_CONVERSATION_STORAGE_KEY = "nivesh-active-conversation";

export function clearStoredActiveConversation(
  storage?: Pick<Storage, "removeItem"> | null
) {
  const target =
    storage ??
    (typeof window !== "undefined" ? window.localStorage : undefined);

  target?.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
}
