import React, { useState, useRef, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { MessageSquare, Send, User, Bot, Loader2, Copy, Check, UserCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import MarkdownRenderer from '../../components/MarkdownRenderer';

interface Message {
    role: 'user' | 'model';
    content: string;
}

const ChatWithPage: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading } = useGemini();
    const { profile, hasProfile, getProfileContext, getPersonalContext } = useUserProfile();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleCopy = async (content: string, idx: number) => {
        await navigator.clipboard.writeText(content);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';

        const parts: string[] = [];

        // Professional context
        const professionalContext = getProfileContext();
        if (professionalContext) {
            parts.push(`## User's Professional Context\n${professionalContext}`);
        }

        // Personal context
        const personalContext = getPersonalContext();
        if (personalContext) {
            parts.push(`## User's Background\n${personalContext}`);
        }

        return parts.length > 0 ? `\n\n--- USER PROFILE (for personalized responses) ---\n${parts.join('\n\n')}\n--- END USER PROFILE ---\n` : '';
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        const profileContext = buildProfileContext();

        const systemPrompt = `
      You are an elite Genius Research Assistant and Information Specialist. Your task is to provide brilliant, highly accurate, and helpful answers based on the provided page context.

      Page Title: ${context?.title}
      URL: ${context?.url}
      Page Content: ${context?.content?.substring(0, 15000)}
      ${profileContext}
      Guidelines:
      1. Use the page content as your primary source of information.
      2. You CAN and SHOULD perform analysis, summarization, categorization, sentiment analysis, comparisons, and other analytical tasks on the content when asked.
      3. If asked to analyze, rate, categorize, or evaluate content - DO IT. Use your intelligence to provide insightful analysis.
      4. If specific factual information isn't in the content, say so but still help with analysis or logical inferences.
      5. Be helpful, intelligent, and thorough in your responses.
      ${includeProfile && hasProfile ? `6. When relevant, personalize your responses based on the user's profile - consider their role, company, industry, and expertise level. Tailor technical depth and examples accordingly.` : ''}

      Formatting:
      - Use markdown formatting for rich responses: headers (##, ###), **bold**, *italic*, bullet lists, numbered lists, code blocks, tables, etc.
      - When presenting data analysis, ratings, or comparisons, use tables or structured lists.
      - Use code blocks (\`\`\`) for any code, JSON, or technical content.
      - Make your responses scannable with clear sections and formatting.
    `;

        try {
            const response = await generateContent(input, systemPrompt);
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'hsl(222 47% 7%)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid hsl(222 47% 15%)'
        }}>
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}
            >
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, hsl(262 83% 58% / 0.15) 0%, hsl(262 83% 58% / 0.05) 100%)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <MessageSquare size={32} style={{ color: 'hsl(262 83% 58%)' }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)', marginBottom: '10px' }}>
                            Ask about this page
                        </h3>
                        <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', maxWidth: '220px', margin: '0 auto', lineHeight: 1.6 }}>
                            Gemini 2.0 can help you summarize or find technical details in seconds.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        {msg.role === 'model' ? (
                            <div style={{ maxWidth: '85%' }}>
                                <div style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    color: 'hsl(215 20% 80%)',
                                    border: '1px solid hsl(222 47% 18%)',
                                    borderRadius: '16px',
                                    borderTopLeftRadius: '4px',
                                    padding: '16px',
                                    fontSize: '14px',
                                    lineHeight: 1.6
                                }}>
                                    <MarkdownRenderer content={msg.content} className="prose-sm" />
                                </div>
                                <button
                                    onClick={() => handleCopy(msg.content, i)}
                                    style={{
                                        marginTop: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '10px',
                                        color: copiedIdx === i ? 'hsl(142 71% 45%)' : 'hsl(215 20% 50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 0',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    {copiedIdx === i ? (
                                        <>
                                            <Check size={12} />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} />
                                            <span>Copy response</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                maxWidth: '85%',
                                padding: '14px 18px',
                                borderRadius: '16px',
                                borderTopRightRadius: '4px',
                                fontSize: '14px',
                                lineHeight: 1.6,
                                background: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(280 70% 55%) 100%)',
                                color: 'white',
                                boxShadow: '0 6px 20px hsl(262 83% 58% / 0.25)'
                            }}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 18%)',
                            padding: '14px 18px',
                            borderRadius: '16px',
                            borderTopLeftRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Loader2 size={16} className="animate-spin" style={{ color: 'hsl(262 83% 58%)' }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>
                                Thinking...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Toggle Section */}
            {hasProfile && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'hsl(222 47% 9%)',
                    borderTop: '1px solid hsl(222 47% 15%)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <button
                            onClick={() => setIncludeProfile(!includeProfile)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: `1px solid ${includeProfile ? 'hsl(262 83% 58% / 0.4)' : 'hsl(222 47% 20%)'}`,
                                backgroundColor: includeProfile ? 'hsl(262 83% 58% / 0.15)' : 'hsl(222 47% 11%)',
                                color: includeProfile ? 'hsl(262 83% 70%)' : 'hsl(215 20% 60%)',
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
                                backgroundColor: includeProfile ? 'hsl(262 83% 58%)' : 'hsl(222 47% 20%)',
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
                            <span>Include My Profile</span>
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

                    {/* Profile Preview */}
                    {includeProfile && showProfilePreview && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderRadius: '10px',
                            border: '1px solid hsl(262 83% 58% / 0.2)',
                            fontSize: '11px',
                            color: 'hsl(215 20% 65%)',
                            lineHeight: 1.5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <UserCircle size={14} style={{ color: 'hsl(262 83% 60%)' }} />
                                <span style={{ fontWeight: 700, color: 'hsl(262 83% 70%)' }}>
                                    {profile.name || 'User'}
                                </span>
                                {profile.role && (
                                    <span style={{ color: 'hsl(215 20% 55%)' }}>• {profile.role}</span>
                                )}
                            </div>
                            {profile.companyName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Building2 size={12} style={{ color: 'hsl(207 90% 55%)' }} />
                                    <span>{profile.companyName}</span>
                                    {profile.companyIndustry && (
                                        <span style={{ color: 'hsl(215 20% 50%)' }}>• {profile.companyIndustry}</span>
                                    )}
                                </div>
                            )}
                            {profile.skills && (
                                <div style={{ marginTop: '6px', fontSize: '10px', color: 'hsl(215 20% 50%)' }}>
                                    <span style={{ fontWeight: 600 }}>Skills:</span> {profile.skills.substring(0, 100)}{profile.skills.length > 100 ? '...' : ''}
                                </div>
                            )}
                            <div style={{
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid hsl(222 47% 18%)',
                                fontSize: '10px',
                                color: 'hsl(215 20% 45%)'
                            }}>
                                AI will use this context to personalize responses
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{
                padding: '16px',
                backgroundColor: 'hsl(222 47% 9%)',
                borderTop: hasProfile ? 'none' : '1px solid hsl(222 47% 15%)'
            }}>
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    style={{ display: 'flex', gap: '12px' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question..."
                        style={{
                            flex: 1,
                            padding: '14px 18px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '14px',
                            color: 'hsl(210 40% 98%)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(262 83% 58%)';
                            e.target.style.boxShadow = '0 0 0 3px hsl(262 83% 58% / 0.15)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(222 47% 20%)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        style={{
                            width: '52px',
                            height: '52px',
                            background: !input.trim() || loading
                                ? 'hsl(222 47% 20%)'
                                : 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(280 70% 55%) 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: !input.trim() || loading ? 'hsl(215 20% 50%)' : 'white',
                            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                            boxShadow: !input.trim() || loading ? 'none' : '0 6px 20px hsl(262 83% 58% / 0.35)'
                        }}
                        onMouseEnter={(e) => {
                            if (input.trim() && !loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 28px hsl(262 83% 58% / 0.45)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = !input.trim() || loading ? 'none' : '0 6px 20px hsl(262 83% 58% / 0.35)';
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWithPage;
