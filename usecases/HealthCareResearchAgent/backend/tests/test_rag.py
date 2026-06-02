import pytest
from app.services.rag_service import RAGService

def test_chunk_text():
    # Construct a string of length 1500
    long_text = "a" * 1500
    chunks = RAGService.chunk_text(long_text, chunk_size=1000, chunk_overlap=200)
    
    assert len(chunks) == 2
    assert len(chunks[0]) == 1000
    # Second chunk start should be 1000 - 200 = 800. Size of second chunk should be 1500 - 800 = 700
    assert len(chunks[1]) == 700

def test_chunk_text_empty():
    chunks = RAGService.chunk_text("")
    assert chunks == []
