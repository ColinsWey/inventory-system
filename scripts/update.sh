#!/bin/bash

# =============================================================================
# СКРИПТ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Безопасное обновление приложения с backup и rollback
# Автор: System Administrator
# Версия: 1.0.0

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOME="/opt/inventory"
LOG_FILE="$APP_HOME/logs/update.log"
REPO_URL="${REPO_URL:-https://github.com/your-company/inventory-system.git}"
BRANCH="${BRANCH:-main}"
APP_USER="inventory"
APP_GROUP="inventory"
BACKUP_BEFORE_UPDATE="${BACKUP_BEFORE_UPDATE:-true}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

log_step() {
    log "STEP" "${PURPLE}>>> $*${NC}"
}

# Функция проверки ошибок
check_error() {
    if [ $? -ne 0 ]; then
        log_error "$1"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_update
        fi
        exit 1
    fi
}

# Функция проверки пользователя
check_user() {
    if [ "$USER" != "$APP_USER" ]; then
        log_error "Скрипт должен запускаться от пользователя $APP_USER"
        log_info "Используйте: sudo -u $APP_USER $0"
        exit 1
    fi
}

# Функция проверки зависимостей
check_dependencies() {
    log_step "Проверка зависимостей"
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен"
        exit 1
    fi
    
    # Проверка Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose не установлен"
        exit 1
    fi
    
    # Проверка Git
    if ! command -v git &> /dev/null; then
        log_error "Git не установлен"
        exit 1
    fi
    
    # Проверка работы приложения
    cd "$APP_HOME"
    if ! docker compose ps | grep -q "Up"; then
        log_error "Приложение не запущено"
        exit 1
    fi
    
    log_success "Все зависимости проверены"
}

# Функция получения текущей версии
get_current_version() {
    local app_dir="$APP_HOME/app"
    
    if [ -d "$app_dir/.git" ]; then
        cd "$app_dir"
        echo "$(git rev-parse HEAD)"
    else
        echo "unknown"
    fi
}

# Функция проверки обновлений
check_for_updates() {
    log_step "Проверка обновлений"
    
    local app_dir="$APP_HOME/app"
    
    if [ ! -d "$app_dir/.git" ]; then
        log_error "Репозиторий Git не найден в $app_dir"
        exit 1
    fi
    
    cd "$app_dir"
    
    log_info "Получение информации о последних изменениях..."
    git fetch origin >> "$LOG_FILE" 2>&1
    check_error "Ошибка получения обновлений из репозитория"
    
    local current_commit=$(git rev-parse HEAD)
    local latest_commit=$(git rev-parse origin/$BRANCH)
    
    if [ "$current_commit" = "$latest_commit" ]; then
        log_info "Приложение уже обновлено до последней версии"
        log_info "Текущий коммит: $current_commit"
        exit 0
    fi
    
    log_info "Доступно обновление:"
    log_info "Текущий коммит:  $current_commit"
    log_info "Новый коммит:    $latest_commit"
    
    # Показать изменения
    log_info "Изменения в новой версии:"
    git log --oneline "$current_commit..$latest_commit" | head -10
    
    log_success "Обновления найдены"
}

# Функция создания backup перед обновлением
create_pre_update_backup() {
    if [ "$BACKUP_BEFORE_UPDATE" != "true" ]; then
        log_info "Backup перед обновлением отключен"
        return 0
    fi
    
    log_step "Создание backup перед обновлением"
    
    if [ -f "$APP_HOME/scripts/backup.sh" ]; then
        log_info "Запуск скрипта backup..."
        cd "$APP_HOME"
        
        # Создание специального backup для обновления
        export BACKUP_PREFIX="pre-update"
        docker compose --profile backup run --rm backup >> "$LOG_FILE" 2>&1
        check_error "Ошибка создания backup"
        
        log_success "Backup создан"
    else
        log_warning "Скрипт backup не найден, пропускаем создание backup"
    fi
}

# Функция сохранения состояния для rollback
save_rollback_state() {
    log_step "Сохранение состояния для возможного rollback"
    
    local app_dir="$APP_HOME/app"
    local rollback_dir="$APP_HOME/.rollback"
    
    # Создание директории для rollback
    rm -rf "$rollback_dir"
    mkdir -p "$rollback_dir"
    
    # Сохранение текущего коммита
    cd "$app_dir"
    git rev-parse HEAD > "$rollback_dir/commit.txt"
    
    # Сохранение конфигурации
    cp "$app_dir/.env" "$rollback_dir/env.backup" 2>/dev/null || true
    cp "$APP_HOME/docker-compose.yml" "$rollback_dir/docker-compose.yml.backup" 2>/dev/null || true
    cp "$APP_HOME/nginx.conf" "$rollback_dir/nginx.conf.backup" 2>/dev/null || true
    
    # Сохранение образов Docker
    log_info "Сохранение текущих Docker образов..."
    docker save inventory_backend:latest | gzip > "$rollback_dir/backend-image.tar.gz" 2>/dev/null || true
    docker save inventory_frontend:latest | gzip > "$rollback_dir/frontend-image.tar.gz" 2>/dev/null || true
    
    log_success "Состояние для rollback сохранено"
}

