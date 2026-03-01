import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Ferramentas", href: "#tools" },
  { label: "Depoimentos", href: "#testimonials" },
  { label: "Preços", href: "#pricing" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleAnchor = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl",
        scrolled
          ? "bg-[hsl(240_13%_4%/0.95)] border-b border-border shadow-[0_4px_24px_hsl(240_13%_2%/0.4)]"
          : "bg-[hsl(240_13%_4%/0.6)] border-b border-transparent",
      )}
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="now! insight"
              className="h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-85"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleAnchor(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Entrar
            </Button>
            <Button
              variant="glow"
              size="sm"
              onClick={() => navigate("/auth")}
              className="font-semibold"
            >
              Começar grátis
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-[hsl(240_13%_4%/0.98)] backdrop-blur-xl">
          <div className="container px-6 py-5 flex flex-col gap-4">
            {/* Mobile logo */}
            <img src="/logo.png" alt="now! insight" className="h-7 w-auto object-contain self-start" />
            <div className="h-px bg-border" />
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleAnchor(link.href)}
                className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors font-medium py-0.5"
              >
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-2 pt-1 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Entrar
              </Button>
              <Button variant="glow" size="sm" onClick={() => navigate("/auth")}>
                Começar grátis
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
