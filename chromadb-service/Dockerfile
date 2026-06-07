FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY server.py .

RUN mkdir -p /app/chroma_data

ENV CHROMADB_COLLECTION=college_knowledge
ENV EMBEDDING_MODEL=all-MiniLM-L6-v2
ENV CHROMA_PERSIST_DIR=/app/chroma_data
ENV CHROMADB_PORT=8001

EXPOSE 8001

CMD ["python", "server.py"]
