from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4d9765c201a3'
down_revision: Union[str, None] = '921b5f9a0743'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE regiontype ADD VALUE IF NOT EXISTS 'LINE'")
    op.execute("ALTER TYPE regiontype ADD VALUE IF NOT EXISTS 'ARROW'")
    op.execute("ALTER TYPE regioncontenttype ADD VALUE IF NOT EXISTS 'QUESTION_POINT'")


def downgrade() -> None:
    pass
