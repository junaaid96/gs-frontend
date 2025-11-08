'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Shop, Product, ShopRequest, Godown, StockTransferRequest } from '@/types';
import { getUser, getShopId, isAdmin, isManager } from '@/utils/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import Link from 'next/link';
import Button from '@/components/Button';
import { Plus, X, Store, Package, ArrowRightLeft } from 'lucide-react';

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopStock, setShopStock] = useState<Product[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<ShopRequest>({
    name: '',
    address: '',
    contactNumber: '',
    territoryId: 0,
  });
  const [error, setError] = useState('');
  const [territories, setTerritories] = useState<any[]>([]);
  
  // Stock Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodown, setSelectedGodown] = useState<Godown | null>(null);
  const [godownStock, setGodownStock] = useState<Product[]>([]);
  const [loadingGodownStock, setLoadingGodownStock] = useState(false);
  const [transferForm, setTransferForm] = useState<StockTransferRequest>({
    productId: 0,
    quantity: 0,
    shopId: 0,
    godownId: 0,
  });
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [quantityError, setQuantityError] = useState<string>('');
  const [transferError, setTransferError] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadShops();
    const user = getUser();
    if (user?.shopId) {
      // If user is a salesman, automatically select their shop
      loadShopStock(user.shopId);
    }
    if (isAdmin() || isManager()) {
      loadTerritories();
      loadGodowns();
    }
  }, []);

  const loadTerritories = async () => {
    try {
      const response = await apiService.getTerritories();
      setTerritories(response.data || []);
      
      // For managers, auto-select their territory (they should only have one)
      const user = getUser();
      if (isManager() && user?.territoryId) {
        setFormData({ ...formData, territoryId: user.territoryId });
      } else if (response.data && response.data.length > 0 && !formData.territoryId) {
        // For admins, select first territory as default
        setFormData({ ...formData, territoryId: response.data[0].id });
      }
    } catch (error) {
      console.error('Error loading territories:', error);
    }
  };

  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await apiService.getShops();
      setShops(response.data || []);
      if (response.data && response.data.length > 0 && !getUser()?.shopId) {
        // Auto-select first shop if not a salesman
        setSelectedShop(response.data[0]);
        loadShopStock(response.data[0].id);
      } else if (response.data && response.data.length === 0) {
        // Empty list is valid - salesman may not have shop assigned yet
        setSelectedShop(null);
        setShopStock([]);
      }
    } catch (error: any) {
      console.error('Error loading shops:', error);
      // Only show error if it's not a 400 (which now means empty list)
      if (error.response?.status !== 400) {
        showToast('Failed to load shops', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadShopStock = async (shopId: number) => {
    try {
      setLoadingStock(true);
      const shop = shops.find(s => s.id === shopId) || selectedShop;
      if (shop) {
        setSelectedShop(shop);
      }
      const response = await apiService.getShopStockWithQuantity(shopId);
      setShopStock(response.data || []);
    } catch (error) {
      console.error('Error loading shop stock:', error);
      showToast('Failed to load shop stock', 'error');
    } finally {
      setLoadingStock(false);
    }
  };

  const loadGodowns = async () => {
    try {
      const response = await apiService.getGodowns();
      setGodowns(response.data || []);
    } catch (error) {
      console.error('Error loading godowns:', error);
      showToast('Failed to load godowns', 'error');
    }
  };

  const loadGodownStock = async (godownId: number) => {
    try {
      setLoadingGodownStock(true);
      const response = await apiService.getGodownStockWithQuantity(godownId);
      setGodownStock(response.data || []);
    } catch (error) {
      console.error('Error loading godown stock:', error);
      showToast('Failed to load godown stock', 'error');
      setGodownStock([]);
    } finally {
      setLoadingGodownStock(false);
    }
  };

  const handleOpenTransferModal = () => {
    if (!selectedShop) {
      showToast('Please select a shop first', 'error');
      return;
    }
    setTransferForm({
      productId: 0,
      quantity: 0,
      shopId: selectedShop.id,
      godownId: 0,
    });
    setQuantityInput('');
    setQuantityError('');
    setSelectedGodown(null);
    setGodownStock([]);
    setTransferError('');
    setShowTransferModal(true);
  };

  const handleGodownChange = (godownId: number) => {
    const godown = godowns.find(g => g.id === godownId);
    setSelectedGodown(godown || null);
    setTransferForm({ ...transferForm, godownId, productId: 0, quantity: 0 });
    setQuantityInput('');
    setQuantityError('');
    if (godownId > 0) {
      loadGodownStock(godownId);
    } else {
      setGodownStock([]);
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setQuantityError('');

    // Validation
    if (!transferForm.godownId || !transferForm.productId || !transferForm.shopId) {
      setTransferError('Please select a godown and product');
      return;
    }

    // Validate quantity input
    if (!quantityInput || quantityInput === '' || transferForm.quantity <= 0) {
      setQuantityError('Quantity is required and must be greater than 0');
      setTransferError('Please enter a valid quantity');
      return;
    }

    const selectedProduct = godownStock.find(p => p.id === transferForm.productId);
    if (selectedProduct && selectedProduct.godownStock !== undefined) {
      if (transferForm.quantity > selectedProduct.godownStock) {
        const errorMsg = `Quantity cannot exceed available stock: ${selectedProduct.godownStock}`;
        setQuantityError(errorMsg);
        setTransferError(errorMsg);
        return;
      }
    }

    setTransferring(true);

    try {

      await apiService.transferStockToShop(transferForm.shopId, transferForm);
      showToast('Stock transferred successfully', 'success');
      setShowTransferModal(false);
      
      // Reload shop stock and godown stock
      await loadShopStock(transferForm.shopId);
      if (transferForm.godownId) {
        await loadGodownStock(transferForm.godownId);
      }
      
      // Reset form
      setTransferForm({
        productId: 0,
        quantity: 0,
        shopId: selectedShop?.id || 0,
        godownId: 0,
      });
      setQuantityInput('');
      setQuantityError('');
      setSelectedGodown(null);
      setGodownStock([]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to transfer stock';
      setTransferError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setTransferring(false);
    }
  };

  const user = getUser();
  const isSalesman = user?.role === 'SALESMAN';
  const myShopId = user?.shopId;

  // Separate shops into "My Shop" and "Other Shops" for salesman
  const myShop = isSalesman && myShopId ? shops.find(s => s.id === myShopId) : null;
  const otherShops = isSalesman && myShopId ? shops.filter(s => s.id !== myShopId) : shops;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shops</h1>
              <p className="text-sm text-gray-600 mt-1">Manage shops and view stock</p>
            </div>
            {(isAdmin() || isManager()) && (
              <Button
                onClick={() => {
                  // Ensure territory is set when opening modal for managers
                  const user = getUser();
                  if (isManager() && user?.territoryId && formData.territoryId !== user.territoryId) {
                    setFormData({ ...formData, territoryId: user.territoryId });
                  }
                  setShowModal(true);
                }}
                icon={Plus}
                iconPosition="left"
              >
                Add Shop
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Shop List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Shops</h2>
                  
                  {/* My Shop Section for Salesman */}
                  {isSalesman && myShop && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
                        My Shop
                      </h3>
                      <button
                        onClick={() => loadShopStock(myShop.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedShop?.id === myShop.id
                            ? 'bg-indigo-50 border-2 border-indigo-500'
                            : 'bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{myShop.name}</p>
                          <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">My Shop</span>
                        </div>
                        {myShop.address && (
                          <p className="text-sm text-gray-600 mt-1">Address: {myShop.address}</p>
                        )}
                        {myShop.contactNumber && (
                          <p className="text-sm text-gray-600 mt-1">Contact: {myShop.contactNumber}</p>
                        )}
                        {myShop.territoryName && (
                          <p className="text-xs text-gray-500 mt-1">Territory: {myShop.territoryName}</p>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Other Shops Section */}
                  {(isSalesman && otherShops.length > 0) || (!isSalesman && shops.length > 0) ? (
                    <div>
                      {isSalesman && myShop && (
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                          Other Shops
                        </h3>
                      )}
                      <div className="space-y-2">
                        {(isSalesman ? otherShops : shops).map((shop) => (
                          <button
                            key={shop.id}
                            onClick={() => loadShopStock(shop.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedShop?.id === shop.id
                                ? 'bg-indigo-50 border-2 border-indigo-500'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            }`}
                          >
                            <p className="font-medium text-gray-900">{shop.name}</p>
                            {shop.address && (
                              <p className="text-sm text-gray-600 mt-1">Address: {shop.address}</p>
                            )}
                            {shop.contactNumber && (
                              <p className="text-sm text-gray-600 mt-1">Contact: {shop.contactNumber}</p>
                            )}
                            {shop.territoryName && (
                              <p className="text-xs text-gray-500 mt-1">Territory: {shop.territoryName}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  
                  {shops.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No shops available</p>
                  )}
                </div>
              </div>

              {/* Shop Stock */}
              <div className="lg:col-span-2">
                {selectedShop ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-xl font-semibold text-gray-900">
                              {selectedShop.name} - Stock
                            </h2>
                            {isSalesman && selectedShop.id === myShopId && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">My Shop</span>
                            )}
                          </div>
                          {selectedShop.address && (
                            <p className="text-sm text-gray-600">Address: {selectedShop.address}</p>
                          )}
                          {selectedShop.contactNumber && (
                            <p className="text-sm text-gray-600">Contact: {selectedShop.contactNumber}</p>
                          )}
                        </div>
                        {(isAdmin() || isManager()) && (
                          <Button
                            onClick={handleOpenTransferModal}
                            variant="success"
                            icon={ArrowRightLeft}
                            iconPosition="left"
                          >
                            Transfer Stock
                          </Button>
                        )}
                      </div>
                    </div>

                    {loadingStock ? (
                      <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                      </div>
                    ) : shopStock.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                        <span className="text-6xl mb-4 block">🏪</span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          No stock available
                        </h3>
                        <p className="text-gray-600">
                          This shop has no products in stock
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shopStock.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white rounded-lg shadow-md p-5 border border-gray-200"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {product.name}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Shop Stock</span>
                                <span className="text-xl font-bold text-purple-600">
                                  {product.shopStock || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Godown Stock</span>
                                <span className="text-lg font-semibold text-blue-600">
                                  {product.godownStock || 0}
                                </span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-gray-200">
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
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                    <span className="text-6xl mb-4 block">🏪</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Select a shop
                    </h3>
                    <p className="text-gray-600">
                      Choose a shop from the list to view its stock
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Shop Modal */}
          {showModal && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={() => setShowModal(false)}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                      setError('');
                      try {
                        // For managers, ensure territoryId is set from their user data
                        const user = getUser();
                        const shopData: ShopRequest = isManager() && user?.territoryId
                          ? { ...formData, territoryId: user.territoryId }
                          : formData;
                        
                        await apiService.createShop(shopData);
                        showToast('Shop created successfully', 'success');
                        setShowModal(false);
                        // Reset form - preserve territory for managers
                        const resetTerritoryId = isManager() && user?.territoryId 
                          ? user.territoryId 
                          : territories[0]?.id || 0;
                        setFormData({ name: '', address: '', contactNumber: '', territoryId: resetTerritoryId });
                        loadShops();
                    } catch (err: any) {
                      const errorMsg = err.response?.data?.message || 'Failed to create shop';
                      setError(errorMsg);
                      showToast(errorMsg, 'error');
                    }
                  }}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Create Shop</h3>
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Shop Name *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Territory *
                          </label>
                          {isManager() ? (
                            <div>
                              <input
                                type="text"
                                disabled
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 text-gray-600 cursor-not-allowed"
                                value={territories.find(t => t.id === formData.territoryId)?.name || 'Loading...'}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Managers can only create shops in their assigned territory
                              </p>
                            </div>
                          ) : (
                            <select
                              required
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={formData.territoryId}
                              onChange={(e) => setFormData({ ...formData, territoryId: Number(e.target.value) })}
                            >
                              <option value={0}>Select Territory</option>
                              {territories.map((territory) => (
                                <option key={territory.id} value={territory.id}>
                                  {territory.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.contactNumber}
                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:shadow-md sm:ml-3 sm:w-auto"
                      >
                        Create Shop
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:shadow-md sm:mt-0 sm:ml-3 sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Stock Transfer Modal */}
          {showTransferModal && selectedShop && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={() => setShowTransferModal(false)}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <form onSubmit={handleTransferStock} noValidate>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          Transfer Stock to {selectedShop.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowTransferModal(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          ✕
                        </button>
                      </div>
                      {transferError && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{transferError}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Godown *
                          </label>
                          <select
                            required
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={transferForm.godownId}
                            onChange={(e) => handleGodownChange(Number(e.target.value))}
                          >
                            <option value={0}>Select Godown</option>
                            {godowns.map((godown) => (
                              <option key={godown.id} value={godown.id}>
                                {godown.name} {godown.territoryName && `(${godown.territoryName})`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedGodown && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Product *
                            </label>
                            {loadingGodownStock ? (
                              <div className="flex justify-center py-4">
                                <LoadingSpinner />
                              </div>
                            ) : godownStock.length === 0 ? (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                  No products available in this godown
                                </p>
                              </div>
                            ) : (
                              <select
                                required
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={transferForm.productId}
                                onChange={(e) => {
                                  const productId = Number(e.target.value);
                                  setTransferForm({ ...transferForm, productId, quantity: 0 });
                                  setQuantityInput('');
                                  setQuantityError('');
                                }}
                              >
                                <option value={0}>Select Product</option>
                                {godownStock
                                  .filter(product => (product.godownStock || 0) > 0)
                                  .map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} - Available: {product.godownStock || 0}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        )}

                        {transferForm.productId > 0 && (() => {
                          const selectedProduct = godownStock.find(p => p.id === transferForm.productId);
                          const availableStock = selectedProduct?.godownStock || 0;
                          
                          return (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity *
                              </label>
                              <input
                                type="number"
                                required
                                className={`w-full border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 ${
                                  quantityError
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                                }`}
                                value={quantityInput}
                                onInvalid={(e) => {
                                  // Prevent browser's default validation message
                                  e.preventDefault();
                                }}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  setQuantityInput(inputValue);
                                  
                                  // Allow empty input for manual typing
                                  if (inputValue === '') {
                                    setTransferForm({ ...transferForm, quantity: 0 });
                                    setQuantityError('');
                                    return;
                                  }
                                  
                                  // Parse the number value
                                  const numValue = Number(inputValue);
                                  
                                  // Check if it's a valid number
                                  if (isNaN(numValue)) {
                                    setTransferForm({ ...transferForm, quantity: 0 });
                                    setQuantityError('');
                                    return;
                                  }
                                  
                                  // Validate minimum value
                                  if (numValue < 1) {
                                    setTransferForm({ ...transferForm, quantity: numValue });
                                    setQuantityError('Quantity must be at least 1');
                                    return;
                                  }
                                  
                                  // Validate against available stock
                                  if (numValue > availableStock) {
                                    setTransferForm({ ...transferForm, quantity: numValue });
                                    setQuantityError(`Quantity cannot exceed available stock: ${availableStock}`);
                                  } else {
                                    setTransferForm({ ...transferForm, quantity: numValue });
                                    setQuantityError('');
                                  }
                                }}
                                onBlur={(e) => {
                                  // Validate on blur
                                  const inputValue = e.target.value.trim();
                                  
                                  if (inputValue === '' || inputValue === '0') {
                                    setQuantityError('Quantity is required and must be greater than 0');
                                    setTransferForm({ ...transferForm, quantity: 0 });
                                    return;
                                  }
                                  
                                  const numValue = Number(inputValue);
                                  
                                  if (isNaN(numValue) || numValue < 1) {
                                    setQuantityError('Quantity must be at least 1');
                                    setTransferForm({ ...transferForm, quantity: 0 });
                                    return;
                                  }
                                  
                                  if (numValue > availableStock) {
                                    setQuantityError(`Quantity cannot exceed available stock: ${availableStock}`);
                                  }
                                }}
                                placeholder="Enter quantity"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {availableStock}
                              </p>
                              {quantityError && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <span>⚠️</span>
                                  <span>{quantityError}</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Transfer Summary:</strong>
                          </p>
                          <ul className="text-sm text-blue-700 mt-2 space-y-1">
                            <li>From: {selectedGodown?.name || 'Not selected'}</li>
                            <li>To: {selectedShop.name}</li>
                            <li>Product: {godownStock.find(p => p.id === transferForm.productId)?.name || 'Not selected'}</li>
                            <li>Quantity: {quantityInput || transferForm.quantity || 0}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <Button
                        type="submit"
                        disabled={transferring || !transferForm.godownId || !transferForm.productId}
                        isLoading={transferring}
                        variant="success"
                        icon={ArrowRightLeft}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        Transfer Stock
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowTransferModal(false)}
                        disabled={transferring}
                        variant="outline"
                        className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
                      >
                        Cancel
                      </Button>
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

