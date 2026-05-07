from __future__ import annotations

import asyncio
import os
from contextlib import suppress
from typing import Any

from videosdk.agents import AgentSession, JobContext, Pipeline, RoomOptions
from videosdk.plugins.deepgram import DeepgramSTT
from videosdk.plugins.elevenlabs import ElevenLabsTTS, VoiceSettings
from videosdk.plugins.openai import OpenAILLM
from videosdk.plugins.silero import SileroVAD
from videosdk.plugins.turn_detector import TurnDetector

from nivesh_voice_agent.agent import NiveshSaathiAgent
from nivesh_voice_agent.config import Settings
from nivesh_voice_agent.events import RoomEventBus
from nivesh_voice_agent.logging import get_logger
from nivesh_voice_agent.schemas import VoiceSessionRequest

logger = get_logger(__name__)


def _configure_provider_env(settings: Settings) -> None:
    os.environ["VIDEOSDK_AUTH_TOKEN"] = settings.videosdk_token
    os.environ["DEEPGRAM_API_KEY"] = settings.deepgram_api_key.get_secret_value()
    os.environ["OPENAI_API_KEY"] = settings.groq_api_key.get_secret_value()
    os.environ["ELEVENLABS_API_KEY"] = settings.elevenlabs_api_key.get_secret_value()


def build_pipeline(settings: Settings, request: VoiceSessionRequest) -> Pipeline:
    voice_settings = VoiceSettings(
        stability=0.55,
        similarity_boost=0.78,
        style=0.2,
        use_speaker_boost=True,
    )

    return Pipeline(
        stt=DeepgramSTT(
            model="nova-2",
            language=settings.deepgram_language(request.language),
            interim_results=True,
            punctuate=True,
            smart_format=True,
            endpointing=320,
        ),
        llm=OpenAILLM(
            model=settings.groq_model,
            api_key=settings.groq_api_key.get_secret_value(),
            base_url=settings.groq_base_url,
            temperature=0.42,
            max_completion_tokens=260,
        ),
        tts=ElevenLabsTTS(
            model=settings.elevenlabs_model,
            voice=settings.elevenlabs_voice_id,
            response_format="pcm_24000",
            enable_streaming=True,
            voice_settings=voice_settings,
        ),
        vad=SileroVAD(threshold=settings.vad_threshold),
        turn_detector=TurnDetector(threshold=settings.turn_detector_threshold),
    )


def attach_pipeline_hooks(
    pipeline: Pipeline,
    event_bus: RoomEventBus,
    request: VoiceSessionRequest,
) -> None:
    @pipeline.on("stt")
    async def on_stt(text: str) -> str:
        normalized = text.strip()
        if normalized:
            await event_bus.publish(
                {
                    "type": "user_transcript_final",
                    "text": normalized,
                    "threadId": request.thread_id,
                    "sessionId": request.session_id,
                }
            )
        return normalized

    @pipeline.on("tts")
    async def on_tts(text: str) -> str:
        normalized = text.strip()
        if normalized:
            await event_bus.publish(
                {
                    "type": "assistant_delta",
                    "text": normalized,
                    "threadId": request.thread_id,
                    "sessionId": request.session_id,
                }
            )
        return normalized

    @pipeline.on("user_turn_start")
    async def on_user_turn_start(*_: Any) -> None:
        await event_bus.publish(
            {
                "type": "user_turn_start",
                "sessionId": request.session_id,
            }
        )

    @pipeline.on("agent_turn_start")
    async def on_agent_turn_start(*_: Any) -> None:
        await event_bus.publish(
            {
                "type": "agent_turn_start",
                "sessionId": request.session_id,
            }
        )


async def run_agent_session(
    settings: Settings,
    request: VoiceSessionRequest,
    stop_event: asyncio.Event,
) -> None:
    _configure_provider_env(settings)
    pipeline = build_pipeline(settings, request)
    agent = NiveshSaathiAgent(language=request.language)
    session = AgentSession(agent=agent, pipeline=pipeline)
    room_options = RoomOptions(
        room_id=request.room_id,
        name=settings.agent_name,
        playground=False,
    )
    context = JobContext(room_options=room_options)
    event_bus = RoomEventBus(context=context, topic=settings.events_topic)
    attach_pipeline_hooks(pipeline, event_bus, request)

    logger.info(
        "voice_agent_session_starting",
        extra={
            "room_id": request.room_id,
            "session_id": request.session_id,
            "language": request.language,
            "model": settings.groq_model,
        },
    )

    try:
        await context.connect()
        event_bus.start()
        await event_bus.publish(
            {
                "type": "agent_joined",
                "text": "Nivesh Saathi is connected.",
                "sessionId": request.session_id,
                "threadId": request.thread_id,
            }
        )
        await session.start()
        await asyncio.wait_for(stop_event.wait(), timeout=settings.session_idle_timeout_seconds)
    except TimeoutError:
        logger.info(
            "voice_agent_session_idle_timeout",
            extra={"room_id": request.room_id, "session_id": request.session_id},
        )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception(
            "voice_agent_session_failed",
            extra={"room_id": request.room_id, "session_id": request.session_id},
        )
        with suppress(Exception):
            await event_bus.publish(
                {
                    "type": "agent_error",
                    "text": "Voice agent had a backend issue.",
                    "sessionId": request.session_id,
                    "detail": str(exc)[:240],
                }
            )
        raise
    finally:
        with suppress(Exception):
            await session.close()
        with suppress(Exception):
            await context.shutdown()
        with suppress(Exception):
            await event_bus.close()
        logger.info(
            "voice_agent_session_closed",
            extra={"room_id": request.room_id, "session_id": request.session_id},
        )
