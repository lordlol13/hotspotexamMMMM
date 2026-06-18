from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1cfa2e2021c4'
down_revision: Union[str, None] = '4d9765c201a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('exam_students',
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('exam_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('student_id', 'exam_id')
    )


def downgrade() -> None:
    op.drop_table('exam_students')
