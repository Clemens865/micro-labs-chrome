/**
 * Webhook Service for MicroLabs
 * Sends app outputs to external services (webhooks, APIs, integrations)
 */

// Supported integration types
export type IntegrationType =
    | 'generic-webhook'
    | 'slack'
    | 'notion'
    | 'airtable'
    | 'google-drive'
    | 'hubspot'
    | 'salesforce'
    | 'zapier'
    | 'make';

export interface IntegrationConfig {
    id: string;
    type: IntegrationType;
    name: string;
    enabled: boolean;
    config: Record<string, any>;
    createdAt: number;
    lastUsed?: number;
}

export interface WebhookPayload {
    appId: string;
    appName: string;
    timestamp: number;
    source: {
        url?: string;
        title?: string;
    };
    data: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface WebhookResult {
    success: boolean;
    integrationId: string;
    integrationType: IntegrationType;
    statusCode?: number;
    message?: string;
    error?: string;
}

// Storage key for integrations
const INTEGRATIONS_STORAGE_KEY = 'microlabs_integrations';

/**
 * Get all configured integrations
 */
export const getIntegrations = async (): Promise<IntegrationConfig[]> => {
    const data = await chrome.storage.local.get(INTEGRATIONS_STORAGE_KEY) as { [key: string]: IntegrationConfig[] | undefined };
    return data[INTEGRATIONS_STORAGE_KEY] || [];
};

/**
 * Get a specific integration by ID
 */
export const getIntegration = async (id: string): Promise<IntegrationConfig | null> => {
    const integrations = await getIntegrations();
    return integrations.find(i => i.id === id) || null;
};

/**
 * Save a new integration
 */
export const saveIntegration = async (integration: Omit<IntegrationConfig, 'id' | 'createdAt'>): Promise<IntegrationConfig> => {
    const integrations = await getIntegrations();

    const newIntegration: IntegrationConfig = {
        ...integration,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
    };

    integrations.push(newIntegration);
    await chrome.storage.local.set({ [INTEGRATIONS_STORAGE_KEY]: integrations });

    return newIntegration;
};

/**
 * Update an existing integration
 */
export const updateIntegration = async (id: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig | null> => {
    const integrations = await getIntegrations();
    const index = integrations.findIndex(i => i.id === id);

    if (index === -1) return null;

    integrations[index] = { ...integrations[index], ...updates };
    await chrome.storage.local.set({ [INTEGRATIONS_STORAGE_KEY]: integrations });

    return integrations[index];
};

/**
 * Delete an integration
 */
export const deleteIntegration = async (id: string): Promise<boolean> => {
    const integrations = await getIntegrations();
    const filtered = integrations.filter(i => i.id !== id);

    if (filtered.length === integrations.length) return false;

    await chrome.storage.local.set({ [INTEGRATIONS_STORAGE_KEY]: filtered });
    return true;
};

/**
 * Send data to a generic webhook URL
 */
const sendToGenericWebhook = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { url, method = 'POST', headers = {} } = config;

    if (!url) {
        throw new Error('Webhook URL is required');
    }

    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify(payload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Sent successfully' : `HTTP ${response.status}`,
    };
};

/**
 * Send data to Slack via webhook
 */
const sendToSlack = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { webhookUrl, channel, username = 'MicroLabs' } = config;

    if (!webhookUrl) {
        throw new Error('Slack webhook URL is required');
    }

    // Format payload for Slack
    const slackPayload = {
        channel,
        username,
        icon_emoji: ':microscope:',
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `📊 ${payload.appName}`,
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Source:*\n${payload.source.title || payload.source.url || 'N/A'}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Time:*\n${new Date(payload.timestamp).toLocaleString()}`,
                    },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `\`\`\`${JSON.stringify(payload.data, null, 2).slice(0, 2900)}\`\`\``,
                },
            },
        ],
    };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Sent to Slack' : `Slack error: ${response.status}`,
    };
};

/**
 * Send data to Notion database
 */
const sendToNotion = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { apiKey, databaseId } = config;

    if (!apiKey || !databaseId) {
        throw new Error('Notion API key and database ID are required');
    }

    // Create a page in the Notion database
    const notionPayload = {
        parent: { database_id: databaseId },
        properties: {
            Name: {
                title: [{ text: { content: payload.appName } }],
            },
            Source: {
                url: payload.source.url || '',
            },
            'Created At': {
                date: { start: new Date(payload.timestamp).toISOString() },
            },
            Data: {
                rich_text: [{ text: { content: JSON.stringify(payload.data).slice(0, 2000) } }],
            },
        },
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(notionPayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Added to Notion' : `Notion error: ${response.status}`,
    };
};

/**
 * Send data to Airtable
 */
const sendToAirtable = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { apiKey, baseId, tableId } = config;

    if (!apiKey || !baseId || !tableId) {
        throw new Error('Airtable API key, base ID, and table ID are required');
    }

    const airtablePayload = {
        records: [
            {
                fields: {
                    'App Name': payload.appName,
                    'Source URL': payload.source.url || '',
                    'Source Title': payload.source.title || '',
                    'Timestamp': new Date(payload.timestamp).toISOString(),
                    'Data': JSON.stringify(payload.data),
                },
            },
        ],
    };

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtablePayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Added to Airtable' : `Airtable error: ${response.status}`,
    };
};

