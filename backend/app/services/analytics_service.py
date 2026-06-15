import uuid
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.exam import Exam
from app.models.question import ExamQuestion, QuestionOption
from app.models.attempt import ExamAttempt, AttemptAnswer
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.user import User, Student, Teacher
from app.models.group import Group, exam_groups, course_groups
from app.models.enums import UserRole

class AnalyticsService:
    @staticmethod
    def get_student_analytics(db: Session, student_id: uuid.UUID) -> Dict[str, Any]:
        # Fetch student and profile
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return {
                "average_score": 0.0,
                "completion_rate": 0.0,
                "exam_history": [],
                "score_trends": []
            }

        # 1. Total assigned exams: active exams in courses where student is enrolled
        enrolled_course_ids = [
            e.course_id for e in db.query(CourseEnrollment)
            .filter(CourseEnrollment.student_id == student_id, CourseEnrollment.is_active == True)
            .all()
        ]

        if not enrolled_course_ids:
            return {
                "average_score": 0.0,
                "completion_rate": 0.0,
                "exam_history": [],
                "score_trends": []
            }

        # Active exams in enrolled courses
        active_exams = db.query(Exam).filter(
            Exam.course_id.in_(enrolled_course_ids),
            Exam.is_active == True
        ).all()
        active_exam_ids = [exam.id for exam in active_exams]
        total_assigned = len(active_exam_ids)

        # 2. Get all submitted attempts of this student
        attempts = db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student_id,
            ExamAttempt.submitted_at.isnot(None)
        ).order_by(ExamAttempt.submitted_at.asc()).all()

        completed_exam_ids = {a.exam_id for a in attempts}
        completed_count = len(completed_exam_ids & set(active_exam_ids))

        completion_rate = (completed_count / total_assigned * 100) if total_assigned > 0 else 0.0

        # Calculate scores and construct history
        exam_history = []
        score_trends = []
        total_score_pct = 0.0
        graded_count = 0

        # Cache exam objects
        exam_map = {exam.id: exam for exam in active_exams}
        # Fetch remaining exams that might be inactive now but attempts exist
        missing_exam_ids = [a.exam_id for a in attempts if a.exam_id not in exam_map]
        if missing_exam_ids:
            missing_exams = db.query(Exam).filter(Exam.id.in_(missing_exam_ids)).all()
            for me in missing_exams:
                exam_map[me.id] = me

        for att in attempts:
            exam = exam_map.get(att.exam_id)
            if not exam:
                continue

            score_pct = 0.0
            passed = False
            if att.is_graded and att.max_score and att.max_score > 0:
                score_pct = round((att.score / att.max_score) * 100, 1)
                total_score_pct += score_pct
                graded_count += 1
                passed = score_pct >= exam.passing_score

            history_item = {
                "attempt_id": str(att.id),
                "exam_id": str(exam.id),
                "exam_title": exam.title,
                "started_at": att.started_at.isoformat(),
                "submitted_at": att.submitted_at.isoformat(),
                "score": att.score,
                "max_score": att.max_score,
                "score_pct": score_pct,
                "passing_score": exam.passing_score,
                "passed": passed,
                "is_graded": att.is_graded
            }
            exam_history.append(history_item)

            if att.is_graded:
                score_trends.append({
                    "date": att.submitted_at.strftime("%Y-%m-%d"),
                    "score_pct": score_pct,
                    "exam_title": exam.title
                })

        average_score = round(total_score_pct / graded_count, 1) if graded_count > 0 else 0.0

        # Sort history to show latest attempts first
        exam_history.reverse()

        return {
            "average_score": average_score,
            "completion_rate": round(completion_rate, 1),
            "exam_history": exam_history,
            "score_trends": score_trends
        }

    @staticmethod
    def get_teacher_analytics(db: Session, teacher_id: uuid.UUID) -> Dict[str, Any]:
        # Get courses owned by the teacher
        courses = db.query(Course).filter(Course.teacher_id == teacher_id).all()
        course_ids = [c.id for c in courses]

        if not course_ids:
            return {
                "group_statistics": [],
                "student_rankings": [],
                "overall_stats": {"pass_rate": 0.0, "fail_rate": 0.0, "total_attempts": 0, "average_score": 0.0},
                "question_difficulty": []
            }

        # Get exams for these courses
        exams = db.query(Exam).filter(Exam.course_id.in_(course_ids)).all()
        exam_ids = [e.id for e in exams]
        exam_map = {e.id: e for e in exams}

        if not exam_ids:
            return {
                "group_statistics": [],
                "student_rankings": [],
                "overall_stats": {"pass_rate": 0.0, "fail_rate": 0.0, "total_attempts": 0, "average_score": 0.0},
                "question_difficulty": []
            }

        # Get all attempts for these exams
        attempts = db.query(ExamAttempt).filter(
            ExamAttempt.exam_id.in_(exam_ids),
            ExamAttempt.submitted_at.isnot(None)
        ).all()

        # Group stats calculation
        # Let's map student IDs to their groups
        student_ids = list({a.student_id for a in attempts})
        students = db.query(Student).options(joinedload(Student.user)).filter(Student.id.in_(student_ids)).all()
        student_group_map = {}
        student_user_map = {}
        for s in students:
            student_group_map[s.id] = s.group_id
            student_user_map[s.id] = s.user

        # Fetch groups
        group_ids = list({s.group_id for s in students if s.group_id})
        groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
        group_map = {g.id: g.name for g in groups}

        # Cache course titles
        course_map = {c.id: c.title for c in courses}

        # Overall Stats
        overall_total_attempts = len(attempts)
        overall_passed_attempts = 0
        overall_graded_attempts = 0
        overall_total_score_pct = 0.0

        # Group Metrics Aggregation
        # { (group_id, course_id): { "total": 0, "passed": 0, "graded": 0, "score_sum": 0.0 } }
        group_course_metrics = {}

        # Student rankings aggregation
        # { student_id: { "score_sum": 0.0, "graded_count": 0, "total_exams": set() } }
        student_metrics = {}

        for att in attempts:
            exam = exam_map.get(att.exam_id)
            if not exam:
                continue

            score_pct = 0.0
            passed = False
            is_graded = att.is_graded and att.max_score and att.max_score > 0
            if is_graded:
                score_pct = (att.score / att.max_score) * 100
                passed = score_pct >= exam.passing_score
                overall_total_score_pct += score_pct
                overall_graded_attempts += 1
                if passed:
                    overall_passed_attempts += 1

            # Group course updates
            g_id = student_group_map.get(att.student_id)
            g_course_key = (g_id, exam.course_id)
            if g_course_key not in group_course_metrics:
                group_course_metrics[g_course_key] = {"total": 0, "passed": 0, "graded": 0, "score_sum": 0.0}
            
            group_course_metrics[g_course_key]["total"] += 1
            if is_graded:
                group_course_metrics[g_course_key]["graded"] += 1
                group_course_metrics[g_course_key]["score_sum"] += score_pct
                if passed:
                    group_course_metrics[g_course_key]["passed"] += 1

            # Student ranking updates
            s_id = att.student_id
            if s_id not in student_metrics:
                student_metrics[s_id] = {"score_sum": 0.0, "graded_count": 0, "completed": set()}
            
            student_metrics[s_id]["completed"].add(exam.id)
            if is_graded:
                student_metrics[s_id]["graded_count"] += 1
                student_metrics[s_id]["score_sum"] += score_pct

        # Build group stats array
        group_statistics = []
        for (g_id, course_id), metric in group_course_metrics.items():
            g_name = group_map.get(g_id) if g_id else "Unassigned Group"
            c_title = course_map.get(course_id, "Unknown Course")
            
            avg_score = round(metric["score_sum"] / metric["graded"], 1) if metric["graded"] > 0 else 0.0
            pass_rate = round(metric["passed"] / metric["graded"] * 100, 1) if metric["graded"] > 0 else 0.0
            fail_rate = round(100.0 - pass_rate, 1) if metric["graded"] > 0 else 0.0

            group_statistics.append({
                "group_name": g_name,
                "course_title": c_title,
                "average_score": avg_score,
                "pass_rate": pass_rate,
                "fail_rate": fail_rate,
                "total_attempts": metric["total"]
            })

        # Build student rankings
        student_rankings = []
        for s_id, metric in student_metrics.items():
            user = student_user_map.get(s_id)
            if not user:
                continue

            g_id = student_group_map.get(s_id)
            g_name = group_map.get(g_id) if g_id else "Unassigned"
            
            avg_score = round(metric["score_sum"] / metric["graded_count"], 1) if metric["graded_count"] > 0 else 0.0
            
            student_rankings.append({
                "id": str(user.id),
                "student_name": user.full_name,
                "email": user.email,
                "group_name": g_name,
                "average_score": avg_score,
                "completed_exams": len(metric["completed"]),
                "hide_grades": user.hide_grades
            })

        # Sort rankings DESC by score
        student_rankings.sort(key=lambda x: x["average_score"], reverse=True)

        # Build overall stats
        overall_pass = round(overall_passed_attempts / overall_graded_attempts * 100, 1) if overall_graded_attempts > 0 else 0.0
        overall_fail = round(100.0 - overall_pass, 1) if overall_graded_attempts > 0 else 0.0
        overall_avg = round(overall_total_score_pct / overall_graded_attempts, 1) if overall_graded_attempts > 0 else 0.0

        overall_stats = {
            "pass_rate": overall_pass,
            "fail_rate": overall_fail,
            "total_attempts": overall_total_attempts,
            "average_score": overall_avg
        }

        # 4. Question Difficulty: correct answers rate per question
        # Fetch all questions in teacher's exams
        questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id.in_(exam_ids)).all()
        question_ids = [q.id for q in questions]

        if not question_ids:
            return {
                "group_statistics": group_statistics,
                "student_rankings": student_rankings,
                "overall_stats": overall_stats,
                "question_difficulty": []
            }

        # Fetch answers for these questions
        answers = db.query(AttemptAnswer).filter(AttemptAnswer.question_id.in_(question_ids)).all()
        # Group answers by question ID
        answers_by_question = {}
        for ans in answers:
            if ans.question_id not in answers_by_question:
                answers_by_question[ans.question_id] = []
            answers_by_question[ans.question_id].append(ans)

        question_difficulty = []
        for q in questions:
            exam = exam_map.get(q.exam_id)
            exam_title = exam.title if exam else "Unknown Exam"

            q_answers = answers_by_question.get(q.id, [])
            total_resp = len(q_answers)
            
            correct_fraction = 0.0
            total_graded_resp = 0
            
            for ans in q_answers:
                if ans.points_awarded is not None:
                    # points awarded fraction of question points
                    frac = (ans.points_awarded / q.points) if q.points > 0 else 0.0
                    correct_fraction += min(max(frac, 0.0), 1.0) # bound check
                    total_graded_resp += 1

            correct_pct = round((correct_fraction / total_graded_resp) * 100, 1) if total_graded_resp > 0 else 0.0
            
            question_difficulty.append({
                "exam_title": exam_title,
                "question_text": q.question_text[:100] + ("..." if len(q.question_text) > 100 else ""),
                "question_type": q.question_type.value,
                "correct_percentage": correct_pct,
                "total_responses": total_resp
            })

        # Sort question difficulty ascending (lowest correct percentage = highest difficulty)
        question_difficulty.sort(key=lambda x: x["correct_percentage"])

        return {
            "group_statistics": group_statistics,
            "student_rankings": student_rankings,
            "overall_stats": overall_stats,
            "question_difficulty": question_difficulty
        }

    @staticmethod
    def get_global_rankings(db: Session, current_user: User) -> Dict[str, Any]:
        students = db.query(Student).options(joinedload(Student.user)).all()
        student_group_map = {s.id: s.group_id for s in students}
        student_user_map = {s.id: s.user for s in students}

        groups = db.query(Group).all()
        group_map = {g.id: g.name for g in groups}

        attempts = db.query(ExamAttempt).filter(ExamAttempt.submitted_at.isnot(None)).all()

        student_metrics = {}
        for att in attempts:
            s_id = att.student_id
            if s_id not in student_metrics:
                student_metrics[s_id] = {"score_sum": 0.0, "graded_count": 0, "completed": set()}
            
            student_metrics[s_id]["completed"].add(att.exam_id)
            if att.is_graded and att.max_score and att.max_score > 0:
                score_pct = (att.score / att.max_score) * 100
                student_metrics[s_id]["graded_count"] += 1
                student_metrics[s_id]["score_sum"] += score_pct

        student_rankings = []
        for s in students:
            metric = student_metrics.get(s.id, {"score_sum": 0.0, "graded_count": 0, "completed": set()})
            user = s.user
            if not user:
                continue

            g_id = s.group_id
            g_name = group_map.get(g_id) if g_id else "Без группы"
            avg_score = round(metric["score_sum"] / metric["graded_count"], 1) if metric["graded_count"] > 0 else 0.0
            
            email = user.email
            if current_user.role == UserRole.STUDENT and user.is_private and user.id != current_user.id:
                email = "hidden@private.local"

            student_rankings.append({
                "id": str(user.id),
                "student_name": user.full_name,
                "email": email,
                "group_name": g_name,
                "average_score": avg_score,
                "completed_exams": len(metric["completed"]),
                "hide_grades": user.hide_grades
            })

        student_rankings.sort(key=lambda x: x["average_score"], reverse=True)

        group_metrics = {}
        exams = db.query(Exam).all()
        exam_map = {e.id: e for e in exams}

        for att in attempts:
            exam = exam_map.get(att.exam_id)
            if not exam:
                continue
            g_id = student_group_map.get(att.student_id)
            if not g_id:
                continue
            
            if g_id not in group_metrics:
                group_metrics[g_id] = {"total": 0, "passed": 0, "graded": 0, "score_sum": 0.0}
            
            group_metrics[g_id]["total"] += 1
            if att.is_graded and att.max_score and att.max_score > 0:
                score_pct = (att.score / att.max_score) * 100
                group_metrics[g_id]["graded"] += 1
                group_metrics[g_id]["score_sum"] += score_pct
                if score_pct >= exam.passing_score:
                    group_metrics[g_id]["passed"] += 1

        group_statistics = []
        for group in groups:
            metric = group_metrics.get(group.id, {"total": 0, "passed": 0, "graded": 0, "score_sum": 0.0})
            avg_score = round(metric["score_sum"] / metric["graded"], 1) if metric["graded"] > 0 else 0.0
            pass_rate = round(metric["passed"] / metric["graded"] * 100, 1) if metric["graded"] > 0 else 0.0
            fail_rate = round(100.0 - pass_rate, 1) if metric["graded"] > 0 else 0.0

            group_statistics.append({
                "group_name": group.name,
                "course_title": "Общий курс",
                "average_score": avg_score,
                "pass_rate": pass_rate,
                "fail_rate": fail_rate,
                "total_attempts": metric["total"]
            })

        return {
            "group_statistics": group_statistics,
            "student_rankings": student_rankings,
            "overall_stats": {
                "pass_rate": 0.0,
                "fail_rate": 0.0,
                "total_attempts": len(attempts),
                "average_score": 0.0
            },
            "question_difficulty": []
        }
