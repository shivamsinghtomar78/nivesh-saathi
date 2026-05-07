from __future__ import annotations

import asyncio
from dataclasses import dataclass

from nivesh_voice_agent.config import Settings
from nivesh_voice_agent.logging import get_logger
from nivesh_voice_agent.pipeline import run_agent_session
from nivesh_voice_agent.schemas import VoiceSessionRequest

logger = get_logger(__name__)


@dataclass
class RunningSession:
    request: VoiceSessionRequest
    stop_event: asyncio.Event
    task: asyncio.Task[None]


class SessionManager:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._sessions: dict[str, RunningSession] = {}
        self._lock = asyncio.Lock()

    @property
    def active_count(self) -> int:
        return len(self._sessions)

    async def start(self, request: VoiceSessionRequest) -> RunningSession:
        async with self._lock:
            existing = self._sessions.get(request.room_id)
            if existing and not existing.task.done():
                return existing

            stop_event = asyncio.Event()
            task = asyncio.create_task(
                self._run_and_forget(request, stop_event),
                name=f"voice-agent:{request.room_id}",
            )
            running = RunningSession(request=request, stop_event=stop_event, task=task)
            self._sessions[request.room_id] = running
            return running

    async def stop(self, room_id: str) -> bool:
        async with self._lock:
            running = self._sessions.get(room_id)
            if not running:
                return False
            running.stop_event.set()

        await asyncio.gather(running.task, return_exceptions=True)
        return True

    async def shutdown(self) -> None:
        async with self._lock:
            sessions = list(self._sessions.values())
            self._sessions.clear()

        for running in sessions:
            running.stop_event.set()

        await asyncio.gather(*(running.task for running in sessions), return_exceptions=True)

    async def _run_and_forget(
        self,
        request: VoiceSessionRequest,
        stop_event: asyncio.Event,
    ) -> None:
        try:
            await run_agent_session(self._settings, request, stop_event)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "voice_agent_background_task_failed",
                extra={"room_id": request.room_id, "session_id": request.session_id},
            )
        finally:
            async with self._lock:
                current = self._sessions.get(request.room_id)
                if current and current.task is asyncio.current_task():
                    self._sessions.pop(request.room_id, None)
