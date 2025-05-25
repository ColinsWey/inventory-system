# 🛠️ Автоматические скрипты установки и управления

Набор скриптов для автоматической установки, развертывания и управления системой управления товарными остатками на Ubuntu Server 22.04.

## 📁 Структура скриптов

```
scripts/
├── install.sh          # Установка системы на чистый сервер
├── deploy.sh           # Развертывание приложения
├── update.sh           # Обновление приложения
├── backup.sh           # Резервное копирование
├── ssl-setup.sh        # Настройка SSL сертификатов
├── health-check.sh     # Проверка здоровья системы
├── manage.sh           # Главный скрипт управления
└── README.md           # Эта документация
```

## 🚀 Быстрый старт

### 1. Установка системы (root)

```bash
# Клонирование репозитория
git clone https://github.com/your-repo/inventory-system.git
cd inventory-system

# Установка системы
sudo chmod +x scripts/*.sh
sudo scripts/install.sh
```

### 2. Развертывание приложения (пользователь inventory)

```bash
# Развертывание
sudo -u inventory scripts/deploy.sh

# Или через главный скрипт
sudo -u inventory scripts/manage.sh deploy
```

### 3. Управление системой

```bash
# Показать справку
scripts/manage.sh --help

# Основные команды
scripts/manage.sh status
scripts/manage.sh logs -f
scripts/manage.sh backup
```

## 📋 Описание скриптов

### 🔧 install.sh - Установка системы

**Назначение**: Полная установка и настройка системы на чистом Ubuntu Server 22.04

**Требования**: Права root

**Что делает**:
- ✅ Проверяет версию Ubuntu
- ✅ Обновляет систему
- ✅ Устанавливает Docker и Docker Compose
- ✅ Создает пользователя `inventory`
- ✅ Настраивает UFW firewall
- ✅ Оптимизирует системные лимиты
- ✅ Устанавливает дополнительные инструменты
- ✅ Создает структуру директорий
- ✅ Настраивает автозапуск через systemd
- ✅ Создает скрипт проверки здоровья

**Использование**:
```bash
sudo scripts/install.sh
```

**Результат**:
- Система готова к развертыванию приложения
- Создан пользователь `inventory`
- Настроен firewall и безопасность
- Установлен Docker

---

### 🚀 deploy.sh - Развертывание приложения

**Назначение**: Автоматическое развертывание приложения

**Требования**: Пользователь `inventory`, установленная система

**Что делает**:
- ✅ Клонирует репозиторий приложения
- ✅ Настраивает переменные окружения
- ✅ Генерирует безопасные пароли
- ✅ Копирует файлы конфигурации
- ✅ Настраивает SSL сертификаты
- ✅ Собирает Docker образы
- ✅ Запускает базу данных
- ✅ Запускает приложение
- ✅ Проверяет работоспособность
- ✅ Настраивает cron задачи

**Использование**:
```bash
sudo -u inventory scripts/deploy.sh
```

**Интерактивная настройка**:
- Домен приложения
- Email для SSL сертификатов
- API ключ SalesDrive

**Результат**:
- Работающее приложение
- Настроенный SSL
- Автоматические backup и мониторинг

---

### 🔄 update.sh - Обновление приложения

**Назначение**: Безопасное обновление приложения с rollback

**Требования**: Пользователь `inventory`, развернутое приложение

**Что делает**:
- ✅ Проверяет наличие обновлений
- ✅ Создает backup перед обновлением
- ✅ Сохраняет состояние для rollback
- ✅ Обновляет код приложения
- ✅ Обновляет конфигурацию
- ✅ Пересобирает Docker образы
- ✅ Запускает обновленное приложение
- ✅ Проверяет работоспособность
- ✅ Выполняет rollback при ошибке

**Использование**:
```bash
sudo -u inventory scripts/update.sh
```

**Переменные окружения**:
- `BACKUP_BEFORE_UPDATE=true` - создавать backup
- `ROLLBACK_ON_FAILURE=true` - автоматический rollback

**Результат**:
- Обновленное приложение
- Backup предыдущей версии
- Возможность rollback

---

### 💾 backup.sh - Резервное копирование

**Назначение**: Создание резервных копий базы данных

**Требования**: Запущенная база данных

**Что делает**:
- ✅ Проверяет доступность PostgreSQL
- ✅ Создает сжатый SQL dump
- ✅ Сохраняет метаданные backup
- ✅ Проверяет целостность backup
- ✅ Удаляет старые backup файлы
- ✅ Отправляет уведомления (опционально)

**Использование**:
```bash
# Через Docker Compose
cd /opt/inventory
docker compose --profile backup run --rm backup

# Через главный скрипт
sudo -u inventory scripts/manage.sh backup
```

