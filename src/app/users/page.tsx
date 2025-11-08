'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { User, UserRequest, UpdateUserRequest, UserRole, Shop, Territory } from '@/types';
import { isAdmin, getUser } from '@/utils/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import Button from '@/components/Button';
import { Plus, X, UserPlus, Search, Save, Edit, Trash2 } from 'lucide-react';
import { ValidationError } from '@/components/ValidationError';
import { 
  validateUsername, 
  validatePassword, 
  parseValidationErrors, 
  getGeneralError, 
  getFieldError,
  ValidationErrors 
} from '@/utils/validation';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loadingTerritories, setLoadingTerritories] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserRequest>({
    username: '',
    password: '',
    role: UserRole.SALESMAN,
  });
  const [updateFormData, setUpdateFormData] = useState<UpdateUserRequest>({
    enabled: true,
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [shopFilter, setShopFilter] = useState<number | 'ALL'>('ALL');
  const [territoryFilter, setTerritoryFilter] = useState<number | 'ALL'>('ALL');

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const response = await apiService.getShops();
      setShops(response.data || []);
    } catch (error) {
      console.error('Error loading shops:', error);
      showToast('Failed to load shops', 'error');
    } finally {
      setLoadingShops(false);
    }
  };

  const loadTerritories = async () => {
    try {
      setLoadingTerritories(true);
      const response = await apiService.getTerritories();
      setTerritories(response.data || []);
    } catch (error) {
      console.error('Error loading territories:', error);
      showToast('Failed to load territories', 'error');
    } finally {
      setLoadingTerritories(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      window.location.href = '/dashboard';
      return;
    }
    const currentUser = getUser();
    if (currentUser) {
      setCurrentUsername(currentUser.username);
    }
    loadUsers();
    loadShops();
    loadTerritories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter - matches username, shop name, or territory name
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.shopName && user.shopName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.territoryName && user.territoryName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Role filter
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.enabled) ||
        (statusFilter === 'INACTIVE' && !user.enabled);

      // Shop filter
      const matchesShop = shopFilter === 'ALL' || user.shopId === shopFilter;

      // Territory filter
      const matchesTerritory = territoryFilter === 'ALL' || user.territoryId === territoryFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesShop && matchesTerritory;
    });
  }, [users, searchQuery, roleFilter, statusFilter, shopFilter, territoryFilter]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: UserRole.SALESMAN,
      shopId: undefined,
      territoryId: undefined,
    });
    setErrors({});
    setFieldErrors({});
    loadShops();
    loadTerritories();
    setShowModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setUpdateFormData({
      enabled: user.enabled,
      password: '',
      shopId: user.shopId,
      territoryId: user.territoryId,
    });
    setErrors({});
    setFieldErrors({});
    loadShops();
    loadTerritories();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setErrors({});
    setFieldErrors({});
    setFormData({
      username: '',
      password: '',
      role: UserRole.SALESMAN,
      shopId: undefined,
      territoryId: undefined,
    });
    setUpdateFormData({
      enabled: true,
      password: '',
      shopId: undefined,
      territoryId: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFieldErrors({});

    if (editingUser) {
      // Update user - validate password if provided
      if (updateFormData.password) {
        const passwordError = validatePassword(updateFormData.password, false);
        if (passwordError) {
          setFieldErrors({ password: passwordError });
          return;
        }
      }

      try {
        await apiService.updateUser(editingUser.id, updateFormData);
        showToast('User updated successfully', 'success');
        handleCloseModal();
        loadUsers();
      } catch (err: any) {
        const validationErrors = parseValidationErrors(err);
        setErrors(validationErrors);
        
        // Extract field-specific errors
        const newFieldErrors: Record<string, string> = {};
        Object.keys(validationErrors).forEach(key => {
          if (key !== '_general') {
            newFieldErrors[key] = validationErrors[key];
          }
        });
        setFieldErrors(newFieldErrors);
        
        const errorMsg = getGeneralError(validationErrors) || 'Failed to update user';
        showToast(errorMsg, 'error');
      }
    } else {
      // Create user - client-side validation
      const usernameError = validateUsername(formData.username);
      const passwordError = validatePassword(formData.password);
      
      if (usernameError || passwordError) {
        setFieldErrors({
          username: usernameError || undefined,
          password: passwordError || undefined,
        });
        return;
      }

      if (formData.role === UserRole.SALESMAN && !formData.shopId) {
        setErrors({ _general: 'Shop is required for salesmen' });
        return;
      }

      if (formData.role === UserRole.MANAGER && !formData.territoryId) {
        setErrors({ _general: 'Territory is required for managers' });
        return;
      }

      try {
        await apiService.createUser(formData);
        showToast('User created successfully', 'success');
        handleCloseModal();
        loadUsers();
      } catch (err: any) {
        const validationErrors = parseValidationErrors(err);
        setErrors(validationErrors);
        
        // Extract field-specific errors
        const newFieldErrors: Record<string, string> = {};
        Object.keys(validationErrors).forEach(key => {
          if (key !== '_general') {
            newFieldErrors[key] = validationErrors[key];
          }
        });
        setFieldErrors(newFieldErrors);
        
        const errorMsg = getGeneralError(validationErrors) || 'Failed to create user';
        showToast(errorMsg, 'error');
      }
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]: 'bg-purple-100 text-purple-800',
      [UserRole.MANAGER]: 'bg-blue-100 text-blue-800',
      [UserRole.SALESMAN]: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[role]}`}>
        {role}
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
              <p className="text-sm text-gray-600 mt-1">Manage employees and their assignments</p>
            </div>
            <Button
              onClick={handleOpenCreateModal}
              icon={UserPlus}
              iconPosition="left"
            >
              Add Employee
            </Button>
          </div>

          {/* Search and Filters */}
          {!loading && users.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by username, shop, or territory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Roles</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.SALESMAN}>Salesman</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <select
                    value={shopFilter}
                    onChange={(e) => setShopFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Shops</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={territoryFilter}
                    onChange={(e) => setTerritoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Territories</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} employees
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">👥</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600 mb-4">Create your first employee to get started</p>
              <Button
                onClick={handleOpenCreateModal}
                icon={UserPlus}
                iconPosition="left"
              >
                Create Employee
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">🔍</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No employees match your filters</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                  setShopFilter('ALL');
                  setTerritoryFilter('ALL');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Territory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.shopName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.territoryName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {currentUsername && user.username !== currentUsername && (
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-flex items-center"
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                          {editingUser ? 'Edit Employee' : 'Create Employee'}
                        </h3>
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      {getGeneralError(errors) && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{getGeneralError(errors)}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        {!editingUser && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username *
                              </label>
                              <input
                                type="text"
                                required
                                className={`w-full border ${
                                  fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                                } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                value={formData.username}
                                onChange={(e) => {
                                  setFormData({ ...formData, username: e.target.value });
                                  if (fieldErrors.username) {
                                    const error = validateUsername(e.target.value);
                                    setFieldErrors(prev => ({
                                      ...prev,
                                      username: error || undefined,
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const error = validateUsername(e.target.value);
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    username: error || undefined,
                                  }));
                                }}
                              />
                              <ValidationError error={fieldErrors.username} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password *
                              </label>
                              <input
                                type="password"
                                required
                                className={`w-full border ${
                                  fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                                } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                value={formData.password}
                                onChange={(e) => {
                                  setFormData({ ...formData, password: e.target.value });
                                  if (fieldErrors.password) {
                                    const error = validatePassword(e.target.value);
                                    setFieldErrors(prev => ({
                                      ...prev,
                                      password: error || undefined,
                                    }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const error = validatePassword(e.target.value);
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    password: error || undefined,
                                  }));
                                }}
                              />
                              <ValidationError error={fieldErrors.password} />
                              <p className="mt-1 text-xs text-gray-500">Password must be between 6 and 100 characters</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role *
                              </label>
                              <select
                                required
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.role}
                                onChange={(e) => {
                                  const role = e.target.value as UserRole;
                                  setFormData({
                                    ...formData,
                                    role,
                                    shopId: role === UserRole.SALESMAN ? formData.shopId : undefined,
                                    territoryId: role === UserRole.MANAGER ? formData.territoryId : undefined,
                                  });
                                }}
                              >
                                <option value={UserRole.SALESMAN}>Salesman</option>
                                <option value={UserRole.MANAGER}>Manager</option>
                              </select>
                            </div>
                          </>
                        )}
                        {editingUser && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Username
                            </label>
                            <input
                              type="text"
                              disabled
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                              value={editingUser.username}
                            />
                            <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
                          </div>
                        )}
                        {editingUser && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Role
                            </label>
                            <input
                              type="text"
                              disabled
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                              value={editingUser.role}
                            />
                            <p className="mt-1 text-xs text-gray-500">Role cannot be changed</p>
                          </div>
                        )}
                        {editingUser && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              New Password (Optional)
                            </label>
                            <input
                              type="password"
                              className={`w-full border ${
                                fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                              } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                              value={updateFormData.password || ''}
                              onChange={(e) => {
                                setUpdateFormData({ ...updateFormData, password: e.target.value });
                                if (fieldErrors.password) {
                                  const error = validatePassword(e.target.value, false);
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    password: error || undefined,
                                  }));
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  const error = validatePassword(e.target.value, false);
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    password: error || undefined,
                                  }));
                                } else {
                                  setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.password;
                                    return newErrors;
                                  });
                                }
                              }}
                              placeholder="Leave empty to keep current password"
                            />
                            <ValidationError error={fieldErrors.password} />
                            <p className="mt-1 text-xs text-gray-500">
                              Leave empty if you don't want to change the password. Password must be between 6 and 100 characters.
                            </p>
                          </div>
                        )}
                        {editingUser && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Status *
                            </label>
                            <select
                              required
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={updateFormData.enabled ? 'true' : 'false'}
                              onChange={(e) =>
                                setUpdateFormData({
                                  ...updateFormData,
                                  enabled: e.target.value === 'true',
                                })
                              }
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        )}
                        {((!editingUser && formData.role === UserRole.SALESMAN) ||
                          (editingUser && editingUser.role === UserRole.SALESMAN)) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Shop {!editingUser && '*'}
                            </label>
                            {loadingShops ? (
                              <div className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-gray-500">
                                Loading shops...
                              </div>
                            ) : (
                              <select
                                required={!editingUser}
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={
                                  editingUser
                                    ? updateFormData.shopId || ''
                                    : formData.shopId || ''
                                }
                                onChange={(e) => {
                                  const shopId = e.target.value ? Number(e.target.value) : undefined;
                                  if (editingUser) {
                                    setUpdateFormData({ ...updateFormData, shopId });
                                  } else {
                                    setFormData({ ...formData, shopId });
                                  }
                                }}
                              >
                                <option value="">Select a shop</option>
                                {shops.map((shop) => (
                                  <option key={shop.id} value={shop.id}>
                                    {shop.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Select the shop where this salesman will work
                            </p>
                          </div>
                        )}
                        {((!editingUser && formData.role === UserRole.MANAGER) ||
                          (editingUser && editingUser.role === UserRole.MANAGER)) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Territory {!editingUser && '*'}
                            </label>
                            {loadingTerritories ? (
                              <div className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-gray-500">
                                Loading territories...
                              </div>
                            ) : (
                              <select
                                required={!editingUser}
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={
                                  editingUser
                                    ? updateFormData.territoryId || ''
                                    : formData.territoryId || ''
                                }
                                onChange={(e) => {
                                  const territoryId = e.target.value ? Number(e.target.value) : undefined;
                                  if (editingUser) {
                                    setUpdateFormData({ ...updateFormData, territoryId });
                                  } else {
                                    setFormData({ ...formData, territoryId });
                                  }
                                }}
                              >
                                <option value="">Select a territory</option>
                                {territories.map((territory) => (
                                  <option key={territory.id} value={territory.id}>
                                    {territory.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Select the territory this manager will manage
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <Button
                        type="submit"
                        icon={editingUser ? Save : UserPlus}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        {editingUser ? 'Update Employee' : 'Create Employee'}
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

