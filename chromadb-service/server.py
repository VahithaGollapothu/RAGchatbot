"""
ChromaDB FastAPI Microservice
Handles document ingestion, embedding, and semantic search
"""

import os
import uuid
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn
import torch
torch.set_num_threads(1)

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
COLLECTION_NAME = os.getenv("CHROMADB_COLLECTION", "college_knowledge")
EMBEDDING_MODEL  = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
PERSIST_DIR      = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
PORT             = int(os.getenv("CHROMADB_PORT", 8001))

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="ChromaDB RAG Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Globals (loaded on startup) ───────────────────────────────────────────────
chroma_client: chromadb.PersistentClient = None
collection: chromadb.Collection = None
embedder: SentenceTransformer = None


@app.on_event("startup")
async def startup():
    global chroma_client, collection, embedder
    logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
    embedder = SentenceTransformer(EMBEDDING_MODEL)

    logger.info(f"Connecting to ChromaDB (persist_dir={PERSIST_DIR})")
    chroma_client = chromadb.PersistentClient(
        path=PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False)
    )
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    logger.info(f"Collection '{COLLECTION_NAME}' ready. Documents: {collection.count()}")


# ── Pydantic Models ───────────────────────────────────────────────────────────
class IngestRequest(BaseModel):
    documents: List[Dict[str, Any]]
    # Each document: { text, metadata: { source, category, doc_name, chunk_id } }

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    where: Optional[Dict[str, Any]] = None   # metadata filter

class DeleteRequest(BaseModel):
    document_name: Optional[str] = None
    category: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    count = collection.count() if collection else 0
    return {"status": "ok", "collection": COLLECTION_NAME, "document_chunks": count}


@app.post("/ingest")
async def ingest(req: IngestRequest):
    """Embed and store document chunks into ChromaDB."""
    if not req.documents:
        raise HTTPException(400, "No documents provided")

    texts    = [d["text"] for d in req.documents]
    metas    = [d.get("metadata", {}) for d in req.documents]
    ids      = [str(uuid.uuid4()) for _ in req.documents]

    logger.info(f"Embedding {len(texts)} chunks...")
    embeddings = embedder.encode(texts, show_progress_bar=False).tolist()

    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metas,
    )
    logger.info(f"Ingested {len(texts)} chunks. Total: {collection.count()}")
    return {"ingested": len(texts), "total_chunks": collection.count()}


@app.post("/query")
async def query(req: QueryRequest):
    """Semantic similarity search."""
    if collection.count() == 0:
        return {"results": [], "message": "No documents indexed yet"}

    query_embedding = embedder.encode([req.query], show_progress_bar=False).tolist()

    kwargs: Dict[str, Any] = {
        "query_embeddings": query_embedding,
        "n_results": min(req.top_k, collection.count()),
        "include": ["documents", "metadatas", "distances"],
    }
    if req.where:
        kwargs["where"] = req.where

    results = collection.query(**kwargs)

    formatted = []
    for i in range(len(results["ids"][0])):
        formatted.append({
            "id":       results["ids"][0][i],
            "text":     results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score":    1 - results["distances"][0][i],   # cosine similarity
        })

    return {"results": formatted, "count": len(formatted)}


@app.get("/documents")
async def list_documents():
    """List all unique document names and categories."""
    if collection.count() == 0:
        return {"documents": [], "total_chunks": 0}

    all_data = collection.get(include=["metadatas"])
    seen = {}
    for meta in all_data["metadatas"]:
        key = meta.get("doc_name", "unknown")
        if key not in seen:
            seen[key] = {
                "doc_name": key,
                "category": meta.get("category", "unknown"),
                "source":   meta.get("source", "unknown"),
                "chunks":   0,
            }
        seen[key]["chunks"] += 1

    return {"documents": list(seen.values()), "total_chunks": collection.count()}


@app.get("/stats")
async def stats():
    """Collection statistics."""
    return {
        "collection_name": COLLECTION_NAME,
        "total_chunks":    collection.count(),
        "embedding_model": EMBEDDING_MODEL,
        "persist_dir":     PERSIST_DIR,
    }


@app.post("/reset")
async def reset():
    """Delete all documents from the collection."""
    global collection
    chroma_client.delete_collection(COLLECTION_NAME)
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
    logger.info("Collection reset.")
    return {"message": "Collection reset successfully", "total_chunks": 0}


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...), category: str = "general"):
    """Accept a .txt file, chunk it, embed, and store."""
    if not (file.filename.endswith(".txt") or file.filename.endswith(".md")):
        raise HTTPException(400, "Only .txt and .md files are supported")

    content = await file.read()
    text    = content.decode("utf-8", errors="ignore")

    # Simple chunking: 500 chars with 50 char overlap
    chunk_size = 500
    overlap    = 50
    chunks     = []
    start      = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({
                "text": chunk,
                "metadata": {
                    "doc_name": file.filename,
                    "category": category,
                    "source":   file.filename,
                    "chunk_id": len(chunks),
                }
            })
        start += chunk_size - overlap

    if not chunks:
        raise HTTPException(400, "File appears to be empty")

    texts      = [c["text"] for c in chunks]
    metas      = [c["metadata"] for c in chunks]
    ids        = [str(uuid.uuid4()) for _ in chunks]
    embeddings = embedder.encode(texts, show_progress_bar=False).tolist()

    collection.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metas)
    return {"filename": file.filename, "chunks_ingested": len(chunks), "total_chunks": collection.count()}


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)
