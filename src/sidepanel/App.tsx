import React, { useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Search, Settings, Home, MessageSquare, Globe, Mail, Youtube, Zap, Map as MapIcon, Loader2, Target, Briefcase, GraduationCap, ShieldCheck, History, Trash2, ChevronRight, Clock, Heart, Plane, Code2, Utensils, CheckCircle, Share2, ClipboardList, Terminal, Palette, Baby, Lightbulb, UserCheck, FileText, MessageSquareReply, Layers, ListChecks, Megaphone, PenTool, Bug, BookOpen, Languages, RefreshCw, ExternalLink, FileCode, ShoppingCart, Newspaper, MessageCircle, HelpCircle, AlertCircle, Pen, Star, TrendingUp, Keyboard, Download, Copy, FileJson, User, Building2, Phone, Link, Save, ChevronDown, ChevronUp, Award, Sparkles, Plus, X, Scale } from 'lucide-react';
import { appRegistry, getAppComponent, AppMetadata, getGenericConfig } from '../apps/AppRegistry';
import GenericApp from '../apps/GenericApp';
import { usePageContext, SiteType } from '../hooks/usePageContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppHistory, HistoryItem } from '../hooks/useAppHistory';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/useToast';
import { useAppStats } from '../hooks/useAppStats';
import { useUserProfile, UserProfile, Experience } from '../hooks/useUserProfile';
import ToastContainer from '../components/ToastContainer';

