import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Facebook, TrendingUp, Activity, LayoutDashboard } from 'lucide-react';

interface PlatformHeaderProps {
  platform: 'home' | 'meta' | 'google' | 'analytics';
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { value: string; label: string }[];
  datePreset: string;
  onDatePresetChange: (value: string) => void;
}

const platformConfig = {
  home: { label: 'Dashboard Geral', icon: LayoutDashboard, colorClass: 'text-primary' },
  meta: { label: 'Meta Ads', icon: Facebook, colorClass: 'text-meta' },
  google: { label: 'Google Ads', icon: TrendingUp, colorClass: 'text-google' },
  analytics: { label: 'Google Analytics', icon: Activity, colorClass: 'text-primary' },
};

export default function PlatformHeader({
  platform,
  activeTab,
  onTabChange,
  tabs,
  datePreset,
  onDatePresetChange,
}: PlatformHeaderProps) {
  const config = platformConfig[platform];

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Platform title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <config.icon className={cn("h-6 w-6", config.colorClass)} />
          <h1 className="text-2xl font-bold">{config.label}</h1>
        </div>
        
        <Select value={datePreset} onValueChange={onDatePresetChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
            <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
            <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sub-tabs */}
      {tabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-secondary/50 border border-border">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
