import React, { useState, useMemo } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Category } from '../../types';
import { cn } from '../../utils';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CategoryTreeProps {
  categories: Category[];
  selectedId?: string;
  onSelect?: (category: Category) => void;
  onAdd?: (parentId?: string) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  searchable?: boolean;
  editable?: boolean;
  variant?: 'tree' | 'grid';
  className?: string;
}

interface TreeNode extends Category {
  children: TreeNode[];
  level: number;
  isExpanded?: boolean;
}

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  searchable = true,
  editable = true,
  variant = 'tree',
  className
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>(variant);

  // Построение дерева категорий
  const categoryTree = useMemo(() => {
    const buildTree = (parentId?: string, level = 0): TreeNode[] => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat,
          level,
          children: buildTree(cat.id, level + 1),
          isExpanded: expandedIds.has(cat.id)
        }));
    };

    return buildTree();
  }, [categories, expandedIds]);

  // Фильтрация по поиску
  const filteredTree = useMemo(() => {
    if (!searchQuery) return categoryTree;

    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce((acc: TreeNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const filteredChildren = filterTree(node.children);
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            isExpanded: true // Автоматически раскрываем при поиске
          });
        }
        
        return acc;
      }, []);
    };

    return filterTree(categoryTree);
  }, [categoryTree, searchQuery]);

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        collectIds(node.children);
      });
    };
    collectIds(categoryTree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Компонент узла дерева
  const TreeNodeComponent: React.FC<{ node: TreeNode }> = ({ node }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id) || searchQuery !== '';
    const isSelected = selectedId === node.id;

    return (
      <div className="select-none">
        <div
          className={cn(
            "flex items-center py-2 px-3 rounded-lg cursor-pointer transition-all duration-150",
            "hover:bg-gray-50",
            isSelected && "bg-blue-50 border border-blue-200",
            node.level > 0 && "ml-6"
          )}
          style={{ paddingLeft: `${node.level * 24 + 12}px` }}
          onClick={() => onSelect?.(node)}
        >
          {/* Кнопка раскрытия */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleExpanded(node.id);
              }
            }}
            className={cn(
              "flex items-center justify-center w-5 h-5 mr-2 rounded transition-colors",
              hasChildren ? "hover:bg-gray-200" : "invisible"
            )}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDownIcon className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-3 w-3 text-gray-500" />
              )
            )}
          </button>

          {/* Иконка папки */}
          <div className="mr-3">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpenIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <FolderIcon className="h-5 w-5 text-blue-500" />
              )
            ) : (
              <div className="h-5 w-5 rounded bg-gray-300"></div>
            )}
          </div>

          {/* Название категории */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium truncate",
                  isSelected ? "text-blue-900" : "text-gray-900"
                )}>
                  {node.name}
                </p>
                {node.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {node.description}
                  </p>
                )}
              </div>

              {/* Меню действий */}
              {editable && (
                <Menu as="div" className="relative">
                  <Menu.Button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                  >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onAdd?.(node.id);
                              }}
                              className={cn(
                                active ? 'bg-gray-100' : '',
                                'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Добавить подкатегорию
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(node);
                              }}
                              className={cn(
                                active ? 'bg-gray-100' : '',
                                'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Редактировать
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(node);
                              }}
                              className={cn(
                                active ? 'bg-gray-100' : '',
                                'flex items-center w-full text-left px-4 py-2 text-sm text-red-700'
                              )}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Удалить
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}
            </div>
          </div>
        </div>

        {/* Дочерние элементы */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children.map(child => (
              <TreeNodeComponent key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Компонент карточки категории для сеточного вида
  const CategoryCard: React.FC<{ category: Category }> = ({ category }) => {
    const isSelected = selectedId === category.id;
    const childCount = categories.filter(c => c.parent_id === category.id).length;

    return (
      <div
        onClick={() => onSelect?.(category)}
        className={cn(
          "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
          "hover:shadow-md hover:border-gray-300",
          isSelected 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-200 bg-white"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn(
              "p-2 rounded-lg",
              childCount > 0 ? "bg-blue-100" : "bg-gray-100"
            )}>
              {childCount > 0 ? (
                <FolderIcon className="h-6 w-6 text-blue-600" />
              ) : (
                <div className="h-6 w-6 rounded bg-gray-400"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {category.description}
                </p>
              )}
              {childCount > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {childCount} подкатегорий
                </p>
              )}
            </div>
          </div>

          {editable && (
            <Menu as="div" className="relative">
              <Menu.Button className="p-1 rounded hover:bg-gray-200 transition-colors">
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
                          onClick={() => onAdd?.(category.id)}
                          className={cn(
                            active ? 'bg-gray-100' : '',
                            'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Добавить подкатегорию
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => onEdit?.(category)}
                          className={cn(
                            active ? 'bg-gray-100' : '',
                            'flex items-center w-full text-left px-4 py-2 text-sm text-gray-700'
                          )}
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Редактировать
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => onDelete?.(category)}
                          className={cn(
                            active ? 'bg-gray-100' : '',
                            'flex items-center w-full text-left px-4 py-2 text-sm text-red-700'
                          )}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Удалить
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {/* Заголовок и управление */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Категории ({categories.length})
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Переключатель вида */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === 'tree' 
                    ? "bg-white shadow-sm text-gray-900" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ListBulletIcon className="h-4 w-4" />
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

            {editable && (
              <Button
                size="sm"
                onClick={() => onAdd?.()}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Добавить
              </Button>
            )}
          </div>
        </div>

        {/* Поиск */}
        {searchable && (
          <div className="mb-4">
            <Input
              placeholder="Поиск категорий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {/* Управление деревом */}
        {viewMode === 'tree' && (
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" onClick={expandAll}>
              Развернуть все
            </Button>
            <Button size="sm" variant="ghost" onClick={collapseAll}>
              Свернуть все
            </Button>
          </div>
        )}
      </div>

      {/* Содержимое */}
      <div className="p-4">
        {viewMode === 'tree' ? (
          <div className="space-y-1">
            {filteredTree.length > 0 ? (
              filteredTree.map(node => (
                <TreeNodeComponent key={node.id} node={node} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>Категории не найдены</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              .filter(cat => 
                !searchQuery || 
                cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(category => (
                <CategoryCard key={category.id} category={category} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryTree; 