import React, { useState } from 'react';
import { usePageContext } from '../../hooks/usePageContext';
import { useGemini } from '../../hooks/useGemini';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
    Users,
    Loader2,
    Mail,
    Phone,
    Linkedin,
    Twitter,
    Globe,
    MapPin,
    Building,
    Building2,
    Copy,
    Check,
    ExternalLink,
    Download,
    RotateCcw,
    Briefcase,
    GraduationCap,
    Calendar,
    TrendingUp,
    Target,
    Sparkles,
    UserCircle,
    Factory,
    Hash,
    MessageSquare,
    Star,
    Zap,
    Languages,
    Heart,
    Handshake,
    Blend
} from 'lucide-react';

interface LinkedInProfile {
    type: 'profile';
    name: string;
    headline?: string;
    currentCompany?: string;
    currentRole?: string;
    location?: string;
    connectionDegree?: string;
    about?: string;
    experience?: {
        company: string;
        role: string;
        duration?: string;
        current?: boolean;
    }[];
    education?: {
        school: string;
        degree?: string;
        field?: string;
    }[];
    skills?: string[];
    profileUrl: string;
}

interface LinkedInCompany {
    type: 'company';
    name: string;
    tagline?: string;
    industry?: string;
    companySize?: string;
    headquarters?: string;
    founded?: string;
    specialties?: string[];
    about?: string;
    website?: string;
    employeeCount?: string;
    followerCount?: string;
    companyUrl: string;
}

interface GenericLead {
    type: 'generic';
    emails: string[];
    phones: string[];
    socialLinks: Record<string, string>;
    companyInfo: {
        name?: string;
        address?: string;
        website?: string;
    };
    people: {
        name: string;
        role?: string;
        email?: string;
        linkedin?: string;
    }[];
}

interface OutreachTemplate {
    linkedInMessage: string;
    emailSubject: string;
    emailBody: string;
}

interface AIInsights {
    leadScore: number;
    scoreReason: string;
    outreachSuggestions: string[];
    talkingPoints: string[];
    potentialPainPoints: string[];
    detectedLanguage?: string;
    commonGround?: string[];
    outreachTemplates?: {
        professional?: OutreachTemplate;
        personal?: OutreachTemplate;
        combined?: OutreachTemplate;
    };
}

type OutreachStyle = 'professional' | 'personal' | 'combined';

// Language mapping from location
const LOCATION_LANGUAGE_MAP: Record<string, { code: string; name: string }> = {
    // German speaking
    'germany': { code: 'de', name: 'German' },
    'deutschland': { code: 'de', name: 'German' },
    'austria': { code: 'de', name: 'German' },
    'österreich': { code: 'de', name: 'German' },
    'switzerland': { code: 'de', name: 'German' },
    'schweiz': { code: 'de', name: 'German' },
    'munich': { code: 'de', name: 'German' },
    'berlin': { code: 'de', name: 'German' },
    'hamburg': { code: 'de', name: 'German' },
    'frankfurt': { code: 'de', name: 'German' },
    'vienna': { code: 'de', name: 'German' },
    'wien': { code: 'de', name: 'German' },
    'zurich': { code: 'de', name: 'German' },
    'zürich': { code: 'de', name: 'German' },
    // French speaking
    'france': { code: 'fr', name: 'French' },
    'paris': { code: 'fr', name: 'French' },
    'lyon': { code: 'fr', name: 'French' },
    'marseille': { code: 'fr', name: 'French' },
    'belgium': { code: 'fr', name: 'French' },
    'brussels': { code: 'fr', name: 'French' },
    // Spanish speaking
    'spain': { code: 'es', name: 'Spanish' },
    'españa': { code: 'es', name: 'Spanish' },
    'madrid': { code: 'es', name: 'Spanish' },
    'barcelona': { code: 'es', name: 'Spanish' },
    'mexico': { code: 'es', name: 'Spanish' },
    'argentina': { code: 'es', name: 'Spanish' },
    'colombia': { code: 'es', name: 'Spanish' },
    'chile': { code: 'es', name: 'Spanish' },
    // Italian
    'italy': { code: 'it', name: 'Italian' },
    'italia': { code: 'it', name: 'Italian' },
    'rome': { code: 'it', name: 'Italian' },
    'milan': { code: 'it', name: 'Italian' },
    'milano': { code: 'it', name: 'Italian' },
    // Portuguese
    'portugal': { code: 'pt', name: 'Portuguese' },
    'brazil': { code: 'pt', name: 'Portuguese' },
    'brasil': { code: 'pt', name: 'Portuguese' },
    // Dutch
    'netherlands': { code: 'nl', name: 'Dutch' },
    'amsterdam': { code: 'nl', name: 'Dutch' },
    'rotterdam': { code: 'nl', name: 'Dutch' },
    // Polish
    'poland': { code: 'pl', name: 'Polish' },
    'warsaw': { code: 'pl', name: 'Polish' },
    'krakow': { code: 'pl', name: 'Polish' },
    // Default English
    'usa': { code: 'en', name: 'English' },
    'united states': { code: 'en', name: 'English' },
    'uk': { code: 'en', name: 'English' },
    'united kingdom': { code: 'en', name: 'English' },
    'london': { code: 'en', name: 'English' },
    'new york': { code: 'en', name: 'English' },
    'san francisco': { code: 'en', name: 'English' },
    'california': { code: 'en', name: 'English' },
    'canada': { code: 'en', name: 'English' },
    'australia': { code: 'en', name: 'English' },
};

type ExtractedLead = LinkedInProfile | LinkedInCompany | GenericLead;

