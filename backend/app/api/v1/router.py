"""
Главный роутер для API v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, products, categories, salesdrive, sales, forecasts
from app.features.analytics.router import router as analytics_router
from app.features.inventory.router import router as inventory_router
from app.features.integration.router import router as integration_router

# Создаем главный роутер
api_router = APIRouter()

# Подключаем роутеры эндпоинтов
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Авторизация"]
)

api_router.include_router(
    products.router,
    prefix="/products",
    tags=["Товары"]
)

api_router.include_router(
    categories.router,
    prefix="/categories",
    tags=["Категории"]
)

api_router.include_router(
    sales.router,
    prefix="/sales",
    tags=["Продажи"]
)

api_router.include_router(
    forecasts.router,
    prefix="/forecasts",
    tags=["Прогнозирование"]
)

api_router.include_router(
    salesdrive.router,
    prefix="/salesdrive",
    tags=["Интеграция с SalesDrive"]
)

# Подключаем роутеры features
api_router.include_router(
    analytics_router,
    prefix="/analytics",
    tags=["Аналитика и отчеты"]
)

api_router.include_router(
    inventory_router,
    prefix="/inventory",
    tags=["Управление остатками"]
)

api_router.include_router(
    integration_router,
    prefix="/integration",
    tags=["Интеграции"]
) 