'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProductCardSkeleton } from '@/components/SkeletonLoader';
import { showToast } from '@/components/Toast';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [godownProducts, setGodownProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadShopStock();
    loadGodownStock();
  }, []);

  const loadShopStock = async () => {
    try {
      setLoading(true);
      const response = await apiService.getShopStock();
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading shop stock:', error);
      showToast('Failed to load shop stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGodownStock = async () => {
    try {
      const response = await apiService.getGodownStockWithQuantity();
      setGodownProducts(response.data || []);
    } catch (error) {
      console.error('Error loading godown stock:', error);
      showToast('Failed to load godown stock', 'error');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) return;

    if (transferQuantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (transferQuantity > (selectedProduct.godownStock || 0)) {
      setError('Insufficient stock in godown');
      return;
    }

    try {
      await apiService.transferStockToShop({
        productId: selectedProduct.id,
        quantity: transferQuantity,
      });
      showToast(`Successfully transferred ${transferQuantity} units to shop`, 'success');
      setShowTransferModal(false);
      setSelectedProduct(null);
      setTransferQuantity(1);
      loadShopStock();
      loadGodownStock();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to transfer stock';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const openTransferModal = (product: Product) => {
    setSelectedProduct(product);
    setTransferQuantity(1);
    setError('');
    setShowTransferModal(true);
  };

  const filteredGodownProducts = godownProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShopProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop Stock Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Transfer stock from godown to shop
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
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

          {/* Available in Godown */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Available in Godown
              </h2>
              <span className="text-sm text-gray-600">
                {filteredGodownProducts.length} products
              </span>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredGodownProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                <span className="text-5xl mb-3 block">🏭</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No products available
                </h3>
                <p className="text-sm text-gray-600">
                  {searchQuery
                    ? 'No products match your search'
                    : 'No products available in godown'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGodownProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-200"
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Available Stock</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {product.godownStock || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Unit Price</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {product.unitPrice.toFixed(2)} TK
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openTransferModal(product)}
                      disabled={(product.godownStock || 0) === 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                    >
                      Transfer to Shop
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shop Stock */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Shop Stock
              </h2>
              <span className="text-sm text-gray-600">
                {filteredShopProducts.length} products
              </span>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredShopProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                <span className="text-5xl mb-3 block">🏪</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No products in shop
                </h3>
                <p className="text-sm text-gray-600">
                  {searchQuery
                    ? 'No products match your search'
                    : 'Transfer products from godown to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShopProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-200"
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Shop Stock</span>
                        <span className="text-xl font-bold text-purple-600">
                          {product.shopStock || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Godown Stock</span>
                        <span className="text-lg font-semibold text-blue-600">
                          {product.godownStock || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-500">Unit Price</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {product.unitPrice.toFixed(2)} TK
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transfer Modal */}
          {showTransferModal && selectedProduct && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={() => setShowTransferModal(false)}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <form onSubmit={handleTransfer}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          Transfer Stock to Shop
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowTransferModal(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          ✕
                        </button>
                      </div>
                      {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Product</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedProduct.name}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">
                            Available in Godown
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedProduct.godownStock || 0} units
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity to Transfer *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={selectedProduct.godownStock || 0}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                            value={transferQuantity}
                            onChange={(e) =>
                              setTransferQuantity(parseInt(e.target.value) || 1)
                            }
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Maximum: {selectedProduct.godownStock || 0} units
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Transfer Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTransferModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
