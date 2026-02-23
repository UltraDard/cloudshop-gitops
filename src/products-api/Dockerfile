FROM python:3.11-alpine AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-alpine
WORKDIR /app
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
COPY --chown=appuser:appgroup . .
USER appuser
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8082/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]
