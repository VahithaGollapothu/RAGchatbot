"""
ChromaDB FastAPI Microservice
Handles document ingestion, embedding, and semantic search
"""

import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import uuid
import time
import random
import logging
import gc
from pathlib import Path
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings
from chromadb.errors import ChromaError
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
import uvicorn

from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def execute_with_retry(func, *args, **kwargs):
    """Executes a function with exponential backoff retries on 429 rate limit exceptions."""
    max_retries = 5
    initial_backoff = 1.0
    backoff_factor = 2.0
    retries = 0
    backoff = initial_backoff
    
    while True:
        try:
            return func(*args, **kwargs)
        except Exception as e:
            err_str = str(e).lower()
            is_429 = (
                "429" in err_str or
                "too many requests" in err_str or
                (hasattr(e, "code") and ((callable(e.code) and e.code() == 429) or (not callable(e.code) and e.code == 429))) or
                getattr(e, "status_code", None) == 429 or
                (hasattr(e, "response") and getattr(e.response, "status_code", None) == 429)
            )
            
            if is_429 and retries < max_retries:
                sleep_time = backoff + random.uniform(0, 0.5)
                logger.warning(
                    f"ChromaDB 429 Rate Limit encountered. Retrying {func.__name__} in {sleep_time:.2f}s... "
                    f"(Attempt {retries + 1}/{max_retries})"
                )
                time.sleep(sleep_time)
                retries += 1
                backoff *= backoff_factor
            else:
                raise e


class OptimizedONNXMiniLM_L6_V2(ONNXMiniLM_L6_V2):
    """Subclass of ONNXMiniLM_L6_V2 that configures SessionOptions for minimal memory usage on CPU."""
    @property
    def model(self) -> Any:
        if hasattr(self, "_model_cached"):
            return self._model_cached

        if self._preferred_providers is None or len(self._preferred_providers) == 0:
            if len(self.ort.get_available_providers()) > 0:
                logger.info(
                    f"WARNING: No ONNX providers provided, defaulting to available providers: "
                    f"{self.ort.get_available_providers()}"
                )
            self._preferred_providers = self.ort.get_available_providers()
        elif not set(self._preferred_providers).issubset(
            set(self.ort.get_available_providers())
        ):
            raise ValueError(
                f"Preferred providers must be subset of available providers: {self.ort.get_available_providers()}"
            )

        # Configure session options for minimal memory usage
        so = self.ort.SessionOptions()
        so.log_severity_level = 3
        so.graph_optimization_level = self.ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        # Optimize memory usage
        so.intra_op_num_threads = 1
        so.inter_op_num_threads = 1
        so.enable_cpu_mem_arena = False
        so.enable_memory_pattern = False
        
        logger.info("Initializing optimized ONNX InferenceSession (minimal memory)...")

        if (
            self._preferred_providers
            and "CoreMLExecutionProvider" in self._preferred_providers
        ):
            self._preferred_providers.remove("CoreMLExecutionProvider")

        import os
        model_path = os.path.join(self.DOWNLOAD_PATH, self.EXTRACTED_FOLDER_NAME, "model.onnx")
        self._model_cached = self.ort.InferenceSession(
            model_path,
            providers=self._preferred_providers,
            sess_options=so,
        )
        return self._model_cached


# ── Config ────────────────────────────────────────────────────────────────────
COLLECTION_NAME = os.getenv("CHROMADB_COLLECTION", "college_knowledge")
PERSIST_DIR      = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
PORT             = int(os.getenv("CHROMADB_PORT", 8001))

# Chroma Cloud Config
CHROMA_API_KEY  = os.getenv("CHROMA_API_KEY", None)
CHROMA_TENANT   = os.getenv("CHROMA_TENANT", None)
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", None)
CHROMA_HOST     = os.getenv("CHROMA_HOST", None)

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="ChromaDB RAG Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ChromaError)
async def chroma_error_handler(request, exc: ChromaError):
    status_code = exc.code() if callable(exc.code) else 500
    logger.error(f"ChromaError raised by ChromaDB SDK: {exc} (status_code={status_code})")
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc), "error_class": exc.__class__.__name__}
    )

