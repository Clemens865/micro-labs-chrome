import React, { useState } from 'react';
import { usePageContext } from '../../hooks/usePageContext';
import {
    Cpu,
    Loader2,
    Server,
    Palette,
    BarChart3,
    Shield,
    Globe,
    Code2,
    Package,
    Zap,
    Check,
    X,
    ExternalLink
} from 'lucide-react';

interface TechItem {
    name: string;
    category: string;
    confidence: 'high' | 'medium' | 'low';
    icon?: string;
    website?: string;
}

interface TechStack {
    frameworks: TechItem[];
    libraries: TechItem[];
    cms: TechItem[];
    analytics: TechItem[];
    cdn: TechItem[];
    hosting: TechItem[];
    security: TechItem[];
    other: TechItem[];
}

const TechStackDetector: React.FC = () => {
    const { context } = usePageContext();
    const [techStack, setTechStack] = useState<TechStack | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const detectTechStack = async () => {
        setLoading(true);
        setStatus('Analyzing page technologies...');

        try {
            const result = await new Promise<TechStack>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (!tab?.id) {
                        resolve(emptyStack());
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const stack: any = {
                                frameworks: [],
                                libraries: [],
                                cms: [],
                                analytics: [],
                                cdn: [],
                                hosting: [],
                                security: [],
                                other: []
                            };

                            const html = document.documentElement.outerHTML;
                            const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src') || '');
                            const links = [...document.querySelectorAll('link[href]')].map(l => l.getAttribute('href') || '');
                            const metas = [...document.querySelectorAll('meta')];

                            // Frameworks
                            if ((window as any).React || html.includes('react') || html.includes('_next')) {
                                stack.frameworks.push({ name: 'React', category: 'Frontend Framework', confidence: 'high' });
                            }
                            if ((window as any).Vue || html.includes('vue')) {
                                stack.frameworks.push({ name: 'Vue.js', category: 'Frontend Framework', confidence: 'high' });
                            }
                            if ((window as any).angular || html.includes('ng-') || html.includes('angular')) {
                                stack.frameworks.push({ name: 'Angular', category: 'Frontend Framework', confidence: 'high' });
                            }
                            if (html.includes('_next') || html.includes('__next')) {
                                stack.frameworks.push({ name: 'Next.js', category: 'React Framework', confidence: 'high' });
                            }
                            if (html.includes('nuxt') || html.includes('__nuxt')) {
                                stack.frameworks.push({ name: 'Nuxt.js', category: 'Vue Framework', confidence: 'high' });
                            }
                            if (html.includes('gatsby')) {
                                stack.frameworks.push({ name: 'Gatsby', category: 'React Framework', confidence: 'high' });
                            }
                            if (html.includes('svelte') || (window as any).__svelte) {
                                stack.frameworks.push({ name: 'Svelte', category: 'Frontend Framework', confidence: 'high' });
                            }

                            // Libraries
                            if ((window as any).jQuery || scripts.some(s => s.includes('jquery'))) {
                                stack.libraries.push({ name: 'jQuery', category: 'JavaScript Library', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('lodash'))) {
                                stack.libraries.push({ name: 'Lodash', category: 'Utility Library', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('axios'))) {
                                stack.libraries.push({ name: 'Axios', category: 'HTTP Client', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('moment')) || html.includes('moment')) {
                                stack.libraries.push({ name: 'Moment.js', category: 'Date Library', confidence: 'medium' });
                            }
                            if (html.includes('gsap') || scripts.some(s => s.includes('gsap'))) {
                                stack.libraries.push({ name: 'GSAP', category: 'Animation Library', confidence: 'high' });
                            }
                            if (html.includes('framer-motion')) {
                                stack.libraries.push({ name: 'Framer Motion', category: 'Animation Library', confidence: 'high' });
                            }

                            // CSS Frameworks
                            if (html.includes('tailwind') || links.some(l => l.includes('tailwind'))) {
                                stack.libraries.push({ name: 'Tailwind CSS', category: 'CSS Framework', confidence: 'high' });
                            }
                            if (html.includes('bootstrap') || links.some(l => l.includes('bootstrap'))) {
                                stack.libraries.push({ name: 'Bootstrap', category: 'CSS Framework', confidence: 'high' });
                            }
                            if (html.includes('bulma') || links.some(l => l.includes('bulma'))) {
                                stack.libraries.push({ name: 'Bulma', category: 'CSS Framework', confidence: 'high' });
                            }
                            if (html.includes('material') || links.some(l => l.includes('material'))) {
                                stack.libraries.push({ name: 'Material UI', category: 'UI Framework', confidence: 'medium' });
                            }

                            // CMS
                            if (html.includes('wp-content') || html.includes('wordpress')) {
                                stack.cms.push({ name: 'WordPress', category: 'CMS', confidence: 'high' });
                            }
                            if (html.includes('shopify') || html.includes('cdn.shopify')) {
                                stack.cms.push({ name: 'Shopify', category: 'E-commerce', confidence: 'high' });
                            }
                            if (html.includes('wix.com') || html.includes('wixstatic')) {
                                stack.cms.push({ name: 'Wix', category: 'Website Builder', confidence: 'high' });
                            }
                            if (html.includes('squarespace')) {
                                stack.cms.push({ name: 'Squarespace', category: 'Website Builder', confidence: 'high' });
                            }
                            if (html.includes('webflow')) {
                                stack.cms.push({ name: 'Webflow', category: 'Website Builder', confidence: 'high' });
                            }
                            if (html.includes('ghost')) {
                                stack.cms.push({ name: 'Ghost', category: 'CMS', confidence: 'medium' });
                            }
                            if (html.includes('drupal')) {
                                stack.cms.push({ name: 'Drupal', category: 'CMS', confidence: 'high' });
                            }
                            if (html.includes('joomla')) {
                                stack.cms.push({ name: 'Joomla', category: 'CMS', confidence: 'high' });
                            }
                            if (metas.some(m => m.getAttribute('name') === 'generator' && m.getAttribute('content')?.includes('Hugo'))) {
                                stack.cms.push({ name: 'Hugo', category: 'Static Site Generator', confidence: 'high' });
                            }

                            // Analytics
                            if (html.includes('google-analytics') || html.includes('gtag') || html.includes('ga.js') || html.includes('analytics.js')) {
                                stack.analytics.push({ name: 'Google Analytics', category: 'Analytics', confidence: 'high' });
                            }
                            if (html.includes('gtm.js') || html.includes('googletagmanager')) {
                                stack.analytics.push({ name: 'Google Tag Manager', category: 'Tag Management', confidence: 'high' });
                            }
                            if (html.includes('hotjar')) {
                                stack.analytics.push({ name: 'Hotjar', category: 'Behavior Analytics', confidence: 'high' });
                            }
                            if (html.includes('mixpanel')) {
                                stack.analytics.push({ name: 'Mixpanel', category: 'Product Analytics', confidence: 'high' });
                            }
                            if (html.includes('segment')) {
                                stack.analytics.push({ name: 'Segment', category: 'Customer Data Platform', confidence: 'medium' });
                            }
                            if (html.includes('amplitude')) {
                                stack.analytics.push({ name: 'Amplitude', category: 'Product Analytics', confidence: 'high' });
                            }
                            if (html.includes('plausible')) {
                                stack.analytics.push({ name: 'Plausible', category: 'Privacy-focused Analytics', confidence: 'high' });
                            }
                            if (html.includes('fathom')) {
                                stack.analytics.push({ name: 'Fathom', category: 'Privacy-focused Analytics', confidence: 'high' });
                            }
                            if (html.includes('facebook') && html.includes('pixel')) {
                                stack.analytics.push({ name: 'Facebook Pixel', category: 'Ad Tracking', confidence: 'high' });
                            }

                            // CDN
                            if (scripts.some(s => s.includes('cloudflare')) || links.some(l => l.includes('cloudflare'))) {
                                stack.cdn.push({ name: 'Cloudflare', category: 'CDN/Security', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('jsdelivr'))) {
                                stack.cdn.push({ name: 'jsDelivr', category: 'CDN', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('unpkg'))) {
                                stack.cdn.push({ name: 'unpkg', category: 'CDN', confidence: 'high' });
                            }
                            if (scripts.some(s => s.includes('cdnjs'))) {
                                stack.cdn.push({ name: 'cdnjs', category: 'CDN', confidence: 'high' });
                            }
                            if (html.includes('akamai')) {
                                stack.cdn.push({ name: 'Akamai', category: 'CDN', confidence: 'high' });
                            }
                            if (html.includes('fastly')) {
                                stack.cdn.push({ name: 'Fastly', category: 'CDN', confidence: 'high' });
                            }

                            // Hosting
                            if (html.includes('vercel') || html.includes('.vercel.')) {
                                stack.hosting.push({ name: 'Vercel', category: 'Hosting Platform', confidence: 'high' });
                            }
                            if (html.includes('netlify')) {
                                stack.hosting.push({ name: 'Netlify', category: 'Hosting Platform', confidence: 'high' });
                            }
                            if (html.includes('herokuapp') || html.includes('heroku')) {
                                stack.hosting.push({ name: 'Heroku', category: 'Cloud Platform', confidence: 'high' });
                            }
                            if (html.includes('github.io')) {
                                stack.hosting.push({ name: 'GitHub Pages', category: 'Static Hosting', confidence: 'high' });
                            }
                            if (html.includes('aws') || html.includes('amazonaws')) {
                                stack.hosting.push({ name: 'AWS', category: 'Cloud Platform', confidence: 'medium' });
                            }

                            // Security
                            if (html.includes('recaptcha') || html.includes('grecaptcha')) {
                                stack.security.push({ name: 'reCAPTCHA', category: 'Bot Protection', confidence: 'high' });
                            }
                            if (html.includes('hcaptcha')) {
                                stack.security.push({ name: 'hCaptcha', category: 'Bot Protection', confidence: 'high' });
                            }
                            if (html.includes('sentry')) {
                                stack.security.push({ name: 'Sentry', category: 'Error Tracking', confidence: 'high' });
                            }

                            // Other
                            if (html.includes('stripe') || scripts.some(s => s.includes('stripe'))) {
                                stack.other.push({ name: 'Stripe', category: 'Payments', confidence: 'high' });
                            }
                            if (html.includes('paypal')) {
                                stack.other.push({ name: 'PayPal', category: 'Payments', confidence: 'high' });
                            }
                            if (html.includes('intercom')) {
                                stack.other.push({ name: 'Intercom', category: 'Customer Messaging', confidence: 'high' });
                            }
                            if (html.includes('crisp')) {
                                stack.other.push({ name: 'Crisp', category: 'Customer Messaging', confidence: 'high' });
                            }
                            if (html.includes('zendesk')) {
                                stack.other.push({ name: 'Zendesk', category: 'Customer Support', confidence: 'high' });
                            }
                            if (html.includes('hubspot')) {
                                stack.other.push({ name: 'HubSpot', category: 'Marketing/CRM', confidence: 'high' });
                            }
                            if (html.includes('mailchimp')) {
                                stack.other.push({ name: 'Mailchimp', category: 'Email Marketing', confidence: 'high' });
                            }
                            if (html.includes('typeform')) {
                                stack.other.push({ name: 'Typeform', category: 'Forms', confidence: 'high' });
                            }

                            return stack;
                        }
                    }, (results) => {
                        if (results?.[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            resolve(emptyStack());
                        }
                    });
                });
            });

            setTechStack(result);
            setStatus('');
        } catch (err) {
            console.error('Detection error:', err);
            setStatus('Detection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const emptyStack = (): TechStack => ({
        frameworks: [],
        libraries: [],
        cms: [],
        analytics: [],
        cdn: [],
        hosting: [],
        security: [],
        other: []
    });

    const totalTech = techStack
        ? Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0)
        : 0;

    const CategorySection = ({ title, items, icon: Icon, color }: { title: string; items: TechItem[]; icon: any; color: string }) => {
        if (items.length === 0) return null;

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Icon size={14} className={color} />
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{title}</span>
                    <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">{items.length}</span>
                </div>
                <div className="grid gap-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${color.replace('text-', 'bg-').replace('400', '500/20')} flex items-center justify-center`}>
                                    <Package size={16} className={color} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    item.confidence === 'high' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    item.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                    'bg-slate-500/20 text-slate-400 border border-slate-600/30'
                                }`}>
                                    {item.confidence}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
                    <Cpu size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Tech Stack Detector</h2>
                <p className="text-xs text-slate-400 mt-1">Identify frameworks, libraries & services</p>
            </div>

            {/* Current Page */}
            {context?.url && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 truncate">{context.url}</p>
                    <p className="text-sm text-slate-200 font-medium truncate mt-1">{context.title}</p>
                </div>
            )}

            {/* Detect Button */}
            {!techStack && (
                <button
                    onClick={detectTechStack}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-orange-600 !to-red-600"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Detecting...
                        </>
                    ) : (
                        <>
                            <Zap size={18} />
                            Detect Tech Stack
                        </>
                    )}
                </button>
            )}

            {/* Status */}
            {status && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl flex items-center gap-2">
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {status}
                </div>
            )}

            {/* Results */}
            {techStack && (
                <div className="space-y-6 animate-in">
                    {/* Summary */}
                    <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400">Technologies Detected</p>
                                <p className="text-3xl font-bold text-slate-200">{totalTech}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-right">
                                <div>
                                    <p className="text-xs text-slate-500">Frameworks</p>
                                    <p className="text-sm font-bold text-orange-400">{techStack.frameworks.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Libraries</p>
                                    <p className="text-sm font-bold text-blue-400">{techStack.libraries.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Analytics</p>
                                    <p className="text-sm font-bold text-purple-400">{techStack.analytics.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Services</p>
                                    <p className="text-sm font-bold text-green-400">{techStack.other.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {totalTech === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Code2 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No technologies detected</p>
                            <p className="text-xs mt-1">This page may use server-rendered content</p>
                        </div>
                    ) : (
                        <>
                            <CategorySection title="Frameworks" items={techStack.frameworks} icon={Code2} color="text-orange-400" />
                            <CategorySection title="Libraries" items={techStack.libraries} icon={Package} color="text-blue-400" />
                            <CategorySection title="CMS / Builder" items={techStack.cms} icon={Globe} color="text-green-400" />
                            <CategorySection title="Analytics" items={techStack.analytics} icon={BarChart3} color="text-purple-400" />
                            <CategorySection title="CDN" items={techStack.cdn} icon={Server} color="text-cyan-400" />
                            <CategorySection title="Hosting" items={techStack.hosting} icon={Server} color="text-indigo-400" />
                            <CategorySection title="Security" items={techStack.security} icon={Shield} color="text-red-400" />
                            <CategorySection title="Other Services" items={techStack.other} icon={Zap} color="text-yellow-400" />
                        </>
                    )}

                    {/* Re-detect */}
                    <button
                        onClick={() => setTechStack(null)}
                        className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Detect Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default TechStackDetector;
