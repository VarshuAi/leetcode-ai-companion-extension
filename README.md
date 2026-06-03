# 🧠 LeetCode AI Companion & Autosolver (Chrome Extension)

> A premium, light/dark responsive Manifest V3 Chrome Extension that injects a smooth glassmorphic AI Co-Pilot & Autosolver directly into LeetCode problems.

Eliminate background Node.js terminals and Playwright controllers. This extension runs natively inside Google Chrome, injecting a Shadow DOM interface directly onto `https://leetcode.com/problems/*` pages.

---

## ✨ Features

* **🎨 Smooth Light & Dark Themes**: Fully styled with an elegant off-white light theme and slate dark theme. Switch between them instantly via the header toggle.
* **🧠 Co-Pilot Mentor Mode**: Stuck on a problem? Click *Analyze My Code*. The mentor reads your current Monaco editor, checks your time-space targets, finds edge cases, and prints hints without spoiling code.
* **🚀 One-Click Autosolver**: Instantly queries LeetCode GraphQL, prompts Gemini 1.5 Flash for the optimal solution, and writes the code straight into your Monaco Editor using custom window event tunnels.
* **🛡️ CSP & Trusted Types Safe**: Isolates the UI inside a Shadow DOM so styling never conflicts with LeetCode. Interfaces via main-world event passing to safely write to Monaco and avoid Trusted Types blockers.

---

## 🛠️ Installation & Setup

To load and run this extension in Chrome:

### Step 1: Load the Extension
1. Open Google Chrome.
2. In your address bar, type `chrome://extensions/` and hit Enter.
3. In the top-right corner of the Extensions page, toggle the **Developer mode** switch on.
4. In the top-left corner, click the **Load unpacked** button.
5. In the file explorer, navigate to and select the directory:
   `C:\Users\Varshan\Documents\antigravity\magical-hypatia\leetcode-extension\`
6. Click **Select Folder**.

### Step 2: Configure your Gemini API Key
1. Click the **Extensions** icon (puzzle piece) in your Chrome toolbar.
2. Click **LeetCode AI Companion**.
3. Paste your Gemini API Key in the field and click **Save Configurations**.

### Step 3: Run on LeetCode!
1. Open any LeetCode problem (e.g. [Two Sum](https://leetcode.com/problems/two-sum/)).
2. Look for the blue floating icon in the bottom-right corner.
3. Click it to open the companion sidebar, select your preferred panel, and enjoy hands-free learning!

---

*Designed and developed by **Varshan**. Happy coding! 🚀*
