from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b77d840ab41e'
down_revision: Union[str, None] = '23d45ef4512e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('hide_grades', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('users', 'hide_grades')
