from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '921b5f9a0743'
down_revision: Union[str, None] = '49a8370ccde4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('exams', sa.Column('attempt_limit', sa.Integer(), nullable=False))
    
    op.execute("ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'single_choice'")
    op.execute("ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'essay'")


def downgrade() -> None:
    op.drop_column('exams', 'attempt_limit')
