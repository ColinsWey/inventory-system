import React, { useState } from 'react';
import { 
  ProductList, 
  ProductCard, 
  ProductGrid,
  CategoryTree, 
  ForecastChart, 
  ImportButton,
  ColorIndicator,
  ColorIndicatorWithLabel,
  ColorProgressBar,
  StatusCard
} from '../components/products';
import { Product, Category } from '../types';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

// Демо данные
const demoProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    sku: 'IPH15PRO',
    description: 'Флагманский смартфон Apple с чипом A17 Pro',
    category: { id: '1', name: 'Смартфоны', created_at: '', updated_at: '' },
    unit_price: 89990,
    cost_price: 65000,
    unit_of_measure: 'шт',
    min_stock_level: 10,
    max_stock_level: 100,
    current_stock: 25,
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  },
  {
    id: '2',
    name: 'MacBook Air M2',
    sku: 'MBA-M2-13',
    description: 'Ультрабук Apple с чипом M2',
    category: { id: '2', name: 'Ноутбуки', created_at: '', updated_at: '' },
    unit_price: 129990,
    cost_price: 95000,
    unit_of_measure: 'шт',
    min_stock_level: 5,
    max_stock_level: 50,
    current_stock: 3,
    status: 'active',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-18T12:00:00Z'
  },
  {
    id: '3',
    name: 'AirPods Pro 2',
    sku: 'APP2-USB-C',
    description: 'Беспроводные наушники с активным шумоподавлением',
    category: { id: '3', name: 'Аксессуары', created_at: '', updated_at: '' },
    unit_price: 24990,
    cost_price: 18000,
    unit_of_measure: 'шт',
    min_stock_level: 20,
    max_stock_level: 200,
    current_stock: 0,
    status: 'active',
    created_at: '2024-01-05T14:00:00Z',
    updated_at: '2024-01-22T16:45:00Z'
  }
];

