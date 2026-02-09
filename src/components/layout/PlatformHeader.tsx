import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Facebook, TrendingUp, Activity, LayoutDashboard, RefreshCw, CalendarIcon } from 'lucide-react';

interface PlatformHeaderProps {
  platform: 'home' | 'meta' | 'google' | 'analytics';
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { value: string; label: string }[];
  datePreset: string;
  onDatePresetChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
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
  onRefresh,
  isRefreshing,
  customDateRange,
  onCustomDateRangeChange,
}: PlatformHeaderProps) {
  const config = platformConfig[platform];
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const isCustom = datePreset === 'custom';

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Platform title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <config.icon className={cn("h-6 w-6", config.colorClass)} />
          <h1 className="text-2xl font-bold">{config.label}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Custom date pickers */}
          {isCustom && onCustomDateRangeChange && (
            <div className="flex items-center gap-1">
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {customDateRange?.from ? format(customDateRange.from, 'dd/MM/yyyy') : 'De'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange?.from}
                    onSelect={(date) => {
                      onCustomDateRangeChange({ ...customDateRange, from: date, to: customDateRange?.to });
                      setFromOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {customDateRange?.to ? format(customDateRange.to, 'dd/MM/yyyy') : 'Até'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateRange?.to}
                    onSelect={(date) => {
                      onCustomDateRangeChange({ ...customDateRange, from: customDateRange?.from, to: date });
                      setToOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

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
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
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
