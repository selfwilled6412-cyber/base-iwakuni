FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /service
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY analyzer.py app.py ./
RUN useradd --system --uid 10001 --home /tmp/saiko --create-home --shell /usr/sbin/nologin saiko
USER 10001
EXPOSE 8766
HEALTHCHECK --interval=30s --timeout=4s --start-period=25s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8766/health', timeout=3)" || exit 1
# Bind only on an authenticated private network or behind an HTTPS reverse proxy.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8766", "--workers", "1"]
