#!/bin/bash

# =============================================================================
# СКРИПТ АВТОМАТИЧЕСКОЙ УСТАНОВКИ СИСТЕМЫ УПРАВЛЕНИЯ ТОВАРНЫМИ ОСТАТКАМИ
# =============================================================================
# Установка на чистый Ubuntu Server 22.04 LTS
# Автор: System Administrator
# Версия: 1.0.0

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/inventory-install.log"
APP_USER="inventory"
APP_GROUP="inventory"
APP_HOME="/opt/inventory"

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

# Функция проверки прав root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Скрипт должен запускаться с правами root"
        log_info "Используйте: sudo $0"
        exit 1
    fi
}

# Функция проверки версии Ubuntu
check_ubuntu_version() {
    log_step "Проверка версии операционной системы"
    
    if [ ! -f /etc/os-release ]; then
        log_error "Не удается определить версию ОС"
        exit 1
    fi
    
    source /etc/os-release
    
    if [ "$ID" != "ubuntu" ]; then
        log_error "Поддерживается только Ubuntu. Обнаружена: $ID"
        exit 1
    fi
    
    if [ "$VERSION_ID" != "22.04" ]; then
        log_warning "Рекомендуется Ubuntu 22.04. Обнаружена: $VERSION_ID"
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "ОС: Ubuntu $VERSION_ID"
}

# Функция обновления системы
update_system() {
    log_step "Обновление системы"
    
    log_info "Обновление списка пакетов..."
    apt update -y >> "$LOG_FILE" 2>&1
    check_error "Ошибка обновления списка пакетов"
    
    log_info "Обновление установленных пакетов..."
    apt upgrade -y >> "$LOG_FILE" 2>&1
    check_error "Ошибка обновления пакетов"
    
    log_info "Установка базовых пакетов..."
    apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        nano \
        vim \
        tree \
        jq \
        openssl >> "$LOG_FILE" 2>&1
    check_error "Ошибка установки базовых пакетов"
    
    log_success "Система обновлена"
}

# Функция установки Docker
install_docker() {
    log_step "Установка Docker"
    
    # Проверка существующей установки
    if command -v docker &> /dev/null; then
        log_warning "Docker уже установлен"
        docker --version
        return 0
    fi
    
    log_info "Удаление старых версий Docker..."
    apt remove -y docker docker-engine docker.io containerd runc >> "$LOG_FILE" 2>&1 || true
    
    log_info "Добавление GPG ключа Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    check_error "Ошибка добавления GPG ключа Docker"
    
    log_info "Добавление репозитория Docker..."
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    check_error "Ошибка добавления репозитория Docker"
    
    log_info "Обновление списка пакетов..."
    apt update -y >> "$LOG_FILE" 2>&1
    check_error "Ошибка обновления списка пакетов"
    
    log_info "Установка Docker Engine..."
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >> "$LOG_FILE" 2>&1
    check_error "Ошибка установки Docker"
    
    log_info "Запуск и включение автозапуска Docker..."
    systemctl start docker
    systemctl enable docker
    check_error "Ошибка запуска Docker"
    
    log_info "Проверка установки Docker..."
    docker --version
    docker compose version
    
    log_success "Docker успешно установлен"
}

# Функция создания пользователя приложения
create_app_user() {
    log_step "Создание пользователя приложения"
    
    if id "$APP_USER" &>/dev/null; then
        log_warning "Пользователь $APP_USER уже существует"
        return 0
    fi
    
    log_info "Создание группы $APP_GROUP..."
    groupadd -r "$APP_GROUP" >> "$LOG_FILE" 2>&1
    
    log_info "Создание пользователя $APP_USER..."
    useradd -r -g "$APP_GROUP" -d "$APP_HOME" -s /bin/bash -c "Inventory System User" "$APP_USER" >> "$LOG_FILE" 2>&1
    check_error "Ошибка создания пользователя"
    
    log_info "Добавление пользователя в группу docker..."
    usermod -aG docker "$APP_USER" >> "$LOG_FILE" 2>&1
    check_error "Ошибка добавления в группу docker"
    
    log_info "Создание домашней директории..."
    mkdir -p "$APP_HOME"
    chown "$APP_USER:$APP_GROUP" "$APP_HOME"
    chmod 755 "$APP_HOME"
    
    log_success "Пользователь $APP_USER создан"
}

