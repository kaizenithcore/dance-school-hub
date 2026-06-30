import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  meta: {
    schoolName: string;
    primaryCtaLabel: string;
    primaryCtaUrl: string;
    navLinks: { label: string; href: string }[];
  };
}

// NOTE: In a real tenant, the school name + logo come from BrandingProvider.
export function LandingHeader({ meta }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-stone-200/70 bg-white/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-20">
        <a href="#" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 font-serif text-lg text-white">A</span>
          <span className="font-serif text-xl tracking-tight text-stone-900">{meta.schoolName}</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {meta.navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-700 transition-colors hover:text-stone-950"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="hidden h-10 rounded-full bg-stone-900 px-5 hover:bg-stone-800 md:inline-flex">
            <a href={meta.primaryCtaUrl}>{meta.primaryCtaLabel}</a>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white md:hidden"
            aria-label="Abrir menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-stone-200 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {meta.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-stone-800 hover:bg-stone-100"
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="mt-2 h-11 rounded-full bg-stone-900 hover:bg-stone-800">
              <a href={meta.primaryCtaUrl} onClick={() => setOpen(false)}>{meta.primaryCtaLabel}</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
