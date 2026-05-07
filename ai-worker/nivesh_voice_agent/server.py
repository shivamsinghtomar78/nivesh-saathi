from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, status

from nivesh_voice_agent.config import Settings
from nivesh_voice_agent.logging import configure_logging, get_logger
from nivesh_voice_agent.schemas import HealthResponse, VoiceSessionRequest, VoiceSessionResponse
from nivesh_voice_agent.sessions import SessionManager

settings = Settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)
manager = SessionManager(settings)


async def require_worker_secret(
    x_worker_secret: str | None = Header(default=None),
) -> None:
    expected = settings.worker_secret.get_secret_value() if settings.worker_secret else None
    if expected and x_worker_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid worker secret.",
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("voice_agent_worker_started")
    try:
        yield
    finally:
        await manager.shutdown()
        logger.info("voice_agent_worker_stopped")


app = FastAPI(
    title="Nivesh Saathi VideoSDK Voice Agent Worker",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(ok=True, activeSessions=manager.active_count)


@app.post(
    "/sessions",
    response_model=VoiceSessionResponse,
    dependencies=[Depends(require_worker_secret)],
)
async def create_session(request: VoiceSessionRequest) -> VoiceSessionResponse:
    running = await manager.start(request)
    logger.info(
        "voice_agent_session_dispatched",
        extra={"room_id": request.room_id, "session_id": request.session_id},
    )
    return VoiceSessionResponse(
        ok=True,
        roomId=running.request.room_id,
        sessionId=running.request.session_id,
        status="running",
    )


@app.delete(
    "/sessions/{room_id}",
    dependencies=[Depends(require_worker_secret)],
)
async def stop_session(room_id: str) -> dict[str, bool | str]:
    stopped = await manager.stop(room_id)
    return {"ok": True, "roomId": room_id, "stopped": stopped}
