import pytest
import io
import os
from PIL import Image
from app.models.user import User, Teacher
from app.models.course import Course
from app.models.slide import Slide
from app.core.security import create_access_token

@pytest.fixture
def teacher_auth_headers(db):
    """Fixture to create a verified teacher and return their Authorization headers."""
    # Create User
    user = User(
        email="teacher_slide@edu.ru",
        username="teacherslide",
        hashed_password="hashedpassword123",
        first_name="Professor",
        last_name="Slide",
        role="teacher",
        is_verified=True
    )
    db.add(user)
    db.flush()
    
    # Create Teacher
    teacher = Teacher(id=user.id, department="Pathology")
    db.add(teacher)
    
    # Create Course
    course = Course(
        title="Intro to Pathology",
        code="PATH-101",
        teacher_id=teacher.id,
        is_active=True,
        max_students=100
    )
    db.add(course)
    db.commit()
    
    token = create_access_token(subject=user.id, role="teacher")
    return {"Authorization": f"Bearer {token}"}, course.id

def test_slide_upload_and_tile_serving(client, db, teacher_auth_headers):
    """
    Test uploading a slide, extracting its metadata, serving DZI XML,
    and retrieving on-demand generated tiles.
    """
    headers, course_id = teacher_auth_headers
    
    # 1. Create a dummy image in memory to simulate slide upload
    img_byte_arr = io.BytesIO()
    img = Image.new('RGB', (1000, 1000), color = 'red')
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    # 2. Upload slide via API
    upload_data = {
        "title": "Mitosis Stage 1",
        "description": "High resolution dummy slide",
        "course_id": str(course_id)
    }
    
    files = {
        "file": ("mitosis.jpeg", img_byte_arr, "image/jpeg")
    }
    
    response = client.post(
        "/api/v1/slides/upload",
        headers=headers,
        data=upload_data,
        files=files
    )
    
    assert response.status_code == 201
    data = response.json()
    slide_id = data["id"]
    assert data["title"] == "Mitosis Stage 1"
    assert data["original_filename"] == "mitosis.jpeg"
    assert data["is_processed"] is False  # Initial response payload is serialized before background tasks run

    # Fetch slide details again to ensure background task finished and committed
    get_response = client.get(f"/api/v1/slides/{slide_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["is_processed"] is True
    
    # Verify in DB
    slide = db.query(Slide).filter(Slide.id == slide_id).first()
    assert slide is not None
    assert slide.width == 1000
    assert slide.height == 1000
    assert slide.is_processed is True
    
    # 3. Retrieve DZI descriptor XML
    dzi_response = client.get(f"/api/v1/slides/{slide_id}/dzi", headers=headers)
    assert dzi_response.status_code == 200
    assert "application/xml" in dzi_response.headers["content-type"]
    assert "TileSize=\"256\"" in dzi_response.text
    
    # 4. Fetch dynamic tile
    # Level 9 is standard in deep zoom levels
    tile_response = client.get(f"/api/v1/slides/{slide_id}/tiles/9/0_0.jpeg", headers=headers)
    assert tile_response.status_code == 200
    assert "image/jpeg" in tile_response.headers["content-type"]
    assert len(tile_response.content) > 0
    
    # 5. Fetch slide thumbnail
    thumb_response = client.get(f"/api/v1/slides/{slide_id}/thumbnail", headers=headers)
    assert thumb_response.status_code == 200
    assert "image/jpeg" in thumb_response.headers["content-type"]
    
    # 6. Delete slide
    delete_response = client.delete(f"/api/v1/slides/{slide_id}", headers=headers)
    assert delete_response.status_code == 204
    
    # Verify DB cleanup
    assert db.query(Slide).filter(Slide.id == slide_id).first() is None
    # Verify file is deleted from uploads dir
    slide_dir = os.path.join("uploads", "slides", str(slide_id))
    assert not os.path.exists(slide_dir)
