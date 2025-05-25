#!/bin/bash

# =============================================================================
# СКРИПТ АВТОМАТИЧЕСКОГО РАЗВЕРТЫВАНИЯ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Развертывание приложения после установки системы
# Автор: System Administrator
# Версия: 1.0.0

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOME="/opt/inventory"
LOG_FILE="$APP_HOME/logs/deploy.log"
REPO_URL="${REPO_URL:-https://github.com/your-company/inventory-system.git}"
BRANCH="${BRANCH:-main}"
APP_USER="inventory"
APP_GROUP="inventory"

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
        log_error "Docker не установлен. Запустите сначала install.sh"
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
    
    # Проверка прав на директории
    if [ ! -w "$APP_HOME" ]; then
        log_error "Нет прав записи в $APP_HOME"
        exit 1
    fi
    
    log_success "Все зависимости проверены"
}

# Функция клонирования репозитория
clone_repository() {
    log_step "Клонирование репозитория"
    
    local app_dir="$APP_HOME/app"
    
    if [ -d "$app_dir" ]; then
        log_warning "Директория приложения уже существует"
        read -p "Удалить и клонировать заново? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Удаление существующей директории..."
            rm -rf "$app_dir"
        else
            log_info "Обновление существующего репозитория..."
            cd "$app_dir"
            git fetch origin
            git reset --hard origin/$BRANCH
            git clean -fd
            log_success "Репозиторий обновлен"
            return 0
        fi
    fi
    
    log_info "Клонирование репозитория: $REPO_URL"
    git clone -b "$BRANCH" "$REPO_URL" "$app_dir" >> "$LOG_FILE" 2>&1
    check_error "Ошибка клонирования репозитория"
    
    cd "$app_dir"
    log_info "Текущая ветка: $(git branch --show-current)"
    log_info "Последний коммит: $(git log -1 --oneline)"
    
    log_success "Репозиторий клонирован"
}

# Функция настройки переменных окружения
setup_environment() {
    log_step "Настройка переменных окружения"
    
    local app_dir="$APP_HOME/app"
    local env_file="$app_dir/.env"
    local env_example="$app_dir/env.example"
    
    if [ ! -f "$env_example" ]; then
        log_error "Файл env.example не найден в репозитории"
        exit 1
    fi
    
    if [ -f "$env_file" ]; then
        log_warning "Файл .env уже существует"
        read -p "Перезаписать конфигурацию? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Используется существующий .env файл"
            return 0
        fi
    fi
    
    log_info "Создание .env файла из шаблона..."
    cp "$env_example" "$env_file"
    
    # Генерация безопасных ключей
    log_info "Генерация секретных ключей..."
    local secret_key=$(openssl rand -hex 32)
    local jwt_secret=$(openssl rand -hex 32)
    local postgres_password=$(openssl rand -hex 16)
    local redis_password=$(openssl rand -hex 16)
    
    # Замена значений в .env файле
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$secret_key/" "$env_file"
    sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$jwt_secret/" "$env_file"
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$postgres_password/" "$env_file"
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_password/" "$env_file"
    
    # Интерактивная настройка основных параметров
    echo
    log_info "Настройка основных параметров:"
    
    # Домен
    read -p "Введите домен приложения (например: inventory.company.com): " domain
    if [ -n "$domain" ]; then
        sed -i "s/APP_DOMAIN=.*/APP_DOMAIN=$domain/" "$env_file"
        sed -i "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=https://$domain|" "$env_file"
    fi
    
    # Email для Let's Encrypt
    read -p "Введите email для SSL сертификатов: " email
    if [ -n "$email" ]; then
        sed -i "s/LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=$email/" "$env_file"
    fi
    
    # SalesDrive API ключ
    read -p "Введите API ключ SalesDrive (или оставьте пустым): " api_key
    if [ -n "$api_key" ]; then
        sed -i "s/SALESDRIVE_API_KEY=.*/SALESDRIVE_API_KEY=$api_key/" "$env_file"
    fi
    
    # Установка production режима
    sed -i "s/FLASK_ENV=.*/FLASK_ENV=production/" "$env_file"
    sed -i "s/DEBUG=.*/DEBUG=false/" "$env_file"
    
    log_success "Переменные окружения настроены"
}

# Функция копирования файлов конфигурации
copy_config_files() {
    log_step "Копирование файлов конфигурации"
    
    local app_dir="$APP_HOME/app"
    
    # Копирование docker-compose.yml
    if [ -f "$app_dir/docker-compose.yml" ]; then
        cp "$app_dir/docker-compose.yml" "$APP_HOME/"
        log_info "Скопирован docker-compose.yml"
    fi
    
    # Копирование nginx.conf
    if [ -f "$app_dir/nginx.conf" ]; then
        cp "$app_dir/nginx.conf" "$APP_HOME/"
        log_info "Скопирован nginx.conf"
    fi
    
    # Копирование скриптов
    if [ -d "$app_dir/scripts" ]; then
        cp -r "$app_dir/scripts/"* "$APP_HOME/scripts/" 2>/dev/null || true
        chmod +x "$APP_HOME/scripts/"*.sh 2>/dev/null || true
        log_info "Скопированы скрипты"
    fi
    
    log_success "Файлы конфигурации скопированы"
}

