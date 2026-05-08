from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.request
from typing import Any

from nivesh_voice_agent.config import Settings
from nivesh_voice_agent.logging import get_logger
from nivesh_voice_agent.schemas import VoiceSessionRequest

logger = get_logger(__name__)


def _post_json(url: str, headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any] | None:
    data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=12) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


async def report_voice_turn(
    settings: Settings,
    request: VoiceSessionRequest,
    *,
    transcript: str,
    assistant_text: str,
    latency: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not settings.app_base_url or not settings.worker_secret:
        return None

    endpoint = f"{settings.app_base_url.rstrip('/')}/api/voice/turn"
    payload = {
        "userId": request.user_id,
        "sessionId": request.session_id,
        "conversationId": request.conversation_id,
        "threadId": request.thread_id,
        "transcript": transcript,
        "finalTranscript": transcript,
        "language": request.language,
        "prefetchKey": request.prefetch_key,
        "uiIntentHint": request.ui_intent_hint,
        "latency": latency or {},
        "metadata": {
            "transport": "videosdk",
            "roomId": request.room_id,
            "workerAssistantText": assistant_text[:800],
        },
    }
    headers = {
        "Content-Type": "application/json",
        "x-worker-secret": settings.worker_secret.get_secret_value(),
    }

    try:
        return await asyncio.to_thread(_post_json, endpoint, headers, payload)
    except urllib.error.HTTPError as exc:
        logger.warning(
            "voice_turn_report_failed",
            extra={"status": exc.code, "session_id": request.session_id},
        )
    except Exception:
        logger.exception("voice_turn_report_failed", extra={"session_id": request.session_id})
    return None
