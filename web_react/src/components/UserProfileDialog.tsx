import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Edit, 
  Save, 
  X, 
  Shield,
  Hash,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
  });

  // Initialize form data when dialog opens or user changes
  useEffect(() => {
    if (user && open) {
      setFormData({
        full_name: user.full_name || user.name || '',
        username: user.username || '',
        bio: user.bio || '',
      });
    }
  }, [user, open]);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa cập nhật';
    
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Không xác định';
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Họ và tên không được để trống');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Tên đăng nhập không được để trống');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateProfile({
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
      });

      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Update profile error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      full_name: user.full_name || user.name || '',
      username: user.username || '',
      bio: user.bio || '',
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Thông tin cá nhân
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            )}
          </div>
          <DialogDescription>
            Xem và chỉnh sửa thông tin tài khoản của bạn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage 
                src={user.avatar} 
                alt={user.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-2xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          <Separator />

          {/* Profile Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cá nhân
            </h4>

            <div className="grid gap-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Họ và tên
                </Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Nhập họ và tên"
                    className="w-full"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-md">
                    {user.full_name || user.name || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tên đăng nhập
                </Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-md">
                    {user.username || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="p-3 bg-muted/50 rounded-md flex items-center justify-between">
                  <span>{user.email}</span>
                  <Badge variant="secondary">Đã xác thực</Badge>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Giới thiệu
                </Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Viết vài dòng giới thiệu về bản thân"
                    className="w-full min-h-[80px] resize-none"
                  />
                ) : (
                  <div className="p-3 bg-muted/50 rounded-md min-h-[80px]">
                    {user.bio || 'Chưa có giới thiệu'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Thông tin tài khoản
            </h4>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">ID tài khoản</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">
                  {user.id}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Ngày tạo</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(user.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lần đăng nhập cuối</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(user.last_login)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Hủy
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2"
            >
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
