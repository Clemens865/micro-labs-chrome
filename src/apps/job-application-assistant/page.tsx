'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, Sparkles, Copy, Check, Download, RotateCcw, ChevronDown, ChevronUp, Target, Building2, MapPin, Clock, DollarSign, Star, Loader2, GraduationCap } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface JobDetails {
    title: string;
    company: string;
    location: string;
    type: string;
    salary?: string;
    description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
}

interface ApplicationMaterials {
    coverLetter: string;
    resumeHighlights: string[];
    interviewTips: string[];
    keywordMatches: string[];
    skillGaps: string[];
    customAnswers: { question: string; answer: string }[];
}

interface SavedApplication {
    id: string;
    timestamp: string;
    jobDetails: JobDetails;
    materials: ApplicationMaterials;
    status: 'draft' | 'applied' | 'interviewing' | 'rejected' | 'offer';
}

const STORAGE_KEY = 'microlabs_job_application_assistant';

export default function JobApplicationAssistant() {
    const [resume, setResume] = useState('');
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const [materials, setMaterials] = useState<ApplicationMaterials | null>(null);
    const [savedApplications, setSavedApplications] = useState<SavedApplication[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [showResume, setShowResume] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { resume?: string; applications?: SavedApplication[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.resume) setResume(stored.resume);
            if (stored?.applications) setSavedApplications(stored.applications);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (newResume?: string, newApplications?: SavedApplication[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: {
                    resume: newResume ?? resume,
                    applications: newApplications ?? savedApplications
                }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const extractJobDetails = async () => {
        if (!context?.content) {
            showError('No page content available');
            return;
        }

        setIsExtracting(true);

        try {
            const prompt = `Extract job posting details from this page content:

${context.content.slice(0, 8000)}

Return a JSON object with:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Location (remote/city)",
  "type": "Full-time/Part-time/Contract",
  "salary": "Salary range if mentioned",
  "description": "Brief job description (2-3 sentences)",
  "requirements": ["Required qualification 1", "Required qualification 2", ...],
  "responsibilities": ["Key responsibility 1", "Key responsibility 2", ...],
  "benefits": ["Benefit 1", "Benefit 2", ...]
}

Extract all relevant information. If something isn't mentioned, use empty string or empty array.`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);
            setJobDetails(parsed);
            success('Job details extracted');
        } catch (err) {
            console.error('Failed to extract job details:', err);
            showError('Failed to extract job details');
        } finally {
            setIsExtracting(false);
        }
    };

    const generateMaterials = async () => {
        if (!jobDetails) {
            showError('Extract job details first');
            return;
        }

        if (!resume.trim()) {
            showError('Please add your resume/background first');
            return;
        }

        setIsGenerating(true);

        try {
            const prompt = `You are a career coach helping someone apply for a job. Generate tailored application materials.

**Job Details:**
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Location: ${jobDetails.location}
Description: ${jobDetails.description}
Requirements: ${jobDetails.requirements.join(', ')}
Responsibilities: ${jobDetails.responsibilities.join(', ')}

**Candidate Resume/Background:**
${resume}

Generate:
1. A personalized cover letter (3-4 paragraphs, professional but engaging)
2. Resume highlights that match this specific job (bullet points)
3. Interview preparation tips specific to this role
4. Keywords from the job that match the candidate's experience
5. Any skill gaps the candidate should address
6. Sample answers for common interview questions for this role

Return as JSON:
{
  "coverLetter": "Full cover letter text...",
  "resumeHighlights": ["Highlight 1", "Highlight 2", ...],
  "interviewTips": ["Tip 1", "Tip 2", ...],
  "keywordMatches": ["keyword1", "keyword2", ...],
  "skillGaps": ["Gap 1", "Gap 2", ...],
  "customAnswers": [
    {"question": "Why do you want to work here?", "answer": "..."},
    {"question": "Tell me about a relevant experience", "answer": "..."}
  ]
}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);
            setMaterials(parsed);

            // Save application
            const newApp: SavedApplication = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                jobDetails,
                materials: parsed,
                status: 'draft'
            };
            const updated = [newApp, ...savedApplications].slice(0, 20);
            setSavedApplications(updated);
            saveData(undefined, updated);

            success('Application materials generated');
        } catch (err) {
            console.error('Failed to generate materials:', err);
            showError('Failed to generate materials');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
            success('Copied to clipboard');
        } catch (err) {
            showError('Failed to copy');
        }
    };

    const exportMaterials = () => {
        if (!jobDetails || !materials) return;

        const markdown = `# Job Application Materials

## Position
**${jobDetails.title}** at **${jobDetails.company}**
${jobDetails.location} | ${jobDetails.type}
${jobDetails.salary ? `Salary: ${jobDetails.salary}` : ''}

---

## Cover Letter

${materials.coverLetter}

---

## Resume Highlights for This Role

${materials.resumeHighlights.map(h => `- ${h}`).join('\n')}

---

## Keywords to Emphasize

${materials.keywordMatches.join(', ')}

---

## Interview Preparation

### Tips
${materials.interviewTips.map(t => `- ${t}`).join('\n')}

### Sample Answers
${materials.customAnswers.map(qa => `**Q: ${qa.question}**\n${qa.answer}\n`).join('\n')}

---

## Skill Gaps to Address

${materials.skillGaps.map(g => `- ${g}`).join('\n')}

---
Generated by MicroLabs Job Application Assistant
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `application-${jobDetails.company.replace(/\s+/g, '-')}-${jobDetails.title.replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        success('Materials exported');
    };

    const updateResume = (value: string) => {
        setResume(value);
        saveData(value);
    };

    const loadSavedApplication = (app: SavedApplication) => {
        setJobDetails(app.jobDetails);
        setMaterials(app.materials);
        setShowHistory(false);
    };

    return (
        <div className="space-y-6">
            {/* Resume Section */}
            <div className="card p-4 space-y-3">
                <button
                    onClick={() => setShowResume(!showResume)}
                    className="w-full flex items-center justify-between"
                >
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <FileText size={14} className="text-blue-400" />
                        Your Background/Resume
                    </h3>
                    <div className="flex items-center gap-2">
                        {resume && <span className="text-[10px] text-green-400">Saved</span>}
                        {showResume ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                </button>

                {showResume && (
                    <textarea
                        value={resume}
                        onChange={(e) => updateResume(e.target.value)}
                        placeholder="Paste your resume, skills, experience, and background here. This will be used to personalize all your applications..."
                        className="w-full h-40 text-xs bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none"
                    />
                )}
            </div>

            {/* Extract Job Button */}
            <button
                onClick={extractJobDetails}
                disabled={isExtracting || !context?.content}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {isExtracting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Extracting Job Details...
                    </>
                ) : (
                    <>
                        <Briefcase size={16} />
                        Extract Job from This Page
                    </>
                )}
            </button>

            {/* Job Details */}
            {jobDetails && (
                <div className="card p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Building2 size={20} className="text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold">{jobDetails.title}</h3>
                            <p className="text-sm text-slate-400">{jobDetails.company}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-slate-800 rounded flex items-center gap-1">
                            <MapPin size={12} /> {jobDetails.location}
                        </span>
                        <span className="px-2 py-1 bg-slate-800 rounded flex items-center gap-1">
                            <Clock size={12} /> {jobDetails.type}
                        </span>
                        {jobDetails.salary && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded flex items-center gap-1">
                                <DollarSign size={12} /> {jobDetails.salary}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-300">{jobDetails.description}</p>

                    {jobDetails.requirements.length > 0 && (
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Requirements</h4>
                            <ul className="text-xs space-y-1">
                                {jobDetails.requirements.slice(0, 5).map((req, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-300">
                                        <Target size={10} className="text-blue-400 mt-1 flex-shrink-0" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={generateMaterials}
                        disabled={isGenerating || !resume.trim()}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating Materials...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Application Materials
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Generated Materials */}
            {materials && (
                <div className="space-y-4">
                    {/* Cover Letter */}
                    <div className="card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <FileText size={14} className="text-purple-400" />
                                Cover Letter
                            </h3>
                            <button
                                onClick={() => copyToClipboard(materials.coverLetter, 'cover')}
                                className="btn-secondary text-xs flex items-center gap-1"
                            >
                                {copiedField === 'cover' ? <Check size={12} /> : <Copy size={12} />}
                                {copiedField === 'cover' ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-3 rounded-lg max-h-64 overflow-y-auto">
                            {materials.coverLetter}
                        </div>
                    </div>

                    {/* Resume Highlights */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Star size={14} className="text-yellow-400" />
                            Resume Highlights
                        </h3>
                        <ul className="space-y-2">
                            {materials.resumeHighlights.map((highlight, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                    {highlight}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Keywords */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Target size={14} className="text-green-400" />
                            Keywords Match
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {materials.keywordMatches.map((keyword, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Skill Gaps */}
                    {materials.skillGaps.length > 0 && (
                        <div className="card p-4 space-y-3">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <GraduationCap size={14} className="text-orange-400" />
                                Skills to Develop
                            </h3>
                            <ul className="space-y-1">
                                {materials.skillGaps.map((gap, i) => (
                                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                        {gap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Interview Prep */}
                    <div className="card p-4 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Sparkles size={14} className="text-blue-400" />
                            Interview Preparation
                        </h3>

                        <div className="space-y-1">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Tips</h4>
                            <ul className="space-y-1">
                                {materials.interviewTips.map((tip, i) => (
                                    <li key={i} className="text-xs text-slate-300">• {tip}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Sample Answers</h4>
                            {materials.customAnswers.map((qa, i) => (
                                <div key={i} className="p-2 bg-slate-800/50 rounded-lg space-y-1">
                                    <p className="text-xs font-medium text-blue-400">{qa.question}</p>
                                    <p className="text-xs text-slate-300">{qa.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button onClick={exportMaterials} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                            <Download size={14} />
                            Export All
                        </button>
                        <SendToIntegrations
                            appId="job-application-assistant"
                            appName="Job Application Assistant"
                            data={{
                                job: jobDetails,
                                coverLetter: materials.coverLetter,
                                highlights: materials.resumeHighlights,
                                keywords: materials.keywordMatches
                            }}
                            source={{ url: context?.url }}
                        />
                    </div>
                </div>
            )}

            {/* Saved Applications */}
            {savedApplications.length > 0 && (
                <div className="card p-4 space-y-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between"
                    >
                        <h3 className="text-sm font-bold">Saved Applications ({savedApplications.length})</h3>
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showHistory && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {savedApplications.map(app => (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                                    onClick={() => loadSavedApplication(app)}
                                >
                                    <div className="text-xs">
                                        <div className="font-medium">{app.jobDetails.title}</div>
                                        <div className="text-slate-500">{app.jobDetails.company}</div>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {new Date(app.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!jobDetails && !isExtracting && (
                <div className="text-center py-8 text-slate-500">
                    <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Navigate to a job posting and click "Extract Job" to get started</p>
                </div>
            )}
        </div>
    );
}
