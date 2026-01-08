import React from 'react';

export interface Category {
  id: number;
  name: string;
  image?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId?: number;
  onCategorySelect: (categoryId?: number) => void;
  loading?: boolean;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategoryId,
  onCategorySelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-12 w-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
      <button
        onClick={() => onCategorySelect(undefined)}
        className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
          activeCategoryId === undefined
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All Items
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
            activeCategoryId === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};
