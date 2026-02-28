import { cn } from '@/lib/utils';

interface FunnelItem {
  label: string;
  value: number;
}

interface FunnelChartProps {
  data: FunnelItem[];
  colorScheme?: 'google' | 'meta' | 'analytics';
}

const colorSchemes = {
  google: [
    'from-[hsl(4,80%,40%)] to-[hsl(4,80%,50%)]',
    'from-[hsl(20,85%,45%)] to-[hsl(20,85%,55%)]',
    'from-[hsl(36,90%,50%)] to-[hsl(36,90%,60%)]',
  ],
  meta: [
    'from-[hsl(250,60%,35%)] to-[hsl(250,60%,45%)]',
    'from-[hsl(260,65%,45%)] to-[hsl(260,65%,55%)]',
    'from-[hsl(270,70%,55%)] to-[hsl(270,70%,65%)]',
  ],
  analytics: [
    'from-[hsl(200,80%,40%)] to-[hsl(200,80%,50%)]',
    'from-[hsl(180,70%,45%)] to-[hsl(180,70%,55%)]',
    'from-[hsl(160,65%,50%)] to-[hsl(160,65%,60%)]',
  ],
};

export default function FunnelChart({ data, colorScheme = 'google' }: FunnelChartProps) {
  if (!data || data.length === 0) return null;

  const colors = colorSchemes[colorScheme];

  return (
    <div className="flex flex-col items-center gap-0 py-4">
      {data.map((item, i) => {
        // Each layer gets progressively narrower
        const widthPercent = 100 - (i * (60 / Math.max(data.length - 1, 1)));
        const gradient = colors[i % colors.length];

        return (
          <div
            key={item.label}
            className={cn(
              'relative flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-500',
              'bg-gradient-to-r shadow-lg',
              gradient,
              i > 0 && '-mt-2'
            )}
            style={{
              width: `${widthPercent}%`,
              minHeight: '72px',
              zIndex: data.length - i,
            }}
          >
            <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
              {item.label}
            </span>
            <span className="text-2xl font-bold text-white">
              {item.value.toLocaleString('pt-BR')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
