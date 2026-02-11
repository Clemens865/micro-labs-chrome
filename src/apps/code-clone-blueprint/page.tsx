import React, { useState } from 'react';
import {
    Code,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    FileCode,
    Layers,
    Package,
    Cpu,
    Database,
    Layout,
    GitBranch,
    Server,
    Monitor
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface TechComponent {
    name: string;
    type: 'framework' | 'library' | 'service' | 'database' | 'api';
    purpose: string;
    alternatives?: string[];
    implementation: string;
}

interface Blueprint {
    productName: string;
    description: string;
    architecture: {
        type: string;
        description: string;
        diagram: string; // ASCII diagram
    };
    techStack: {
        frontend: TechComponent[];
        backend: TechComponent[];
        database: TechComponent[];
        infrastructure: TechComponent[];
        thirdParty: TechComponent[];
    };
    coreFeatures: {
        name: string;
        description: string;
        implementation: string;
        apis: string[];
    }[];
    dataModels: {
        name: string;
        fields: { name: string; type: string; required: boolean }[];
        relationships: string[];
    }[];
    apiEndpoints: {
        method: string;
        path: string;
        description: string;
        request?: string;
        response?: string;
    }[];
    developmentPhases: {
        phase: number;
        name: string;
        duration: string;
        tasks: string[];
        deliverables: string[];
    }[];
    uiBlueprints: {
        name: string;
        route: string;
        description: string;
        layout: string;
        components: { name: string; type: string; description: string }[];
    }[];
    estimatedCost: {
        development: string;
        monthly: string;
        breakdown: { item: string; cost: string }[];
    };
}

const CodeCloneBlueprintApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('architecture');
    const [targetStack, setTargetStack] = useState<string>('modern');

    // Normalize AI response: unwrap nested objects and map snake_case keys
    const normalizeResponse = (raw: any): any => {
        if (!raw || typeof raw !== 'object') return raw;

        // If the AI wrapped everything in a single key like "blueprint", unwrap it
        const keys = Object.keys(raw);
        if (keys.length === 1 && typeof raw[keys[0]] === 'object' && !Array.isArray(raw[keys[0]])) {
            const inner = raw[keys[0]];
            // Check if inner looks more like a blueprint than outer
            if (inner.productName || inner.product_name || inner.techStack || inner.tech_stack) {
                raw = inner;
            }
        }

        // Map snake_case to camelCase for known fields
        const get = (camel: string, snake: string) => raw[camel] ?? raw[snake];

        const arch = get('architecture', 'architecture') || {};
        const ts = get('techStack', 'tech_stack') || {};
        const cost = get('estimatedCost', 'estimated_cost') || {};

        return {
            productName: get('productName', 'product_name'),
            description: raw.description,
            architecture: {
                type: arch.type,
                description: arch.description,
                diagram: arch.diagram,
            },
            techStack: {
                frontend: ts.frontend || [],
                backend: ts.backend || [],
                database: ts.database || [],
                infrastructure: ts.infrastructure || [],
                thirdParty: ts.thirdParty || ts.third_party || ts.thirdparty || [],
            },
            coreFeatures: get('coreFeatures', 'core_features') || [],
            dataModels: get('dataModels', 'data_models') || [],
            apiEndpoints: get('apiEndpoints', 'api_endpoints') || [],
            uiBlueprints: get('uiBlueprints', 'ui_blueprints') || [],
            developmentPhases: get('developmentPhases', 'development_phases') || [],
            estimatedCost: {
                development: cost.development,
                monthly: cost.monthly,
                breakdown: cost.breakdown || [],
            },
        };
    };

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 15000));
            info('Product page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const analyzeAndGenerateBlueprint = async () => {
        if (!inputText.trim()) {
            warning('Please enter product information');
            return;
        }

        setProcessing(true);

        try {
            const stackPreference = targetStack === 'modern' ?
                'React/Next.js + Node.js + PostgreSQL/Supabase' :
                targetStack === 'enterprise' ?
                    'Angular + Java Spring Boot + Oracle/PostgreSQL' :
                    'Vue + Python Django + PostgreSQL';

            const result = await generateContent(
                `Analyze this product and create a comprehensive technical blueprint for building a clone.

Product info:
${inputText}

Product URL: ${context?.url || 'unknown'}
Product Title: ${context?.title || 'unknown'}
Target Stack: ${stackPreference}

CRITICAL RULES:
- Identify what the product ACTUALLY uses by analyzing evidence from the page (e.g. a Google product uses Google Gemini, NOT OpenAI).
- Look at the URL domain, branding, page content for clues about the real tech stack.
- Do NOT default to "OpenAI" for AI features - determine the actual provider from context.
- The "Target Stack" above is ONLY for frontend/backend framework suggestions. Third-party services and AI providers must reflect what the product really uses.

Return a JSON object with EXACTLY these keys (camelCase):

{
  "productName": "string",
  "description": "string - what the product does",
  "architecture": {
    "type": "string - e.g. Monolith, Microservices, Serverless",
    "description": "string - how the architecture works",
    "diagram": "string - ASCII architecture diagram using box-drawing chars"
  },
  "techStack": {
    "frontend": [{"name":"string","type":"framework|library|service|database|api","purpose":"string","alternatives":["string"],"implementation":"string"}],
    "backend": [same shape as frontend],
    "database": [same shape],
    "infrastructure": [same shape],
    "thirdParty": [same shape]
  },
  "coreFeatures": [{"name":"string","description":"string","implementation":"string","apis":["string"]}],
  "dataModels": [{"name":"string","fields":[{"name":"string","type":"string","required":true}],"relationships":["string"]}],
  "apiEndpoints": [{"method":"GET|POST|PUT|DELETE","path":"string","description":"string"}],
  "uiBlueprints": [
    {
      "name": "string - page name (e.g. Dashboard, Editor, Settings)",
      "route": "string - URL route (e.g. /dashboard, /notebook/:id)",
      "description": "string - what this page does",
      "layout": "string - ASCII wireframe showing the page layout with regions labeled",
      "components": [{"name":"string","type":"string - e.g. Sidebar, Modal, Card, Form, List","description":"string"}]
    }
  ],
  "developmentPhases": [{"phase":1,"name":"string","duration":"string","tasks":["string"],"deliverables":["string"]}],
  "estimatedCost": {
    "development": "string - total dev cost estimate",
    "monthly": "string - monthly running cost",
    "breakdown": [{"item":"string","cost":"string"}]
  }
}

Be thorough:
- Include 3-5+ items per array.
- uiBlueprints: Include at least 4 key pages/screens. Each layout should be an ASCII wireframe showing where components go.
- architecture.diagram: Must be a real ASCII diagram, not empty.`,
                `You are a senior software architect and product analyst. You MUST analyze what technologies the product actually uses based on evidence (domain, branding, page content). For example: Google products use Gemini not OpenAI, Meta products use LLaMA, etc. Never guess generically. Return ONLY valid JSON with the exact camelCase keys. No markdown wrapping.`,
                { jsonMode: true, maxOutputTokens: 16384 }
            );

            if (result) {
                const normalized = normalizeResponse(result);
                const safe: Blueprint = {
                    productName: normalized.productName || 'Unknown Product',
                    description: normalized.description || '',
                    architecture: {
                        type: normalized.architecture?.type || 'Unknown',
                        description: normalized.architecture?.description || '',
                        diagram: normalized.architecture?.diagram || '',
                    },
                    techStack: {
                        frontend: normalized.techStack?.frontend || [],
                        backend: normalized.techStack?.backend || [],
                        database: normalized.techStack?.database || [],
                        infrastructure: normalized.techStack?.infrastructure || [],
                        thirdParty: normalized.techStack?.thirdParty || [],
                    },
                    coreFeatures: normalized.coreFeatures || [],
                    dataModels: normalized.dataModels || [],
                    apiEndpoints: normalized.apiEndpoints || [],
                    uiBlueprints: normalized.uiBlueprints || [],
                    developmentPhases: normalized.developmentPhases || [],
                    estimatedCost: {
                        development: normalized.estimatedCost?.development || 'N/A',
                        monthly: normalized.estimatedCost?.monthly || 'N/A',
                        breakdown: normalized.estimatedCost?.breakdown || [],
                    },
                };
                setBlueprint(safe);
                success('Blueprint generated');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            warning('Failed to generate blueprint');
        } finally {
            setProcessing(false);
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

    const exportAsMarkdown = () => {
        if (!blueprint) return;

        let md = `# ${blueprint.productName} - Technical Blueprint\n\n`;
        md += `${blueprint.description}\n\n`;

        md += `## Architecture\n`;
        md += `**Type:** ${blueprint.architecture.type}\n\n`;
        md += `${blueprint.architecture.description}\n\n`;
        md += "```\n" + blueprint.architecture.diagram + "\n```\n\n";

        md += `## Tech Stack\n\n`;

        const stackSections = ['frontend', 'backend', 'database', 'infrastructure', 'thirdParty'] as const;
        stackSections.forEach(section => {
            const components = blueprint.techStack[section];
            if (components.length > 0) {
                md += `### ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;
                components.forEach(c => {
                    md += `- **${c.name}** (${c.type}): ${c.purpose}\n`;
                    if (c.alternatives) md += `  - Alternatives: ${c.alternatives.join(', ')}\n`;
                });
                md += '\n';
            }
        });

        md += `## Core Features\n\n`;
        blueprint.coreFeatures.forEach((f, idx) => {
            md += `### ${idx + 1}. ${f.name}\n`;
            md += `${f.description}\n\n`;
            md += `**Implementation:** ${f.implementation}\n\n`;
            md += `**APIs:** ${(f.apis || []).join(', ')}\n\n`;
        });

        md += `## Data Models\n\n`;
        blueprint.dataModels.forEach(m => {
            md += `### ${m.name}\n`;
            md += `| Field | Type | Required |\n|-------|------|----------|\n`;
            (m.fields || []).forEach(f => {
                md += `| ${f.name} | ${f.type} | ${f.required ? 'Yes' : 'No'} |\n`;
            });
            md += `\n**Relationships:** ${(m.relationships || []).join(', ')}\n\n`;
        });

        md += `## API Endpoints\n\n`;
        blueprint.apiEndpoints.forEach(e => {
            md += `### \`${e.method} ${e.path}\`\n`;
            md += `${e.description}\n\n`;
        });

        if (blueprint.uiBlueprints.length > 0) {
            md += `## UI Blueprints\n\n`;
            blueprint.uiBlueprints.forEach(page => {
                md += `### ${page.name} (\`${page.route}\`)\n`;
                md += `${page.description}\n\n`;
                if (page.layout) {
                    md += "```\n" + page.layout + "\n```\n\n";
                }
                if ((page.components || []).length > 0) {
                    md += `**Components:**\n`;
                    page.components.forEach(c => {
                        md += `- **${c.name}** (${c.type}): ${c.description}\n`;
                    });
                    md += '\n';
                }
            });
        }

        md += `## Development Phases\n\n`;
        blueprint.developmentPhases.forEach(p => {
            md += `### Phase ${p.phase}: ${p.name} (${p.duration})\n`;
            md += `**Tasks:**\n${p.tasks.map(t => `- ${t}`).join('\n')}\n\n`;
            md += `**Deliverables:** ${p.deliverables.join(', ')}\n\n`;
        });

        md += `## Cost Estimates\n\n`;
        md += `- **Development:** ${blueprint.estimatedCost.development}\n`;
        md += `- **Monthly Running:** ${blueprint.estimatedCost.monthly}\n\n`;
        md += `| Item | Cost |\n|------|------|\n`;
        blueprint.estimatedCost.breakdown.forEach(b => {
            md += `| ${b.item} | ${b.cost} |\n`;
        });

        copyToClipboard(md);
        info('Markdown blueprint copied');
    };

    const getComponentIcon = (type: string) => {
        switch (type) {
            case 'framework': return <Layout size={12} />;
            case 'library': return <Package size={12} />;
            case 'service': return <Server size={12} />;
            case 'database': return <Database size={12} />;
            case 'api': return <Cpu size={12} />;
            default: return <Code size={12} />;
        }
    };

    const Section: React.FC<{ id: string; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, children }) => (
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden">
            <button
                onClick={() => setExpandedSection(expandedSection === id ? null : id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    {icon}
                    {title}
                </span>
                {expandedSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === id && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">Product to Clone</h3>
                    <button
                        onClick={extractFromPage}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <Upload size={12} />
                        From Page
                    </button>
                </div>

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste product page, feature list, or description..."
                    className="input-field w-full min-h-[120px] text-sm"
                />

                <div>
                    <label className="text-xs text-slate-400 block mb-1">Target Stack</label>
                    <select
                        value={targetStack}
                        onChange={(e) => setTargetStack(e.target.value)}
                        className="input-field w-full text-sm"
                    >
                        <option value="modern">Modern (React/Next.js + Node + PostgreSQL)</option>
                        <option value="enterprise">Enterprise (Angular + Java Spring Boot)</option>
                        <option value="python">Python Stack (Vue + Django + PostgreSQL)</option>
                    </select>
                </div>

                <button
                    onClick={analyzeAndGenerateBlueprint}
                    disabled={processing || !inputText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing Architecture...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Blueprint
                        </>
                    )}
                </button>
            </div>

            {/* Blueprint Output */}
            {blueprint && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                        <h2 className="text-xl font-bold text-white">{blueprint.productName}</h2>
                        <p className="text-sm text-slate-300 mt-2">{blueprint.description}</p>
                    </div>

                    {/* Architecture */}
                    <Section id="architecture" title="Architecture" icon={<Layers size={14} />}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">
                                    {blueprint.architecture.type}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300">{blueprint.architecture.description}</p>
                            <pre className="text-xs text-green-400 bg-slate-900 p-3 rounded overflow-x-auto font-mono">
                                {blueprint.architecture.diagram}
                            </pre>
                        </div>
                    </Section>

                    {/* Tech Stack */}
                    <Section id="techstack" title="Tech Stack" icon={<Package size={14} />}>
                        <div className="space-y-4">
                            {(['frontend', 'backend', 'database', 'infrastructure'] as const).map(section => (
                                blueprint.techStack[section].length > 0 && (
                                    <div key={section}>
                                        <h4 className="text-xs text-slate-500 uppercase mb-2">{section}</h4>
                                        <div className="space-y-1">
                                            {blueprint.techStack[section].map((comp, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-500">{getComponentIcon(comp.type)}</span>
                                                    <span className="text-slate-200 font-medium">{comp.name}</span>
                                                    <span className="text-slate-500">-</span>
                                                    <span className="text-slate-400">{comp.purpose}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </Section>

                    {/* Core Features */}
                    <Section id="features" title={`Core Features (${blueprint.coreFeatures.length})`} icon={<Cpu size={14} />}>
                        <div className="space-y-3">
                            {blueprint.coreFeatures.map((feature, idx) => (
                                <div key={idx} className="p-3 rounded bg-slate-900/50">
                                    <h4 className="text-sm font-medium text-slate-200">{feature.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{feature.description}</p>
                                    <p className="text-xs text-green-400 mt-2">
                                        <strong>Implementation:</strong> {feature.implementation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Data Models */}
                    <Section id="models" title={`Data Models (${blueprint.dataModels.length})`} icon={<Database size={14} />}>
                        <div className="space-y-3">
                            {blueprint.dataModels.map((model, idx) => (
                                <div key={idx} className="p-3 rounded bg-slate-900/50">
                                    <h4 className="text-sm font-medium text-slate-200 mb-2">{model.name}</h4>
                                    <div className="space-y-1">
                                        {(model.fields || []).slice(0, 5).map((field, fidx) => (
                                            <div key={fidx} className="flex items-center gap-2 text-xs">
                                                <span className="text-blue-400 font-mono">{field.name}</span>
                                                <span className="text-slate-600">:</span>
                                                <span className="text-slate-400">{field.type}</span>
                                                {field.required && <span className="text-red-400">*</span>}
                                            </div>
                                        ))}
                                        {(model.fields || []).length > 5 && (
                                            <span className="text-xs text-slate-500">+{model.fields.length - 5} more fields</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* API Endpoints */}
                    <Section id="api" title={`API Endpoints (${blueprint.apiEndpoints.length})`} icon={<Server size={14} />}>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {blueprint.apiEndpoints.map((ep, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                                        ep.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                                        ep.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                        ep.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                        ep.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>
                                        {ep.method}
                                    </span>
                                    <span className="font-mono text-slate-300">{ep.path}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* UI Blueprints */}
                    {blueprint.uiBlueprints.length > 0 && (
                        <Section id="ui" title={`UI Blueprints (${blueprint.uiBlueprints.length})`} icon={<Monitor size={14} />}>
                            <div className="space-y-4">
                                {blueprint.uiBlueprints.map((page, idx) => (
                                    <div key={idx} className="p-3 rounded bg-slate-900/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-slate-200">{page.name}</h4>
                                            <span className="text-xs font-mono text-slate-500">{page.route}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">{page.description}</p>
                                        {page.layout && (
                                            <pre className="text-xs text-cyan-400 bg-slate-950 p-3 rounded overflow-x-auto font-mono whitespace-pre">
                                                {page.layout}
                                            </pre>
                                        )}
                                        {(page.components || []).length > 0 && (
                                            <div className="space-y-1 pt-1">
                                                <span className="text-xs text-slate-500 uppercase">Components</span>
                                                {page.components.map((comp, cidx) => (
                                                    <div key={cidx} className="flex items-center gap-2 text-xs">
                                                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">{comp.type}</span>
                                                        <span className="text-slate-200">{comp.name}</span>
                                                        <span className="text-slate-500">- {comp.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Development Phases */}
                    <Section id="phases" title="Development Phases" icon={<GitBranch size={14} />}>
                        <div className="space-y-3">
                            {blueprint.developmentPhases.map((phase, idx) => (
                                <div key={idx} className="p-3 rounded bg-slate-900/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-slate-200">
                                            Phase {phase.phase}: {phase.name}
                                        </h4>
                                        <span className="text-xs text-slate-500">{phase.duration}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {phase.tasks.slice(0, 2).join(' • ')}
                                        {phase.tasks.length > 2 && ` +${phase.tasks.length - 2} more`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Cost Estimate */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                        <h3 className="text-sm font-bold text-yellow-400 mb-2">Cost Estimate</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-500">Development</span>
                                <p className="text-lg font-bold text-white">{blueprint.estimatedCost.development}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500">Monthly Running</span>
                                <p className="text-lg font-bold text-white">{blueprint.estimatedCost.monthly}</p>
                            </div>
                        </div>
                    </div>

                    {/* Export Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={exportAsMarkdown}
                            className="btn-secondary flex items-center gap-2 flex-1"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            Copy as Markdown
                        </button>
                        <button
                            onClick={() => copyToClipboard(JSON.stringify(blueprint, null, 2))}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FileCode size={14} />
                            JSON
                        </button>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="code-clone-blueprint"
                            appName="CodeClone Blueprint"
                            data={{
                                type: 'code_blueprint',
                                blueprint
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State */}
            {!blueprint && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Code size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No blueprint generated yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste product info to generate a technical blueprint
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Generates complete technical blueprints with architecture, tech stack,
                    data models, APIs, and development phases for cloning any product.
                </p>
            </div>
        </div>
    );
};

export default CodeCloneBlueprintApp;
