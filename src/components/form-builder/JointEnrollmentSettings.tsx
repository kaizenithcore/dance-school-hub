import { JointEnrollmentConfig } from "@/lib/types/formBuilder";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

interface JointEnrollmentSettingsProps {
  config: JointEnrollmentConfig;
  onChange: (config: JointEnrollmentConfig) => void;
}

export function JointEnrollmentSettings({ config, onChange }: JointEnrollmentSettingsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Users className="h-4.5 w-4.5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Matrícula Conjunta</h3>
          <p className="text-xs text-muted-foreground">Permitir inscribir varios alumnos a la vez</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange({ ...config, enabled })}
        />
      </div>

      {config.enabled && (
        <div className="flex items-center gap-3 pl-12">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Máximo de alumnos</Label>
          <Input
            type="number"
            min={2}
            max={20}
            value={config.maxStudents}
            onChange={(e) => onChange({ ...config, maxStudents: Math.max(2, Math.min(20, parseInt(e.target.value) || 2)) })}
            className="h-8 w-20 text-xs"
          />
        </div>
      )}
    </div>
  );
}