/**
 * Send data to Zapier webhook
 */
const sendToZapier = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { webhookUrl } = config;

    if (!webhookUrl) {
        throw new Error('Zapier webhook URL is required');
    }

    // Zapier expects flat data for easier mapping
    const zapierPayload = {
        app_id: payload.appId,
        app_name: payload.appName,
        timestamp: payload.timestamp,
        timestamp_iso: new Date(payload.timestamp).toISOString(),
        source_url: payload.source.url || '',
        source_title: payload.source.title || '',
        data: payload.data,
        data_json: JSON.stringify(payload.data),
    };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zapierPayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Sent to Zapier' : `Zapier error: ${response.status}`,
    };
};

/**
 * Send data to Make (Integromat) webhook
 */
const sendToMake = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { webhookUrl } = config;

    if (!webhookUrl) {
        throw new Error('Make webhook URL is required');
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Sent to Make' : `Make error: ${response.status}`,
    };
};

/**
 * Send data to HubSpot (create contact/deal)
 */
const sendToHubSpot = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { accessToken, objectType = 'contacts' } = config;

    if (!accessToken) {
        throw new Error('HubSpot access token is required');
    }

    // Map common lead data fields
    const data = payload.data;
    let hubspotPayload: Record<string, any> = {};

    if (objectType === 'contacts') {
        hubspotPayload = {
            properties: {
                email: data.email || '',
                firstname: data.firstName || data.name?.split(' ')[0] || '',
                lastname: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
                company: data.company || data.organization || '',
                phone: data.phone || '',
                website: data.website || payload.source.url || '',
                hs_lead_status: 'NEW',
                microlabs_source: payload.appName,
                microlabs_data: JSON.stringify(data).slice(0, 65535),
            },
        };
    } else if (objectType === 'deals') {
        hubspotPayload = {
            properties: {
                dealname: data.dealName || `${payload.appName} - ${new Date(payload.timestamp).toLocaleDateString()}`,
                amount: data.amount || data.value || '',
                pipeline: data.pipeline || 'default',
                dealstage: data.stage || 'appointmentscheduled',
                microlabs_source: payload.appName,
            },
        };
    }

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(hubspotPayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? `Created HubSpot ${objectType.slice(0, -1)}` : `HubSpot error: ${response.status}`,
    };
};

/**
 * Send data to Salesforce
 */
const sendToSalesforce = async (
    config: Record<string, any>,
    payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; message?: string }> => {
    const { instanceUrl, accessToken, objectType = 'Lead' } = config;

    if (!instanceUrl || !accessToken) {
        throw new Error('Salesforce instance URL and access token are required');
    }

    const data = payload.data;
    let sfPayload: Record<string, any> = {};

    if (objectType === 'Lead') {
        sfPayload = {
            FirstName: data.firstName || data.name?.split(' ')[0] || 'Unknown',
            LastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || 'Lead',
            Company: data.company || data.organization || 'Unknown',
            Email: data.email || '',
            Phone: data.phone || '',
            Website: data.website || payload.source.url || '',
            LeadSource: 'MicroLabs',
            Description: `Source: ${payload.appName}\n${JSON.stringify(data, null, 2).slice(0, 30000)}`,
        };
    } else if (objectType === 'Contact') {
        sfPayload = {
            FirstName: data.firstName || data.name?.split(' ')[0] || '',
            LastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || 'Contact',
            Email: data.email || '',
            Phone: data.phone || '',
            Description: `Source: ${payload.appName}`,
        };
    }

    const response = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/${objectType}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sfPayload),
    });

    return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? `Created Salesforce ${objectType}` : `Salesforce error: ${response.status}`,
    };
};

/**
 * Send payload to a specific integration
 */
export const sendToIntegration = async (
    integration: IntegrationConfig,
    payload: WebhookPayload
): Promise<WebhookResult> => {
    try {
        let result: { success: boolean; statusCode?: number; message?: string };

        switch (integration.type) {
            case 'generic-webhook':
                result = await sendToGenericWebhook(integration.config, payload);
                break;
            case 'slack':
                result = await sendToSlack(integration.config, payload);
                break;
            case 'notion':
                result = await sendToNotion(integration.config, payload);
                break;
            case 'airtable':
                result = await sendToAirtable(integration.config, payload);
                break;
            case 'zapier':
                result = await sendToZapier(integration.config, payload);
                break;
            case 'make':
                result = await sendToMake(integration.config, payload);
                break;
            case 'hubspot':
                result = await sendToHubSpot(integration.config, payload);
                break;
            case 'salesforce':
                result = await sendToSalesforce(integration.config, payload);
                break;
            default:
                throw new Error(`Unsupported integration type: ${integration.type}`);
        }

        // Update last used timestamp
        await updateIntegration(integration.id, { lastUsed: Date.now() });

        return {
            success: result.success,
            integrationId: integration.id,
            integrationType: integration.type,
            statusCode: result.statusCode,
            message: result.message,
        };
    } catch (error: any) {
        return {
            success: false,
            integrationId: integration.id,
            integrationType: integration.type,
            error: error.message || 'Unknown error',
        };
    }
};

