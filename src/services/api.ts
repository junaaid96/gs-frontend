import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, LoginRequest, LoginResponse, Product, ProductRequest, StockTransferRequest } from '@/types';

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
  async getProducts(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/products');
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

  // Godown
  async getGodownStock(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/godown');
    return response.data;
  }

  async getGodownStockWithQuantity(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/godown/with-stock');
    return response.data;
  }

  async getGodownStockByProductId(productId: number): Promise<ApiResponse<Product>> {
    const response = await this.client.get(`/godown/${productId}`);
    return response.data;
  }

  // Shop
  async getShopStock(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/shop');
    return response.data;
  }

  async getShopStockWithQuantity(): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get('/shop/with-stock');
    return response.data;
  }

  async getShopStockByProductId(productId: number): Promise<ApiResponse<Product>> {
    const response = await this.client.get(`/shop/${productId}`);
    return response.data;
  }

  async transferStockToShop(request: StockTransferRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.post('/shop/transfer', request);
    return response.data;
  }
}

export const apiService = new ApiService();

