'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { setAuthToken, setUser, isAuthenticated } from '@/utils/auth';
import { LoginRequest, Territory, UserRole } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { showToast } from '@/components/Toast';
import Button from '@/components/Button';
import { LogIn, ArrowLeft, ArrowRight } from 'lucide-react';
import { ValidationError } from '@/components/ValidationError';
import { validateUsername, validatePassword, parseValidationErrors, getGeneralError, ValidationErrors } from '@/utils/validation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showTerritorySelection, setShowTerritorySelection] = useState(false);
  const [availableTerritories, setAvailableTerritories] = useState<Territory[]>([]);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<number | undefined>();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFieldErrors({});

    // Client-side validation
    const usernameError = validateUsername(formData.username);
    const passwordError = validatePassword(formData.password);
    
    if (usernameError || passwordError) {
      setFieldErrors({
        username: usernameError || undefined,
        password: passwordError || undefined,
      });
      return;
    }

    setLoading(true);

    try {
      const loginRequest: LoginRequest = {
        ...formData,
        territoryId: selectedTerritoryId,
      };
      
      const response = await apiService.login(loginRequest);
      if (response.success && response.data) {
        // Check if territory selection is needed (for managers with multiple territories)
        if (response.data.role === UserRole.MANAGER && 
            response.data.availableTerritories && 
            response.data.availableTerritories.length > 1 &&
            !selectedTerritoryId) {
          setAvailableTerritories(response.data.availableTerritories);
          setShowTerritorySelection(true);
          setLoading(false);
          return;
        }

        setAuthToken(response.data.token);
        setUser(response.data);
        showToast('Login successful!', 'success');
        router.push('/dashboard');
      } else {
        const errorMsg = response.message || 'Login failed';
        setErrors({ _general: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      const validationErrors = parseValidationErrors(err);
      setErrors(validationErrors);
      
      // Extract field-specific errors
      if (validationErrors.username) {
        setFieldErrors(prev => ({ ...prev, username: validationErrors.username }));
      }
      if (validationErrors.password) {
        setFieldErrors(prev => ({ ...prev, password: validationErrors.password }));
      }
      
      const errorMsg = getGeneralError(validationErrors) || 'Invalid username or password';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTerritorySelect = async () => {
    if (!selectedTerritoryId) {
      setErrors({ _general: 'Please select a territory' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const loginRequest: LoginRequest = {
        ...formData,
        territoryId: selectedTerritoryId,
      };
      
      const response = await apiService.login(loginRequest);
      if (response.success && response.data) {
        setAuthToken(response.data.token);
        setUser(response.data);
        showToast('Login successful!', 'success');
        router.push('/dashboard');
      } else {
        const errorMsg = response.message || 'Login failed';
        setErrors({ _general: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      const validationErrors = parseValidationErrors(err);
      setErrors(validationErrors);
      const errorMsg = getGeneralError(validationErrors) || 'Invalid username or password';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Global Sanitary Bazar
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Stock Management System
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Sign in to your account to continue
            </p>
          </div>

          {showTerritorySelection ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select Territory
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please select a territory to continue
                </p>
              </div>

              {getGeneralError(errors) && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{getGeneralError(errors)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="territory"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Territory
                </label>
                <select
                  id="territory"
                  value={selectedTerritoryId || ''}
                  onChange={(e) => setSelectedTerritoryId(Number(e.target.value))}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  required
                >
                  <option value="">Select a territory</option>
                  {availableTerritories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowTerritorySelection(false);
                    setSelectedTerritoryId(undefined);
                    setAvailableTerritories([]);
                  }}
                  variant="outline"
                  icon={ArrowLeft}
                  iconPosition="left"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleTerritorySelect}
                  disabled={loading || !selectedTerritoryId}
                  isLoading={loading}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {getGeneralError(errors) && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{getGeneralError(errors)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className={`appearance-none relative block w-full px-4 py-3 border ${
                      fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 transition-colors`}
                    placeholder="Enter your username"
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
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className={`appearance-none relative block w-full px-4 py-3 border ${
                      fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 transition-colors`}
                    placeholder="Enter your password"
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
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  isLoading={loading}
                  icon={LogIn}
                  iconPosition="left"
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

