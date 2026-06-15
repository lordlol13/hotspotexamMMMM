import pytest
import uuid
from app.models.user import User, Teacher
from app.models.course import Course
from app.models.slide import Slide
from app.models.region import Region
from app.core.security import create_access_token
from app.models.enums import RegionType, RegionContentType

@pytest.fixture
def teacher_auth_headers(db):
    """Fixture to create a verified teacher, a course, a slide and return headers."""
    # Create User
    user = User(
        email="teacher_region@edu.ru",
        username="teacherregion",
        hashed_password="hashedpassword123",
        first_name="Professor",
        last_name="Region",
        role="teacher",
        is_verified=True
    )
    db.add(user)
    db.flush()
    
    # Create Teacher
    teacher = Teacher(id=user.id)
    db.add(teacher)
    
    # Create Course
    course = Course(
        title="Intro to Histology",
        code="HIST-REG-101",
        teacher_id=teacher.id
    )
    db.add(course)
    db.flush()
    
    # Create Slide
    slide = Slide(
        title="Mitosis Stage 2",
        original_filename="mitosis2.jpeg",
        file_path="uploads/slides/mitosis2.jpeg",
        course_id=course.id,
        uploaded_by=user.id,
        is_processed=True
    )
    db.add(slide)
    db.commit()
    
    token = create_access_token(subject=user.id, role="teacher")
    return {"Authorization": f"Bearer {token}"}, slide.id

def test_region_crud_endpoints(client, db, teacher_auth_headers):
    """
    Test creating, listing, updating, and deleting slide regions of interest.
    """
    headers, slide_id = teacher_auth_headers
    
    # 1. Create a rectangle region with a YouTube link
    create_payload = {
        "slide_id": str(slide_id),
        "title": "Nucleus Spot",
        "description": "Interactive nucleus explanation",
        "region_type": "rectangle",
        "geometry": {"x": 10.5, "y": 20.0, "w": 5.0, "h": 5.0}, # Store coords in %
        "content_type": "youtube",
        "content_data": {"media_url": "https://www.youtube.com/watch?v=mock_video_id"}
    }
    
    response = client.post("/api/v1/regions/", json=create_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    region_id = data["id"]
    assert data["title"] == "Nucleus Spot"
    assert data["region_type"] == "rectangle"
    assert data["geometry"]["x"] == 10.5
    assert data["content_type"] == "youtube"
    assert data["content_data"]["media_url"] == "https://www.youtube.com/watch?v=mock_video_id"
    
    # Verify in DB
    region = db.query(Region).filter(Region.id == region_id).first()
    assert region is not None
    assert region.geometry["x"] == 10.5
    
    # 2. List regions by slide
    list_response = client.get(f"/api/v1/regions/slide/{slide_id}", headers=headers)
    assert list_response.status_code == 200
    regions_list = list_response.json()
    assert len(regions_list) == 1
    assert regions_list[0]["id"] == region_id
    
    # 3. Update region description and geometry coordinates
    update_payload = {
        "description": "Updated description",
        "geometry": {"x": 12.0, "y": 20.0, "w": 6.0, "h": 6.0}
    }
    update_response = client.put(f"/api/v1/regions/{region_id}", json=update_payload, headers=headers)
    assert update_response.status_code == 200
    updated_data = update_response.json()
    assert updated_data["description"] == "Updated description"
    assert updated_data["geometry"]["x"] == 12.0
    
    # 4. Delete region
    delete_response = client.delete(f"/api/v1/regions/{region_id}", headers=headers)
    assert delete_response.status_code == 204
    
    # Verify DB cleanup
    assert db.query(Region).filter(Region.id == region_id).first() is None
