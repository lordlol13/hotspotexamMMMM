import pytest
import uuid
from datetime import datetime, timezone
from app.models.user import User, Teacher, Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import ExamQuestion, QuestionOption
from app.models.attempt import ExamAttempt, AttemptAnswer
from app.models.group import Group
from app.models.enrollment import CourseEnrollment
from app.core.security import create_access_token
from app.models.enums import UserRole

@pytest.fixture
def analytics_setup_data(db):
    """Fixture to set up a group, courses, users, and exam attempts for analytics testing."""
    # Create group
    group = Group(name="Group 1-A", description="First year histology")
    db.add(group)
    db.flush()

    # Create Teacher
    teacher_user = User(
        email="teacher_analytics@edu.ru",
        username="teacheranalytics",
        hashed_password="hashedpassword123",
        first_name="Dr.",
        last_name="Analytics",
        role=UserRole.TEACHER,
        is_verified=True
    )
    db.add(teacher_user)
    db.flush()
    teacher = Teacher(id=teacher_user.id)
    db.add(teacher)

    # Create Course
    course = Course(
        title="Histology Analytics",
        code="HIST-AN-101",
        teacher_id=teacher.id
    )
    db.add(course)
    db.flush()

    # Associate group with course
    group.courses.append(course)

    # Create Student
    student_user = User(
        email="student_analytics@edu.ru",
        username="studentanalytics",
        hashed_password="hashedpassword123",
        first_name="Jane",
        last_name="Doe",
        role=UserRole.STUDENT,
        is_verified=True
    )
    db.add(student_user)
    db.flush()
    student = Student(id=student_user.id, course_name="Histology", faculty="Biology", group_id=group.id)
    db.add(student)
    db.flush()

    # Enroll student in course
    enrollment = CourseEnrollment(student_id=student.id, course_id=course.id, is_active=True)
    db.add(enrollment)
    db.flush()

    # Create Exam
    exam = Exam(
        title="Cell Structure",
        course_id=course.id,
        duration_minutes=20,
        passing_score=60.0,
        is_active=True,
        attempt_limit=2,
        created_by=teacher_user.id
    )
    db.add(exam)
    db.flush()

    # Create Question
    question = ExamQuestion(
        exam_id=exam.id,
        question_text="What is cell cytoplasm?",
        question_type="short_answer",
        points=5.0,
        order_index=1
    )
    db.add(question)
    db.flush()

    # Create Option
    opt = QuestionOption(
        question_id=question.id,
        option_text="fluid",
        is_correct=True,
        order_index=1
    )
    db.add(opt)
    db.flush()

    # Create Attempt 1 (submitted & graded 100%)
    attempt1 = ExamAttempt(
        exam_id=exam.id,
        student_id=student.id,
        attempt_number=1,
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
        score=5.0,
        max_score=5.0,
        is_graded=True
    )
    db.add(attempt1)
    db.flush()

    ans1 = AttemptAnswer(
        attempt_id=attempt1.id,
        question_id=question.id,
        text_answer="fluid",
        points_awarded=5.0
    )
    db.add(ans1)
    db.commit()

    teacher_token = create_access_token(subject=teacher_user.id, role=UserRole.TEACHER)
    student_token = create_access_token(subject=student_user.id, role=UserRole.STUDENT)

    return {
        "teacher_headers": {"Authorization": f"Bearer {teacher_token}"},
        "student_headers": {"Authorization": f"Bearer {student_token}"},
        "student_id": student.id
    }

def test_analytics_endpoints(client, analytics_setup_data):
    """Verify that student and teacher analytics endpoints calculate aggregates and return them correctly."""
    t_headers = analytics_setup_data["teacher_headers"]
    s_headers = analytics_setup_data["student_headers"]

    # 1. Fetch Student Analytics
    s_response = client.get("/api/v1/analytics/student", headers=s_headers)
    assert s_response.status_code == 200
    s_data = s_response.json()
    
    assert s_data["average_score"] == 100.0
    assert s_data["completion_rate"] == 100.0
    assert len(s_data["exam_history"]) == 1
    assert s_data["exam_history"][0]["exam_title"] == "Cell Structure"
    assert s_data["exam_history"][0]["passed"] is True
    assert len(s_data["score_trends"]) == 1

    # 2. Fetch Teacher Analytics
    t_response = client.get("/api/v1/analytics/teacher", headers=t_headers)
    assert t_response.status_code == 200
    t_data = t_response.json()

    assert len(t_data["group_statistics"]) == 1
    assert t_data["group_statistics"][0]["group_name"] == "Group 1-A"
    assert t_data["group_statistics"][0]["average_score"] == 100.0
    assert t_data["group_statistics"][0]["pass_rate"] == 100.0
    assert t_data["group_statistics"][0]["fail_rate"] == 0.0

    assert len(t_data["student_rankings"]) == 1
    assert t_data["student_rankings"][0]["student_name"] == "Jane Doe"
    assert t_data["student_rankings"][0]["average_score"] == 100.0

    assert t_data["overall_stats"]["average_score"] == 100.0
    assert t_data["overall_stats"]["pass_rate"] == 100.0
    assert t_data["overall_stats"]["total_attempts"] == 1

    assert len(t_data["question_difficulty"]) == 1
    assert t_data["question_difficulty"][0]["correct_percentage"] == 100.0
    assert t_data["question_difficulty"][0]["total_responses"] == 1
