from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d7e8f9a1b3"
down_revision: Union[str, None] = "a8c9e14f2b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("slides", sa.Column("content_sha256", sa.String(length=64), nullable=True))
    op.create_unique_constraint(
        "uq_slides_course_content_sha256",
        "slides",
        ["course_id", "content_sha256"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_slides_course_content_sha256", "slides", type_="unique")
    op.drop_column("slides", "content_sha256")
