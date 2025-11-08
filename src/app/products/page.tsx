'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product, ProductRequest, ProductStatus, Territory, LoginResponse, Godown } from '@/types';
import { isAdmin, isSalesman, isManager, getUser } from '@/utils/auth';
import { UserRole } from '@/types';
import { uploadImageToImgBB } from '@/services/imgbb';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProductCardSkeleton } from '@/components/SkeletonLoader';
import { showToast } from '@/components/Toast';
import Button from '@/components/Button';
import { Plus, Grid3x3, List, CheckCircle2, XCircle, Search, Edit } from 'lucide-react';
import { ValidationError } from '@/components/ValidationError';
import { 
  validateName, 
  validateDescription, 
  validatePrice, 
  validateStock, 
  validateImageUrl,
  validateOrigin,
  parseValidationErrors, 
  getGeneralError, 
  ValidationErrors 
} from '@/utils/validation';

type ViewMode = 'grid' | 'list';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [territoryFilter, setTerritoryFilter] = useState<number | 'ALL'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<ProductRequest>({
    name: '',
    description: '',
    unitPrice: 0,
    costPrice: 0,
    stock: 0,
    imageUrl: '',
    origin: '',
    territoryId: undefined,
    godownId: undefined,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsSalesman, setUserIsSalesman] = useState(false);
  const [userIsManager, setUserIsManager] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loadingTerritories, setLoadingTerritories] = useState(false);
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(null);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loadingGodowns, setLoadingGodowns] = useState(false);
  const [filteredGodowns, setFilteredGodowns] = useState<Godown[]>([]);

  useEffect(() => {
    setMounted(true);
    setUserIsAdmin(isAdmin());
    setUserIsSalesman(isSalesman());
    setUserIsManager(isManager());
    setCurrentUser(getUser());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadProducts();
      if (userIsAdmin) {
        loadTerritories();
      }
      loadGodowns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, userIsAdmin, territoryFilter]);

  // Update filtered godowns when territory changes or when godowns are loaded
  useEffect(() => {
    if (godowns.length > 0) {
      filterGodownsByTerritory(godowns, formData.territoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [godowns, formData.territoryId, currentUser, userIsSalesman, userIsManager, userIsAdmin]);

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

  const loadGodowns = async () => {
    try {
      setLoadingGodowns(true);
      const response = await apiService.getGodowns();
      setGodowns(response.data || []);
      // Filter godowns based on user role and territory
      filterGodownsByTerritory(response.data || [], formData.territoryId);
    } catch (error) {
      console.error('Error loading godowns:', error);
      showToast('Failed to load godowns', 'error');
    } finally {
      setLoadingGodowns(false);
    }
  };

  const filterGodownsByTerritory = (allGodowns: Godown[], territoryId?: number) => {
    if (userIsAdmin) {
      // For admin, filter by selected territory
      if (territoryId) {
        const filtered = allGodowns.filter(g => g.territoryId === territoryId);
        setFilteredGodowns(filtered);
      } else {
        setFilteredGodowns([]);
      }
    } else if (userIsSalesman || userIsManager) {
      // For salesman and manager, use their territory from currentUser
      const userTerritoryId = currentUser?.territoryId;
      if (userTerritoryId) {
        const filtered = allGodowns.filter(g => g.territoryId === userTerritoryId);
        setFilteredGodowns(filtered);
      } else {
        setFilteredGodowns([]);
      }
    } else {
      setFilteredGodowns([]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      // All roles can see products, but filtered by territory
      const territoryId = userIsAdmin && territoryFilter !== 'ALL' ? territoryFilter as number : undefined;
      const response = await apiService.getProducts(territoryId);
      setProducts(response.data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      // Only show error if it's not a 400 (which now means empty list)
      if (error.response?.status !== 400) {
        showToast('Failed to load products', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.origin?.toLowerCase().includes(searchQuery.toLowerCase());
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
    setErrors({});
    setFieldErrors({});

    // Client-side validation
    const nameError = validateName(formData.name, 'Product name');
    const descriptionError = validateDescription(formData.description || '', 1000);
    const unitPriceError = validatePrice(formData.unitPrice, 'Unit price');
    const costPriceError = validatePrice(formData.costPrice, 'Cost price');
    const stockError = validateStock(formData.stock);
    const imageUrlError = validateImageUrl(formData.imageUrl || '');
    const originError = validateOrigin(formData.origin || '');

    if (nameError || descriptionError || unitPriceError || costPriceError || stockError || imageUrlError || originError) {
      setFieldErrors({
        name: nameError || undefined,
        description: descriptionError || undefined,
        unitPrice: unitPriceError || undefined,
        costPrice: costPriceError || undefined,
        stock: stockError || undefined,
        imageUrl: imageUrlError || undefined,
        origin: originError || undefined,
      });
      return;
    }

    // Validate territory for admins
    if (userIsAdmin && !formData.territoryId) {
      setErrors({ _general: 'Please select a territory for the product' });
      return;
    }

    // Validate godown for all roles
    if (!formData.godownId) {
      setErrors({ _general: 'Please select a godown for the product' });
      return;
    }

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

      const response = await apiService.createProduct(productData);
      showToast('Product created and added to godown successfully', 'success');
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        unitPrice: 0,
        costPrice: 0,
        stock: 0,
        imageUrl: '',
        origin: '',
        territoryId: undefined,
        godownId: undefined,
      });
        setImageFile(null);
        setImagePreview(null);
        filterGodownsByTerritory(godowns, undefined);
        loadProducts();
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
      
      const errorMsg = getGeneralError(validationErrors) || 'Failed to create product';
      showToast(errorMsg, 'error');
      setUploadingImage(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowEditModal(false);
    setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        unitPrice: 0,
        costPrice: 0,
        stock: 0,
        imageUrl: '',
        origin: '',
        territoryId: undefined,
        godownId: undefined,
      });
      setImageFile(null);
      setImagePreview(null);
      setErrors({});
      setFieldErrors({});
      // Reset filtered godowns
      filterGodownsByTerritory(godowns, undefined);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      origin: product.origin || '',
      territoryId: product.territoryId,
    });
    setImagePreview(product.imageUrl || null);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setErrors({});
    setFieldErrors({});

    // Client-side validation
    const nameError = validateName(formData.name, 'Product name');
    const descriptionError = validateDescription(formData.description || '', 1000);
    const unitPriceError = validatePrice(formData.unitPrice, 'Unit price');
    const costPriceError = validatePrice(formData.costPrice, 'Cost price');
    const stockError = validateStock(formData.stock);
    const imageUrlError = validateImageUrl(formData.imageUrl || '');
    const originError = validateOrigin(formData.origin || '');

    if (nameError || descriptionError || unitPriceError || costPriceError || stockError || imageUrlError || originError) {
      setFieldErrors({
        name: nameError || undefined,
        description: descriptionError || undefined,
        unitPrice: unitPriceError || undefined,
        costPrice: costPriceError || undefined,
        stock: stockError || undefined,
        imageUrl: imageUrlError || undefined,
        origin: originError || undefined,
      });
      return;
    }

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

      await apiService.updateProduct(editingProduct.id, productData);
      showToast('Product updated successfully', 'success');
      setShowEditModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        unitPrice: 0,
        costPrice: 0,
        stock: 0,
        imageUrl: '',
        origin: '',
        territoryId: undefined,
        godownId: undefined,
      });
      setImageFile(null);
      setImagePreview(null);
      loadProducts();
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
      
      const errorMsg = getGeneralError(validationErrors) || 'Failed to update product';
      showToast(errorMsg, 'error');
      setUploadingImage(false);
    }
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
        
        {/* Product Details Section */}
        <div className="space-y-3 mb-4">
          {product.description && (
            <div>
              <span className="text-xs font-medium text-gray-500">Description: </span>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {product.description}
              </p>
            </div>
          )}
          
          {/* Location Information */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Origin:</span>
              <span className="font-medium text-gray-700 px-2 py-0.5 bg-gray-50 rounded">
                {product.origin || 'N/A'}
              </span>
            </div>
            {product.territoryName && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Territory:</span>
                <span className="font-medium text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">
                  {product.territoryName}
                </span>
              </div>
            )}
          </div>

          {/* Pricing Information */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Unit Price</span>
              <span className="font-semibold text-lg text-gray-900">{product.unitPrice.toFixed(2)} TK</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Cost Price</span>
              <span className="font-medium text-gray-700">{product.costPrice.toFixed(2)} TK</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-xs font-medium text-gray-700">Profit per Unit</span>
              <span className="font-semibold text-green-600">{product.profitPerUnit.toFixed(2)} TK</span>
            </div>
          </div>

          {/* Stock Information */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600 mb-1">Stock</p>
              <p className="font-bold text-sm text-blue-700">{product.stock}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600 mb-1">Godown</p>
              <p className="font-bold text-sm text-purple-700">{product.godownStock || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-600 mb-1">Shop</p>
              <p className="font-bold text-sm text-green-700">{product.shopStock || 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          {mounted && (userIsAdmin || userIsManager) && (
            <Button
              onClick={() => handleEditProduct(product)}
              variant="outline"
              icon={Edit}
              iconPosition="left"
              className="flex-1"
            >
              Edit
            </Button>
          )}
          {mounted && (userIsAdmin || userIsManager) && product.status === 'PENDING' && (
            <>
              <Button
                onClick={() => handleApprove(product.id)}
                variant="success"
                icon={CheckCircle2}
                iconPosition="left"
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                onClick={() => handleReject(product.id)}
                variant="danger"
                icon={XCircle}
                iconPosition="left"
                className="flex-1"
              >
                Reject
              </Button>
            </>
          )}
        </div>
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
          
          {/* Product Information Section */}
          <div className="flex-1 space-y-3">
            {product.description && (
              <div>
                <span className="text-xs font-medium text-gray-500">Description: </span>
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
              </div>
            )}

            {/* Location Information */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">Origin:</span>
                <span className="font-medium text-gray-700 px-2 py-0.5 bg-gray-50 rounded">
                  {product.origin || 'N/A'}
                </span>
              </div>
              {product.territoryName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Territory:</span>
                  <span className="font-medium text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">
                    {product.territoryName}
                  </span>
                </div>
              )}
            </div>

            {/* Pricing Information */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Unit Price</span>
                <span className="font-semibold text-lg text-gray-900">{product.unitPrice.toFixed(2)} TK</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Cost Price</span>
                <span className="font-medium text-gray-700">{product.costPrice.toFixed(2)} TK</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-xs font-medium text-gray-700">Profit per Unit</span>
                <span className="font-semibold text-green-600">{product.profitPerUnit.toFixed(2)} TK</span>
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-600 mb-1">Stock</p>
                <p className="font-bold text-sm text-blue-700">{product.stock}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-600 mb-1">Godown</p>
                <p className="font-bold text-sm text-purple-700">{product.godownStock || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-600 mb-1">Shop</p>
                <p className="font-bold text-sm text-green-700">{product.shopStock || 0}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            {mounted && (userIsAdmin || userIsManager) && (
              <Button
                onClick={() => handleEditProduct(product)}
                variant="outline"
                icon={Edit}
                iconPosition="left"
              >
                Edit
              </Button>
            )}
            {mounted && (userIsAdmin || userIsManager) && product.status === 'PENDING' && (
              <>
                <Button
                  onClick={() => handleApprove(product.id)}
                  variant="success"
                  icon={CheckCircle2}
                  iconPosition="left"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => handleReject(product.id)}
                  variant="danger"
                  icon={XCircle}
                  iconPosition="left"
                >
                  Reject
                </Button>
              </>
            )}
          </div>
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
            {mounted && (userIsSalesman || userIsAdmin || userIsManager) && (
              <Button
                onClick={() => setShowModal(true)}
                icon={Plus}
                iconPosition="left"
              >
                Add Product
              </Button>
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
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-2">
                {mounted && userIsAdmin && (
                  <select
                    value={territoryFilter}
                    onChange={(e) => setTerritoryFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Territories</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                )}
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
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-flex items-center ${
                      viewMode === 'grid'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3x3 size={16} className="mr-2.5" />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-flex items-center ${
                      viewMode === 'list'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <List size={16} className="mr-2.5" />
                    List
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

          {/* Edit Product Modal */}
          {showEditModal && editingProduct && (
            <div className="fixed z-50 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                  onClick={handleCloseModal}
                ></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <form onSubmit={handleUpdateProduct}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          Edit Product
                        </h3>
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          ✕
                        </button>
                      </div>
                      {getGeneralError(errors) && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{getGeneralError(errors)}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mounted && userIsAdmin && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Territory {userIsAdmin ? '*' : ''}
                            </label>
                            <select
                              required={userIsAdmin}
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={formData.territoryId || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  territoryId: e.target.value ? parseInt(e.target.value) : undefined,
                                })
                              }
                            >
                              <option value="">Select a territory</option>
                              {loadingTerritories ? (
                                <option value="" disabled>Loading territories...</option>
                              ) : (
                                territories.map((territory) => (
                                  <option key={territory.id} value={territory.id}>
                                    {territory.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        )}
                        {mounted && userIsManager && editingProduct.territoryName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Territory
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={editingProduct.territoryName}
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 text-gray-700 cursor-not-allowed focus:outline-none"
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            className={`w-full border ${
                              fieldErrors.name ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              if (fieldErrors.name) {
                                const error = validateName(e.target.value, 'Product name');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  name: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validateName(e.target.value, 'Product name');
                              setFieldErrors(prev => ({
                                ...prev,
                                name: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.name} />
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
                            className={`w-full border ${
                              fieldErrors.unitPrice ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.unitPrice}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, unitPrice: value });
                              if (fieldErrors.unitPrice) {
                                const error = validatePrice(value, 'Unit price');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  unitPrice: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validatePrice(formData.unitPrice, 'Unit price');
                              setFieldErrors(prev => ({
                                ...prev,
                                unitPrice: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.unitPrice} />
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
                            className={`w-full border ${
                              fieldErrors.costPrice ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.costPrice}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, costPrice: value });
                              if (fieldErrors.costPrice) {
                                const error = validatePrice(value, 'Cost price');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  costPrice: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validatePrice(formData.costPrice, 'Cost price');
                              setFieldErrors(prev => ({
                                ...prev,
                                costPrice: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.costPrice} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            className={`w-full border ${
                              fieldErrors.stock ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.stock}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, stock: value });
                              if (fieldErrors.stock) {
                                const error = validateStock(value);
                                setFieldErrors(prev => ({
                                  ...prev,
                                  stock: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validateStock(formData.stock);
                              setFieldErrors(prev => ({
                                ...prev,
                                stock: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.stock} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Origin (Country)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Bangladesh, China, Thailand"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.origin || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                origin: e.target.value,
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
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <Button
                        type="submit"
                        disabled={uploadingImage}
                        isLoading={uploadingImage}
                        icon={Edit}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        Update Product
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
                      {getGeneralError(errors) && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                          <p className="text-sm text-red-700">{getGeneralError(errors)}</p>
                        </div>
                      )}
                      {mounted && userIsSalesman && (
                        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                          <p className="text-sm text-green-700">
                            ✅ Products are directly added to the selected godown. No approval needed.
                          </p>
                        </div>
                      )}
                      {mounted && userIsManager && (
                        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                          <p className="text-sm text-green-700">
                            ✅ Products are directly added to the selected godown. No approval needed.
                          </p>
                        </div>
                      )}
                      {mounted && userIsAdmin && (
                        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                          <p className="text-sm text-blue-700">
                            ℹ️ Please select a territory and godown for this product. Products are directly added to the selected godown.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mounted && userIsSalesman && currentUser?.territoryName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Territory
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={currentUser.territoryName}
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 text-gray-700 cursor-not-allowed focus:outline-none"
                            />
                          </div>
                        )}
                        {mounted && userIsManager && currentUser?.territoryName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Territory
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={currentUser.territoryName}
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 text-gray-700 cursor-not-allowed focus:outline-none"
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            required
                            className={`w-full border ${
                              fieldErrors.name ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              if (fieldErrors.name) {
                                const error = validateName(e.target.value, 'Product name');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  name: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validateName(e.target.value, 'Product name');
                              setFieldErrors(prev => ({
                                ...prev,
                                name: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.name} />
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
                            className={`w-full border ${
                              fieldErrors.unitPrice ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.unitPrice}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, unitPrice: value });
                              if (fieldErrors.unitPrice) {
                                const error = validatePrice(value, 'Unit price');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  unitPrice: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validatePrice(formData.unitPrice, 'Unit price');
                              setFieldErrors(prev => ({
                                ...prev,
                                unitPrice: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.unitPrice} />
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
                            className={`w-full border ${
                              fieldErrors.costPrice ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.costPrice}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, costPrice: value });
                              if (fieldErrors.costPrice) {
                                const error = validatePrice(value, 'Cost price');
                                setFieldErrors(prev => ({
                                  ...prev,
                                  costPrice: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validatePrice(formData.costPrice, 'Cost price');
                              setFieldErrors(prev => ({
                                ...prev,
                                costPrice: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.costPrice} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            className={`w-full border ${
                              fieldErrors.stock ? 'border-red-300' : 'border-gray-300'
                            } rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                            value={formData.stock}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setFormData({ ...formData, stock: value });
                              if (fieldErrors.stock) {
                                const error = validateStock(value);
                                setFieldErrors(prev => ({
                                  ...prev,
                                  stock: error || undefined,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const error = validateStock(formData.stock);
                              setFieldErrors(prev => ({
                                ...prev,
                                stock: error || undefined,
                              }));
                            }}
                          />
                          <ValidationError error={fieldErrors.stock} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Origin (Country)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Bangladesh, China, Thailand"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.origin || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                origin: e.target.value,
                              })
                            }
                          />
                        </div>
                        {mounted && userIsAdmin && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Territory *
                            </label>
                            <select
                              required
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={formData.territoryId || ''}
                              onChange={(e) => {
                                const newTerritoryId = e.target.value ? parseInt(e.target.value) : undefined;
                                setFormData({
                                  ...formData,
                                  territoryId: newTerritoryId,
                                  godownId: undefined, // Reset godown when territory changes
                                });
                                filterGodownsByTerritory(godowns, newTerritoryId);
                              }}
                            >
                              <option value="">Select a territory</option>
                              {loadingTerritories ? (
                                <option value="" disabled>Loading territories...</option>
                              ) : (
                                territories.map((territory) => (
                                  <option key={territory.id} value={territory.id}>
                                    {territory.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        )}
                        {(mounted && (userIsAdmin || userIsManager || userIsSalesman)) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Godown *
                            </label>
                            <select
                              required
                              className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              value={formData.godownId || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  godownId: e.target.value ? parseInt(e.target.value) : undefined,
                                })
                              }
                              disabled={loadingGodowns || (userIsAdmin && !formData.territoryId)}
                            >
                              <option value="">
                                {loadingGodowns 
                                  ? 'Loading godowns...' 
                                  : (userIsAdmin && !formData.territoryId)
                                  ? 'Please select a territory first'
                                  : filteredGodowns.length === 0
                                  ? 'No godowns available'
                                  : 'Select a godown'}
                              </option>
                              {filteredGodowns.map((godown) => (
                                <option key={godown.id} value={godown.id}>
                                  {godown.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
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
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                      <Button
                        type="submit"
                        disabled={uploadingImage}
                        isLoading={uploadingImage}
                        icon={Plus}
                        iconPosition="left"
                        className="w-full sm:ml-3 sm:w-auto"
                      >
                        Create Product
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
