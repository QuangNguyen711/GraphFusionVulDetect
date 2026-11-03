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

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const t = useT();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError(t('Enter your name.'));
      return false;
    }

    if (!formData.email) {
      setError(t('Enter your email.'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('That email looks incomplete. Write it as name@example.com.'));
      return false;
    }

    if (formData.password.length < 6) {
      setError(t('The password needs at least 6 characters.'));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('The two passwords do not match.'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    const success = await register(formData.name, formData.email, formData.password);
    
    if (success) {
      toast.success(t('Account created'));
      navigate(readPreferences().startPage);
    } else {
      setError(t('The account could not be created. The email may already be in use.'));
      toast.error(t('Sign-up failed'));
    }
  };

  return (
    <AuthLayout title={t("Create an account")} description={t("Scan Solidity contracts and keep every result in a project.")}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("Name")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t("Your name")}
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t("At least 6 characters")}
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("Confirm password")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t("Same as above")}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t("Hide password") : t("Show password")}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
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
                  {t("Creating account…")}
                </>
              ) : (
                t('Create account')
              )}
            </Button>

            <div className="border-t border-rule pt-5">
              <p className="text-sm text-muted-foreground">
                {t('Already have an account?')}{' '}
                <Link
                  to="/login"
                  className="text-ink underline decoration-rule-2 underline-offset-4 transition-colors duration-200 hover:text-signal hover:decoration-signal"
                >
                  {t("Sign in")}
                </Link>
              </p>
            </div>
          </form>
    </AuthLayout>
  );
};

export default Register;
