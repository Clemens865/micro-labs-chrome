import { useState, useCallback, useEffect } from 'react';

export interface HistoryItem {
    id: string;
    appId: string;
    appTitle: string;
    timestamp: number;
    inputs: Record<string, any>;
    result: any;
}

export const useAppHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        setLoading(true);
        const data = await chrome.storage.local.get('app_history') as { app_history?: HistoryItem[] };
        const items = data.app_history || [];
        setHistory([...items].sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp));
        setLoading(false);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const saveHistoryEntry = useCallback(async (appId: string, appTitle: string, inputs: Record<string, any>, result: any) => {
        const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            appId,
            appTitle,
            timestamp: Date.now(),
            inputs,
            result
        };

        const data = await chrome.storage.local.get('app_history') as { app_history?: HistoryItem[] };
        const currentHistory = data.app_history || [];
        const updatedHistory = [newItem, ...currentHistory].slice(0, 50);

        await chrome.storage.local.set({ app_history: updatedHistory });
        setHistory(updatedHistory);
    }, []);

    const deleteHistoryEntry = useCallback(async (id: string) => {
        const data = await chrome.storage.local.get('app_history') as { app_history?: HistoryItem[] };
        const currentHistory = data.app_history || [];
        const updatedHistory = currentHistory.filter((item: HistoryItem) => item.id !== id);

        await chrome.storage.local.set({ app_history: updatedHistory });
        setHistory(updatedHistory);
    }, []);

    const clearHistory = useCallback(async () => {
        await chrome.storage.local.set({ app_history: [] });
        setHistory([]);
    }, []);

    return {
        history,
        loading,
        saveHistoryEntry,
        deleteHistoryEntry,
        clearHistory,
        refreshHistory: loadHistory
    };
};
