import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import { Shield } from 'lucide-react';

const Header = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo và tên ứng dụng */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-foreground">GraphFusion</h1>
              <p className="text-xs text-muted-foreground">Vulnerability Detector</p>
            </div>
          </Link>

          {/* Navigation links (có thể thêm sau) */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Trang chủ
            </Link>
            <Link 
              to="/analysis" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Phân tích
            </Link>
          </nav>

          {/* User Profile */}
          <div className="flex items-center">
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
