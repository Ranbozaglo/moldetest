import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      if (result.success) {
        console.log('🔍 DEBUG: Sign in successful, user:', result.user);
        
        // Small delay to ensure state is updated properly
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect based on user role with direct paths
        if (result.user.is_admin || result.user.role === 'admin') {
          console.log('🔍 PROD DEBUG: SignIn - Redirecting admin user to AdminDashboard');
          console.log('🔍 PROD DEBUG: SignIn - Current location before navigation:', window.location.href);
          try {
            navigate('/AdminDashboard', { replace: true });
            console.log('🔍 PROD DEBUG: SignIn - Navigate to AdminDashboard called successfully');
          } catch (navError) {
            console.error('🔍 PROD DEBUG: SignIn - Navigation error to AdminDashboard:', navError);
            // Fallback navigation
            console.log('🔍 PROD DEBUG: SignIn - Using fallback window.location redirect');
            window.location.href = '/AdminDashboard';
          }
        } else {
          console.log('🔍 PROD DEBUG: SignIn - Redirecting regular user to Inspection');
          console.log('🔍 PROD DEBUG: SignIn - Current location before navigation:', window.location.href);
          try {
            navigate('/Inspection', { replace: true });
            console.log('🔍 PROD DEBUG: SignIn - Navigate to Inspection called successfully');
          } catch (navError) {
            console.error('🔍 PROD DEBUG: SignIn - Navigation error to Inspection:', navError);
            // Fallback navigation
            console.log('🔍 PROD DEBUG: SignIn - Using fallback window.location redirect');
            window.location.href = '/Inspection';
          }
        }
      } else {
        console.error('🔍 DEBUG: Sign in failed:', result.error);
        setError(result.error || 'Sign in failed');
      }
    } catch (error) {
      console.error('🔍 DEBUG: Sign in exception:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-900 rounded-full flex items-center justify-center mb-4">
              <img 
                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logos.png" 
                alt="Mold Testing Houston Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-600">
              Sign in to your Mold Testing Houston account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="text-center">
              <p className="text-slate-600 text-sm">
                Don't have an account?{' '}
                <Link
                  to={createPageUrl('SignUp')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
            
            <div className="text-center">
              <Link
                to={createPageUrl('Welcome')}
                className="text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 