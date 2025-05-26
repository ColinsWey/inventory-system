import React from 'react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (range: { startDate: Date; endDate: Date }) => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    onChange({ startDate: newStartDate, endDate });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    onChange({ startDate, endDate: newEndDate });
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div>
        <label htmlFor="start-date" className="block text-xs font-medium text-gray-700">
          От
        </label>
        <input
          type="date"
          id="start-date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label htmlFor="end-date" className="block text-xs font-medium text-gray-700">
          До
        </label>
        <input
          type="date"
          id="end-date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>
  );
};

export default DateRangePicker; 