#!/usr/bin/env python3
"""
Скрипт для управления миграциями базы данных.
Использование:
    python migrate.py init    - создание базы данных
    python migrate.py up      - применение всех миграций
    python migrate.py down    - откат последней миграции
    python migrate.py seed    - загрузка начальных данных
    python migrate.py reset   - полный сброс и пересоздание БД
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import argparse
from pathlib import Path
from datetime import datetime


class DatabaseMigrator:
    """Класс для управления миграциями базы данных."""
    
    def __init__(self, db_config):
        self.db_config = db_config
        self.migrations_dir = Path(__file__).parent / "migrations"
        self.seeds_dir = Path(__file__).parent / "seeds"
        
    def get_connection(self, database=None):
        """Получение соединения с базой данных."""
        config = self.db_config.copy()
        if database:
            config['database'] = database
        return psycopg2.connect(**config)
    
    def database_exists(self, db_name):
        """Проверка существования базы данных."""
        try:
            conn = self.get_connection()
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (db_name,)
            )
            exists = cursor.fetchone() is not None
            
            cursor.close()
            conn.close()
            return exists
        except Exception as e:
            print(f"Ошибка проверки базы данных: {e}")
            return False
    
    def create_database(self, db_name):
        """Создание базы данных."""
        try:
            conn = self.get_connection()
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"База данных '{db_name}' создана успешно")
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Ошибка создания базы данных: {e}")
            sys.exit(1)
    
    def drop_database(self, db_name):
        """Удаление базы данных."""
        try:
            conn = self.get_connection()
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            # Закрываем все соединения с базой
            cursor.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{db_name}' AND pid <> pg_backend_pid()
            """)
            
            cursor.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
            print(f"База данных '{db_name}' удалена успешно")
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Ошибка удаления базы данных: {e}")
            sys.exit(1)
    
    def create_migrations_table(self):
        """Создание таблицы для отслеживания миграций."""
        try:
            conn = self.get_connection(self.db_config['database'])
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            print("Таблица миграций создана")
        except Exception as e:
            print(f"Ошибка создания таблицы миграций: {e}")
            sys.exit(1)
    
    def get_applied_migrations(self):
        """Получение списка примененных миграций."""
        try:
            conn = self.get_connection(self.db_config['database'])
            cursor = conn.cursor()
            
            cursor.execute("SELECT version FROM schema_migrations ORDER BY version")
            migrations = [row[0] for row in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            return migrations
        except Exception as e:
            print(f"Ошибка получения миграций: {e}")
            return []
    
    def get_migration_files(self):
        """Получение списка файлов миграций."""
        if not self.migrations_dir.exists():
            return []
        
        migrations = []
        for file in sorted(self.migrations_dir.glob("*.sql")):
            version = file.stem
            migrations.append((version, file))
        
        return migrations
    
    def apply_migration(self, version, file_path):
        """Применение миграции."""
        try:
            conn = self.get_connection(self.db_config['database'])
            cursor = conn.cursor()
            
            print(f"Применение миграции: {version}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            cursor.execute(sql)
            cursor.execute(
                "INSERT INTO schema_migrations (version) VALUES (%s)",
                (version,)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            print(f"Миграция {version} применена успешно")
        except Exception as e:
            print(f"Ошибка применения миграции {version}: {e}")
            sys.exit(1)
    
    def rollback_migration(self, version):
        """Откат миграции."""
        try:
            conn = self.get_connection(self.db_config['database'])
            cursor = conn.cursor()
            
            cursor.execute(
                "DELETE FROM schema_migrations WHERE version = %s",
                (version,)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            print(f"Миграция {version} откачена")
        except Exception as e:
            print(f"Ошибка отката миграции {version}: {e}")
            sys.exit(1)
    
    def load_seeds(self):
        """Загрузка начальных данных."""
        if not self.seeds_dir.exists():
            print("Директория с начальными данными не найдена")
            return
        
        try:
            conn = self.get_connection(self.db_config['database'])
            cursor = conn.cursor()
            
            for seed_file in sorted(self.seeds_dir.glob("*.sql")):
                print(f"Загрузка данных из: {seed_file.name}")
                
                with open(seed_file, 'r', encoding='utf-8') as f:
                    sql = f.read()
                
                cursor.execute(sql)
            
            conn.commit()
            cursor.close()
            conn.close()
            print("Начальные данные загружены успешно")
        except Exception as e:
            print(f"Ошибка загрузки начальных данных: {e}")
            sys.exit(1)
    
    def init_database(self):
        """Инициализация базы данных."""
        db_name = self.db_config['database']
        
        if not self.database_exists(db_name):
            self.create_database(db_name)
        else:
            print(f"База данных '{db_name}' уже существует")
        
        self.create_migrations_table()
    
    def migrate_up(self):
        """Применение всех новых миграций."""
        applied = set(self.get_applied_migrations())
        available = self.get_migration_files()
        
        new_migrations = [
            (version, file_path) for version, file_path in available
            if version not in applied
        ]
        
        if not new_migrations:
            print("Нет новых миграций для применения")
            return
        
        for version, file_path in new_migrations:
            self.apply_migration(version, file_path)
        
        print(f"Применено миграций: {len(new_migrations)}")
    
    def migrate_down(self):
        """Откат последней миграции."""
        applied = self.get_applied_migrations()
        
        if not applied:
            print("Нет миграций для отката")
            return
        
        last_migration = applied[-1]
        self.rollback_migration(last_migration)
        print(f"Откачена миграция: {last_migration}")
    
    def reset_database(self):
        """Полный сброс и пересоздание базы данных."""
        db_name = self.db_config['database']
        
        print(f"Сброс базы данных '{db_name}'...")
        self.drop_database(db_name)
        self.create_database(db_name)
        self.create_migrations_table()
        self.migrate_up()
        self.load_seeds()
        print("База данных пересоздана успешно")


def get_db_config():
    """Получение конфигурации базы данных из переменных окружения."""
    return {
        'host': os.getenv('DATABASE_HOST', 'localhost'),
        'port': int(os.getenv('DATABASE_PORT', 5432)),
        'user': os.getenv('DATABASE_USER', 'postgres'),
        'password': os.getenv('DATABASE_PASSWORD', 'postgres'),
        'database': os.getenv('DATABASE_NAME', 'inventory_system')
    }


def main():
    """Главная функция."""
    parser = argparse.ArgumentParser(description='Управление миграциями базы данных')
    parser.add_argument(
        'command',
        choices=['init', 'up', 'down', 'seed', 'reset', 'status'],
        help='Команда для выполнения'
    )
    
    args = parser.parse_args()
    
    db_config = get_db_config()
    migrator = DatabaseMigrator(db_config)
    
    try:
        if args.command == 'init':
            migrator.init_database()
        elif args.command == 'up':
            migrator.migrate_up()
        elif args.command == 'down':
            migrator.migrate_down()
        elif args.command == 'seed':
            migrator.load_seeds()
        elif args.command == 'reset':
            confirm = input("Вы уверены, что хотите пересоздать базу данных? (yes/no): ")
            if confirm.lower() == 'yes':
                migrator.reset_database()
            else:
                print("Операция отменена")
        elif args.command == 'status':
            applied = migrator.get_applied_migrations()
            available = migrator.get_migration_files()
            
            print(f"Применено миграций: {len(applied)}")
            print(f"Доступно миграций: {len(available)}")
            
            if applied:
                print("\nПримененные миграции:")
                for migration in applied:
                    print(f"  - {migration}")
            
            pending = [v for v, _ in available if v not in applied]
            if pending:
                print("\nОжидающие миграции:")
                for migration in pending:
                    print(f"  - {migration}")
    
    except KeyboardInterrupt:
        print("\nОперация прервана пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"Неожиданная ошибка: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main() 