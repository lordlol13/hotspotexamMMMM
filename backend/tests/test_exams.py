import pytest
import uuid
from datetime import datetime, timezone, timedelta
from app.models.user import User, Teacher, Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import ExamQuestion, QuestionOption
from app.models.attempt import ExamAttempt, AttemptAnswer
from app.models.retake import ExamRetake
from app.core.security import create_access_token
from app.models.enums import QuestionType, UserRole

@pytest.fixture
def exam_setup_data(db):
    """Fixture to set up users, course, and return authentications."""
    # Create Teacher
    teacher_user = User(
        email="teacher_exam@edu.ru",
        username="teacherexam",
        hashed_password="hashedpassword123",
        first_name="Prof",
        last_name="Exam",
        role=UserRole.TEACHER,
        is_verified=True
    )
    db.add(teacher_user)
    db.flush()
    teacher = Teacher(id=teacher_user.id)
    db.add(teacher)

    # Create Course
    course = Course(
        title="Histology Exams",
        code="HIST-EX-101",
        teacher_id=teacher.id
    )
    db.add(course)
    db.flush()

    # Create Student
    student_user = User(
        email="student_exam@edu.ru",
        username="studentexam",
        hashed_password="hashedpassword123",
        first_name="Alex",
        last_name="Student",
        role=UserRole.STUDENT,
        is_verified=True
    )
    db.add(student_user)
    db.flush()
    student = Student(id=student_user.id, course_name="Histology", faculty="Biology")
    db.add(student)
    db.commit()

    teacher_token = create_access_token(subject=teacher_user.id, role=UserRole.TEACHER)
    student_token = create_access_token(subject=student_user.id, role=UserRole.STUDENT)

    return {
        "teacher_headers": {"Authorization": f"Bearer {teacher_token}"},
        "student_headers": {"Authorization": f"Bearer {student_token}"},
        "course_id": course.id,
        "student_id": student.id,
        "teacher_id": teacher.id
    }