# Функция настройки SSL сертификатов
setup_ssl() {
    log_step "Настройка SSL сертификатов"
    
    local domain=$(grep "APP_DOMAIN=" "$APP_HOME/app/.env" | cut -d'=' -f2)
    
    if [ -z "$domain" ] || [ "$domain" = "your-domain.com" ]; then
        log_warning "Домен не настроен, создается самоподписанный сертификат"
        
        # Создание самоподписанного сертификата
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$APP_HOME/ssl/key.pem" \
            -out "$APP_HOME/ssl/cert.pem" \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=Company/CN=localhost" \
            >> "$LOG_FILE" 2>&1
        
        log_success "Самоподписанный сертификат создан"
        return 0
    fi
    
    # Проверка DNS записи
    if ! nslookup "$domain" >/dev/null 2>&1; then
        log_warning "DNS запись для домена $domain не найдена"
        log_warning "Создается самоподписанный сертификат"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$APP_HOME/ssl/key.pem" \
            -out "$APP_HOME/ssl/cert.pem" \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=Company/CN=$domain" \
            >> "$LOG_FILE" 2>&1
        
        log_success "Самоподписанный сертификат создан"
        return 0
    fi
    
    # Настройка Let's Encrypt
    if [ -f "$APP_HOME/scripts/ssl-setup.sh" ]; then
        log_info "Запуск настройки Let's Encrypt..."
        bash "$APP_HOME/scripts/ssl-setup.sh" -d "$domain" || {
            log_warning "Ошибка получения Let's Encrypt сертификата"
            log_info "Создается самоподписанный сертификат..."
            
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$APP_HOME/ssl/key.pem" \
                -out "$APP_HOME/ssl/cert.pem" \
                -subj "/C=RU/ST=Moscow/L=Moscow/O=Company/CN=$domain" \
                >> "$LOG_FILE" 2>&1
        }
    fi
    
    log_success "SSL сертификаты настроены"
}

# Функция сборки образов
build_images() {
    log_step "Сборка Docker образов"
    
    cd "$APP_HOME"
    
    log_info "Сборка backend образа..."
    docker compose build backend >> "$LOG_FILE" 2>&1
    check_error "Ошибка сборки backend образа"
    
    log_info "Сборка frontend образа..."
    docker compose build frontend >> "$LOG_FILE" 2>&1
    check_error "Ошибка сборки frontend образа"
    
    log_success "Docker образы собраны"
}

# Функция запуска базы данных и миграций
setup_database() {
    log_step "Настройка базы данных"
    
    cd "$APP_HOME"
    
    log_info "Запуск PostgreSQL..."
    docker compose up -d postgres >> "$LOG_FILE" 2>&1
    check_error "Ошибка запуска PostgreSQL"
    
    log_info "Ожидание готовности базы данных..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker compose exec postgres pg_isready -U inventory_user >/dev/null 2>&1; then
            break
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_error "База данных не готова после 60 секунд ожидания"
        exit 1
    fi
    
    log_info "Запуск Redis..."
    docker compose up -d redis >> "$LOG_FILE" 2>&1
    check_error "Ошибка запуска Redis"
    
    log_success "База данных настроена"
}

# Функция запуска приложения
start_application() {
    log_step "Запуск приложения"
    
    cd "$APP_HOME"
    
    log_info "Запуск всех сервисов..."
    docker compose up -d >> "$LOG_FILE" 2>&1
    check_error "Ошибка запуска приложения"
    
    log_info "Ожидание готовности сервисов..."
    sleep 10
    
    log_success "Приложение запущено"
}

# Функция проверки работоспособности
health_check() {
    log_step "Проверка работоспособности"
    
    cd "$APP_HOME"
    
    log_info "Статус контейнеров:"
    docker compose ps
    
    # Проверка backend
    log_info "Проверка backend API..."
    local attempts=0
    while [ $attempts -lt 15 ]; do
        if docker compose exec backend curl -f http://localhost:8000/health >/dev/null 2>&1; then
            log_success "Backend API работает"
            break
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 15 ]; then
        log_warning "Backend API не отвечает"
    fi
    
    # Проверка frontend
    log_info "Проверка frontend..."
    if docker compose exec frontend curl -f http://localhost:80/health >/dev/null 2>&1; then
        log_success "Frontend работает"
    else
        log_warning "Frontend не отвечает"
    fi
    
    # Проверка портов
    log_info "Проверка открытых портов:"
    netstat -tulpn | grep -E ":80|:443" || log_warning "Порты 80/443 не открыты"
    
    log_success "Проверка работоспособности завершена"
}

