FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY monthly_returns.py .
COPY templates/ templates/
COPY static/ static/

# Create cache directory
RUN mkdir -p .stooq_cache

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV TICKER=TSLA

# Expose the port
EXPOSE 8080

# Health check to verify the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Run the application
CMD ["python", "monthly_returns.py"]
