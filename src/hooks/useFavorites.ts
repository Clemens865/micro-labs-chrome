import { useState, useCallback, useEffect } from 'react';

export const useFavorites = () => {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFavorites = useCallback(async () => {
        setLoading(true);
        try {
            const data = await chrome.storage.local.get('app_favorites') as { app_favorites?: string[] };
            setFavorites(data.app_favorites || []);
        } catch (err) {
            console.error('Failed to load favorites:', err);
            setFavorites([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const toggleFavorite = useCallback(async (appId: string) => {
        const data = await chrome.storage.local.get('app_favorites') as { app_favorites?: string[] };
        const currentFavorites = data.app_favorites || [];

        let updatedFavorites: string[];
        if (currentFavorites.includes(appId)) {
            updatedFavorites = currentFavorites.filter(id => id !== appId);
        } else {
            updatedFavorites = [...currentFavorites, appId];
        }

        await chrome.storage.local.set({ app_favorites: updatedFavorites });
        setFavorites(updatedFavorites);

        return !currentFavorites.includes(appId); // Returns true if added, false if removed
    }, []);

    const isFavorite = useCallback((appId: string) => {
        return favorites.includes(appId);
    }, [favorites]);

    const clearFavorites = useCallback(async () => {
        await chrome.storage.local.set({ app_favorites: [] });
        setFavorites([]);
    }, []);

    return {
        favorites,
        loading,
        toggleFavorite,
        isFavorite,
        clearFavorites,
        refreshFavorites: loadFavorites
    };
};