const LeadExtractor: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading: aiLoading } = useGemini();
    const { profile, hasProfile, getProfileContext, getOutreachContext, getPersonalContext } = useUserProfile();
    const [lead, setLead] = useState<ExtractedLead | null>(null);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'insights'>('info');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
    const [selectedOutreachStyle, setSelectedOutreachStyle] = useState<OutreachStyle>('professional');
    const [activeOutreachTab, setActiveOutreachTab] = useState<OutreachStyle>('professional');

    // Detect language from location
    const detectLanguage = (location?: string): { code: string; name: string } => {
        if (!location) return { code: 'en', name: 'English' };
        const locationLower = location.toLowerCase();
        for (const [key, value] of Object.entries(LOCATION_LANGUAGE_MAP)) {
            if (locationLower.includes(key)) {
                return value;
            }
        }
        return { code: 'en', name: 'English' };
    };

    // Get language options
    const languageOptions = [
        { code: 'auto', name: 'Auto-detect' },
        { code: 'en', name: 'English' },
        { code: 'de', name: 'German' },
        { code: 'fr', name: 'French' },
        { code: 'es', name: 'Spanish' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' },
    ];

    const isLinkedInUrl = (url: string) => url.includes('linkedin.com');
    const isLinkedInProfile = (url: string) => url.includes('linkedin.com/in/');
    const isLinkedInCompany = (url: string) => url.includes('linkedin.com/company/');

    const extractLeads = async () => {
        setLoading(true);
        setAiInsights(null);
        const url = context?.url || '';

        if (isLinkedInProfile(url)) {
            setStatus('Extracting LinkedIn profile...');
            await extractLinkedInProfile();
        } else if (isLinkedInCompany(url)) {
            setStatus('Extracting company information...');
            await extractLinkedInCompany();
        } else {
            setStatus('Scanning page for contact information...');
            await extractGenericLead();
        }

        setLoading(false);
    };

    const extractLinkedInProfile = async () => {
        try {
            const result = await new Promise<LinkedInProfile>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (!tab?.id) {
                        resolve(emptyProfile());
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const getText = (selector: string) => {
                                const el = document.querySelector(selector);
                                return el?.textContent?.trim() || '';
                            };

                            const getTexts = (selector: string) => {
                                return Array.from(document.querySelectorAll(selector))
                                    .map(el => el.textContent?.trim())
                                    .filter(Boolean) as string[];
                            };

                            // LinkedIn Profile selectors (may need updates as LinkedIn changes)
                            const name = getText('h1') ||
                                getText('[data-anonymize="person-name"]') ||
                                getText('.text-heading-xlarge');

                            const headline = getText('.text-body-medium') ||
                                getText('[data-anonymize="headline"]');

                            // Extract current position
                            const experienceSection = document.querySelector('#experience') ||
                                document.querySelector('[id*="experience"]');
                            let currentCompany = '';
                            let currentRole = '';

                            if (experienceSection) {
                                const firstExperience = experienceSection.closest('section')?.querySelector('li');
                                if (firstExperience) {
                                    const roleEl = firstExperience.querySelector('.t-bold span');
                                    const companyEl = firstExperience.querySelector('.t-normal span');
                                    currentRole = roleEl?.textContent?.trim() || '';
                                    currentCompany = companyEl?.textContent?.trim().split('·')[0].trim() || '';
                                }
                            }

                            // Fallback: parse from headline
                            if (!currentCompany && headline.includes(' at ')) {
                                const parts = headline.split(' at ');
                                currentRole = parts[0].trim();
                                currentCompany = parts[1]?.trim() || '';
                            }

                            const location = getText('.text-body-small[data-anonymize="location"]') ||
                                getText('[data-anonymize="location"]') ||
                                document.querySelector('.pv-text-details__left-panel')?.querySelectorAll('span')[1]?.textContent?.trim() || '';

                            // Connection degree
                            const connectionDegree = getText('.dist-value') ||
                                getText('[class*="distance"]') ||
                                (document.body.innerText.match(/(1st|2nd|3rd|Following)/)?.[0] || '');

                            // About section
                            const aboutSection = document.querySelector('#about');
                            const about = aboutSection?.closest('section')?.querySelector('.inline-show-more-text')?.textContent?.trim() ||
                                getText('[data-anonymize="about"]') || '';

                            // Experience
                            const experience: any[] = [];
                            const expItems = document.querySelectorAll('#experience ~ .pvs-list__outer-container li.artdeco-list__item');
                            expItems.forEach((item, i) => {
                                if (i < 5) {
                                    const role = item.querySelector('.t-bold span')?.textContent?.trim() || '';
                                    const company = item.querySelector('.t-normal span')?.textContent?.trim().split('·')[0].trim() || '';
                                    const duration = item.querySelector('.t-normal.t-black--light span')?.textContent?.trim() || '';
                                    if (role || company) {
                                        experience.push({ role, company, duration, current: i === 0 });
                                    }
                                }
                            });

                            // Education
                            const education: any[] = [];
                            const eduItems = document.querySelectorAll('#education ~ .pvs-list__outer-container li.artdeco-list__item');
                            eduItems.forEach((item, i) => {
                                if (i < 3) {
                                    const school = item.querySelector('.t-bold span')?.textContent?.trim() || '';
                                    const degree = item.querySelector('.t-normal span')?.textContent?.trim() || '';
                                    if (school) {
                                        education.push({ school, degree });
                                    }
                                }
                            });

                            // Skills
                            const skills = getTexts('#skills ~ .pvs-list__outer-container .t-bold span').slice(0, 10);

                            return {
                                type: 'profile' as const,
                                name,
                                headline,
                                currentCompany,
                                currentRole,
                                location,
                                connectionDegree,
                                about: about.substring(0, 500),
                                experience,
                                education,
                                skills,
                                profileUrl: window.location.href
                            };
                        }
                    }, (results) => {
                        if (results?.[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            resolve(emptyProfile());
                        }
                    });
                });
            });

            setLead(result);
            setStatus('');
        } catch (err) {
            console.error('LinkedIn profile extraction error:', err);
            setStatus('Extraction failed. Please try again.');
        }
    };

    const extractLinkedInCompany = async () => {
        try {
            const result = await new Promise<LinkedInCompany>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (!tab?.id) {
                        resolve(emptyCompany());
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const getText = (selector: string) => {
                                const el = document.querySelector(selector);
                                return el?.textContent?.trim() || '';
                            };

                            // Company name
                            const name = getText('h1') ||
                                getText('[data-anonymize="company-name"]') ||
                                getText('.org-top-card-summary__title');

                            // Tagline
                            const tagline = getText('.org-top-card-summary__tagline') ||
                                getText('.break-words');

                            // Parse company details from the sidebar/about
                            const pageText = document.body.innerText;

                            // Industry
                            const industryMatch = pageText.match(/Industry\s*\n([^\n]+)/);
                            const industry = industryMatch?.[1]?.trim() || '';

                            // Company size
                            const sizeMatch = pageText.match(/Company size\s*\n([^\n]+)/);
                            const companySize = sizeMatch?.[1]?.trim() || '';

                            // Headquarters
                            const hqMatch = pageText.match(/Headquarters\s*\n([^\n]+)/);
                            const headquarters = hqMatch?.[1]?.trim() || '';

                            // Founded
                            const foundedMatch = pageText.match(/Founded\s*\n(\d{4})/);
                            const founded = foundedMatch?.[1] || '';

                            // Website
                            const websiteLink = document.querySelector('a[href*="company-website"]') ||
                                document.querySelector('[data-control-name="visit_company_website"]');
                            const website = websiteLink?.getAttribute('href') || '';

                            // Specialties
                            const specialtiesMatch = pageText.match(/Specialties\s*\n([^\n]+)/);
                            const specialties = specialtiesMatch?.[1]?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

                            // Follower count
                            const followerMatch = pageText.match(/([\d,]+)\s*followers?/i);
                            const followerCount = followerMatch?.[1] || '';

                            // Employee count on LinkedIn
                            const employeeMatch = pageText.match(/([\d,]+)\s*employees?\s*on\s*LinkedIn/i);
                            const employeeCount = employeeMatch?.[1] || '';

                            // About
                            const aboutSection = document.querySelector('.org-page-details-module__card-spacing p');
                            const about = aboutSection?.textContent?.trim().substring(0, 500) || '';

                            return {
                                type: 'company' as const,
                                name,
                                tagline,
                                industry,
                                companySize,
                                headquarters,
                                founded,
                                specialties,
                                about,
                                website,
                                employeeCount,
                                followerCount,
                                companyUrl: window.location.href
                            };
                        }
                    }, (results) => {
                        if (results?.[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            resolve(emptyCompany());
                        }
                    });
                });
            });

            setLead(result);
            setStatus('');
        } catch (err) {
            console.error('LinkedIn company extraction error:', err);
            setStatus('Extraction failed. Please try again.');
        }
    };

    const extractGenericLead = async () => {
        try {
            const result = await new Promise<GenericLead>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (!tab?.id) {
                        resolve(emptyGeneric());
                        return;
                    }

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const text = document.body.innerText;

                            // Email extraction
                            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                            const emails = [...new Set(text.match(emailRegex) || [])].filter(email =>
                                !email.includes('example') &&
                                !email.includes('test@') &&
                                !email.endsWith('.png') &&
                                !email.endsWith('.jpg')
                            );

                            // Phone extraction
                            const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
                            const phones = [...new Set(text.match(phoneRegex) || [])].filter(phone =>
                                phone.replace(/\D/g, '').length >= 10 &&
                                phone.replace(/\D/g, '').length <= 15
                            );

                            // Social links
                            const socialLinks: Record<string, string> = {};
                            const allLinks = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '');

                            allLinks.forEach(href => {
                                if (href.includes('linkedin.com/') && !socialLinks.linkedin) socialLinks.linkedin = href;
                                if ((href.includes('twitter.com/') || href.includes('x.com/')) && !socialLinks.twitter) socialLinks.twitter = href;
                                if (href.includes('facebook.com/') && !socialLinks.facebook) socialLinks.facebook = href;
                            });

                            // Company info
                            const companyInfo: any = {};
                            const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
                            companyInfo.name = ogSiteName || document.title.split('|')[0].trim();

                            const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
                            companyInfo.website = canonical || window.location.origin;

                            // People
                            const people: any[] = [];
                            const teamCards = document.querySelectorAll('[class*="team"], [class*="member"], [class*="person"]');
                            teamCards.forEach(card => {
                                const name = card.querySelector('h2, h3, h4, [class*="name"]')?.textContent?.trim();
                                const role = card.querySelector('[class*="title"], [class*="role"]')?.textContent?.trim();
                                if (name && name.length < 50) {
                                    people.push({ name, role: role && role.length < 100 ? role : undefined });
                                }
                            });

                            return {
                                type: 'generic' as const,
                                emails,
                                phones,
                                socialLinks,
                                companyInfo,
                                people: people.slice(0, 10)
                            };
                        }
                    }, (results) => {
                        if (results?.[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            resolve(emptyGeneric());
                        }
                    });
                });
            });

            setLead(result);
            setStatus('');
        } catch (err) {
            console.error('Generic extraction error:', err);
            setStatus('Extraction failed. Please try again.');
        }
    };

    const generateAIInsights = async () => {
        if (!lead) return;

        // Determine language
        let targetLanguage = 'English';
        let detectedLang = { code: 'en', name: 'English' };

        if (lead.type === 'profile' && lead.location) {
            detectedLang = detectLanguage(lead.location);
        } else if (lead.type === 'company' && lead.headquarters) {
            detectedLang = detectLanguage(lead.headquarters);
        }

        if (selectedLanguage === 'auto') {
            targetLanguage = detectedLang.name;
        } else {
            const langOption = languageOptions.find(l => l.code === selectedLanguage);
            targetLanguage = langOption?.name || 'English';
        }

        // Build sender context from user profile
        const outreachCtx = getOutreachContext();
        const personalCtx = getPersonalContext();

        const senderProfessionalContext = hasProfile && outreachCtx ? `
=== SENDER PROFESSIONAL INFORMATION ===
Name: ${outreachCtx.senderName || 'Not provided'}
Role: ${outreachCtx.senderRole || 'Not provided'}
Company: ${outreachCtx.companyName || 'Not provided'}
Industry: ${outreachCtx.companyIndustry || 'Not provided'}
Product/Service: ${outreachCtx.productService || 'Not provided'}
Value Proposition: ${outreachCtx.valueProposition || 'Not provided'}
` : '';

        const senderPersonalContext = hasProfile && personalCtx ? `
=== SENDER PERSONAL BACKGROUND ===
${personalCtx}
` : '';

        // Determine which outreach styles to generate based on available profile info
        const hasPersonalInfo = personalCtx && personalCtx.length > 20;
        const stylesToGenerate = hasPersonalInfo
            ? ['professional', 'personal', 'combined']
            : ['professional'];

        let prompt = '';

        if (lead.type === 'profile') {
            prompt = `Analyze this LinkedIn profile for sales/business development purposes.

${senderProfessionalContext}
${hasPersonalInfo ? senderPersonalContext : ''}
=== LEAD PROFILE ===
Name: ${lead.name}
Headline: ${lead.headline || 'N/A'}
Current Role: ${lead.currentRole || 'N/A'}
Current Company: ${lead.currentCompany || 'N/A'}
Location: ${lead.location || 'N/A'}
About: ${lead.about || 'N/A'}
Experience: ${lead.experience?.map(e => `${e.role} at ${e.company}`).join(', ') || 'N/A'}
Skills: ${lead.skills?.join(', ') || 'N/A'}

=== LANGUAGE INSTRUCTION ===
Generate ALL outreach templates in ${targetLanguage}. The lead is located in ${lead.location || 'unknown location'}.

=== OUTPUT REQUIREMENTS ===
Provide a JSON response with:
{
  "leadScore": (1-100 based on seniority, decision-making potential${hasProfile ? ', and fit with sender\'s target audience' : ''}),
  "scoreReason": "brief explanation of score",
  "detectedLanguage": "${targetLanguage}",
  "outreachSuggestions": ["3 personalized outreach angle suggestions"],
  "talkingPoints": ["3 conversation starters based on their background"],
  "potentialPainPoints": ["3 likely challenges based on their role/industry"],
  ${hasPersonalInfo ? `"commonGround": ["2-3 potential personal connections based on shared interests, skills, education, or experiences between sender and lead"],` : ''}
  "outreachTemplates": {
    "professional": {
      "linkedInMessage": "A professional LinkedIn connection request in ${targetLanguage} (under 300 characters). Focus on business value and their role.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A professional email subject line in ${targetLanguage}",
      "emailBody": "A professional cold email in ${targetLanguage} (3-4 sentences). Focus on business pain points and value proposition.${hasProfile ? ' Sign with sender\'s name and company.' : ''}"
    }${hasPersonalInfo ? `,
    "personal": {
      "linkedInMessage": "A personal, warm LinkedIn message in ${targetLanguage} (under 300 characters). Reference shared interests, background, or common ground. More casual tone.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A personal, intriguing email subject line in ${targetLanguage}",
      "emailBody": "A personal, relationship-focused email in ${targetLanguage} (3-4 sentences). Start with common ground or shared interest, then naturally transition to how you might help.${hasProfile ? ' Sign with just first name.' : ''}"
    },
    "combined": {
      "linkedInMessage": "A hybrid LinkedIn message in ${targetLanguage} (under 300 characters). Blend personal connection with professional value.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A compelling hybrid email subject in ${targetLanguage}",
      "emailBody": "A balanced email in ${targetLanguage} (4-5 sentences). Start with personal connection, transition to business value, end with soft CTA.${hasProfile ? ' Sign with full name and company.' : ''}"
    }` : ''}
  }
}`;
        } else if (lead.type === 'company') {
            prompt = `Analyze this company for sales/business development purposes.

${senderProfessionalContext}
${hasPersonalInfo ? senderPersonalContext : ''}
=== COMPANY PROFILE ===
Company: ${lead.name}
Industry: ${lead.industry || 'N/A'}
Size: ${lead.companySize || 'N/A'}
Headquarters: ${lead.headquarters || 'N/A'}
Founded: ${lead.founded || 'N/A'}
Specialties: ${lead.specialties?.join(', ') || 'N/A'}
About: ${lead.about || 'N/A'}

=== LANGUAGE INSTRUCTION ===
Generate ALL outreach templates in ${targetLanguage}. The company is headquartered in ${lead.headquarters || 'unknown location'}.

=== OUTPUT REQUIREMENTS ===
Provide a JSON response with:
{
  "leadScore": (1-100 based on company size, industry fit, growth potential${hasProfile ? ', and alignment with sender\'s target market' : ''}),
  "scoreReason": "brief explanation of score",
  "detectedLanguage": "${targetLanguage}",
  "outreachSuggestions": ["3 ways to approach this company"],
  "talkingPoints": ["3 industry-relevant topics to discuss"],
  "potentialPainPoints": ["3 common challenges for companies like this"],
  "outreachTemplates": {
    "professional": {
      "linkedInMessage": "A professional LinkedIn message in ${targetLanguage} for reaching someone at this company (under 300 characters). Reference something specific about the company.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A professional email subject line in ${targetLanguage}",
      "emailBody": "A professional cold email in ${targetLanguage} (3-4 sentences). Reference their industry/specialties and include a clear CTA.${hasProfile ? ' Sign with sender\'s name and company.' : ''}"
    }${hasPersonalInfo ? `,
    "personal": {
      "linkedInMessage": "A warm, personal LinkedIn message in ${targetLanguage} (under 300 characters). Find a personal angle related to the company's mission or industry.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A personal, intriguing email subject in ${targetLanguage}",
      "emailBody": "A personal email in ${targetLanguage} (3-4 sentences). Connect on values or mission, then mention how you might collaborate.${hasProfile ? ' Sign with just first name.' : ''}"
    },
    "combined": {
      "linkedInMessage": "A hybrid LinkedIn message in ${targetLanguage} (under 300 characters). Personal opener with professional substance.${hasProfile ? ' Sign with sender\'s first name.' : ''}",
      "emailSubject": "A hybrid email subject in ${targetLanguage}",
      "emailBody": "A balanced email in ${targetLanguage} (4-5 sentences). Personal connection to company values, then business opportunity.${hasProfile ? ' Sign with full name and company.' : ''}"
    }` : ''}
  }
}`;
        } else {
            return; // No AI insights for generic leads
        }

        try {
            const result = await generateContent(
                prompt,
                'You are an expert B2B sales analyst. Provide actionable insights for business development.',
                { jsonMode: true }
            );

            // Validate and normalize the response
            const insights: AIInsights = {
                leadScore: typeof result?.leadScore === 'number' ? result.leadScore : 50,
                scoreReason: result?.scoreReason || 'Unable to determine score',
                outreachSuggestions: Array.isArray(result?.outreachSuggestions) ? result.outreachSuggestions : [],
                talkingPoints: Array.isArray(result?.talkingPoints) ? result.talkingPoints : [],
                potentialPainPoints: Array.isArray(result?.potentialPainPoints) ? result.potentialPainPoints : [],
                detectedLanguage: result?.detectedLanguage || targetLanguage,
                commonGround: Array.isArray(result?.commonGround) ? result.commonGround : undefined,
                outreachTemplates: result?.outreachTemplates ? {
                    professional: result.outreachTemplates.professional ? {
                        linkedInMessage: result.outreachTemplates.professional.linkedInMessage || '',
                        emailSubject: result.outreachTemplates.professional.emailSubject || '',
                        emailBody: result.outreachTemplates.professional.emailBody || ''
                    } : undefined,
                    personal: result.outreachTemplates.personal ? {
                        linkedInMessage: result.outreachTemplates.personal.linkedInMessage || '',
                        emailSubject: result.outreachTemplates.personal.emailSubject || '',
                        emailBody: result.outreachTemplates.personal.emailBody || ''
                    } : undefined,
                    combined: result.outreachTemplates.combined ? {
                        linkedInMessage: result.outreachTemplates.combined.linkedInMessage || '',
                        emailSubject: result.outreachTemplates.combined.emailSubject || '',
                        emailBody: result.outreachTemplates.combined.emailBody || ''
                    } : undefined
                } : undefined
            };

            setAiInsights(insights);
            setActiveTab('insights');
        } catch (err) {
            console.error('AI insights error:', err);
        }
    };

    const emptyProfile = (): LinkedInProfile => ({
        type: 'profile',
        name: '',
        profileUrl: ''
    });

    const emptyCompany = (): LinkedInCompany => ({
        type: 'company',
        name: '',
        companyUrl: ''
    });

    const emptyGeneric = (): GenericLead => ({
        type: 'generic',
        emails: [],
        phones: [],
        socialLinks: {},
        companyInfo: {},
        people: []
    });

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const exportLead = (format: 'csv' | 'json') => {
        if (!lead) return;

        if (format === 'json') {
            const data = JSON.stringify({ lead, insights: aiInsights }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lead-${Date.now()}.json`;
            a.click();
        } else {
            let rows: string[][] = [['Field', 'Value']];

            if (lead.type === 'profile') {
                rows = [
                    ['Field', 'Value'],
                    ['Name', lead.name],
                    ['Headline', lead.headline || ''],
                    ['Current Role', lead.currentRole || ''],
                    ['Current Company', lead.currentCompany || ''],
                    ['Location', lead.location || ''],
                    ['Profile URL', lead.profileUrl],
                    ['Skills', lead.skills?.join('; ') || ''],
                    ...(lead.experience?.map(e => ['Experience', `${e.role} at ${e.company}`]) || [])
                ];
            } else if (lead.type === 'company') {
                rows = [
                    ['Field', 'Value'],
                    ['Company Name', lead.name],
                    ['Industry', lead.industry || ''],
                    ['Size', lead.companySize || ''],
                    ['Headquarters', lead.headquarters || ''],
                    ['Website', lead.website || ''],
                    ['Founded', lead.founded || ''],
                    ['Followers', lead.followerCount || ''],
                    ['Employees on LinkedIn', lead.employeeCount || ''],
                    ['Specialties', lead.specialties?.join('; ') || '']
                ];
            }

            if (aiInsights) {
                rows.push(
                    ['Lead Score', aiInsights.leadScore.toString()],
                    ['Score Reason', aiInsights.scoreReason],
                    ...aiInsights.outreachSuggestions.map((s, i) => [`Outreach ${i + 1}`, s]),
                    ...aiInsights.talkingPoints.map((s, i) => [`Talking Point ${i + 1}`, s])
                );
            }

            const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lead-${Date.now()}.csv`;
            a.click();
        }
    };

    const PageTypeIndicator = () => {
        const url = context?.url || '';
        let icon = <Globe size={14} />;
        let label = 'Website';
        let color = 'hsl(215 20% 50%)';

        if (isLinkedInProfile(url)) {
            icon = <UserCircle size={14} />;
            label = 'LinkedIn Profile';
            color = 'hsl(207 90% 54%)';
        } else if (isLinkedInCompany(url)) {
            icon = <Building2 size={14} />;
            label = 'LinkedIn Company';
            color = 'hsl(207 90% 54%)';
        }

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: `${color}15`,
                borderRadius: '20px',
                color: color,
                fontSize: '11px',
                fontWeight: 600
            }}>
                {icon}
                {label}
            </div>
        );
    };

    const ScoreBadge = ({ score }: { score: number }) => {
        const getColor = () => {
            if (score >= 80) return 'hsl(142 71% 45%)';
            if (score >= 60) return 'hsl(45 93% 47%)';
            if (score >= 40) return 'hsl(32 95% 44%)';
            return 'hsl(0 84% 60%)';
        };

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `conic-gradient(${getColor()} ${score * 3.6}deg, hsl(222 47% 20%) 0deg)`,
                position: 'relative'
            }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'hsl(222 47% 11%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: getColor()
                }}>
                    {score}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 24px hsl(142 71% 45% / 0.3)'
                }}>
                    <Target size={28} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'hsl(210 40% 98%)' }}>Lead Extractor</h2>
                <p style={{ fontSize: '12px', color: 'hsl(215 20% 55%)', marginTop: '4px' }}>
                    Extract contacts from LinkedIn & websites
                </p>
            </div>

            {/* Current Page */}
            {context?.url && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(222 47% 11%)',
                    borderRadius: '14px',
                    border: '1px solid hsl(222 47% 18%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>Current Page</p>
                        <PageTypeIndicator />
                    </div>
                    <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', fontWeight: 600 }} className="truncate">{context.title}</p>
                    <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', marginTop: '4px' }} className="truncate">{context.url}</p>
                </div>
            )}

            {/* Extract Button */}
            {!lead && (
                <button
                    onClick={extractLeads}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px 24px',
                        background: loading
                            ? 'hsl(222 47% 20%)'
                            : 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)',
                        border: 'none',
                        borderRadius: '14px',
                        color: loading ? 'hsl(215 20% 50%)' : 'white',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                        boxShadow: loading ? 'none' : '0 8px 24px hsl(142 71% 45% / 0.35)',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />}
                    {loading ? status : 'Extract Lead Information'}
                </button>
            )}

            {/* LinkedIn Profile Results */}
            {lead?.type === 'profile' && (
                <div className="space-y-5 animate-in">
                    {/* Profile Status - Shows when user profile is configured */}
                    {hasProfile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: 'hsl(142 50% 12%)',
                            borderRadius: '12px',
                            border: '1px solid hsl(142 50% 22%)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                backgroundColor: 'hsl(142 50% 20%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <UserCircle size={16} style={{ color: 'hsl(142 71% 50%)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '12px', color: 'hsl(142 71% 65%)', fontWeight: 600 }}>
                                    Personalizing as {profile.name || 'you'}
                                </span>
                                {profile.companyName && (
                                    <span style={{ fontSize: '11px', color: 'hsl(142 50% 45%)', display: 'block', marginTop: '2px' }}>
                                        {profile.role ? `${profile.role} at ` : ''}{profile.companyName}
                                    </span>
                                )}
                            </div>
                            <Sparkles size={14} style={{ color: 'hsl(142 71% 50%)' }} />
                        </div>
                    )}
                    {/* Profile Header */}
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, hsl(207 90% 54% / 0.15) 0%, hsl(207 90% 54% / 0.05) 100%)',
                        borderRadius: '16px',
                        border: '1px solid hsl(207 90% 54% / 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 40%) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <UserCircle size={32} style={{ color: 'white' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>{lead.name || 'Unknown'}</h3>
                                {lead.headline && <p style={{ fontSize: '13px', color: 'hsl(215 20% 65%)', marginTop: '4px' }}>{lead.headline}</p>}
                                {lead.location && (
                                    <p style={{ fontSize: '12px', color: 'hsl(215 20% 50%)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={12} /> {lead.location}
                                    </p>
                                )}
                                {lead.connectionDegree && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '8px',
                                        padding: '4px 10px',
                                        backgroundColor: 'hsl(207 90% 54% / 0.2)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'hsl(207 90% 70%)'
                                    }}>
                                        {lead.connectionDegree}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        borderRadius: '12px',
                        border: '1px solid hsl(222 47% 18%)'
                    }}>
                        <Languages size={16} style={{ color: 'hsl(207 90% 60%)' }} />
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', display: 'block', marginBottom: '4px' }}>
                                Outreach Language
                            </label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'hsl(222 47% 15%)',
                                    border: '1px solid hsl(222 47% 22%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {languageOptions.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name} {lang.code === 'auto' && lead.location
                                            ? `(${detectLanguage(lead.location).name})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('info')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(activeTab === 'info'
                                    ? { background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)', color: 'white' }
                                    : { backgroundColor: 'hsl(222 47% 13%)', color: 'hsl(215 20% 65%)' })
                            }}
                        >
                            Profile Info
                        </button>
                        <button
                            onClick={() => aiInsights ? setActiveTab('insights') : generateAIInsights()}
                            disabled={aiLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: aiLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                ...(activeTab === 'insights'
                                    ? { background: 'linear-gradient(135deg, hsl(280 65% 60%) 0%, hsl(280 65% 50%) 100%)', color: 'white' }
                                    : { backgroundColor: 'hsl(222 47% 13%)', color: 'hsl(215 20% 65%)' })
                            }}
                        >
                            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            AI Insights
                        </button>
                    </div>

                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            {/* Current Position */}
                            {(lead.currentRole || lead.currentCompany) && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Briefcase size={12} /> Current Position
                                    </h4>
                                    <div style={{ padding: '14px 16px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)' }}>
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>{lead.currentRole}</p>
                                        <p style={{ fontSize: '13px', color: 'hsl(215 20% 60%)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Building size={12} /> {lead.currentCompany}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Experience */}
                            {lead.experience && lead.experience.length > 0 && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Briefcase size={12} /> Experience
                                    </h4>
                                    <div className="space-y-2">
                                        {lead.experience.map((exp, i) => (
                                            <div key={i} style={{ padding: '12px 14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px', border: '1px solid hsl(222 47% 18%)' }}>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>{exp.role}</p>
                                                <p style={{ fontSize: '12px', color: 'hsl(215 20% 60%)', marginTop: '2px' }}>{exp.company}</p>
                                                {exp.duration && <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)', marginTop: '4px' }}>{exp.duration}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Education */}
                            {lead.education && lead.education.length > 0 && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <GraduationCap size={12} /> Education
                                    </h4>
                                    <div className="space-y-2">
                                        {lead.education.map((edu, i) => (
                                            <div key={i} style={{ padding: '12px 14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '10px', border: '1px solid hsl(222 47% 18%)' }}>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(210 40% 98%)' }}>{edu.school}</p>
                                                {edu.degree && <p style={{ fontSize: '12px', color: 'hsl(215 20% 60%)', marginTop: '2px' }}>{edu.degree}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Skills */}
                            {lead.skills && lead.skills.length > 0 && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Zap size={12} /> Skills
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {lead.skills.map((skill, i) => (
                                            <span key={i} style={{
                                                padding: '6px 12px',
                                                backgroundColor: 'hsl(222 47% 13%)',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                color: 'hsl(215 20% 70%)'
                                            }}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'insights' && aiInsights && (
                        <div className="space-y-4 animate-in">
                            {/* Lead Score */}
                            <div style={{
                                padding: '20px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                borderRadius: '14px',
                                border: '1px solid hsl(222 47% 18%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <ScoreBadge score={aiInsights.leadScore} />
                                <div>
                                    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)' }}>Lead Score</p>
                                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', marginTop: '4px' }}>{aiInsights.scoreReason}</p>
                                </div>
                            </div>

                            {/* Outreach Suggestions */}
                            {aiInsights.outreachSuggestions?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MessageSquare size={12} /> Outreach Angles
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.outreachSuggestions.map((suggestion, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(142 71% 45% / 0.2)',
                                            fontSize: '13px',
                                            color: 'hsl(142 71% 70%)',
                                            display: 'flex',
                                            gap: '10px'
                                        }}>
                                            <span style={{ fontWeight: 700 }}>{i + 1}.</span>
                                            {suggestion}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Talking Points */}
                            {aiInsights.talkingPoints?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Star size={12} /> Talking Points
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.talkingPoints.map((point, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(222 47% 18%)',
                                            fontSize: '13px',
                                            color: 'hsl(210 40% 98%)'
                                        }}>
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Pain Points */}
                            {aiInsights.potentialPainPoints?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Target size={12} /> Potential Pain Points
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.potentialPainPoints.map((point, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(32 95% 44% / 0.1)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(32 95% 44% / 0.2)',
                                            fontSize: '13px',
                                            color: 'hsl(32 95% 60%)'
                                        }}>
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Detected Language */}
                            {aiInsights.detectedLanguage && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 14px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                borderRadius: '10px',
                                border: '1px solid hsl(222 47% 18%)'
                            }}>
                                <Languages size={14} style={{ color: 'hsl(207 90% 60%)' }} />
                                <span style={{ fontSize: '12px', color: 'hsl(215 20% 65%)' }}>
                                    Templates generated in <strong style={{ color: 'hsl(207 90% 70%)' }}>{aiInsights.detectedLanguage}</strong>
                                </span>
                            </div>
                            )}

                            {/* Common Ground */}
                            {aiInsights.commonGround && aiInsights.commonGround.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Heart size={12} /> Common Ground
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.commonGround.map((item, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(340 80% 50% / 0.1)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(340 80% 50% / 0.2)',
                                            fontSize: '13px',
                                            color: 'hsl(340 80% 70%)'
                                        }}>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Outreach Templates */}
                            {aiInsights.outreachTemplates && (
                            <div className="space-y-3">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Copy size={12} /> Ready-to-Use Templates
                                </h4>

                                {/* Outreach Style Tabs */}
                                {(aiInsights.outreachTemplates.personal || aiInsights.outreachTemplates.combined) && (
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <button
                                        onClick={() => setActiveOutreachTab('professional')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'professional'
                                                ? { background: 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 44%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Briefcase size={12} /> Professional
                                    </button>
                                    <button
                                        onClick={() => setActiveOutreachTab('personal')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'personal'
                                                ? { background: 'linear-gradient(135deg, hsl(340 80% 55%) 0%, hsl(340 80% 45%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Heart size={12} /> Personal
                                    </button>
                                    <button
                                        onClick={() => setActiveOutreachTab('combined')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'combined'
                                                ? { background: 'linear-gradient(135deg, hsl(280 65% 55%) 0%, hsl(280 65% 45%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Blend size={12} /> Combined
                                    </button>
                                </div>
                                )}

                                {/* Show active template */}
                                {(() => {
                                    const template = aiInsights.outreachTemplates[activeOutreachTab] || aiInsights.outreachTemplates.professional;
                                    if (!template) return null;

                                    const styleColors = {
                                        professional: { bg: 'hsl(207 90% 54%)', text: 'hsl(207 90% 70%)' },
                                        personal: { bg: 'hsl(340 80% 55%)', text: 'hsl(340 80% 70%)' },
                                        combined: { bg: 'hsl(280 65% 55%)', text: 'hsl(280 65% 70%)' }
                                    };
                                    const colors = styleColors[activeOutreachTab] || styleColors.professional;

                                    return (
                                        <>
                                            {/* LinkedIn Message */}
                                            {template.linkedInMessage && (
                                            <div style={{
                                                padding: '14px 16px',
                                                backgroundColor: `${colors.bg}15`,
                                                borderRadius: '12px',
                                                border: `1px solid ${colors.bg}30`
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Linkedin size={12} /> LinkedIn Message
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(template.linkedInMessage, `linkedin-${activeOutreachTab}`)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: `${colors.bg}25`,
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: colors.text,
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {copied === `linkedin-${activeOutreachTab}` ? <Check size={12} /> : <Copy size={12} />}
                                                        {copied === `linkedin-${activeOutreachTab}` ? 'Copied!' : 'Copy'}
                                                    </button>
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', lineHeight: 1.5 }}>
                                                    {template.linkedInMessage}
                                                </p>
                                            </div>
                                            )}

                                            {/* Email */}
                                            {template.emailBody && (
                                            <div style={{
                                                padding: '14px 16px',
                                                backgroundColor: `${colors.bg}10`,
                                                borderRadius: '12px',
                                                border: `1px solid ${colors.bg}25`
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Mail size={12} /> Cold Email
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(`Subject: ${template.emailSubject}\n\n${template.emailBody}`, `email-${activeOutreachTab}`)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: `${colors.bg}25`,
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: colors.text,
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {copied === `email-${activeOutreachTab}` ? <Check size={12} /> : <Copy size={12} />}
                                                        {copied === `email-${activeOutreachTab}` ? 'Copied!' : 'Copy'}
                                                    </button>
                                                </div>
                                                <p style={{ fontSize: '11px', color: colors.text, marginBottom: '8px' }}>
                                                    <strong>Subject:</strong> {template.emailSubject}
                                                </p>
                                                <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                    {template.emailBody}
                                                </p>
                                            </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* LinkedIn Company Results */}
            {lead?.type === 'company' && (
                <div className="space-y-5 animate-in">
                    {/* Profile Status - Shows when user profile is configured */}
                    {hasProfile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: 'hsl(142 50% 12%)',
                            borderRadius: '12px',
                            border: '1px solid hsl(142 50% 22%)'
                        }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                backgroundColor: 'hsl(142 50% 20%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <UserCircle size={16} style={{ color: 'hsl(142 71% 50%)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '12px', color: 'hsl(142 71% 65%)', fontWeight: 600 }}>
                                    Personalizing as {profile.name || 'you'}
                                </span>
                                {profile.companyName && (
                                    <span style={{ fontSize: '11px', color: 'hsl(142 50% 45%)', display: 'block', marginTop: '2px' }}>
                                        {profile.role ? `${profile.role} at ` : ''}{profile.companyName}
                                    </span>
                                )}
                            </div>
                            <Sparkles size={14} style={{ color: 'hsl(142 71% 50%)' }} />
                        </div>
                    )}
                    {/* Company Header */}
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(135deg, hsl(207 90% 54% / 0.15) 0%, hsl(207 90% 54% / 0.05) 100%)',
                        borderRadius: '16px',
                        border: '1px solid hsl(207 90% 54% / 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 40%) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Building2 size={32} style={{ color: 'white' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>{lead.name || 'Unknown Company'}</h3>
                                {lead.tagline && <p style={{ fontSize: '13px', color: 'hsl(215 20% 65%)', marginTop: '4px' }}>{lead.tagline}</p>}
                                {lead.industry && (
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '8px',
                                        padding: '4px 10px',
                                        backgroundColor: 'hsl(207 90% 54% / 0.2)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'hsl(207 90% 70%)'
                                    }}>
                                        {lead.industry}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        borderRadius: '12px',
                        border: '1px solid hsl(222 47% 18%)'
                    }}>
                        <Languages size={16} style={{ color: 'hsl(207 90% 60%)' }} />
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'hsl(215 20% 55%)', display: 'block', marginBottom: '4px' }}>
                                Outreach Language
                            </label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'hsl(222 47% 15%)',
                                    border: '1px solid hsl(222 47% 22%)',
                                    borderRadius: '8px',
                                    color: 'hsl(210 40% 98%)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {languageOptions.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name} {lang.code === 'auto' && lead.headquarters
                                            ? `(${detectLanguage(lead.headquarters).name})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('info')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(activeTab === 'info'
                                    ? { background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)', color: 'white' }
                                    : { backgroundColor: 'hsl(222 47% 13%)', color: 'hsl(215 20% 65%)' })
                            }}
                        >
                            Company Info
                        </button>
                        <button
                            onClick={() => aiInsights ? setActiveTab('insights') : generateAIInsights()}
                            disabled={aiLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: aiLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                ...(activeTab === 'insights'
                                    ? { background: 'linear-gradient(135deg, hsl(280 65% 60%) 0%, hsl(280 65% 50%) 100%)', color: 'white' }
                                    : { backgroundColor: 'hsl(222 47% 13%)', color: 'hsl(215 20% 65%)' })
                            }}
                        >
                            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            AI Insights
                        </button>
                    </div>

                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            {/* Quick Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {lead.companySize && (
                                    <div style={{ padding: '14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)' }}>
                                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Size</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(210 40% 98%)', marginTop: '4px' }}>{lead.companySize}</p>
                                    </div>
                                )}
                                {lead.founded && (
                                    <div style={{ padding: '14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)' }}>
                                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founded</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(210 40% 98%)', marginTop: '4px' }}>{lead.founded}</p>
                                    </div>
                                )}
                                {lead.followerCount && (
                                    <div style={{ padding: '14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)' }}>
                                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Followers</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(210 40% 98%)', marginTop: '4px' }}>{lead.followerCount}</p>
                                    </div>
                                )}
                                {lead.employeeCount && (
                                    <div style={{ padding: '14px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)' }}>
                                        <p style={{ fontSize: '10px', color: 'hsl(215 20% 50%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On LinkedIn</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(210 40% 98%)', marginTop: '4px' }}>{lead.employeeCount} employees</p>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                {lead.headquarters && (
                                    <div style={{ padding: '14px 16px', backgroundColor: 'hsl(222 47% 11%)', borderRadius: '12px', border: '1px solid hsl(222 47% 18%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <MapPin size={16} style={{ color: 'hsl(215 20% 55%)', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>Headquarters</p>
                                            <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', marginTop: '2px' }}>{lead.headquarters}</p>
                                        </div>
                                    </div>
                                )}
                                {lead.website && (
                                    <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '12px',
                                            border: '1px solid hsl(222 47% 18%)',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <Globe size={16} style={{ color: 'hsl(207 90% 60%)', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '11px', color: 'hsl(215 20% 50%)' }}>Website</p>
                                            <p style={{ fontSize: '13px', color: 'hsl(207 90% 65%)', marginTop: '2px' }} className="truncate">{lead.website}</p>
                                        </div>
                                        <ExternalLink size={14} style={{ color: 'hsl(215 20% 50%)' }} />
                                    </a>
                                )}
                            </div>

                            {/* Specialties */}
                            {lead.specialties && lead.specialties.length > 0 && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Specialties</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {lead.specialties.map((spec, i) => (
                                            <span key={i} style={{
                                                padding: '6px 12px',
                                                backgroundColor: 'hsl(222 47% 13%)',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                color: 'hsl(215 20% 70%)'
                                            }}>
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* About */}
                            {lead.about && (
                                <div className="space-y-2">
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>About</h4>
                                    <p style={{
                                        padding: '14px 16px',
                                        backgroundColor: 'hsl(222 47% 11%)',
                                        borderRadius: '12px',
                                        border: '1px solid hsl(222 47% 18%)',
                                        fontSize: '13px',
                                        color: 'hsl(215 20% 70%)',
                                        lineHeight: 1.6
                                    }}>
                                        {lead.about}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'insights' && aiInsights && (
                        <div className="space-y-4 animate-in">
                            {/* Lead Score */}
                            <div style={{
                                padding: '20px',
                                backgroundColor: 'hsl(222 47% 11%)',
                                borderRadius: '14px',
                                border: '1px solid hsl(222 47% 18%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <ScoreBadge score={aiInsights.leadScore} />
                                <div>
                                    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 50%)' }}>Company Score</p>
                                    <p style={{ fontSize: '13px', color: 'hsl(215 20% 70%)', marginTop: '4px' }}>{aiInsights.scoreReason}</p>
                                </div>
                            </div>

                            {/* Outreach Suggestions */}
                            {aiInsights.outreachSuggestions?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MessageSquare size={12} /> Approach Strategies
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.outreachSuggestions.map((suggestion, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(142 71% 45% / 0.1)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(142 71% 45% / 0.2)',
                                            fontSize: '13px',
                                            color: 'hsl(142 71% 70%)'
                                        }}>
                                            {suggestion}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Talking Points */}
                            {aiInsights.talkingPoints?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Star size={12} /> Industry Topics
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.talkingPoints.map((point, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(222 47% 11%)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(222 47% 18%)',
                                            fontSize: '13px',
                                            color: 'hsl(210 40% 98%)'
                                        }}>
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Pain Points */}
                            {aiInsights.potentialPainPoints?.length > 0 && (
                            <div className="space-y-2">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Target size={12} /> Common Challenges
                                </h4>
                                <div className="space-y-2">
                                    {aiInsights.potentialPainPoints.map((point, i) => (
                                        <div key={i} style={{
                                            padding: '12px 14px',
                                            backgroundColor: 'hsl(32 95% 44% / 0.1)',
                                            borderRadius: '10px',
                                            border: '1px solid hsl(32 95% 44% / 0.2)',
                                            fontSize: '13px',
                                            color: 'hsl(32 95% 60%)'
                                        }}>
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {/* Detected Language */}
                            {aiInsights.detectedLanguage && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 14px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                borderRadius: '10px',
                                border: '1px solid hsl(222 47% 18%)'
                            }}>
                                <Languages size={14} style={{ color: 'hsl(207 90% 60%)' }} />
                                <span style={{ fontSize: '12px', color: 'hsl(215 20% 65%)' }}>
                                    Templates generated in <strong style={{ color: 'hsl(207 90% 70%)' }}>{aiInsights.detectedLanguage}</strong>
                                </span>
                            </div>
                            )}

                            {/* Outreach Templates */}
                            {aiInsights.outreachTemplates && (
                            <div className="space-y-3">
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Copy size={12} /> Ready-to-Use Templates
                                </h4>

                                {/* Outreach Style Tabs */}
                                {(aiInsights.outreachTemplates.personal || aiInsights.outreachTemplates.combined) && (
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <button
                                        onClick={() => setActiveOutreachTab('professional')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'professional'
                                                ? { background: 'linear-gradient(135deg, hsl(207 90% 54%) 0%, hsl(207 90% 44%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Briefcase size={12} /> Professional
                                    </button>
                                    <button
                                        onClick={() => setActiveOutreachTab('personal')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'personal'
                                                ? { background: 'linear-gradient(135deg, hsl(340 80% 55%) 0%, hsl(340 80% 45%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Heart size={12} /> Personal
                                    </button>
                                    <button
                                        onClick={() => setActiveOutreachTab('combined')}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            ...(activeOutreachTab === 'combined'
                                                ? { background: 'linear-gradient(135deg, hsl(280 65% 55%) 0%, hsl(280 65% 45%) 100%)', color: 'white' }
                                                : { backgroundColor: 'hsl(222 47% 15%)', color: 'hsl(215 20% 65%)' })
                                        }}
                                    >
                                        <Blend size={12} /> Combined
                                    </button>
                                </div>
                                )}

                                {/* Show active template */}
                                {(() => {
                                    const template = aiInsights.outreachTemplates[activeOutreachTab] || aiInsights.outreachTemplates.professional;
                                    if (!template) return null;

                                    const styleColors = {
                                        professional: { bg: 'hsl(207 90% 54%)', text: 'hsl(207 90% 70%)' },
                                        personal: { bg: 'hsl(340 80% 55%)', text: 'hsl(340 80% 70%)' },
                                        combined: { bg: 'hsl(280 65% 55%)', text: 'hsl(280 65% 70%)' }
                                    };
                                    const colors = styleColors[activeOutreachTab] || styleColors.professional;

                                    return (
                                        <>
                                            {/* LinkedIn Message */}
                                            {template.linkedInMessage && (
                                            <div style={{
                                                padding: '14px 16px',
                                                backgroundColor: `${colors.bg}15`,
                                                borderRadius: '12px',
                                                border: `1px solid ${colors.bg}30`
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Linkedin size={12} /> LinkedIn Message
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(template.linkedInMessage, `linkedin-co-${activeOutreachTab}`)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: `${colors.bg}25`,
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: colors.text,
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {copied === `linkedin-co-${activeOutreachTab}` ? <Check size={12} /> : <Copy size={12} />}
                                                        {copied === `linkedin-co-${activeOutreachTab}` ? 'Copied!' : 'Copy'}
                                                    </button>
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', lineHeight: 1.5 }}>
                                                    {template.linkedInMessage}
                                                </p>
                                            </div>
                                            )}

                                            {/* Email */}
                                            {template.emailBody && (
                                            <div style={{
                                                padding: '14px 16px',
                                                backgroundColor: `${colors.bg}10`,
                                                borderRadius: '12px',
                                                border: `1px solid ${colors.bg}25`
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Mail size={12} /> Cold Email
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(`Subject: ${template.emailSubject}\n\n${template.emailBody}`, `email-co-${activeOutreachTab}`)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: `${colors.bg}25`,
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: colors.text,
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {copied === `email-co-${activeOutreachTab}` ? <Check size={12} /> : <Copy size={12} />}
                                                        {copied === `email-co-${activeOutreachTab}` ? 'Copied!' : 'Copy'}
                                                    </button>
                                                </div>
                                                <p style={{ fontSize: '11px', color: colors.text, marginBottom: '8px' }}>
                                                    <strong>Subject:</strong> {template.emailSubject}
                                                </p>
                                                <p style={{ fontSize: '13px', color: 'hsl(210 40% 98%)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                    {template.emailBody}
                                                </p>
                                            </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Generic Lead Results - keep existing simple view */}
            {lead?.type === 'generic' && (
                <div className="space-y-4 animate-in">
                    {lead.emails.length > 0 && (
                        <div className="space-y-2">
                            <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Mail size={12} /> Emails
                            </h4>
                            {lead.emails.map((email, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    borderRadius: '10px',
                                    border: '1px solid hsl(222 47% 18%)'
                                }}>
                                    <span style={{ fontSize: '13px', color: 'hsl(210 40% 98%)' }}>{email}</span>
                                    <button onClick={() => copyToClipboard(email, `email-${i}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        {copied === `email-${i}` ? <Check size={14} style={{ color: 'hsl(142 71% 55%)' }} /> : <Copy size={14} style={{ color: 'hsl(215 20% 55%)' }} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {lead.phones.length > 0 && (
                        <div className="space-y-2">
                            <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={12} /> Phones
                            </h4>
                            {lead.phones.map((phone, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    borderRadius: '10px',
                                    border: '1px solid hsl(222 47% 18%)'
                                }}>
                                    <span style={{ fontSize: '13px', color: 'hsl(210 40% 98%)' }}>{phone}</span>
                                    <button onClick={() => copyToClipboard(phone, `phone-${i}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        {copied === `phone-${i}` ? <Check size={14} style={{ color: 'hsl(142 71% 55%)' }} /> : <Copy size={14} style={{ color: 'hsl(215 20% 55%)' }} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {lead.emails.length === 0 && lead.phones.length === 0 && Object.keys(lead.socialLinks).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <Users size={40} style={{ margin: '0 auto 16px', color: 'hsl(215 20% 35%)', opacity: 0.5 }} />
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(215 20% 55%)' }}>No contact information found</p>
                            <p style={{ fontSize: '12px', color: 'hsl(215 20% 45%)', marginTop: '8px' }}>Try a company "About" or "Contact" page</p>
                        </div>
                    )}
                </div>
            )}

            {/* Export Actions */}
            {lead && (lead.type !== 'generic' || (lead.type === 'generic' && (lead.emails.length > 0 || lead.phones.length > 0))) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                        onClick={() => exportLead('csv')}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: 'linear-gradient(135deg, hsl(142 71% 45%) 0%, hsl(152 76% 40%) 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <button
                        onClick={() => exportLead('json')}
                        style={{
                            padding: '14px 20px',
                            backgroundColor: 'hsl(222 47% 13%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '12px',
                            color: 'hsl(215 20% 70%)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        JSON
                    </button>
                    <button
                        onClick={() => { setLead(null); setAiInsights(null); setActiveTab('info'); }}
                        style={{
                            padding: '14px',
                            backgroundColor: 'hsl(222 47% 13%)',
                            border: '1px solid hsl(222 47% 20%)',
                            borderRadius: '12px',
                            color: 'hsl(215 20% 70%)',
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeadExtractor;
