import React, { useState, useEffect } from 'react';
import {
    Globe,
    Upload,
    Loader2,
    Copy,
    Check,
    Download,
    AlertCircle,
    Sparkles,
    Code,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    FileJson,
    Link,
    Zap,
    Lock,
    Unlock,
    ArrowRight,
    Filter,
    Search
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface ApiParameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    example?: string;
}

interface ApiEndpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    path: string;
    description?: string;
    parameters?: ApiParameter[];
    requestBody?: {
        type: string;
        fields: ApiParameter[];
    };
    responseExample?: any;
    authentication?: string;
    tags?: string[];
}

interface ApiDocumentation {
    baseUrl: string;
    title: string;
    version?: string;
    description?: string;
    endpoints: ApiEndpoint[];
    authentication?: {
        type: string;
        description: string;
    };
}

const ApiEndpointMapperApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, warning, info } = useToast();
    const { integrations } = useIntegrations();

    const [inputText, setInputText] = useState('');
    const [apiDoc, setApiDoc] = useState<ApiDocumentation | null>(null);
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
    const [filterMethod, setFilterMethod] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [outputFormat, setOutputFormat] = useState<'openapi' | 'postman' | 'curl'>('openapi');

    const extractFromPage = () => {
        if (context?.content) {
            setInputText(context.content.substring(0, 15000));
            info('Page content loaded');
        } else {
            warning('No page content available');
        }
    };

    const analyzeApi = async () => {
        if (!inputText.trim()) {
            warning('Please enter API documentation or code');
            return;
        }

        setProcessing(true);

        try {
            const result = await generateContent(
                `Analyze this content and extract API endpoint information:

${inputText}

Extract all API endpoints with:
1. HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
2. Path/URL pattern
3. Description of what the endpoint does
4. Query parameters and path parameters
5. Request body structure (for POST/PUT/PATCH)
6. Response example if available
7. Authentication requirements
8. Tags/categories

Also identify:
- Base URL
- API title/name
- Version
- Overall authentication method

Return as JSON:
{
  "baseUrl": "https://api.example.com/v1",
  "title": "Example API",
  "version": "1.0.0",
  "description": "API description...",
  "authentication": {
    "type": "Bearer Token",
    "description": "Add Authorization header with Bearer {token}"
  },
  "endpoints": [
    {
      "id": "unique-id",
      "method": "GET",
      "path": "/users/{id}",
      "description": "Get user by ID",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "description": "User ID",
          "example": "user_123"
        }
      ],
      "requestBody": null,
      "responseExample": {"id": "user_123", "name": "John"},
      "authentication": "required",
      "tags": ["users"]
    }
  ]
}`,
                `You are an API documentation specialist. Extract accurate endpoint information from any source:
- API documentation pages
- Code files (routes, controllers)
- README files
- Swagger/OpenAPI specs
- Postman collections

Focus on accuracy and completeness. Infer parameter types from names and examples.`,
                { jsonMode: true }
            );

            if (result) {
                // Ensure unique IDs
                const processedResult = {
                    ...result,
                    endpoints: (result.endpoints || []).map((ep: ApiEndpoint, idx: number) => ({
                        ...ep,
                        id: ep.id || `endpoint-${idx}`
                    }))
                };
                setApiDoc(processedResult);
                success(`Found ${processedResult.endpoints.length} endpoints`);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            warning('Failed to analyze API');
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

    const exportAsOpenApi = () => {
        if (!apiDoc) return;

        const openapi = {
            openapi: '3.0.0',
            info: {
                title: apiDoc.title,
                version: apiDoc.version || '1.0.0',
                description: apiDoc.description
            },
            servers: [{ url: apiDoc.baseUrl }],
            paths: {} as Record<string, any>,
            components: {
                securitySchemes: apiDoc.authentication ? {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer'
                    }
                } : undefined
            }
        };

        apiDoc.endpoints.forEach(ep => {
            if (!openapi.paths[ep.path]) {
                openapi.paths[ep.path] = {};
            }

            const operation: any = {
                summary: ep.description,
                tags: ep.tags,
                parameters: ep.parameters?.filter(p => !ep.requestBody?.fields.includes(p)).map(p => ({
                    name: p.name,
                    in: ep.path.includes(`{${p.name}}`) ? 'path' : 'query',
                    required: p.required,
                    description: p.description,
                    schema: { type: p.type.toLowerCase() },
                    example: p.example
                })),
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: ep.responseExample ? {
                            'application/json': {
                                example: ep.responseExample
                            }
                        } : undefined
                    }
                }
            };

            if (ep.requestBody) {
                operation.requestBody = {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: Object.fromEntries(
                                    ep.requestBody.fields.map(f => [f.name, {
                                        type: f.type.toLowerCase(),
                                        description: f.description,
                                        example: f.example
                                    }])
                                )
                            }
                        }
                    }
                };
            }

            openapi.paths[ep.path][ep.method.toLowerCase()] = operation;
        });

        copyToClipboard(JSON.stringify(openapi, null, 2));
        info('OpenAPI spec copied');
    };

    const exportAsPostman = () => {
        if (!apiDoc) return;

        const postman = {
            info: {
                name: apiDoc.title,
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: apiDoc.endpoints.map(ep => ({
                name: ep.description || `${ep.method} ${ep.path}`,
                request: {
                    method: ep.method,
                    header: apiDoc.authentication ? [{
                        key: 'Authorization',
                        value: 'Bearer {{token}}'
                    }] : [],
                    url: {
                        raw: `${apiDoc.baseUrl}${ep.path}`,
                        host: [apiDoc.baseUrl.replace(/^https?:\/\//, '')],
                        path: ep.path.split('/').filter(Boolean)
                    },
                    body: ep.requestBody ? {
                        mode: 'raw',
                        raw: JSON.stringify(
                            Object.fromEntries(ep.requestBody.fields.map(f => [f.name, f.example || ''])),
                            null,
                            2
                        ),
                        options: {
                            raw: { language: 'json' }
                        }
                    } : undefined
                }
            }))
        };

        copyToClipboard(JSON.stringify(postman, null, 2));
        info('Postman collection copied');
    };

    const exportAsCurl = () => {
        if (!apiDoc) return;

        const curlCommands = apiDoc.endpoints.map(ep => {
            let curl = `curl -X ${ep.method} "${apiDoc.baseUrl}${ep.path}"`;

            if (apiDoc.authentication) {
                curl += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
            }

            if (ep.requestBody) {
                curl += ` \\\n  -H "Content-Type: application/json"`;
                curl += ` \\\n  -d '${JSON.stringify(
                    Object.fromEntries(ep.requestBody.fields.map(f => [f.name, f.example || '']))
                )}'`;
            }

            return `# ${ep.description || ep.path}\n${curl}`;
        });

        copyToClipboard(curlCommands.join('\n\n'));
        info('cURL commands copied');
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'POST': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'PUT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'PATCH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const filteredEndpoints = apiDoc?.endpoints.filter(ep => {
        const matchesMethod = filterMethod === 'all' || ep.method === filterMethod;
        const matchesSearch = !searchQuery ||
            ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ep.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesMethod && matchesSearch;
    }) || [];

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300">API Documentation</h3>
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
                    placeholder="Paste API documentation, code, or endpoints here..."
                    className="input-field w-full min-h-[120px] text-sm font-mono"
                />

                <button
                    onClick={analyzeApi}
                    disabled={processing || !inputText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Map Endpoints
                        </>
                    )}
                </button>
            </div>

            {/* API Documentation Output */}
            {apiDoc && (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-bold text-white">{apiDoc.title}</h2>
                                {apiDoc.version && (
                                    <span className="text-xs text-slate-400">v{apiDoc.version}</span>
                                )}
                            </div>
                            <span className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-300 font-mono">
                                {apiDoc.endpoints.length} endpoints
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Link size={12} />
                            <span className="font-mono">{apiDoc.baseUrl}</span>
                        </div>

                        {apiDoc.authentication && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                                <Lock size={12} />
                                {apiDoc.authentication.type}
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search endpoints..."
                                className="input-field w-full pl-9 text-xs"
                            />
                        </div>
                        <select
                            value={filterMethod}
                            onChange={(e) => setFilterMethod(e.target.value)}
                            className="input-field text-xs w-24"
                        >
                            <option value="all">All</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>

                    {/* Endpoints List */}
                    <div className="space-y-2">
                        {filteredEndpoints.map((endpoint) => (
                            <div
                                key={endpoint.id}
                                className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                            >
                                <div
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => setExpandedEndpoint(
                                        expandedEndpoint === endpoint.id ? null : endpoint.id
                                    )}
                                >
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getMethodColor(endpoint.method)}`}>
                                        {endpoint.method}
                                    </span>
                                    <span className="text-sm font-mono text-slate-300 flex-1 truncate">
                                        {endpoint.path}
                                    </span>
                                    {endpoint.authentication === 'required' && (
                                        <Lock size={12} className="text-yellow-500" />
                                    )}
                                    {expandedEndpoint === endpoint.id ?
                                        <ChevronUp size={14} /> :
                                        <ChevronDown size={14} />
                                    }
                                </div>

                                {endpoint.description && (
                                    <p className="text-xs text-slate-500 mt-1 ml-12">
                                        {endpoint.description}
                                    </p>
                                )}

                                {expandedEndpoint === endpoint.id && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-3">
                                        {/* Parameters */}
                                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] text-slate-500 uppercase mb-2">Parameters</h4>
                                                <div className="space-y-1">
                                                    {endpoint.parameters.map((param, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <span className="font-mono text-blue-400">{param.name}</span>
                                                            <span className="text-slate-600">:</span>
                                                            <span className="text-slate-400">{param.type}</span>
                                                            {param.required && (
                                                                <span className="text-red-400 text-[10px]">*required</span>
                                                            )}
                                                            {param.description && (
                                                                <span className="text-slate-500">- {param.description}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Request Body */}
                                        {endpoint.requestBody && (
                                            <div>
                                                <h4 className="text-[10px] text-slate-500 uppercase mb-2">Request Body</h4>
                                                <div className="space-y-1">
                                                    {endpoint.requestBody.fields.map((field, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                                            <span className="font-mono text-green-400">{field.name}</span>
                                                            <span className="text-slate-600">:</span>
                                                            <span className="text-slate-400">{field.type}</span>
                                                            {field.required && (
                                                                <span className="text-red-400 text-[10px]">*</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Response Example */}
                                        {endpoint.responseExample && (
                                            <div>
                                                <h4 className="text-[10px] text-slate-500 uppercase mb-2">Response Example</h4>
                                                <pre className="text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(endpoint.responseExample, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {endpoint.tags && endpoint.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {endpoint.tags.map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Export Options */}
                    <div className="space-y-2">
                        <p className="text-xs text-slate-500">Export as:</p>
                        <div className="flex gap-2">
                            <button
                                onClick={exportAsOpenApi}
                                className="btn-secondary flex items-center gap-2 flex-1 text-xs"
                            >
                                <FileJson size={14} />
                                OpenAPI
                            </button>
                            <button
                                onClick={exportAsPostman}
                                className="btn-secondary flex items-center gap-2 flex-1 text-xs"
                            >
                                <Zap size={14} />
                                Postman
                            </button>
                            <button
                                onClick={exportAsCurl}
                                className="btn-secondary flex items-center gap-2 flex-1 text-xs"
                            >
                                <Code size={14} />
                                cURL
                            </button>
                        </div>
                    </div>

                    {/* Send to Integrations */}
                    {integrations.length > 0 && (
                        <SendToIntegrations
                            appId="api-endpoint-mapper"
                            appName="API Endpoint Mapper"
                            data={{
                                type: 'api_documentation',
                                api: apiDoc
                            }}
                            source={{ url: context?.url, title: context?.title }}
                        />
                    )}
                </div>
            )}

            {/* Empty State */}
            {!apiDoc && !processing && (
                <div className="text-center py-8 text-slate-500">
                    <Globe size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No API documented yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Paste API docs, code, or Swagger specs to map endpoints
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    Paste API documentation, code files, or existing specs. AI extracts endpoints and exports to OpenAPI, Postman, or cURL.
                </p>
            </div>
        </div>
    );
};

export default ApiEndpointMapperApp;
