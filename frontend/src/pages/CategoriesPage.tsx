import React from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const CategoriesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Категории</h1>
        <p className="mt-1 text-sm text-gray-600">
          Управление категориями товаров
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список категорий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">
              Страница в разработке
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoriesPage; 