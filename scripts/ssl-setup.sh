#!/bin/bash

# =============================================================================
# СКРИПТ НАСТРОЙКИ SSL СЕРТИФИКАТОВ LET'S ENCRYPT
# =============================================================================
# Автоматическая настройка SSL сертификатов для production окружения

set -e

# Конфигурация
DOMAIN="${APP_DOMAIN:-localhost}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
STAGING="${LETSENCRYPT_STAGING:-false}"
SSL_DIR="./ssl"
WEBROOT_PATH="./certbot-webroot"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование с цветами
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен"
        exit 1
    fi
    
    log_success "Все зависимости установлены"
}

# Проверка домена
validate_domain() {
    log "Проверка домена: $DOMAIN"
    
    if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        log_error "Необходимо указать реальный домен в переменной APP_DOMAIN"
        log "Пример: export APP_DOMAIN=example.com"
        exit 1
    fi
    
    # Проверка DNS записи
    if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
        log_warning "DNS запись для домена $DOMAIN не найдена"
        log_warning "Убедитесь, что домен указывает на этот сервер"
        
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Домен $DOMAIN валиден"
}

# Создание директорий
create_directories() {
    log "Создание необходимых директорий..."
    
    mkdir -p "$SSL_DIR"
    mkdir -p "$WEBROOT_PATH"
    mkdir -p "./logs/nginx"
    
    log_success "Директории созданы"
}

# Генерация временного самоподписанного сертификата
generate_temp_cert() {
    log "Генерация временного самоподписанного сертификата..."
    
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=TempCert/CN=$DOMAIN" \
        >/dev/null 2>&1
    
    log_success "Временный сертификат создан"
}

# Запуск Nginx для проверки Let's Encrypt
start_nginx_for_challenge() {
    log "Запуск Nginx для проверки Let's Encrypt..."
    
    # Создание временной конфигурации Nginx
    cat > "./nginx-temp.conf" << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root $WEBROOT_PATH;
        }
        
        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    # Запуск временного Nginx контейнера
    docker run -d --name nginx-temp \
        -p 80:80 \
        -v "$(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro" \
        -v "$(pwd)/$WEBROOT_PATH:$WEBROOT_PATH" \
        nginx:alpine
    
    log_success "Временный Nginx запущен"
}

# Остановка временного Nginx
stop_temp_nginx() {
    log "Остановка временного Nginx..."
    
    docker stop nginx-temp >/dev/null 2>&1 || true
    docker rm nginx-temp >/dev/null 2>&1 || true
    rm -f "./nginx-temp.conf"
    
    log_success "Временный Nginx остановлен"
}

