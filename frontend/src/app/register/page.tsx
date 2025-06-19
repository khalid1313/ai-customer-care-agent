'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // Multi-step registration
  
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateStep1 = () => {
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (formData.businessName.length < 2) {
      setError('Business name must be at least 2 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim()) {
      setError('Your name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    setError('');

    const success = await register(
      formData.email,
      formData.password,
      formData.name,
      formData.businessName
    );
    
    if (success) {
      router.push('/'); // Go to dashboard
    } else {
      setError('Registration failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Customer Care
          </h1>
          <p className="text-gray-600 mt-2">Start your free trial today</p>
        </div>

        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Tell us about your business</h2>
                <p className="text-sm text-gray-600 mt-1">We'll customize your experience</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  type="text"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  placeholder="Acme Corp, TechStart Inc, etc."
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500">This will be your workspace name</p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4">
                <div className="p-3 rounded-lg bg-blue-50 text-center">
                  <div className="text-2xl mb-1">🛍️</div>
                  <div className="text-xs font-medium text-blue-900">E-commerce</div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 text-center">
                  <div className="text-2xl mb-1">💼</div>
                  <div className="text-xs font-medium text-purple-900">B2B Services</div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-center">
                  <div className="text-2xl mb-1">🏥</div>
                  <div className="text-xs font-medium text-green-900">Healthcare</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 text-center">
                  <div className="text-2xl mb-1">🎓</div>
                  <div className="text-xs font-medium text-orange-900">Education</div>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
                <p className="text-sm text-gray-600 mt-1">You'll be the business owner</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Smith"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@acmecorp.com"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimum 6 characters"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Repeat your password"
                  required
                  className="h-11"
                />
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-11"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500">
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <span>✅</span>
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>🔒</span>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>⚡</span>
            <span>Setup in 5 minutes</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span>💬</span>
            <span>24/7 AI support</span>
          </div>
        </div>
      </div>
    </div>
  );
}