# ── Globals (loaded on startup) ───────────────────────────────────────────────
chroma_client = None
collection: chromadb.Collection = None
embedding_function: OptimizedONNXMiniLM_L6_V2 = None


@app.on_event("startup")
async def startup():
    global chroma_client, collection, embedding_function
    logger.info("Initializing optimized ONNX embedding function (all-MiniLM-L6-v2)...")
    embedding_function = OptimizedONNXMiniLM_L6_V2()

    if CHROMA_API_KEY:
        logger.info("Connecting to Chroma Cloud (TryChroma)...")
        kwargs = {
            "api_key": CHROMA_API_KEY,
            "tenant": CHROMA_TENANT,
            "database": CHROMA_DATABASE
        }
        if CHROMA_HOST:
            kwargs["cloud_host"] = CHROMA_HOST
        
        chroma_client = chromadb.CloudClient(**kwargs)
    else:
        logger.info(f"Connecting to local ChromaDB (persist_dir={PERSIST_DIR})")
        chroma_client = chromadb.PersistentClient(
            path=PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        )

    collection = execute_with_retry(
        chroma_client.get_or_create_collection,
        name=COLLECTION_NAME,
        embedding_function=embedding_function,
        metadata={"hnsw:space": "cosine"}
    )
    doc_count = execute_with_retry(collection.count)
    logger.info(f"Collection '{COLLECTION_NAME}' ready. Documents: {doc_count}")


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
    count = execute_with_retry(collection.count) if collection else 0
    return {"status": "ok", "collection": COLLECTION_NAME, "document_chunks": count}


@app.post("/ingest")
async def ingest(req: IngestRequest):
    """Embed and store document chunks into ChromaDB."""
    if not req.documents:
        raise HTTPException(400, "No documents provided")

    texts    = [d["text"] for d in req.documents]
    metas    = [d.get("metadata", {}) for d in req.documents]
    ids      = [str(uuid.uuid4()) for _ in req.documents]

    logger.info(f"Adding {len(texts)} chunks to ChromaDB...")
    execute_with_retry(
        collection.add,
        ids=ids,
        documents=texts,
        metadatas=metas,
    )
    total_count = execute_with_retry(collection.count)
    logger.info(f"Ingested {len(texts)} chunks. Total: {total_count}")
    gc.collect()
    return {"ingested": len(texts), "total_chunks": total_count}


@app.post("/query")
async def query(req: QueryRequest):
    """Semantic similarity search."""
    total_count = execute_with_retry(collection.count)
    if total_count == 0:
        return {"results": [], "message": "No documents indexed yet"}

    kwargs: Dict[str, Any] = {
        "query_texts": [req.query],
        "n_results": min(req.top_k, total_count),
        "include": ["documents", "metadatas", "distances"],
    }
    if req.where:
        kwargs["where"] = req.where

    results = execute_with_retry(collection.query, **kwargs)

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
    total_count = execute_with_retry(collection.count)
    if total_count == 0:
        return {"documents": [], "total_chunks": 0}

    all_data = execute_with_retry(collection.get, include=["metadatas"])
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

    return {"documents": list(seen.values()), "total_chunks": total_count}


@app.get("/stats")
async def stats():
    """Collection statistics."""
    total_count = execute_with_retry(collection.count)
    return {
        "collection_name": COLLECTION_NAME,
        "total_chunks":    total_count,
        "embedding_model": "all-MiniLM-L6-v2 (ONNX)",
        "persist_dir":     PERSIST_DIR,
    }


@app.post("/reset")
async def reset():
    """Delete all documents from the collection."""
    global collection
    execute_with_retry(chroma_client.delete_collection, COLLECTION_NAME)
    collection = execute_with_retry(
        chroma_client.get_or_create_collection,
        name=COLLECTION_NAME,
        embedding_function=embedding_function,
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

    execute_with_retry(collection.add, ids=ids, documents=texts, metadatas=metas)
    total_count = execute_with_retry(collection.count)
    gc.collect()
    return {"filename": file.filename, "chunks_ingested": len(chunks), "total_chunks": total_count}


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)

