'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProductCardSkeleton } from '@/components/SkeletonLoader';
import { showToast } from '@/components/Toast';

export default function GodownPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStockOnly, setShowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');

  useEffect(() => {
    loadGodownStock();
  }, [showStockOnly]);

  const loadGodownStock = async () => {
    try {
      setLoading(true);
      const response = showStockOnly
        ? await apiService.getGodownStockWithQuantity()
        : await apiService.getGodownStock();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading godown stock:', error);
      showToast('Failed to load godown stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'stock':
          return (b.godownStock || 0) - (a.godownStock || 0);
        case 'price':
          return b.unitPrice - a.unitPrice;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchQuery, sortBy]);

  const totalStock = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.godownStock || 0), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => (p.godownStock || 0) < 10);
  }, [products]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Godown Stock</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and monitor your godown inventory
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-600 mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'price')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="stock">Sort by Stock</option>
                  <option value="price">Sort by Price</option>
                </select>
                <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={showStockOnly}
                    onChange={(e) => {
                      setShowStockOnly(e.target.checked);
                      setLoading(true);
                    }}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 mr-2"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredAndSortedProducts.length} of {products.length} products
            </div>
          </div>

          {/* Low Stock Warning */}
          {lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Low Stock Alert
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} have stock below 10 units
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">🏭</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'No products in godown'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedProducts.map((product) => {
                const stock = product.godownStock || 0;
                const isLowStock = stock < 10;
                const stockPercentage = product.stock > 0 
                  ? (stock / product.stock) * 100 
                  : 0;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 border-2 ${
                      isLowStock ? 'border-yellow-300' : 'border-gray-200'
                    }`}
                  >
                    {product.imageUrl && (
                      <div className="relative h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {product.name}
                      </h3>
                      {isLowStock && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                          Low Stock
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    {/* Stock Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Godown Stock</span>
                        <span className={`text-lg font-bold ${
                          isLowStock ? 'text-yellow-600' : 'text-indigo-600'
                        }`}>
                          {stock}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isLowStock 
                              ? 'bg-yellow-500' 
                              : stockPercentage > 50 
                                ? 'bg-green-500' 
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Initial Stock: {product.stock}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Unit Price</span>
                        <span className="font-semibold text-gray-900">
                          {product.unitPrice.toFixed(2)} TK
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cost Price</span>
                        <span className="font-semibold text-gray-700">
                          {product.costPrice.toFixed(2)} TK
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Profit</span>
                        <span className="font-semibold text-green-600">
                          {product.profitPerUnit.toFixed(2)} TK
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Shop Stock</span>
                        <span className="font-semibold text-purple-600">
                          {product.shopStock || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
