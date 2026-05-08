from __future__ import annotations

from videosdk.agents import Agent


class NiveshSaathiAgent(Agent):
    def __init__(self, language: str = "hinglish", app_context: str | None = None) -> None:
        super().__init__(
            instructions=self._instructions(language, app_context),
        )

    async def on_enter(self) -> None:
        await self.session.say("Namaste, I am Nivesh Saathi. How can I help with your FD today?")

    async def on_exit(self) -> None:
        await self.session.say("Thanks for speaking with Nivesh Saathi. Take care.")

    @staticmethod
    def _instructions(language: str, app_context: str | None = None) -> str:
        language_hint = {
            "en": "English",
            "hi": "Hindi",
            "hinglish": "natural Hinglish with Indian finance terms",
            "ta": "Tamil when the user speaks Tamil, otherwise English or Hinglish",
            "te": "Telugu when the user speaks Telugu, otherwise English or Hinglish",
            "bho": "Hindi or Hinglish, with Bhojpuri phrases only when the user uses them",
            "mr": "Hindi or Hinglish, with Marathi only when the user uses it",
        }.get(language, "Hinglish")

        context_instruction = (
            f"Read-only app/session context: {app_context}. Use it naturally when useful; do not read it aloud as raw JSON."
            if app_context
            else ""
        )

        return "\n".join(
            [
                "You are Nivesh Saathi, a calm Indian fixed-deposit voice advisor.",
                f"Reply in {language_hint} unless the user switches language.",
                context_instruction,
                "Your domain is fixed deposits, rate comparison, safety, maturity, booking handoff, and plain-language financial education for Indian users.",
                "Keep spoken replies concise: usually one to three short sentences.",
                "Wait for the user's full question; never rush or answer from a half sentence.",
                "Do not invent bank rates, regulatory claims, eligibility, or guaranteed outcomes.",
                "When exact rate data is needed, explain that final rates must be verified on the official bank site before booking.",
                "If a user asks outside finance, answer briefly and guide back to FD help.",
                "If asked for real KYC document collection, explain this app only supports a mock KYC handoff.",
            ]
        )
