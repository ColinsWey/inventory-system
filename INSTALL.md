# 🚀 Автоматическая установка системы управления товарными остатками

Полное руководство по автоматической установке и развертыванию системы на Ubuntu Server 22.04.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Системные требования](#системные-требования)
- [Подготовка сервера](#подготовка-сервера)
- [Установка системы](#установка-системы)
- [Развертывание приложения](#развертывание-приложения)
- [Управление системой](#управление-системой)
- [Обслуживание](#обслуживание)
- [Устранение неполадок](#устранение-неполадок)

## 🚀 Быстрый старт

### Одна команда для полной установки:

```bash
# Скачивание и запуск установки
curl -fsSL https://raw.githubusercontent.com/your-repo/inventory-system/main/scripts/install.sh | sudo bash

# Развертывание приложения
sudo -u inventory /opt/inventory/scripts/deploy.sh
```

### Пошаговая установка:

```bash
# 1. Клонирование репозитория
git clone https://github.com/your-repo/inventory-system.git
cd inventory-system

# 2. Установка системы (требует root)
sudo chmod +x scripts/*.sh
sudo scripts/install.sh

# 3. Развертывание приложения (от пользователя inventory)
sudo -u inventory scripts/deploy.sh
```

## 💻 Системные требования

### Минимальные требования:
- **ОС**: Ubuntu Server 22.04 LTS
- **RAM**: 4GB (рекомендуется 8GB)
- **Диск**: 20GB свободного места
- **CPU**: 2+ ядра
- **Сеть**: Статический IP и доменное имя

### Рекомендуемые требования:
- **RAM**: 8GB+
- **Диск**: 50GB+ SSD
- **CPU**: 4+ ядра
- **Сеть**: Выделенный IP, CDN

## 🔧 Подготовка сервера

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 2. Настройка DNS

Убедитесь, что ваш домен указывает на IP сервера:

```bash
# Проверка DNS записи
nslookup your-domain.com
dig your-domain.com A
```

### 3. Настройка SSH (рекомендуется)

```bash
# Создание SSH ключа (на локальной машине)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Копирование ключа на сервер
ssh-copy-id user@your-server-ip

# Отключение парольной аутентификации
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
sudo systemctl restart ssh
```

## 📦 Установка системы

### Автоматическая установка

Скрипт `install.sh` выполняет полную настройку системы:

```bash
sudo scripts/install.sh
```

### Что устанавливается:

1. **Docker и Docker Compose** - контейнеризация
2. **UFW Firewall** - базовая защита
3. **Пользователь inventory** - для запуска приложения
4. **Системные лимиты** - оптимизация производительности
5. **Дополнительные инструменты** - мониторинг и безопасность
6. **Автозапуск** - systemd сервис
7. **Структура директорий** - организация файлов

### Проверка установки:

```bash
# Проверка Docker
docker --version
docker compose version

# Проверка пользователя
id inventory

# Проверка firewall
sudo ufw status

# Проверка systemd сервиса
systemctl status inventory
```

## 🚀 Развертывание приложения

### Автоматическое развертывание

Скрипт `deploy.sh` выполняет полное развертывание:

```bash
sudo -u inventory scripts/deploy.sh
```

### Интерактивная настройка

Во время развертывания вам будет предложено настроить:

1. **Домен приложения**:
   ```
   Введите домен приложения: inventory.company.com
   ```

2. **Email для SSL**:
   ```
   Введите email для SSL сертификатов: admin@company.com
   ```

3. **API ключ SalesDrive** (опционально):
   ```
   Введите API ключ SalesDrive: your-api-key
   ```

### Что происходит при развертывании:

1. **Клонирование репозитория** - получение кода
2. **Настройка переменных окружения** - генерация паролей
3. **Копирование конфигурации** - Docker, Nginx
4. **Настройка SSL** - Let's Encrypt или самоподписанный
5. **Сборка образов** - backend и frontend
6. **Запуск базы данных** - PostgreSQL и Redis
7. **Запуск приложения** - все сервисы
8. **Проверка работоспособности** - health checks
9. **Настройка cron задач** - автоматизация

## 🎛️ Управление системой

### Главный скрипт управления

Используйте `manage.sh` для всех операций:

```bash
# Показать справку
scripts/manage.sh --help

# Основные команды
scripts/manage.sh status      # Статус системы
scripts/manage.sh start       # Запуск
scripts/manage.sh stop        # Остановка
scripts/manage.sh restart     # Перезапуск
scripts/manage.sh logs -f     # Логи в реальном времени
```

### Команды управления сервисами

```bash
# Запуск всех сервисов
sudo -u inventory scripts/manage.sh start

# Остановка всех сервисов
sudo -u inventory scripts/manage.sh stop

# Перезапуск сервисов
sudo -u inventory scripts/manage.sh restart

# Статус сервисов
scripts/manage.sh status

# Просмотр логов
scripts/manage.sh logs
scripts/manage.sh logs -f          # В реальном времени
scripts/manage.sh logs backend     # Конкретный сервис
```

### Команды мониторинга

```bash
# Проверка здоровья системы
scripts/manage.sh health

# Статистика ресурсов
scripts/manage.sh stats

# Использование диска
scripts/manage.sh disk

# Запуск мониторинга Prometheus
scripts/manage.sh monitor
```

## 🔄 Обновление системы

### Автоматическое обновление

```bash
# Проверка и установка обновлений
sudo -u inventory scripts/update.sh

# Или через главный скрипт
sudo -u inventory scripts/manage.sh update
```

### Что происходит при обновлении:

1. **Проверка обновлений** - сравнение с репозиторием
2. **Создание backup** - автоматическое резервное копирование
3. **Сохранение состояния** - для возможного rollback
4. **Обновление кода** - получение новой версии
5. **Обновление конфигурации** - новые настройки
6. **Пересборка образов** - обновленные контейнеры
7. **Запуск приложения** - новая версия
8. **Проверка работоспособности** - автоматическое тестирование
9. **Rollback при ошибке** - автоматический откат

### Ручной rollback

```bash
# Если что-то пошло не так
sudo -u inventory scripts/rollback.sh
```

## 💾 Резервное копирование

### Автоматическое backup

```bash
# Создание backup
sudo -u inventory scripts/manage.sh backup

# Или напрямую
sudo -u inventory scripts/backup.sh
```

### Восстановление из backup

```bash
# Список доступных backup
ls -la /opt/inventory/backups/

# Восстановление
sudo -u inventory scripts/manage.sh restore /opt/inventory/backups/backup_file.sql.gz
```

### Настройка автоматического backup

Backup автоматически настраивается в cron:

```bash
# Проверка cron задач
sudo -u inventory crontab -l

# Ручное добавление (если нужно)
sudo -u inventory crontab -e
# 0 2 * * * cd /opt/inventory && docker compose --profile backup run --rm backup
```

## 🔒 SSL сертификаты

### Автоматическая настройка Let's Encrypt

```bash
# Настройка SSL для домена
scripts/manage.sh ssl-setup your-domain.com
```

### Проверка SSL сертификатов

```bash
# Информация о сертификате
scripts/manage.sh ssl-check

# Обновление сертификатов
sudo -u inventory scripts/manage.sh ssl-renew
```

### Автоматическое обновление SSL

Обновление SSL автоматически настраивается в cron:

```bash
# Проверка задачи обновления SSL
sudo -u inventory crontab -l | grep ssl
```

## 🧹 Обслуживание

### Очистка системы

```bash
# Очистка неиспользуемых данных
sudo -u inventory scripts/manage.sh cleanup
```

### Мониторинг дискового пространства

```bash
# Проверка использования диска
scripts/manage.sh disk

# Размер директорий приложения
du -sh /opt/inventory/*
```

### Ротация логов

Логи автоматически ротируются через logrotate:

```bash
# Проверка конфигурации logrotate
cat /etc/logrotate.d/inventory

# Ручная ротация
sudo logrotate -f /etc/logrotate.d/inventory
```

## 🔧 Конфигурация

### Основные файлы конфигурации

```bash
/opt/inventory/
├── app/.env                    # Переменные окружения
├── docker-compose.yml          # Конфигурация Docker
├── nginx.conf                  # Конфигурация Nginx
├── ssl/                        # SSL сертификаты
├── logs/                       # Логи приложения
├── backups/                    # Резервные копии
└── scripts/                    # Скрипты управления
```

### Изменение конфигурации

```bash
# Редактирование переменных окружения
sudo -u inventory nano /opt/inventory/app/.env

# Применение изменений
sudo -u inventory scripts/manage.sh restart
```

### Важные переменные окружения

```bash
# Домен и SSL
APP_DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com

# Безопасность
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# База данных
POSTGRES_PASSWORD=your-db-password
REDIS_PASSWORD=your-redis-password

# API интеграция
SALESDRIVE_API_KEY=your-api-key
```

## 🐛 Устранение неполадок

### Проверка статуса системы

```bash
# Общий статус
scripts/manage.sh status

# Проверка здоровья
scripts/manage.sh health

# Логи ошибок
scripts/manage.sh logs | grep ERROR
```

### Частые проблемы

#### 1. Контейнеры не запускаются

```bash
# Проверка логов
scripts/manage.sh logs

# Проверка конфигурации Docker
cd /opt/inventory && docker compose config

# Пересборка образов
cd /opt/inventory && docker compose build --no-cache
```

#### 2. Проблемы с SSL

```bash
# Проверка сертификатов
scripts/manage.sh ssl-check

# Перегенерация сертификатов
scripts/manage.sh ssl-setup your-domain.com
```

#### 3. Проблемы с базой данных

```bash
# Проверка подключения к БД
cd /opt/inventory && docker compose exec postgres pg_isready

# Подключение к БД
cd /opt/inventory && docker compose exec postgres psql -U inventory_user -d inventory_db
```

#### 4. Недостаток места на диске

```bash
# Проверка использования диска
scripts/manage.sh disk

# Очистка системы
scripts/manage.sh cleanup

# Удаление старых backup
find /opt/inventory/backups -name "*.sql.gz" -mtime +30 -delete
```

### Логи для диагностики

```bash
# Логи установки
tail -f /var/log/inventory-install.log

# Логи развертывания
tail -f /opt/inventory/logs/deploy.log

# Логи обновления
tail -f /opt/inventory/logs/update.log

# Логи приложения
tail -f /opt/inventory/logs/backend/*.log
tail -f /opt/inventory/logs/nginx/*.log
```

### Восстановление после сбоя

```bash
# Полная остановка
cd /opt/inventory && docker compose down

# Восстановление из backup
scripts/manage.sh restore /opt/inventory/backups/latest_backup.sql.gz

# Перезапуск системы
scripts/manage.sh start
```

## 📞 Поддержка

### Полезные команды для диагностики

```bash
# Системная информация
uname -a
lsb_release -a
free -h
df -h

# Docker информация
docker version
docker compose version
docker system df

# Сетевая информация
ip addr show
netstat -tulpn | grep -E ":80|:443"
```

### Сбор логов для поддержки

```bash
# Создание архива с логами
tar -czf inventory-logs-$(date +%Y%m%d).tar.gz \
    /opt/inventory/logs/ \
    /var/log/inventory-*.log \
    /opt/inventory/app/.env.example
```

### Контакты

- **Документация**: [GitHub Wiki](https://github.com/your-repo/inventory-system/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/inventory-system/issues)
- **Email**: support@your-company.com

---

## 📝 Заключение

Автоматические скрипты обеспечивают:

- ✅ **Быструю установку** - от чистого сервера до работающего приложения за 10-15 минут
- ✅ **Безопасность** - автоматическая настройка firewall, SSL, безопасных паролей
- ✅ **Надежность** - проверки ошибок, rollback, резервное копирование
- ✅ **Автоматизацию** - cron задачи для backup, SSL, мониторинга
- ✅ **Простоту управления** - единый интерфейс через manage.sh
- ✅ **Мониторинг** - health checks, логирование, статистика

Система готова к production использованию сразу после установки! 