import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Settings, LogOut, Shield, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import UserProfileDialog from './UserProfileDialog';
import SettingsDialog from './SettingsDialog';
import SecurityDialog from './SecurityDialog';
import { useT } from "@/i18n";

const UserProfile = () => {
  const { user, logout } = useAuth();
  const t = useT();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('Signed out'));
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('Sign-out failed'));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('Not set');
    
    try {
      return new Date(dateString).toLocaleDateString(t.locale, {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return t('Unknown');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          aria-label={t("Account")}
          className="relative h-10 w-10 rounded-full p-0"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={user.avatar} 
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-paper-3 text-sm text-ink">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={user.avatar} 
                  alt={user.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-paper-3 text-base text-ink">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  @{user.username}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{user.email}</span>
            </div>
            {user.last_login && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t('Last sign-in: {d}', { d: formatDate(user.last_login) })}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setShowProfileDialog(true)}
        >
          <User className="mr-2 h-4 w-4" />
          <span>{t('Profile')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => setShowSettings(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('Settings')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => setShowSecurity(true)}>
          <Shield className="mr-2 h-4 w-4" />
          <span>{t('Security')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer text-bad focus:text-bad"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('Sign out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <UserProfileDialog 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
      />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <SecurityDialog open={showSecurity} onOpenChange={setShowSecurity} />
    </DropdownMenu>
  );
};

export default UserProfile;
