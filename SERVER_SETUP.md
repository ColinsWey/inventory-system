# 🌐 Настройка IP сервера для системы управления складом

## 🎯 Проблема
Система была привязана к конкретному IP адресу `78.128.99.7`, что затрудняло развертывание на других серверах.

## ✅ Решение
Система теперь использует переменные окружения для гибкой настройки IP адреса.

## 📁 Структура конфигурации

```
├── .env                    # Корневой файл для Docker
├── frontend/.env           # Конфигурация frontend
├── frontend/.env.example   # Шаблон для настройки
├── setup-server.bat        # Windows скрипт настройки
├── setup-server.sh         # Linux/Mac скрипт настройки
└── docker-compose.yml      # Использует переменные окружения
```

## 🚀 Быстрая настройка

### Windows:
```cmd
# Настройка нового IP
.\setup-server.bat 192.168.1.100

# Сборка и запуск
cd frontend && npm run build
docker compose up -d
```

### Linux/Mac:
```bash
# Настройка нового IP
chmod +x setup-server.sh
./setup-server.sh 192.168.1.100

# Сборка и запуск
cd frontend && npm run build
docker compose up -d
```

## 📝 Ручная настройка

### 1. Настройка frontend
Создайте файл `frontend/.env`:
```env
# API Configuration
REACT_APP_API_URL=http://YOUR_SERVER_IP:8000/api/v1
```

### 2. Настройка Docker
Создайте файл `.env` в корне проекта:
```env
# Server Configuration
SERVER_HOST=YOUR_SERVER_IP
```

### 3. Сборка и запуск
```bash
cd frontend
npm run build
cd ..
docker compose up -d
```

## 🔧 Конфигурационные файлы

### frontend/src/services/api.ts
```typescript
// Автоматически использует переменную окружения
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
```

### docker-compose.yml
```yaml
frontend:
  environment:
    - REACT_APP_API_URL=http://${SERVER_HOST:-localhost}:8000/api/v1
```

## 🌍 Примеры использования

### Локальная разработка:
```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### Локальная сеть:
```env
REACT_APP_API_URL=http://192.168.1.100:8000/api/v1
```

### Продакшн с доменом:
```env
REACT_APP_API_URL=https://api.your-domain.com/api/v1
```

### Продакшн с IP:
```env
REACT_APP_API_URL=http://78.128.99.7:8000/api/v1
```

## 🔄 Переключение между серверами

```cmd
# Переключение на тестовый сервер
.\setup-server.bat 192.168.1.50

# Переключение на продакшн
.\setup-server.bat 78.128.99.7

# Переключение на локальную разработку
.\setup-server.bat localhost
```

## 📋 Проверка конфигурации

### Проверка frontend .env:
```cmd
type frontend\.env
```

### Проверка Docker .env:
```cmd
type .env
```

### Проверка в браузере:
1. Откройте DevTools Console (F12)
2. Найдите логи: `📤 Отправляем JSON данные`
3. Проверьте URL запросов в Network tab

## 🚨 Важные замечания

1. **Файлы .env исключены из Git** - каждый сервер настраивается индивидуально
2. **Используйте .env.example** как шаблон для новых серверов
3. **После изменения IP** обязательно пересоберите frontend
4. **В продакшене** рекомендуется использовать HTTPS

## 🎉 Преимущества

- ✅ Легкое переключение между серверами одной командой
- ✅ Нет хардкода IP адресов в коде
- ✅ Работает в dev, test и production окружениях
- ✅ Поддержка как IP адресов, так и доменных имен
- ✅ Автоматическая настройка Docker окружения 