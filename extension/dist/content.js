const m=globalThis;if(!m.__accessHubContentReady){let u=function(){let e=document.getElementById(i);return e||(e=document.createElement("style"),e.id=i,(document.head??document.documentElement).append(e)),e},d=function(e){const o=[],n=Math.min(1.8,Math.max(.8,e.textScale));n!==1&&o.push(`html { zoom: ${n} !important; }`),e.highContrast&&o.push(`
        html, body { background: #fff !important; color: #111 !important; }
        body :not(img):not(video):not(canvas):not(svg):not(path) {
          color: #111 !important;
          border-color: #333 !important;
          background-color: transparent !important;
        }
        a, a :not(img):not(svg) { color: #003b8e !important; }
        button, input, select, textarea {
          background: #fff !important;
          color: #111 !important;
          border: 2px solid #111 !important;
        }
        :focus-visible { outline: 3px solid #e65c00 !important; outline-offset: 2px !important; }
      `),e.readableFont&&o.push(`
        html, body, body *:not(svg):not(svg *) {
          font-family: "Atkinson Hyperlegible", Arial, Helvetica, sans-serif !important;
          letter-spacing: 0.025em !important;
          word-spacing: 0.08em !important;
        }
      `),e.readingFocus&&o.push(`
        .${a} {
          position: relative !important;
          z-index: 2147483645 !important;
          line-height: 1.75 !important;
        }
        .${a}:not(body) {
          max-width: 74rem !important;
          margin-inline: auto !important;
          padding: 1.25rem !important;
          background: #fffefa !important;
          color: #20251c !important;
          box-shadow: 0 0 0 100vmax rgba(18, 24, 15, 0.68) !important;
        }
        .${a} * { line-height: 1.75 !important; }
      `),r&&!l&&r.classList.remove(a),r=null,l=!1,e.readingFocus&&(r=document.querySelector("main, article, [role='main']")??document.body,l=r.classList.contains(a),r.classList.add(a));const t=document.getElementById(i);!o.length&&t?t.remove():o.length&&(u().textContent=o.join(`
`))},p=function(){const e=Array.from(document.images),o=Array.from(document.querySelectorAll("button")),n=Array.from(document.querySelectorAll("input, select, textarea"));return{totalImages:e.length,missingAlt:e.filter(t=>!t.hasAttribute("alt")).length,unnamedButtons:o.filter(t=>{const f=t.getAttribute("aria-labelledby")?.split(/\s+/).map(s=>document.getElementById(s)?.textContent?.trim()??"").join("");return![t.innerText,t.getAttribute("aria-label"),t.getAttribute("title"),f].some(s=>s?.trim())}).length,unlabeledInputs:n.filter(t=>t instanceof HTMLInputElement&&["hidden","submit","button","reset"].includes(t.type)?!1:!t.labels?.length&&!t.getAttribute("aria-label")&&!t.getAttribute("aria-labelledby")).length}},c=function(){return window.getSelection()?.toString().trim()??""},g=function(){window.speechSynthesis.cancel();const e=c(),o=document.querySelector("main, article, [role='main']")??document.body,n=(e||o.innerText).trim().slice(0,1e4);if(!n)throw new Error("There is no readable text on this page.");const t=new SpeechSynthesisUtterance(n);return t.rate=1,window.speechSynthesis.speak(t),e?"Reading selected text.":"Reading the main page text."};m.__accessHubContentReady=!0;const i="accesshub-ai-accessibility-styles",a="accesshub-ai-reading-focus";let r=null,l=!1;chrome.runtime.onMessage.addListener((e,o,n)=>{try{if(!e||typeof e!="object")throw new Error("Invalid extension command.");const t=e;switch(t.type){case"APPLY_SETTINGS":if(!t.settings)throw new Error("Accessibility settings are missing.");d(t.settings),n({ok:!0});break;case"GET_SELECTION":n({ok:!0,data:c()});break;case"SCAN_PAGE":n({ok:!0,data:p()});break;case"SPEAK_PAGE":n({ok:!0,data:g()});break;default:throw new Error("Unsupported page command.")}}catch(t){n({ok:!1,error:t instanceof Error?t.message:"The page command failed."})}return!1})}
