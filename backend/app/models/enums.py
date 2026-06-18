import enum

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    SLIDE_ANNOTATION = "slide_annotation"
    POINT_ON_IMAGE = "point_on_image"

class RegionType(str, enum.Enum):
    POINT = "point"
    RECTANGLE = "rectangle"
    POLYGON = "polygon"
    CIRCLE = "circle"
    FREEHAND = "freehand"
    TEXT = "text"
    LINE = "line"
    ARROW = "arrow"

class NotificationType(str, enum.Enum):
    SYSTEM = "system"
    EXAM_ASSIGNED = "exam_assigned"
    GRADE_RELEASED = "grade_released"
    RETAKE_GRANTED = "retake_granted"

class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    UPLOAD = "upload"
    SUBMIT = "submit"

class RegionContentType(str, enum.Enum):
    QUESTION = "question"
    EXPLANATION = "explanation"
    YOUTUBE = "youtube"
    AUDIO = "audio"
    PDF = "pdf"
    LINK = "link"
    QUESTION_POINT = "question_point"
