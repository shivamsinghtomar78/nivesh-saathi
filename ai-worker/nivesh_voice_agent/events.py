from __future__ import annotations

import asyncio
import inspect
import json
from collections.abc import Awaitable, Callable
from typing import Any

from nivesh_voice_agent.logging import get_logger

logger = get_logger(__name__)


class RoomEventBus:
    def __init__(self, context: Any, topic: str) -> None:
        self._context = context
        self._topic = topic
        self._queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue(maxsize=256)
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="room-event-bus")

    async def publish(self, payload: dict[str, Any]) -> None:
        try:
            self._queue.put_nowait(payload)
        except asyncio.QueueFull:
            logger.warning("voice_event_queue_full", extra={"event_type": payload.get("type")})

    async def close(self) -> None:
        await self._queue.put(None)
        if self._task:
            await asyncio.gather(self._task, return_exceptions=True)

    async def _run(self) -> None:
        while True:
            payload = await self._queue.get()
            if payload is None:
                return

            try:
                await self._publish_to_room(payload)
            except Exception:
                logger.exception("voice_event_publish_failed", extra={"payload_type": payload.get("type")})

    async def _publish_to_room(self, payload: dict[str, Any]) -> None:
        room = getattr(self._context, "room", None) or getattr(self._context, "meeting", None)
        pubsub = (
            getattr(room, "pubSub", None)
            or getattr(room, "pubsub", None)
            or getattr(room, "pub_sub", None)
        )
        publish = getattr(pubsub, "publish", None)

        if not callable(publish):
            return

        message = json.dumps(payload, ensure_ascii=True)
        result = self._call_publish(publish, message, payload)
        if inspect.isawaitable(result):
            await result

    def _call_publish(
        self,
        publish: Callable[..., Awaitable[Any] | Any],
        message: str,
        payload: dict[str, Any],
    ) -> Awaitable[Any] | Any:
        try:
            return publish(self._topic, message, {"persist": False}, payload)
        except TypeError:
            try:
                return publish(self._topic, message)
            except TypeError:
                return publish(message)