# Функция создания первого backup
create_initial_backup() {
    log_step "Создание первоначального backup"
    
    if [ -f "$APP_HOME/scripts/backup.sh" ]; then
        log_info "Запуск backup скрипта..."
        cd "$APP_HOME"
        docker compose --profile backup run --rm backup >> "$LOG_FILE" 2>&1 || {
            log_warning "Ошибка создания backup"
        }
        log_success "Первоначальный backup создан"
    else
        log_warning "Скрипт backup не найден"
    fi
}

# Функция настройки cron задач
setup_cron_jobs() {
    log_step "Настройка cron задач"
    
    # Backup задача
    if [ -f "$APP_HOME/scripts/backup.sh" ]; then
        log_info "Настройка автоматического backup..."
        (crontab -l 2>/dev/null; echo "0 2 * * * cd $APP_HOME && docker compose --profile backup run --rm backup >> $APP_HOME/logs/backup.log 2>&1") | crontab -
    fi
    
    # SSL обновление
    if [ -f "$APP_HOME/scripts/renew-ssl.sh" ]; then
        log_info "Настройка автоматического обновления SSL..."
        (crontab -l 2>/dev/null; echo "0 3 * * * cd $APP_HOME && bash scripts/renew-ssl.sh >> $APP_HOME/logs/ssl-renewal.log 2>&1") | crontab -
    fi
    
    # Проверка здоровья системы
    if [ -f "$APP_HOME/scripts/health-check.sh" ]; then
        log_info "Настройка проверки здоровья системы..."
        (crontab -l 2>/dev/null; echo "*/30 * * * * cd $APP_HOME && bash scripts/health-check.sh >> $APP_HOME/logs/health-check.log 2>&1") | crontab -
    fi
    
    log_info "Текущие cron задачи:"
    crontab -l 2>/dev/null || log_info "Cron задачи не настроены"
    
    log_success "Cron задачи настроены"
}

# Функция вывода итоговой информации
show_summary() {
    log_step "Итоговая информация"
    
    local domain=$(grep "APP_DOMAIN=" "$APP_HOME/app/.env" | cut -d'=' -f2 2>/dev/null || echo "localhost")
    
    echo
    echo "=============================================="
    echo "  РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО УСПЕШНО!"
    echo "=============================================="
    echo
    echo "Информация о приложении:"
    echo "  📁 Директория: $APP_HOME"
    echo "  🌐 Домен: $domain"
    echo "  🔒 SSL: $([ -f "$APP_HOME/ssl/cert.pem" ] && echo "Настроен" || echo "Не настроен")"
    echo "  📊 Мониторинг: Включен"
    echo "  💾 Backup: Автоматический (ежедневно в 2:00)"
    echo
    echo "Доступ к приложению:"
    echo "  🌍 HTTP:  http://$domain"
    echo "  🔐 HTTPS: https://$domain"
    echo "  👤 Админ: admin / admin"
    echo
    echo "Полезные команды:"
    echo "  📊 Статус:     docker compose ps"
    echo "  📋 Логи:      docker compose logs -f"
    echo "  🔄 Рестарт:   docker compose restart"
    echo "  🛑 Остановка: docker compose down"
    echo "  🏥 Здоровье:  bash scripts/health-check.sh"
    echo "  💾 Backup:    docker compose --profile backup run --rm backup"
    echo
    echo "Файлы конфигурации:"
    echo "  📝 Переменные: $APP_HOME/app/.env"
    echo "  🐳 Docker:     $APP_HOME/docker-compose.yml"
    echo "  🌐 Nginx:      $APP_HOME/nginx.conf"
    echo "  📊 Логи:       $APP_HOME/logs/"
    echo
    echo "=============================================="
}

# Основная функция
main() {
    echo "=============================================="
    echo "  РАЗВЕРТЫВАНИЕ СИСТЕМЫ УПРАВЛЕНИЯ ОСТАТКАМИ"
    echo "=============================================="
    echo "Начало развертывания: $(date)"
    echo "Лог файл: $LOG_FILE"
    echo

    # Создание лог файла
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    # Проверки
    check_user
    check_dependencies

    # Основные этапы развертывания
    clone_repository
    setup_environment
    copy_config_files
    setup_ssl
    build_images
    setup_database
    start_application
    health_check
    create_initial_backup
    setup_cron_jobs

    # Итоговая информация
    show_summary

    log_success "Развертывание завершено успешно!"
}

# Обработка сигналов
trap 'log_error "Развертывание прервано пользователем"; exit 1' SIGINT SIGTERM

# Запуск основной функции
main "$@" 