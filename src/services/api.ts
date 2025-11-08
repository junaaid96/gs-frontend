import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  Product,
  ProductRequest,
  StockTransferRequest,
  Territory,
  TerritoryRequest,
  Shop,
  ShopRequest,
  Godown,
  GodownRequest,
  User,
  UserRequest,
  UpdateUserRequest,
} from '@/types';

const API_BASE_URL = 'http://localhost:8080/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          Cookies.remove('token');
          Cookies.remove('user');
          window.location.href = '/login';
        }
        
        // Enhance error with validation details
        if (error.response?.status === 400 && error.response?.data) {
          // Backend validation errors are already structured
          // Pass them through as-is
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  // Products
  async getProducts(territoryId?: number): Promise<ApiResponse<Product[]>> {
    const params = territoryId ? { territoryId } : {};
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async getPendingProducts(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/products/pending');
    return response.data;
  }

  async getApprovedProducts(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/products/approved');
    return response.data;
  }

  async getMyProducts(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/products/my-products');
    return response.data;
  }

  async getProductById(id: number): Promise<ApiResponse<Product>> {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(product: ProductRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.post('/products', product);
    return response.data;
  }

  async approveProduct(id: number): Promise<ApiResponse<Product>> {
    const response = await this.client.put(`/products/${id}/approve`);
    return response.data;
  }

  async rejectProduct(id: number): Promise<ApiResponse<Product>> {
    const response = await this.client.put(`/products/${id}/reject`);
    return response.data;
  }

  async updateProduct(id: number, product: ProductRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.put(`/products/${id}`, product);
    return response.data;
  }

  // Territories
  async getTerritories(): Promise<ApiResponse<Territory[]>> {
    const response = await this.client.get('/territories');
    return response.data;
  }

  async getTerritoryById(id: number): Promise<ApiResponse<Territory>> {
    const response = await this.client.get(`/territories/${id}`);
    return response.data;
  }

  async createTerritory(territory: TerritoryRequest): Promise<ApiResponse<Territory>> {
    const response = await this.client.post('/territories', territory);
    return response.data;
  }

  async updateTerritory(id: number, territory: TerritoryRequest): Promise<ApiResponse<Territory>> {
    const response = await this.client.put(`/territories/${id}`, territory);
    return response.data;
  }

  // Shops
  async getShops(): Promise<ApiResponse<Shop[]>> {
    const response = await this.client.get('/shops');
    return response.data;
  }

  async getShopById(id: number): Promise<ApiResponse<Shop>> {
    const response = await this.client.get(`/shops/${id}`);
    return response.data;
  }

  async createShop(shop: ShopRequest): Promise<ApiResponse<Shop>> {
    const response = await this.client.post('/shops', shop);
    return response.data;
  }

  async getShopStock(shopId: number): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get(`/shops/${shopId}/stock`);
    return response.data;
  }

  async getShopStockWithQuantity(shopId: number): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get(`/shops/${shopId}/stock/with-quantity`);
    return response.data;
  }

  async transferStockToShop(shopId: number, request: StockTransferRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.post(`/shops/${shopId}/stock/transfer`, request);
    return response.data;
  }

  // Godowns
  async getGodowns(): Promise<ApiResponse<Godown[]>> {
    const response = await this.client.get('/godowns');
    return response.data;
  }

  async getGodownById(id: number): Promise<ApiResponse<Godown>> {
    const response = await this.client.get(`/godowns/${id}`);
    return response.data;
  }

  async createGodown(godown: GodownRequest): Promise<ApiResponse<Godown>> {
    const response = await this.client.post('/godowns', godown);
    return response.data;
  }

  async getGodownStock(godownId: number): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get(`/godowns/${godownId}/stock`);
    return response.data;
  }

  async getGodownStockWithQuantity(godownId: number): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get(`/godowns/${godownId}/stock/with-quantity`);
    return response.data;
  }

  // Users
  async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await this.client.get('/users');
    return response.data;
  }

  async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(user: UserRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post('/users', user);
    return response.data;
  }

  async updateUser(id: number, user: UpdateUserRequest): Promise<ApiResponse<User>> {
    const response = await this.client.put(`/users/${id}`, user);
    return response.data;
  }
}

export const apiService = new ApiService();

