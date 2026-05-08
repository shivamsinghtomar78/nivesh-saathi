# Nivesh Saathi VideoSDK Voice Agent Worker

This is the self-hosted Python worker for the app's realtime voice agent. The Next.js app creates a VideoSDK room and calls this worker at `POST /sessions`; the worker joins the same room as the AI participant and runs:

User microphone in VideoSDK room -> Deepgram STT -> Silero VAD / turn detector -> Groq `llama-3.3-70b-versatile` -> ElevenLabs TTS -> AI audio back into the VideoSDK room. Completed turns are also reported to the Next.js app at `/api/voice/turn` for conversation memory and analytics.

## Local Run

```bash
cd ai-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m nivesh_voice_agent serve --host 0.0.0.0 --port 8080
```

Set `VOICE_AGENT_WORKER_URL=http://localhost:8080` and the same `VOICE_AGENT_WORKER_SECRET` in the Next.js `.env.local`. Set `VOICE_AGENT_APP_URL=http://localhost:3000` in the worker `.env` so turn reports can reach the app.

## Deployment

Run this as a long-lived service on Render, Fly.io, ECS, Kubernetes, or a VM. Scale horizontally by running multiple replicas behind a load balancer. The service is idempotent per `roomId`, so repeated dispatches for the same room reuse the running session.

### Render

Use the root `render.yaml` Blueprint, or configure the service manually with these settings:

- Runtime: **Docker**
- Dockerfile path: `./ai-worker/Dockerfile`
- Docker context: `./ai-worker`
- Health check path: `/health`

If the Render logs show `npm run start` or `next start`, the service is using the repo root Node app instead of this Python worker.

For realtime voice, use a non-sleeping Render instance type when possible. A sleeping free instance can make the first room dispatch too slow.

After deploy, copy the generated `https://*.onrender.com` URL into Vercel as `VOICE_AGENT_WORKER_URL`.

Required worker env:

```env
VIDEOSDK_API_KEY=
VIDEOSDK_SECRET_KEY=
DEEPGRAM_API_KEY=
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL=eleven_flash_v2_5
VOICE_AGENT_APP_URL=
VOICE_AGENT_WORKER_SECRET=
VOICE_AGENT_NAME=Nivesh Saathi
VOICE_AGENT_STT_PRIMARY=flux-general-multi
VOICE_AGENT_STT_FALLBACK=nova-3
VOICE_AGENT_EOT_THRESHOLD=0.78
VOICE_AGENT_EAGER_EOT_THRESHOLD=0.55
VOICE_AGENT_EOT_TIMEOUT_MS=8000
VOICE_AGENT_SEMANTIC_NO_PUNCTUATION_MS=1200
VOICE_AGENT_SEMANTIC_FILLER_MS=1800
```

After deploy, verify:

```text
https://your-worker.onrender.com/health
```

It should return:

```json
{"ok":true,"activeSessions":0}
```
