# Production Dockerfile for Escape the Compiler Backend
# Includes native compilers for all supported languages: Python 3, C++17, Java 17+, Node.js

FROM python:3.13-slim

# Install g++, OpenJDK (Java), and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    default-jdk-headless \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

ENV PORT=8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
