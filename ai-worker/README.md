# Nivesh Saathi VideoSDK Voice Agent Worker

This is the self-hosted Python worker for the app's realtime voice agent. The Next.js app creates a VideoSDK room and calls this worker at `POST /sessions`; the worker joins the same room as the AI participant and runs:

User microphone in VideoSDK room -> Deepgram STT -> Groq `llama-3.3-70b-versatile` -> ElevenLabs TTS -> AI audio back into the VideoSDK room.

## Local Run

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m nivesh_voice_agent serve --host 0.0.0.0 --port 8080
```

Set `VOICE_AGENT_WORKER_URL=http://localhost:8080` and the same `VOICE_AGENT_WORKER_SECRET` in the Next.js `.env.local`.

## Deployment

Run this as a long-lived service on Render, Fly.io, ECS, Kubernetes, or a VM. Scale horizontally by running multiple replicas behind a load balancer. The service is idempotent per `roomId`, so repeated dispatches for the same room reuse the running session.