# Функция обновления кода
update_code() {
    log_step "Обновление кода приложения"
    
    local app_dir="$APP_HOME/app"
    cd "$app_dir"
    
    log_info "Переключение на ветку $BRANCH..."
    git checkout "$BRANCH" >> "$LOG_FILE" 2>&1
    check_error "Ошибка переключения на ветку $BRANCH"
    
    log_info "Получение последних изменений..."
    git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1
    check_error "Ошибка получения изменений"
    
    log_info "Очистка рабочей директории..."
    git clean -fd >> "$LOG_FILE" 2>&1
    
    local new_commit=$(git rev-parse HEAD)
    log_info "Обновлено до коммита: $new_commit"
    
    log_success "Код обновлен"
}

# Функция обновления конфигурации
update_configuration() {
    log_step "Обновление конфигурации"
    
    local app_dir="$APP_HOME/app"
    
    # Копирование новых файлов конфигурации
    if [ -f "$app_dir/docker-compose.yml" ]; then
        log_info "Обновление docker-compose.yml..."
        cp "$app_dir/docker-compose.yml" "$APP_HOME/"
    fi
    
    if [ -f "$app_dir/nginx.conf" ]; then
        log_info "Обновление nginx.conf..."
        cp "$app_dir/nginx.conf" "$APP_HOME/"
    fi
    
    # Обновление скриптов
    if [ -d "$app_dir/scripts" ]; then
        log_info "Обновление скриптов..."
        cp -r "$app_dir/scripts/"* "$APP_HOME/scripts/" 2>/dev/null || true
        chmod +x "$APP_HOME/scripts/"*.sh 2>/dev/null || true
    fi
    
    # Проверка изменений в env.example
    if [ -f "$app_dir/env.example" ]; then
        local env_file="$app_dir/.env"
        local env_example="$app_dir/env.example"
        
        if [ -f "$env_file" ]; then
            log_info "Проверка новых переменных окружения..."
            
            # Поиск новых переменных
            local new_vars=$(comm -23 <(grep -o '^[A-Z_]*=' "$env_example" | sort) <(grep -o '^[A-Z_]*=' "$env_file" | sort) || true)
            
            if [ -n "$new_vars" ]; then
                log_warning "Найдены новые переменные окружения:"
                echo "$new_vars"
                log_warning "Добавьте их в $env_file"
            fi
        fi
    fi
    
    log_success "Конфигурация обновлена"
}

# Функция пересборки образов
rebuild_images() {
    log_step "Пересборка Docker образов"
    
    cd "$APP_HOME"
    
    log_info "Остановка приложения..."
    docker compose down >> "$LOG_FILE" 2>&1
    check_error "Ошибка остановки приложения"
    
    log_info "Пересборка backend образа..."
    docker compose build --no-cache backend >> "$LOG_FILE" 2>&1
    check_error "Ошибка сборки backend образа"
    
    log_info "Пересборка frontend образа..."
    docker compose build --no-cache frontend >> "$LOG_FILE" 2>&1
    check_error "Ошибка сборки frontend образа"
    
    log_success "Образы пересобраны"
}

# Функция запуска обновленного приложения
start_updated_application() {
    log_step "Запуск обновленного приложения"
    
    cd "$APP_HOME"
    
    log_info "Запуск сервисов..."
    docker compose up -d >> "$LOG_FILE" 2>&1
    check_error "Ошибка запуска приложения"
    
    log_info "Ожидание готовности сервисов..."
    sleep 15
    
    log_success "Приложение запущено"
}

# Функция проверки работоспособности после обновления
verify_update() {
    log_step "Проверка работоспособности после обновления"
    
    cd "$APP_HOME"
    
    # Проверка статуса контейнеров
    log_info "Проверка статуса контейнеров..."
    if ! docker compose ps | grep -q "Up"; then
        log_error "Не все контейнеры запущены"
        return 1
    fi
    
    # Проверка backend API
    log_info "Проверка backend API..."
    local attempts=0
    while [ $attempts -lt 20 ]; do
        if docker compose exec backend curl -f http://localhost:8000/health >/dev/null 2>&1; then
            log_success "Backend API работает"
            break
        fi
        sleep 3
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 20 ]; then
        log_error "Backend API не отвечает"
        return 1
    fi
    
    # Проверка frontend
    log_info "Проверка frontend..."
    if docker compose exec frontend curl -f http://localhost:80/health >/dev/null 2>&1; then
        log_success "Frontend работает"
    else
        log_error "Frontend не отвечает"
        return 1
    fi
    
    # Проверка базы данных
    log_info "Проверка базы данных..."
    if docker compose exec postgres pg_isready -U inventory_user >/dev/null 2>&1; then
        log_success "База данных работает"
    else
        log_error "База данных не отвечает"
        return 1
    fi
    
    log_success "Все проверки пройдены"
    return 0
}

