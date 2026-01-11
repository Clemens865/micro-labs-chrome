/**
 * React hook for managing webhook integrations
 */

import { useState, useCallback, useEffect } from 'react';
import {
    IntegrationConfig,
    IntegrationType,
    WebhookPayload,
    WebhookResult,
    getIntegrations,
    saveIntegration,
    updateIntegration,
    deleteIntegration,
    sendToIntegration,
    sendToAllEnabledIntegrations,
    testIntegration,
    getIntegrationTypeMeta,
    getAllIntegrationTypes,
} from '../services/webhookService';

export interface UseIntegrationsReturn {
    integrations: IntegrationConfig[];
    loading: boolean;
    error: string | null;

    // CRUD operations
    addIntegration: (type: IntegrationType, name: string, config: Record<string, any>) => Promise<IntegrationConfig>;
    editIntegration: (id: string, updates: Partial<IntegrationConfig>) => Promise<IntegrationConfig | null>;
    removeIntegration: (id: string) => Promise<boolean>;
    toggleIntegration: (id: string) => Promise<void>;

    // Sending data
    sendToOne: (integrationId: string, payload: WebhookPayload) => Promise<WebhookResult>;
    sendToAll: (payload: WebhookPayload) => Promise<WebhookResult[]>;
    testOne: (integrationId: string) => Promise<WebhookResult>;

    // Utilities
    getEnabledIntegrations: () => IntegrationConfig[];
    getTypeMeta: typeof getIntegrationTypeMeta;
    availableTypes: IntegrationType[];

    // Refresh
    refresh: () => Promise<void>;
}

export const useIntegrations = (): UseIntegrationsReturn => {
    const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIntegrations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getIntegrations();
            setIntegrations(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load integrations');
            setIntegrations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIntegrations();
    }, [loadIntegrations]);

    const addIntegration = useCallback(async (
        type: IntegrationType,
        name: string,
        config: Record<string, any>
    ): Promise<IntegrationConfig> => {
        const newIntegration = await saveIntegration({
            type,
            name,
            enabled: true,
            config,
        });
        setIntegrations(prev => [...prev, newIntegration]);
        return newIntegration;
    }, []);

    const editIntegration = useCallback(async (
        id: string,
        updates: Partial<IntegrationConfig>
    ): Promise<IntegrationConfig | null> => {
        const updated = await updateIntegration(id, updates);
        if (updated) {
            setIntegrations(prev =>
                prev.map(i => i.id === id ? updated : i)
            );
        }
        return updated;
    }, []);

    const removeIntegration = useCallback(async (id: string): Promise<boolean> => {
        const success = await deleteIntegration(id);
        if (success) {
            setIntegrations(prev => prev.filter(i => i.id !== id));
        }
        return success;
    }, []);

    const toggleIntegration = useCallback(async (id: string): Promise<void> => {
        const integration = integrations.find(i => i.id === id);
        if (integration) {
            await editIntegration(id, { enabled: !integration.enabled });
        }
    }, [integrations, editIntegration]);

    const sendToOne = useCallback(async (
        integrationId: string,
        payload: WebhookPayload
    ): Promise<WebhookResult> => {
        const integration = integrations.find(i => i.id === integrationId);
        if (!integration) {
            return {
                success: false,
                integrationId,
                integrationType: 'generic-webhook',
                error: 'Integration not found',
            };
        }
        return sendToIntegration(integration, payload);
    }, [integrations]);

    const sendToAll = useCallback(async (payload: WebhookPayload): Promise<WebhookResult[]> => {
        return sendToAllEnabledIntegrations(payload);
    }, []);

    const testOne = useCallback(async (integrationId: string): Promise<WebhookResult> => {
        const integration = integrations.find(i => i.id === integrationId);
        if (!integration) {
            return {
                success: false,
                integrationId,
                integrationType: 'generic-webhook',
                error: 'Integration not found',
            };
        }
        return testIntegration(integration);
    }, [integrations]);

    const getEnabledIntegrations = useCallback((): IntegrationConfig[] => {
        return integrations.filter(i => i.enabled);
    }, [integrations]);

    return {
        integrations,
        loading,
        error,
        addIntegration,
        editIntegration,
        removeIntegration,
        toggleIntegration,
        sendToOne,
        sendToAll,
        testOne,
        getEnabledIntegrations,
        getTypeMeta: getIntegrationTypeMeta,
        availableTypes: getAllIntegrationTypes(),
        refresh: loadIntegrations,
    };
};

/**
 * Helper hook to get quick send functionality for any app
 */
export const useSendToIntegrations = () => {
    const { sendToAll, sendToOne, getEnabledIntegrations, integrations } = useIntegrations();

    const createPayload = useCallback((
        appId: string,
        appName: string,
        data: Record<string, any>,
        source?: { url?: string; title?: string }
    ): WebhookPayload => ({
        appId,
        appName,
        timestamp: Date.now(),
        source: source || {},
        data,
    }), []);

    const sendResult = useCallback(async (
        appId: string,
        appName: string,
        data: Record<string, any>,
        options?: {
            integrationId?: string;
            source?: { url?: string; title?: string };
        }
    ): Promise<WebhookResult[]> => {
        const payload = createPayload(appId, appName, data, options?.source);

        if (options?.integrationId) {
            const result = await sendToOne(options.integrationId, payload);
            return [result];
        }

        return sendToAll(payload);
    }, [createPayload, sendToAll, sendToOne]);

    return {
        sendResult,
        hasEnabledIntegrations: getEnabledIntegrations().length > 0,
        enabledCount: getEnabledIntegrations().length,
        integrations,
    };
};
