import React, { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

interface SaleFiltersProps {
  onFilterChange: (filters: any) => void;
}

const SaleFilters: React.FC<SaleFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    customer_name: '',
    date_from: '',
    date_to: '',
    product_id: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      customer_name: '',
      date_from: '',
      date_to: '',
      product_id: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <XMarkIcon className="h-4 w-4 mr-1" />
          Очистить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Поиск по клиенту */}
        <div>
          <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
            Клиент
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              id="customer_name"
              value={filters.customer_name}
              onChange={(e) => handleFilterChange('customer_name', e.target.value)}
              className="mt-1 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Поиск по имени..."
            />
          </div>
        </div>

        {/* Дата от */}
        <div>
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700">
            Дата от
          </label>
          <input
            type="date"
            id="date_from"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Дата до */}
        <div>
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700">
            Дата до
          </label>
          <input
            type="date"
            id="date_to"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Товар */}
        <div>
          <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
            Товар
          </label>
          <select
            id="product_id"
            value={filters.product_id}
            onChange={(e) => handleFilterChange('product_id', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Все товары</option>
            {/* Здесь будут загружаться товары из API */}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SaleFilters; 