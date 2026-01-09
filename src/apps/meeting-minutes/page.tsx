import React, { useState, useRef } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { useAppHistory } from '../../hooks/useAppHistory';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
    ClipboardList,
    Upload,
    FileText,
    FileAudio,
    Loader2,
    Sparkles,
    Copy,
    Check,
    Trash2,
    ListChecks,
    Users,
    Clock,
    AlertCircle,
    X,
    ChevronDown,
    ChevronUp,
    UserCircle,
    Building2
} from 'lucide-react';
import MarkdownRenderer from '../../components/MarkdownRenderer';

type InputMode = 'text' | 'file';
type OutputFormat = 'standard' | 'actions' | 'summary' | 'detailed';

interface MeetingMinutes {
    title: string;
    date: string;
    duration?: string;
    attendees?: string[];
    summary: string;
    keyDiscussions?: Array<{
        topic: string;
        points: string[];
    }>;
    actionItems: Array<{
        task: string;
        owner?: string;
        deadline?: string;
    }>;
    decisions: string[];
    nextSteps?: string[];
}

const MeetingMinutesApp: React.FC = () => {
    const { generateContent, loading, error: apiError } = useGemini();
    const { saveHistoryEntry } = useAppHistory();
    const { profile, hasProfile, getProfileContext } = useUserProfile();

    // Input state
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [textInput, setTextInput] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    // Profile integration
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showProfilePreview, setShowProfilePreview] = useState(false);

    // Output state
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('standard');
    const [result, setResult] = useState<MeetingMinutes | string | null>(null);
    const [error, setError] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const context = getProfileContext();
        return context ? `\n\n--- MEETING ORGANIZER CONTEXT ---\n${context}\nUse this context to identify the organizer and their role when relevant.\n--- END CONTEXT ---\n` : '';
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setUploadedFile(file);
        setIsProcessingFile(true);

        try {
            if (file.type.startsWith('audio/')) {
                // For audio files, we'll process them with Gemini's audio capabilities
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    setFileContent(base64);
                    setIsProcessingFile(false);
                };
                reader.onerror = () => {
                    setError('Failed to read audio file');
                    setIsProcessingFile(false);
                };
                reader.readAsDataURL(file);
            } else {
                // For text files (txt, md, srt, vtt, etc.)
                const reader = new FileReader();
                reader.onload = () => {
                    setFileContent(reader.result as string);
                    setIsProcessingFile(false);
                };
                reader.onerror = () => {
                    setError('Failed to read file');
                    setIsProcessingFile(false);
                };
                reader.readAsText(file);
            }
        } catch (err) {
            setError('Failed to process file');
            setIsProcessingFile(false);
        }

        // Reset file input for re-upload
        e.target.value = '';
    };

    // Remove uploaded file
    const removeFile = () => {
        setUploadedFile(null);
        setFileContent('');
    };

    // Get format-specific prompt
    const getFormatPrompt = (): string => {
        switch (outputFormat) {
            case 'actions':
                return `Extract ONLY the action items from this meeting. Return JSON:
{
    "title": "Meeting title based on content",
    "date": "Today's date or mentioned date",
    "actionItems": [
        { "task": "Description of task", "owner": "Person responsible if mentioned", "deadline": "Due date if mentioned" }
    ]
}`;
            case 'summary':
                return `Provide a HIGH-LEVEL EXECUTIVE SUMMARY of this meeting (2-3 paragraphs max). Return JSON:
{
    "title": "Meeting title",
    "date": "Date",
    "summary": "Executive summary paragraph(s)",
    "decisions": ["Key decision 1", "Key decision 2"],
    "nextSteps": ["Next step 1", "Next step 2"]
}`;
            case 'detailed':
                return `Create COMPREHENSIVE meeting minutes with full detail. Return JSON:
{
    "title": "Meeting title",
    "date": "Date",
    "duration": "Duration if mentioned",
    "attendees": ["Person 1", "Person 2"],
    "summary": "Brief overview",
    "keyDiscussions": [
        { "topic": "Topic name", "points": ["Discussion point 1", "Discussion point 2"] }
    ],
    "actionItems": [
        { "task": "Task description", "owner": "Owner", "deadline": "Deadline" }
    ],
    "decisions": ["Decision 1", "Decision 2"],
    "nextSteps": ["Next step 1"]
}`;
            default: // standard
                return `Create structured meeting minutes. Return JSON:
{
    "title": "Meeting title based on content",
    "date": "Today's date or mentioned date",
    "attendees": ["Names if mentioned"],
    "summary": "2-3 sentence overview",
    "actionItems": [
        { "task": "Task description", "owner": "Person responsible if mentioned", "deadline": "Due date if mentioned" }
    ],
    "decisions": ["Key decision 1", "Key decision 2"],
    "nextSteps": ["Follow-up item 1"]
}`;
        }
    };

    // Process meeting
    const processMinutes = async () => {
        setError('');
        setResult(null);

        const content = inputMode === 'text' ? textInput : fileContent;
        const isAudio = uploadedFile?.type.startsWith('audio/');

        if (!content && !isAudio) {
            setError('Please provide a transcript or upload a file');
            return;
        }

        try {
            let transcriptText = content;

            // If it's an audio file, first transcribe it
            if (isAudio && uploadedFile) {
                const transcribePrompt = `Transcribe this audio file accurately. Include speaker labels if you can distinguish different speakers. Output the full transcript as plain text.`;

                transcriptText = await generateContent(
                    transcribePrompt,
                    'You are an expert audio transcriber. Provide accurate, verbatim transcriptions.',
                    {
                        imageData: content,
                        imageMimeType: uploadedFile.type
                    }
                );
            }

            // Now process the transcript into meeting minutes
            const profileContext = buildProfileContext();
            const prompt = `${getFormatPrompt()}
${profileContext}
TRANSCRIPT:
${transcriptText}

Be thorough and extract all relevant information. If information is not available, omit that field.${includeProfile && hasProfile ? ' If the meeting organizer matches the profile context, you can use that information to fill in owner details for action items.' : ''}`;

            const data = await generateContent(
                prompt,
                'You are an Executive Assistant expert at creating professional meeting minutes. Extract key information accurately and format it clearly.',
                { jsonMode: true }
            );

            setResult(data);

            // Save to history
            saveHistoryEntry('meeting-minutes', 'Meeting Minutes', {
                inputMode,
                outputFormat,
                fileName: uploadedFile?.name
            }, data);

        } catch (err: any) {
            console.error('Processing error:', err);
            setError(err.message || 'Failed to process meeting content');
        }
    };

    // Copy result
    const copyResult = async () => {
        if (!result) return;
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Clear all
    const clearAll = () => {
        setTextInput('');
        setUploadedFile(null);
        setFileContent('');
        setResult(null);
        setError('');
    };

    // Render result based on type
    const renderResult = () => {
        if (!result) return null;

        if (typeof result === 'string') {
            return <MarkdownRenderer content={result} />;
        }

        const minutes = result as MeetingMinutes;

        return (
            <div className="space-y-5">
                {/* Header */}
                <div className="p-4 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-xl border border-blue-500/20">
                    <h3 className="font-bold text-white text-lg mb-1">{minutes.title}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        {minutes.date && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {minutes.date}
                            </span>
                        )}
                        {minutes.duration && (
                            <span>{minutes.duration}</span>
                        )}
                        {minutes.attendees && minutes.attendees.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Users size={12} />
                                {minutes.attendees.length} attendees
                            </span>
                        )}
                    </div>
                </div>

                {/* Attendees */}
                {minutes.attendees && minutes.attendees.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Attendees</h4>
                        <div className="flex flex-wrap gap-2">
                            {minutes.attendees.map((person, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 border border-white/5">
                                    {person}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                {minutes.summary && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Summary</h4>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded-xl">
                            {minutes.summary}
                        </p>
                    </div>
                )}

                {/* Key Discussions */}
                {minutes.keyDiscussions && minutes.keyDiscussions.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Key Discussions</h4>
                        <div className="space-y-3">
                            {minutes.keyDiscussions.map((discussion, i) => (
                                <div key={i} className="bg-slate-800/30 p-3 rounded-xl">
                                    <h5 className="text-sm font-medium text-white mb-2">{discussion.topic}</h5>
                                    <ul className="space-y-1">
                                        {discussion.points.map((point, j) => (
                                            <li key={j} className="flex gap-2 text-xs text-slate-400">
                                                <span className="text-blue-400">•</span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Items */}
                {minutes.actionItems && minutes.actionItems.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold flex items-center gap-1">
                            <ListChecks size={12} />
                            Action Items
                        </h4>
                        <ul className="space-y-2">
                            {minutes.actionItems.map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
                                    <input type="checkbox" className="mt-0.5 accent-orange-500" />
                                    <div className="flex-1">
                                        <p className="text-slate-300">{item.task}</p>
                                        {(item.owner || item.deadline) && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {item.owner && <span className="text-orange-400">{item.owner}</span>}
                                                {item.owner && item.deadline && ' • '}
                                                {item.deadline && <span>Due: {item.deadline}</span>}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Decisions */}
                {minutes.decisions && minutes.decisions.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Decisions Made</h4>
                        <ul className="space-y-1.5">
                            {minutes.decisions.map((decision, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-300">
                                    <span className="text-emerald-400">✓</span>
                                    {decision}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Next Steps */}
                {minutes.nextSteps && minutes.nextSteps.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Next Steps</h4>
                        <ul className="space-y-1.5">
                            {minutes.nextSteps.map((step, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-300">
                                    <span className="text-blue-400">→</span>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                    <ClipboardList size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Meeting Minutes</h2>
                <p className="text-xs text-slate-400 mt-1">Upload a transcript or audio file</p>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl">
                <button
                    onClick={() => setInputMode('text')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        inputMode === 'text'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <FileText size={16} />
                    Paste Text
                </button>
                <button
                    onClick={() => setInputMode('file')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        inputMode === 'file'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    <Upload size={16} />
                    Upload File
                </button>
            </div>

            {/* Input Area */}
            {inputMode === 'text' ? (
                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider font-semibold px-1" style={{ color: 'hsl(215 15% 45%)' }}>
                        Meeting Transcript
                    </label>
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Paste your meeting transcript here..."
                        style={{
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderColor: 'hsl(222 47% 18% / 0.5)',
                            color: 'hsl(210 40% 98%)'
                        }}
                        className="w-full min-h-[200px] resize-none border rounded-xl p-3 text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        accept=".txt,.md,.srt,.vtt,.doc,.docx,audio/*"
                        className="hidden"
                    />

                    {!uploadedFile ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                backgroundColor: 'hsl(222 47% 11%)',
                                borderColor: 'hsl(222 47% 18% / 0.5)'
                            }}
                            className="w-full p-8 border-2 border-dashed rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-3"
                        >
                            <div
                                style={{ backgroundColor: 'hsl(222 47% 15%)' }}
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                            >
                                <Upload size={24} style={{ color: 'hsl(215 20% 65%)' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium" style={{ color: 'hsl(210 40% 98%)' }}>Click to upload</p>
                                <p className="text-xs mt-1" style={{ color: 'hsl(215 15% 45%)' }}>
                                    Supports: TXT, MD, SRT, VTT, Audio files (MP3, WAV, M4A)
                                </p>
                            </div>
                        </button>
                    ) : (
                        <div
                            style={{
                                backgroundColor: 'hsl(222 47% 11% / 0.5)',
                                borderColor: 'hsl(222 47% 18% / 0.5)'
                            }}
                            className="p-4 rounded-xl border"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {uploadedFile.type.startsWith('audio/') ? (
                                        <FileAudio size={24} className="text-blue-400" />
                                    ) : (
                                        <FileText size={24} className="text-blue-400" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'hsl(210 40% 98%)' }}>{uploadedFile.name}</p>
                                        <p className="text-xs" style={{ color: 'hsl(215 15% 45%)' }}>
                                            {(uploadedFile.size / 1024).toFixed(1)} KB
                                            {uploadedFile.type.startsWith('audio/') && ' • Audio file'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={removeFile}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X size={16} style={{ color: 'hsl(215 15% 45%)' }} />
                                </button>
                            </div>
                            {isProcessingFile && (
                                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                                    <Loader2 size={12} className="animate-spin" />
                                    Reading file...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Output Format */}
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold px-1" style={{ color: 'hsl(215 15% 45%)' }}>
                    Output Format
                </label>
                <div className="relative">
                    <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                        style={{
                            backgroundColor: 'hsl(222 47% 11%)',
                            borderColor: 'hsl(222 47% 18% / 0.5)',
                            color: 'hsl(210 40% 98%)'
                        }}
                        className="w-full border text-sm py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none"
                    >
                        <option value="standard">Standard Minutes</option>
                        <option value="actions">Action Items Only</option>
                        <option value="summary">Executive Summary</option>
                        <option value="detailed">Detailed Minutes</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(215 15% 45%)' }} />
                </div>
            </div>

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
                                border: `1px solid ${includeProfile ? 'hsl(217 91% 60% / 0.4)' : 'hsl(222 47% 20%)'}`,
                                backgroundColor: includeProfile ? 'hsl(217 91% 60% / 0.15)' : 'hsl(222 47% 13%)',
                                color: includeProfile ? 'hsl(217 91% 70%)' : 'hsl(215 20% 60%)',
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
                                backgroundColor: includeProfile ? 'hsl(217 91% 60%)' : 'hsl(222 47% 20%)',
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
                    {includeProfile && showProfilePreview && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: 'hsl(222 47% 9%)',
                            borderRadius: '10px',
                            border: '1px solid hsl(217 91% 60% / 0.2)',
                            fontSize: '11px',
                            color: 'hsl(215 20% 65%)',
                            lineHeight: 1.5
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <UserCircle size={14} style={{ color: 'hsl(217 91% 60%)' }} />
                                <span style={{ fontWeight: 700, color: 'hsl(217 91% 70%)' }}>
                                    {profile.name || 'User'}
                                </span>
                                {profile.role && <span style={{ color: 'hsl(215 20% 55%)' }}>• {profile.role}</span>}
                            </div>
                            {profile.companyName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 size={12} style={{ color: 'hsl(207 90% 55%)' }} />
                                    <span>{profile.companyName}</span>
                                </div>
                            )}
                            <div style={{
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid hsl(222 47% 18%)',
                                fontSize: '10px',
                                color: 'hsl(215 20% 45%)'
                            }}>
                                AI will use this to identify you as meeting organizer
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {(error || apiError) && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {error || apiError}
                </div>
            )}

            {/* Process Button */}
            <button
                onClick={processMinutes}
                disabled={loading || isProcessingFile || (!textInput && !fileContent)}
                className="btn-primary w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-blue-600 !to-indigo-600"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        {uploadedFile?.type.startsWith('audio/') ? 'Transcribing & Processing...' : 'Processing...'}
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        Generate Meeting Minutes
                    </>
                )}
            </button>

            {/* Result */}
            {result && (
                <div className="space-y-4 animate-in pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            Meeting Minutes
                        </h3>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={copyResult}
                                className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${copied ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'}`}
                                title="Copy"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={clearAll}
                                className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                                title="Clear"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="card p-5 bg-slate-900/50">
                        {renderResult()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingMinutesApp;
