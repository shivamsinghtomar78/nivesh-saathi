from __future__ import annotations

import argparse
import asyncio

import uvicorn

from nivesh_voice_agent.config import Settings
from nivesh_voice_agent.logging import configure_logging
from nivesh_voice_agent.pipeline import run_agent_session
from nivesh_voice_agent.schemas import VoiceSessionRequest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Nivesh Saathi VideoSDK voice agent.")
    subparsers = parser.add_subparsers(dest="command")

    serve = subparsers.add_parser("serve", help="Run the HTTP worker service.")
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", default=8080, type=int)

    run_once = subparsers.add_parser("run-once", help="Join one VideoSDK room directly.")
    run_once.add_argument("--room-id", required=True)
    run_once.add_argument("--session-id", required=True)
    run_once.add_argument("--participant-id", required=True)
    run_once.add_argument("--user-id", required=True)
    run_once.add_argument("--language", default="hinglish")
    run_once.add_argument("--thread-id")
    run_once.add_argument("--conversation-id")

    return parser.parse_args()


async def run_once(args: argparse.Namespace) -> None:
    settings = Settings()
    configure_logging(settings.log_level)
    stop_event = asyncio.Event()
    request = VoiceSessionRequest(
        roomId=args.room_id,
        sessionId=args.session_id,
        participantId=args.participant_id,
        userId=args.user_id,
        language=args.language,
        threadId=args.thread_id,
        conversationId=args.conversation_id,
    )
    await run_agent_session(settings, request, stop_event)


def main() -> None:
    args = parse_args()
    command = args.command or "serve"

    if command == "run-once":
        asyncio.run(run_once(args))
        return

    uvicorn.run(
        "nivesh_voice_agent.server:app",
        host=args.host if hasattr(args, "host") else "0.0.0.0",
        port=args.port if hasattr(args, "port") else 8080,
        reload=False,
    )


if __name__ == "__main__":
    main()
