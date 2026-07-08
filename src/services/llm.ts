import type { ApiKeys, Language, Provider, SummaryOptions, SummaryResult } from '../types'
import { CATEGORIES } from '../types'
import { CLAUDE_BASE, GEMINI_BASE, NVIDIA_BASE, OPENAI_BASE } from '../config/endpoints'

const TIMEOUT_MS = 60_000
const MAX_TOKENS = 1024 * 10

const LANGUAGE_NAMES: Record<Language, string> = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese',
}

function makeSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS)
}

function buildSystemPrompt(options: SummaryOptions): string {
  const styleLines: string[] = []
  if (options.kidFriendly) {
    styleLines.push('Summarize using simple words and short sentences a child could understand.')
  }
  if (options.emoji) {
    styleLines.push('Sprinkle in emojis that fit the content throughout the summary.')
  }
  return `You are an AI that classifies and summarizes news articles.
Classify the given article into exactly one of these categories: ${CATEGORIES.join(', ')}. The category value must exactly match one from this list.
Then summarize the article in ${LANGUAGE_NAMES[options.language]} (3-5 sentences).
${styleLines.join('\n')}
Output only the JSON format below. No markdown, no explanations.
{ "category": "Politics", "summary": "..." }`
}

function extractJSON(raw: string): SummaryResult {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const fenced = stripped.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const parsed = JSON.parse(fenced)
  if (!CATEGORIES.includes(parsed.category)) {
    throw new Error(`Unknown category: ${parsed.category}`)
  }
  if (typeof parsed.summary !== 'string' || !parsed.summary) {
    throw new Error('Missing summary')
  }
  return parsed as SummaryResult
}

async function callClaude(systemPrompt: string, article: string, model: string, key: string): Promise<string> {
  const res = await fetch(`${CLAUDE_BASE}/messages`, {
    method: 'POST',
    signal: makeSignal(),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: article }],
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function callGemini(systemPrompt: string, article: string, model: string, key: string): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    signal: makeSignal(),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: article }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: MAX_TOKENS },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}

async function callOpenAI(systemPrompt: string, article: string, model: string, key: string): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    signal: makeSignal(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: article }],
      response_format: { type: 'json_object' },
      max_tokens: MAX_TOKENS,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callNvidia(systemPrompt: string, article: string, model: string, key: string): Promise<string> {
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    signal: makeSignal(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: article }],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }),
  })
  if (!res.ok) throw new Error(`NVIDIA NIM ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

export async function summarizeArticle(
  article: string,
  options: SummaryOptions,
  provider: Provider,
  model: string,
  keys: ApiKeys
): Promise<SummaryResult> {
  const systemPrompt = buildSystemPrompt(options)
  const key = keys[provider]
  if (!key) throw new Error(`${provider} API key is missing`)

  let raw: string
  if (provider === 'claude') raw = await callClaude(systemPrompt, article, model, key)
  else if (provider === 'gemini') raw = await callGemini(systemPrompt, article, model, key)
  else if (provider === 'openai') raw = await callOpenAI(systemPrompt, article, model, key)
  else raw = await callNvidia(systemPrompt, article, model, key)

  return extractJSON(raw)
}
