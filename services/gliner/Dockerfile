FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY services/gliner/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/gliner/app ./services/gliner/app
COPY config ./config

EXPOSE 8000
CMD ["uvicorn", "services.gliner.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

