import React, { useState, useMemo } from 'react';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  PlusIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Product, ProductFilters } from '../../types';
import { formatCurrency, formatNumber, cn } from '../../utils';
import ColorIndicator from './ColorIndicator';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onSort?: (field: keyof Product, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: ProductFilters) => void;
  onSelect?: (productIds: string[]) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productIds: string[]) => void;
  onExport?: () => void;
  selectedIds?: string[];
}

type SortField = keyof Product;
type SortDirection = 'asc' | 'desc';

const ProductList: React.FC<ProductListProps> = ({
  products,
  loading = false,
  onSort,
  onFilter,
  onSelect,
  onEdit,
  onDelete,
  onExport,
  selectedIds = []
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Фильтрация и сортировка
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || product.status === statusFilter;
      const matchesCategory = !categoryFilter || product.category?.id === categoryFilter;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = product.current_stock <= (product.min_stock_level || 0);
      } else if (stockFilter === 'out') {
        matchesStock = product.current_stock === 0;
      } else if (stockFilter === 'normal') {
        matchesStock = product.current_stock > (product.min_stock_level || 0);
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesStock;
    });

    // Сортировка
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Обработка вложенных объектов
      if (sortField === 'category') {
        aValue = a.category?.name || '';
        bValue = b.category?.name || '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [products, searchQuery, statusFilter, categoryFilter, stockFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  };

  const handleSelectAll = () => {
    const allIds = filteredAndSortedProducts.map(p => p.id);
    const isAllSelected = allIds.every(id => selectedIds.includes(id));
    onSelect?.(isAllSelected ? [] : allIds);
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = selectedIds.includes(productId)
      ? selectedIds.filter(id => id !== productId)
      : [...selectedIds, productId];
    onSelect?.(newSelected);
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-600 transition-colors"
    >
      <span>{children}</span>
      {sortField === field && (
        sortDirection === 'asc' 
          ? <ChevronUpIcon className="h-4 w-4" />
          : <ChevronDownIcon className="h-4 w-4" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Заголовок и действия */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Товары ({filteredAndSortedProducts.length})
            </h3>
            {selectedIds.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Выбрано: {selectedIds.length}
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDelete?.(selectedIds)}
                >
                  Удалить
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<FunnelIcon className="h-4 w-4" />}
            >
              Фильтры
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              Экспорт
            </Button>
            <Button
              size="sm"
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Добавить
            </Button>
          </div>
        </div>

        {/* Поиск */}
        <div className="mt-4">
          <Input
            placeholder="Поиск по названию или SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            className="max-w-md"
          />
        </div>

        {/* Фильтры */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
              <option value="discontinued">Снятые с производства</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Все остатки</option>
              <option value="normal">В наличии</option>
              <option value="low">Низкий остаток</option>
              <option value="out">Нет в наличии</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">Все категории</option>
              {/* Здесь будут категории из API */}
            </select>
          </div>
        )}
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredAndSortedProducts.length > 0 && 
                    filteredAndSortedProducts.every(p => selectedIds.includes(p.id))}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="name">Товар</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="sku">SKU</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="category">Категория</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="unit_price">Цена</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="current_stock">Остаток</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="status">Статус</SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedProducts.map((product) => (
              <tr 
                key={product.id} 
                className={cn(
                  "hover:bg-gray-50 transition-colors",
                  selectedIds.includes(product.id) && "bg-blue-50"
                )}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.category?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(product.unit_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <ColorIndicator
                      current={product.current_stock}
                      min={product.min_stock_level || 0}
                      max={product.max_stock_level}
                    />
                    <span className="text-sm text-gray-900">
                      {formatNumber(product.current_stock)} {product.unit_of_measure}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                    product.status === 'active' && "bg-green-100 text-green-800",
                    product.status === 'inactive' && "bg-yellow-100 text-yellow-800",
                    product.status === 'discontinued' && "bg-red-100 text-red-800"
                  )}>
                    {product.status === 'active' && 'Активный'}
                    {product.status === 'inactive' && 'Неактивный'}
                    {product.status === 'discontinued' && 'Снят с производства'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => onEdit?.(product)}
                                className={cn(
                                  active ? 'bg-gray-100' : '',
                                  'block w-full text-left px-4 py-2 text-sm text-gray-700'
                                )}
                              >
                                Редактировать
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => onDelete?.([product.id])}
                                className={cn(
                                  active ? 'bg-gray-100' : '',
                                  'block w-full text-left px-4 py-2 text-sm text-red-700'
                                )}
                              >
                                Удалить
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Товары не найдены</h3>
            <p className="mt-1 text-sm text-gray-500">
              Попробуйте изменить параметры поиска или фильтры
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList; 