import pytest
from app.models.user import User, Student, Teacher
from app.models.group import Group
from app.models.enums import UserRole

def test_student_registration(client, db):
    """
    Test student registration endpoint with all required fields.
    """
    registration_data = {
        "email": "student@edu.ru",
        "password": "testpassword123",
        "first_name": "Ivan",
        "last_name": "Petrov",
        "student_code": "STU123456",
        "faculty": "Medicine",
        "course_name": "Pathology",
        "group_name": "Group-101"
    }
    
    response = client.post("/api/v1/auth/register/student", json=registration_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "student@edu.ru"
    assert data["first_name"] == "Ivan"
    assert data["last_name"] == "Petrov"
    assert data["role"] == "student"
    assert data["is_verified"] is False  # Starts unverified
    assert data["student_profile"] is not None
    assert data["student_profile"]["student_code"] == "STU123456"
    assert data["student_profile"]["faculty"] == "Medicine"
    assert data["student_profile"]["course_name"] == "Pathology"
    
    # Check if user exists in db
    user = db.query(User).filter(User.email == "student@edu.ru").first()
    assert user is not None
    assert user.student_profile is not None
    assert user.student_profile.student_code == "STU123456"
    
    # Check if Group was auto-created and linked
    group = db.query(Group).filter(Group.name == "Group-101").first()
    assert group is not None
    assert user.student_profile.group_id == group.id

def test_teacher_registration(client, db):
    """
    Test teacher registration endpoint.
    """
    registration_data = {
        "email": "teacher@edu.ru",
        "password": "testpassword123",
        "first_name": "Elena",
        "last_name": "Sidorova",
        "username": "elenasid",
        "department": "Immunology",
        "title": "Professor"
    }
    
    response = client.post("/api/v1/auth/register/teacher", json=registration_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "teacher@edu.ru"
    assert data["first_name"] == "Elena"
    assert data["last_name"] == "Sidorova"
    assert data["role"] == "teacher"
    assert data["teacher_profile"] is not None
    assert data["teacher_profile"]["department"] == "Immunology"
    assert data["teacher_profile"]["title"] == "Professor"
    
    # Check if user exists in db
    user = db.query(User).filter(User.email == "teacher@edu.ru").first()
    assert user is not None
    assert user.teacher_profile is not None
    assert user.teacher_profile.department == "Immunology"

def test_email_verification(client, db):
    """
    Test verifying student email using verification token.
    """
    # 1. Register student
    registration_data = {
        "email": "verify@edu.ru",
        "password": "testpassword123",
        "first_name": "Alice",
        "last_name": "Smith",
        "student_code": "STU7890",
        "faculty": "Biology",
        "course_name": "Histology",
        "group_name": "Group-202"
    }
    client.post("/api/v1/auth/register/student", json=registration_data)
    
    # Get user token from db
    user = db.query(User).filter(User.email == "verify@edu.ru").first()
    token = user.verification_token
    assert token is not None
    assert user.is_verified is False
    
    # 2. Verify email
    verify_response = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert verify_response.status_code == 200
    
    # Check state in db
    db.refresh(user)
    assert user.is_verified is True
    assert user.verification_token is None

def test_login_and_refresh_flow(client, db):
    """
    Test authenticating a user (login) and using refresh token to get a new access token.
    """
    # Register and verify a student
    registration_data = {
        "email": "login@edu.ru",
        "password": "testpassword123",
        "first_name": "Bob",
        "last_name": "Jones",
        "student_code": "STU1111",
        "faculty": "Medicine",
        "course_name": "Pathology",
        "group_name": "Group-101"
    }
    client.post("/api/v1/auth/register/student", json=registration_data)
    
    user = db.query(User).filter(User.email == "login@edu.ru").first()
    user.is_verified = True
    db.commit()
    
    # Login via json
    login_response = client.post("/api/v1/auth/login", json={
        "username_or_email": "login@edu.ru",
        "password": "testpassword123"
    })
    assert login_response.status_code == 200
    tokens = login_response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    
    # Get /me details
    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "login@edu.ru"
    
    # Refresh token
    refresh_token = tokens["refresh_token"]
    refresh_response = client.post(f"/api/v1/auth/refresh?refresh_token={refresh_token}")
    assert refresh_response.status_code == 200
    new_tokens = refresh_response.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens

def test_role_based_access_control(client, db):
    """
    Test Role-based authorization rules (RBAC).
    """
    # Create student
    stu_register = {
        "email": "stu_rbac@edu.ru",
        "password": "testpassword123",
        "first_name": "Stu",
        "last_name": "Rbac",
        "student_code": "STU222",
        "faculty": "Medicine",
        "course_name": "Pathology"
    }
    client.post("/api/v1/auth/register/student", json=stu_register)
    stu_user = db.query(User).filter(User.email == "stu_rbac@edu.ru").first()
    stu_user.is_verified = True
    db.commit()
    
    # Create teacher
    tea_register = {
        "email": "tea_rbac@edu.ru",
        "password": "testpassword123",
        "first_name": "Tea",
        "last_name": "Rbac",
        "username": "tearbac",
        "department": "Immunology"
    }
    client.post("/api/v1/auth/register/teacher", json=tea_register)
    tea_user = db.query(User).filter(User.email == "tea_rbac@edu.ru").first()
    tea_user.is_verified = True
    db.commit()
    
    # Login Student
    stu_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "stu_rbac@edu.ru",
        "password": "testpassword123"
    }).json()
    
    # Login Teacher
    tea_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "tea_rbac@edu.ru",
        "password": "testpassword123"
    }).json()
    
    # 1. Access teacher endpoint as student -> Expect 403 Forbidden
    stu_headers = {"Authorization": f"Bearer {stu_login['access_token']}"}
    response = client.get("/api/v1/test-teacher-only", headers=stu_headers)
    assert response.status_code == 403
    
    # 2. Access teacher endpoint as teacher -> Expect 200 Success
    tea_headers = {"Authorization": f"Bearer {tea_login['access_token']}"}
    response = client.get("/api/v1/test-teacher-only", headers=tea_headers)
    assert response.status_code == 200
    assert response.json()["user"] == "tea_rbac@edu.ru"


def test_student_registration_no_group(client, db):
    """
    Test student registration with 'Без группы' option to ensure no group is created.
    """
    registration_data = {
        "email": "student_nogroup@edu.ru",
        "password": "testpassword123",
        "first_name": "No",
        "last_name": "Group",
        "student_code": "STU999999",
        "faculty": "Medicine",
        "course_name": "Pathology",
        "group_name": "Без группы"
    }
    
    response = client.post("/api/v1/auth/register/student", json=registration_data)
    assert response.status_code == 201
    
    # Check if user exists in db
    user = db.query(User).filter(User.email == "student_nogroup@edu.ru").first()
    assert user is not None
    assert user.student_profile is not None
    assert user.student_profile.group_id is None
    
    # Ensure there is no group in database named 'Без группы'
    group = db.query(Group).filter(Group.name == "Без группы").first()
    assert group is None

