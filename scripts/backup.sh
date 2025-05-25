#!/bin/bash

# =============================================================================
# СКРИПТ РЕЗЕРВНОГО КОПИРОВАНИЯ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Автоматическое создание backup PostgreSQL базы данных и файлов приложения
# Поддерживает ротацию старых backup файлов и уведомления

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOME="/opt/inventory"
BACKUP_DIR="$APP_HOME/backups"
LOG_FILE="$APP_HOME/logs/backup.log"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-inventory_db}"
POSTGRES_USER="${POSTGRES_USER:-inventory_user}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Создание имени файла с временной меткой
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${POSTGRES_DB}_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

# Функции логирования
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${BLUE}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}✓ $*${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}⚠ $*${NC}"
}

log_error() {
    log "ERROR" "${RED}✗ $*${NC}"
}

# Проверка доступности PostgreSQL
check_postgres() {
    log_info "Проверка подключения к PostgreSQL..."
    
    for i in {1..30}; do
        if docker compose -f "$APP_HOME/docker-compose.yml" exec postgres pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
            log_success "PostgreSQL доступен"
            return 0
        fi
        
        log_info "Ожидание PostgreSQL... (попытка $i/30)"
        sleep 2
    done
    
    log_error "PostgreSQL недоступен после 60 секунд ожидания"
    exit 1
}

# Создание директории для backup
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Создание директории backup: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Создание backup
create_backup() {
    log "Начало создания backup базы данных: $POSTGRES_DB"
    log "Файл backup: $BACKUP_FILE_COMPRESSED"
    
    # Создание SQL dump с сжатием
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --clean --no-owner --no-privileges --format=plain | gzip > "$BACKUP_FILE_COMPRESSED"; then
        
        # Проверка размера файла
        BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
        log "Backup успешно создан. Размер: $BACKUP_SIZE"
        
        # Создание метаданных
        create_metadata
        
        return 0
    else
        log "ОШИБКА: Не удалось создать backup"
        return 1
    fi
}

# Создание файла метаданных
create_metadata() {
    METADATA_FILE="${BACKUP_FILE_COMPRESSED}.meta"
    
    cat > "$METADATA_FILE" << EOF
{
    "timestamp": "$TIMESTAMP",
    "database": "$POSTGRES_DB",
    "host": "$POSTGRES_HOST",
    "port": "$POSTGRES_PORT",
    "user": "$POSTGRES_USER",
    "backup_file": "$(basename "$BACKUP_FILE_COMPRESSED")",
    "backup_size": "$(stat -c%s "$BACKUP_FILE_COMPRESSED")",
    "created_at": "$(date -Iseconds)",
    "postgres_version": "$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" | head -1 | xargs)"
}
EOF
    
    log "Метаданные сохранены: $METADATA_FILE"
}

# Очистка старых backup файлов
cleanup_old_backups() {
    log "Очистка backup файлов старше $RETENTION_DAYS дней..."
    
    # Удаление старых backup файлов
    find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Удаление старых метаданных
    find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz.meta" -type f -mtime +$RETENTION_DAYS -delete
    
    # Подсчет оставшихся файлов
    REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "backup_${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
    log "Осталось backup файлов: $REMAINING_BACKUPS"
}

# Проверка backup файла
verify_backup() {
    log "Проверка целостности backup файла..."
    
    if gzip -t "$BACKUP_FILE_COMPRESSED"; then
        log "Backup файл прошел проверку целостности"
        return 0
    else
        log "ОШИБКА: Backup файл поврежден"
        return 1
    fi
}

# Отправка уведомления (если настроено)
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Backup $POSTGRES_DB: $status - $message\"}" \
            >/dev/null 2>&1 || true
    fi
}

# Основная функция
main() {
    log "=== НАЧАЛО РЕЗЕРВНОГО КОПИРОВАНИЯ ==="
    log "База данных: $POSTGRES_DB"
    log "Хост: $POSTGRES_HOST:$POSTGRES_PORT"
    log "Пользователь: $POSTGRES_USER"
    log "Директория backup: $BACKUP_DIR"
    log "Срок хранения: $RETENTION_DAYS дней"
    
    # Проверки и подготовка
    check_postgres
    create_backup_dir
    
    # Создание backup
    if create_backup && verify_backup; then
        log "Backup успешно создан и проверен"
        send_notification "SUCCESS" "Backup создан: $(basename "$BACKUP_FILE_COMPRESSED")"
        
        # Очистка старых файлов
        cleanup_old_backups
        
        log "=== РЕЗЕРВНОЕ КОПИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО ==="
        exit 0
    else
        log "ОШИБКА: Не удалось создать backup"
        send_notification "FAILED" "Ошибка создания backup"
        
        # Удаление поврежденного файла
        [ -f "$BACKUP_FILE_COMPRESSED" ] && rm -f "$BACKUP_FILE_COMPRESSED"
        
        log "=== РЕЗЕРВНОЕ КОПИРОВАНИЕ ЗАВЕРШЕНО С ОШИБКОЙ ==="
        exit 1
    fi
}

# Обработка сигналов
trap 'log "Получен сигнал завершения, остановка backup..."; exit 1' SIGTERM SIGINT

# Запуск основной функции
main "$@" 