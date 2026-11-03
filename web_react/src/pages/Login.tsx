import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      toast.success('Đăng nhập thành công!');
      navigate('/analysis');
    } else {
      setError('Email hoặc mật khẩu không đúng');
      toast.error('Đăng nhập thất bại');
    }
  };

  return (
    <AuthLayout title="Đăng nhập" description="Nhập thông tin đăng nhập để truy cập hệ thống">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full" aria-busy={isLoading}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="keep-motion h-4 w-4 animate-spin" />
                  Đang đăng nhập…
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            <div className="border-t border-rule pt-5">
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{' '}
                <Link
                  to="/register"
                  className="text-ink underline decoration-rule-2 underline-offset-4 transition-colors duration-200 hover:text-signal hover:decoration-signal"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </form>
    </AuthLayout>
  );
};

export default Login;
