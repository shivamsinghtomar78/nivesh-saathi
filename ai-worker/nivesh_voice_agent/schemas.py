from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from nivesh_voice_agent.config import AppLanguage


class VoiceSessionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    room_id: str = Field(alias="roomId")
    session_id: str = Field(alias="sessionId")
    participant_id: str = Field(alias="participantId")
    agent_participant_id: str | None = Field(default=None, alias="agentParticipantId")
    user_id: str = Field(alias="userId")
    language: AppLanguage = "hinglish"
    conversation_id: str | None = Field(default=None, alias="conversationId")
    thread_id: str | None = Field(default=None, alias="threadId")


class VoiceSessionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ok: bool
    room_id: str = Field(alias="roomId")
    session_id: str = Field(alias="sessionId")
    status: str


class HealthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ok: bool
    active_sessions: int = Field(alias="activeSessions")
