import { hasN8nConfig } from "@/lib/server/env";
import VoiceScreen from "@/components/app/VoiceScreen";
import N8nVoiceScreen from "@/components/app/N8nVoiceScreen";

/**
 * Voice page with automatic backend selection.
 *
 * When N8N_WEBHOOK_URL is configured, the page renders the n8n-backed
 * voice screen. Otherwise it falls back to the original multi-API
 * voice flow.
 */
export default function VoicePage() {
  if (hasN8nConfig) {
    return <N8nVoiceScreen />;
  }
  return <VoiceScreen />;
}
