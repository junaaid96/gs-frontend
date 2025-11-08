'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product, ProductRequest, ProductStatus } from '@/types';
import { isAdmin, isSalesman } from '@/utils/auth';
import { uploadImageToImgBB } from '@/services/imgbb';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProductCardSkeleton } from '@/components/SkeletonLoader';
import { showToast } from '@/components/Toast';

type ViewMode = 'grid' | 'list';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [formData, setFormData] = useState<ProductRequest>({
    name: '',
    description: '',
    unitPrice: 0,
    costPrice: 0,
    stock: 0,
    imageUrl: '',
  });
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsSalesman, setUserIsSalesman] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUserIsAdmin(isAdmin());
    setUserIsSalesman(isSalesman());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, userIsAdmin]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let response;
      if (userIsAdmin) {
        response = await apiService.getProducts();
      } else {
        response = await apiService.getMyProducts();
      }
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setImageFile(file);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      let finalImageUrl = formData.imageUrl || '';
      
      if (imageFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await uploadImageToImgBB(imageFile);
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const productData: ProductRequest = {
        ...formData,
        imageUrl: finalImageUrl || undefined,
      };

      await apiService.createProduct(productData);
      showToast('Product created successfully', 'success');
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        unitPrice: 0,
        costPrice: 0,
        stock: 0,
        imageUrl: '',
      });
      setImageFile(null);
      setImagePreview(null);
      loadProducts();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create product';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setUploadingImage(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      description: '',
      unitPrice: 0,
      costPrice: 0,
      stock: 0,
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  const handleApprove = async (id: number) => {
    try {
      await apiService.approveProduct(id);
      showToast('Product approved successfully', 'success');
      loadProducts();
    } catch (error) {
      console.error('Error approving product:', error);
      showToast('Failed to approve product', 'error');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiService.rejectProduct(id);
      showToast('Product rejected', 'info');
      loadProducts();
    } catch (error) {
      console.error('Error rejecting product:', error);
      showToast('Failed to reject product', 'error');
    }
  };

  const getStatusBadge = (status: ProductStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full border ${colors[status]}`}
      >
        {status}
      </span>
    );
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200">
      {product.imageUrl && (
        <div className="relative h-48 bg-gray-100">
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
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
            {product.name}
          </h3>
          {getStatusBadge(product.status)}
        </div>
        
        {product.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Unit Price:</span>
            <span className="font-semibold text-gray-900">{product.unitPrice.toFixed(2)} TK</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cost Price:</span>
            <span className="font-semibold text-gray-700">{product.costPrice.toFixed(2)} TK</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Profit:</span>
            <span className="font-semibold text-green-600">{product.profitPerUnit.toFixed(2)} TK</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <p className="text-gray-500">Stock</p>
              <p className="font-semibold text-gray-900">{product.stock}</p>
            </div>
            <div>
              <p className="text-gray-500">Godown</p>
              <p className="font-semibold text-blue-600">{product.godownStock || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Shop</p>
              <p className="font-semibold text-purple-600">{product.shopStock || 0}</p>
            </div>
          </div>
        </div>

        {mounted && userIsAdmin && product.status === 'PENDING' && (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleApprove(product.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(product.id)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const ProductListItem = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className="flex items-start gap-4">
        {product.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-24 w-24 object-cover rounded-lg border border-gray-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
            {getStatusBadge(product.status)}
          </div>
          
          {product.description && (
            <p className="text-sm text-gray-600 mb-4">{product.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Unit Price</p>
              <p className="font-semibold text-gray-900">{product.unitPrice.toFixed(2)} TK</p>
            </div>
            <div>
              <p className="text-gray-500">Cost Price</p>
              <p className="font-semibold text-gray-700">{product.costPrice.toFixed(2)} TK</p>
            </div>
            <div>
              <p className="text-gray-500">Profit</p>
              <p className="font-semibold text-green-600">{product.profitPerUnit.toFixed(2)} TK</p>
            </div>
            <div>
              <p className="text-gray-500">Stock</p>
              <p className="font-semibold text-gray-900">{product.stock}</p>
            </div>
            <div>
              <p className="text-gray-500">Godown / Shop</p>
              <p className="font-semibold text-gray-900">
                {product.godownStock || 0} / {product.shopStock || 0}
              </p>
            </div>
          </div>

          {mounted && userIsAdmin && product.status === 'PENDING' && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleApprove(product.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(product.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your product inventory
              </p>
            </div>
            {mounted && (userIsSalesman || userIsAdmin) && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <span className="mr-2">➕</span>
                Add Product
              </button>
            )}
          </div>

          {/* Search and Filters */}
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'ALL')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    ⊞ Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    ☰ List
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">📦</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first product'}
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredProducts.map((product) =>
                viewMode === 'grid' ? (
                  <ProductCard key={product.id} product={product} />
                ) : (
                  <ProductListItem key={product.id} product={product} />
                )
              )}
            </div>
          )}

          {/* Create Product Modal */}
          {showModal && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={handleCloseModal}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <form onSubmit={handleCreateProduct}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          Add New Product
                        </h3>
                        <button
                          type="button"
                          onClick={handleCloseModal}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price (TK) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0.01"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.unitPrice}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cost Price (TK) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0.01"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.costPrice}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                costPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.stock}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                stock: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            onChange={handleImageChange}
                          />
                          {imagePreview && (
                            <div className="mt-2">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-lg border border-gray-300"
                              />
                            </div>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Maximum file size: 10MB. Supported formats: JPG, PNG, GIF, WebP
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={uploadingImage}
                        className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        {uploadingImage ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Uploading...
                          </>
                        ) : (
                          'Create Product'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseModal}
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
