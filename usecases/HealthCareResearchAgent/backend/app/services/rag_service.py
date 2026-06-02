import os
import io
import math
import logging
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx2txt
from app.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory fallback vector store for local testing without Pinecone credentials
# Format: {chunk_id: {"document_id": int, "text": str, "vector": List[float]}}
MOCK_VECTOR_STORE: Dict[str, Dict[str, Any]] = {}
mock_id_counter = 0

class RAGService:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str) -> str:
        """Parse file content based on extension and return plain text."""
        ext = filename.split(".")[-1].lower()
        text = ""

        try:
            if ext == "pdf":
                reader = PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
                text = "\n".join(pages_text)
                
            elif ext == "docx":
                text = docx2txt.process(io.BytesIO(file_bytes))
                
            elif ext == "html" or ext == "htm":
                # Basic HTML tag cleaning
                raw_html = file_bytes.decode("utf-8", errors="ignore")
                import re
                # Remove script and style tags
                clean = re.sub(r'<(script|style).*?>.*?</\1>', '', raw_html, flags=re.DOTALL)
                # Remove html tags
                clean = re.sub(r'<[^>]*>', '', clean)
                # Collapse whitespace
                text = re.sub(r'\s+', ' ', clean).strip()
                
            else:  # Default to txt
                text = file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"Error parsing file {filename}: {str(e)}")
            raise e

        return text

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """Split text into chunks with overlap."""
        if not text:
            return []
            
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunks.append(text[start:end])
            if end == text_len:
                break
            start += chunk_size - chunk_overlap
            
        return chunks

    @staticmethod
    async def get_embedding(text: str) -> List[float]:
        """Call OpenAI API to generate embeddings, or return mock vector if offline."""
        if settings.MOCK_LLM:
            # Generate a reproducible mock vector of size 3072 (text-embedding-3-large size)
            # based on characters in text so that similarity checks can be deterministic
            vector_size = 3072
            vec = [0.0] * vector_size
            for idx, char in enumerate(text[:200]):
                v_idx = (idx * ord(char)) % vector_size
                vec[v_idx] += (ord(char) / 128.0)
            # Normalize vector
            norm = math.sqrt(sum(x*x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            return vec

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"Failed to get OpenAI embedding: {str(e)}. Falling back to mock vector.")
            # Fallback mock
            vector_size = 3072
            vec = [0.0] * vector_size
            for idx, char in enumerate(text[:200]):
                v_idx = (idx * ord(char)) % vector_size
                vec[v_idx] += 1.0
            norm = math.sqrt(sum(x*x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            return vec

    @staticmethod
    async def index_chunks(document_id: int, chunks: List[str]) -> List[str]:
        """Store chunk vectors in Pinecone (or local fallback). Returns list of vector IDs."""
        global mock_id_counter
        vector_ids = []
        
        embeddings = []
        for chunk in chunks:
            emb = await RAGService.get_embedding(chunk)
            embeddings.append(emb)

        if settings.MOCK_PINECONE:
            # Index locally in-memory
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                vector_id = f"doc_{document_id}_chunk_{i}"
                MOCK_VECTOR_STORE[vector_id] = {
                    "document_id": document_id,
                    "text": chunk,
                    "vector": emb
                }
                vector_ids.append(vector_id)
            logger.info(f"Indexed {len(chunks)} chunks locally for document {document_id}")
        else:
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                index = pc.Index(settings.PINECONE_INDEX)
                
                upsert_data = []
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    vector_id = f"doc_{document_id}_chunk_{i}"
                    upsert_data.append((
                        vector_id, 
                        emb, 
                        {"document_id": document_id, "text": chunk[:500]} # Metadatas
                    ))
                    vector_ids.append(vector_id)
                
                # Batch upsert
                index.upsert(vectors=upsert_data)
                logger.info(f"Indexed {len(chunks)} chunks in Pinecone for document {document_id}")
            except Exception as e:
                logger.error(f"Pinecone indexing error: {str(e)}. Falling back to local vector store.")
                # Fallback to local
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    vector_id = f"doc_{document_id}_chunk_{i}"
                    MOCK_VECTOR_STORE[vector_id] = {
                        "document_id": document_id,
                        "text": chunk,
                        "vector": emb
                    }
                    vector_ids.append(vector_id)
                    
        return vector_ids

    @staticmethod
    async def query_similarity(query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search for query_text. Returns matched chunks with scores."""
        query_vector = await RAGService.get_embedding(query_text)
        
        if settings.MOCK_PINECONE or not MOCK_VECTOR_STORE:
            # Dynamically populate mock vector store from database if it's empty
            if not MOCK_VECTOR_STORE:
                from app.db import SessionLocal
                from app.models import DocumentChunk
                db = SessionLocal()
                try:
                    db_chunks = db.query(DocumentChunk).all()
                    for chunk in db_chunks:
                        emb = await RAGService.get_embedding(chunk.chunk_text)
                        vec_id = chunk.embedding_id or f"doc_{chunk.document_id}_chunk_{chunk.id}"
                        MOCK_VECTOR_STORE[vec_id] = {
                            "document_id": chunk.document_id,
                            "text": chunk.chunk_text,
                            "vector": emb
                        }
                except Exception as ex:
                    logger.error(f"Error seeding mock vector store from DB: {str(ex)}")
                finally:
                    db.close()

            # Search in-memory store using Cosine Similarity
            results = []
            for vec_id, chunk_info in MOCK_VECTOR_STORE.items():
                dot_product = sum(q * c for q, c in zip(query_vector, chunk_info["vector"]))
                # Since vectors are normalized, dot product is cosine similarity
                results.append({
                    "id": vec_id,
                    "document_id": chunk_info["document_id"],
                    "text": chunk_info["text"],
                    "score": dot_product
                })
            # Sort by score descending
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]
        else:
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                index = pc.Index(settings.PINECONE_INDEX)
                
                response = index.query(
                    vector=query_vector,
                    top_k=top_k,
                    include_metadata=True
                )
                
                results = []
                for match in response.matches:
                    results.append({
                        "id": match.id,
                        "document_id": match.metadata.get("document_id"),
                        "text": match.metadata.get("text", ""),
                        "score": match.score
                    })
                return results
            except Exception as e:
                logger.error(f"Pinecone query error: {str(e)}. Falling back to local search.")
                # Fallback to local
                results = []
                for vec_id, chunk_info in MOCK_VECTOR_STORE.items():
                    dot_product = sum(q * c for q, c in zip(query_vector, chunk_info["vector"]))
                    results.append({
                        "id": vec_id,
                        "document_id": chunk_info["document_id"],
                        "text": chunk_info["text"],
                        "score": dot_product
                    })
                results.sort(key=lambda x: x["score"], reverse=True)
                return results[:top_k]
