FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model
RUN python -c "from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2; ONNXMiniLM_L6_V2()"

COPY server.py .

RUN mkdir -p /app/chroma_data

ENV CHROMADB_COLLECTION=college_knowledge
ENV EMBEDDING_MODEL=all-MiniLM-L6-v2
ENV CHROMA_PERSIST_DIR=/app/chroma_data
ENV CHROMADB_PORT=8001
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV VECLIB_MAXIMUM_THREADS=1
ENV NUMEXPR_NUM_THREADS=1

EXPOSE 8001

CMD ["python", "server.py"]
