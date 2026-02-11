import React, { useState, useRef } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import {
    BarChart3, Upload, Camera, Loader2, Sparkles, Download,
    Table, PieChart, TrendingUp, Copy, Check, RefreshCw,
    FileSpreadsheet, Image, Code, ChevronDown, ChevronUp
} from 'lucide-react';

type DataSource = 'paste' | 'screenshot' | 'page';
type ChartType = 'auto' | 'bar' | 'line' | 'pie' | 'scatter' | 'table';

interface VisualizationResult {
    analysis: string;
    chartDescription: string;
    insights: string[];
    data?: any;
    pythonCode?: string;
    chartImage?: string;
    timestamp: number;
}

const DataVisualizer: React.FC = () => {
    const { generateContent, loading } = useGemini();
    const { context: pageContext } = usePageContext();
    const [dataSource, setDataSource] = useState<DataSource>('paste');
    const [pastedData, setPastedData] = useState('');
    const [chartType, setChartType] = useState<ChartType>('auto');
    const [customPrompt, setCustomPrompt] = useState('');
    const [result, setResult] = useState<VisualizationResult | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [screenshotData, setScreenshotData] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const chartTypes: Record<ChartType, { label: string; icon: React.ReactNode }> = {
        auto: { label: 'Auto Detect', icon: <Sparkles size={14} /> },
        bar: { label: 'Bar Chart', icon: <BarChart3 size={14} /> },
        line: { label: 'Line Chart', icon: <TrendingUp size={14} /> },
        pie: { label: 'Pie Chart', icon: <PieChart size={14} /> },
        scatter: { label: 'Scatter Plot', icon: <BarChart3 size={14} /> },
        table: { label: 'Summary Table', icon: <Table size={14} /> }
    };

    const captureScreenshot = async () => {
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
                    if (response?.dataUrl) {
                        resolve(response.dataUrl);
                    } else {
                        reject(new Error('Failed to capture screenshot'));
                    }
                });
            });
            setScreenshotData(dataUrl);
            setDataSource('screenshot');
        } catch (err) {
            console.error('Screenshot failed:', err);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (file.type.startsWith('image/')) {
                setScreenshotData(content);
                setDataSource('screenshot');
            } else {
                setPastedData(content);
                setDataSource('paste');
            }
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };

    const analyzeData = async () => {
        let dataToAnalyze = '';
        let imageData: string | undefined;

        if (dataSource === 'paste') {
            dataToAnalyze = pastedData;
        } else if (dataSource === 'screenshot' && screenshotData) {
            imageData = screenshotData.split(',')[1];
        } else if (dataSource === 'page' && pageContext) {
            dataToAnalyze = pageContext.content || '';
        }

        if (!dataToAnalyze && !imageData) return;

        const chartPrompt = chartType === 'auto'
            ? 'Choose the most appropriate visualization type for this data.'
            : `Create a ${chartType} visualization.`;

        const prompt = `Analyze this data and provide visualization insights.

${customPrompt ? `User request: ${customPrompt}\n\n` : ''}
${chartPrompt}

${imageData ? 'I\'ve provided an image/screenshot containing data (like a table, chart, or spreadsheet).' : `Data:\n${dataToAnalyze.slice(0, 15000)}`}

Provide:
1. **Data Analysis**: What does this data represent? What are the key metrics?
2. **Visualization Recommendation**: What chart type best represents this data and why?
3. **Key Insights**: 3-5 bullet points of important findings
4. **Python Code**: Provide matplotlib/seaborn code to create the visualization (use sample data if needed)

Format the Python code in a code block. Make the code complete and runnable.`;

        try {
            const response = await generateContent(
                prompt,
                'You are a data visualization expert. Analyze data and provide clear insights with Python visualization code using matplotlib and seaborn.',
                {
                    model: 'gemini-2.0-flash',
                    imageData,
                    imageMimeType: 'image/png'
                }
            );

            const text = typeof response === 'string' ? response : JSON.stringify(response);

            // Extract Python code
            const codeMatch = text.match(/```python\n([\s\S]*?)```/);
            const pythonCode = codeMatch ? codeMatch[1] : undefined;

            // Extract insights (bullet points)
            const insightsMatch = text.match(/(?:insights?|findings?|key points?):?\s*((?:[-•*]\s*.+\n?)+)/i);
            const insights = insightsMatch
                ? insightsMatch[1].split('\n').filter(l => l.trim().match(/^[-•*]/)).map(l => l.replace(/^[-•*]\s*/, '').trim())
                : [];

            setResult({
                analysis: text,
                chartDescription: chartType === 'auto' ? 'AI-recommended visualization' : `${chartType} chart`,
                insights,
                pythonCode,
                timestamp: Date.now()
            });
        } catch (err) {
            console.error('Analysis failed:', err);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadCode = () => {
        if (!result?.pythonCode) return;
        const blob = new Blob([result.pythonCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visualization-${Date.now()}.py`;
        a.click();
        URL.revokeObjectURL(url);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(166 72% 40%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <BarChart3 size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Data Visualizer
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Turn any data into charts & insights
                        </p>
                    </div>
                </div>

                {/* Data Source */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Data Source
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setDataSource('paste')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: dataSource === 'paste' ? '2px solid hsl(142 71% 45%)' : '1px solid hsl(222 47% 18%)',
                                backgroundColor: dataSource === 'paste' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 8%)',
                                color: dataSource === 'paste' ? 'hsl(142 71% 65%)' : 'hsl(215 20% 65%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <FileSpreadsheet size={14} />
                            Paste Data
                        </button>
                        <button
                            onClick={captureScreenshot}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: dataSource === 'screenshot' ? '2px solid hsl(142 71% 45%)' : '1px solid hsl(222 47% 18%)',
                                backgroundColor: dataSource === 'screenshot' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 8%)',
                                color: dataSource === 'screenshot' ? 'hsl(142 71% 65%)' : 'hsl(215 20% 65%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <Camera size={14} />
                            Screenshot
                        </button>
                        <button
                            onClick={() => setDataSource('page')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: dataSource === 'page' ? '2px solid hsl(142 71% 45%)' : '1px solid hsl(222 47% 18%)',
                                backgroundColor: dataSource === 'page' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 8%)',
                                color: dataSource === 'page' ? 'hsl(142 71% 65%)' : 'hsl(215 20% 65%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <Table size={14} />
                            From Page
                        </button>
                    </div>
                </div>

                {/* Data Input */}
                {dataSource === 'paste' && (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)' }}>
                                Paste CSV, JSON, or table data
                            </label>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'hsl(222 47% 16%)',
                                    color: 'hsl(215 20% 65%)',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Upload size={10} /> Upload
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.json,.txt,.xlsx,image/*"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <textarea
                            value={pastedData}
                            onChange={(e) => setPastedData(e.target.value)}
                            placeholder="Paste your data here...&#10;&#10;Examples:&#10;Name,Value&#10;A,100&#10;B,200&#10;&#10;Or JSON: [{&quot;name&quot;: &quot;A&quot;, &quot;value&quot;: 100}]"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                outline: 'none',
                                minHeight: '120px',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                )}

                {dataSource === 'screenshot' && screenshotData && (
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '4px', display: 'block' }}>
                            Screenshot Preview
                        </label>
                        <div style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid hsl(222 47% 18%)'
                        }}>
                            <img
                                src={screenshotData}
                                alt="Screenshot"
                                style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
                            />
                            <button
                                onClick={() => setScreenshotData(null)}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'hsl(0 84% 60%)',
                                    color: 'white',
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {dataSource === 'page' && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px',
                        marginBottom: '12px'
                    }}>
                        <p style={{ fontSize: '11px', color: 'hsl(215 20% 65%)' }}>
                            Will analyze data from current page: <strong>{pageContext?.title || 'Loading...'}</strong>
                        </p>
                    </div>
                )}

                {/* Chart Type */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Visualization Type
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(Object.entries(chartTypes) as [ChartType, typeof chartTypes[ChartType]][]).map(([type, config]) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: chartType === type ? '2px solid hsl(142 71% 45%)' : '1px solid hsl(222 47% 18%)',
                                    backgroundColor: chartType === type ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 8%)',
                                    color: chartType === type ? 'hsl(142 71% 65%)' : 'hsl(215 20% 65%)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {config.icon}
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Prompt */}
                <div style={{ marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Custom analysis request (optional)"
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

                {/* Analyze Button */}
                <button
                    onClick={analyzeData}
                    disabled={loading || (dataSource === 'paste' && !pastedData.trim()) || (dataSource === 'screenshot' && !screenshotData)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(166 72% 40%) 100%)',
                        color: 'white',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Analyzing Data...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Analyze & Visualize
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(142 71% 45% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <BarChart3 size={16} style={{ color: 'hsl(142 71% 55%)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(142 71% 65%)' }}>
                            Analysis Result
                        </span>
                    </div>

                    {/* Insights */}
                    {result.insights.length > 0 && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(142 71% 65%)', marginBottom: '8px' }}>
                                Key Insights
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {result.insights.map((insight, idx) => (
                                    <li key={idx} style={{ fontSize: '12px', color: 'hsl(215 20% 80%)', marginBottom: '4px' }}>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Analysis */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        maxHeight: '250px',
                        overflowY: 'auto'
                    }}>
                        <pre style={{
                            fontSize: '11px',
                            color: 'hsl(215 20% 75%)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0
                        }}>
                            {result.analysis.replace(/```python[\s\S]*?```/g, '[Python code below]')}
                        </pre>
                    </div>

                    {/* Python Code */}
                    {result.pythonCode && (
                        <div>
                            <button
                                onClick={() => setShowCode(!showCode)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(222 47% 18%)',
                                    backgroundColor: 'hsl(222 47% 8%)',
                                    color: 'hsl(215 20% 65%)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginBottom: showCode ? '8px' : 0
                                }}
                            >
                                <Code size={14} />
                                {showCode ? 'Hide' : 'Show'} Python Code
                                {showCode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {showCode && (
                                <div style={{
                                    position: 'relative',
                                    backgroundColor: 'hsl(222 47% 6%)',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(222 47% 18%)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        padding: '8px',
                                        borderBottom: '1px solid hsl(222 47% 18%)'
                                    }}>
                                        <button
                                            onClick={() => copyToClipboard(result.pythonCode!, 'code')}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'hsl(222 47% 16%)',
                                                color: 'hsl(215 20% 65%)',
                                                fontSize: '10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {copied === 'code' ? <Check size={10} /> : <Copy size={10} />}
                                            Copy
                                        </button>
                                        <button
                                            onClick={downloadCode}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'hsl(222 47% 16%)',
                                                color: 'hsl(215 20% 65%)',
                                                fontSize: '10px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Download size={10} />
                                            Download .py
                                        </button>
                                    </div>
                                    <pre style={{
                                        padding: '12px',
                                        fontSize: '10px',
                                        color: 'hsl(142 71% 75%)',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        margin: 0
                                    }}>
                                        {result.pythonCode}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <BarChart3 size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        Transform data into visualizations
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        Paste CSV/JSON, screenshot a table, or analyze page data to get charts and insights
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(142 71% 45% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(142 71% 45% / 0.3)'
            }}>
                <div style={{ fontSize: '11px', color: 'hsl(142 71% 75%)', lineHeight: 1.5 }}>
                    <strong>AI-Powered Analysis:</strong> Gemini analyzes your data, identifies patterns,
                    and generates Python visualization code using matplotlib/seaborn.
                </div>
            </div>
        </div>
    );
};

export default DataVisualizer;
