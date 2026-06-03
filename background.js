// background.js - Service Worker for LeetCode AI Companion

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solve' || request.action === 'guide') {
    handleRequest(request)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleRequest(request) {
  // 1. Retrieve the Gemini API Key from storage
  const storage = await chrome.storage.local.get(['gemini_api_key']);
  const apiKey = storage.gemini_api_key;
  if (!apiKey) {
    throw new Error('API Key missing. Click the extension icon in your toolbar to configure your Gemini API Key.');
  }

  // 2. Fetch question details from LeetCode GraphQL
  const question = await fetchLeetCodeQuestion(request.slug);
  
  // 3. Clean the HTML description to plain text
  const cleanDesc = cleanHtml(question.content);

  // 4. Find the matching starter code stub for their selected language
  const targetSnippet = question.codeSnippets.find(
    s => s.lang === request.lang || s.langSlug === request.lang.toLowerCase()
  ) || question.codeSnippets[0];

  const codeStub = targetSnippet ? targetSnippet.code : '';

  // 5. Formulate prompt
  let prompt = '';
  if (request.action === 'solve') {
    prompt = `
    You are an elite software engineer and competitive programmer.
    Your goal is to solve this LeetCode problem.

    PROBLEM TITLE: ${question.title}
    DIFFICULTY: ${question.difficulty}
    DESCRIPTION:
    ${cleanDesc}

    STARTER CODE TEMPLATE:
    \`\`\`${request.lang}
    ${codeStub}
    \`\`\`

    INSTRUCTIONS:
    1. Write the absolute fastest, most memory-efficient solution that will achieve "Beats 100%" or top performance metrics on LeetCode.
    2. If the language is C++, include a fast I/O block at the very top of the solution (outside the class definition) to optimize stream performance, like:
       auto init = []() {
           std::ios_base::sync_with_stdio(false);
           std::cin.tie(NULL);
           return 0;
       }();
    3. If the language is Java, use fast input reader techniques if appropriate, and keep object allocations to an absolute minimum.
    4. Optimize the algorithm's constant factors (e.g. using pre-allocated arrays instead of dynamically resizing lists, bitwise optimizations, in-place updates, unrolling simple loops) so it gets the absolute maximum speed.
    5. Ensure it strictly fits into the starter template without changing class, function, or parameter names.
    6. DO NOT wrap the code in markdown blocks like \`\`\`${request.lang}.
    7. Output ONLY the raw executable code that is ready to paste directly into the editor. No explanations, no markdown blocks, no prefix/suffix text.
    `;
  } else {
    prompt = `
    You are a supportive, friendly, and expert computer science professor and coding mentor.
    Your goal is to guide the user to solve this LeetCode problem themselves.
    DO NOT write the final complete solution code for them under any circumstance.

    PROBLEM TITLE: ${question.title}
    DIFFICULTY: ${question.difficulty}
    DESCRIPTION:
    ${cleanDesc}

    USER'S CURRENT ACTIVE CODE:
    \`\`\`${request.lang}
    ${request.currentCode || '// Starter template / Empty code'}
    \`\`\`

    INSTRUCTIONS FOR YOUR FEEDBACK:
    Provide a highly engaging, constructive review structured into these sections using simple HTML formatting:
    
    1. 🔍 <strong>Approach Check</strong>: Gently evaluate if their structural choice (e.g. Hashmap, two pointers) is heading in the right direction. Suggest alternative paths if they are stuck.
    2. 🐛 <strong>Bug Hunt</strong>: Highlight any logical flaws, syntax errors, or missed edge cases in their current code. Do not give the corrected code, just explain the bug.
    3. 💡 <strong>Next Steps & Hints</strong>: Provide 1 or 2 small, progressive hints to nudge them toward writing the next lines.
    4. ⚡ <strong>Complexity Check</strong>: Summarize the space-time target (e.g., "We are aiming for O(N) time complexity").
    
    Keep your tone supportive, clean, and highly educational. Use concise bullet points. Avoid neon cyber formatting.
    `;
  }

  // 6. Request Gemini 1.5 Flash API
  const responseText = await callGeminiAPI(apiKey, prompt);
  return { success: true, data: responseText };
}

