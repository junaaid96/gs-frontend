'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Territory, TerritoryRequest, User, UserRole } from '@/types';
import { isAdmin } from '@/utils/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import Button from '@/components/Button';
import { Plus, X, MapPin, Edit } from 'lucide-react';

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [formData, setFormData] = useState<TerritoryRequest>({
    name: '',
    description: '',
    managerId: undefined,
  });
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      window.location.href = '/dashboard';
      return;
    }
    loadTerritories();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiService.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadTerritories = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTerritories();
      setTerritories(response.data || []);
    } catch (error) {
      console.error('Error loading territories:', error);
      showToast('Failed to load territories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingTerritory) {
        await apiService.updateTerritory(editingTerritory.id, formData);
        showToast('Territory updated successfully', 'success');
      } else {
        await apiService.createTerritory(formData);
        showToast('Territory created successfully', 'success');
      }
      setShowModal(false);
      setEditingTerritory(null);
      setFormData({ name: '', description: '', managerId: undefined });
      loadTerritories();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Failed to ${editingTerritory ? 'update' : 'create'} territory`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
    }
  };

  const handleEditTerritory = (territory: Territory) => {
    setEditingTerritory(territory);
    setFormData({
      name: territory.name,
      description: territory.description || '',
      managerId: territory.managerId,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTerritory(null);
    setFormData({ name: '', description: '', managerId: undefined });
    setError('');
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Territories</h1>
              <p className="text-sm text-gray-600 mt-1">Manage territories and their assignments</p>
            </div>
            <Button
              onClick={() => {
                setEditingTerritory(null);
                setFormData({ name: '', description: '', managerId: undefined });
                setShowModal(true);
              }}
              icon={Plus}
              iconPosition="left"
            >
              Add Territory
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : territories.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">🗺️</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No territories found</h3>
              <p className="text-gray-600 mb-4">Create your first territory to get started</p>
              <Button
                onClick={() => setShowModal(true)}
                icon={MapPin}
                iconPosition="left"
              >
                Create Territory
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {territories.map((territory) => (
                <div
                  key={territory.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">🗺️</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{territory.name}</h3>
                        {territory.description && (
                          <p className="text-sm text-gray-600 mt-1">{territory.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleEditTerritory(territory)}
                      variant="outline"
                      icon={Edit}
                      iconPosition="left"
                      className="ml-4"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    {territory.managerName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Manager:</span>
                        <span className="font-semibold text-gray-900">{territory.managerName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shops:</span>
                      <span className="font-semibold text-indigo-600">
                        {territory.shops?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Godowns:</span>
                      <span className="font-semibold text-blue-600">
                        {territory.godowns?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={handleCloseModal}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <form onSubmit={handleSubmit}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {editingTerritory ? 'Edit Territory' : 'Create Territory'}
                        </h3>
                        <button
                          type="button"
                          onClick={handleCloseModal}
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
                            Territory Name *
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
                            Description
                          </label>
                          <textarea
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Manager
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.managerId || ''}
                            onChange={(e) => setFormData({ ...formData, managerId: e.target.value ? parseInt(e.target.value) : undefined })}
                          >
                            <option value="">No Manager</option>
                            {loadingUsers ? (
                              <option value="" disabled>Loading managers...</option>
                            ) : (
                              users
                                .filter(user => user.role === UserRole.MANAGER)
                                .map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.username}
                                  </option>
                                ))
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <Button
                        type="submit"
                        icon={editingTerritory ? Edit : MapPin}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        {editingTerritory ? 'Update Territory' : 'Create Territory'}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCloseModal}
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

