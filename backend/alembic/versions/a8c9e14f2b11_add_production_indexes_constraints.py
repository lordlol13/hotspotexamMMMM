from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a8c9e14f2b11"
down_revision: Union[str, None] = "5fd8a7465503"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_students_group_id", "students", ["group_id"])
    op.create_index("ix_courses_teacher_id", "courses", ["teacher_id"])
    op.create_index("ix_slides_course_id", "slides", ["course_id"])
    op.create_index("ix_slides_uploaded_by", "slides", ["uploaded_by"])
    op.create_index("ix_regions_slide_id", "regions", ["slide_id"])
    op.create_index("ix_annotations_slide_user", "annotations", ["slide_id", "user_id"])
    op.create_index("ix_exams_course_active", "exams", ["course_id", "is_active"])
    op.create_index("ix_exam_questions_exam_order", "exam_questions", ["exam_id", "order_index"])
    op.create_index("ix_exam_attempts_student_submitted", "exam_attempts", ["student_id", "submitted_at"])
    op.create_index("ix_exam_attempts_exam_submitted", "exam_attempts", ["exam_id", "submitted_at"])
    op.create_index("ix_attempt_answers_attempt_id", "attempt_answers", ["attempt_id"])
    op.create_index("ix_attempt_answers_question_id", "attempt_answers", ["question_id"])
    op.create_index("ix_exam_retakes_exam_student_active", "exam_retakes", ["exam_id", "student_id", "is_used"])
    op.create_index("ix_notifications_user_read_created", "notifications", ["user_id", "is_read", "created_at"])
    op.create_index("ix_audit_logs_user_timestamp", "audit_logs", ["user_id", "timestamp"])
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_name", "entity_id"])
    op.create_index("ix_slide_view_logs_slide_viewed", "slide_view_logs", ["slide_id", "viewed_at"])
    op.create_check_constraint("ck_exams_duration_positive", "exams", "duration_minutes > 0")
    op.create_check_constraint("ck_exams_passing_score_range", "exams", "passing_score >= 0 AND passing_score <= 100")
    op.create_check_constraint("ck_exams_attempt_limit_positive", "exams", "attempt_limit > 0")
    op.create_check_constraint("ck_exam_questions_points_nonnegative", "exam_questions", "points >= 0")
    op.create_check_constraint("ck_exam_retakes_allowed_positive", "exam_retakes", "allowed_attempts > 0")
    op.create_unique_constraint("uq_attempt_answer_question", "attempt_answers", ["attempt_id", "question_id"])


def downgrade() -> None:
    op.drop_constraint("uq_attempt_answer_question", "attempt_answers", type_="unique")
    op.drop_constraint("ck_exam_retakes_allowed_positive", "exam_retakes", type_="check")
    op.drop_constraint("ck_exam_questions_points_nonnegative", "exam_questions", type_="check")
    op.drop_constraint("ck_exams_attempt_limit_positive", "exams", type_="check")
    op.drop_constraint("ck_exams_passing_score_range", "exams", type_="check")
    op.drop_constraint("ck_exams_duration_positive", "exams", type_="check")
    for table, name in [
        ("slide_view_logs", "ix_slide_view_logs_slide_viewed"),
        ("audit_logs", "ix_audit_logs_entity"),
        ("audit_logs", "ix_audit_logs_user_timestamp"),
        ("notifications", "ix_notifications_user_read_created"),
        ("exam_retakes", "ix_exam_retakes_exam_student_active"),
        ("attempt_answers", "ix_attempt_answers_question_id"),
        ("attempt_answers", "ix_attempt_answers_attempt_id"),
        ("exam_attempts", "ix_exam_attempts_exam_submitted"),
        ("exam_attempts", "ix_exam_attempts_student_submitted"),
        ("exam_questions", "ix_exam_questions_exam_order"),
        ("exams", "ix_exams_course_active"),
        ("annotations", "ix_annotations_slide_user"),
        ("regions", "ix_regions_slide_id"),
        ("slides", "ix_slides_uploaded_by"),
        ("slides", "ix_slides_course_id"),
        ("courses", "ix_courses_teacher_id"),
        ("students", "ix_students_group_id"),
    ]:
        op.drop_index(name, table_name=table)
