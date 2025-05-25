import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mt-4">
          Страница не найдена
        </h2>
        <p className="text-gray-600 mt-2 mb-8">
          Запрашиваемая страница не существует или была перемещена
        </p>
        <Button as={Link} to="/">
          Вернуться на главную
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage; 