from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '49a8370ccde4'
down_revision: Union[str, None] = '6d326ef40c0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    region_content_type = sa.Enum('QUESTION', 'EXPLANATION', 'YOUTUBE', 'AUDIO', 'PDF', 'LINK', name='regioncontenttype')
    region_content_type.create(op.get_bind(), checkfirst=True)
    
    op.add_column('regions', sa.Column('content_type', sa.Enum('QUESTION', 'EXPLANATION', 'YOUTUBE', 'AUDIO', 'PDF', 'LINK', name='regioncontenttype'), nullable=True))
    op.add_column('regions', sa.Column('content_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('regions', 'content_data')
    op.drop_column('regions', 'content_type')
    
    region_content_type = sa.Enum('QUESTION', 'EXPLANATION', 'YOUTUBE', 'AUDIO', 'PDF', 'LINK', name='regioncontenttype')
    region_content_type.drop(op.get_bind(), checkfirst=True)
