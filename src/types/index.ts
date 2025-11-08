export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
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
  enabled: boolean;
  shopId?: number;
  shopName?: string;
  territoryId?: number;
  territoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  territoryId?: number;
}

export interface Territory {
  id: number;
  name: string;
  description?: string;
  managerId?: number;
  managerName?: string;
  shops?: Shop[];
  godowns?: Godown[];
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: number;
  name: string;
  address?: string;
  contactNumber?: string;
  territoryId: number;
  territoryName?: string;
  salesmen?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Godown {
  id: number;
  name: string;
  address?: string;
  contactNumber?: string;
  territoryId: number;
  territoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
  userId: number;
  territoryId?: number;
  territoryName?: string;
  shopId?: number;
  shopName?: string;
  availableTerritories?: Territory[];
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
  origin?: string;
  territoryId?: number;
  territoryName?: string;
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
  origin?: string;
  territoryId?: number;
  godownId?: number;
}

export interface StockTransferRequest {
  productId: number;
  quantity: number;
  shopId: number;
  godownId: number;
}

export interface TerritoryRequest {
  name: string;
  description?: string;
  managerId?: number;
}

export interface ShopRequest {
  name: string;
  address?: string;
  contactNumber?: string;
  territoryId: number;
}

export interface GodownRequest {
  name: string;
  address?: string;
  contactNumber?: string;
  territoryId: number;
}

export interface UserRequest {
  username: string;
  password: string;
  role: UserRole;
  shopId?: number;
  territoryId?: number;
}

export interface UpdateUserRequest {
  password?: string;
  enabled: boolean;
  shopId?: number;
  territoryId?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

