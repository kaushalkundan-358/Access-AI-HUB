const button = document.getElementById("scan");
const results = document.getElementById("results");

button.addEventListener("click", async () => {
  results.textContent = "Scanning webpage...";
  button.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id || !/^https?:/.test(tab.url || "")) {
      throw new Error("Open a normal website and try again.");
    }

    const execution = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const issues = [];

        const images = [...document.images];
        const missingAlt = images.filter(
          image => !image.hasAttribute("alt")
        ).length;

        const buttons = [...document.querySelectorAll("button")];
        const unnamedButtons = buttons.filter(button => {
          const name = [
            button.innerText,
            button.getAttribute("aria-label"),
            button.getAttribute("title")
          ].some(value => value?.trim());

          return !name;
        }).length;

        const inputs = [
          ...document.querySelectorAll("input, select, textarea")
        ];

        const unlabeledInputs = inputs.filter(input => {
          if (["hidden", "submit", "button", "reset"].includes(input.type)) {
            return false;
          }

          return !input.labels?.length &&
            !input.getAttribute("aria-label") &&
            !input.getAttribute("aria-labelledby");
        }).length;

        if (missingAlt) {
          issues.push(`${missingAlt} image(s) missing alt attributes`);
        }

        if (unnamedButtons) {
          issues.push(`${unnamedButtons} button(s) may lack accessible names`);
        }

        if (unlabeledInputs) {
          issues.push(`${unlabeledInputs} form field(s) may lack labels`);
        }

        return {
          totalImages: images.length,
          issues
        };
      }
    });

    const report = execution[0].result;
    results.replaceChildren();

    const summary = document.createElement("p");
    summary.textContent = `Images checked: ${report.totalImages}`;
    results.appendChild(summary);

    if (!report.issues.length) {
      const message = document.createElement("p");
      message.textContent = "No issues detected by these basic checks.";
      results.appendChild(message);
    } else {
      const list = document.createElement("ul");

      report.issues.forEach(issue => {
        const item = document.createElement("li");
        item.textContent = issue;
        list.appendChild(item);
      });

      results.appendChild(list);
    }
  } catch (error) {
    results.textContent = error.message ||
      "Could not scan this page. Try another website.";
  } finally {
    button.disabled = false;
  }
});