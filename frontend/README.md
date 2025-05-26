# Frontend - Inventory Management System

Веб-интерфейс системы управления товарными остатками, построенный на React + TypeScript + Tailwind CSS.

## 🚀 Технологии

- **React 18** - UI фреймворк
- **TypeScript** - статическая типизация  
- **Tailwind CSS** - CSS фреймворк
- **React Query** - управление состоянием сервера
- **React Hook Form** - работа с формами
- **Chart.js** - графики и аналитика
- **Axios** - HTTP клиент
- **React Router** - роутинг
- **Zustand** - локальное состояние
- **Date-fns** - работа с датами

## 📁 Структура проекта

```
frontend/
├── public/               # Статические файлы
├── src/
│   ├── api/             # API клиенты
│   │   ├── client.ts    # Базовый HTTP клиент
│   │   ├── salesApi.ts  # API продаж
│   │   └── analyticsApi.ts # API аналитики
│   ├── components/      # React компоненты
│   │   ├── ui/          # Базовые UI компоненты
│   │   ├── auth/        # Компоненты авторизации
│   │   ├── layout/      # Лэйаут компоненты
│   │   ├── sales/       # Компоненты продаж
│   │   └── ...
│   ├── contexts/        # React контексты
│   ├── hooks/           # Кастомные хуки
│   ├── pages/           # Страницы приложения
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты
│   ├── App.tsx          # Главный компонент
│   └── index.tsx        # Точка входа
├── Dockerfile           # Docker конфигурация
├── nginx.conf           # Nginx конфигурация
├── package.json         # Зависимости и скрипты
└── tailwind.config.js   # Tailwind настройки
```

## 📋 Основные функции

### 🏠 Dashboard
- KPI метрики системы
- Графики продаж и остатков
- Уведомления о низких остатках
- Быстрые действия

### 📦 Управление товарами
- Каталог товаров с фильтрацией
- Создание/редактирование товаров
- Управление категориями
- Загрузка изображений

### 💰 Продажи
- Регистрация продаж
- История продаж с фильтрами
- Аналитика продаж
- Экспорт данных

### 📊 Аналитика
- ABC-анализ товаров
- Графики динамики продаж
- Отчеты по категориям
- Прогнозирование спроса

### 🏪 Складские операции
- Приход/расход товаров
- Инвентаризация
- Движения товаров
- Уровни остатков

### ⚙️ Административные функции
- Управление пользователями
- Настройки системы
- Логи операций
- Интеграции

## 🛠 Установка и запуск

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start

# Сборка для production
npm run build

# Линтинг
npm run lint

# Форматирование кода
npm run format
```

### Docker

```bash
# Сборка Docker образа
docker build -t inventory-frontend .

# Запуск контейнера
docker run -p 3000:80 inventory-frontend
```

### Docker Compose (с backend)

```bash
# Запуск всей системы
docker-compose up -d

# Только frontend + nginx
docker-compose up frontend
```

## 🌐 API Интеграция

Frontend интегрирован со всеми backend endpoints:

- **Аутентификация**: `/auth/login`, `/auth/refresh`
- **Товары**: `/products/*` - CRUD операции
- **Продажи**: `/sales/*` - управление продажами
- **Аналитика**: `/analytics/*` - отчеты и графики
- **Склад**: `/inventory/*` - складские операции
- **Прогнозы**: `/forecasts/*` - прогнозирование

### Конфигурация API

```typescript
// src/api/client.ts
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
```

## 🎨 UI Компоненты

### Базовые компоненты
- **Button** - универсальные кнопки
- **Modal** - модальные окна
- **LoadingSpinner** - индикаторы загрузки
- **ErrorMessage** - отображение ошибок
- **Pagination** - пагинация списков

### Специализированные компоненты
- **SaleForm** - форма создания продажи
- **SaleFilters** - фильтры продаж
- **DateRangePicker** - выбор диапазона дат
- **ProductCard** - карточка товара
- **AnalyticsChart** - графики аналитики

## 📱 Responsive Design

Приложение адаптировано для всех устройств:
- **Desktop**: полный функционал
- **Tablet**: адаптированные таблицы и формы
- **Mobile**: мобильное меню и упрощенный интерфейс

## 🔐 Аутентификация

- JWT токены для авторизации
- Автоматическое обновление токенов
- Защищенные маршруты
- Роли пользователей (admin, manager, user)

## 📈 Производительность

- Code splitting по маршрутам
- Lazy loading компонентов
- Оптимизация изображений
- Кэширование API запросов
- Gzip сжатие (nginx)

## 🔧 Разработка

### Добавление новой страницы

```typescript
// 1. Создать компонент страницы
// src/pages/NewPage.tsx
const NewPage: React.FC = () => {
  return <div>New Page</div>;
};

// 2. Добавить маршрут в App.tsx
<Route path="/new" element={<NewPage />} />

// 3. Добавить ссылку в навигацию
// src/components/layout/Sidebar.tsx
```

### Добавление нового API endpoint

```typescript
// 1. Создать типы в src/types/
export interface NewEntity {
  id: string;
  name: string;
}

// 2. Создать API функции в src/api/
export const newApi = {
  async getAll(): Promise<NewEntity[]> {
    const response = await apiClient.get('/new');
    return response.data;
  }
};

// 3. Использовать в компоненте
const { data } = useQuery({
  queryKey: ['new'],
  queryFn: newApi.getAll
});
```

## 🎯 TODO / Roadmap

- [ ] Офлайн режим (PWA)
- [ ] Push уведомления
- [ ] Темная тема
- [ ] Интернационализация (i18n)
- [ ] Unit тесты (Jest)
- [ ] E2E тесты (Cypress)
- [ ] Storybook для компонентов

## 🐛 Отладка

### Типичные проблемы

1. **CORS ошибки**: проверить настройки backend
2. **401 ошибки**: проблемы с токенами
3. **Не загружаются данные**: проверить network tab

### Логирование

```typescript
// API клиент логирует все запросы
// React Query DevTools доступны в development
```

## 🚀 Деплой

### Production сборка

```bash
npm run build
# Статические файлы в папке build/
```

### Nginx конфигурация

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    
    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://backend:8000;
    }
}
```

## 📞 Поддержка

Для вопросов по frontend части системы обращайтесь к разработчикам или создавайте issues в репозитории.

---

**Inventory Management System Frontend v1.0.0**  
Современный веб-интерфейс для управления товарными остатками 