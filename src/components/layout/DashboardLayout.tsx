import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart3,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: '/admin', label: 'Clientes', icon: Users },
  { href: '/admin/users', label: 'Usuários', icon: Users },
];

const platformNavItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/meta', label: 'Meta Ads', icon: Facebook },
  { href: '/dashboard/google', label: 'Google Ads', icon: TrendingUp },
  { href: '/dashboard/analytics', label: 'Analytics', icon: Activity },
];

const bottomNavItems = [
  { href: '/dashboard/reports', label: 'Relatórios', icon: FileText },
  { href: '/dashboard/connections', label: 'Conexões', icon: LinkIcon },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const SidebarIcon = ({ item }: { item: typeof platformNavItems[0] }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.href}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
            isActive(item.href)
              ? "bg-primary/20 text-primary shadow-glow-primary"
              : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-gradient text-sm">Ads Dashboard</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Compact Icon Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-[72px] bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        {/* Platform Navigation */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-2">
          {isAdmin ? (
            adminNavItems.map((item) => <SidebarIcon key={item.href} item={item} />)
          ) : (
            platformNavItems.map((item) => <SidebarIcon key={item.href} item={item} />)
          )}

          {/* Separator */}
          {!isAdmin && (
            <>
              <div className="w-8 h-px bg-sidebar-border my-2" />
              {bottomNavItems.map((item) => <SidebarIcon key={item.href} item={item} />)}
            </>
          )}
        </nav>

        {/* User avatar at bottom */}
        <div className="pb-4 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-sidebar-accent/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-[72px] pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
