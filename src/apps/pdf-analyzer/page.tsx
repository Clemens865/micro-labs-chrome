import React, { useState, useRef } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    FileText, Upload, Loader2, Sparkles, MessageSquare, Send,
    Table, ListTree, Copy, Check, Download, Trash2, ChevronDown,
    ChevronUp, Search, BookOpen, FileSpreadsheet
} from 'lucide-react';

type AnalysisMode = 'summary' | 'extract' | 'qa' | 'tables';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface PDFAnalysisResult {
    mode: AnalysisMode;
    content: string;
    tables?: string[];
    keyPoints?: string[];
    timestamp: number;
}

const PDFAnalyzer: React.FC = () => {
    const { generateContent, loading } = useGemini();
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('summary');
    const [result, setResult] = useState<PDFAnalysisResult | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const analysisModes: Record<AnalysisMode, { label: string; icon: React.ReactNode; description: string }> = {
        summary: {
            label: 'Summary',
            icon: <BookOpen size={14} />,
            description: 'Comprehensive document summary'
        },
        extract: {
            label: 'Key Points',
            icon: <ListTree size={14} />,
            description: 'Extract main points & findings'
        },
        tables: {
            label: 'Extract Tables',
            icon: <Table size={14} />,
            description: 'Find and extract data tables'
        },
        qa: {
            label: 'Q&A Chat',
            icon: <MessageSquare size={14} />,
            description: 'Ask questions about the PDF'
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        // Check file size (Gemini has limits)
        if (file.size > 20 * 1024 * 1024) {
            alert('PDF must be under 20MB');
            return;
        }

        setPdfFile(file);
        setResult(null);
        setChatMessages([]);

        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            setPdfBase64(base64);
        };
        reader.readAsDataURL(file);
    };

    const clearPDF = () => {
        setPdfFile(null);
        setPdfBase64(null);
        setResult(null);
        setChatMessages([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const analyzePDF = async () => {
        if (!pdfBase64) return;

        const prompts: Record<Exclude<AnalysisMode, 'qa'>, string> = {
            summary: `Analyze this PDF document and provide a comprehensive summary:

1. **Document Overview**: What type of document is this? What is its main purpose?
2. **Executive Summary**: 2-3 paragraph summary of the key content
3. **Main Sections**: Outline the document structure and main sections
4. **Key Findings/Points**: Most important information extracted
5. **Conclusions**: Any conclusions, recommendations, or action items

Be thorough but concise. Format with clear markdown headings.`,

            extract: `Extract the key information from this PDF:

1. **Main Topic**: What is this document about?
2. **Key Points**: Bullet list of the most important points (aim for 10-15)
3. **Data & Statistics**: Any numbers, percentages, or data mentioned
4. **Names & Entities**: Important people, companies, or organizations mentioned
5. **Dates & Deadlines**: Any important dates or timelines
6. **Action Items**: Any tasks or follow-ups mentioned

Format as organized bullet points.`,

            tables: `Extract all tables, charts, and structured data from this PDF:

For each table found:
1. Identify the table title/purpose
2. Extract the data in markdown table format
3. Note any important values or trends

For any charts or graphs:
1. Describe what the chart shows
2. Extract the key data points if visible
3. Note the main trend or conclusion

If no tables are found, extract any structured/numerical data present in the document.`
        };

        try {
            const response = await generateContent(
                prompts[analysisMode as Exclude<AnalysisMode, 'qa'>],
                'You are an expert document analyst. Analyze PDFs thoroughly and extract information accurately. Preserve data precision for tables and numbers.',
                {
                    model: 'gemini-2.0-flash',
                    imageData: pdfBase64,
                    imageMimeType: 'application/pdf'
                }
            );

            const text = typeof response === 'string' ? response : JSON.stringify(response);

            // Extract key points if in extract mode
            const keyPointsMatch = text.match(/(?:key points?|main points?|findings?):?\s*((?:[-•*]\s*.+\n?)+)/i);
            const keyPoints = keyPointsMatch
                ? keyPointsMatch[1].split('\n').filter(l => l.trim().match(/^[-•*]/)).map(l => l.replace(/^[-•*]\s*/, '').trim())
                : [];

            // Extract tables (markdown format)
            const tableMatches = text.match(/\|[^\n]+\|(?:\n\|[^\n]+\|)+/g);
            const tables = tableMatches || [];

            setResult({
                mode: analysisMode,
                content: text,
                tables: tables.length > 0 ? tables : undefined,
                keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
                timestamp: Date.now()
            });

            if (analysisMode === 'qa') {
                setShowChat(true);
            }
        } catch (err: any) {
            console.error('PDF analysis failed:', err);
            alert('Failed to analyze PDF. ' + (err.message || ''));
        }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || !pdfBase64) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: chatInput,
            timestamp: Date.now()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');

        try {
            // Build context from previous messages
            const conversationContext = chatMessages
                .slice(-6) // Last 6 messages for context
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n\n');

            const prompt = `Based on the PDF document provided, answer this question:

${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}User's question: ${chatInput}

Provide a clear, accurate answer based on the document content. If the information isn't in the document, say so.`;

            const response = await generateContent(
                prompt,
                'You are a helpful assistant answering questions about a PDF document. Be accurate and cite specific parts of the document when possible.',
                {
                    model: 'gemini-2.0-flash',
                    imageData: pdfBase64,
                    imageMimeType: 'application/pdf'
                }
            );

            const text = typeof response === 'string' ? response : JSON.stringify(response);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: text,
                timestamp: Date.now()
            };

            setChatMessages(prev => [...prev, assistantMessage]);

            // Scroll to bottom
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error('Chat failed:', err);
        }
    };

    const copyContent = async () => {
        if (result) {
            await navigator.clipboard.writeText(result.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadResult = () => {
        if (!result) return;
        const blob = new Blob([result.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-analysis-${pdfFile?.name || 'document'}-${Date.now()}.md`;
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
                        background: 'linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(24 95% 53%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FileText size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            PDF Deep Analyzer
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            Analyze, extract & chat with PDFs
                        </p>
                    </div>
                </div>

                {/* Upload Area */}
                {!pdfFile ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            padding: '32px 20px',
                            backgroundColor: 'hsl(222 47% 8%)',
                            borderRadius: '12px',
                            border: '2px dashed hsl(222 47% 25%)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: '12px'
                        }}
                    >
                        <Upload size={32} style={{ color: 'hsl(0 84% 60%)', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', marginBottom: '4px' }}>
                            Upload PDF document
                        </p>
                        <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>
                            Max 20MB • Click or drag to upload
                        </p>
                    </div>
                ) : (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '10px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: 'hsl(0 84% 60% / 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={20} style={{ color: 'hsl(0 84% 60%)' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', color: 'hsl(210 40% 98%)', marginBottom: '2px' }}>
                                {pdfFile.name}
                            </p>
                            <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={clearPDF}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                color: 'hsl(0 84% 65%)',
                                cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />

                {/* Analysis Mode */}
                {pdfFile && (
                    <>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                                Analysis Mode
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                {(Object.entries(analysisModes) as [AnalysisMode, typeof analysisModes[AnalysisMode]][]).map(([mode, config]) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            setAnalysisMode(mode);
                                            if (mode === 'qa') setShowChat(true);
                                            else setShowChat(false);
                                        }}
                                        disabled={loading}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: analysisMode === mode
                                                ? '2px solid hsl(0 84% 60%)'
                                                : '1px solid hsl(222 47% 18%)',
                                            backgroundColor: analysisMode === mode
                                                ? 'hsl(0 84% 60% / 0.15)'
                                                : 'hsl(222 47% 8%)',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                            <span style={{ color: analysisMode === mode ? 'hsl(0 84% 65%)' : 'hsl(215 20% 55%)' }}>
                                                {config.icon}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: analysisMode === mode ? 'hsl(0 84% 70%)' : 'hsl(210 40% 98%)'
                                            }}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                            {config.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Analyze Button */}
                        {analysisMode !== 'qa' && (
                            <button
                                onClick={analyzePDF}
                                disabled={loading || !pdfBase64}
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
                                    background: 'linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(24 95% 53%) 100%)',
                                    color: 'white',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Analyzing PDF...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Analyze Document
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Chat Interface */}
            {pdfFile && (analysisMode === 'qa' || showChat) && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <MessageSquare size={16} style={{ color: 'hsl(0 84% 60%)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>
                            Chat with PDF
                        </span>
                    </div>

                    {/* Messages */}
                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        marginBottom: '12px',
                        padding: '8px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px'
                    }}>
                        {chatMessages.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 50%)', textAlign: 'center', padding: '20px' }}>
                                Ask any question about the PDF document
                            </p>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: '12px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        backgroundColor: msg.role === 'user'
                                            ? 'hsl(0 84% 60% / 0.15)'
                                            : 'hsl(222 47% 16%)',
                                        marginLeft: msg.role === 'user' ? '20px' : 0,
                                        marginRight: msg.role === 'assistant' ? '20px' : 0
                                    }}
                                >
                                    <p style={{
                                        fontSize: '10px',
                                        color: msg.role === 'user' ? 'hsl(0 84% 65%)' : 'hsl(215 20% 55%)',
                                        marginBottom: '4px',
                                        fontWeight: 600
                                    }}>
                                        {msg.role === 'user' ? 'You' : 'Assistant'}
                                    </p>
                                    <p style={{
                                        fontSize: '12px',
                                        color: 'hsl(215 20% 80%)',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.5
                                    }}>
                                        {msg.content}
                                    </p>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Ask about the PDF..."
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                backgroundColor: 'hsl(222 47% 8%)',
                                border: '1px solid hsl(222 47% 18%)',
                                borderRadius: '8px',
                                color: 'hsl(210 40% 98%)',
                                fontSize: '12px',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendChatMessage}
                            disabled={loading || !chatInput.trim()}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(0 84% 60%)',
                                color: 'white',
                                cursor: 'pointer',
                                opacity: (loading || !chatInput.trim()) ? 0.5 : 1
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && analysisMode !== 'qa' && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(0 84% 60% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} style={{ color: 'hsl(0 84% 60%)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(0 84% 65%)' }}>
                                Analysis Result
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={copyContent}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
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
                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                Copy
                            </button>
                            <button
                                onClick={downloadResult}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
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
                                Download
                            </button>
                            <button
                                onClick={() => setShowChat(true)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'hsl(0 84% 60% / 0.2)',
                                    color: 'hsl(0 84% 65%)',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <MessageSquare size={10} />
                                Chat
                            </button>
                        </div>
                    </div>

                    {/* Key Points */}
                    {result.keyPoints && result.keyPoints.length > 0 && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(0 84% 60% / 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(0 84% 65%)', marginBottom: '8px' }}>
                                Key Points
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {result.keyPoints.slice(0, 8).map((point, idx) => (
                                    <li key={idx} style={{ fontSize: '12px', color: 'hsl(215 20% 80%)', marginBottom: '4px' }}>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Content */}
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'hsl(222 47% 8%)',
                        borderRadius: '8px',
                        maxHeight: '350px',
                        overflowY: 'auto'
                    }}>
                        <pre style={{
                            fontSize: '12px',
                            color: 'hsl(215 20% 80%)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.6,
                            margin: 0
                        }}>
                            {result.content}
                        </pre>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!pdfFile && (
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <FileText size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        AI-Powered PDF Analysis
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        Upload PDFs to extract summaries, key points, tables, or chat directly with the document
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(0 84% 60% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(0 84% 60% / 0.3)'
            }}>
                <div style={{ fontSize: '11px', color: 'hsl(0 84% 75%)', lineHeight: 1.5 }}>
                    <strong>Native PDF Support:</strong> Gemini reads and understands PDF documents directly,
                    including text, tables, charts, and images within the document.
                </div>
            </div>
        </div>
    );
};

export default PDFAnalyzer;