async function fetchLeetCodeQuestion(titleSlug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        content
        codeSnippets {
          lang
          langSlug
          code
        }
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com'
    },
    body: JSON.stringify({ query, variables: { titleSlug } })
  });

  if (!response.ok) {
    throw new Error('Failed to query LeetCode GraphQL endpoint.');
  }

  const json = await response.json();
  if (json.data && json.data.question) {
    return json.data.question;
  } else {
    throw new Error('Problem question not found or is private.');
  }
}

async function getAvailableModelsList(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (res.ok) {
      const json = await res.json();
      if (json.models) {
        return json.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
      }
    }
  } catch (e) {
    console.error('[AI Solver] Error listing models:', e);
  }
  return [];
}

async function callGeminiAPI(apiKey, prompt) {
  // FAST PATH: Try the standard gemini-1.5-flash model on v1 Stable API first.
  // This bypasses the ListModels call completely for standard requests, reducing latency to under 1.5s.
  const fastUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  try {
    console.log('[AI Solver] Attempting fast path: Gemini 1.5 Flash (v1 Stable)...');
    const response = await fetch(fastUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const json = await response.json();
    if (response.ok && json.candidates && json.candidates[0].content.parts[0].text) {
      console.log('[AI Solver] Fast path succeeded! Returning response.');
      return json.candidates[0].content.parts[0].text.trim();
    }
    console.warn('[AI Solver] Fast path failed or returned empty. Error details:', json.error ? json.error.message : 'Unknown');
  } catch (err) {
    console.warn('[AI Solver] Fast path request failed:', err.message);
  }

  // FALLBACK PATH: If the fast path fails, run the dynamic model listing and fallbacks
  console.log('[AI Solver] Entering fallback path. Querying available models dynamically...');
  const availableModels = await getAvailableModelsList(apiKey);
  console.log('[AI Solver] Models available to this API key:', availableModels);

  const endpoints = [];
  
  // 1. Add all models reported as available by their key first
  for (const model of availableModels) {
    if (model === 'gemini-1.5-flash') continue; // Already tried in fast path
    endpoints.push({
      url: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      label: `${model} (v1 Dynamic)`
    });
    endpoints.push({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      label: `${model} (v1beta Dynamic)`
    });
  }

  // 2. Add standard fallbacks if not already tried
  const fallbackModels = ['gemini-1.5-pro', 'gemini-1.0-pro'];
  for (const model of fallbackModels) {
    if (!availableModels.includes(model)) {
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        label: `${model} (v1 Stable Fallback)`
      });
      endpoints.push({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        label: `${model} (v1beta Beta Fallback)`
      });
    }
  }

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`[AI Solver] Trying API request using endpoint: ${endpoint.label}`);
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const json = await response.json();
      
      if (!response.ok) {
        const errorDetails = json.error ? json.error.message : 'Unknown Google API error';
        throw new Error(`API Error details: ${errorDetails}`);
      }

      if (json.candidates && json.candidates[0].content.parts[0].text) {
        console.log(`[AI Solver] API request succeeded using endpoint: ${endpoint.label}`);
        return json.candidates[0].content.parts[0].text.trim();
      } else {
        throw new Error('Failed to parse response text from candidates.');
      }
    } catch (err) {
      console.warn(`[AI Solver] Request failed on endpoint ${endpoint.label}:`, err.message);
      lastError = err;
    }
  }

  const modelListText = availableModels.length > 0 ? availableModels.join(', ') : 'None detected';
  throw new Error(`Gemini API Error: ${lastError ? lastError.message : 'All endpoints failed.'} (Available models for this key: ${modelListText})`);
}

function cleanHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}
