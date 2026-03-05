import { Link, useParams } from "react-router-dom";
import { Music } from "lucide-react";

export function PublicHeader() {
  const { schoolSlug } = useParams();

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container h-full flex items-center justify-between">
        <Link to={`/s/${schoolSlug}`} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground capitalize">
            {schoolSlug?.replace(/-/g, " ") || "Dance School"}
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            to={`/s/${schoolSlug}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Classes
          </Link>
          <Link
            to={`/s/${schoolSlug}/enroll`}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Enroll Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
