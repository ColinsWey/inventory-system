import React from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const InventoryList: React.FC = () => {
  const mockItems = [
    {
      id: 1,
      name: 'Товар 1',
      sku: 'SKU001',
      category: 'Категория А',
      quantity: 50,
      minQuantity: 10,
      unitPrice: 100.00,
      status: 'in_stock'
    },
    {
      id: 2,
      name: 'Товар 2',
      sku: 'SKU002',
      category: 'Категория Б',
      quantity: 5,
      minQuantity: 10,
      unitPrice: 200.00,
      status: 'low_stock'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <span className="badge-success">В наличии</span>;
      case 'low_stock':
        return <span className="badge-warning">Мало</span>;
      case 'out_of_stock':
        return <span className="badge-danger">Нет в наличии</span>;
      default:
        return <span className="badge-gray">Неизвестно</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Товарные остатки
        </h1>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить товар
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск товаров..."
                  className="form-input pl-10"
                />
              </div>
            </div>
            <select className="form-input w-48">
              <option value="">Все категории</option>
              <option value="category_a">Категория А</option>
              <option value="category_b">Категория Б</option>
            </select>
            <select className="form-input w-48">
              <option value="">Все статусы</option>
              <option value="in_stock">В наличии</option>
              <option value="low_stock">Мало</option>
              <option value="out_of_stock">Нет в наличии</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица товаров */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Название</th>
                <th className="table-header-cell">SKU</th>
                <th className="table-header-cell">Категория</th>
                <th className="table-header-cell">Количество</th>
                <th className="table-header-cell">Цена</th>
                <th className="table-header-cell">Статус</th>
                <th className="table-header-cell">Действия</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {mockItems.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="table-cell">
                    <span className="text-gray-500">{item.sku}</span>
                  </td>
                  <td className="table-cell">{item.category}</td>
                  <td className="table-cell">
                    <div className="flex items-center">
                      <span className={`font-medium ${
                        item.quantity <= item.minQuantity 
                          ? 'text-warning-600' 
                          : 'text-gray-900'
                      }`}>
                        {item.quantity}
                      </span>
                      <span className="text-gray-400 ml-1">
                        / мин. {item.minQuantity}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">₽{item.unitPrice.toFixed(2)}</td>
                  <td className="table-cell">{getStatusBadge(item.status)}</td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-900 text-sm">
                        Редактировать
                      </button>
                      <button className="text-danger-600 hover:text-danger-900 text-sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList; 