# Функция rollback
rollback_update() {
    log_step "Выполнение rollback"
    
    local rollback_dir="$APP_HOME/.rollback"
    
    if [ ! -d "$rollback_dir" ]; then
        log_error "Данные для rollback не найдены"
        return 1
    fi
    
    cd "$APP_HOME"
    
    log_info "Остановка приложения..."
    docker compose down >> "$LOG_FILE" 2>&1 || true
    
    # Восстановление кода
    if [ -f "$rollback_dir/commit.txt" ]; then
        local rollback_commit=$(cat "$rollback_dir/commit.txt")
        log_info "Восстановление кода до коммита: $rollback_commit"
        
        cd "$APP_HOME/app"
        git reset --hard "$rollback_commit" >> "$LOG_FILE" 2>&1
        git clean -fd >> "$LOG_FILE" 2>&1
    fi
    
    # Восстановление конфигурации
    cd "$APP_HOME"
    cp "$rollback_dir/env.backup" "$APP_HOME/app/.env" 2>/dev/null || true
    cp "$rollback_dir/docker-compose.yml.backup" "$APP_HOME/docker-compose.yml" 2>/dev/null || true
    cp "$rollback_dir/nginx.conf.backup" "$APP_HOME/nginx.conf" 2>/dev/null || true
    
    # Восстановление образов Docker
    if [ -f "$rollback_dir/backend-image.tar.gz" ]; then
        log_info "Восстановление backend образа..."
        gunzip -c "$rollback_dir/backend-image.tar.gz" | docker load >> "$LOG_FILE" 2>&1 || true
    fi
    
    if [ -f "$rollback_dir/frontend-image.tar.gz" ]; then
        log_info "Восстановление frontend образа..."
        gunzip -c "$rollback_dir/frontend-image.tar.gz" | docker load >> "$LOG_FILE" 2>&1 || true
    fi
    
    # Запуск приложения
    log_info "Запуск приложения после rollback..."
    docker compose up -d >> "$LOG_FILE" 2>&1
    
    log_success "Rollback выполнен"
}

# Функция очистки после обновления
cleanup_after_update() {
    log_step "Очистка после обновления"
    
    # Удаление неиспользуемых образов
    log_info "Удаление неиспользуемых Docker образов..."
    docker image prune -f >> "$LOG_FILE" 2>&1 || true
    
    # Удаление данных rollback (если обновление успешно)
    if [ -d "$APP_HOME/.rollback" ]; then
        log_info "Удаление данных rollback..."
        rm -rf "$APP_HOME/.rollback"
    fi
    
    log_success "Очистка завершена"
}

# Функция вывода итоговой информации
show_summary() {
    log_step "Итоговая информация"
    
    local app_dir="$APP_HOME/app"
    local current_commit="unknown"
    
    if [ -d "$app_dir/.git" ]; then
        cd "$app_dir"
        current_commit=$(git rev-parse HEAD)
    fi
    
    echo
    echo "=============================================="
    echo "  ОБНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!"
    echo "=============================================="
    echo
    echo "Информация об обновлении:"
    echo "  📅 Время: $(date)"
    echo "  🔄 Коммит: $current_commit"
    echo "  📁 Директория: $APP_HOME"
    echo "  📊 Статус: Все сервисы работают"
    echo
    echo "Полезные команды:"
    echo "  📊 Статус:     docker compose ps"
    echo "  📋 Логи:      docker compose logs -f"
    echo "  🏥 Здоровье:  bash scripts/health-check.sh"
    echo "  📝 Лог обновления: tail -f $LOG_FILE"
    echo
    echo "=============================================="
}

# Основная функция
main() {
    echo "=============================================="
    echo "  ОБНОВЛЕНИЕ СИСТЕМЫ УПРАВЛЕНИЯ ОСТАТКАМИ"
    echo "=============================================="
    echo "Начало обновления: $(date)"
    echo "Лог файл: $LOG_FILE"
    echo

    # Создание лог файла
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    # Проверки
    check_user
    check_dependencies
    check_for_updates

    # Подтверждение обновления
    echo
    read -p "Продолжить обновление? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Обновление отменено пользователем"
        exit 0
    fi

    # Основные этапы обновления
    create_pre_update_backup
    save_rollback_state
    update_code
    update_configuration
    rebuild_images
    start_updated_application

    # Проверка работоспособности
    if verify_update; then
        cleanup_after_update
        show_summary
        log_success "Обновление завершено успешно!"
    else
        log_error "Обновление не прошло проверку работоспособности"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_update
            log_warning "Выполнен rollback к предыдущей версии"
        fi
        exit 1
    fi
}

# Обработка сигналов
trap 'log_error "Обновление прервано пользователем"; exit 1' SIGINT SIGTERM

# Запуск основной функции
main "$@" 