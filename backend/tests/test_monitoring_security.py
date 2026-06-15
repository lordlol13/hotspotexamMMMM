from app.config import settings


def test_health_and_readiness(client):
    assert client.get("/health").json() == {"status": "healthy"}
    assert client.get("/ready").json() == {"status": "ready"}


def test_password_reset_does_not_disclose_unknown_email(client):
    response = client.post("/api/v1/auth/password-reset/request", json={"email": "unknown@example.com"})
    assert response.status_code == 200
    assert "If the account exists" in response.json()["message"]


def test_teacher_registration_can_be_disabled(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ALLOW_TEACHER_REGISTRATION", False)
    response = client.post(
        "/api/v1/auth/register/teacher",
        json={
            "email": "blocked@example.com",
            "password": "strong-password",
            "first_name": "Blocked",
            "last_name": "Teacher",
            "username": "blockedteacher",
        },
    )
    assert response.status_code == 403
