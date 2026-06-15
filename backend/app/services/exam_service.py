import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload

from app.models.exam import Exam
from app.models.question import ExamQuestion, QuestionOption
from app.models.attempt import ExamAttempt, AttemptAnswer
from app.models.retake import ExamRetake
from app.schemas.exam import ExamCreate, ExamUpdate, ExamQuestionCreate, ExamAttemptSubmit, ExamRetakeCreate
from app.models.enums import QuestionType, UserRole
from app.core.exceptions import BadRequestException, NotFoundException, ForbiddenException

class ExamService:
    @staticmethod
    def create_exam(db: Session, schema: ExamCreate, creator_id: uuid.UUID) -> Exam:
        from app.models.group import Group
        from app.models.user import Student

        exam = Exam(
            title=schema.title,
            description=schema.description,
            course_id=schema.course_id,
            duration_minutes=schema.duration_minutes,
            passing_score=schema.passing_score,
            is_active=schema.is_active,
            attempt_limit=schema.attempt_limit,
            start_time=schema.start_time,
            end_time=schema.end_time,
            shuffle_questions=schema.shuffle_questions,
            created_by=creator_id
        )
        if schema.group_ids:
            exam.groups = db.query(Group).filter(Group.id.in_(schema.group_ids)).all()
        if schema.student_ids:
            exam.students = db.query(Student).filter(Student.id.in_(schema.student_ids)).all()

        db.add(exam)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def get_exam(db: Session, exam_id: uuid.UUID) -> Exam:
        exam = (
            db.query(Exam)
            .options(
                selectinload(Exam.questions).selectinload(ExamQuestion.options),
                selectinload(Exam.groups),
                selectinload(Exam.students)
            )
            .filter(Exam.id == exam_id)
            .first()
        )
        if not exam:
            raise NotFoundException("Exam not found")
        return exam

    @staticmethod
    def add_question(db: Session, exam_id: uuid.UUID, schema: ExamQuestionCreate) -> ExamQuestion:
        exam = ExamService.get_exam(db, exam_id)

        question = ExamQuestion(
            exam_id=exam.id,
            question_text=schema.question_text,
            question_type=schema.question_type,
            points=schema.points,
            order_index=schema.order_index,
            slide_id=schema.slide_id,
            region_of_interest=schema.region_of_interest
        )
        db.add(question)
        db.flush()

        if schema.options and schema.question_type in [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE]:
            for opt in schema.options:
                option = QuestionOption(
                    question_id=question.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    order_index=opt.order_index
                )
                db.add(option)

        db.commit()
        db.refresh(question)
        return question

    @classmethod
    def start_attempt(cls, db: Session, exam_id: uuid.UUID, student_id: uuid.UUID) -> ExamAttempt:
        """
        Initiate an exam attempt session.
        Enforces attempt limits and checks for active teacher-granted retakes.
        """
        exam = db.query(Exam).filter(Exam.id == exam_id).with_for_update().first()
        if not exam:
            raise NotFoundException("Exam not found")
        if not exam.is_active:
            raise ForbiddenException("Exam is not active/available")

        now = datetime.now(timezone.utc)
        if exam.start_time and now < exam.start_time:
            raise ForbiddenException("Exam window has not opened yet")
        if exam.end_time and now > exam.end_time:
            raise ForbiddenException("Exam window has closed")

        attempts_count = db.query(ExamAttempt).filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.student_id == student_id
        ).count()

        retake = db.query(ExamRetake).filter(
            ExamRetake.exam_id == exam_id,
            ExamRetake.student_id == student_id,
            ExamRetake.is_used == False
        ).first()

        allowed = exam.attempt_limit
        if retake:

            if retake.expires_at and now > retake.expires_at:
                raise ForbiddenException("Teacher-granted retake has expired")
            allowed += retake.allowed_attempts

        if attempts_count >= allowed:
            raise ForbiddenException(f"Attempt limit reached. Allowed: {allowed}")

        attempt = ExamAttempt(
            exam_id=exam_id,
            student_id=student_id,
            attempt_number=attempts_count + 1,
            started_at=datetime.now(timezone.utc),
            is_graded=False
        )

        if retake and attempts_count >= exam.attempt_limit:
            retake.is_used = True

        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        return attempt

    @classmethod
    def submit_attempt(cls, db: Session, attempt_id: uuid.UUID, payload: ExamAttemptSubmit) -> ExamAttempt:
        """
        Submit exam answers, calculate percentage score, and run auto-grading.
        """
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise NotFoundException("Exam attempt not found")
        if attempt.submitted_at:
            raise BadRequestException("Attempt already submitted")

        exam = cls.get_exam(db, attempt.exam_id)

        now = datetime.now(timezone.utc)
        duration_delta = now - attempt.started_at.replace(tzinfo=timezone.utc)
        max_seconds = (exam.duration_minutes * 60) + 60
        if duration_delta.total_seconds() > max_seconds:

            pass

        attempt.submitted_at = now
        db.flush()

        total_score = 0.0
        max_possible_score = sum(question.points for question in exam.questions)
        is_fully_graded = True

        questions = {q.id: q for q in exam.questions}

        all_options = (
            db.query(QuestionOption)
            .filter(QuestionOption.question_id.in_(list(questions.keys())))
            .all()
        )

        options_by_question = {}
        for opt in all_options:
            if opt.question_id not in options_by_question:
                options_by_question[opt.question_id] = []
            options_by_question[opt.question_id].append(opt)

        answered_question_ids = set()
        for ans in payload.answers:
            question = questions.get(ans.question_id)
            if not question or ans.question_id in answered_question_ids:
                continue
            answered_question_ids.add(ans.question_id)
            points_awarded = 0.0

            if question.question_type == QuestionType.SINGLE_CHOICE or question.question_type == QuestionType.TRUE_FALSE:
                opts = options_by_question.get(question.id, [])
                correct_opt = next((o for o in opts if o.is_correct), None)

                if correct_opt and ans.selected_option_id == correct_opt.id:
                    points_awarded = question.points

            elif question.question_type == QuestionType.MULTIPLE_CHOICE:
                opts = options_by_question.get(question.id, [])
                correct_opts = [o for o in opts if o.is_correct]
                correct_ids = {opt.id for opt in correct_opts}

                selected_ids = set(ans.selected_option_ids or [])
                if selected_ids == correct_ids:
                    points_awarded = question.points

            elif question.question_type == QuestionType.SHORT_ANSWER:
                opts = options_by_question.get(question.id, [])
                correct_opt = opts[0] if opts else None

                if correct_opt and ans.text_answer:
                    if ans.text_answer.strip().lower() == correct_opt.option_text.strip().lower():
                        points_awarded = question.points

            elif question.question_type == QuestionType.ESSAY:

                is_fully_graded = False
                points_awarded = None

            elif question.question_type == QuestionType.POINT_ON_IMAGE:

                roi = question.region_of_interest
                if roi and ans.annotation_data and "x" in ans.annotation_data and "y" in ans.annotation_data:
                    px = ans.annotation_data["x"]
                    py = ans.annotation_data["y"]
                    region_type = roi.get("region_type")
                    geom = roi.get("geometry", {})

                    if region_type == "rectangle":
                        rx = geom.get("x", 0)
                        ry = geom.get("y", 0)
                        rw = geom.get("w", 0)
                        rh = geom.get("h", 0)
                        if rx <= px <= rx + rw and ry <= py <= ry + rh:
                            points_awarded = question.points

                    elif region_type == "circle":
                        cx = geom.get("cx", 0)
                        cy = geom.get("cy", 0)
                        r = geom.get("r", 0)
                        if ((cx - px) ** 2 + (cy - py) ** 2) ** 0.5 <= r:
                            points_awarded = question.points

                    elif region_type in ["polygon", "freehand"]:
                        poly_pts = geom.get("points", [])
                        if poly_pts:

                            inside = False
                            n = len(poly_pts)
                            p1x, p1y = poly_pts[0]
                            for i in range(n + 1):
                                p2x, p2y = poly_pts[i % n]
                                if py > min(p1y, p2y):
                                    if py <= max(p1y, p2y):
                                        if px <= max(p1x, p2x):
                                            if p1y != p2y:
                                                xinters = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                                            if p1x == p2x or px <= xinters:
                                                inside = not inside
                                p1x, p1y = p2x, p2y
                            if inside:
                                points_awarded = question.points

                    elif region_type in ["line", "arrow"]:
                        x1 = geom.get("x1", 0)
                        y1 = geom.get("y1", 0)
                        x2 = geom.get("x2", 0)
                        y2 = geom.get("y2", 0)
                        l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
                        if l2 == 0:
                            dist = ((x1 - px) ** 2 + (y1 - py) ** 2) ** 0.5
                        else:
                            t = max(0, min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2))
                            proj_x = x1 + t * (x2 - x1)
                            proj_y = y1 + t * (y2 - y1)
                            dist = ((proj_x - px) ** 2 + (proj_y - py) ** 2) ** 0.5

                        if dist <= 5.0:
                            points_awarded = question.points

                    elif region_type == "text":
                        tx = geom.get("x", 0)
                        ty = geom.get("y", 0)
                        dist = ((tx - px) ** 2 + (ty - py) ** 2) ** 0.5

                        if dist <= 5.0:
                            points_awarded = question.points

            annotation_data = ans.annotation_data or {}
            if question.question_type == QuestionType.MULTIPLE_CHOICE and ans.selected_option_ids:
                annotation_data["selected_option_ids"] = [str(uid) for uid in ans.selected_option_ids]

            db_answer = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=ans.question_id,
                selected_option_id=ans.selected_option_id,
                text_answer=ans.text_answer,
                annotation_data=annotation_data if annotation_data else None,
                points_awarded=points_awarded
            )
            db.add(db_answer)

            if points_awarded is not None:
                total_score += points_awarded

        attempt.max_score = max_possible_score
        if is_fully_graded:
            attempt.score = total_score
            attempt.is_graded = True
        else:
            attempt.score = None
            attempt.is_graded = False

        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def grant_retake(db: Session, schema: ExamRetakeCreate, granter_id: uuid.UUID) -> ExamRetake:
        """
        Authorize a student to retake an exam.
        """

        active_retake = db.query(ExamRetake).filter(
            ExamRetake.exam_id == schema.exam_id,
            ExamRetake.student_id == schema.student_id,
            ExamRetake.is_used == False
        ).first()

        if active_retake:
            raise BadRequestException("Student already has an active/unused retake for this exam")

        retake = ExamRetake(
            exam_id=schema.exam_id,
            student_id=schema.student_id,
            allowed_attempts=schema.allowed_attempts,
            expires_at=schema.expires_at,
            granted_by=granter_id,
            is_used=False
        )
        db.add(retake)
        db.commit()
        db.refresh(retake)
        return retake

    @staticmethod
    def get_exams_by_course(db: Session, course_id: uuid.UUID) -> List[Exam]:
        """
        Get all exams for a specific course.
        """
        return (
            db.query(Exam)
            .options(
                selectinload(Exam.questions).selectinload(ExamQuestion.options),
                selectinload(Exam.groups),
                selectinload(Exam.students)
            )
            .filter(Exam.course_id == course_id)
            .all()
        )

    @staticmethod
    def get_exams_for_student(db: Session, course_id: uuid.UUID, student_id: uuid.UUID) -> List[Exam]:
        """
        Get exams for a course that are visible to a specific student.
        Visible if:
        1. No groups and no students are assigned to the exam (public to course)
        2. Student is directly assigned to the exam
        3. Student's group is assigned to the exam
        """
        from app.models.user import Student
        student = db.query(Student).filter(Student.id == student_id).first()
        group_id = student.group_id if student else None

        all_exams = (
            db.query(Exam)
            .options(
                selectinload(Exam.questions).selectinload(ExamQuestion.options),
                selectinload(Exam.groups),
                selectinload(Exam.students)
            )
            .filter(Exam.course_id == course_id)
            .all()
        )
        visible_exams = []
        for exam in all_exams:
            has_restrictions = len(exam.groups) > 0 or len(exam.students) > 0
            if not has_restrictions:
                visible_exams.append(exam)
                continue

            is_student_assigned = any(s.id == student_id for s in exam.students)
            if is_student_assigned:
                visible_exams.append(exam)
                continue

            if group_id:
                is_group_assigned = any(g.id == group_id for g in exam.groups)
                if is_group_assigned:
                    visible_exams.append(exam)
                    continue

        return visible_exams

    @staticmethod
    def can_student_access_exam(db: Session, exam_id: uuid.UUID, student_id: uuid.UUID) -> bool:
        """
        Check if a student can access/take a specific exam.
        """
        exam = (
            db.query(Exam)
            .options(
                selectinload(Exam.groups),
                selectinload(Exam.students)
            )
            .filter(Exam.id == exam_id)
            .first()
        )
        if not exam:
            return False

        has_restrictions = len(exam.groups) > 0 or len(exam.students) > 0
        if not has_restrictions:
            return True

        is_student_assigned = any(s.id == student_id for s in exam.students)
        if is_student_assigned:
            return True

        from app.models.user import Student
        student = db.query(Student).filter(Student.id == student_id).first()
        if student and student.group_id:
            is_group_assigned = any(g.id == student.group_id for g in exam.groups)
            if is_group_assigned:
                return True

        return False

    @classmethod
    def update_exam(cls, db: Session, exam_id: uuid.UUID, schema: ExamUpdate) -> Exam:
        from app.models.group import Group
        from app.models.user import Student

        exam = cls.get_exam(db, exam_id)
        update_data = schema.model_dump(exclude_unset=True)

        group_ids = update_data.pop("group_ids", None)
        student_ids = update_data.pop("student_ids", None)

        for key, value in update_data.items():
            setattr(exam, key, value)

        if group_ids is not None:
            exam.groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
        if student_ids is not None:
            exam.students = db.query(Student).filter(Student.id.in_(student_ids)).all()

        db.commit()
        db.refresh(exam)
        return exam

    @classmethod
    def delete_exam(cls, db: Session, exam_id: uuid.UUID) -> None:
        """
        Delete an exam from database.
        """
        exam = cls.get_exam(db, exam_id)
        db.delete(exam)
        db.commit()

    @classmethod
    def clear_questions(cls, db: Session, exam_id: uuid.UUID) -> None:
        """
        Delete all questions for a specific exam.
        """
        from app.models.exam import ExamQuestion
        db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).delete()
        db.commit()
