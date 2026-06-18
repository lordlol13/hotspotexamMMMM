from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6d326ef40c0a'
down_revision: Union[str, None] = 'ba9f1c55e2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('students', sa.Column('faculty', sa.String(length=255), nullable=True))
    op.add_column('students', sa.Column('course_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=False))
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=False))
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False))
    op.add_column('users', sa.Column('verification_token', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('reset_token', sa.String(length=255), nullable=True))
    op.drop_column('users', 'full_name')


def downgrade() -> None:
    op.add_column('users', sa.Column('full_name', sa.VARCHAR(length=255), autoincrement=False, nullable=False))
    op.drop_column('users', 'reset_token')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'is_verified')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
    op.drop_column('students', 'course_name')
    op.drop_column('students', 'faculty')