# Функция настройки firewall
setup_firewall() {
    log_step "Настройка firewall (UFW)"
    
    log_info "Установка UFW..."
    apt install -y ufw >> "$LOG_FILE" 2>&1
    check_error "Ошибка установки UFW"
    
    log_info "Настройка базовых правил..."
    ufw --force reset >> "$LOG_FILE" 2>&1
    ufw default deny incoming >> "$LOG_FILE" 2>&1
    ufw default allow outgoing >> "$LOG_FILE" 2>&1
    
    log_info "Разрешение SSH..."
    ufw allow ssh >> "$LOG_FILE" 2>&1
    
    log_info "Разрешение HTTP/HTTPS..."
    ufw allow 80/tcp >> "$LOG_FILE" 2>&1
    ufw allow 443/tcp >> "$LOG_FILE" 2>&1
    
    log_info "Активация firewall..."
    ufw --force enable >> "$LOG_FILE" 2>&1
    check_error "Ошибка активации firewall"
    
    log_info "Статус firewall:"
    ufw status verbose
    
    log_success "Firewall настроен"
}

# Функция настройки системных лимитов
setup_system_limits() {
    log_step "Настройка системных лимитов"
    
    log_info "Настройка лимитов для Docker..."
    cat > /etc/security/limits.d/docker.conf << EOF
# Лимиты для Docker
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    log_info "Настройка параметров ядра..."
    cat > /etc/sysctl.d/99-inventory.conf << EOF
# Оптимизация для веб-приложения
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
vm.max_map_count = 262144
fs.file-max = 2097152
EOF
    
    sysctl -p /etc/sysctl.d/99-inventory.conf >> "$LOG_FILE" 2>&1
    
    log_success "Системные лимиты настроены"
}

# Функция установки дополнительных инструментов
install_additional_tools() {
    log_step "Установка дополнительных инструментов"
    
    log_info "Установка инструментов мониторинга..."
    apt install -y \
        iotop \
        nethogs \
        ncdu \
        fail2ban \
        logrotate >> "$LOG_FILE" 2>&1
    check_error "Ошибка установки инструментов мониторинга"
    
    log_info "Настройка fail2ban..."
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log_info "Настройка logrotate для приложения..."
    cat > /etc/logrotate.d/inventory << EOF
/opt/inventory/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 inventory inventory
    postrotate
        /usr/bin/docker-compose -f /opt/inventory/docker-compose.yml restart frontend || true
    endscript
}
EOF
    
    log_success "Дополнительные инструменты установлены"
}

# Функция создания структуры директорий
create_directory_structure() {
    log_step "Создание структуры директорий"
    
    local dirs=(
        "$APP_HOME/logs/backend"
        "$APP_HOME/logs/nginx"
        "$APP_HOME/backups"
        "$APP_HOME/uploads"
        "$APP_HOME/ssl"
        "$APP_HOME/scripts"
        "$APP_HOME/monitoring"
    )
    
    for dir in "${dirs[@]}"; do
        log_info "Создание директории: $dir"
        mkdir -p "$dir"
        chown "$APP_USER:$APP_GROUP" "$dir"
        chmod 755 "$dir"
    done
    
    log_success "Структура директорий создана"
}

# Функция настройки автозапуска
setup_autostart() {
    log_step "Настройка автозапуска приложения"
    
    log_info "Создание systemd сервиса..."
    cat > /etc/systemd/system/inventory.service << EOF
[Unit]
Description=Inventory Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_HOME
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0
User=$APP_USER
Group=$APP_GROUP

[Install]
WantedBy=multi-user.target
EOF
    
    log_info "Перезагрузка systemd..."
    systemctl daemon-reload
    
    log_info "Включение автозапуска..."
    systemctl enable inventory.service
    
    log_success "Автозапуск настроен"
}

