FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY nivesh_voice_agent ./nivesh_voice_agent

EXPOSE 8080

CMD ["python", "-m", "nivesh_voice_agent", "serve", "--host", "0.0.0.0", "--port", "8080"]
