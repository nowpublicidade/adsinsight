import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

/** Shared state & helpers for dashboard pages that use PlatformHeader. */
export function useDashboardFilters(queryKeyPrefixes: string[]) {
  const queryClient = useQueryClient();
  const [datePreset, setDatePreset] = useState("last_7d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all(queryKeyPrefixes.map((prefix) => queryClient.invalidateQueries({ queryKey: [prefix] })));
    await queryClient.refetchQueries({ type: "active" });
    setIsRefreshing(false);
  }, [queryClient, queryKeyPrefixes]);

  /** Convert custom date range to YYYY-MM-DD strings for API consumption. */
  const getCustomDateStrings = useCallback(() => {
    if (datePreset !== "custom" || !customDateRange.from || !customDateRange.to) return null;
    return {
      from: format(customDateRange.from, "yyyy-MM-dd"),
      to: format(customDateRange.to, "yyyy-MM-dd"),
    };
  }, [datePreset, customDateRange]);

  /**
   * Returns the correct date params to spread into edge function body.
   * Sends { date_range } for custom ranges, { date_preset } for presets.
   * Prevents sending 'custom' as date_preset to Meta/Google APIs.
   */
  const dateBody =
    datePreset === "custom" && customDateRange.from && customDateRange.to
      ? {
          date_range: {
            start: format(customDateRange.from, "yyyy-MM-dd"),
            end: format(customDateRange.to, "yyyy-MM-dd"),
          },
        }
      : { date_preset: datePreset };

  /** Query key segment — include custom dates so React Query refetches on range change */
  const dateKey =
    datePreset === "custom"
      ? [datePreset, customDateRange.from?.toISOString(), customDateRange.to?.toISOString()]
      : [datePreset];

  return {
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    isRefreshing,
    handleRefresh,
    getCustomDateStrings,
    dateBody,
    dateKey,
  };
}

/** Default query options to prevent auto-fetching on every page open. */
export const manualFetchOptions = {
  staleTime: Infinity,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
};
