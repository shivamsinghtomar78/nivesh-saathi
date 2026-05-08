from __future__ import annotations

import time
from functools import cached_property
from typing import Literal

import jwt
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


AppLanguage = Literal["en", "hi", "hinglish", "ta", "te", "bho", "mr"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    videosdk_api_key: str | None = Field(default=None, alias="VIDEOSDK_API_KEY")
    videosdk_secret_key: SecretStr | None = Field(default=None, alias="VIDEOSDK_SECRET_KEY")
    videosdk_auth_token: SecretStr | None = Field(default=None, alias="VIDEOSDK_AUTH_TOKEN")

    deepgram_api_key: SecretStr = Field(alias="DEEPGRAM_API_KEY")
    groq_api_key: SecretStr = Field(alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1", alias="GROQ_BASE_URL")

    elevenlabs_api_key: SecretStr = Field(alias="ELEVENLABS_API_KEY")
    elevenlabs_voice_id: str = Field(default="EXAVITQu4vr4xnSDxMaL", alias="ELEVENLABS_VOICE_ID")
    elevenlabs_model: str = Field(default="eleven_flash_v2_5", alias="ELEVENLABS_MODEL")

    worker_secret: SecretStr | None = Field(default=None, alias="VOICE_AGENT_WORKER_SECRET")
    agent_name: str = Field(default="Nivesh Saathi", alias="VOICE_AGENT_NAME")
    log_level: str = Field(default="INFO", alias="VOICE_AGENT_LOG_LEVEL")
    events_topic: str = Field(default="NIVESH_VOICE_EVENTS", alias="VOICE_AGENT_EVENTS_TOPIC")
    app_base_url: str | None = Field(default=None, alias="VOICE_AGENT_APP_URL")

    vad_threshold: float = Field(default=0.35, alias="VOICE_AGENT_VAD_THRESHOLD")
    turn_detector_threshold: float = Field(default=0.8, alias="VOICE_AGENT_TURN_THRESHOLD")
    stt_primary: str = Field(default="flux-general-multi", alias="VOICE_AGENT_STT_PRIMARY")
    stt_fallback: str = Field(default="nova-3", alias="VOICE_AGENT_STT_FALLBACK")
    eot_threshold: float = Field(default=0.78, alias="VOICE_AGENT_EOT_THRESHOLD")
    eager_eot_threshold: float = Field(default=0.55, alias="VOICE_AGENT_EAGER_EOT_THRESHOLD")
    eot_timeout_ms: int = Field(default=8000, alias="VOICE_AGENT_EOT_TIMEOUT_MS")
    semantic_no_punctuation_ms: int = Field(
        default=1200,
        alias="VOICE_AGENT_SEMANTIC_NO_PUNCTUATION_MS",
    )
    semantic_filler_ms: int = Field(default=1800, alias="VOICE_AGENT_SEMANTIC_FILLER_MS")
    session_idle_timeout_seconds: int = Field(default=900, alias="VOICE_AGENT_IDLE_TIMEOUT_SECONDS")

    @cached_property
    def videosdk_token(self) -> str:
        if self.videosdk_auth_token:
            return self.videosdk_auth_token.get_secret_value()

        if not self.videosdk_api_key or not self.videosdk_secret_key:
            raise RuntimeError(
                "Set VIDEOSDK_AUTH_TOKEN or both VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY."
            )

        issued_at = int(time.time())
        payload = {
            "apikey": self.videosdk_api_key,
            "permissions": ["allow_join", "allow_mod"],
            "roles": ["rtc"],
            "version": 2,
            "iat": issued_at,
            "exp": issued_at + 60 * 60,
        }
        return jwt.encode(
            payload,
            self.videosdk_secret_key.get_secret_value(),
            algorithm="HS256",
        )

    @staticmethod
    def deepgram_language(language: AppLanguage) -> str:
        return {
            "en": "en-IN",
            "hi": "hi",
            "hinglish": "hi",
            "bho": "hi",
            "mr": "hi",
            "ta": "ta",
            "te": "te",
        }.get(language, "multi")

    def deepgram_model(self, language: AppLanguage) -> str:
        if language in ("en", "hi", "hinglish"):
            return self.stt_primary
        return self.stt_fallback

    def deepgram_stt_options(self, language: AppLanguage) -> dict[str, object]:
        model = self.deepgram_model(language)
        options: dict[str, object] = {
            "model": model,
            "interim_results": True,
            "punctuate": True,
            "smart_format": True,
        }

        if not model.startswith("flux-"):
            options["language"] = self.deepgram_language(language)
            options["endpointing"] = self.semantic_no_punctuation_ms

        return options
