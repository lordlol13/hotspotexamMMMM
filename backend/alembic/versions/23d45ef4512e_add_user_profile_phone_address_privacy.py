"""add user profile phone address privacy

Revision ID: 23d45ef4512e
Revises: 1cfa2e2021c4
Create Date: 2026-06-14 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23d45ef4512e'
down_revision: Union[str, None] = '1cfa2e2021c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('address', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('is_private', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('users', 'is_private')
    op.drop_column('users', 'address')
    op.drop_column('users', 'phone')
