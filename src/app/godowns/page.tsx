'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Godown, Product, GodownRequest } from '@/types';
import { getUser, isAdmin, isManager } from '@/utils/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import Button from '@/components/Button';
import { Plus, X, Warehouse } from 'lucide-react';

export default function GodownsPage() {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGodown, setSelectedGodown] = useState<Godown | null>(null);
  const [godownStock, setGodownStock] = useState<Product[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<GodownRequest>({
    name: '',
    address: '',
    contactNumber: '',
    territoryId: 0,
  });
  const [error, setError] = useState('');
  const [territories, setTerritories] = useState<any[]>([]);

  useEffect(() => {
    loadGodowns();
    if (isAdmin() || isManager()) {
      loadTerritories();
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

  const loadGodowns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGodowns();
      setGodowns(response.data || []);
      if (response.data && response.data.length > 0) {
        // Auto-select first godown
        setSelectedGodown(response.data[0]);
        loadGodownStock(response.data[0].id);
      } else if (response.data && response.data.length === 0) {
        // Empty list is valid - salesman may not have shop/territory assigned yet
        setSelectedGodown(null);
        setGodownStock([]);
      }
    } catch (error: any) {
      console.error('Error loading godowns:', error);
      // Only show error if it's not a 400 (which now means empty list)
      if (error.response?.status !== 400) {
        showToast('Failed to load godowns', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGodownStock = async (godownId: number) => {
    try {
      setLoadingStock(true);
      const godown = godowns.find(g => g.id === godownId) || selectedGodown;
      if (godown) {
        setSelectedGodown(godown);
      }
      const response = await apiService.getGodownStockWithQuantity(godownId);
      setGodownStock(response.data || []);
    } catch (error) {
      console.error('Error loading godown stock:', error);
      showToast('Failed to load godown stock', 'error');
    } finally {
      setLoadingStock(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Godowns</h1>
              <p className="text-sm text-gray-600 mt-1">Manage godowns and view stock</p>
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
                Add Godown
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Godown List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Godowns</h2>
                  <div className="space-y-2">
                    {godowns.map((godown) => (
                      <button
                        key={godown.id}
                        onClick={() => loadGodownStock(godown.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedGodown?.id === godown.id
                            ? 'bg-indigo-50 border-2 border-indigo-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{godown.name}</p>
                        {godown.address && (
                          <p className="text-sm text-gray-600 mt-1">Address: {godown.address}</p>
                        )}
                        {godown.contactNumber && (
                          <p className="text-sm text-gray-600 mt-1">Contact: {godown.contactNumber}</p>
                        )}
                        {godown.territoryName && (
                          <p className="text-xs text-gray-500 mt-1">Territory: {godown.territoryName}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Godown Stock */}
              <div className="lg:col-span-2">
                {selectedGodown ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedGodown.name} - Stock
                      </h2>
                      {selectedGodown.address && (
                        <p className="text-sm text-gray-600">Address: {selectedGodown.address}</p>
                      )}
                      {selectedGodown.contactNumber && (
                        <p className="text-sm text-gray-600">Contact: {selectedGodown.contactNumber}</p>
                      )}
                    </div>

                    {loadingStock ? (
                      <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                      </div>
                    ) : godownStock.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                        <span className="text-6xl mb-4 block">🏭</span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          No stock available
                        </h3>
                        <p className="text-gray-600">
                          This godown has no products in stock
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {godownStock.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white rounded-lg shadow-md p-5 border border-gray-200"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {product.name}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Godown Stock</span>
                                <span className="text-xl font-bold text-blue-600">
                                  {product.godownStock || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Shop Stock</span>
                                <span className="text-lg font-semibold text-purple-600">
                                  {product.shopStock || 0}
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
                    <span className="text-6xl mb-4 block">🏭</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Select a godown
                    </h3>
                    <p className="text-gray-600">
                      Choose a godown from the list to view its stock
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Godown Modal */}
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
                      const godownData: GodownRequest = isManager() && user?.territoryId
                        ? { ...formData, territoryId: user.territoryId }
                        : formData;
                      
                      await apiService.createGodown(godownData);
                      showToast('Godown created successfully', 'success');
                      setShowModal(false);
                      // Reset form - preserve territory for managers
                      const resetTerritoryId = isManager() && user?.territoryId 
                        ? user.territoryId 
                        : territories[0]?.id || 0;
                      setFormData({ name: '', address: '', contactNumber: '', territoryId: resetTerritoryId });
                      loadGodowns();
                    } catch (err: any) {
                      const errorMsg = err.response?.data?.message || 'Failed to create godown';
                      setError(errorMsg);
                      showToast(errorMsg, 'error');
                    }
                  }}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Create Godown</h3>
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
                            Godown Name *
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
                                Managers can only create godowns in their assigned territory
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
                      <Button
                        type="submit"
                        icon={Warehouse}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        Create Godown
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowModal(false)}
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

