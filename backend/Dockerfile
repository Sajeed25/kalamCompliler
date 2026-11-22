FROM python:3.13-slim

# gcc/g++ are only needed for KALAM_EXECUTOR=local (single-server mode without Piston).
ARG INSTALL_COMPILERS=false
RUN if [ "$INSTALL_COMPILERS" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends gcc g++ libc6-dev && rm -rf /var/lib/apt/lists/*; \
    fi

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY config ./config

RUN useradd --system --uid 10001 --no-create-home kalam
# Piston mode runs as an unprivileged user. Local-executor mode overrides this
# to root so it can drop each student program to `nobody` (see docker-compose.local.yml).
USER kalam
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--no-access-log"]
