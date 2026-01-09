import { useState, useCallback, useEffect, useMemo } from 'react';

export interface AppUsageStats {
    appId: string;
    useCount: number;
    lastUsed: number;
}

export const useAppStats = () => {
    const [stats, setStats] = useState<Record<string, AppUsageStats>>({});
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await chrome.storage.local.get('app_usage_stats') as { app_usage_stats?: Record<string, AppUsageStats> };
            setStats(data.app_usage_stats || {});
        } catch (err) {
            console.error('Failed to load app stats:', err);
            setStats({});
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const trackUsage = useCallback(async (appId: string) => {
        const data = await chrome.storage.local.get('app_usage_stats') as { app_usage_stats?: Record<string, AppUsageStats> };
        const currentStats = data.app_usage_stats || {};

        const existingStats = currentStats[appId] || { appId, useCount: 0, lastUsed: 0 };
        const updatedStats = {
            ...currentStats,
            [appId]: {
                appId,
                useCount: existingStats.useCount + 1,
                lastUsed: Date.now()
            }
        };

        await chrome.storage.local.set({ app_usage_stats: updatedStats });
        setStats(updatedStats);
    }, []);

    const getPopularApps = useCallback((limit: number = 5): string[] => {
        return Object.values(stats)
            .sort((a, b) => b.useCount - a.useCount)
            .slice(0, limit)
            .map(s => s.appId);
    }, [stats]);

    const getRecentlyUsedApps = useCallback((limit: number = 5): string[] => {
        return Object.values(stats)
            .sort((a, b) => b.lastUsed - a.lastUsed)
            .slice(0, limit)
            .map(s => s.appId);
    }, [stats]);

    const getAppStats = useCallback((appId: string): AppUsageStats | null => {
        return stats[appId] || null;
    }, [stats]);

    const totalUsageCount = useMemo(() => {
        return Object.values(stats).reduce((sum, s) => sum + s.useCount, 0);
    }, [stats]);

    const clearStats = useCallback(async () => {
        await chrome.storage.local.set({ app_usage_stats: {} });
        setStats({});
    }, []);

    return {
        stats,
        loading,
        trackUsage,
        getPopularApps,
        getRecentlyUsedApps,
        getAppStats,
        totalUsageCount,
        clearStats,
        refreshStats: loadStats
    };
};
