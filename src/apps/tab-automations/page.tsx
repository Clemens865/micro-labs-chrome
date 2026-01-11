import React, { useState, useEffect } from 'react';
import {
    Zap, Plus, Trash2, Play, Pause, Settings, Clock, Globe,
    ArrowRight, Edit2, Save, X, CheckCircle, AlertTriangle,
    RefreshCw, ExternalLink, Pin, Volume2, VolumeX, Lock
} from 'lucide-react';

interface TabRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: {
        type: 'url_match' | 'domain' | 'time' | 'tab_count';
        value: string;
    };
    action: {
        type: 'open_tabs' | 'close_tab' | 'pin_tab' | 'mute_tab' | 'redirect' | 'group_tabs';
        value: string;
    };
    lastTriggered?: number;
    triggerCount: number;
}

const TabAutomations: React.FC = () => {
    const [rules, setRules] = useState<TabRule[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [editingRule, setEditingRule] = useState<TabRule | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [recentActivity, setRecentActivity] = useState<{ message: string; time: Date }[]>([]);

    // Load rules from storage
    useEffect(() => {
        chrome.storage.local.get('tabAutomationRules', (result) => {
            if (result.tabAutomationRules) {
                setRules(result.tabAutomationRules as TabRule[]);
            }
        });

        chrome.storage.local.get('tabAutomationEnabled', (result) => {
            setIsMonitoring(result.tabAutomationEnabled as boolean || false);
        });
    }, []);

    // Save rules to storage
    const saveRules = async (newRules: TabRule[]) => {
        setRules(newRules);
        await chrome.storage.local.set({ tabAutomationRules: newRules });
    };

    // Toggle monitoring
    const toggleMonitoring = async () => {
        const newState = !isMonitoring;
        setIsMonitoring(newState);
        await chrome.storage.local.set({ tabAutomationEnabled: newState });

        if (newState) {
            addActivity('Automation monitoring started');
            startMonitoring();
        } else {
            addActivity('Automation monitoring stopped');
        }
    };

    // Add activity log
    const addActivity = (message: string) => {
        setRecentActivity(prev => [
            { message, time: new Date() },
            ...prev.slice(0, 9)
        ]);
    };

    // Start monitoring tabs
    const startMonitoring = () => {
        // This would be better in a background script, but we'll do basic monitoring here
        chrome.tabs.onCreated.addListener(handleTabCreated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);
    };

    // Handle new tab created
    const handleTabCreated = async (tab: chrome.tabs.Tab) => {
        if (!isMonitoring) return;

        const enabledRules = rules.filter(r => r.enabled);

        for (const rule of enabledRules) {
            if (rule.trigger.type === 'tab_count') {
                const allTabs = await chrome.tabs.query({});
                const maxTabs = parseInt(rule.trigger.value);
                if (allTabs.length > maxTabs && rule.action.type === 'close_tab') {
                    // Close oldest non-pinned tab
                    const nonPinned = allTabs.filter(t => !t.pinned).sort((a, b) => (a.id || 0) - (b.id || 0));
                    if (nonPinned.length > 0 && nonPinned[0].id) {
                        await chrome.tabs.remove(nonPinned[0].id);
                        addActivity(`Closed oldest tab (max ${maxTabs} reached)`);
                        updateRuleTrigger(rule.id);
                    }
                }
            }
        }
    };

    // Handle tab URL change
    const handleTabUpdated = async (tabId: number, changeInfo: { url?: string; status?: string }, tab: chrome.tabs.Tab) => {
        if (!isMonitoring || !changeInfo.url) return;

        const enabledRules = rules.filter(r => r.enabled);

        for (const rule of enabledRules) {
            let matches = false;

            if (rule.trigger.type === 'url_match') {
                matches = tab.url?.includes(rule.trigger.value) || false;
            } else if (rule.trigger.type === 'domain') {
                try {
                    const domain = new URL(tab.url || '').hostname;
                    matches = domain.includes(rule.trigger.value);
                } catch { }
            }

            if (matches) {
                await executeAction(rule, tabId, tab);
                updateRuleTrigger(rule.id);
            }
        }
    };

    // Execute rule action
    const executeAction = async (rule: TabRule, tabId: number, tab: chrome.tabs.Tab) => {
        switch (rule.action.type) {
            case 'open_tabs':
                const urls = rule.action.value.split(',').map(u => u.trim());
                for (const url of urls) {
                    await chrome.tabs.create({ url, active: false });
                }
                addActivity(`Opened ${urls.length} companion tabs for ${rule.name}`);
                break;

            case 'pin_tab':
                await chrome.tabs.update(tabId, { pinned: true });
                addActivity(`Pinned tab: ${tab.title?.slice(0, 30)}`);
                break;

            case 'mute_tab':
                await chrome.tabs.update(tabId, { muted: true });
                addActivity(`Muted tab: ${tab.title?.slice(0, 30)}`);
                break;

            case 'redirect':
                await chrome.tabs.update(tabId, { url: rule.action.value });
                addActivity(`Redirected to: ${rule.action.value}`);
                break;

            case 'close_tab':
                await chrome.tabs.remove(tabId);
                addActivity(`Closed tab matching: ${rule.trigger.value}`);
                break;
        }
    };

    // Update rule trigger count
    const updateRuleTrigger = (ruleId: string) => {
        const updated = rules.map(r =>
            r.id === ruleId
                ? { ...r, lastTriggered: Date.now(), triggerCount: r.triggerCount + 1 }
                : r
        );
        saveRules(updated);
    };

    // Create new rule
    const createRule = () => {
        const newRule: TabRule = {
            id: Date.now().toString(),
            name: 'New Rule',
            enabled: true,
            trigger: { type: 'domain', value: '' },
            action: { type: 'open_tabs', value: '' },
            triggerCount: 0
        };
        setEditingRule(newRule);
        setShowEditor(true);
    };

    // Edit rule
    const editRule = (rule: TabRule) => {
        setEditingRule({ ...rule });
        setShowEditor(true);
    };

    // Save rule
    const saveRule = () => {
        if (!editingRule) return;

        const exists = rules.find(r => r.id === editingRule.id);
        let updated: TabRule[];

        if (exists) {
            updated = rules.map(r => r.id === editingRule.id ? editingRule : r);
        } else {
            updated = [...rules, editingRule];
        }

        saveRules(updated);
        setShowEditor(false);
        setEditingRule(null);
        addActivity(`Rule "${editingRule.name}" saved`);
    };

    // Delete rule
    const deleteRule = (id: string) => {
        const updated = rules.filter(r => r.id !== id);
        saveRules(updated);
        addActivity('Rule deleted');
    };

    // Toggle rule enabled
    const toggleRule = (id: string) => {
        const updated = rules.map(r =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
        );
        saveRules(updated);
    };

    // Test rule manually
    const testRule = async (rule: TabRule) => {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
            await executeAction(rule, activeTab.id, activeTab);
        }
    };

    const triggerTypes = [
        { value: 'domain', label: 'Domain contains', placeholder: 'twitter.com' },
        { value: 'url_match', label: 'URL contains', placeholder: '/dashboard' },
        { value: 'tab_count', label: 'Tab count exceeds', placeholder: '20' },
    ];

    const actionTypes = [
        { value: 'open_tabs', label: 'Open tabs', placeholder: 'https://url1.com, https://url2.com' },
        { value: 'pin_tab', label: 'Pin tab', placeholder: '' },
        { value: 'mute_tab', label: 'Mute tab', placeholder: '' },
        { value: 'redirect', label: 'Redirect to', placeholder: 'https://new-url.com' },
        { value: 'close_tab', label: 'Close tab', placeholder: '' },
    ];

    const presetRules = [
        {
            name: 'Social Media Companion',
            trigger: { type: 'domain' as const, value: 'twitter.com' },
            action: { type: 'open_tabs' as const, value: 'https://tweetdeck.twitter.com' }
        },
        {
            name: 'Auto-pin YouTube',
            trigger: { type: 'domain' as const, value: 'youtube.com' },
            action: { type: 'pin_tab' as const, value: '' }
        },
        {
            name: 'Limit Tabs to 20',
            trigger: { type: 'tab_count' as const, value: '20' },
            action: { type: 'close_tab' as const, value: '' }
        },
        {
            name: 'Mute Social Media',
            trigger: { type: 'domain' as const, value: 'facebook.com' },
            action: { type: 'mute_tab' as const, value: '' }
        }
    ];

    const addPreset = (preset: typeof presetRules[0]) => {
        const newRule: TabRule = {
            id: Date.now().toString(),
            name: preset.name,
            enabled: true,
            trigger: preset.trigger,
            action: preset.action,
            triggerCount: 0
        };
        saveRules([...rules, newRule]);
        addActivity(`Added preset: ${preset.name}`);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 11%)',
                borderRadius: '14px',
                border: '1px solid hsl(222 47% 18%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(35 93% 42%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Zap size={22} style={{ color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Tab Automations
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            {rules.length} rules • {rules.filter(r => r.enabled).length} active
                        </p>
                    </div>
                    <button
                        onClick={toggleMonitoring}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: isMonitoring ? 'hsl(142 71% 45%)' : 'hsl(222 47% 16%)',
                            color: isMonitoring ? 'white' : 'hsl(215 20% 65%)'
                        }}
                    >
                        {isMonitoring ? <Pause size={12} /> : <Play size={12} />}
                        {isMonitoring ? 'Active' : 'Paused'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={createRule}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(35 93% 42%) 100%)',
                            color: 'white'
                        }}
                    >
                        <Plus size={14} />
                        New Rule
                    </button>
                </div>
            </div>

            {/* Rule Editor Modal */}
            {showEditor && editingRule && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(45 93% 47% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(45 93% 60%)' }}>
                            {rules.find(r => r.id === editingRule.id) ? 'Edit Rule' : 'New Rule'}
                        </span>
                        <button
                            onClick={() => { setShowEditor(false); setEditingRule(null); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215 20% 55%)' }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Rule Name */}
                        <div>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', display: 'block', marginBottom: '6px' }}>
                                Rule Name
                            </label>
                            <input
                                type="text"
                                value={editingRule.name}
                                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                placeholder="My automation rule"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Trigger */}
                        <div>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', display: 'block', marginBottom: '6px' }}>
                                When...
                            </label>
                            <select
                                value={editingRule.trigger.type}
                                onChange={(e) => setEditingRule({
                                    ...editingRule,
                                    trigger: { ...editingRule.trigger, type: e.target.value as any }
                                })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    outline: 'none',
                                    marginBottom: '8px'
                                }}
                            >
                                {triggerTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={editingRule.trigger.value}
                                onChange={(e) => setEditingRule({
                                    ...editingRule,
                                    trigger: { ...editingRule.trigger, value: e.target.value }
                                })}
                                placeholder={triggerTypes.find(t => t.value === editingRule.trigger.type)?.placeholder}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {/* Action */}
                        <div>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', display: 'block', marginBottom: '6px' }}>
                                Then...
                            </label>
                            <select
                                value={editingRule.action.type}
                                onChange={(e) => setEditingRule({
                                    ...editingRule,
                                    action: { ...editingRule.action, type: e.target.value as any }
                                })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    outline: 'none',
                                    marginBottom: '8px'
                                }}
                            >
                                {actionTypes.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                            {actionTypes.find(a => a.value === editingRule.action.type)?.placeholder && (
                                <input
                                    type="text"
                                    value={editingRule.action.value}
                                    onChange={(e) => setEditingRule({
                                        ...editingRule,
                                        action: { ...editingRule.action, value: e.target.value }
                                    })}
                                    placeholder={actionTypes.find(a => a.value === editingRule.action.type)?.placeholder}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'hsl(222 47% 8%)',
                                        border: '1px solid hsl(222 47% 18%)',
                                        borderRadius: '8px',
                                        color: 'hsl(210 40% 98%)',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                            )}
                        </div>

                        <button
                            onClick={saveRule}
                            disabled={!editingRule.name || !editingRule.trigger.value}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: 'linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(35 93% 42%) 100%)',
                                color: 'white',
                                opacity: (!editingRule.name || !editingRule.trigger.value) ? 0.5 : 1
                            }}
                        >
                            <Save size={14} />
                            Save Rule
                        </button>
                    </div>
                </div>
            )}

            {/* Preset Rules */}
            {rules.length === 0 && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(215 20% 65%)', marginBottom: '12px' }}>
                        Quick Start Presets
                    </p>
                    <div className="space-y-2">
                        {presetRules.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => addPreset(preset)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(222 47% 20%)',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>{preset.name}</span>
                                <Plus size={14} style={{ color: 'hsl(45 93% 55%)' }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Rules List */}
            {rules.length > 0 && (
                <div style={{
                    backgroundColor: 'hsl(222 47% 8%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 15%)',
                    overflow: 'hidden'
                }}>
                    {rules.map((rule, idx) => (
                        <div
                            key={rule.id}
                            style={{
                                padding: '14px 16px',
                                borderBottom: idx < rules.length - 1 ? '1px solid hsl(222 47% 15%)' : 'none',
                                backgroundColor: rule.enabled ? 'transparent' : 'hsl(222 47% 6%)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => toggleRule(rule.id)}
                                    style={{
                                        width: '36px',
                                        height: '20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        backgroundColor: rule.enabled ? 'hsl(142 71% 45%)' : 'hsl(222 47% 20%)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: rule.enabled ? '18px' : '2px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        transition: 'left 0.2s'
                                    }} />
                                </button>

                                <div style={{ flex: 1 }}>
                                    <p style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: rule.enabled ? 'hsl(210 40% 98%)' : 'hsl(215 20% 50%)'
                                    }}>
                                        {rule.name}
                                    </p>
                                    <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', marginTop: '2px' }}>
                                        {triggerTypes.find(t => t.value === rule.trigger.type)?.label}: {rule.trigger.value}
                                        <ArrowRight size={10} style={{ margin: '0 4px', display: 'inline' }} />
                                        {actionTypes.find(a => a.value === rule.action.type)?.label}
                                    </p>
                                    {rule.triggerCount > 0 && (
                                        <p style={{ fontSize: '9px', color: 'hsl(142 71% 55%)', marginTop: '4px' }}>
                                            Triggered {rule.triggerCount} times
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => testRule(rule)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: 'hsl(217 91% 60% / 0.2)',
                                            color: 'hsl(217 91% 65%)',
                                            cursor: 'pointer'
                                        }}
                                        title="Test rule"
                                    >
                                        <Play size={12} />
                                    </button>
                                    <button
                                        onClick={() => editRule(rule)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: 'hsl(222 47% 16%)',
                                            color: 'hsl(215 20% 65%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => deleteRule(rule.id)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                            color: 'hsl(0 84% 65%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '12px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '10px' }}>
                        Recent Activity
                    </p>
                    <div className="space-y-2">
                        {recentActivity.map((activity, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                borderRadius: '6px'
                            }}>
                                <CheckCircle size={12} style={{ color: 'hsl(142 71% 55%)', flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', color: 'hsl(215 20% 70%)', flex: 1 }}>
                                    {activity.message}
                                </span>
                                <span style={{ fontSize: '9px', color: 'hsl(215 20% 45%)' }}>
                                    {activity.time.toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {rules.length === 0 && !showEditor && (
                <div style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <Zap size={36} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        No automation rules yet
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)' }}>
                        Create rules to automate your tab management
                    </p>
                </div>
            )}
        </div>
    );
};

export default TabAutomations;