def test_exam_lifecycle_grading_and_retakes(client, db, exam_setup_data):
    """
    Test creating an exam, adding questions of various types, fetching the exam (with answer masking for students),
    taking the exam, verifying auto-grading (including multiple-choice and short-answer), attempt limits,
    assigning retakes, and retaking the exam.
    """
    t_headers = exam_setup_data["teacher_headers"]
    s_headers = exam_setup_data["student_headers"]
    course_id = exam_setup_data["course_id"]
    student_id = exam_setup_data["student_id"]

    # 1. Create an Exam
    exam_payload = {
        "title": "Mitosis and Cells Quiz",
        "description": "General mitosis histology exam",
        "course_id": str(course_id),
        "duration_minutes": 15,
        "passing_score": 75.0,
        "is_active": True,
        "attempt_limit": 1,
        "shuffle_questions": False
    }
    response = client.post("/api/v1/exams/", json=exam_payload, headers=t_headers)
    assert response.status_code == 201
    exam_data = response.json()
    exam_id = exam_data["id"]
    assert exam_data["title"] == "Mitosis and Cells Quiz"

    # 2. Add Questions: Single Choice, Multiple Choice, True/False, Short Answer, Essay
    # Question 1: Single Choice
    q1_payload = {
        "question_text": "What is the power house of the cell?",
        "question_type": "single_choice",
        "points": 2.0,
        "order_index": 1,
        "options": [
            {"option_text": "Mitochondria", "is_correct": True, "order_index": 1},
            {"option_text": "Ribosome", "is_correct": False, "order_index": 2},
            {"option_text": "Nucleus", "is_correct": False, "order_index": 3}
        ]
    }
    r = client.post(f"/api/v1/exams/{exam_id}/questions", json=q1_payload, headers=t_headers)
    assert r.status_code == 201
    q1_id = r.json()["id"]
    q1_options = r.json()["options"]
    q1_opt_mitochondria = [o["id"] for o in q1_options if o["option_text"] == "Mitochondria"][0]

    # Question 2: Multiple Choice
    q2_payload = {
        "question_text": "Select cellular components present in animal cells (Select all).",
        "question_type": "multiple_choice",
        "points": 4.0,
        "order_index": 2,
        "options": [
            {"option_text": "Lysosome", "is_correct": True, "order_index": 1},
            {"option_text": "Cell Membrane", "is_correct": True, "order_index": 2},
            {"option_text": "Chloroplast", "is_correct": False, "order_index": 3}
        ]
    }
    r = client.post(f"/api/v1/exams/{exam_id}/questions", json=q2_payload, headers=t_headers)
    assert r.status_code == 201
    q2_id = r.json()["id"]
    q2_options = r.json()["options"]
    q2_opts_correct = [o["id"] for o in q2_options if o["option_text"] in ["Lysosome", "Cell Membrane"]]

    # Question 3: True/False
    q3_payload = {
        "question_text": "Eukaryotic cells lack a membrane-bound nucleus.",
        "question_type": "true_false",
        "points": 2.0,
        "order_index": 3,
        "options": [
            {"option_text": "True", "is_correct": False, "order_index": 1},
            {"option_text": "False", "is_correct": True, "order_index": 2}
        ]
    }
    r = client.post(f"/api/v1/exams/{exam_id}/questions", json=q3_payload, headers=t_headers)
    assert r.status_code == 201
    q3_id = r.json()["id"]
    q3_options = r.json()["options"]
    q3_opt_false = [o["id"] for o in q3_options if o["option_text"] == "False"][0]

    # Question 4: Short Answer
    q4_payload = {
        "question_text": "Which organelle carries out photosynthesis?",
        "question_type": "short_answer",
        "points": 2.0,
        "order_index": 4,
        "options": [
            {"option_text": "chloroplast", "is_correct": True, "order_index": 1}
        ]
    }
    r = client.post(f"/api/v1/exams/{exam_id}/questions", json=q4_payload, headers=t_headers)
    assert r.status_code == 201
    q4_id = r.json()["id"]

    # Question 5: Essay
    q5_payload = {
        "question_text": "Explain the stage of metaphase in detail.",
        "question_type": "essay",
        "points": 5.0,
        "order_index": 5
    }
    r = client.post(f"/api/v1/exams/{exam_id}/questions", json=q5_payload, headers=t_headers)
    assert r.status_code == 201
    q5_id = r.json()["id"]

    # 3. Get Exam as Teacher (should see is_correct = True)
    get_teach = client.get(f"/api/v1/exams/{exam_id}", headers=t_headers)
    assert get_teach.status_code == 200
    questions_teach = get_teach.json()["questions"]
    assert any(opt["is_correct"] for q in questions_teach for opt in q["options"])

    # 4. Get Exam as Student (should see is_correct = False for security)
    get_stud = client.get(f"/api/v1/exams/{exam_id}", headers=s_headers)
    assert get_stud.status_code == 200
    questions_stud = get_stud.json()["questions"]
    assert all(opt["is_correct"] is False for q in questions_stud for opt in q["options"])

    # 5. Start Attempt
    start_resp = client.post(f"/api/v1/exams/{exam_id}/start", headers=s_headers)
    assert start_resp.status_code == 201
    attempt_id = start_resp.json()["id"]
    assert start_resp.json()["attempt_number"] == 1

    # 6. Attempting to start another session before submitting/exceeding limit should raise 403
    start_fail = client.post(f"/api/v1/exams/{exam_id}/start", headers=s_headers)
    assert start_fail.status_code == 403

    # 7. Submit Answers (Grade 10/10 correct for auto-gradable. Metaphase is essay)
    submit_payload = {
        "answers": [
            {
                "question_id": q1_id,
                "selected_option_id": q1_opt_mitochondria
            },
            {
                "question_id": q2_id,
                "selected_option_ids": q2_opts_correct
            },
            {
                "question_id": q3_id,
                "selected_option_id": q3_opt_false
            },
            {
                "question_id": q4_id,
                "text_answer": "chloroplast"
            },
            {
                "question_id": q5_id,
                "text_answer": "Chromosomes line up in the middle of the cell attached to spindle fibers."
            }
        ]
    }
    submit_resp = client.post(f"/api/v1/exams/attempts/{attempt_id}/submit", json=submit_payload, headers=s_headers)
    assert submit_resp.status_code == 200
    sub_data = submit_resp.json()
    assert sub_data["submitted_at"] is not None
    # Auto-graded: Q1(2) + Q2(4) + Q3(2) + Q4(2) = 10 points. Q5 is pending grading.
    # So max_score = 15.0, but it is NOT fully graded yet (is_graded=False)
    assert sub_data["is_graded"] is False
    assert sub_data["score"] is None

    # Check answers in database
    db_answers = db.query(AttemptAnswer).filter(AttemptAnswer.attempt_id == attempt_id).all()
    q2_ans = [a for a in db_answers if str(a.question_id) == q2_id][0]
    assert q2_ans.points_awarded == 4.0
    assert q2_ans.selected_option_ids == [uuid.UUID(x) for x in q2_opts_correct]

    # 8. Start another attempt (limit reached, allowed attempts: 1) -> 403
    start_fail2 = client.post(f"/api/v1/exams/{exam_id}/start", headers=s_headers)
    assert start_fail2.status_code == 403

    # 9. Assign Retake as Teacher
    retake_payload = {
        "exam_id": str(exam_id),
        "student_id": str(student_id),
        "allowed_attempts": 1,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }
    retake_resp = client.post("/api/v1/exams/retakes", json=retake_payload, headers=t_headers)
    assert retake_resp.status_code == 201
    assert retake_resp.json()["is_used"] is False

    # 10. Start attempt again (allowed due to retake token)
    start_ok = client.post(f"/api/v1/exams/{exam_id}/start", headers=s_headers)
    assert start_ok.status_code == 201
    attempt2_id = start_ok.json()["id"]
    assert start_ok.json()["attempt_number"] == 2

    # Check retake is now marked as used
    retake = db.query(ExamRetake).filter(ExamRetake.exam_id == exam_id, ExamRetake.student_id == student_id).first()
    assert retake.is_used is True


