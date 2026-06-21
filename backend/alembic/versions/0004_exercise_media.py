"""add media fields to exercises (image_url, video_url, instructions)

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("video_url", sa.Text(), nullable=True))
    op.add_column(
        "exercises", sa.Column("instructions", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("exercises", "instructions")
    op.drop_column("exercises", "video_url")
    op.drop_column("exercises", "image_url")
