"""Alembic environment configuration."""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Objet de config Alembic — donne accès à alembic.ini
config = context.config

# Configure le logging Python depuis alembic.ini (section [loggers])
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import des modèles ────────────────────────────────────────────────────────
# On importe Base depuis nos modèles pour que alembic --autogenerate puisse
# comparer l'état des modèles Python avec l'état réel de la base de données.
# Sans ça, alembic ne sait pas quelles tables existent et génère des migrations vides.
from taskhorizon.models import Base  # noqa: E402

target_metadata = Base.metadata

# ── URL de connexion ──────────────────────────────────────────────────────────
# On lit DATABASE_URL depuis l'environnement.
# Cela permet d'utiliser la même config en dev, CI, prod sans modifier alembic.ini.
# Si DATABASE_URL n'est pas défini, on tombe sur la valeur par défaut de alembic.ini.
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Mode offline : génère le SQL sans connexion réelle à la DB.

    Utile pour générer un script SQL à exécuter manuellement (ex: audit DBA).
    Commande : alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Mode online : se connecte à la DB et applique les migrations directement.

    C'est le mode utilisé par défaut avec `alembic upgrade head`.
    NullPool est utilisé car alembic n'a pas besoin de garder des connexions ouvertes.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
