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

### Render

1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Select **Docker** as the runtime.
4. Set the Dockerfile path to `ai-worker/Dockerfile`.
5. Set the root/build context to `ai-worker` if Render asks for one.
6. Add the environment variables below.
7. Deploy, then copy the generated `https://*.onrender.com` URL into Vercel as `VOICE_AGENT_WORKER_URL`.

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
VOICE_AGENT_WORKER_SECRET=
VOICE_AGENT_NAME=Nivesh Saathi
```

After deploy, verify:

```text
https://your-worker.onrender.com/health
```

It should return:

```json
{"ok":true,"activeSessions":0}
```
