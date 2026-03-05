import { Music } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Music className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">DanceHub</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Powered by DanceHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
