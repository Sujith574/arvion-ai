# Use an official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8080

# Set work directory
WORKDIR /app

# Install system dependencies for some Python packages (e.g., for FAISS or bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model to avoid runtime rate limits
COPY scripts/download_model.py scripts/
RUN python scripts/download_model.py && rm scripts/download_model.py

# Point to local model path and enforce offline mode
ENV EMBEDDING_MODEL=/app/model_cache
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1
ENV SENTENCE_TRANSFORMERS_HOME=/app/model_cache

# Copy project
COPY . .

# Expose port
EXPOSE 8080

# Command to run the application using uvicorn
# Cloud Run expects the app to listen on the port defined by $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
