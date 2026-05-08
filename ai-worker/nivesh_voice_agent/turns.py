from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal


Reason = Literal["punctuation", "number", "filler", "incomplete", "no_punctuation", "empty"]

_CLEAR_PUNCTUATION_RE = re.compile(r"[.!?।]$")
_NUMBER_END_RE = re.compile(r"\b\d+([.,]\d+)?$")
_FILLER_RE = re.compile(
    r"\b(um+|uh+|umm+|hmm+|hmmm+|let me think|actually|ek minute|ruk|soch|wait|hold on|matlab|basically)\b",
    re.I,
)
_INCOMPLETE_END_RE = re.compile(
    r"\b(and|or|but|because|for|to|with|ki|ke|ka|ko|mein|main|mujhe|agar|kyunki|aur|ya|lekin|actually|then)$",
    re.I,
)
_BACKCHANNEL_RE = re.compile(
    r"^(ok|okay|right|haan|ha|yes|yeah|yep|hmm|hm|mm|mm-hmm|uh-huh|got it|theek hai|accha|achha)$",
    re.I,
)


@dataclass(frozen=True)
class EndpointDecision:
    confidence: Literal["low", "medium", "high"]
    reason: Reason
    should_endpoint: bool
    wait_ms: int


def normalize_transcript(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def remove_repeated_words(value: str) -> str:
    words = normalize_transcript(value).split(" ")
    cleaned: list[str] = []
    for word in words:
        if cleaned and cleaned[-1].lower() == word.lower():
            continue
        cleaned.append(word)
    return " ".join(cleaned)


def is_backchannel(value: str) -> bool:
    return bool(_BACKCHANNEL_RE.match(normalize_transcript(value)))


def endpoint_decision(
    transcript: str,
    *,
    punctuation_ms: int = 650,
    no_punctuation_ms: int = 1200,
    filler_ms: int = 1800,
    max_silence_ms: int = 8000,
) -> EndpointDecision:
    text = normalize_transcript(transcript)
    if not text:
        return EndpointDecision("low", "empty", False, max_silence_ms)

    if _FILLER_RE.search(text):
        return EndpointDecision("low", "filler", False, filler_ms)

    if _INCOMPLETE_END_RE.search(text):
        return EndpointDecision("medium", "incomplete", False, filler_ms)

    if _NUMBER_END_RE.search(text):
        return EndpointDecision("medium", "number", True, no_punctuation_ms)

    if _CLEAR_PUNCTUATION_RE.search(text):
        return EndpointDecision("high", "punctuation", True, punctuation_ms)

    return EndpointDecision("medium", "no_punctuation", True, no_punctuation_ms)
