// AI tools — backend proxy engine; keys never leave the server.
// localFallback gives the summarizer a real extractive result when no provider is configured.

const extractive = (text, n = 3) => {
  const sents = (text.match(/[^.!?]+[.!?]+/g) || [text]).map((s) => s.trim()).filter(Boolean);
  if (sents.length <= n) return text;
  const freq = {};
  text.toLowerCase().match(/[a-z']+/g)?.forEach((w) => { if (w.length > 3) freq[w] = (freq[w] || 0) + 1; });
  const scored = sents.map((s, i) => ({
    s, i,
    score: (s.toLowerCase().match(/[a-z']+/g) || []).reduce((a, w) => a + (freq[w] || 0), 0) / (s.split(' ').length || 1),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s).join(' ');
};

const T = (id, name, desc, prompt, extra = {}) => ({
  id, name, desc, engine: 'ai',
  def: { id, prompt, inputLabel: extra.inputLabel || 'Your text', action: extra.action || 'Generate', localFallback: extra.localFallback },
  keywords: [name.toLowerCase(), 'ai tool', 'free online'], ...extra,
});

export const AI_TOOLS = [
  T('ai-summarizer', 'AI Text Summarizer', 'Summarize long text into key points — condense articles, docs, notes.',
    (t) => `Summarize the following text concisely in bullet points:\n\n${t}`,
    { localFallback: (t) => extractive(t, 3), featured: true, popular: true }),
  T('ai-rewriter', 'AI Rewriter', 'Rewrite text for clarity and flow — same meaning, better wording.',
    (t) => `Rewrite this text to be clearer and more engaging, keeping the meaning:\n\n${t}`),
  T('ai-grammar-checker', 'AI Grammar Checker', 'Fix grammar, spelling and punctuation errors in your writing.',
    (t) => `Fix all grammar, spelling and punctuation errors. Return the corrected text:\n\n${t}`,
    { localFallback: (t) => t.replace(/\bi\b/g, 'I').replace(/\s+([.,!?;:])/g, '$1') }),
  T('ai-translator', 'AI Translator', 'Translate text between languages — fast, natural translations.',
    (t) => `Translate this text to natural English (or detect intent):\n\n${t}`, { popular: true }),
  T('ai-email-writer', 'AI Email Writer', 'Write professional emails from a short brief — polite, clear, ready to send.',
    (t) => `Write a professional email based on this brief:\n\n${t}`, { action: 'Write Email' }),
  T('ai-product-description', 'AI Product Description Generator', 'Compelling product descriptions for e-commerce listings.',
    (t) => `Write a persuasive product description for:\n\n${t}`, { action: 'Write Description' }),
  T('ai-blog-outline', 'AI Blog Outline Generator', 'Structured blog post outlines — intro, sections, conclusion.',
    (t) => `Create a detailed blog post outline for:\n\n${t}`, { action: 'Create Outline' }),
  T('ai-social-caption', 'AI Social Caption Generator', 'Engaging social media captions for any post topic.',
    (t) => `Write 3 engaging social media captions for:\n\n${t}`, { action: 'Write Captions' }),
  T('ai-resume-builder', 'AI Resume Builder', 'Polish resume bullet points and summaries from your experience.',
    (t) => `Turn this experience into strong resume bullet points:\n\n${t}`, { action: 'Build Resume Content' }),
  T('ai-cover-letter', 'AI Cover Letter Generator', 'Tailored cover letters — paste the job + your background.',
    (t) => `Write a concise, tailored cover letter based on:\n\n${t}`, { action: 'Write Letter' }),
  T('ai-meeting-notes', 'AI Meeting Notes', 'Turn messy meeting transcripts into clean notes with action items.',
    (t) => `Convert this into organized meeting notes with action items:\n\n${t}`),
  T('ai-text-generator', 'AI Text Generator', 'Generate text on any topic — paragraphs, ideas, drafts.',
    (t) => `Write about:\n\n${t}`),
  T('ai-question-generator', 'AI Question Generator', 'Generate quiz/discussion questions from any text.',
    (t) => `Generate 5 thoughtful questions based on this text:\n\n${t}`, { action: 'Generate Questions' }),
];
