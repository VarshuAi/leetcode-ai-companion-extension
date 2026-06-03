// content-main.js - Runs in the MAIN world to access window.monaco

console.log("[AI Solver] Main World Context Interfacer Active.");

// Listen to read request from the isolated content script
window.addEventListener('AI_READ_EDITOR', () => {
  try {
    let currentCode = "";
    let lang = "Python3";

    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        currentCode = editors[0].getValue();
      }
    }

    // Try to detect selected language from LeetCode header DOM elements
    const languages = [
      "C++", "Java", "Python", "Python3", "C", "C#", "JavaScript", 
      "TypeScript", "Go", "Rust", "Ruby", "Swift", "Kotlin", 
      "Scala", "PHP", "Bash", "MySQL", "Oracle"
    ];
    const elements = Array.from(document.querySelectorAll('button, [id^="headlessui-listbox-button"], [role="combobox"]'));
    for (const el of elements) {
      const text = el.innerText ? el.innerText.trim() : '';
      if (languages.includes(text)) {
        lang = text;
        break;
      }
    }

    // Send the code and language back to the isolated script
    const responseEvent = new CustomEvent('AI_EDITOR_DATA', {
      detail: { code: currentCode, language: lang }
    });
    window.dispatchEvent(responseEvent);
  } catch (e) {
    console.error("[AI Solver] Error reading from Monaco:", e);
  }
});

// Listen to injection request from the isolated content script
window.addEventListener('AI_INJECT_CODE', (e) => {
  try {
    const code = e.detail.code;
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        editors[0].setValue(code);
        console.log("[AI Solver] Code injected into Monaco editor successfully.");
      } else {
        console.warn("[AI Solver] No active Monaco editors found to inject code.");
      }
    } else {
      console.warn("[AI Solver] window.monaco not available in page context.");
    }
  } catch (err) {
    console.error("[AI Solver] Error injecting code into Monaco:", err);
  }
});