def test_exam_visibility_restrictions(client, db, exam_setup_data):
    """
    Test exam restrictions by student and group.
    """
    t_headers = exam_setup_data["teacher_headers"]
    s_headers = exam_setup_data["student_headers"]
    course_id = exam_setup_data["course_id"]
    student_id = exam_setup_data["student_id"]

    # 1. Create a student that belongs to a group, and a student who doesn't
    from app.models.group import Group
    from app.models.user import Student, User
    from app.models.enums import UserRole
    
    group = Group(name="Special Group 101", description="Special test group")
    db.add(group)
    db.flush()

    # Move our student Alex into Special Group 101
    alex_student = db.query(Student).filter(Student.id == student_id).first()
    alex_student.group_id = group.id
    db.commit()

    # Create another student Bob who has no group
    bob_user = User(
        email="bob_student@edu.ru",
        username="bobstudent",
        hashed_password="hashedpassword123",
        first_name="Bob",
        last_name="NoGroup",
        role=UserRole.STUDENT,
        is_verified=True
    )
    db.add(bob_user)
    db.flush()
    bob_student = Student(id=bob_user.id, course_name="Histology", faculty="Biology", group_id=None)
    db.add(bob_student)
    db.commit()
    
    bob_token = create_access_token(subject=bob_user.id, role=UserRole.STUDENT)
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 2. Create Exam restricted to Special Group 101
    exam1_payload = {
        "title": "Group Restricted Exam",
        "description": "Only for Special Group 101",
        "course_id": str(course_id),
        "duration_minutes": 20,
        "passing_score": 70.0,
        "is_active": True,
        "attempt_limit": 1,
        "group_ids": [str(group.id)],
        "student_ids": []
    }
    resp1 = client.post("/api/v1/exams/", json=exam1_payload, headers=t_headers)
    assert resp1.status_code == 201
    exam1_id = resp1.json()["id"]

    # 3. Create Exam restricted to Bob directly
    exam2_payload = {
        "title": "Bob Restricted Exam",
        "description": "Only for Bob directly",
        "course_id": str(course_id),
        "duration_minutes": 20,
        "passing_score": 70.0,
        "is_active": True,
        "attempt_limit": 1,
        "group_ids": [],
        "student_ids": [str(bob_student.id)]
    }
    resp2 = client.post("/api/v1/exams/", json=exam2_payload, headers=t_headers)
    assert resp2.status_code == 201
    exam2_id = resp2.json()["id"]

    # 4. Check visible exams for student Alex (who is in Special Group 101)
    # Alex should see "Group Restricted Exam" but NOT "Bob Restricted Exam"
    alex_visible = client.get(f"/api/v1/exams/?course_id={course_id}", headers=s_headers)
    assert alex_visible.status_code == 200
    alex_exam_ids = [e["id"] for e in alex_visible.json()]
    assert str(exam1_id) in alex_exam_ids
    assert str(exam2_id) not in alex_exam_ids

    # 5. Check visible exams for student Bob (who is Bob directly)
    # Bob should see "Bob Restricted Exam" but NOT "Group Restricted Exam"
    bob_visible = client.get(f"/api/v1/exams/?course_id={course_id}", headers=bob_headers)
    assert bob_visible.status_code == 200
    bob_exam_ids = [e["id"] for e in bob_visible.json()]
    assert str(exam2_id) in bob_exam_ids
    assert str(exam1_id) not in bob_exam_ids

    # 6. Verify starting restrictions
    # Alex trying to start Bob's exam -> 403 Forbidden
    start_fail = client.post(f"/api/v1/exams/{exam2_id}/start", headers=s_headers)
    assert start_fail.status_code == 403

    # Alex trying to start Group exam -> 201 Created
    start_ok = client.post(f"/api/v1/exams/{exam1_id}/start", headers=s_headers)
    assert start_ok.status_code == 201

