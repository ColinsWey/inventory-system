# 📦 Система управления товарными остатками

[![Tests](https://github.com/ColinsWey/inventory-system/actions/workflows/tests.yml/badge.svg)](https://github.com/ColinsWey/inventory-system/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/ColinsWey/inventory-system/branch/main/graph/badge.svg)](https://codecov.io/gh/ColinsWey/inventory-system)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ColinsWey/inventory-system/blob/main/LICENSE)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/react-18+-blue.svg)](https://reactjs.org)

Современная система управления товарными остатками с прогнозированием спроса, интеграцией с внешними API и комплексной аналитикой.

## 🚀 Возможности

- **📊 Прогнозирование спроса** - Интеллектуальные алгоритмы прогнозирования с учетом сезонности
- **🔄 Интеграция с SalesDrive API** - Автоматический импорт данных о продажах
- **📈 Аналитика и отчеты** - Детальная аналитика продаж и остатков
- **🎯 Управление категориями** - Гибкая система категоризации товаров
- **⚡ Уведомления** - Автоматические уведомления о критических остатках
- **📱 Адаптивный интерфейс** - Современный веб-интерфейс для всех устройств

## 🛠️ Технологии

**Backend:**
- Python 3.9+ / FastAPI
- PostgreSQL / Redis
- SQLAlchemy / Alembic
- Celery для фоновых задач

**Frontend:**
- React 18+ / TypeScript
- Material-UI / Recharts
- React Query / React Router

**DevOps:**
- Docker / Docker Compose
- GitHub Actions CI/CD
- Nginx / Gunicorn

## 📋 Быстрый старт

### Требования
- Docker и Docker Compose
- Python 3.9+ (для разработки)
- Node.js 16+ (для разработки)

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/ColinsWey/inventory-system.git
cd inventory-system

# Запуск через Docker
docker-compose up -d

# Приложение будет доступно по адресу http://localhost:3000
```

**Данные для входа:**
- Логин: `admin`
- Пароль: `admin`

## 📚 Документация

- **[📖 Руководство по установке](docs/INSTALL.md)** - Подробная инструкция по установке и настройке
- **[👤 Руководство пользователя](docs/USER_GUIDE.md)** - Полное руководство по использованию системы
- **[🔧 API документация](docs/API_DOCS.md)** - Документация REST API
- **[❓ Решение проблем](docs/TROUBLESHOOTING.md)** - FAQ и устранение неполадок
- **[🧪 Тестирование](tests/README.md)** - Информация о тестах и их запуске

## 🎯 Основные функции

### Управление товарами
- Создание и редактирование товаров
- Организация по категориям
- Отслеживание остатков в реальном времени
- Настройка минимальных и максимальных остатков

### Прогнозирование спроса
- Алгоритмы машинного обучения
- Учет сезонности и трендов
- Исключение оптовых заказов
- Корректировка на изменение цен

### Интеграция данных
- Автоматический импорт из SalesDrive API
- Валидация и очистка данных
- Обработка ошибок импорта
- Планировщик автоматических импортов

### Отчеты и аналитика
- Интерактивные графики продаж
- Экспорт в Excel и PDF
- Настраиваемые периоды отчетов
- Сравнительная аналитика

## 🔧 Разработка

### Настройка окружения разработки

```bash
# Backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install
npm start

# База данных
docker-compose up -d postgres redis
alembic upgrade head
```

### Запуск тестов

```bash
# Все тесты
./tests/scripts/run_all_tests.sh

# Только unit тесты
pytest tests/unit/ -v

# E2E тесты
npx playwright test
```

## 📊 Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   FastAPI       │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         └──────────────►│    (Cache)      │◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │     Celery      │
                        │  (Background)   │
                        └─────────────────┘
```

## 🤝 Участие в разработке

Мы приветствуем вклад в развитие проекта! Пожалуйста, ознакомьтесь с [руководством по участию](CONTRIBUTING.md).

### Процесс разработки

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

- **Issues:** [GitHub Issues](https://github.com/ColinsWey/inventory-system/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ColinsWey/inventory-system/discussions)
- **Wiki:** [Project Wiki](https://github.com/ColinsWey/inventory-system/wiki)

## 📈 Статистика проекта

![GitHub stars](https://img.shields.io/github/stars/ColinsWey/inventory-system?style=social)
![GitHub forks](https://img.shields.io/github/forks/ColinsWey/inventory-system?style=social)
![GitHub issues](https://img.shields.io/github/issues/ColinsWey/inventory-system)
![GitHub pull requests](https://img.shields.io/github/issues-pr/ColinsWey/inventory-system)

---

**Разработано с ❤️ командой разработчиков** 