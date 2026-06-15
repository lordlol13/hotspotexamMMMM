import sys
import uuid
import random
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.user import User, Teacher, Student
from app.models.group import Group
from app.models.course import Course
from app.models.exam import Exam
from app.models.attempt import ExamAttempt
from app.models.enrollment import CourseEnrollment
from app.models.enums import UserRole
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        # 1. Check/create admin@hotspot.com
        hotspot_admin = db.query(User).filter(User.email == "admin@hotspot.com").first()
        if not hotspot_admin:
            print("Creating admin@hotspot.com...")
            hotspot_admin = User(
                email="admin@hotspot.com",
                username="admin_hotspot",
                hashed_password=get_password_hash("admin123"),
                first_name="Преподаватель",
                last_name="Администратор",
                role=UserRole.TEACHER,
                is_active=True,
                is_verified=True
            )
            db.add(hotspot_admin)
            db.flush() # Get user id

            profile = Teacher(
                id=hotspot_admin.id,
                department="Администрация",
                title="Главный администратор"
            )
            db.add(profile)
            db.commit()
            print("admin@hotspot.com created successfully.")
        else:
            print("admin@hotspot.com already exists.")

        # 2. Check/create admin@edu.ru
        emergent_admin = db.query(User).filter(User.email == "admin@edu.ru").first()
        if not emergent_admin:
            print("Creating admin@edu.ru...")
            emergent_admin = User(
                email="admin@edu.ru",
                username="admin_edu",
                hashed_password=get_password_hash("admin123"),
                first_name="Системный",
                last_name="Admin",
                role=UserRole.TEACHER,
                is_active=True,
                is_verified=True
            )
            db.add(emergent_admin)
            db.flush()

            profile = Teacher(
                id=emergent_admin.id,
                department="Department of Histology",
                title="System Admin"
            )
            db.add(profile)
            db.commit()
            print("admin@edu.ru created successfully.")
        else:
            print("admin@edu.ru already exists.")

        # 3. Check/create default course
        default_course = db.query(Course).filter(Course.id == uuid.UUID("11111111-1111-1111-1111-111111111111")).first()
        if not default_course:
            print("Creating default course 11111111-1111-1111-1111-111111111111...")
            default_course = Course(
                id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                title="Гистология и клеточная биология",
                description="Основной академический курс медицинского факультета",
                code="HIST-101",
                teacher_id=hotspot_admin.id,
                is_active=True,
                max_students=100
            )
            db.add(default_course)
            db.commit()
            print("Default course created successfully.")
        else:
            print("Default course already exists.")

        # 4. Check/create groups
        group_a = db.query(Group).filter(Group.name == "Группа A").first()
        if not group_a:
            print("Creating Группа A...")
            group_a = Group(
                name="Группа A",
                description="Основная группа по анатомии и гистологии"
            )
            db.add(group_a)
            db.flush()
        
        group_b = db.query(Group).filter(Group.name == "Группа Б").first()
        if not group_b:
            print("Creating Группа Б...")
            group_b = Group(
                name="Группа Б",
                description="Группа по гистологии органов"
            )
            db.add(group_b)
            db.flush()

        db.commit()

        # Link course to groups
        if default_course not in group_a.courses:
            group_a.courses.append(default_course)
        if default_course not in group_b.courses:
            group_b.courses.append(default_course)
        db.commit()

        # 5. Check/create exams
        exams = []
        exam_data = [
            {"title": "Экзамен 1: Введение в цитологию", "description": "Основы строения клетки и органелл"},
            {"title": "Экзамен 2: Эпителиальные ткани", "description": "Классификация и строение покровного и железистого эпителия"},
            {"title": "Экзамен 3: Соединительные ткани", "description": "Собственно соединительные ткани, скелетные ткани и кровь"},
            {"title": "Экзамен 4: Мышечные и нервные ткани", "description": "Строение мышечных волокон и нейронов, синапсы"},
        ]

        for data in exam_data:
            exam = db.query(Exam).filter(Exam.title == data["title"]).first()
            if not exam:
                print(f"Creating exam: {data['title']}...")
                exam = Exam(
                    title=data["title"],
                    description=data["description"],
                    course_id=default_course.id,
                    created_by=hotspot_admin.id,
                    duration_minutes=60,
                    passing_score=60.0,
                    is_active=True,
                    attempt_limit=2
                )
                db.add(exam)
                db.flush()
                # Link exam to groups
                if group_a not in exam.groups:
                    exam.groups.append(group_a)
                if group_b not in exam.groups:
                    exam.groups.append(group_b)
            exams.append(exam)
        db.commit()

        # 6. Seed students
        students_to_seed = [
            {
                "email": "alex@edu.ru",
                "username": "alex_ivanov",
                "first_name": "Алексей",
                "last_name": "Иванов",
                "group": group_a,
                "student_code": "ST-001",
                "phone": "+7 (999) 111-22-33",
                "address": "Москва, проспект Мира, д. 10, кв. 42",
                "is_private": False,
                "hide_grades": False,
                "course_name": "3 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 90.0},
                    {"exam_idx": 1, "score": 85.0},
                    {"exam_idx": 2, "score": 92.0},
                    {"exam_idx": 3, "score": 87.0},
                ]
            },
            {
                "email": "maria@edu.ru",
                "username": "maria_sokolova",
                "first_name": "Мария",
                "last_name": "Соколова",
                "group": group_a,
                "student_code": "ST-002",
                "phone": "+7 (999) 222-33-44",
                "address": "Санкт-Петербург, Невский проспект, д. 50, кв. 12",
                "is_private": True,  # Private profile
                "hide_grades": False,
                "course_name": "4 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 95.0},
                    {"exam_idx": 1, "score": 91.0},
                    {"exam_idx": 2, "score": 96.0},
                    {"exam_idx": 3, "score": 88.0},
                ]
            },
            {
                "email": "dmitry@edu.ru",
                "username": "dmitry_smirnov",
                "first_name": "Дмитрий",
                "last_name": "Смирнов",
                "group": group_a,
                "student_code": "ST-003",
                "phone": "+7 (999) 333-44-55",
                "address": "Новосибирск, ул. Ленина, д. 15, кв. 8",
                "is_private": False,
                "hide_grades": True,  # Hide grades
                "course_name": "5 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 75.0},
                    {"exam_idx": 1, "score": 70.0},
                    {"exam_idx": 2, "score": 78.0},
                ]
            },
            {
                "email": "olga@edu.ru",
                "username": "olga_petrova",
                "first_name": "Ольга",
                "last_name": "Петрова",
                "group": group_b,
                "student_code": "ST-004",
                "phone": "+7 (999) 444-55-66",
                "address": "Екатеринбург, ул. Малышева, д. 80, кв. 104",
                "is_private": False,
                "hide_grades": False,
                "course_name": "1 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 80.0},
                    {"exam_idx": 1, "score": 85.0},
                    {"exam_idx": 2, "score": 82.0},
                    {"exam_idx": 3, "score": 81.0},
                ]
            },
            {
                "email": "nikolay@edu.ru",
                "username": "nikolay_kozlov",
                "first_name": "Николай",
                "last_name": "Козлов",
                "group": group_b,
                "student_code": "ST-005",
                "phone": "+7 (999) 555-66-77",
                "address": "Казань, ул. Кремлевская, д. 18, кв. 3",
                "is_private": True,   # Private profile
                "hide_grades": True,  # Hide grades
                "course_name": "6 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 78.0},
                    {"exam_idx": 1, "score": 80.0},
                    {"exam_idx": 2, "score": 77.0},
                ]
            },
            {
                "email": "anna@edu.ru",
                "username": "anna_volkova",
                "first_name": "Анна",
                "last_name": "Волкова",
                "group": group_b,
                "student_code": "ST-006",
                "phone": "+7 (999) 666-77-88",
                "address": "Нижний Новгород, ул. Горького, д. 5, кв. 19",
                "is_private": False,
                "hide_grades": False,
                "course_name": "2 курс",
                "attempts": [
                    {"exam_idx": 0, "score": 72.0},
                    {"exam_idx": 1, "score": 68.0},
                ]
            },
        ]

        for s_info in students_to_seed:
            email = s_info["email"]
            username = s_info["username"]
            student_user = db.query(User).filter(User.email == email).first()
            
            if not student_user:
                print(f"Creating student user: {email}...")
                student_user = User(
                    email=email,
                    username=username,
                    hashed_password=get_password_hash("student123"),
                    first_name=s_info["first_name"],
                    last_name=s_info["last_name"],
                    role=UserRole.STUDENT,
                    is_active=True,
                    is_verified=True,
                    phone=s_info["phone"],
                    address=s_info["address"],
                    is_private=s_info["is_private"],
                    hide_grades=s_info["hide_grades"]
                )
                db.add(student_user)
                db.flush()

                student_profile = Student(
                    id=student_user.id,
                    student_code=s_info["student_code"],
                    faculty="Медицинский",
                    course_name=s_info["course_name"],
                    group_id=s_info["group"].id
                )
                db.add(student_profile)
                db.flush()
            else:
                print(f"Updating existing student user {email} details...")
                student_user.first_name = s_info["first_name"]
                student_user.last_name = s_info["last_name"]
                student_user.phone = s_info["phone"]
                student_user.address = s_info["address"]
                student_user.is_private = s_info["is_private"]
                student_user.hide_grades = s_info["hide_grades"]
                
                if student_user.student_profile:
                    student_user.student_profile.course_name = s_info["course_name"]
                    student_user.student_profile.student_code = s_info["student_code"]
                    student_user.student_profile.group_id = s_info["group"].id
                else:
                    student_profile = Student(
                        id=student_user.id,
                        student_code=s_info["student_code"],
                        faculty="Медицинский",
                        course_name=s_info["course_name"],
                        group_id=s_info["group"].id
                    )
                    db.add(student_profile)
                db.flush()
            
            # Enforce Course Enrollment
            enrollment = db.query(CourseEnrollment).filter(
                CourseEnrollment.student_id == student_user.id,
                CourseEnrollment.course_id == default_course.id
            ).first()
            if not enrollment:
                print(f"Enrolling {email} in default course...")
                enrollment = CourseEnrollment(
                    student_id=student_user.id,
                    course_id=default_course.id,
                    is_active=True
                )
                db.add(enrollment)
                db.flush()

            # Seed Exam Attempts
            for attempt_info in s_info["attempts"]:
                exam_idx = attempt_info["exam_idx"]
                if exam_idx >= len(exams):
                    continue
                exam = exams[exam_idx]

                existing_attempt = db.query(ExamAttempt).filter(
                    ExamAttempt.exam_id == exam.id,
                    ExamAttempt.student_id == student_user.id
                ).first()

                if not existing_attempt:
                    print(f"Creating attempt for {email} on {exam.title}...")
                    attempt = ExamAttempt(
                        exam_id=exam.id,
                        student_id=student_user.id,
                        attempt_number=1,
                        score=attempt_info["score"],
                        max_score=100.0,
                        is_graded=True,
                        started_at=datetime.utcnow() - timedelta(hours=2),
                        submitted_at=datetime.utcnow() - timedelta(hours=1, minutes=45)
                    )
                    db.add(attempt)
                    db.flush()

        db.commit()
        print("Database seeded with test accounts successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
