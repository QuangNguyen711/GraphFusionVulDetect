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
import { Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from "@/i18n";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, updateProfile } = useAuth();
  const t = useT();
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

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.full_name.trim()) {
      toast.error(t('Enter your full name.'));
      return;
    }

    if (!formData.username.trim()) {
      toast.error(t('Enter a username.'));
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

  const row = "flex items-baseline justify-between gap-6 border-b border-rule py-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Profile")}</DialogTitle>
          <DialogDescription>{t("View and edit your account details.")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.avatar} alt="" className="object-cover" />
            <AvatarFallback className="bg-paper-3 text-lg text-ink">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base text-ink">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
              {t("Edit")}
            </Button>
          )}
        </div>

        <section aria-labelledby="profile-details" className="mt-2">
          <h3 id="profile-details" className="text-sm text-muted-foreground">{t("Details")}</h3>
          {isEditing ? (
            <div className="mt-2 grid gap-4 border-t border-rule pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">{t("Full name")}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder={t("Your full name")}
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="username">{t("Username")}</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bio">{t("Bio")}</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder={t("A line or two about you")}
                />
              </div>
            </div>
          ) : (
            <dl className="mt-2 border-t border-rule">
              <div className={row}><dt className="text-muted-foreground">{t("Full name")}</dt><dd className="text-right text-ink">{user.full_name || user.name || t('Not set')}</dd></div>
              <div className={row}><dt className="text-muted-foreground">{t("Username")}</dt><dd className="text-right text-ink">{user.username || t('Not set')}</dd></div>
              <div className={row}><dt className="text-muted-foreground">{t("Email")}</dt><dd className="min-w-0 break-all text-right text-ink">{user.email}</dd></div>
              <div className={row}><dt className="text-muted-foreground">{t("Bio")}</dt><dd className={`text-right ${user.bio ? 'text-ink' : 'text-muted-foreground'}`}>{user.bio || t('No bio yet')}</dd></div>
            </dl>
          )}
        </section>

        <section aria-labelledby="profile-account" className="mt-2">
          <h3 id="profile-account" className="text-sm text-muted-foreground">{t("Account")}</h3>
          <dl className="mt-2 border-t border-rule">
            <div className={row}><dt className="text-muted-foreground">{t("Account ID")}</dt><dd className="code-text min-w-0 break-all text-right text-xs text-ink-2">{user.id}</dd></div>
            <div className={row}><dt className="text-muted-foreground">{t("Created")}</dt><dd className="measured text-right text-ink">{formatDate(user.created_at)}</dd></div>
            <div className={row}><dt className="text-muted-foreground">{t("Last sign-in")}</dt><dd className="measured text-right text-ink">{formatDate(user.last_login)}</dd></div>
          </dl>
        </section>

        <DialogFooter className="gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
                <X className="h-4 w-4" />
                {t("Cancel")}
              </Button>
              <Button onClick={handleSaveProfile} disabled={isUpdating} aria-busy={isUpdating}>
                <Save className="h-4 w-4" />
                {isUpdating ? t('Saving…') : t('Save changes')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("Close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
