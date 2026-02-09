import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

/** Shared state & helpers for dashboard pages that use PlatformHeader. */
export function useDashboardFilters(queryKeyPrefixes: string[]) {
  const queryClient = useQueryClient();
  const [datePreset, setDatePreset] = useState('last_7d');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all(
      queryKeyPrefixes.map((prefix) =>
        queryClient.invalidateQueries({ queryKey: [prefix] })
      )
    );
    // Also invalidate any key that starts with the prefix
    await queryClient.refetchQueries({ type: 'active' });
    setIsRefreshing(false);
  }, [queryClient, queryKeyPrefixes]);

  /** Convert custom date range to YYYY-MM-DD strings for API consumption. */
  const getCustomDateStrings = useCallback(() => {
    if (datePreset !== 'custom' || !customDateRange.from || !customDateRange.to) return null;
    return {
      from: format(customDateRange.from, 'yyyy-MM-dd'),
      to: format(customDateRange.to, 'yyyy-MM-dd'),
    };
  }, [datePreset, customDateRange]);

  return {
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    isRefreshing,
    handleRefresh,
    getCustomDateStrings,
  };
}

/** Default query options to prevent auto-fetching on every page open. */
export const manualFetchOptions = {
  staleTime: Infinity,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
};
