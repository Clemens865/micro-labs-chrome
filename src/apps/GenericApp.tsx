import React, { useState, useEffect, useCallback } from 'react';
import { useGemini } from '../hooks/useGemini';
import { usePageContext } from '../hooks/usePageContext';
import { Loader2, Sparkles, Copy, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useAppHistory } from '../hooks/useAppHistory';
import MarkdownRenderer from '../components/MarkdownRenderer';

export interface AppInput {
    id: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'slider';
    label: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    defaultValue?: any;
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
}

export interface AppConfig {
    id: string;
    title: string;
    description: string;
    systemPrompt: string;
    userPromptTemplate: string;
    inputPlaceholder?: string;
    inputs?: AppInput[];
    icon?: React.ReactNode;
    color?: string;
    outputFormat?: 'json' | 'text' | 'markdown';
    requiresPageContext?: boolean;
}

interface GenericAppProps {
    config: AppConfig;
}

const getInitialFormData = (inputs?: AppInput[]): Record<string, any> => {
    const initial: Record<string, any> = {};
    inputs?.forEach(input => {
        initial[input.id] = input.defaultValue !== undefined
            ? input.defaultValue
            : (input.type === 'checkbox' ? false : '');
    });
    return initial;
};

const GenericApp: React.FC<GenericAppProps> = ({ config }) => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const { saveHistoryEntry } = useAppHistory();

    const [formData, setFormData] = useState<Record<string, any>>(() => getInitialFormData(config.inputs));
    const [legacyInput, setLegacyInput] = useState('');
    const [result, setResult] = useState<any>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    // Reset state when switching between apps
    useEffect(() => {
        setFormData(getInitialFormData(config.inputs));
        setLegacyInput('');
        setResult(null);
        setValidationErrors([]);
    }, [config.id]);

    // Handle text selection from page
    useEffect(() => {
        if (context?.selection) {
            if (config.inputs && config.inputs.length > 0) {
                const mainInput = config.inputs.find(i => i.type === 'textarea' || i.type === 'text');
                if (mainInput) {
                    setFormData(prev => ({ ...prev, [mainInput.id]: context.selection }));
                }
            } else {
                setLegacyInput(context.selection);
            }
        }
    }, [context?.selection, config.inputs, config.id]);

    const handleInputChange = useCallback((id: string, value: any) => {
        setFormData(prev => ({ ...prev, [id]: value }));
        setValidationErrors([]);
    }, []);

    const validateInputs = useCallback((): boolean => {
        const errors: string[] = [];

        if (config.inputs && config.inputs.length > 0) {
            config.inputs.forEach(input => {
                if (input.required) {
                    const value = formData[input.id];
                    if (value === undefined || value === null || value === '') {
                        errors.push(`${input.label} is required`);
                    }
                }
            });
        }

        // Check if page context is needed but not available
        if (config.requiresPageContext && !context?.content) {
            errors.push('This app requires page content. Please navigate to a webpage first.');
        }

        setValidationErrors(errors);
        return errors.length === 0;
    }, [config.inputs, config.requiresPageContext, formData, context?.content]);

    const handleRun = async () => {
        if (!validateInputs()) return;

        let userPrompt = config.userPromptTemplate;
        const currentInputs = config.inputs ? { ...formData } : { input: legacyInput };

        // Interpolate structured inputs using replaceAll for multiple occurrences
        if (config.inputs) {
            config.inputs.forEach(input => {
                const value = formData[input.id];
                const replacement = input.type === 'checkbox' ? (value ? 'Yes' : 'No') : String(value || '');
                const pattern = new RegExp(`\\$\\{${input.id}\\}`, 'g');
                userPrompt = userPrompt.replace(pattern, replacement);
            });
        }

        // Interpolate context and legacy input (using replaceAll via regex)
        userPrompt = userPrompt
            .replace(/\$\{input\}/g, legacyInput)
            .replace(/\$\{context\.url\}/g, context?.url || '')
            .replace(/\$\{context\.title\}/g, context?.title || '')
            .replace(/\$\{context\.content\}/g, context?.content?.substring(0, 10000) || '');

        try {
            const outputFormat = config.outputFormat || 'json';
            const data = await generateContent(userPrompt, config.systemPrompt, {
                jsonMode: outputFormat === 'json'
            });
            setResult(data);
            saveHistoryEntry(config.id, config.title, currentInputs, data);
        } catch (err) {
            console.error(err);
        }
    };

    const renderInput = (input: AppInput) => {
        const value = formData[input.id];

        switch (input.type) {
            case 'textarea':
                return (
                    <textarea
                        key={input.id}
                        value={value || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                        className="min-h-[100px] resize-none"
                    />
                );
            case 'select':
                return (
                    <select
                        key={input.id}
                        value={value || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        className="w-full text-sm py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        style={{
                            background: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 18% / 0.5)',
                            color: 'hsl(210 40% 98%)'
                        }}
                    >
                        {input.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            case 'checkbox':
                return (
                    <label
                        key={input.id}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:opacity-90"
                        style={{
                            background: 'hsl(222 47% 11%)',
                            borderColor: 'hsl(222 47% 18% / 0.5)'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => handleInputChange(input.id, e.target.checked)}
                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-offset-0 focus:ring-blue-500"
                            style={{
                                background: 'hsl(222 47% 11%)',
                                borderColor: 'hsl(222 47% 18% / 0.5)'
                            }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'hsl(210 40% 98%)' }}>{input.label}</span>
                    </label>
                );
            case 'slider':
                return (
                    <div key={input.id} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] uppercase-tracking" style={{ color: 'hsl(215 15% 45%)' }}>
                            <label>{input.label}</label>
                            <span className="font-bold text-blue-400">{value}</span>
                        </div>
                        <input
                            type="range"
                            min={input.min || 0}
                            max={input.max || 100}
                            step={input.step || 1}
                            value={value || input.min || 0}
                            onChange={(e) => handleInputChange(input.id, parseInt(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            style={{ background: 'hsl(222 47% 11%)' }}
                        />
                    </div>
                );
            default:
                return (
                    <input
                        key={input.id}
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleInputChange(input.id, e.target.value)}
                        placeholder={input.placeholder}
                        className="w-full"
                    />
                );
        }
    };

    const copyResult = async () => {
        if (!result) return;
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderResult = (data: any, isNested: boolean = false): React.ReactNode => {
        if (data === null || data === undefined) return <span className="text-dim">N/A</span>;

        // Handle plain text/markdown output
        if (typeof data === 'string') {
            // Check if it looks like markdown (has ** or # or - lists)
            const hasMarkdown = /(\*\*|^#|^[-*]\s|^\d+\.|```)/m.test(data);
            if (hasMarkdown && !isNested) {
                return <MarkdownRenderer content={data} />;
            }
            return (
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {data}
                </div>
            );
        }

        if (Array.isArray(data)) {
            return (
                <div className="space-y-2">
                    {data.map((item, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-blue-500 font-bold flex-shrink-0">•</span>
                            <div className="flex-1">{renderResult(item, true)}</div>
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof data === 'object') {
            return (
                <div className="space-y-4">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                            <h4 className="text-[10px] uppercase-tracking font-bold text-blue-400">
                                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                            </h4>
                            <div className="text-sm text-slate-200 leading-relaxed">
                                {renderResult(value, true)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return String(data);
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="space-y-4">
                {config.inputs && config.inputs.length > 0 ? (
                    <div className="space-y-4">
                        {config.inputs.map(input => (
                            <div key={input.id} className="space-y-2">
                                {input.type !== 'checkbox' && input.type !== 'slider' && (
                                    <label className="text-xs uppercase-tracking px-1 flex items-center gap-1" style={{ color: 'hsl(215 15% 45%)' }}>
                                        {input.label}
                                        {input.required && <span className="text-red-400">*</span>}
                                    </label>
                                )}
                                {renderInput(input)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-xs uppercase-tracking px-1" style={{ color: 'hsl(215 15% 45%)' }}>Input Content</label>
                        <textarea
                            value={legacyInput}
                            onChange={(e) => setLegacyInput(e.target.value)}
                            placeholder={config.inputPlaceholder}
                            className="min-h-[120px] resize-none"
                        />
                    </div>
                )}

                {validationErrors.length > 0 && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            {validationErrors.map((err, i) => (
                                <p key={i}>{err}</p>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleRun}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {loading ? 'Processing...' : `Run ${config.title}`}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-2xl">
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-in pt-6" style={{ borderTop: '1px solid hsl(222 47% 18% / 0.5)', marginTop: '24px' }}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs uppercase-tracking" style={{ color: 'hsl(215 15% 45%)' }}>Analysis Result</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={copyResult}
                                className={`p-2 rounded-lg transition-colors ${copied ? 'text-green-400' : ''}`}
                                style={!copied ? { color: 'hsl(215 15% 45%)' } : {}}
                                title={copied ? 'Copied!' : 'Copy'}
                                onMouseEnter={(e) => !copied && (e.currentTarget.style.background = 'hsl(222 47% 15%)')}
                                onMouseLeave={(e) => !copied && (e.currentTarget.style.background = 'transparent')}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={() => setResult(null)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: 'hsl(215 15% 45%)' }}
                                title="Reset"
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(222 47% 15%)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="card p-5 backdrop-blur-sm shadow-inner" style={{ background: 'hsl(222 47% 7% / 0.5)' }}>
                        {renderResult(result)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenericApp;
