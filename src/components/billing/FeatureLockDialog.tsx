import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeatureLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onUpgrade: () => void;
}

export function FeatureLockDialog({ open, onOpenChange, title, description, onUpgrade }: FeatureLockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ahora no</Button>
          <Button onClick={onUpgrade}>Ver planes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
