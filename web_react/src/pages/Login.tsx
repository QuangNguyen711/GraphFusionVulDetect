import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/AuthLayout';
import { readPreferences } from '@/lib/preferences';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from "@/i18n";

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('Enter your email and password.'));
      return;
    }

    if (password.length < 6) {
      setError(t('The password needs at least 6 characters.'));
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      toast.success(t('Signed in'));
      navigate(readPreferences().startPage);
    } else {
      setError(t('That email and password do not match an account.'));
      toast.error(t('Sign-in failed'));
    }
  };

  return (
    <AuthLayout title={t("Sign in")} description={t("Use your account to open your projects and analyses.")}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
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
              <Label htmlFor="password">{t("Password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t("At least 6 characters")}
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
                  aria-label={showPassword ? t("Hide password") : t("Show password")}
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
                  {t("Signing in…")}
                </>
              ) : (
                t('Sign in')
              )}
            </Button>

            <div className="border-t border-rule pt-5">
              <p className="text-sm text-muted-foreground">
                {t('No account yet?')}{' '}
                <Link
                  to="/register"
                  className="text-ink underline decoration-rule-2 underline-offset-4 transition-colors duration-200 hover:text-signal hover:decoration-signal"
                >
                  {t("Create one")}
                </Link>
              </p>
            </div>
          </form>
    </AuthLayout>
  );
};

export default Login;
