FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/cache/huggingface \
    TRANSFORMERS_CACHE=/cache/huggingface/transformers

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY ai_model/inference/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements.txt

COPY ai_model/__init__.py /app/ai_model/__init__.py
COPY ai_model/inference /app/ai_model/inference

EXPOSE 8000

CMD ["uvicorn", "ai_model.inference.app:app", "--host", "0.0.0.0", "--port", "8000"]
