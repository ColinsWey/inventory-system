import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useProducts } from '../hooks/useProducts';
import { formatCurrency, getProductStatusColor, getProductStatusText, cn } from '../utils';
import { ProductList, ProductGrid, ImportButton } from '../components/products';

const ProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data, isLoading, error } = useProducts(currentPage, 20);

  const handleImport = async (source: string, file?: File) => {
    console.log('Импорт из источника:', source, file);
    // Здесь будет логика импорта
  };

  const handleEdit = (product: any) => {
    console.log('Редактирование товара:', product);
    // Здесь будет логика редактирования
  };

  const handleDelete = (productIds: string[]) => {
    console.log('Удаление товаров:', productIds);
    // Здесь будет логика удаления
  };

  const handleExport = () => {
    console.log('Экспорт товаров');
    // Здесь будет логика экспорта
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-red-800">
          Ошибка загрузки товаров
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
          <p className="mt-1 text-sm text-gray-600">
            Управление товарными позициями
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Переключатель вида */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'table' 
                  ? "bg-white shadow-sm text-gray-900" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <TableCellsIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === 'grid' 
                  ? "bg-white shadow-sm text-gray-900" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
          </div>

          <ImportButton
            variant="compact"
            onImport={handleImport}
          />
          
          <Button
            as={Link}
            to="/products/new"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Добавить товар
          </Button>
        </div>
      </div>

      {/* Содержимое */}
      {viewMode === 'table' ? (
        <ProductList
          products={data?.data || []}
          loading={isLoading}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onExport={handleExport}
        />
      ) : (
        <ProductGrid
          products={data?.data || []}
          loading={isLoading}
          variant="default"
          onEdit={handleEdit}
          onDelete={(product) => handleDelete([product.id])}
          onView={(product) => console.log('Просмотр товара:', product)}
        />
      )}

      {/* Пагинация */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Показано {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, data.total)} из {data.total} товаров
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Предыдущая
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === data.total_pages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Следующая
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage; 