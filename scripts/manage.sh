#!/bin/bash

# =============================================================================
# ГЛАВНЫЙ СКРИПТ УПРАВЛЕНИЯ СИСТЕМОЙ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Единая точка входа для всех операций с системой
# Автор: System Administrator
# Версия: 1.0.0

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOME="/opt/inventory"
APP_USER="inventory"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции логирования
log_info() {
    echo -e "${BLUE}ℹ $*${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $*${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $*${NC}"
}

log_error() {
    echo -e "${RED}✗ $*${NC}"
}

log_step() {
    echo -e "${PURPLE}>>> $*${NC}"
}

log_header() {
    echo -e "${CYAN}$*${NC}"
}

# Функция показа справки
show_help() {
    log_header "=============================================="
    log_header "  СИСТЕМА УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ"
    log_header "=============================================="
    echo
    echo "Использование: $0 <команда> [опции]"
    echo
    echo "Команды установки и развертывания:"
    echo "  install         Установка системы на чистый Ubuntu Server 22.04"
    echo "  deploy          Развертывание приложения"
    echo "  update          Обновление приложения до последней версии"
    echo
    echo "Команды управления:"
    echo "  start           Запуск всех сервисов"
    echo "  stop            Остановка всех сервисов"
    echo "  restart         Перезапуск всех сервисов"
    echo "  status          Показать статус сервисов"
    echo "  logs            Показать логи (с опцией -f для follow)"
    echo
    echo "Команды обслуживания:"
    echo "  backup          Создать резервную копию"
    echo "  restore         Восстановить из резервной копии"
    echo "  health          Проверка здоровья системы"
    echo "  cleanup         Очистка системы от неиспользуемых данных"
    echo
    echo "Команды мониторинга:"
    echo "  monitor         Запуск мониторинга системы"
    echo "  stats           Показать статистику использования ресурсов"
    echo "  disk            Показать использование дискового пространства"
    echo
    echo "Команды SSL:"
    echo "  ssl-setup       Настройка SSL сертификатов"
    echo "  ssl-renew       Обновление SSL сертификатов"
    echo "  ssl-check       Проверка SSL сертификатов"
    echo
    echo "Опции:"
    echo "  -h, --help      Показать эту справку"
    echo "  -v, --verbose   Подробный вывод"
    echo "  -f, --follow    Следить за логами в реальном времени"
    echo
    echo "Примеры:"
    echo "  $0 install                    # Установка системы"
    echo "  $0 deploy                     # Развертывание приложения"
    echo "  $0 logs -f                    # Просмотр логов в реальном времени"
    echo "  $0 backup                     # Создание backup"
    echo "  $0 ssl-setup example.com      # Настройка SSL для домена"
    echo
    echo "Файлы конфигурации:"
    echo "  $APP_HOME/app/.env            # Переменные окружения"
    echo "  $APP_HOME/docker-compose.yml  # Конфигурация Docker"
    echo "  $APP_HOME/nginx.conf          # Конфигурация Nginx"
    echo
    echo "Логи:"
    echo "  $APP_HOME/logs/               # Директория с логами"
    echo
}

# Функция проверки прав root для установки
check_root_for_install() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Команда install требует права root"
        log_info "Используйте: sudo $0 install"
        exit 1
    fi
}

# Функция проверки пользователя приложения
check_app_user() {
    if [ "$USER" != "$APP_USER" ]; then
        log_error "Команда должна выполняться от пользователя $APP_USER"
        log_info "Используйте: sudo -u $APP_USER $0 $*"
        exit 1
    fi
}

# Функция проверки установки системы
check_system_installed() {
    if [ ! -d "$APP_HOME" ] || [ ! -f "$APP_HOME/docker-compose.yml" ]; then
        log_error "Система не установлена"
        log_info "Запустите сначала: sudo $0 install"
        exit 1
    fi
}

# Команда установки системы
cmd_install() {
    log_step "Запуск установки системы"
    check_root_for_install
    
    if [ -f "$SCRIPT_DIR/install.sh" ]; then
        bash "$SCRIPT_DIR/install.sh" "$@"
    else
        log_error "Скрипт install.sh не найден"
        exit 1
    fi
}

# Команда развертывания приложения
cmd_deploy() {
    log_step "Запуск развертывания приложения"
    check_app_user
    check_system_installed
    
    if [ -f "$SCRIPT_DIR/deploy.sh" ]; then
        bash "$SCRIPT_DIR/deploy.sh" "$@"
    else
        log_error "Скрипт deploy.sh не найден"
        exit 1
    fi
}

# Команда обновления приложения
cmd_update() {
    log_step "Запуск обновления приложения"
    check_app_user
    check_system_installed
    
    if [ -f "$SCRIPT_DIR/update.sh" ]; then
        bash "$SCRIPT_DIR/update.sh" "$@"
    else
        log_error "Скрипт update.sh не найден"
        exit 1
    fi
}

