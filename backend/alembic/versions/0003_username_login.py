"""add username and make email optional

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-20
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Añadir username como nullable para no romper filas existentes.
    op.add_column("users", sa.Column("username", sa.Text(), nullable=True))
    # 2) Sembrar username a partir del email para filas ya existentes.
    op.execute(
        "UPDATE users SET username = split_part(email, '@', 1) "
        "WHERE username IS NULL AND email IS NOT NULL"
    )
    op.execute(
        "UPDATE users SET username = 'user_' || id WHERE username IS NULL"
    )
    # 3) Ahora sí, NOT NULL + UNIQUE.
    op.alter_column("users", "username", nullable=False)
    op.create_unique_constraint("uq_users_username", "users", ["username"])

    # 4) Email pasa a ser opcional (nullable).
    op.alter_column("users", "email", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.Text(), nullable=False)
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "username")
