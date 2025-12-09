//src\pages\Auth.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Authentication page component
 * Handles both login and signup flows with proper error handling and loading states
 */
const Auth = () => {
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Password reset states
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');

  // Hooks
  const { signIn, signUp, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Check if this is admin login
  const isAdminMode = searchParams.get('admin') === 'true';

  /**
   * Redirect authenticated users to appropriate dashboard
   */
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('🔄 User authenticated, redirecting...', { isAdmin, isAdminMode });
      
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isAdminMode) {
        // If they're trying to access admin but aren't admin, show error
        setError('You do not have admin privileges');
        return;
      } else {
        navigate('/customer-dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, loading, navigate, isAdminMode]);

  /**
   * Reset form fields
   */
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setConfirmPassword('');
    setError('');
    setResetCode('');
    setNewPassword('');
    setResetStep('request');
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setActionLoading(false);
      return;
    }

    try {
      console.log('🔑 Submitting login form for:', email);
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('❌ Login failed:', error);
        setError(error.message || 'Login failed');
        setActionLoading(false);
        return;
      }

      console.log('✅ Login successful, showing success message');
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Note: Redirect will be handled by useEffect when auth state updates
    } catch (error: any) {
      console.error('💥 Login exception:', error);
      setError('An unexpected error occurred');
      setActionLoading(false);
    }
  };

  /**
   * Handle signup form submission
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    // Validation
    if (!email || !password || !confirmPassword || !fullName || !phone) {
      setError('Please fill in all fields');
      setActionLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setActionLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setActionLoading(false);
      return;
    }

    try {
      console.log('📝 Submitting signup form for:', email);
      const { error } = await signUp(email, password, fullName, phone);
      
      if (error) {
        console.error('❌ Signup failed:', error);
        setError(error.message || 'Signup failed');
        setActionLoading(false);
        return;
      }

      console.log('✅ Signup successful');
      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });

      resetForm();
      setActiveTab('login');
      setActionLoading(false);
    } catch (error: any) {
      console.error('💥 Signup exception:', error);
      setError('An unexpected error occurred');
      setActionLoading(false);
    }
  };

  /**
   * Handle forgot password - request reset code
   */
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    if (!email || !phone) {
      setError('Please enter both email and phone number');
      setActionLoading(false);
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Use secure function to verify email/phone and generate reset code
      const { data, error: rpcError } = await supabase
        .rpc('request_password_reset', {
          user_email: email.trim(),
          user_phone: phone.trim()
        });

      if (rpcError) {
        console.error('Reset request RPC error:', rpcError);
        setError('Failed to process reset request');
        setActionLoading(false);
        return;
      }

      // data is an array with one result
      const result = data?.[0];
      
      if (!result?.success) {
        setError(result?.error_message || 'Email and phone number do not match our records');
        setActionLoading(false);
        return;
      }

      toast({
        title: "Reset code generated",
        description: `Your reset code is: ${result.reset_code}. It expires in 15 minutes.`,
        duration: 10000,
      });

      setResetStep('verify');
      setActionLoading(false);
    } catch (error: any) {
      console.error('Reset request error:', error);
      setError('An unexpected error occurred');
      setActionLoading(false);
    }
  };

  /**
   * Handle password reset with code verification
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    if (!resetCode || !newPassword) {
      setError('Please enter reset code and new password');
      setActionLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setActionLoading(false);
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call edge function to securely reset password
      const { data, error: functionError } = await supabase.functions.invoke('reset-password', {
        body: {
          email: email.trim(),
          phone: phone.trim(),
          code: resetCode.trim(),
          newPassword: newPassword
        }
      });

      if (functionError) {
        console.error('Reset password function error:', functionError);
        setError('Failed to reset password. Please try again.');
        setActionLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setActionLoading(false);
        return;
      }

      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });

      resetForm();
      setActiveTab('login');
      setActionLoading(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('An unexpected error occurred');
      setActionLoading(false);
    }
  };

  // Show loading during auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, let useEffect handle the redirect
  if (!loading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            {isAdminMode ? <Shield className="h-6 w-6 text-white" /> : <User className="h-6 w-6 text-white" />}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isAdminMode ? 'Admin Portal' : 'Welcome'}
          </CardTitle>
          <CardDescription>
            {isAdminMode ? 'Sign in to access the admin dashboard' : 'Sign in to your account or create a new one'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    disabled={actionLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    disabled={actionLoading}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={actionLoading}>
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {actionLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    disabled={actionLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    disabled={actionLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="Enter your phone number"
                    disabled={actionLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Create a password"
                    disabled={actionLoading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    disabled={actionLoading}
                    minLength={6}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={actionLoading}>
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {actionLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="reset">
              {resetStep === 'request' ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-phone">Phone Number</Label>
                    <Input
                      id="reset-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Enter your phone number"
                      disabled={actionLoading}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={actionLoading}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {actionLoading ? 'Generating Code...' : 'Get Reset Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-code">Reset Code</Label>
                    <Input
                      id="reset-code"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      placeholder="Enter 6-digit code"
                      disabled={actionLoading}
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      disabled={actionLoading}
                      minLength={6}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Button type="submit" className="w-full" disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {actionLoading ? 'Resetting Password...' : 'Reset Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setResetStep('request')}
                      disabled={actionLoading}
                    >
                      Back to Request Code
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center space-y-2">
            {!isAdminMode && (
              <Button
                variant="link"
                onClick={() => navigate('/auth?admin=true')}
                className="text-sm text-gray-600"
              >
                Admin Login →
              </Button>
            )}
            <div>
              <Button
                variant="link"
                onClick={() => navigate('/')}
                className="text-sm text-gray-600"
              >
                ← Back to main site
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;