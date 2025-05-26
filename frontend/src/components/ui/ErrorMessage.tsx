import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  message: string;
  className?: string;
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = '',
  showIcon = true,
}) => {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        {showIcon && (
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        )}
        <p className="text-red-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default ErrorMessage; 