# Команда запуска сервисов
cmd_start() {
    log_step "Запуск сервисов"
    check_app_user
    check_system_installed
    
    cd "$APP_HOME"
    docker compose up -d
    log_success "Сервисы запущены"
    
    # Показать статус
    sleep 3
    cmd_status
}

# Команда остановки сервисов
cmd_stop() {
    log_step "Остановка сервисов"
    check_app_user
    check_system_installed
    
    cd "$APP_HOME"
    docker compose down
    log_success "Сервисы остановлены"
}

# Команда перезапуска сервисов
cmd_restart() {
    log_step "Перезапуск сервисов"
    check_app_user
    check_system_installed
    
    cd "$APP_HOME"
    docker compose restart
    log_success "Сервисы перезапущены"
    
    # Показать статус
    sleep 3
    cmd_status
}

# Команда показа статуса
cmd_status() {
    log_step "Статус сервисов"
    check_system_installed
    
    cd "$APP_HOME"
    
    echo
    log_header "=== СТАТУС КОНТЕЙНЕРОВ ==="
    docker compose ps
    
    echo
    log_header "=== ИСПОЛЬЗОВАНИЕ РЕСУРСОВ ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo
    log_header "=== ОТКРЫТЫЕ ПОРТЫ ==="
    netstat -tulpn | grep -E ":80|:443|:8000|:5432|:6379" || log_info "Порты не открыты"
}

# Команда просмотра логов
cmd_logs() {
    log_step "Просмотр логов"
    check_system_installed
    
    cd "$APP_HOME"
    
    local follow_flag=""
    local service=""
    
    # Обработка аргументов
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow_flag="-f"
                shift
                ;;
            *)
                service="$1"
                shift
                ;;
        esac
    done
    
    if [ -n "$service" ]; then
        docker compose logs $follow_flag "$service"
    else
        docker compose logs $follow_flag
    fi
}

# Команда создания backup
cmd_backup() {
    log_step "Создание резервной копии"
    check_app_user
    check_system_installed
    
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        cd "$APP_HOME"
        docker compose --profile backup run --rm backup
    else
        log_error "Скрипт backup.sh не найден"
        exit 1
    fi
}

# Команда восстановления из backup
cmd_restore() {
    log_step "Восстановление из резервной копии"
    check_app_user
    check_system_installed
    
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Укажите файл backup для восстановления"
        log_info "Доступные backup файлы:"
        ls -la "$APP_HOME/backups/"*.sql.gz 2>/dev/null || log_info "Backup файлы не найдены"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Файл backup не найден: $backup_file"
        exit 1
    fi
    
    log_warning "ВНИМАНИЕ: Это действие перезапишет текущую базу данных!"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Восстановление отменено"
        exit 0
    fi
    
    cd "$APP_HOME"
    
    log_info "Остановка приложения..."
    docker compose stop backend frontend
    
    log_info "Восстановление базы данных..."
    gunzip -c "$backup_file" | docker compose exec -T postgres psql -U inventory_user -d inventory_db
    
    log_info "Запуск приложения..."
    docker compose start backend frontend
    
    log_success "Восстановление завершено"
}

# Команда проверки здоровья системы
cmd_health() {
    log_step "Проверка здоровья системы"
    check_system_installed
    
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        bash "$SCRIPT_DIR/health-check.sh"
    else
        log_warning "Скрипт health-check.sh не найден, выполняется базовая проверка"
        
        cd "$APP_HOME"
        
        # Проверка контейнеров
        echo
        log_header "=== СТАТУС КОНТЕЙНЕРОВ ==="
        docker compose ps
        
        # Проверка дискового пространства
        echo
        log_header "=== ДИСКОВОЕ ПРОСТРАНСТВО ==="
        df -h
        
        # Проверка памяти
        echo
        log_header "=== ИСПОЛЬЗОВАНИЕ ПАМЯТИ ==="
        free -h
    fi
}

# Команда очистки системы
cmd_cleanup() {
    log_step "Очистка системы"
    check_app_user
    check_system_installed
    
    log_info "Очистка неиспользуемых Docker образов..."
    docker image prune -f
    
    log_info "Очистка неиспользуемых Docker томов..."
    docker volume prune -f
    
    log_info "Очистка старых логов..."
    find "$APP_HOME/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    log_info "Очистка старых backup файлов..."
    find "$APP_HOME/backups" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    
    log_success "Очистка завершена"
}

# Команда мониторинга
cmd_monitor() {
    log_step "Запуск мониторинга системы"
    check_system_installed
    
    cd "$APP_HOME"
    
    # Запуск мониторинга если доступен
    if docker compose --profile monitoring ps | grep -q monitoring; then
        log_info "Мониторинг уже запущен"
        log_info "Prometheus доступен по адресу: http://localhost:9090"
    else
        log_info "Запуск мониторинга..."
        docker compose --profile monitoring up -d
        log_success "Мониторинг запущен"
        log_info "Prometheus доступен по адресу: http://localhost:9090"
    fi
}