**Переменные окружения**:
- `BACKUP_RETENTION_DAYS=30` - срок хранения
- `WEBHOOK_URL` - URL для уведомлений

**Результат**:
- Сжатый backup файл
- Метаданные backup
- Ротация старых файлов

---

### 🔒 ssl-setup.sh - Настройка SSL

**Назначение**: Автоматическая настройка SSL сертификатов

**Требования**: Домен, указывающий на сервер

**Что делает**:
- ✅ Проверяет зависимости
- ✅ Валидирует домен
- ✅ Создает временный сертификат
- ✅ Запускает Nginx для ACME challenge
- ✅ Получает Let's Encrypt сертификат
- ✅ Настраивает автоматическое обновление
- ✅ Проверяет сертификат

**Использование**:
```bash
scripts/ssl-setup.sh -d example.com -e admin@example.com

# Или через главный скрипт
scripts/manage.sh ssl-setup example.com
```

**Опции**:
- `-d, --domain` - домен для сертификата
- `-e, --email` - email для Let's Encrypt
- `-s, --staging` - использовать staging сервер

**Результат**:
- Валидный SSL сертификат
- Автоматическое обновление
- HTTPS доступ к приложению

---

### 🏥 health-check.sh - Проверка здоровья

**Назначение**: Мониторинг состояния системы

**Требования**: Развернутое приложение

**Что делает**:
- ✅ Проверяет версию Docker
- ✅ Показывает статус контейнеров
- ✅ Проверяет дисковое пространство
- ✅ Показывает использование памяти
- ✅ Ищет ошибки в логах
- ✅ Проверяет SSL сертификаты
- ✅ Показывает последние backup

**Использование**:
```bash
sudo -u inventory scripts/health-check.sh

# Или через главный скрипт
scripts/manage.sh health
```

**Автоматический запуск**:
```bash
# Добавляется в cron автоматически
*/30 * * * * cd /opt/inventory && bash scripts/health-check.sh >> logs/health-check.log 2>&1
```

**Результат**:
- Полный отчет о состоянии системы
- Выявление проблем
- Логирование результатов

---

### 🎛️ manage.sh - Главный скрипт управления

**Назначение**: Единая точка входа для всех операций

**Требования**: Различные в зависимости от команды

**Команды установки**:
- `install` - установка системы (root)
- `deploy` - развертывание приложения
- `update` - обновление приложения

**Команды управления**:
- `start` - запуск сервисов
- `stop` - остановка сервисов
- `restart` - перезапуск сервисов
- `status` - статус сервисов
- `logs` - просмотр логов

**Команды обслуживания**:
- `backup` - создание backup
- `restore` - восстановление из backup
- `health` - проверка здоровья
- `cleanup` - очистка системы

**Команды мониторинга**:
- `monitor` - запуск мониторинга
- `stats` - статистика ресурсов
- `disk` - использование диска

**Команды SSL**:
- `ssl-setup` - настройка SSL
- `ssl-renew` - обновление SSL
- `ssl-check` - проверка SSL

**Использование**:
```bash
# Показать справку
scripts/manage.sh --help

# Примеры команд
scripts/manage.sh status
scripts/manage.sh logs -f
scripts/manage.sh backup
scripts/manage.sh ssl-setup example.com
```

## 🔧 Конфигурация скриптов

### Переменные окружения

Скрипты используют следующие переменные:

```bash
# Основные пути
APP_HOME="/opt/inventory"
APP_USER="inventory"
APP_GROUP="inventory"

# Репозиторий
REPO_URL="https://github.com/your-repo/inventory-system.git"
BRANCH="main"

# Backup
BACKUP_RETENTION_DAYS=30
BACKUP_BEFORE_UPDATE=true

# SSL
LETSENCRYPT_EMAIL="admin@example.com"
LETSENCRYPT_STAGING=false

# Обновления
ROLLBACK_ON_FAILURE=true
```

### Логирование

Все скрипты ведут подробные логи:

```bash
/var/log/inventory-install.log      # Логи установки
/opt/inventory/logs/deploy.log      # Логи развертывания
/opt/inventory/logs/update.log      # Логи обновления
/opt/inventory/logs/backup.log      # Логи backup
/opt/inventory/logs/health-check.log # Логи мониторинга
```

### Цветной вывод

Скрипты используют цветной вывод для лучшей читаемости:

- 🔵 **Синий** - информационные сообщения
- 🟢 **Зеленый** - успешные операции
- 🟡 **Желтый** - предупреждения
- 🔴 **Красный** - ошибки
- 🟣 **Фиолетовый** - этапы выполнения

## 🔒 Безопасность

### Проверки безопасности

- ✅ Проверка прав пользователя
- ✅ Валидация входных данных
- ✅ Безопасная генерация паролей
- ✅ Проверка целостности файлов
- ✅ Логирование всех операций

