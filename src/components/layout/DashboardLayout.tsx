import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientConnections } from "@/hooks/useClientConnections";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Link as LinkIcon,
  Facebook,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: "/admin", label: "Clientes", icon: Users },
  { href: "/admin/users", label: "Usuários", icon: Users },
];

const bottomNavItems = [
  { href: "/dashboard/reports", label: "Relatórios", icon: FileText },
  { href: "/dashboard/connections", label: "Conexões", icon: LinkIcon },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const connections = useClientConnections();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = role === "admin";

  // Nav items filtrados pelas conexões ativas do cliente
  const platformNavItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    ...(connections.meta ? [{ href: "/dashboard/meta", label: "Meta Ads", icon: Facebook }] : []),
    ...(connections.google ? [{ href: "/dashboard/google", label: "Google Ads", icon: TrendingUp }] : []),
    ...(connections.analytics ? [{ href: "/dashboard/analytics", label: "Analytics", icon: Activity }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U";

  const isActive = (href: string) => {
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  const SidebarIcon = ({ item }: { item: (typeof platformNavItems)[0] }) => {
    const active = isActive(item.href);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200",
              active
                ? "bg-[hsl(var(--primary)/0.18)] text-primary"
                : "text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground",
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {/* Linha ativa à direita */}
            {active && <span className="absolute -right-[1px] top-2.5 bottom-2.5 w-[2px] rounded-full bg-primary" />}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Mobile header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border backdrop-blur-xl bg-[hsl(var(--background)/0.9)]">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            {/* Logo mobile — versão compacta */}
            <img src="/logo.png" alt="now! insight" className="h-7 w-auto object-contain" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[68px] flex flex-col",
          "bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border",
          "transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo area — badge tipográfico "n!" baseado na identidade do logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/dashboard"
              className="h-14 flex items-center justify-center border-b border-sidebar-border shrink-0 group"
            >
              <div
                className="w-10 h-10 rounded-xl bg-black flex items-center justify-center
                              transition-shadow duration-300 group-hover:shadow-glow-primary select-none"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                {/* "n" em branco + "!" em roxo — replicando a paleta do logo */}
                <span className="text-[17px] font-black leading-none tracking-tighter">
                  <span style={{ color: "#ffffff", fontFamily: "Geist, Inter, system-ui" }}>n</span>
                  <span style={{ color: "hsl(var(--primary))" }}>!</span>
                </span>
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
            now! insight
          </TooltipContent>
        </Tooltip>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-1.5 overflow-y-auto">
          {isAdmin ? (
            adminNavItems.map((item) => <SidebarIcon key={item.href} item={item} />)
          ) : (
            <>
              {platformNavItems.map((item) => (
                <SidebarIcon key={item.href} item={item} />
              ))}
              <div className="w-8 h-px bg-sidebar-border my-3" />
              {bottomNavItems.map((item) => (
                <SidebarIcon key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* User avatar */}
        <div className="pb-4 flex justify-center border-t border-sidebar-border pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-[hsl(var(--surface-2))] transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={8}>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="lg:pl-[68px] pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
