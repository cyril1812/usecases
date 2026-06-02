import pytest
from app.auth import get_password_hash, verify_password, create_access_token
from jose import jwt
from app.config import settings

def test_password_hashing():
    password = "super-secret-password-123"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False

def test_jwt_token_generation():
    data = {"sub": "test@healthcare.org"}
    token = create_access_token(data)
    
    assert token is not None
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("sub") == "test@healthcare.org"
    assert "exp" in payload