# Команда показа статистики
cmd_stats() {
    log_step "Статистика использования ресурсов"
    check_system_installed
    
    echo
    log_header "=== ИСПОЛЬЗОВАНИЕ CPU И ПАМЯТИ ==="
    docker stats --no-stream
    
    echo
    log_header "=== ИСПОЛЬЗОВАНИЕ ДИСКОВОГО ПРОСТРАНСТВА ==="
    df -h
    
    echo
    log_header "=== РАЗМЕР ДИРЕКТОРИЙ ПРИЛОЖЕНИЯ ==="
    du -sh "$APP_HOME"/{logs,backups,uploads,ssl} 2>/dev/null || true
    
    echo
    log_header "=== СЕТЕВАЯ СТАТИСТИКА ==="
    netstat -i
}

# Команда показа использования диска
cmd_disk() {
    log_step "Использование дискового пространства"
    
    echo
    log_header "=== ОБЩЕЕ ИСПОЛЬЗОВАНИЕ ДИСКА ==="
    df -h
    
    echo
    log_header "=== РАЗМЕР ДИРЕКТОРИЙ ПРИЛОЖЕНИЯ ==="
    if [ -d "$APP_HOME" ]; then
        du -sh "$APP_HOME"/* 2>/dev/null | sort -hr
    fi
    
    echo
    log_header "=== РАЗМЕР DOCKER ДАННЫХ ==="
    docker system df
    
    echo
    log_header "=== ТОП 10 БОЛЬШИХ ФАЙЛОВ ==="
    find "$APP_HOME" -type f -exec du -h {} + 2>/dev/null | sort -hr | head -10
}

# Команда настройки SSL
cmd_ssl_setup() {
    log_step "Настройка SSL сертификатов"
    check_system_installed
    
    local domain="$1"
    
    if [ -z "$domain" ]; then
        log_error "Укажите домен для SSL сертификата"
        log_info "Использование: $0 ssl-setup example.com"
        exit 1
    fi
    
    if [ -f "$SCRIPT_DIR/ssl-setup.sh" ]; then
        bash "$SCRIPT_DIR/ssl-setup.sh" -d "$domain"
    else
        log_error "Скрипт ssl-setup.sh не найден"
        exit 1
    fi
}

# Команда обновления SSL
cmd_ssl_renew() {
    log_step "Обновление SSL сертификатов"
    check_app_user
    check_system_installed
    
    if [ -f "$SCRIPT_DIR/renew-ssl.sh" ]; then
        bash "$SCRIPT_DIR/renew-ssl.sh"
    else
        log_error "Скрипт renew-ssl.sh не найден"
        exit 1
    fi
}

# Команда проверки SSL
cmd_ssl_check() {
    log_step "Проверка SSL сертификатов"
    check_system_installed
    
    if [ -f "$APP_HOME/ssl/cert.pem" ]; then
        echo
        log_header "=== ИНФОРМАЦИЯ О СЕРТИФИКАТЕ ==="
        openssl x509 -in "$APP_HOME/ssl/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
        
        echo
        log_header "=== СРОК ДЕЙСТВИЯ ==="
        openssl x509 -in "$APP_HOME/ssl/cert.pem" -noout -enddate
        
        # Проверка срока действия
        local expiry_date=$(openssl x509 -in "$APP_HOME/ssl/cert.pem" -noout -enddate | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_left -lt 30 ]; then
            log_warning "Сертификат истекает через $days_left дней!"
        else
            log_success "Сертификат действителен еще $days_left дней"
        fi
    else
        log_error "SSL сертификат не найден"
        exit 1
    fi
}

# Основная функция
main() {
    local command="${1:-}"
    
    if [ -z "$command" ]; then
        show_help
        exit 1
    fi
    
    # Удаление первого аргумента (команды)
    shift
    
    case "$command" in
        install)
            cmd_install "$@"
            ;;
        deploy)
            cmd_deploy "$@"
            ;;
        update)
            cmd_update "$@"
            ;;
        start)
            cmd_start "$@"
            ;;
        stop)
            cmd_stop "$@"
            ;;
        restart)
            cmd_restart "$@"
            ;;
        status)
            cmd_status "$@"
            ;;
        logs)
            cmd_logs "$@"
            ;;
        backup)
            cmd_backup "$@"
            ;;
        restore)
            cmd_restore "$@"
            ;;
        health)
            cmd_health "$@"
            ;;
        cleanup)
            cmd_cleanup "$@"
            ;;
        monitor)
            cmd_monitor "$@"
            ;;
        stats)
            cmd_stats "$@"
            ;;
        disk)
            cmd_disk "$@"
            ;;
        ssl-setup)
            cmd_ssl_setup "$@"
            ;;
        ssl-renew)
            cmd_ssl_renew "$@"
            ;;
        ssl-check)
            cmd_ssl_check "$@"
            ;;
        -h|--help|help)
            show_help
            ;;
        *)
            log_error "Неизвестная команда: $command"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Запуск основной функции
main "$@" 