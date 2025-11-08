'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiService } from '@/services/api';
import { Product, LoginResponse } from '@/types';
import { getUser, isAdmin } from '@/utils/auth';
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
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    setUser(currentUser);
    setUserIsAdmin(isAdmin());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadStats();
    }
  }, [mounted]);

  const loadStats = async () => {
    try {
      const [productsRes, godownRes, shopRes] = await Promise.all([
        apiService.getProducts(),
        apiService.getGodownStock(),
        apiService.getShopStock(),
      ]);

      const products = productsRes.data || [];
      const godown = godownRes.data || [];
      const shop = shopRes.data || [];

      setStats({
        totalProducts: products.length,
        pendingProducts: products.filter((p) => p.status === 'PENDING').length,
        approvedProducts: products.filter((p) => p.status === 'APPROVED').length,
        godownStock: godown.reduce((sum, p) => sum + (p.godownStock || 0), 0),
        shopStock: shop.reduce((sum, p) => sum + (p.shopStock || 0), 0),
      });
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 md:p-8 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {mounted && user ? `Welcome back, ${user.username}!` : 'Welcome!'}
            </h1>
            <p className="text-indigo-100 text-sm md:text-base">
              Here's an overview of your inventory and stock management
            </p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
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
              
              {userIsAdmin && (
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
                href="/godown"
              />
              
              <StatCard
                title="Shop Stock"
                value={stats.shopStock}
                icon="🏪"
                color="#8b5cf6"
                bgColor="bg-purple-100"
                href="/shop"
              />
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

