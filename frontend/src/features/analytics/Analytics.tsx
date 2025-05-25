import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Аналитика и отчеты
        </h1>
      </div>

      {/* Фильтры периода */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div>
              <label className="form-label">Период с:</label>
              <input type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">По:</label>
              <input type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Категория:</label>
              <select className="form-input">
                <option value="">Все категории</option>
                <option value="category_a">Категория А</option>
                <option value="category_b">Категория Б</option>
              </select>
            </div>
            <button className="btn-primary mt-6">
              Применить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Оборачиваемость
            </h3>
            <div className="text-3xl font-bold text-primary-600">2.5</div>
            <p className="text-sm text-gray-500 mt-1">
              раза в месяц
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Средний остаток
            </h3>
            <div className="text-3xl font-bold text-success-600">33.3</div>
            <p className="text-sm text-gray-500 mt-1">
              единиц на товар
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Общая стоимость
            </h3>
            <div className="text-3xl font-bold text-warning-600">₽50,000</div>
            <p className="text-sm text-gray-500 mt-1">
              всех остатков
            </p>
          </div>
        </div>
      </div>

      {/* Распределение по категориям */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Распределение по категориям
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Категория А</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                  <span className="text-sm text-gray-500">45 товаров</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Категория Б</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-success-600 h-2 rounded-full" style={{width: '32%'}}></div>
                  </div>
                  <span className="text-sm text-gray-500">32 товара</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Категория В</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-warning-600 h-2 rounded-full" style={{width: '28%'}}></div>
                  </div>
                  <span className="text-sm text-gray-500">28 товаров</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Топ поставщики
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Поставщик 1</span>
                <span className="text-sm text-gray-500">60 товаров</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Поставщик 2</span>
                <span className="text-sm text-gray-500">45 товаров</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Поставщик 3</span>
                <span className="text-sm text-gray-500">45 товаров</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки экспорта */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Экспорт отчетов
          </h3>
          <div className="flex space-x-4">
            <button className="btn-outline">
              Экспорт в Excel
            </button>
            <button className="btn-outline">
              Экспорт в PDF
            </button>
            <button className="btn-outline">
              Сводный отчет
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 