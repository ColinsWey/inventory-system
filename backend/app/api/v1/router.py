"""
Главный роутер для API v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, products, categories, salesdrive

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
    salesdrive.router,
    prefix="/integration",
    tags=["Интеграция с SalesDrive"]
)

# Добавим позже:
# api_router.include_router(
#     import_endpoints.router,
#     prefix="/import",
#     tags=["Импорт"]
# )

# api_router.include_router(
#     forecast.router,
#     prefix="/forecast",
#     tags=["Прогнозирование"]
# ) 