import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play,
    Square,
    Pause,
    RotateCcw,
    Download,
    Copy,
    Check,
    MousePointerClick,
    Type,
    Scroll,
    Navigation,
    Loader2,
    Trash2,
    ChevronDown,
    ChevronUp,
    FileText,
    Code,
    Sparkles,
    Eye,
    EyeOff,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';

interface RecordedAction {
    id: string;
    type: 'click' | 'input' | 'scroll' | 'navigation' | 'select' | 'focus' | 'keypress';
    timestamp: number;
    target: {
        tagName: string;
        id?: string;
        className?: string;
        text?: string;
        selector?: string;
        type?: string;
        name?: string;
        placeholder?: string;
    };
    value?: string;
    position?: { x: number; y: number };
    url?: string;
    description?: string;
}

interface WorkflowStep {
    step: number;
    action: string;
    element: string;
    value?: string;
    notes?: string;
}

const WorkflowRecorderApp: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { success, info, warning } = useToast();

    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
    const [workflowDocument, setWorkflowDocument] = useState<string>('');
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [expandedAction, setExpandedAction] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState<'markdown' | 'code' | 'steps'>('steps');
    const [generating, setGenerating] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [copied, setCopied] = useState(false);
    const recordingStartTime = useRef<number>(0);

    // Message listener for recorded actions from content script
    useEffect(() => {
        const handleMessage = (message: any, sender: any, sendResponse: any) => {
            if (message.type === 'WORKFLOW_ACTION' && isRecording && !isPaused) {
                const action: RecordedAction = {
                    id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now() - recordingStartTime.current,
                    ...message.action
                };
                setRecordedActions(prev => [...prev, action]);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener(handleMessage);
            return () => chrome.runtime.onMessage.removeListener(handleMessage);
        }
    }, [isRecording, isPaused]);

    const startRecording = async () => {
        recordingStartTime.current = Date.now();
        setRecordedActions([]);
        setWorkflowDocument('');
        setWorkflowSteps([]);
        setIsRecording(true);
        setIsPaused(false);

        // Inject content script to capture events
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { type: 'START_WORKFLOW_RECORDING' });
                success('Recording started');
            }
        } catch (err) {
            console.error('Failed to start recording:', err);
            warning('Could not inject recorder into page');
        }
    };

    const pauseRecording = () => {
        setIsPaused(!isPaused);
        info(isPaused ? 'Recording resumed' : 'Recording paused');
    };

    const stopRecording = async () => {
        setIsRecording(false);
        setIsPaused(false);

        // Stop content script recording
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { type: 'STOP_WORKFLOW_RECORDING' });
            }
        } catch (err) {
            console.error('Failed to stop recording:', err);
        }

        success(`Recorded ${recordedActions.length} actions`);
    };

    const clearRecording = () => {
        setRecordedActions([]);
        setWorkflowDocument('');
        setWorkflowSteps([]);
        setIsRecording(false);
        setIsPaused(false);
    };

    const generateWorkflow = async () => {
        if (recordedActions.length === 0) {
            warning('No actions recorded');
            return;
        }

        setGenerating(true);

        try {
            const actionsJson = JSON.stringify(recordedActions, null, 2);

            const prompt = `Analyze these recorded user actions and create a clear workflow document:

${actionsJson}

Page URL: ${context?.url || 'unknown'}
Page Title: ${context?.title || 'unknown'}

Create a structured workflow with:
1. A clear title for this workflow
2. Step-by-step instructions that anyone can follow
3. For each step: step number, action description, target element, any values/text entered
4. Notes about important elements or potential issues

Return as JSON with this structure:
{
  "title": "Workflow title",
  "description": "Brief description of what this workflow accomplishes",
  "steps": [
    {
      "step": 1,
      "action": "Click on the login button",
      "element": "Button with text 'Login' in the header",
      "value": null,
      "notes": "Wait for the login form to appear"
    }
  ],
  "totalTime": "estimated time in seconds",
  "complexity": "simple|moderate|complex"
}`;

            const result = await generateContent(
                prompt,
                `You are a workflow documentation specialist. Create clear, actionable workflow documentation from recorded user actions.
Focus on making steps understandable for non-technical users while including enough detail for automation.`,
                { jsonMode: true }
            );

            if (result?.steps) {
                setWorkflowSteps(result.steps);
            }

            // Also generate a markdown version
            const markdownPrompt = `Convert this workflow to a clean markdown document:
${JSON.stringify(result, null, 2)}

Include:
- A header with the workflow title
- Overview section
- Numbered step-by-step instructions
- Any notes or tips`;

            const markdown = await generateContent(
                markdownPrompt,
                'You are a technical writer. Create clean, readable markdown documentation.'
            );

            setWorkflowDocument(markdown);

        } catch (err) {
            console.error('Workflow generation error:', err);
            warning('Failed to generate workflow');
        } finally {
            setGenerating(false);
        }
    };

    const generateCode = async () => {
        if (recordedActions.length === 0) {
            warning('No actions recorded');
            return;
        }

        setGenerating(true);

        try {
            const actionsJson = JSON.stringify(recordedActions, null, 2);

            const result = await generateContent(
                `Convert these recorded actions into Playwright/Puppeteer automation code:

${actionsJson}

Generate clean, working JavaScript code using Playwright that:
1. Navigates to the page
2. Performs each action in sequence
3. Includes proper waits and error handling
4. Uses good selectors (prefer data-testid, id, then class)

Return the code as a code block.`,
                'You are an automation engineer. Write clean, robust browser automation code using modern best practices.'
            );

            setWorkflowDocument(result);
            setOutputFormat('code');

        } catch (err) {
            console.error('Code generation error:', err);
            warning('Failed to generate code');
        } finally {
            setGenerating(false);
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

    const downloadWorkflow = () => {
        const content = workflowDocument || JSON.stringify({ steps: workflowSteps, actions: recordedActions }, null, 2);
        const blob = new Blob([content], { type: outputFormat === 'code' ? 'application/javascript' : 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${Date.now()}.${outputFormat === 'code' ? 'js' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success('Workflow downloaded');
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'click': return <MousePointerClick size={12} />;
            case 'input': return <Type size={12} />;
            case 'scroll': return <Scroll size={12} />;
            case 'navigation': return <Navigation size={12} />;
            default: return <MousePointerClick size={12} />;
        }
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const removeAction = (id: string) => {
        setRecordedActions(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="btn-primary flex items-center gap-2 flex-1"
                    >
                        <Play size={16} />
                        Start Recording
                    </button>
                ) : (
                    <>
                        <button
                            onClick={pauseRecording}
                            className={`btn-secondary flex items-center gap-2 flex-1 ${isPaused ? 'bg-yellow-500/20 border-yellow-500/30' : ''}`}
                        >
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                            {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button
                            onClick={stopRecording}
                            className="btn-primary bg-red-500 flex items-center gap-2 flex-1"
                        >
                            <Square size={16} />
                            Stop
                        </button>
                    </>
                )}
                {recordedActions.length > 0 && (
                    <button
                        onClick={clearRecording}
                        className="btn-secondary p-3"
                        title="Clear recording"
                    >
                        <RotateCcw size={16} />
                    </button>
                )}
            </div>

            {/* Recording Status */}
            {isRecording && (
                <div className={`p-3 rounded-xl flex items-center gap-3 ${
                    isPaused
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                }`}>
                    <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-sm font-medium">
                        {isPaused ? 'Paused' : 'Recording'} - {recordedActions.length} action{recordedActions.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto">
                        <Clock size={12} className="inline mr-1" />
                        {formatTime(Date.now() - recordingStartTime.current)}
                    </span>
                </div>
            )}

            {/* Actions List */}
            {recordedActions.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300">
                            Recorded Actions ({recordedActions.length})
                        </h3>
                        <button
                            onClick={() => setShowRaw(!showRaw)}
                            className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
                        >
                            {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
                            {showRaw ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>

                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {recordedActions.map((action, idx) => (
                            <div
                                key={action.id}
                                className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/30 group"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-slate-700/50 flex items-center justify-center text-slate-400">
                                        {getActionIcon(action.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-slate-300 capitalize">
                                            {action.type}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {action.target.tagName.toLowerCase()}
                                            {action.target.id ? `#${action.target.id}` : ''}
                                            {action.value ? ` = "${action.value.substring(0, 20)}${action.value.length > 20 ? '...' : ''}"` : ''}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-600">
                                        {formatTime(action.timestamp)}
                                    </span>
                                    <button
                                        onClick={() => removeAction(action.id)}
                                        className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {showRaw && (
                                    <pre className="text-[9px] text-slate-600 mt-2 p-2 bg-slate-900/50 rounded overflow-x-auto">
                                        {JSON.stringify(action, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generate Workflow Buttons */}
            {recordedActions.length > 0 && !isRecording && (
                <div className="flex gap-2">
                    <button
                        onClick={generateWorkflow}
                        disabled={generating}
                        className="btn-primary flex items-center gap-2 flex-1"
                    >
                        {generating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        Generate Workflow
                    </button>
                    <button
                        onClick={generateCode}
                        disabled={generating}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Code size={16} />
                        As Code
                    </button>
                </div>
            )}

            {/* Workflow Steps Output */}
            {workflowSteps.length > 0 && outputFormat === 'steps' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300">Workflow Steps</h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => copyToClipboard(JSON.stringify(workflowSteps, null, 2))}
                                className="btn-secondary p-2"
                                title="Copy"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={downloadWorkflow}
                                className="btn-secondary p-2"
                                title="Download"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {workflowSteps.map((step, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {step.step}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-200 font-medium">{step.action}</p>
                                        <p className="text-xs text-slate-500 mt-1">{step.element}</p>
                                        {step.value && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Value: <span className="text-blue-400">"{step.value}"</span>
                                            </p>
                                        )}
                                        {step.notes && (
                                            <p className="text-xs text-slate-500 mt-2 italic">
                                                {step.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Markdown/Code Output */}
            {workflowDocument && (outputFormat === 'markdown' || outputFormat === 'code') && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300">
                            {outputFormat === 'code' ? 'Automation Code' : 'Workflow Document'}
                        </h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => copyToClipboard(workflowDocument)}
                                className="btn-secondary p-2"
                                title="Copy"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                                onClick={downloadWorkflow}
                                className="btn-secondary p-2"
                                title="Download"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                    </div>

                    <pre className={`p-4 rounded-xl text-xs overflow-auto max-h-[300px] ${
                        outputFormat === 'code'
                            ? 'bg-slate-900 text-green-400 font-mono'
                            : 'bg-slate-800/50 text-slate-300'
                    }`}>
                        {workflowDocument}
                    </pre>
                </div>
            )}

            {/* Empty State */}
            {recordedActions.length === 0 && !isRecording && (
                <div className="text-center py-12 text-slate-500">
                    <MousePointerClick size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No workflow recorded yet</p>
                    <p className="text-xs text-slate-600 mt-1">
                        Click "Start Recording" and perform actions on the page
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                    The recorder captures clicks, text inputs, and form interactions.
                    Navigate through your workflow on the page while recording.
                </p>
            </div>
        </div>
    );
};

export default WorkflowRecorderApp;
