export enum UserRole {
  ADMIN = 'ADMIN',
  SALESMAN = 'SALESMAN'
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
  userId: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  unitPrice: number;
  costPrice: number;
  profitPerUnit: number;
  stock: number;
  status: ProductStatus;
  createdBy: string;
  createdById: number;
  godownStock?: number;
  shopStock?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRequest {
  name: string;
  description?: string;
  unitPrice: number;
  costPrice: number;
  stock: number;
  imageUrl?: string;
}

export interface StockTransferRequest {
  productId: number;
  quantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

