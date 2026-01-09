import React, { useState } from 'react';
import { BookOpen, Search, Globe, ExternalLink, Loader2, Copy, Check, Sparkles, MessageSquare, UserCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext as usePageContextHook } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';

interface ResearchResult {
    query: string;
    answer: string;
    sources: Array<{ uri: string; title?: string }>;
    relatedQuestions: string[];
    timestamp: number;
}

const ResearchAssistantApp: React.FC = () => {
    const { context } = usePageContextHook();
    const { generateWithSearch, loading } = useGemini();
    const { profile, hasProfile, getProfileContext, getPersonalContext } = useUserProfile();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ResearchResult[]>([]);
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [includePageContext, setIncludePageContext] = useState(true);
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const professional = getProfileContext();
        const personal = getPersonalContext();
        let context = '';
        if (professional) context += `Professional: ${professional}`;
        if (personal) context += `\nBackground: ${personal}`;
        return context ? `\n\n--- USER PROFILE (tailor research to this context) ---\n${context}\n--- END PROFILE ---\n` : '';
    };

    const handleSearch = async () => {
        if (!query.trim()) return;

        setStatus('Researching with Google Search...');

        try {
            let prompt = query;

            if (includePageContext && context?.content) {
                prompt = `Based on this context from the current webpage:

PAGE TITLE: ${context.title}
PAGE URL: ${context.url}
PAGE CONTENT (excerpt):
${context.content.substring(0, 3000)}

RESEARCH QUESTION: ${query}

Provide a comprehensive answer to the research question. Include:
1. A detailed, well-structured answer
2. Relevant facts and data from current sources
3. 3-5 related follow-up questions the user might want to explore

Format your response as:
ANSWER:
[Your comprehensive answer here]

RELATED QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]`;
            } else {
                prompt = `RESEARCH QUESTION: ${query}

Provide a comprehensive, well-researched answer using current information. Include:
1. A detailed, well-structured answer
2. Relevant facts, statistics, and data
3. 3-5 related follow-up questions

Format your response as:
ANSWER:
[Your comprehensive answer here]

RELATED QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]`;
            }

            const profileContext = buildProfileContext();
            const systemPrompt = `You are an expert research assistant. Provide accurate, comprehensive answers with proper citations. Be thorough but concise.${includeProfile && hasProfile ? ' Tailor the depth and focus of your research to the user\'s professional background and expertise level.' : ''}`;

            const result = await generateWithSearch(
                prompt + profileContext,
                systemPrompt
            );

            // Parse the response
            const answerMatch = result.text.match(/ANSWER:\s*([\s\S]*?)(?=RELATED QUESTIONS:|$)/i);
            const questionsMatch = result.text.match(/RELATED QUESTIONS:\s*([\s\S]*)/i);

            const answer = answerMatch ? answerMatch[1].trim() : result.text;
            const relatedQuestions: string[] = [];

            if (questionsMatch) {
                const questionLines = questionsMatch[1].split('\n');
                questionLines.forEach(line => {
                    const cleaned = line.replace(/^\d+\.\s*/, '').trim();
                    if (cleaned && cleaned.length > 10) {
                        relatedQuestions.push(cleaned);
                    }
                });
            }

            const newResult: ResearchResult = {
                query: query.trim(),
                answer,
                sources: result.sources,
                relatedQuestions: relatedQuestions.slice(0, 5),
                timestamp: Date.now()
            };

            setResults(prev => [newResult, ...prev]);
            setQuery('');
            setStatus('');
        } catch (err: any) {
            console.error('Research error:', err);
            setStatus('Research failed. Please try again.');
        }
    };

    const handleCopy = async (text: string, id: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFollowUp = (question: string) => {
        setQuery(question);
    };

    const quickResearchTopics = context ? [
        `Summarize the main points of this article`,
        `What are the key facts mentioned here?`,
        `Find more information about ${context.title?.split(' ').slice(0, 3).join(' ')}`,
        `What are alternative perspectives on this topic?`
    ] : [
        `Latest developments in AI technology`,
        `Current economic trends`,
        `Recent scientific discoveries`,
        `Technology industry news`
    ];

    return (
        <div className="space-y-6">
            {/* Context Toggle */}
            {context && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={16} style={{ color: 'hsl(215 20% 55%)' }} />
                        <span style={{ fontSize: '13px', color: 'hsl(210 40% 98%)' }}>Use page context</span>
                    </div>
                    <button
                        onClick={() => setIncludePageContext(!includePageContext)}
                        style={{
                            position: 'relative',
                            width: '44px',
                            height: '24px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            backgroundColor: includePageContext ? 'hsl(142 71% 45%)' : 'hsl(222 47% 20%)'
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: '2px',
                                left: includePageContext ? '22px' : '2px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '10px',
                                backgroundColor: 'hsl(210 40% 98%)',
                                transition: 'left 0.2s'
                            }}
                        />
                    </button>
                </div>
            )}

            {/* Profile Toggle */}
            {hasProfile && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                            onClick={() => setIncludeProfile(!includeProfile)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: `1px solid ${includeProfile ? 'hsl(142 71% 45% / 0.4)' : 'hsl(222 47% 20%)'}`,
                                backgroundColor: includeProfile ? 'hsl(142 71% 45% / 0.15)' : 'hsl(222 47% 13%)',
                                color: includeProfile ? 'hsl(142 71% 55%)' : 'hsl(215 20% 60%)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '18px',
                                borderRadius: '9px',
                                backgroundColor: includeProfile ? 'hsl(142 71% 45%)' : 'hsl(222 47% 20%)',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    position: 'absolute',
                                    top: '2px',
                                    left: includeProfile ? '16px' : '2px',
                                    transition: 'all 0.2s'
                                }} />
                            </div>
                            <UserCircle size={16} />
                            <span>Personalize Research</span>
                        </button>
                        {includeProfile && (
                            <button
                                onClick={() => setShowProfilePreview(!showProfilePreview)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'hsl(215 20% 55%)',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                }}
                            >
                                {showProfilePreview ? 'Hide' : 'Preview'}
                                {showProfilePreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                        )}
                    </div>
                    {includeProfile && showProfilePreview && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: 'hsl(222 47% 9%)',
                            borderRadius: '10px',
                            border: '1px solid hsl(142 71% 45% / 0.2)',
                            fontSize: '11px',
                            color: 'hsl(215 20% 65%)',
                            lineHeight: 1.5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <UserCircle size={14} style={{ color: 'hsl(142 71% 55%)' }} />
                                <span style={{ fontWeight: 700, color: 'hsl(142 71% 60%)' }}>
                                    {profile.name || 'User'}
                                </span>
                                {profile.role && <span style={{ color: 'hsl(215 20% 55%)' }}>• {profile.role}</span>}
                            </div>
                            {profile.companyName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={12} style={{ color: 'hsl(207 90% 55%)' }} />
                                    <span>{profile.companyName}</span>
                                    {profile.companyIndustry && <span style={{ color: 'hsl(215 20% 50%)' }}>• {profile.companyIndustry}</span>}
                                </div>
                            )}
                            <div style={{
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid hsl(222 47% 18%)',
                                fontSize: '10px',
                                color: 'hsl(215 20% 45%)'
                            }}>
                                Research will be tailored to your expertise level
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Search Input */}
            <div className="space-y-3">
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Ask a research question..."
                        style={{
                            width: '100%',
                            padding: '14px 48px 14px 16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '14px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(142 71% 45%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(142 71% 45% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <Sparkles size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(142 71% 55%)' }} />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: loading || !query.trim()
                            ? 'hsl(222 47% 20%)'
                            : 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)',
                        border: 'none',
                        borderRadius: '14px',
                        color: loading || !query.trim() ? 'hsl(215 20% 50%)' : 'white',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                        boxShadow: loading || !query.trim() ? 'none' : '0 8px 24px hsl(142 71% 45% / 0.35)',
                        opacity: loading || !query.trim() ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!loading && query.trim()) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 32px hsl(142 71% 45% / 0.45)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = loading || !query.trim() ? 'none' : '0 8px 24px hsl(142 71% 45% / 0.35)';
                    }}
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    {loading ? 'Researching...' : 'Research'}
                </button>
            </div>

            {/* Quick Topics */}
            <div className="space-y-3">
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>
                    Quick Research
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {quickResearchTopics.map((topic, idx) => (
                        <button
                            key={idx}
                            onClick={() => setQuery(topic)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'hsl(215 20% 65%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                e.currentTarget.style.color = 'hsl(215 20% 65%)';
                            }}
                        >
                            {topic.substring(0, 35)}{topic.length > 35 ? '...' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status */}
            {status && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: status.includes('failed') ? 'hsl(0 84% 60% / 0.1)' : 'hsl(142 71% 45% / 0.1)',
                    border: `1px solid ${status.includes('failed') ? 'hsl(0 84% 60% / 0.2)' : 'hsl(142 71% 45% / 0.2)'}`,
                    borderRadius: '12px',
                    color: status.includes('failed') ? 'hsl(0 84% 65%)' : 'hsl(142 71% 55%)',
                    fontSize: '13px'
                }}>
                    {status}
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-4">
                    {results.map((result) => (
                        <div
                            key={result.timestamp}
                            style={{
                                backgroundColor: 'hsl(222 47% 9%)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                border: '1px solid hsl(222 47% 15%)'
                            }}
                        >
                            {/* Query */}
                            <div style={{
                                padding: '14px 16px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                borderBottom: '1px solid hsl(222 47% 15%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <MessageSquare size={14} style={{ color: 'hsl(142 71% 55%)' }} />
                                    <span style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', fontWeight: 600 }}>{result.query}</span>
                                </div>
                            </div>

                            {/* Answer */}
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={14} style={{ color: 'hsl(142 71% 55%)' }} />
                                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(142 71% 55%)' }}>AI Answer</span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(result.answer, result.timestamp)}
                                        style={{
                                            padding: '6px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {copiedId === result.timestamp ? (
                                            <Check size={14} style={{ color: 'hsl(142 71% 55%)' }} />
                                        ) : (
                                            <Copy size={14} style={{ color: 'hsl(215 20% 55%)' }} />
                                        )}
                                    </button>
                                </div>
                                <div style={{ fontSize: '13px', color: 'hsl(215 20% 75%)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                    {result.answer}
                                </div>
                            </div>

                            {/* Sources */}
                            {result.sources.length > 0 && (
                                <div style={{ padding: '0 16px 16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)', marginBottom: '10px' }}>Sources</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {result.sources.map((source, idx) => (
                                            <a
                                                key={idx}
                                                href={source.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 10px',
                                                    backgroundColor: 'hsl(222 47% 13%)',
                                                    borderRadius: '8px',
                                                    fontSize: '11px',
                                                    color: 'hsl(207 90% 60%)',
                                                    textDecoration: 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                                    e.currentTarget.style.color = 'hsl(207 90% 70%)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                                    e.currentTarget.style.color = 'hsl(207 90% 60%)';
                                                }}
                                            >
                                                <ExternalLink size={10} />
                                                {source.title || new URL(source.uri).hostname}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Related Questions */}
                            {result.relatedQuestions.length > 0 && (
                                <div style={{ padding: '0 16px 16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)', marginBottom: '10px' }}>Related Questions</p>
                                    <div className="space-y-2">
                                        {result.relatedQuestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleFollowUp(q)}
                                                style={{
                                                    display: 'block',
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    padding: '12px 14px',
                                                    backgroundColor: 'hsl(222 47% 13%)',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                    color: 'hsl(215 20% 65%)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                                    e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                                    e.currentTarget.style.color = 'hsl(215 20% 65%)';
                                                }}
                                            >
                                                → {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {results.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <BookOpen size={40} style={{ margin: '0 auto 16px', color: 'hsl(215 20% 35%)', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '8px' }}>Start researching</h3>
                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 45%)' }}>
                        Ask any question for AI-powered research
                    </p>
                </div>
            )}
        </div>
    );
};

export default ResearchAssistantApp;