# Получение SSL сертификата
obtain_certificate() {
    log "Получение SSL сертификата от Let's Encrypt..."
    
    local staging_flag=""
    if [ "$STAGING" = "true" ]; then
        staging_flag="--staging"
        log_warning "Используется staging сервер Let's Encrypt"
    fi
    
    # Запуск Certbot
    docker run --rm \
        -v "$(pwd)/$SSL_DIR:/etc/letsencrypt" \
        -v "$(pwd)/$WEBROOT_PATH:$WEBROOT_PATH" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT_PATH" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        $staging_flag \
        -d "$DOMAIN"
    
    # Копирование сертификатов
    if [ -f "$(pwd)/$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
        cp "$(pwd)/$SSL_DIR/live/$DOMAIN/fullchain.pem" "$(pwd)/$SSL_DIR/cert.pem"
        cp "$(pwd)/$SSL_DIR/live/$DOMAIN/privkey.pem" "$(pwd)/$SSL_DIR/key.pem"
        
        log_success "SSL сертификат успешно получен и установлен"
    else
        log_error "Не удалось получить SSL сертификат"
        return 1
    fi
}

# Настройка автоматического обновления
setup_auto_renewal() {
    log "Настройка автоматического обновления сертификатов..."
    
    # Создание скрипта обновления
    cat > "./scripts/renew-ssl.sh" << 'EOF'
#!/bin/bash

# Скрипт обновления SSL сертификатов
set -e

DOMAIN="${APP_DOMAIN}"
SSL_DIR="./ssl"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Проверка необходимости обновления сертификата для $DOMAIN"

# Обновление сертификата
docker run --rm \
    -v "$(pwd)/$SSL_DIR:/etc/letsencrypt" \
    -v "$(pwd)/certbot-webroot:/var/www/certbot" \
    certbot/certbot renew --quiet

# Проверка обновления
if [ -f "$(pwd)/$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
    # Копирование обновленных сертификатов
    cp "$(pwd)/$SSL_DIR/live/$DOMAIN/fullchain.pem" "$(pwd)/$SSL_DIR/cert.pem"
    cp "$(pwd)/$SSL_DIR/live/$DOMAIN/privkey.pem" "$(pwd)/$SSL_DIR/key.pem"
    
    log "Сертификаты обновлены, перезапуск Nginx..."
    docker-compose restart frontend
    
    log "SSL сертификаты успешно обновлены"
else
    log "Обновление сертификатов не требуется"
fi
EOF
    
    chmod +x "./scripts/renew-ssl.sh"
    
    # Создание cron задачи
    cat > "./scripts/ssl-cron" << EOF
# Автоматическое обновление SSL сертификатов каждый день в 3:00
0 3 * * * cd $(pwd) && ./scripts/renew-ssl.sh >> ./logs/ssl-renewal.log 2>&1
EOF
    
    log_success "Автоматическое обновление настроено"
    log "Для активации добавьте в crontab: crontab ./scripts/ssl-cron"
}

# Проверка сертификата
verify_certificate() {
    log "Проверка SSL сертификата..."
    
    if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
        # Проверка валидности сертификата
        if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout >/dev/null 2>&1; then
            local expiry_date=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
            log_success "SSL сертификат валиден до: $expiry_date"
            return 0
        else
            log_error "SSL сертификат поврежден"
            return 1
        fi
    else
        log_error "SSL сертификат не найден"
        return 1
    fi
}

# Показ справки
show_help() {
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "Опции:"
    echo "  -d, --domain DOMAIN     Домен для сертификата"
    echo "  -e, --email EMAIL       Email для Let's Encrypt"
    echo "  -s, --staging           Использовать staging сервер"
    echo "  -h, --help              Показать эту справку"
    echo ""
    echo "Переменные окружения:"
    echo "  APP_DOMAIN              Домен приложения"
    echo "  LETSENCRYPT_EMAIL       Email для Let's Encrypt"
    echo "  LETSENCRYPT_STAGING     Использовать staging (true/false)"
    echo ""
    echo "Примеры:"
    echo "  $0 -d example.com -e admin@example.com"
    echo "  $0 --staging -d test.example.com"
}

# Обработка аргументов командной строки
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -s|--staging)
            STAGING="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

# Основная функция
main() {
    log "=== НАСТРОЙКА SSL СЕРТИФИКАТОВ ==="
    log "Домен: $DOMAIN"
    log "Email: $EMAIL"
    log "Staging: $STAGING"
    
    # Проверки
    check_dependencies
    validate_domain
    create_directories
    
    # Генерация временного сертификата
    generate_temp_cert
    
    # Получение реального сертификата
    start_nginx_for_challenge
    
    if obtain_certificate; then
        stop_temp_nginx
        setup_auto_renewal
        verify_certificate
        
        log_success "=== SSL НАСТРОЙКА ЗАВЕРШЕНА УСПЕШНО ==="
        log "Теперь можно запустить приложение: docker-compose up -d"
    else
        stop_temp_nginx
        log_error "=== ОШИБКА НАСТРОЙКИ SSL ==="
        log "Используется временный самоподписанный сертификат"
        exit 1
    fi
}

# Обработка сигналов
trap 'log "Получен сигнал завершения..."; stop_temp_nginx; exit 1' SIGTERM SIGINT

# Запуск основной функции
main "$@" 