import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/services/auth";
import { useT } from "@/i18n";

interface SecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (t: ReturnType<typeof useT>, value?: string | number | null) => {
  if (!value) return t("Not available");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("Unknown");
  return date.toLocaleString(t.locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const tokenExpiry = () => {
  const token = AuthService.getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const SecurityDialog = ({ open, onOpenChange }: SecurityDialogProps) => {
  const { user, changePassword, logoutAll } = useAuth();
  const t = useT();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") || "");
    const next = String(data.get("next") || "");
    const confirm = String(data.get("confirm") || "");
    setError("");
    if (!current || !next) return setError(t("Enter your current password and a new one."));
    if (next.length < 6) return setError(t("The new password needs at least 6 characters."));
    if (next !== confirm) return setError(t("The two new passwords do not match."));
    if (next === current) return setError(t("The new password must differ from the current one."));

    setSaving(true);
    const failure = await changePassword(current, next);
    setSaving(false);
    if (failure) {
      setError(failure === "Current password is incorrect" ? t("The current password is incorrect.") : failure);
      return;
    }
    form.reset();
    toast.success(t("Password changed. Other devices are signed out."));
  };

  const onLogoutAll = async () => {
    setSigningOut(true);
    await logoutAll();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Security")}</DialogTitle>
          <DialogDescription>{t("Password and sessions for {email}.", { email: user.email })}</DialogDescription>
        </DialogHeader>

        <section aria-labelledby="security-session">
          <h3 id="security-session" className="text-sm text-muted-foreground">{t("Sessions")}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rule pt-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Last sign-in")}</dt>
              <dd className="measured mt-1 text-ink">{formatDate(t, user.last_login)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("This session expires")}</dt>
              <dd className="measured mt-1 text-ink">{formatDate(t, tokenExpiry())}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Account created")}</dt>
              <dd className="measured mt-1 text-ink">{formatDate(t, user.created_at)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="security-password" className="mt-2">
          <h3 id="security-password" className="text-sm text-muted-foreground">{t("Change password")}</h3>
          <form className="mt-2 grid gap-3 border-t border-rule pt-3" onSubmit={onSubmit} noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="pw-current">{t("Current password")}</Label>
              <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pw-next">{t("New password")}</Label>
              <Input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={6} required aria-describedby="pw-help" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pw-confirm">{t("Confirm new password")}</Label>
              <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required aria-describedby="pw-help" />
            </div>
            <p id="pw-help" className={`min-h-[1lh] text-xs ${error ? "text-bad" : "text-muted-foreground"}`} aria-live="polite">
              {error || t("At least 6 characters. Changing it signs out your other devices.")}
            </p>
            <Button type="submit" className="justify-self-start" disabled={saving} aria-busy={saving}>
              {saving && <Loader2 className="keep-motion h-4 w-4 animate-spin" />}
              {saving ? t("Changing…") : t("Change password")}
            </Button>
          </form>
        </section>

        <section aria-labelledby="security-devices" className="mt-2">
          <h3 id="security-devices" className="text-sm text-muted-foreground">{t("Sign out everywhere")}</h3>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-3">
            <p className="max-w-[36ch] text-xs text-muted-foreground">
              {t("Revokes every session, this one included. You will need to sign in again.")}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-bad/60 text-bad hover:bg-bad-soft">{t("Sign out everywhere")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Sign out on every device?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Every session for {email} is revoked at once, including the one in this browser.", { email: user.email })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onLogoutAll} disabled={signingOut} className="border-bad bg-bad text-paper-3 hover:bg-bad/85">
                    {signingOut ? t("Signing out…") : t("Sign out everywhere")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityDialog;
