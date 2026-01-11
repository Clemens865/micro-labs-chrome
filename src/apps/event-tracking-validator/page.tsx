import React, { useState, useEffect, useRef } from 'react';
import {
    Activity,
    Play,
    Square,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Filter,
    Trash2,
    Eye,
    EyeOff,
    Code,
    Clock,
    Tag,
    ChevronDown,
    ChevronUp,
    Search
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface TrackedEvent {
    id: string;
    timestamp: number;
    name: string;
    properties: Record<string, any>;
    source: 'gtm' | 'ga4' | 'segment' | 'mixpanel' | 'custom' | 'unknown';
    validation: {
        status: 'valid' | 'warning' | 'error';
        issues: string[];
    };
}

interface ValidationRule {
    id: string;
    eventName: string;
    requiredProperties: string[];
    optionalProperties?: string[];
    propertyRules?: {
        property: string;
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        format?: string;
        minLength?: number;
        maxLength?: number;
        enum?: string[];
    }[];
}

const EventTrackingValidatorApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedEvents, setCapturedEvents] = useState<TrackedEvent[]>([]);
    const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showRulesEditor, setShowRulesEditor] = useState(false);
    const [rulesText, setRulesText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load saved rules
    useEffect(() => {
        chrome.storage.local.get('eventValidationRules', (data) => {
            if (data.eventValidationRules && Array.isArray(data.eventValidationRules)) {
                setValidationRules(data.eventValidationRules);
                setRulesText(JSON.stringify(data.eventValidationRules, null, 2));
            }
        });
    }, []);

    // Listen for tracking events from content script
    useEffect(() => {
        const handleMessage = (message: any, sender: any, sendResponse: any) => {
            if (message.type === 'TRACKING_EVENT' && isCapturing) {
                const event = validateEvent({
                    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    name: message.eventName,
                    properties: message.properties || {},
                    source: detectSource(message),
                    validation: { status: 'valid', issues: [] }
                });
                setCapturedEvents(prev => [event, ...prev]);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(handleMessage);
            return () => chrome.runtime.onMessage.removeListener(handleMessage);
        }
    }, [isCapturing, validationRules]);

    const detectSource = (message: any): TrackedEvent['source'] => {
        if (message.source) return message.source;
        if (message.gtm) return 'gtm';
        if (message.ga4) return 'ga4';
        if (message.segment) return 'segment';
        if (message.mixpanel) return 'mixpanel';
        return 'unknown';
    };

    const validateEvent = (event: TrackedEvent): TrackedEvent => {
        const rule = validationRules.find(r =>
            r.eventName === event.name || r.eventName === '*'
        );

        if (!rule) {
            return {
                ...event,
                validation: {
                    status: 'warning',
                    issues: ['No validation rule defined for this event']
                }
            };
        }

        const issues: string[] = [];

        // Check required properties
        rule.requiredProperties.forEach(prop => {
            if (!(prop in event.properties)) {
                issues.push(`Missing required property: ${prop}`);
            }
        });

        // Check property rules
        rule.propertyRules?.forEach(pr => {
            if (pr.property in event.properties) {
                const value = event.properties[pr.property];
                const actualType = Array.isArray(value) ? 'array' : typeof value;

                if (actualType !== pr.type) {
                    issues.push(`Property '${pr.property}' should be ${pr.type}, got ${actualType}`);
                }

                if (pr.type === 'string' && typeof value === 'string') {
                    if (pr.minLength && value.length < pr.minLength) {
                        issues.push(`Property '${pr.property}' too short (min: ${pr.minLength})`);
                    }
                    if (pr.maxLength && value.length > pr.maxLength) {
                        issues.push(`Property '${pr.property}' too long (max: ${pr.maxLength})`);
                    }
                    if (pr.enum && !pr.enum.includes(value)) {
                        issues.push(`Property '${pr.property}' must be one of: ${pr.enum.join(', ')}`);
                    }
                }
            }
        });

        return {
            ...event,
            validation: {
                status: issues.some(i => i.includes('Missing required')) ? 'error' :
                    issues.length > 0 ? 'warning' : 'valid',
                issues
            }
        };
    };

    const startCapture = async () => {
        setIsCapturing(true);
        setCapturedEvents([]);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                // Inject event capture script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Intercept common tracking calls
                        const originalPush = Array.prototype.push;

                        // GTM dataLayer intercept
                        if ((window as any).dataLayer) {
                            (window as any).dataLayer.push = function (...args: any[]) {
                                args.forEach(item => {
                                    if (item && typeof item === 'object' && item.event) {
                                        chrome.runtime.sendMessage({
                                            type: 'TRACKING_EVENT',
                                            eventName: item.event,
                                            properties: item,
                                            source: 'gtm'
                                        });
                                    }
                                });
                                return originalPush.apply(this, args);
                            };
                        }

                        // GA4 gtag intercept
                        const originalGtag = (window as any).gtag;
                        if (originalGtag) {
                            (window as any).gtag = function (...args: any[]) {
                                if (args[0] === 'event' && args[1]) {
                                    chrome.runtime.sendMessage({
                                        type: 'TRACKING_EVENT',
                                        eventName: args[1],
                                        properties: args[2] || {},
                                        source: 'ga4'
                                    });
                                }
                                return originalGtag.apply(this, args);
                            };
                        }

                        console.log('MicroLabs: Event capture started');
                    }
                });
                success('Event capture started');
            }
        } catch (err) {
            console.error('Failed to start capture:', err);
            warning('Could not inject capture script');
        }
    };

    const stopCapture = () => {
        setIsCapturing(false);
        success(`Captured ${capturedEvents.length} events`);
    };

    const generateRulesFromEvents = async () => {
        if (capturedEvents.length === 0) {
            warning('Capture some events first');
            return;
        }

        setAnalyzing(true);

        try {
            const eventSample = capturedEvents.slice(0, 20).map(e => ({
                name: e.name,
                properties: e.properties
            }));

            const result = await generateContent(
                `Analyze these tracking events and generate validation rules:

${JSON.stringify(eventSample, null, 2)}

For each unique event name, create a validation rule with:
1. Required properties (properties that appear in ALL events of that type)
2. Optional properties (properties that appear in SOME events)
3. Property type rules (inferred from values)
4. Value constraints (enums for limited value sets, length limits, etc.)

Return as JSON array:
[
  {
    "id": "rule-1",
    "eventName": "page_view",
    "requiredProperties": ["page_title", "page_location"],
    "optionalProperties": ["page_referrer"],
    "propertyRules": [
      {
        "property": "page_title",
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      {
        "property": "engagement_type",
        "type": "string",
        "enum": ["click", "view", "scroll"]
      }
    ]
  }
]`,
                `You are a tracking implementation specialist. Generate comprehensive validation rules
that ensure data quality for analytics events. Be specific about types and constraints.`,
                { jsonMode: true }
            );

            if (Array.isArray(result)) {
                setValidationRules(result);
                setRulesText(JSON.stringify(result, null, 2));
                chrome.storage.local.set({ eventValidationRules: result });
                success('Generated validation rules');

                // Re-validate all events
                setCapturedEvents(prev => prev.map(validateEvent));
            }
        } catch (err) {
            console.error('Rule generation error:', err);
            warning('Failed to generate rules');
        } finally {
            setAnalyzing(false);
        }
    };

    const saveRules = () => {
        try {
            const parsed = JSON.parse(rulesText);
            setValidationRules(parsed);
            chrome.storage.local.set({ eventValidationRules: parsed });
            success('Rules saved');
            setShowRulesEditor(false);

            // Re-validate all events
            setCapturedEvents(prev => prev.map(validateEvent));
        } catch (err) {
            warning('Invalid JSON format');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            success('Copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            warning('Failed to copy');
        }
    };

    const exportReport = () => {
        const report = {
            capturedAt: new Date().toISOString(),
            url: context?.url,
            totalEvents: capturedEvents.length,
            validEvents: capturedEvents.filter(e => e.validation.status === 'valid').length,
            warningEvents: capturedEvents.filter(e => e.validation.status === 'warning').length,
            errorEvents: capturedEvents.filter(e => e.validation.status === 'error').length,
            events: capturedEvents,
            validationRules
        };

        copyToClipboard(JSON.stringify(report, null, 2));
        info('Report copied to clipboard');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid': return <CheckCircle size={14} className="text-green-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-yellow-400" />;
            case 'error': return <XCircle size={14} className="text-red-400" />;
            default: return <AlertCircle size={14} className="text-slate-400" />;
        }
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'gtm': return 'bg-blue-500/20 text-blue-400';
            case 'ga4': return 'bg-orange-500/20 text-orange-400';
            case 'segment': return 'bg-green-500/20 text-green-400';
            case 'mixpanel': return 'bg-purple-500/20 text-purple-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const filteredEvents = capturedEvents.filter(event => {
        const matchesStatus = filterStatus === 'all' || event.validation.status === filterStatus;
        const matchesSource = filterSource === 'all' || event.source === filterSource;
        const matchesSearch = !searchQuery ||
            event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            JSON.stringify(event.properties).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSource && matchesSearch;
    });

    const stats = {
        valid: capturedEvents.filter(e => e.validation.status === 'valid').length,
        warning: capturedEvents.filter(e => e.validation.status === 'warning').length,
        error: capturedEvents.filter(e => e.validation.status === 'error').length
    };

    return (
        <div className="space-y-6">
            {/* Capture Controls */}
            <div className="flex items-center gap-2">
                {!isCapturing ? (
                    <button
                        onClick={startCapture}
                        className="btn-primary flex items-center gap-2 flex-1"
                    >
                        <Play size={16} />
                        Start Capture
                    </button>
                ) : (
                    <button
                        onClick={stopCapture}
                        className="btn-primary bg-red-500 flex items-center gap-2 flex-1"
                    >
                        <Square size={16} />
                        Stop Capture
                    </button>
                )}
                <button
                    onClick={() => setCapturedEvents([])}
                    disabled={capturedEvents.length === 0}
                    className="btn-secondary p-3"
                    title="Clear events"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Capture Status */}
            {isCapturing && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-400">
                        Capturing events... ({capturedEvents.length})
                    </span>
                </div>
            )}

            {/* Stats */}
            {capturedEvents.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                        <p className="text-2xl font-bold text-green-400">{stats.valid}</p>
                        <p className="text-[10px] text-green-300/60 uppercase">Valid</p>
                    </div>
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
                        <p className="text-[10px] text-yellow-300/60 uppercase">Warnings</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                        <p className="text-2xl font-bold text-red-400">{stats.error}</p>
                        <p className="text-[10px] text-red-300/60 uppercase">Errors</p>
                    </div>
                </div>
            )}

            {/* AI Generate Rules */}
            {capturedEvents.length > 0 && !isCapturing && (
                <button
                    onClick={generateRulesFromEvents}
                    disabled={analyzing}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                    {analyzing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Validation Rules
                        </>
                    )}
                </button>
            )}

            {/* Rules Editor Toggle */}
            <button
                onClick={() => setShowRulesEditor(!showRulesEditor)}
                className="w-full btn-secondary flex items-center justify-between"
            >
                <span className="flex items-center gap-2">
                    <Code size={16} />
                    Validation Rules ({validationRules.length})
                </span>
                {showRulesEditor ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRulesEditor && (
                <div className="space-y-2">
                    <textarea
                        value={rulesText}
                        onChange={(e) => setRulesText(e.target.value)}
                        className="input-field w-full min-h-[150px] font-mono text-xs"
                        placeholder="Paste or edit validation rules JSON..."
                    />
                    <button onClick={saveRules} className="btn-primary w-full">
                        Save Rules
                    </button>
                </div>
            )}

            {/* Filters */}
            {capturedEvents.length > 0 && (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search events..."
                            className="input-field w-full pl-9 text-xs"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-field text-xs w-24"
                    >
                        <option value="all">All</option>
                        <option value="valid">Valid</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
            )}

            {/* Events List */}
            {filteredEvents.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredEvents.map((event) => (
                        <div
                            key={event.id}
                            className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                        >
                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setExpandedEvent(
                                    expandedEvent === event.id ? null : event.id
                                )}
                            >
                                {getStatusIcon(event.validation.status)}
                                <span className="text-sm font-medium text-slate-200 flex-1 truncate">
                                    {event.name}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getSourceColor(event.source)}`}>
                                    {event.source}
                                </span>
                                {expandedEvent === event.id ?
                                    <ChevronUp size={14} /> :
                                    <ChevronDown size={14} />
                                }
                            </div>

                            {expandedEvent === event.id && (
                                <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-3">
                                    {/* Timestamp */}
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock size={12} />
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </div>

                                    {/* Validation Issues */}
                                    {event.validation.issues.length > 0 && (
                                        <div className="space-y-1">
                                            {event.validation.issues.map((issue, idx) => (
                                                <p key={idx} className={`text-xs ${
                                                    issue.includes('Missing required') ? 'text-red-400' : 'text-yellow-400'
                                                }`}>
                                                    • {issue}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Properties */}
                                    <div>
                                        <h4 className="text-[10px] text-slate-500 uppercase mb-1">Properties</h4>
                                        <pre className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(event.properties, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Export */}
            {capturedEvents.length > 0 && !isCapturing && (
                <div className="flex gap-2">
                    <button
                        onClick={exportReport}
                        className="btn-secondary flex items-center gap-2 flex-1"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        Export Report
                    </button>
                </div>
            )}

            {/* Send to Integrations */}
            {integrations.length > 0 && capturedEvents.length > 0 && (
                <SendToIntegrations
                    appId="event-tracking-validator"
                    appName="Event Tracking Validator"
                    data={{
                        type: 'event_tracking_report',
                        url: context?.url,
                        stats,
                        events: capturedEvents
                    }}
                    source={{ url: context?.url, title: context?.title }}
                />
            )}

            {/* Empty State */}
            {capturedEvents.length === 0 && !isCapturing && (
                <div className="text-center py-8 text-slate-500">
                    <Activity size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No events captured</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Click "Start Capture" and interact with the page
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Captures GTM dataLayer, GA4 gtag, and other tracking events.
                    AI generates validation rules from captured data to ensure tracking quality.
                </p>
            </div>
        </div>
    );
};

export default EventTrackingValidatorApp;