### Автоматическая генерация паролей

```bash
# Генерация 32-символьных ключей
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

# Генерация 16-символьных паролей
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
```

### Настройка firewall

```bash
# Базовые правила UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
```

## 🚨 Обработка ошибок

### Строгий режим

Все скрипты используют строгий режим:

```bash
set -euo pipefail
```

- `set -e` - остановка при ошибке
- `set -u` - ошибка при неопределенной переменной
- `set -o pipefail` - ошибка в pipeline

### Функция проверки ошибок

```bash
check_error() {
    if [ $? -ne 0 ]; then
        log_error "$1"
        exit 1
    fi
}
```

### Обработка сигналов

```bash
trap 'log_error "Операция прервана пользователем"; exit 1' SIGINT SIGTERM
```

## 📊 Мониторинг и алерты

### Автоматические cron задачи

```bash
# Backup каждый день в 2:00
0 2 * * * cd /opt/inventory && docker compose --profile backup run --rm backup

# SSL обновление каждый день в 3:00
0 3 * * * cd /opt/inventory && bash scripts/renew-ssl.sh

# Проверка здоровья каждые 30 минут
*/30 * * * * cd /opt/inventory && bash scripts/health-check.sh
```

### Уведомления

Скрипты поддерживают отправку уведомлений через webhook:

```bash
# Настройка webhook для Slack/Discord
export WEBHOOK_URL="https://hooks.slack.com/your-webhook"
```

## 🔄 Автоматизация

### Systemd сервис

Создается автоматический systemd сервис:

```ini
[Unit]
Description=Inventory Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/inventory
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=inventory
Group=inventory

[Install]
WantedBy=multi-user.target
```

### Автозапуск при загрузке

```bash
# Включение автозапуска
systemctl enable inventory.service

# Управление сервисом
systemctl start inventory
systemctl stop inventory
systemctl status inventory
```

## 📝 Примеры использования

### Полная установка с нуля

```bash
# 1. Подготовка сервера
sudo apt update && sudo apt upgrade -y

# 2. Клонирование репозитория
git clone https://github.com/your-repo/inventory-system.git
cd inventory-system

# 3. Установка системы
sudo chmod +x scripts/*.sh
sudo scripts/install.sh

# 4. Развертывание приложения
sudo -u inventory scripts/deploy.sh

# 5. Проверка работы
scripts/manage.sh status
scripts/manage.sh health
```

### Ежедневное обслуживание

```bash
# Проверка статуса
scripts/manage.sh status

# Проверка логов
scripts/manage.sh logs | tail -50

# Создание backup
sudo -u inventory scripts/manage.sh backup

# Проверка SSL
scripts/manage.sh ssl-check

# Очистка системы
sudo -u inventory scripts/manage.sh cleanup
```

### Обновление приложения

```bash
# Проверка обновлений
sudo -u inventory scripts/update.sh

# Или принудительное обновление
cd /opt/inventory/app
sudo -u inventory git pull origin main
sudo -u inventory scripts/manage.sh restart
```

## 🆘 Восстановление после сбоя

### Полное восстановление

```bash
# 1. Остановка всех сервисов
cd /opt/inventory && docker compose down

# 2. Восстановление из backup
scripts/manage.sh restore /opt/inventory/backups/latest_backup.sql.gz

# 3. Перезапуск системы
scripts/manage.sh start

# 4. Проверка работоспособности
scripts/manage.sh health
```

### Rollback после неудачного обновления

```bash
# Автоматический rollback (если включен)
# Выполняется автоматически при ошибке обновления

# Ручной rollback
sudo -u inventory scripts/rollback.sh
```

## 📞 Поддержка

### Сбор диагностической информации

```bash
# Создание архива с логами и конфигурацией
tar -czf inventory-debug-$(date +%Y%m%d).tar.gz \
    /opt/inventory/logs/ \
    /var/log/inventory-*.log \
    /opt/inventory/app/.env.example \
    /opt/inventory/docker-compose.yml

# Системная информация
scripts/manage.sh stats > system-info.txt
```

### Контакты

- **GitHub**: [Issues](https://github.com/your-repo/inventory-system/issues)
- **Email**: support@your-company.com
- **Документация**: [Wiki](https://github.com/your-repo/inventory-system/wiki)

---

## ✅ Заключение

Автоматические скрипты обеспечивают:

- 🚀 **Быструю установку** - от чистого сервера до работающего приложения
- 🔒 **Безопасность** - автоматическая настройка защиты
- 🔄 **Надежность** - проверки ошибок и rollback
- 📊 **Мониторинг** - автоматическое отслеживание состояния
- 🛠️ **Простоту управления** - единый интерфейс
- 📈 **Масштабируемость** - готовность к production

Система готова к использованию в production среде! 