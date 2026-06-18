from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5fd8a7465503'
down_revision: Union[str, None] = 'b77d840ab41e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('exam_questions', sa.Column('is_flagged', sa.Boolean(), nullable=False))


def downgrade() -> None:
    op.drop_column('exam_questions', 'is_flagged')