# Функция создания скрипта проверки системы
create_health_check() {
    log_step "Создание скрипта проверки системы"
    
    cat > "$APP_HOME/scripts/health-check.sh" << 'EOF'
#!/bin/bash

# Скрипт проверки здоровья системы
set -e

APP_HOME="/opt/inventory"
cd "$APP_HOME"

echo "=== ПРОВЕРКА ЗДОРОВЬЯ СИСТЕМЫ ==="
echo "Время: $(date)"
echo

# Проверка Docker
echo "Docker:"
docker --version
echo

# Проверка контейнеров
echo "Статус контейнеров:"
docker compose ps
echo

# Проверка дискового пространства
echo "Дисковое пространство:"
df -h
echo

# Проверка памяти
echo "Использование памяти:"
free -h
echo

# Проверка логов
echo "Последние ошибки в логах:"
find logs/ -name "*.log" -exec grep -l "ERROR\|CRITICAL" {} \; 2>/dev/null | head -5
echo

# Проверка SSL сертификатов
if [ -f ssl/cert.pem ]; then
    echo "SSL сертификат:"
    openssl x509 -in ssl/cert.pem -noout -enddate
    echo
fi

# Проверка backup файлов
echo "Последние backup файлы:"
ls -la backups/ | tail -5
echo

echo "=== ПРОВЕРКА ЗАВЕРШЕНА ==="
EOF
    
    chmod +x "$APP_HOME/scripts/health-check.sh"
    chown "$APP_USER:$APP_GROUP" "$APP_HOME/scripts/health-check.sh"
    
    log_success "Скрипт проверки системы создан"
}

# Функция вывода итоговой информации
show_summary() {
    log_step "Итоговая информация"
    
    echo
    echo "=============================================="
    echo "  УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!"
    echo "=============================================="
    echo
    echo "Установленные компоненты:"
    echo "  ✓ Docker $(docker --version | cut -d' ' -f3)"
    echo "  ✓ Docker Compose $(docker compose version --short)"
    echo "  ✓ UFW Firewall"
    echo "  ✓ Пользователь приложения: $APP_USER"
    echo "  ✓ Домашняя директория: $APP_HOME"
    echo "  ✓ Автозапуск systemd"
    echo
    echo "Следующие шаги:"
    echo "  1. Запустите скрипт развертывания:"
    echo "     sudo -u $APP_USER $APP_HOME/scripts/deploy.sh"
    echo
    echo "  2. Или скопируйте проект в $APP_HOME и настройте:"
    echo "     sudo -u $APP_USER git clone <repo> $APP_HOME/app"
    echo "     sudo -u $APP_USER cp $APP_HOME/app/env.example $APP_HOME/app/.env"
    echo "     sudo -u $APP_USER nano $APP_HOME/app/.env"
    echo
    echo "Полезные команды:"
    echo "  - Проверка системы: sudo -u $APP_USER $APP_HOME/scripts/health-check.sh"
    echo "  - Статус сервиса: systemctl status inventory"
    echo "  - Логи установки: tail -f $LOG_FILE"
    echo
    echo "Порты:"
    echo "  - HTTP: 80"
    echo "  - HTTPS: 443"
    echo "  - SSH: 22"
    echo
    echo "=============================================="
}

# Основная функция
main() {
    echo "=============================================="
    echo "  УСТАНОВКА СИСТЕМЫ УПРАВЛЕНИЯ ОСТАТКАМИ"
    echo "=============================================="
    echo "Начало установки: $(date)"
    echo "Лог файл: $LOG_FILE"
    echo

    # Создание лог файла
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    # Проверки
    check_root
    check_ubuntu_version

    # Основные этапы установки
    update_system
    install_docker
    create_app_user
    setup_firewall
    setup_system_limits
    install_additional_tools
    create_directory_structure
    setup_autostart
    create_health_check

    # Итоговая информация
    show_summary

    log_success "Установка завершена успешно!"
}

# Обработка сигналов
trap 'log_error "Установка прервана пользователем"; exit 1' SIGINT SIGTERM

# Запуск основной функции
main "$@" 