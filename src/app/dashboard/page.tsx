'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product, LoginResponse, UserRole } from '@/types';
import { getUser, isAdmin, isManager, isSalesman } from '@/utils/auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { StatCardSkeleton } from '@/components/SkeletonLoader';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  href?: string;
}

function StatCard({ title, value, icon, color, bgColor, href }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    godownStock: 0,
    shopStock: 0,
    totalTerritories: 0,
    totalShops: 0,
    totalManagers: 0,
    totalSalesmen: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [userIsManager, setUserIsManager] = useState(false);
  const [userIsSalesman, setUserIsSalesman] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    setUserIsAdmin(isAdmin());
    setUserIsManager(isManager());
    setUserIsSalesman(isSalesman());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadStats();
    }
  }, [mounted]);

  const loadStats = async () => {
    try {
      const user = getUser();
      const userRole = user?.role;
      
      let productsRes, territoriesRes, shopsRes, usersRes, godownStock = 0, shopStock = 0;

      if (userRole === UserRole.ADMIN) {
        // Admin can see everything
        [productsRes, territoriesRes, shopsRes, usersRes] = await Promise.all([
          apiService.getProducts(),
          apiService.getTerritories(),
          apiService.getShops(),
          apiService.getUsers(),
        ]);

        const territories = territoriesRes.data || [];
        const shops = shopsRes.data || [];
        const users = usersRes.data || [];

        // Get godown stock
        try {
          const godownsRes = await apiService.getGodowns();
          if (godownsRes.data && godownsRes.data.length > 0) {
            const godownStockRes = await apiService.getGodownStockWithQuantity(godownsRes.data[0].id);
            godownStock = godownStockRes.data.reduce((sum, p) => sum + (p.godownStock || 0), 0);
          }
        } catch (error) {
          console.error('Error loading godown stock:', error);
        }

        // Get shop stock
        try {
          if (shops.length > 0) {
            const shopStockRes = await apiService.getShopStockWithQuantity(shops[0].id);
            shopStock = shopStockRes.data.reduce((sum, p) => sum + (p.shopStock || 0), 0);
          }
        } catch (error) {
          console.error('Error loading shop stock:', error);
        }

        const products = productsRes.data || [];
        setStats({
          totalProducts: products.length,
          pendingProducts: products.filter((p) => p.status === 'PENDING').length,
          approvedProducts: products.filter((p) => p.status === 'APPROVED').length,
          godownStock,
          shopStock,
          totalTerritories: territories.length,
          totalShops: shops.length,
          totalManagers: users.filter((u) => u.role === UserRole.MANAGER).length,
          totalSalesmen: users.filter((u) => u.role === UserRole.SALESMAN).length,
        });
      } else if (userRole === UserRole.MANAGER) {
        // Manager sees their territory stats
        [productsRes, shopsRes] = await Promise.all([
          apiService.getProducts(),
          apiService.getShops(),
        ]);

        const products = productsRes.data || [];
        const shops = shopsRes.data || [];

        // Get godown stock for manager's territory
        try {
          const godownsRes = await apiService.getGodowns();
          if (godownsRes.data && godownsRes.data.length > 0) {
            const godownStockRes = await apiService.getGodownStockWithQuantity(godownsRes.data[0].id);
            godownStock = godownStockRes.data.reduce((sum, p) => sum + (p.godownStock || 0), 0);
          }
        } catch (error) {
          console.error('Error loading godown stock:', error);
        }

        // Get shop stock for manager's territory
        try {
          if (shops.length > 0) {
            const shopStockRes = await apiService.getShopStockWithQuantity(shops[0].id);
            shopStock = shopStockRes.data.reduce((sum, p) => sum + (p.shopStock || 0), 0);
          }
        } catch (error) {
          console.error('Error loading shop stock:', error);
        }

        setStats({
          totalProducts: products.length,
          pendingProducts: products.filter((p) => p.status === 'PENDING').length,
          approvedProducts: products.filter((p) => p.status === 'APPROVED').length,
          godownStock,
          shopStock,
          totalTerritories: 1, // Manager has one territory
          totalShops: shops.length,
          totalManagers: 0,
          totalSalesmen: 0,
        });
      } else if (userRole === UserRole.SALESMAN) {
        // Salesman sees their shop stats
        productsRes = await apiService.getProducts();
        const products = productsRes.data || [];

        if (user?.shopId) {
          try {
            const shopStockRes = await apiService.getShopStock(user.shopId);
            shopStock = shopStockRes.data.reduce((sum, p) => sum + (p.shopStock || 0), 0);
          } catch (error) {
            console.error('Error loading shop stock:', error);
          }
        }

        // Get godown stock from their territory
        try {
          const godownsRes = await apiService.getGodowns();
          if (godownsRes.data && godownsRes.data.length > 0) {
            const godownStockRes = await apiService.getGodownStockWithQuantity(godownsRes.data[0].id);
            godownStock = godownStockRes.data.reduce((sum, p) => sum + (p.godownStock || 0), 0);
          }
        } catch (error) {
          console.error('Error loading godown stock:', error);
        }

        setStats({
          totalProducts: products.length,
          pendingProducts: products.filter((p) => p.status === 'PENDING').length,
          approvedProducts: products.filter((p) => p.status === 'APPROVED').length,
          godownStock,
          shopStock,
          totalTerritories: user?.territoryId ? 1 : 0, // Salesman belongs to one territory
          totalShops: user?.shopId ? 1 : 0, // Salesman works at one shop
          totalManagers: 0,
          totalSalesmen: 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {mounted && user ? `Welcome back, ${user.username}!` : 'Welcome!'}
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              {mounted && userIsManager && user?.territoryName ? (
                <>Managing <span className="font-semibold text-gray-900">{user.territoryName}</span> territory</>
              ) : mounted && userIsSalesman && user?.shopName ? (
                <>Working at <span className="font-semibold text-gray-900">{user.shopName}</span>{user?.territoryName && <> in <span className="font-semibold text-gray-900">{user.territoryName}</span> territory</>}</>
              ) : (
                "Monitor your inventory, track stock levels, and manage your operations efficiently"
              )}
            </p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(userIsAdmin ? 8 : 5)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Total Products"
                value={stats.totalProducts}
                icon="📦"
                color="#4f46e5"
                bgColor="bg-indigo-100"
                href="/products"
              />
              
              {(userIsAdmin || userIsManager) && (
                <StatCard
                  title="Pending Approval"
                  value={stats.pendingProducts}
                  icon="⏳"
                  color="#f59e0b"
                  bgColor="bg-yellow-100"
                  href="/products"
                />
              )}
              
              <StatCard
                title="Approved Products"
                value={stats.approvedProducts}
                icon="✅"
                color="#10b981"
                bgColor="bg-green-100"
                href="/products"
              />
              
              <StatCard
                title="Godown Stock"
                value={stats.godownStock}
                icon="🏭"
                color="#3b82f6"
                bgColor="bg-blue-100"
                href="/godowns"
              />
              
              <StatCard
                title="Shop Stock"
                value={stats.shopStock}
                icon="🏪"
                color="#8b5cf6"
                bgColor="bg-purple-100"
                href="/shops"
              />

              {userIsAdmin && (
                <>
                  <StatCard
                    title="Total Territories"
                    value={stats.totalTerritories}
                    icon="🗺️"
                    color="#ec4899"
                    bgColor="bg-pink-100"
                    href="/territories"
                  />
                  
                  <StatCard
                    title="Total Shops"
                    value={stats.totalShops}
                    icon="🏪"
                    color="#f97316"
                    bgColor="bg-orange-100"
                    href="/shops"
                  />
                  
                  <StatCard
                    title="Total Managers"
                    value={stats.totalManagers}
                    icon="👔"
                    color="#06b6d4"
                    bgColor="bg-cyan-100"
                    href="/users"
                  />
                  
                  <StatCard
                    title="Total Salesmen"
                    value={stats.totalSalesmen}
                    icon="👤"
                    color="#84cc16"
                    bgColor="bg-lime-100"
                    href="/users"
                  />
                </>
              )}

              {userIsManager && (
                <>
                  <StatCard
                    title="Total Shops"
                    value={stats.totalShops}
                    icon="🏪"
                    color="#f97316"
                    bgColor="bg-orange-100"
                    href="/shops"
                  />
                </>
              )}

              {userIsSalesman && (
                <>
                  <StatCard
                    title="Territory"
                    value={stats.totalTerritories}
                    icon="🗺️"
                    color="#ec4899"
                    bgColor="bg-pink-100"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

