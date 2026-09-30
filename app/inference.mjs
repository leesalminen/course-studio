import { z } from 'zod';

export class InferenceError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

function inferenceError(code) {
  const limited = ['subscription_sharing_usage_limit_exceeded', 'subscription_sharing_usage_unavailable'].includes(code);
  return new InferenceError(limited
    ? 'ChatGPT plan usage is unavailable or has reached a limit. Manage usage in ChatGPT settings, then resume your course.'
    : 'ChatGPT could not finish this request. Your completed lessons are saved; you can resume.', limited ? 'usage_limit' : 'inference_failed');
}

export async function listModels(token, fetcher = fetch) {
  const response = await fetcher('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw inferenceError(response.status === 429 ? 'subscription_sharing_usage_limit_exceeded' : 'models_failed');
  const catalog = await response.json();
  if (!Array.isArray(catalog.models)) throw new Error('ChatGPT returned an unexpected model catalog. Please reconnect.');
  return catalog.models.filter(m => m.visibility === 'list' && typeof m.slug === 'string' && typeof m.display_name === 'string')
    .map(m => ({ slug: m.slug, display_name: m.display_name }));
}

export async function readResponseStream(body) {
  const decoder = new TextDecoder();
  let buffer = '', output = '', completed = false;
  function consume(frame) {
    const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') return;
    const event = JSON.parse(data);
    if (event.type === 'response.output_text.delta') output += event.delta;
    if (['response.failed', 'response.incomplete', 'error'].includes(event.type)) {
      throw inferenceError(event.response?.error?.code || event.code);
    }
    if (event.type === 'response.completed') completed = true;
    if (output.length > 200000) throw new Error('The response was too large. Choose a smaller course.');
  }
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
    // Normalize after concatenating too: a CRLF may straddle network chunks.
    buffer = buffer.replace(/\r\n/g, '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      consume(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2);
    }
    if (buffer.length > 250000) throw new Error('ChatGPT returned an oversized event.');
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  if (!completed || !output.trim()) throw inferenceError('interrupted_stream');
  return output;
}

export async function structuredResponse({ token, model, instructions, input, schema, name, signal }, fetcher = fetch) {
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, instructions, input: JSON.stringify(input), store: false, stream: true,
      text: { format: { type: 'json_schema', name, strict: true, schema: z.toJSONSchema(schema) } },
    }), signal: signal ?? AbortSignal.timeout(300000),
  });
  if (!response.ok) {
    let error; try { error = await response.json(); } catch { /* no provider body is exposed */ }
    throw inferenceError(error?.error?.code ?? (response.status === 429 ? 'subscription_sharing_usage_limit_exceeded' : 'request_failed'));
  }
  const text = await readResponseStream(response.body);
  try { return schema.parse(JSON.parse(text)); }
  catch { throw new Error('ChatGPT returned incomplete teaching materials. Progress is saved; retry this step.'); }
}
