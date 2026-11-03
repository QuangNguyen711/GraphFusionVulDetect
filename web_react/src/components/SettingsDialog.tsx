import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePreferences, writePreferences, type Preferences } from "@/lib/preferences";
import { useT } from "@/i18n";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingRow = ({ id, title, note, checked, onChange }: { id: string; title: string; note: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-6 border-b border-rule py-4">
    <div>
      <Label htmlFor={id} className="text-sm text-ink">{title}</Label>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const prefs = usePreferences();
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Settings")}</DialogTitle>
          <DialogDescription>{t("Saved in this browser and applied at once.")}</DialogDescription>
        </DialogHeader>

        <section aria-labelledby="settings-display">
          <h3 id="settings-display" className="text-sm text-muted-foreground">{t("Display")}</h3>
          <div className="mt-2 border-t border-rule">
            <SettingRow
              id="pref-animate"
              title={t("Animate contract scans")}
              note={t("Turn off to hold every point-cloud scan on its final frame.")}
              checked={prefs.animateScans}
              onChange={(v) => writePreferences({ animateScans: v })}
            />
            <SettingRow
              id="pref-collapse"
              title={t("Collapse finished steps")}
              note={t("When you reopen an analysis, show only each step’s title.")}
              checked={prefs.collapseFinishedSteps}
              onChange={(v) => writePreferences({ collapseFinishedSteps: v })}
            />
          </div>
        </section>

        <section aria-labelledby="settings-language" className="mt-4">
          <h3 id="settings-language" className="text-sm text-muted-foreground">{t("Language")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("Used for the interface and for explanations and RefactorBot replies generated from now on.")}</p>
          <RadioGroup
            className="mt-3 grid gap-3"
            value={prefs.language}
            onValueChange={(v) => writePreferences({ language: v as Preferences["language"] })}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="en" id="lang-en" />
              <Label htmlFor="lang-en" className="text-sm text-ink" lang="en">English</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="vi" id="lang-vi" />
              <Label htmlFor="lang-vi" className="text-sm text-ink" lang="vi">Tiếng Việt</Label>
            </div>
          </RadioGroup>
        </section>

        <section aria-labelledby="settings-start" className="mt-4">
          <h3 id="settings-start" className="text-sm text-muted-foreground">{t("After sign-in, open")}</h3>
          <RadioGroup
            className="mt-3 grid gap-3"
            value={prefs.startPage}
            onValueChange={(v) => writePreferences({ startPage: v as Preferences["startPage"] })}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="/analysis" id="start-analysis" />
              <Label htmlFor="start-analysis" className="text-sm text-ink">{t("New Analysis")}</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="/project" id="start-project" />
              <Label htmlFor="start-project" className="text-sm text-ink">{t("Projects")}</Label>
            </div>
          </RadioGroup>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
