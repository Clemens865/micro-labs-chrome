import React, { useState } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Calculator, Loader2, Sparkles, Copy, Check, Download,
    TrendingUp, BarChart3, PieChart, Table, Code, ChevronDown,
    ChevronUp, FileSpreadsheet, Sigma, Activity
} from 'lucide-react';

type AnalysisType = 'descriptive' | 'correlation' | 'regression' | 'distribution' | 'hypothesis';

interface AnalysisResult {
    type: AnalysisType;
    summary: string;
    statistics: Record<string, string | number>;
    insights: string[];
    pythonCode?: string;
    timestamp: number;
}

const StatisticalAnalyzer: React.FC = () => {
    const { generateContent, loading } = useGemini();
    const [data, setData] = useState('');
    const [analysisType, setAnalysisType] = useState<AnalysisType>('descriptive');
    const [customQuestion, setCustomQuestion] = useState('');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const analysisTypes: Record<AnalysisType, { label: string; icon: React.ReactNode; description: string }> = {
        descriptive: {
            label: 'Descriptive Stats',
            icon: <Sigma size={14} />,
            description: 'Mean, median, std dev, quartiles'
        },
        correlation: {
            label: 'Correlation',
            icon: <TrendingUp size={14} />,
            description: 'Relationships between variables'
        },
        regression: {
            label: 'Regression',
            icon: <Activity size={14} />,
            description: 'Linear/polynomial regression'
        },
        distribution: {
            label: 'Distribution',
            icon: <BarChart3 size={14} />,
            description: 'Normality, skewness, kurtosis'
        },
        hypothesis: {
            label: 'Hypothesis Test',
            icon: <Calculator size={14} />,
            description: 't-test, chi-square, ANOVA'
        }
    };

    const sampleData = `Name,Age,Salary,Experience,Rating
Alice,28,55000,3,4.2
Bob,35,75000,8,4.5
Carol,42,92000,15,4.8
David,31,62000,5,3.9
Eva,26,48000,2,4.1
Frank,45,105000,20,4.7
Grace,33,68000,7,4.3
Henry,29,52000,4,4.0
Iris,38,82000,12,4.6
Jack,24,45000,1,3.8`;

    const loadSampleData = () => {
        setData(sampleData);
    };

    const runAnalysis = async () => {
        if (!data.trim()) return;

        const prompts: Record<AnalysisType, string> = {
            descriptive: `Perform comprehensive descriptive statistical analysis on this data:

${data}

Calculate and provide:
1. **Basic Statistics**: Mean, Median, Mode for each numeric column
2. **Spread**: Standard Deviation, Variance, Range, IQR
3. **Percentiles**: 25th, 50th, 75th, 90th percentiles
4. **Data Quality**: Missing values, outliers (using IQR method)
5. **Summary Table**: Organized summary of all statistics

Also provide Python code using pandas and numpy to calculate these statistics.`,

            correlation: `Analyze correlations in this dataset:

${data}

Provide:
1. **Correlation Matrix**: Pearson correlation between all numeric variables
2. **Strong Correlations**: Highlight pairs with |r| > 0.5
3. **Interpretation**: What do these correlations mean?
4. **Visualization Suggestion**: Best way to visualize these relationships
5. **Python Code**: Using pandas, numpy, and seaborn for correlation analysis and heatmap`,

            regression: `Perform regression analysis on this data:

${data}

${customQuestion ? `Focus on: ${customQuestion}` : 'Identify the best target variable for prediction.'}

Provide:
1. **Model Selection**: Which variables to use as predictors and target
2. **Linear Regression Results**: Coefficients, R-squared, p-values
3. **Model Equation**: The regression equation
4. **Predictions**: Sample predictions with the model
5. **Diagnostics**: Residual analysis insights
6. **Python Code**: Using sklearn and statsmodels for regression`,

            distribution: `Analyze the distribution of variables in this data:

${data}

For each numeric column, provide:
1. **Distribution Type**: Normal, skewed, bimodal, etc.
2. **Normality Tests**: Shapiro-Wilk test interpretation
3. **Skewness & Kurtosis**: Values and interpretation
4. **Histogram Description**: Shape characteristics
5. **Outliers**: Identification using z-scores
6. **Python Code**: Using scipy.stats for distribution analysis`,

            hypothesis: `Perform hypothesis testing on this data:

${data}

${customQuestion ? `Test: ${customQuestion}` : 'Suggest and perform appropriate hypothesis tests.'}

Provide:
1. **Test Selection**: Which test is appropriate and why
2. **Hypotheses**: H0 and H1 clearly stated
3. **Test Statistics**: Calculated values
4. **P-value**: With interpretation at α=0.05
5. **Conclusion**: Statistical decision and practical meaning
6. **Python Code**: Using scipy.stats for the tests`
        };

        try {
            const response = await generateContent(
                prompts[analysisType],
                `You are a statistician and data scientist. Provide rigorous statistical analysis with accurate calculations.
Always include:
- Exact numerical results (not approximations when possible)
- Proper statistical terminology
- Practical interpretations
- Complete, runnable Python code`,
                { model: 'gemini-2.0-flash' }
            );

            const text = typeof response === 'string' ? response : JSON.stringify(response);

            // Extract Python code
            const codeMatch = text.match(/```python\n([\s\S]*?)```/);
            const pythonCode = codeMatch ? codeMatch[1] : undefined;

            // Extract key statistics (look for patterns like "Mean: 45.2" or "R²: 0.85")
            const statsMatches = text.matchAll(/(?:^|\n)\s*[-•*]?\s*\*?\*?([A-Za-z\s]+(?:²)?)\*?\*?:\s*([0-9.,\-+%]+)/gm);
            const statistics: Record<string, string | number> = {};
            for (const match of statsMatches) {
                const key = match[1].trim();
                const value = match[2].trim();
                if (key.length < 30) { // Reasonable key length
                    statistics[key] = value;
                }
            }

            // Extract insights
            const insightsMatch = text.match(/(?:insights?|findings?|conclusions?|interpretation):?\s*((?:[-•*]\s*.+\n?)+)/i);
            const insights = insightsMatch
                ? insightsMatch[1].split('\n').filter(l => l.trim().match(/^[-•*]/)).map(l => l.replace(/^[-•*]\s*/, '').trim())
                : [];

            setResult({
                type: analysisType,
                summary: text,
                statistics,
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
        const fullCode = `# Statistical Analysis - ${analysisTypes[result.type].label}
# Generated by MicroLabs AI

import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns

# Your data (paste your actual data here)
data = """
${data}
"""

# Load data
from io import StringIO
df = pd.read_csv(StringIO(data))

${result.pythonCode}
`;
        const blob = new Blob([fullCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statistical-analysis-${Date.now()}.py`;
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
                        background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(199 89% 48%) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calculator size={22} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>
                            Statistical Analyzer
                        </h3>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '2px' }}>
                            AI-powered statistical analysis
                        </p>
                    </div>
                </div>

                {/* Data Input */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)' }}>
                            Paste CSV or tabular data
                        </label>
                        <button
                            onClick={loadSampleData}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'hsl(217 91% 60% / 0.2)',
                                color: 'hsl(217 91% 70%)',
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Load Sample
                        </button>
                    </div>
                    <textarea
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        placeholder="Paste CSV data here...&#10;&#10;Example:&#10;Name,Value,Category&#10;A,100,Group1&#10;B,150,Group2"
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

                {/* Analysis Type */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', marginBottom: '6px', display: 'block' }}>
                        Analysis Type
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(Object.entries(analysisTypes) as [AnalysisType, typeof analysisTypes[AnalysisType]][]).map(([type, config]) => (
                            <button
                                key={type}
                                onClick={() => setAnalysisType(type)}
                                disabled={loading}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: analysisType === type
                                        ? '2px solid hsl(217 91% 60%)'
                                        : '1px solid hsl(222 47% 18%)',
                                    backgroundColor: analysisType === type
                                        ? 'hsl(217 91% 60% / 0.15)'
                                        : 'hsl(222 47% 8%)',
                                    color: analysisType === type
                                        ? 'hsl(217 91% 70%)'
                                        : 'hsl(215 20% 65%)',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {config.icon}
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Question */}
                {(analysisType === 'regression' || analysisType === 'hypothesis') && (
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            value={customQuestion}
                            onChange={(e) => setCustomQuestion(e.target.value)}
                            placeholder={
                                analysisType === 'regression'
                                    ? "e.g., Predict Salary based on Experience and Age"
                                    : "e.g., Is there a significant difference between Group A and B?"
                            }
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
                )}

                {/* Analyze Button */}
                <button
                    onClick={runAnalysis}
                    disabled={loading || !data.trim()}
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
                        background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(199 89% 48%) 100%)',
                        color: 'white',
                        opacity: (loading || !data.trim()) ? 0.5 : 1
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Running Analysis...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Run {analysisTypes[analysisType].label}
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
                    border: '1px solid hsl(217 91% 60% / 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Calculator size={16} style={{ color: 'hsl(217 91% 60%)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(217 91% 70%)' }}>
                            {analysisTypes[result.type].label} Results
                        </span>
                    </div>

                    {/* Key Statistics */}
                    {Object.keys(result.statistics).length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            {Object.entries(result.statistics).slice(0, 9).map(([key, value]) => (
                                <div
                                    key={key}
                                    style={{
                                        padding: '10px',
                                        backgroundColor: 'hsl(222 47% 8%)',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(217 91% 70%)' }}>
                                        {value}
                                    </p>
                                    <p style={{ fontSize: '9px', color: 'hsl(215 20% 50%)', marginTop: '2px' }}>
                                        {key}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Insights */}
                    {result.insights.length > 0 && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'hsl(217 91% 60% / 0.1)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(217 91% 70%)', marginBottom: '8px' }}>
                                Key Insights
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                {result.insights.slice(0, 5).map((insight, idx) => (
                                    <li key={idx} style={{ fontSize: '12px', color: 'hsl(215 20% 80%)', marginBottom: '4px' }}>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Full Analysis */}
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
                            margin: 0,
                            lineHeight: 1.5
                        }}>
                            {result.summary.replace(/```python[\s\S]*?```/g, '[Python code available below]')}
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
                    <Calculator size={40} style={{ color: 'hsl(215 20% 30%)', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 55%)', marginBottom: '6px' }}>
                        Statistical Analysis Made Easy
                    </p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', maxWidth: '280px', margin: '0 auto' }}>
                        Paste any dataset and get descriptive stats, correlations, regression analysis, and hypothesis tests with Python code
                    </p>
                </div>
            )}

            {/* Info */}
            <div style={{
                padding: '12px',
                backgroundColor: 'hsl(217 91% 60% / 0.1)',
                borderRadius: '10px',
                border: '1px solid hsl(217 91% 60% / 0.3)'
            }}>
                <div style={{ fontSize: '11px', color: 'hsl(217 91% 80%)', lineHeight: 1.5 }}>
                    <strong>AI Statistical Analysis:</strong> Get professional-grade statistical analysis with
                    Python code using pandas, numpy, scipy, and scikit-learn.
                </div>
            </div>
        </div>
    );
};

export default StatisticalAnalyzer;