const demoCategories: Category[] = [
  {
    id: '1',
    name: 'Электроника',
    description: 'Электронные устройства и гаджеты',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Смартфоны',
    description: 'Мобильные телефоны и смартфоны',
    parent_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Ноутбуки',
    description: 'Портативные компьютеры',
    parent_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Аксессуары',
    description: 'Дополнительные аксессуары',
    parent_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'Одежда',
    description: 'Одежда и обувь',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const demoForecastData = [
  {
    date: '2024-01-01',
    actual: 45,
    predicted: 42,
    confidence: { lower: 38, upper: 46 },
    trend: 'up' as const
  },
  {
    date: '2024-01-02',
    actual: 52,
    predicted: 48,
    confidence: { lower: 44, upper: 52 },
    trend: 'up' as const
  },
  {
    date: '2024-01-03',
    actual: 38,
    predicted: 41,
    confidence: { lower: 37, upper: 45 },
    trend: 'down' as const
  },
  {
    date: '2024-01-04',
    predicted: 55,
    confidence: { lower: 50, upper: 60 },
    trend: 'up' as const
  },
  {
    date: '2024-01-05',
    predicted: 62,
    confidence: { lower: 56, upper: 68 },
    trend: 'up' as const
  }
];

const ComponentsDemo: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleImport = async (source: string, file?: File) => {
    console.log('Демо импорт:', source, file);
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Демонстрация компонентов
        </h1>
        <p className="text-gray-600">
          Все созданные компоненты для работы с товарами в современном дизайне
        </p>
      </div>

      {/* Цветовые индикаторы */}
      <Card>
        <CardHeader>
          <CardTitle>Цветовые индикаторы статуса</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Базовые индикаторы */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Базовые индикаторы</h4>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <ColorIndicator current={0} min={10} />
                  <span className="text-sm">Критично (0)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ColorIndicator current={5} min={10} />
                  <span className="text-sm">Мало (5)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ColorIndicator current={50} min={10} max={100} />
                  <span className="text-sm">Достаточно (50)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ColorIndicator current={120} min={10} max={100} />
                  <span className="text-sm">Избыток (120)</span>
                </div>
              </div>
            </div>

            {/* Индикаторы с подписями */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">С подписями</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorIndicatorWithLabel current={0} min={10} />
                <ColorIndicatorWithLabel current={5} min={10} />
                <ColorIndicatorWithLabel current={50} min={10} max={100} showPercentage />
                <ColorIndicatorWithLabel current={120} min={10} max={100} showPercentage />
              </div>
            </div>

            {/* Прогресс-бары */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Прогресс-бары</h4>
              <div className="space-y-4">
                <ColorProgressBar current={25} min={10} max={100} />
                <ColorProgressBar current={5} min={10} max={100} />
                <ColorProgressBar current={0} min={10} max={100} />
              </div>
            </div>

            {/* Статусные карточки */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Статусные карточки</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard
                  title="iPhone 15 Pro"
                  current={25}
                  min={10}
                  max={100}
                  trend={{ value: 15, direction: 'up' }}
                />
                <StatusCard
                  title="MacBook Air M2"
                  current={3}
                  min={5}
                  max={50}
                  trend={{ value: 8, direction: 'down' }}
                />
                <StatusCard
                  title="AirPods Pro 2"
                  current={0}
                  min={20}
                  max={200}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список товаров */}
      <Card>
        <CardHeader>
          <CardTitle>Список товаров (таблица)</CardTitle>
        </CardHeader>
        <CardContent padding="none">
          <ProductList
            products={demoProducts}
            selectedIds={selectedProducts}
            onSelect={setSelectedProducts}
            onEdit={(product) => console.log('Редактирование:', product)}
            onDelete={(ids) => console.log('Удаление:', ids)}
            onExport={() => console.log('Экспорт')}
          />
        </CardContent>
      </Card>

      {/* Сетка товаров */}
      <Card>
        <CardHeader>
          <CardTitle>Сетка товаров (карточки)</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductGrid
            products={demoProducts}
            variant="default"
            onEdit={(product) => console.log('Редактирование:', product)}
            onDelete={(product) => console.log('Удаление:', product)}
            onView={(product) => console.log('Просмотр:', product)}
          />
        </CardContent>
      </Card>

      {/* Дерево категорий */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTree
          categories={demoCategories}
          selectedId={selectedCategory}
          onSelect={(category) => setSelectedCategory(category.id)}
          onAdd={(parentId) => console.log('Добавление категории:', parentId)}
          onEdit={(category) => console.log('Редактирование категории:', category)}
          onDelete={(category) => console.log('Удаление категории:', category)}
          variant="tree"
        />

        <CategoryTree
          categories={demoCategories}
          selectedId={selectedCategory}
          onSelect={(category) => setSelectedCategory(category.id)}
          onAdd={(parentId) => console.log('Добавление категории:', parentId)}
          onEdit={(category) => console.log('Редактирование категории:', category)}
          onDelete={(category) => console.log('Удаление категории:', category)}
          variant="grid"
        />
      </div>

      {/* График прогнозирования */}
      <ForecastChart
        data={demoForecastData}
        title="Прогноз продаж iPhone 15 Pro"
        productName="iPhone 15 Pro"
        period="30d"
        onPeriodChange={(period) => console.log('Изменение периода:', period)}
        showConfidence={true}
        showTrend={true}
      />

      {/* Кнопки импорта */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Стандартный импорт</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportButton
              variant="default"
              onImport={handleImport}
              onConfigure={(source) => console.log('Настройка:', source)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Компактный импорт</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportButton
              variant="compact"
              onImport={handleImport}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dropdown импорт</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportButton
              variant="dropdown"
              onImport={handleImport}
              onConfigure={(source) => console.log('Настройка:', source)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Детальная карточка товара */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная карточка товара</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductCard
            product={demoProducts[0]}
            salesData={{
              labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май'],
              sales: [45, 52, 38, 65, 72],
              revenue: [4050000, 4680000, 3420000, 5850000, 6480000]
            }}
            onEdit={(product) => console.log('Редактирование:', product)}
            onDelete={(product) => console.log('Удаление:', product)}
            onView={(product) => console.log('Просмотр:', product)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ComponentsDemo; 