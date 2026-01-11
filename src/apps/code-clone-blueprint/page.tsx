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
    Server
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
                `Analyze this product and create a comprehensive technical blueprint for building a clone:

${inputText}

Product URL: ${context?.url || 'unknown'}
Product Title: ${context?.title || 'unknown'}
Target Stack: ${stackPreference}

Generate a complete implementation blueprint with:

1. Product Overview - Name and description
2. Architecture - Type (monolith, microservices, serverless), description, ASCII diagram
3. Tech Stack - For each layer (frontend, backend, database, infrastructure, third-party):
   - Component name, type, purpose
   - Alternative options
   - Implementation notes
4. Core Features - Each feature with:
   - Name, description
   - Implementation approach
   - Required APIs
5. Data Models - Each model with:
   - Name, fields (name, type, required)
   - Relationships to other models
6. API Endpoints - Each endpoint with:
   - Method, path, description
   - Request/response examples
7. Development Phases - Each phase with:
   - Phase number, name, duration
   - Tasks and deliverables
8. Cost Estimates - Development cost, monthly running cost, breakdown

Return as JSON matching the Blueprint interface structure.`,
                `You are a senior software architect specializing in product engineering.
Create detailed, implementable blueprints that developers can follow to build the product.
Be specific about:
- Technology choices and why
- Data model relationships
- API design patterns
- Implementation complexities
- Realistic cost estimates`,
                { jsonMode: true }
            );

            if (result) {
                setBlueprint(result);
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
            md += `**APIs:** ${f.apis.join(', ')}\n\n`;
        });

        md += `## Data Models\n\n`;
        blueprint.dataModels.forEach(m => {
            md += `### ${m.name}\n`;
            md += `| Field | Type | Required |\n|-------|------|----------|\n`;
            m.fields.forEach(f => {
                md += `| ${f.name} | ${f.type} | ${f.required ? 'Yes' : 'No'} |\n`;
            });
            md += `\n**Relationships:** ${m.relationships.join(', ')}\n\n`;
        });

        md += `## API Endpoints\n\n`;
        blueprint.apiEndpoints.forEach(e => {
            md += `### \`${e.method} ${e.path}\`\n`;
            md += `${e.description}\n\n`;
        });

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
                                        {model.fields.slice(0, 5).map((field, fidx) => (
                                            <div key={fidx} className="flex items-center gap-2 text-xs">
                                                <span className="text-blue-400 font-mono">{field.name}</span>
                                                <span className="text-slate-600">:</span>
                                                <span className="text-slate-400">{field.type}</span>
                                                {field.required && <span className="text-red-400">*</span>}
                                            </div>
                                        ))}
                                        {model.fields.length > 5 && (
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