const App: React.FC = () => {
    const { context, suggestedApps, siteType, isLoading: contextLoading, refreshContext } = usePageContext();
    const { history, deleteHistoryEntry, clearHistory } = useAppHistory();
    const { favorites, toggleFavorite, isFavorite } = useFavorites();
    const { toasts, dismissToast, success, info, warning } = useToast();
    const { trackUsage, getPopularApps, totalUsageCount } = useAppStats();
    const { profile, saveProfile, hasProfile, loading: profileLoading } = useUserProfile();
    const [currentAppId, setCurrentAppId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [profileForm, setProfileForm] = useState<UserProfile>(profile);
    const [profileSectionExpanded, setProfileSectionExpanded] = useState(false);
    const [companySectionExpanded, setCompanySectionExpanded] = useState(false);
    const [outreachSectionExpanded, setOutreachSectionExpanded] = useState(false);
    const [personalSectionExpanded, setPersonalSectionExpanded] = useState(false);

    // Update profile form when profile loads
    useEffect(() => {
        if (!profileLoading) {
            setProfileForm(profile);
        }
    }, [profile, profileLoading]);

    // Get favorite apps metadata
    const favoriteApps = useMemo(() => {
        return favorites
            .map(id => appRegistry.find(app => app.id === id))
            .filter((app): app is AppMetadata => app !== undefined);
    }, [favorites]);

    // Get popular apps metadata
    const popularApps = useMemo(() => {
        const popularIds = getPopularApps(4);
        return popularIds
            .map(id => appRegistry.find(app => app.id === id))
            .filter((app): app is AppMetadata => app !== undefined);
    }, [getPopularApps]);

    const renderAppIcon = (id: string | null, size = 20) => {
        if (!id) return <Zap size={size} />;

        switch (id) {
            case 'digest': return <Globe size={size} />;
            case 'chat': return <MessageSquare size={size} />;
            case 'youtube': return <Youtube size={size} />;
            case 'email': return <Mail size={size} />;
            case 'neighborhood-intel': return <MapIcon size={size} />;
            case 'seo-architect': return <Search size={size} />;
            case 'cold-outreach': return <Target size={size} />;
            case 'job-market-pulse': return <Briefcase size={size} />;
            case 'academic-insight': return <GraduationCap size={size} />;
            case 'lex-guard': return <ShieldCheck size={size} />;
            case 'performance-pro': return <Zap size={size} />;
            // Batch 3
            case 'sentiment-pulse': return <Heart size={size} />;
            case 'travel-scout': return <Plane size={size} />;
            case 'code-morph': return <Code2 size={size} />;
            case 'recipe-remix': return <Utensils size={size} />;
            case 'fact-check-pro': return <CheckCircle size={size} />;
            case 'social-viral': return <Share2 size={size} />;
            case 'meeting-minutes': return <ClipboardList size={size} />;
            case 'regex-wizard': return <Terminal size={size} />;
            case 'color-extract': return <Palette size={size} />;
            case 'eli5-explainer': return <Baby size={size} />;
            case 'idea-spark': return <Lightbulb size={size} />;
            case 'ask-expert': return <UserCheck size={size} />;
            // Batch 4
            case 'tldr-summary': return <FileText size={size} />;
            case 'reply-suggester': return <MessageSquareReply size={size} />;
            case 'schema-markup': return <Layers size={size} />;
            case 'bullet-pointer': return <ListChecks size={size} />;
            case 'headline-generator': return <Megaphone size={size} />;
            case 'tone-rewriter': return <PenTool size={size} />;
            case 'bug-report-writer': return <Bug size={size} />;
            case 'glossary-generator': return <BookOpen size={size} />;
            case 'translator-pro': return <Languages size={size} />;
            case 'content-refresher': return <RefreshCw size={size} />;
            case 'reading-time': return <Clock size={size} />;
            case 'cta-generator': return <Target size={size} />;
            case 'svg-icon-generator': return <Pen size={size} />;
            case 'terms-analyzer': return <Scale size={size} />;
            case 'console-monitor': return <Terminal size={size} />;
            default: return <Zap size={size} />;
        }
    };

    const renderSiteTypeIcon = (type: SiteType, size = 16) => {
        switch (type) {
            case 'video': return <Youtube size={size} />;
            case 'article': return <Newspaper size={size} />;
            case 'ecommerce': return <ShoppingCart size={size} />;
            case 'documentation': return <BookOpen size={size} />;
            case 'code': return <FileCode size={size} />;
            case 'qa': return <HelpCircle size={size} />;
            case 'social': return <Share2 size={size} />;
            case 'forum': return <MessageCircle size={size} />;
            case 'email': return <Mail size={size} />;
            case 'search': return <Search size={size} />;
            case 'pdf': return <FileText size={size} />;
            case 'restricted': return <AlertCircle size={size} />;
            default: return <Globe size={size} />;
        }
    };

    const getSiteTypeLabel = (type: SiteType): string => {
        const labels: Record<SiteType, string> = {
            video: 'Video',
            article: 'Article',
            ecommerce: 'E-Commerce',
            documentation: 'Documentation',
            code: 'Code Repository',
            qa: 'Q&A',
            social: 'Social Media',
            forum: 'Forum',
            email: 'Email',
            search: 'Search Results',
            pdf: 'PDF Document',
            webpage: 'Webpage',
            restricted: 'Restricted',
            unknown: 'Unknown'
        };
        return labels[type] || 'Webpage';
    };

    // Handle app selection with tracking
    const handleSelectApp = useCallback((appId: string) => {
        setCurrentAppId(appId);
        trackUsage(appId);
    }, [trackUsage]);

    // Handle favorite toggle with toast
    const handleToggleFavorite = useCallback(async (appId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const added = await toggleFavorite(appId);
        const app = appRegistry.find(a => a.id === appId);
        if (added) {
            success(`Added "${app?.title}" to favorites`);
        } else {
            info(`Removed "${app?.title}" from favorites`);
        }
    }, [toggleFavorite, success, info]);

    // Export history
    const exportHistory = useCallback((format: 'json' | 'markdown') => {
        if (history.length === 0) {
            warning('No history to export');
            return;
        }

        let content: string;
        let filename: string;
        let mimeType: string;

        if (format === 'json') {
            content = JSON.stringify(history, null, 2);
            filename = `microlabs-history-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        } else {
            content = `# MicroLabs History\n\nExported: ${new Date().toLocaleString()}\n\n---\n\n`;
            history.forEach(item => {
                content += `## ${item.appTitle}\n`;
                content += `**Date:** ${new Date(item.timestamp).toLocaleString()}\n\n`;
                content += `**Input:** ${JSON.stringify(item.inputs)}\n\n`;
                if (item.result) {
                    content += `**Result:**\n\`\`\`json\n${JSON.stringify(item.result, null, 2)}\n\`\`\`\n\n`;
                }
                content += `---\n\n`;
            });
            filename = `microlabs-history-${new Date().toISOString().split('T')[0]}.md`;
            mimeType = 'text/markdown';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        success(`Exported history as ${format.toUpperCase()}`);
    }, [history, success, warning]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Escape to go back
            if (e.key === 'Escape') {
                if (showSettings) setShowSettings(false);
                else if (showHistory) setShowHistory(false);
                else if (showKeyboardHelp) setShowKeyboardHelp(false);
                else if (currentAppId) setCurrentAppId(null);
            }

            // Cmd/Ctrl + K for search focus
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                searchInput?.focus();
            }

            // Cmd/Ctrl + , for settings
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                setShowSettings(s => !s);
                setShowHistory(false);
            }

            // Cmd/Ctrl + H for history
            if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
                e.preventDefault();
                setShowHistory(h => !h);
                setShowSettings(false);
            }

            // ? for keyboard shortcuts help
            if (e.key === '?' && !e.shiftKey) {
                setShowKeyboardHelp(k => !k);
            }

            // Number keys 1-9 for quick app access (favorites)
            if (!e.metaKey && !e.ctrlKey && e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (favoriteApps[index]) {
                    handleSelectApp(favoriteApps[index].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentAppId, showSettings, showHistory, showKeyboardHelp, favoriteApps, handleSelectApp]);

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
            if (response?.apiKey) setApiKey(response.apiKey);
        });
    }, []);

    const saveApiKey = () => {
        chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey }, () => {
            success('API key saved successfully');
        });
    };

    const handleSaveProfile = async () => {
        const saved = await saveProfile(profileForm);
        if (saved) {
            success('Profile saved successfully');
        } else {
            warning('Failed to save profile');
        }
    };

    const updateProfileField = (field: keyof UserProfile, value: string | Experience[]) => {
        setProfileForm(prev => ({ ...prev, [field]: value }));
    };

    const addExperience = () => {
        const newExp: Experience = { company: '', role: '', duration: '', highlights: '' };
        setProfileForm(prev => ({
            ...prev,
            experiences: [...(prev.experiences || []), newExp]
        }));
    };

    const updateExperience = (index: number, field: keyof Experience, value: string) => {
        setProfileForm(prev => ({
            ...prev,
            experiences: prev.experiences.map((exp, i) =>
                i === index ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const removeExperience = (index: number) => {
        setProfileForm(prev => ({
            ...prev,
            experiences: prev.experiences.filter((_, i) => i !== index)
        }));
    };

    const filteredApps = useMemo(() => {
        if (!searchQuery) return appRegistry;
        return appRegistry.filter(app =>
            app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const CurrentAppComponent = useMemo(() => {
        if (!currentAppId) return null;
        return getAppComponent(currentAppId);
    }, [currentAppId]);

    const currentAppMetadata = useMemo(() => {
        return appRegistry.find(a => a.id === currentAppId);
    }, [currentAppId]);

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Keyboard Shortcuts Modal */}
            {showKeyboardHelp && (
                <div
                    className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowKeyboardHelp(false)}
                >
                    <div
                        className="card p-6 max-w-sm w-full animate-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black flex items-center gap-2">
                                <Keyboard size={20} className="text-blue-500" />
                                Keyboard Shortcuts
                            </h2>
                            <button
                                onClick={() => setShowKeyboardHelp(false)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <span className="text-slate-500">×</span>
                            </button>
                        </div>
                        <div className="space-y-3">
                            {[
                                { keys: ['⌘', 'K'], desc: 'Search apps' },
                                { keys: ['⌘', ','], desc: 'Open settings' },
                                { keys: ['⌘', 'H'], desc: 'View history' },
                                { keys: ['Esc'], desc: 'Go back' },
                                { keys: ['1-9'], desc: 'Quick access favorites' },
                                { keys: ['?'], desc: 'Show this help' },
                            ].map((shortcut, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">{shortcut.desc}</span>
                                    <div className="flex gap-1">
                                        {shortcut.keys.map((key, j) => (
                                            <kbd
                                                key={j}
                                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300"
                                            >
                                                {key}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass z-50">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setCurrentAppId(null); setShowSettings(false); setShowHistory(false); }}>
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-110">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="text-lg font-black tracking-tight-er">MicroLabs</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowKeyboardHelp(true)}
                        title="Keyboard shortcuts (?)"
                        style={{
                            padding: '8px',
                            borderRadius: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'hsl(215 20% 45%)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'hsl(222 47% 15%)';
                            e.currentTarget.style.color = 'hsl(210 40% 98%)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'hsl(215 20% 45%)';
                        }}
                    >
                        <Keyboard size={18} />
                    </button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            background: showHistory ? 'hsl(239 84% 67%)' : 'transparent',
                            border: 'none',
                            color: showHistory ? 'white' : 'hsl(215 20% 55%)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!showHistory) {
                                e.currentTarget.style.background = 'hsl(222 47% 15%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showHistory) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'hsl(215 20% 55%)';
                            }
                        }}
                    >
                        <History size={20} />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            background: showSettings ? 'hsl(217 91% 60%)' : 'transparent',
                            border: 'none',
                            color: showSettings ? 'white' : 'hsl(215 20% 55%)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!showSettings) {
                                e.currentTarget.style.background = 'hsl(222 47% 15%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showSettings) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'hsl(215 20% 55%)';
                            }
                        }}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 space-y-6 overflow-y-auto">
                {showSettings ? (
                    <div className="space-y-4 animate-in">
                        <button
                            className="btn-secondary flex items-center gap-2 text-xs"
                            onClick={() => setShowSettings(false)}
                        >
                            <Home size={14} />
                            <span>Back to Library</span>
                        </button>

                        {/* API Key Section */}
                        <div className="card p-5">
                            <h2 className="text-lg mb-4 font-black flex items-center gap-2">
                                <Zap size={18} className="text-blue-500" /> API Configuration
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase-tracking text-dim">Gemini API Key</label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Paste your API key here..."
                                    />
                                    <p className="text-xs text-dim">Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.</p>
                                </div>
                                <button onClick={saveApiKey} className="btn-primary w-full">
                                    Save API Key
                                </button>
                            </div>
                        </div>

                        {/* User Profile Section */}
                        <div className="card p-5">
                            <button
                                onClick={() => setProfileSectionExpanded(!profileSectionExpanded)}
                                className="w-full flex items-center justify-between mb-4"
                            >
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <User size={18} className="text-emerald-500" /> Your Profile
                                </h2>
                                <div className="flex items-center gap-2">
                                    {hasProfile && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">Configured</span>}
                                    {profileSectionExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>
                            </button>
                            {profileSectionExpanded && (
                                <div className="space-y-4">
                                    <p className="text-xs text-dim">Add your details to get personalized outreach suggestions in Lead Extractor and other apps.</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Your Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.name}
                                                onChange={(e) => updateProfileField('name', e.target.value)}
                                                placeholder="John Doe"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Your Role</label>
                                            <input
                                                type="text"
                                                value={profileForm.role}
                                                onChange={(e) => updateProfileField('role', e.target.value)}
                                                placeholder="Sales Manager"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Email</label>
                                            <input
                                                type="email"
                                                value={profileForm.email}
                                                onChange={(e) => updateProfileField('email', e.target.value)}
                                                placeholder="john@company.com"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Phone</label>
                                            <input
                                                type="tel"
                                                value={profileForm.phone}
                                                onChange={(e) => updateProfileField('phone', e.target.value)}
                                                placeholder="+1 234 567 8900"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase-tracking text-dim">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            value={profileForm.linkedInUrl}
                                            onChange={(e) => updateProfileField('linkedInUrl', e.target.value)}
                                            placeholder="https://linkedin.com/in/johndoe"
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Company Profile Section */}
                        <div className="card p-5">
                            <button
                                onClick={() => setCompanySectionExpanded(!companySectionExpanded)}
                                className="w-full flex items-center justify-between mb-4"
                            >
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <Building2 size={18} className="text-purple-500" /> Company Profile
                                </h2>
                                <div className="flex items-center gap-2">
                                    {profileForm.companyName && <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full font-bold">Configured</span>}
                                    {companySectionExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>
                            </button>
                            {companySectionExpanded && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Company Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.companyName}
                                                onChange={(e) => updateProfileField('companyName', e.target.value)}
                                                placeholder="Acme Inc"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Industry</label>
                                            <input
                                                type="text"
                                                value={profileForm.companyIndustry}
                                                onChange={(e) => updateProfileField('companyIndustry', e.target.value)}
                                                placeholder="SaaS / Tech"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Company Size</label>
                                            <input
                                                type="text"
                                                value={profileForm.companySize}
                                                onChange={(e) => updateProfileField('companySize', e.target.value)}
                                                placeholder="50-200"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Website</label>
                                            <input
                                                type="url"
                                                value={profileForm.companyWebsite}
                                                onChange={(e) => updateProfileField('companyWebsite', e.target.value)}
                                                placeholder="https://acme.com"
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Outreach Context Section */}
                        <div className="card p-5">
                            <button
                                onClick={() => setOutreachSectionExpanded(!outreachSectionExpanded)}
                                className="w-full flex items-center justify-between mb-4"
                            >
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <Target size={18} className="text-orange-500" /> Outreach Context
                                </h2>
                                <div className="flex items-center gap-2">
                                    {profileForm.valueProposition && <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-bold">Configured</span>}
                                    {outreachSectionExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>
                            </button>
                            {outreachSectionExpanded && (
                                <div className="space-y-4">
                                    <p className="text-xs text-dim">Help AI generate more relevant outreach by describing what you sell and who you target.</p>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase-tracking text-dim">Product/Service</label>
                                        <input
                                            type="text"
                                            value={profileForm.productService}
                                            onChange={(e) => updateProfileField('productService', e.target.value)}
                                            placeholder="AI-powered analytics platform"
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase-tracking text-dim">Value Proposition</label>
                                        <textarea
                                            value={profileForm.valueProposition}
                                            onChange={(e) => updateProfileField('valueProposition', e.target.value)}
                                            placeholder="We help companies reduce churn by 40% through predictive analytics..."
                                            className="text-sm min-h-[60px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase-tracking text-dim">Target Audience</label>
                                        <input
                                            type="text"
                                            value={profileForm.targetAudience}
                                            onChange={(e) => updateProfileField('targetAudience', e.target.value)}
                                            placeholder="VP Sales, Revenue Ops, SaaS companies 50-500 employees"
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase-tracking text-dim">Pain Points You Solve</label>
                                        <textarea
                                            value={profileForm.typicalPainPoints}
                                            onChange={(e) => updateProfileField('typicalPainPoints', e.target.value)}
                                            placeholder="Manual reporting, lack of visibility into customer health, reactive churn prevention..."
                                            className="text-sm min-h-[60px] resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Personal Background Section */}
                        <div className="card p-5">
                            <button
                                onClick={() => setPersonalSectionExpanded(!personalSectionExpanded)}
                                className="w-full flex items-center justify-between mb-4"
                            >
                                <h2 className="text-lg font-black flex items-center gap-2">
                                    <Award size={18} className="text-cyan-500" /> Personal Background
                                </h2>
                                <div className="flex items-center gap-2">
                                    {(profileForm.skills || profileForm.interests) && <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-bold">Configured</span>}
                                    {personalSectionExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                </div>
                            </button>
                            {personalSectionExpanded && (
                                <div className="space-y-4">
                                    <p className="text-xs text-dim">Add your skills, interests, and experiences to enable personal-style outreach that finds common ground with leads.</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Your Skills</label>
                                            <input
                                                type="text"
                                                value={profileForm.skills || ''}
                                                onChange={(e) => updateProfileField('skills', e.target.value)}
                                                placeholder="Leadership, Python, Data Analysis..."
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Your Interests</label>
                                            <input
                                                type="text"
                                                value={profileForm.interests || ''}
                                                onChange={(e) => updateProfileField('interests', e.target.value)}
                                                placeholder="AI, Startups, Running, Travel..."
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Education</label>
                                            <input
                                                type="text"
                                                value={profileForm.education || ''}
                                                onChange={(e) => updateProfileField('education', e.target.value)}
                                                placeholder="MBA Stanford, CS MIT..."
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase-tracking text-dim">Achievements</label>
                                            <input
                                                type="text"
                                                value={profileForm.achievements || ''}
                                                onChange={(e) => updateProfileField('achievements', e.target.value)}
                                                placeholder="Forbes 30 Under 30, TED speaker..."
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Experience List */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] uppercase-tracking text-dim">Past Experiences</label>
                                            <button
                                                onClick={addExperience}
                                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                                            >
                                                <Plus size={12} /> Add Experience
                                            </button>
                                        </div>

                                        {(profileForm.experiences || []).map((exp, idx) => (
                                            <div key={idx} className="p-3 bg-slate-800/50 rounded-xl space-y-2 relative group">
                                                <button
                                                    onClick={() => removeExperience(idx)}
                                                    className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={exp.company}
                                                        onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                                                        placeholder="Company"
                                                        className="text-xs bg-slate-900/50 border-slate-700"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={exp.role}
                                                        onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                                                        placeholder="Role"
                                                        className="text-xs bg-slate-900/50 border-slate-700"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        value={exp.duration}
                                                        onChange={(e) => updateExperience(idx, 'duration', e.target.value)}
                                                        placeholder="Duration (e.g., 2019-2022)"
                                                        className="text-xs bg-slate-900/50 border-slate-700"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={exp.highlights}
                                                        onChange={(e) => updateExperience(idx, 'highlights', e.target.value)}
                                                        placeholder="Key highlights"
                                                        className="text-xs bg-slate-900/50 border-slate-700"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Profile Button */}
                        <button onClick={handleSaveProfile} className="btn-primary w-full flex items-center justify-center gap-2">
                            <Save size={16} /> Save Profile
                        </button>

                        {/* Stats Section */}
                        <div className="card p-5">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                <TrendingUp size={14} /> Usage Statistics
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-blue-400">{totalUsageCount}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Uses</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-purple-400">{favorites.length}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Favorites</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : showHistory ? (
                    <div className="space-y-6 animate-in">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl font-black">History</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => exportHistory('markdown')}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-bold uppercase-tracking p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Export as Markdown"
                                >
                                    <Download size={12} />
                                </button>
                                <button
                                    onClick={() => exportHistory('json')}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-bold uppercase-tracking p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Export as JSON"
                                >
                                    <FileJson size={12} />
                                </button>
                                <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1.5 font-bold uppercase-tracking p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 size={12} /> Clear
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="text-center py-20 card border-dashed opacity-50">
                                    <Clock size={32} className="mx-auto mb-3 text-slate-700" />
                                    <p className="text-sm">No activity recorded yet.</p>
                                </div>
                            ) : (
                                history.map(item => (
                                    <div key={item.id} className="card p-4 group relative overflow-hidden">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                                                {renderAppIcon(item.appId)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className="text-sm font-bold text-slate-200">{item.appTitle}</h3>
                                                    <span className="text-[10px] text-dim">{new Date(item.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-dim truncate">{JSON.stringify(item.inputs)}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteHistoryEntry(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : !currentAppId ? (
                    <div className="space-y-8 animate-in">
                        {/* Context Card - Shows current page info */}
                        {context && !context.isRestricted && (
                            <section className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-[10px] uppercase-tracking font-black text-emerald-400">Current Page</h2>
                                    <button
                                        onClick={refreshContext}
                                        className="text-[10px] uppercase-tracking text-dim hover:text-white flex items-center gap-1"
                                        disabled={contextLoading}
                                    >
                                        <RefreshCw size={10} className={contextLoading ? 'animate-spin' : ''} /> Refresh
                                    </button>
                                </div>
                                <div className="card p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-emerald-500/20">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                                            {renderSiteTypeIcon(siteType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{context.title || 'Untitled Page'}</h3>
                                            <p className="text-[10px] text-dim truncate">{context.domain}</p>
                                        </div>
                                        <span className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold uppercase">
                                            {getSiteTypeLabel(siteType)}
                                        </span>
                                    </div>

                                    {/* Page Stats */}
                                    {context.stats && (
                                        <div className="flex gap-4 text-[10px] text-dim border-t border-white/5 pt-3 mt-3">
                                            {context.stats.readingTimeMinutes && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} /> {context.stats.readingTimeMinutes} min read
                                                </span>
                                            )}
                                            {context.stats.wordCount && (
                                                <span>{context.stats.wordCount.toLocaleString()} words</span>
                                            )}
                                            {context.meta?.author && (
                                                <span className="truncate">by {context.meta.author}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Favorites Section */}
                        {favoriteApps.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="text-[10px] uppercase-tracking font-black text-amber-400 px-1 flex items-center gap-2">
                                    <Star size={10} className="fill-amber-400" /> Your Favorites
                                </h2>
                                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                                    {favoriteApps.map((app, idx) => (
                                        <div
                                            key={app.id}
                                            className="flex-shrink-0 w-32 card p-3 flex flex-col gap-2 hover:border-amber-500/30 transition-all cursor-pointer group relative"
                                            onClick={() => handleSelectApp(app.id)}
                                        >
                                            <button
                                                onClick={(e) => handleToggleFavorite(app.id, e)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    padding: '4px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'hsl(45 93% 47%)',
                                                    opacity: 0,
                                                    cursor: 'pointer',
                                                    transition: 'opacity 0.2s ease',
                                                    borderRadius: '4px'
                                                }}
                                                className="group-hover:!opacity-100"
                                            >
                                                <Star size={12} style={{ fill: 'hsl(45 93% 47%)' }} />
                                            </button>
                                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                                                {renderAppIcon(app.id, 18)}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-200 truncate">{app.title}</span>
                                            <span className="text-[9px] text-dim truncate">Press {idx + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Smart Suggestions - AI recommended apps */}
                        {suggestedApps.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="text-[10px] uppercase-tracking font-black text-blue-400 px-1">Suggested for This Page</h2>
                                <div className="space-y-2">
                                    {suggestedApps.map((suggestion, idx) => {
                                        const appMeta = appRegistry.find(a => a.id === suggestion.id);
                                        if (!appMeta) return null;
                                        return (
                                            <div
                                                key={suggestion.id}
                                                onClick={() => handleSelectApp(suggestion.id)}
                                                className={`card p-3 flex items-center gap-3 cursor-pointer border-blue-500/20 hover:border-blue-500/40 transition-all ${idx === 0 ? 'bg-blue-600/5' : ''} group`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-blue-400'}`}>
                                                    {renderAppIcon(suggestion.id, 18)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold">{appMeta.title}</h3>
                                                    <p className="text-[10px] text-dim">{suggestion.reason}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => handleToggleFavorite(suggestion.id, e)}
                                                    style={{
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: isFavorite(suggestion.id) ? 'hsl(45 93% 47%)' : 'hsl(215 20% 40%)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        opacity: isFavorite(suggestion.id) ? 1 : 0
                                                    }}
                                                    className="group-hover:!opacity-100"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = 'hsl(45 93% 47%)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isFavorite(suggestion.id)) {
                                                            e.currentTarget.style.color = 'hsl(215 20% 40%)';
                                                        }
                                                    }}
                                                >
                                                    <Star size={14} style={{ fill: isFavorite(suggestion.id) ? 'hsl(45 93% 47%)' : 'none' }} />
                                                </button>
                                                {idx === 0 && (
                                                    <span className="text-[8px] px-2 py-0.5 bg-blue-600 text-white rounded-full font-bold uppercase">
                                                        Best Match
                                                    </span>
                                                )}
                                                <ChevronRight size={14} className="text-slate-600" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Popular Apps - based on usage */}
                        {popularApps.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="text-[10px] uppercase-tracking font-black text-purple-400 px-1 flex items-center gap-2">
                                    <TrendingUp size={10} /> Most Used
                                </h2>
                                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                                    {popularApps.map(app => (
                                        <div
                                            key={app.id}
                                            className="flex-shrink-0 w-32 card p-3 flex flex-col gap-2 hover:border-purple-500/30 transition-all cursor-pointer group"
                                            onClick={() => handleSelectApp(app.id)}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                                                {renderAppIcon(app.id, 18)}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-200 truncate">{app.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Recent History */}
                        {history.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-[10px] uppercase-tracking font-black text-slate-500">Recent Activity</h2>
                                    <button onClick={() => setShowHistory(true)} className="text-[10px] uppercase-tracking text-dim hover:text-white flex items-center gap-1">
                                        View All <ChevronRight size={12} />
                                    </button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                                    {history.slice(0, 5).map(item => (
                                        <div
                                            key={item.id}
                                            className="flex-shrink-0 w-40 card p-3 flex flex-col gap-2 hover:border-blue-500/30 transition-all cursor-pointer"
                                            onClick={() => {
                                                handleSelectApp(item.appId);
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
                                                {renderAppIcon(item.appId, 16)}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-200 truncate">{item.appTitle}</span>
                                            <span className="text-[9px] text-dim truncate">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Featured Tools - only show if no suggestions */}
                        {suggestedApps.length === 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs uppercase-tracking text-dim px-1">Featured Tools</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <AppCard
                                        title="Page Digest"
                                        description="Quick Summary"
                                        icon={<Globe size={22} />}
                                        color="blue"
                                        isFavorite={isFavorite('digest')}
                                        onFavorite={(e) => handleToggleFavorite('digest', e)}
                                        onClick={() => handleSelectApp('digest')}
                                    />
                                    <AppCard
                                        title="Chat with Page"
                                        description="Interactive AI"
                                        icon={<MessageSquare size={22} />}
                                        color="purple"
                                        isFavorite={isFavorite('chat')}
                                        onFavorite={(e) => handleToggleFavorite('chat', e)}
                                        onClick={() => handleSelectApp('chat')}
                                    />
                                    <AppCard
                                        title="YouTube Digest"
                                        description="Video Analysis"
                                        icon={<Youtube size={22} />}
                                        color="red"
                                        isFavorite={isFavorite('youtube')}
                                        onFavorite={(e) => handleToggleFavorite('youtube', e)}
                                        onClick={() => handleSelectApp('youtube')}
                                    />
                                    <AppCard
                                        title="Email Composer"
                                        description="Smart Writing"
                                        icon={<Mail size={22} />}
                                        color="orange"
                                        isFavorite={isFavorite('email')}
                                        onFavorite={(e) => handleToggleFavorite('email', e)}
                                        onClick={() => handleSelectApp('email')}
                                    />
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs uppercase-tracking text-dim">Full Library ({appRegistry.length})</h2>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={`Search ${appRegistry.length} micro apps... (⌘K)`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11"
                                />
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {filteredApps.map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => handleSelectApp(app.id)}
                                        className="card p-3 flex items-center gap-4 cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                                            {renderAppIcon(app.id)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold">{app.title}</h3>
                                            <p className="text-xs text-dim line-clamp-1">{app.description}</p>
                                        </div>
                                        <button
                                            onClick={(e) => handleToggleFavorite(app.id, e)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: 'transparent',
                                                border: 'none',
                                                color: isFavorite(app.id) ? 'hsl(45 93% 47%)' : 'hsl(215 20% 40%)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                opacity: isFavorite(app.id) ? 1 : 0
                                            }}
                                            className="group-hover:!opacity-100"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'hsl(45 93% 47%)';
                                                e.currentTarget.style.background = 'hsl(222 47% 15%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                if (!isFavorite(app.id)) {
                                                    e.currentTarget.style.color = 'hsl(215 20% 40%)';
                                                }
                                            }}
                                        >
                                            <Star size={16} style={{ fill: isFavorite(app.id) ? 'hsl(45 93% 47%)' : 'none' }} />
                                        </button>
                                    </div>
                                ))}
                                {filteredApps.length === 0 && (
                                    <div className="text-center py-12 text-dim text-sm card border-dashed">
                                        No apps found matching "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="flex flex-col animate-in">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                className="btn-secondary flex items-center gap-2 text-xs"
                                onClick={() => setCurrentAppId(null)}
                            >
                                <Home size={14} />
                                <span>Back to Library</span>
                            </button>
                            <button
                                onClick={(e) => handleToggleFavorite(currentAppId, e)}
                                title={isFavorite(currentAppId) ? 'Remove from favorites' : 'Add to favorites'}
                                style={{
                                    padding: '10px',
                                    borderRadius: '12px',
                                    background: isFavorite(currentAppId) ? 'hsl(45 93% 47% / 0.1)' : 'transparent',
                                    border: 'none',
                                    color: isFavorite(currentAppId) ? 'hsl(45 93% 47%)' : 'hsl(215 20% 45%)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isFavorite(currentAppId)) {
                                        e.currentTarget.style.background = 'hsl(222 47% 15%)';
                                        e.currentTarget.style.color = 'hsl(45 93% 47%)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isFavorite(currentAppId)) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'hsl(215 20% 45%)';
                                    }
                                }}
                            >
                                <Star size={18} style={{ fill: isFavorite(currentAppId) ? 'hsl(45 93% 47%)' : 'none' }} />
                            </button>
                        </div>
                        <div className="card p-6 relative bg-slate-900/40">
                            <div className="mb-8 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center shadow-inner">
                                        {renderAppIcon(currentAppId, 24)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl leading-tight font-black">{currentAppMetadata?.title || currentAppId}</h2>
                                        <p className="text-xs text-dim mt-1 font-medium">{currentAppMetadata?.description}</p>
                                    </div>
                                </div>
                            </div>

                            <ErrorBoundary>
                                <Suspense fallback={
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                                        <p className="text-xs uppercase-tracking text-dim">initializing ai...</p>
                                    </div>
                                }>
                                    {context?.isRestricted && (
                                        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs rounded-2xl flex items-start gap-3">
                                            <div className="mt-0.5">
                                                <AlertCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold mb-1">Restricted Page</p>
                                                <p className="opacity-70 leading-relaxed">Chrome prevents extensions from reading content on sensitive pages like <b>chrome://</b> or the <b>Web Store</b>. Please try on a regular website.</p>
                                            </div>
                                        </div>
                                    )}
                                    {currentAppMetadata?.isGeneric && currentAppId ? (
                                        <GenericApp config={getGenericConfig(currentAppId)!} />
                                    ) : (
                                        CurrentAppComponent ? <CurrentAppComponent /> : (
                                            <div className="text-center py-12 bg-blue-600/5 rounded-3xl border border-blue-600/10">
                                                <Zap size={48} className="text-blue-500 mx-auto mb-4 opacity-20" />
                                                <p className="text-dim max-w-xs mx-auto text-xs font-medium px-4">This research module is currently being optimized for Gemini 2.0.</p>
                                            </div>
                                        )
                                    )}
                                </Suspense>
                            </ErrorBoundary>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer / Context Bar */}
            <footer className="flex-shrink-0 px-4 py-3 glass">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${contextLoading ? 'bg-yellow-500' : 'bg-green-500'} shadow-[0_0_8px_rgba(34,197,94,0.5)]`}></div>
                            {!contextLoading && <div className="absolute w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>}
                        </div>
                        <span className="text-[10px] uppercase-tracking text-dim">
                            {contextLoading ? 'Reading page...' : context?.domain ? `${context.domain}` : 'Context Ready'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">v1.4.0 • Press ? for shortcuts</span>
                </div>
            </footer>
        </div>
    );
};

interface AppCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'red' | 'orange';
    onClick: () => void;
    isFavorite?: boolean;
    onFavorite?: (e: React.MouseEvent) => void;
}

const AppCard: React.FC<AppCardProps> = ({ title, description, icon, color, onClick, isFavorite = false, onFavorite }) => {
    const colorClasses = {
        blue: 'bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white',
        purple: 'bg-purple-600/10 text-purple-500 group-hover:bg-purple-600 group-hover:text-white',
        red: 'bg-red-600/10 text-red-500 group-hover:bg-red-600 group-hover:text-white',
        orange: 'bg-orange-600/10 text-orange-500 group-hover:bg-orange-600 group-hover:text-white',
    };

    return (
        <div
            className="card p-5 cursor-pointer group flex flex-col items-center text-center relative"
            onClick={onClick}
        >
            {onFavorite && (
                <button
                    onClick={onFavorite}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '6px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: isFavorite ? 'hsl(45 93% 47%)' : 'hsl(215 20% 40%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isFavorite ? 1 : 0
                    }}
                    className="group-hover:!opacity-100"
                >
                    <Star size={14} style={{ fill: isFavorite ? 'hsl(45 93% 47%)' : 'none' }} />
                </button>
            )}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${colorClasses[color]} shadow-inner`}>
                {icon}
            </div>
            <h3 className="font-black text-sm mb-1 tracking-tight">{title}</h3>
            <p className="text-[10px] text-dim uppercase-tracking font-bold">{description}</p>
        </div>
    );
};

export default App;