/**
 * Send payload to all enabled integrations
 */
export const sendToAllEnabledIntegrations = async (
    payload: WebhookPayload
): Promise<WebhookResult[]> => {
    const integrations = await getIntegrations();
    const enabledIntegrations = integrations.filter(i => i.enabled);

    const results = await Promise.all(
        enabledIntegrations.map(integration => sendToIntegration(integration, payload))
    );

    return results;
};

/**
 * Test an integration with sample data
 */
export const testIntegration = async (integration: IntegrationConfig): Promise<WebhookResult> => {
    const testPayload: WebhookPayload = {
        appId: 'test',
        appName: 'MicroLabs Test',
        timestamp: Date.now(),
        source: {
            url: 'https://example.com',
            title: 'Test Page',
        },
        data: {
            message: 'This is a test from MicroLabs',
            test: true,
        },
    };

    return sendToIntegration(integration, testPayload);
};

/**
 * Get integration type metadata
 */
export const getIntegrationTypeMeta = (type: IntegrationType): {
    name: string;
    icon: string;
    description: string;
    configFields: Array<{ key: string; label: string; type: 'text' | 'password' | 'select'; required: boolean; placeholder?: string; options?: string[] }>;
} => {
    const types: Record<IntegrationType, ReturnType<typeof getIntegrationTypeMeta>> = {
        'generic-webhook': {
            name: 'Generic Webhook',
            icon: 'Webhook',
            description: 'Send data to any webhook URL',
            configFields: [
                { key: 'url', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://...' },
                { key: 'method', label: 'Method', type: 'select', required: false, options: ['POST', 'PUT', 'PATCH'] },
            ],
        },
        'slack': {
            name: 'Slack',
            icon: 'MessageSquare',
            description: 'Send notifications to Slack channels',
            configFields: [
                { key: 'webhookUrl', label: 'Webhook URL', type: 'password', required: true, placeholder: 'https://hooks.slack.com/...' },
                { key: 'channel', label: 'Channel (optional)', type: 'text', required: false, placeholder: '#general' },
            ],
        },
        'notion': {
            name: 'Notion',
            icon: 'FileText',
            description: 'Add entries to Notion databases',
            configFields: [
                { key: 'apiKey', label: 'Integration Token', type: 'password', required: true, placeholder: 'secret_...' },
                { key: 'databaseId', label: 'Database ID', type: 'text', required: true, placeholder: '...' },
            ],
        },
        'airtable': {
            name: 'Airtable',
            icon: 'Table',
            description: 'Add records to Airtable bases',
            configFields: [
                { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'pat...' },
                { key: 'baseId', label: 'Base ID', type: 'text', required: true, placeholder: 'app...' },
                { key: 'tableId', label: 'Table ID', type: 'text', required: true, placeholder: 'tbl...' },
            ],
        },
        'zapier': {
            name: 'Zapier',
            icon: 'Zap',
            description: 'Trigger Zapier workflows',
            configFields: [
                { key: 'webhookUrl', label: 'Webhook URL', type: 'password', required: true, placeholder: 'https://hooks.zapier.com/...' },
            ],
        },
        'make': {
            name: 'Make (Integromat)',
            icon: 'Boxes',
            description: 'Trigger Make scenarios',
            configFields: [
                { key: 'webhookUrl', label: 'Webhook URL', type: 'password', required: true, placeholder: 'https://hook.make.com/...' },
            ],
        },
        'hubspot': {
            name: 'HubSpot',
            icon: 'Users',
            description: 'Create contacts and deals in HubSpot',
            configFields: [
                { key: 'accessToken', label: 'Private App Token', type: 'password', required: true, placeholder: 'pat-...' },
                { key: 'objectType', label: 'Object Type', type: 'select', required: false, options: ['contacts', 'deals'] },
            ],
        },
        'salesforce': {
            name: 'Salesforce',
            icon: 'Cloud',
            description: 'Create leads and contacts in Salesforce',
            configFields: [
                { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true, placeholder: 'https://yourorg.salesforce.com' },
                { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
                { key: 'objectType', label: 'Object Type', type: 'select', required: false, options: ['Lead', 'Contact'] },
            ],
        },
        'google-drive': {
            name: 'Google Drive',
            icon: 'HardDrive',
            description: 'Save outputs to Google Drive',
            configFields: [
                { key: 'folderId', label: 'Folder ID', type: 'text', required: true },
            ],
        },
    };

    return types[type];
};

/**
 * Get all available integration types
 */
export const getAllIntegrationTypes = (): IntegrationType[] => [
    'generic-webhook',
    'slack',
    'notion',
    'airtable',
    'zapier',
    'make',
    'hubspot',
    'salesforce',
    'google-drive',
];
