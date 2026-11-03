import pytest
from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.v1 import authentication_router as auth


class FakeUsers:
    def __init__(self):
        self.docs = []

    async def find_one(self, query):
        for doc in self.docs:
            for cond in query.get("$or", [query]):
                if all(doc.get(k) == v for k, v in cond.items()):
                    return dict(doc)
        return None

    async def insert_one(self, doc):
        stored = {**doc, "_id": ObjectId()}
        self.docs.append(stored)
        return type("R", (), {"inserted_id": stored["_id"]})()

    async def update_one(self, query, update):
        for doc in self.docs:
            if doc["_id"] == query["_id"]:
                doc.update(update.get("$set", {}))
                for k, v in update.get("$inc", {}).items():
                    doc[k] = doc.get(k, 0) + v


@pytest.fixture
def client(monkeypatch):
    users = FakeUsers()

    async def get_users():
        return users

    monkeypatch.setattr(auth, "get_users_collection", get_users)
    app = FastAPI()
    app.include_router(auth.router)
    c = TestClient(app)
    c.post("/auth/register", json={"username": "alice", "email": "alice@example.com", "password": "secret1", "full_name": "Alice"})
    return c


def login(client, password="secret1"):
    r = client.post("/auth/login", json={"username": "alice", "password": password})
    return r


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_change_password_rotates_tokens(client):
    old = login(client).json()["access_token"]
    r = client.post("/auth/change-password", headers=bearer(old), json={"current_password": "secret1", "new_password": "secret2"})
    assert r.status_code == 200
    new = r.json()["access_token"]
    assert client.get("/auth/me", headers=bearer(old)).status_code == 401
    assert client.get("/auth/me", headers=bearer(new)).status_code == 200
    assert login(client, "secret1").status_code == 401
    assert login(client, "secret2").status_code == 200


def test_change_password_rejects_wrong_current(client):
    token = login(client).json()["access_token"]
    r = client.post("/auth/change-password", headers=bearer(token), json={"current_password": "nope", "new_password": "secret2"})
    assert r.status_code == 400
    assert client.get("/auth/me", headers=bearer(token)).status_code == 200


def test_change_password_rejects_same_password(client):
    token = login(client).json()["access_token"]
    r = client.post("/auth/change-password", headers=bearer(token), json={"current_password": "secret1", "new_password": "secret1"})
    assert r.status_code == 400


def test_logout_all_invalidates_every_token(client):
    a = login(client).json()["access_token"]
    b = login(client).json()["access_token"]
    assert client.post("/auth/logout-all", headers=bearer(a)).status_code == 200
    assert client.get("/auth/me", headers=bearer(a)).status_code == 401
    assert client.get("/auth/me", headers=bearer(b)).status_code == 401
    assert client.get("/auth/me", headers=bearer(login(client).json()["access_token"])).status_code == 200
