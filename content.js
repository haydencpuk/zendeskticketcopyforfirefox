function isLight(hex) {
  const r = parseInt(hex.substr(1,2), 16);
  const g = parseInt(hex.substr(3,2), 16);
  const b = parseInt(hex.substr(5,2), 16);
  const luminance = 0.299*r + 0.587*g + 0.114*b;
  return luminance > 186;
}

console.log("Content script loaded");

let copyClickTimestamps = [];
const chimeAudio = new Audio(browser.runtime.getURL('chime.mp3'));

function trackCopyClicks() {
  const now = Date.now();
  copyClickTimestamps = copyClickTimestamps.filter(t => now - t < 3000);
  copyClickTimestamps.push(now);

  if (copyClickTimestamps.length >= 10) {
    chimeAudio.play();
    copyClickTimestamps = [];
  }
}

// Helper to lighten hex colour by a percentage
function lightenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return (
    "#" +
    (0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255))
      .toString(16)
      .slice(1)
  );
}

function insertCopyButton() {
  const ticketEls = document.querySelectorAll('[data-test-id^="tabs-section-nav-item-ticket"]');
  if (ticketEls.length > 0) {
    ticketEls.forEach(ticketEl => {
      if (!ticketEl.hasAttribute('data-copy-processed')) {
        ticketEl.setAttribute('data-copy-processed', 'true'); // ✅ Set early

        browser.storage.local.get('buttonColor').then((data) => {
          const userColor = data.buttonColor || '#4f6d7a';
          const hoverColor = lightenColor(userColor, 10); // 10% lighter on hover

          const button = document.createElement('button');
          button.className = 'copy-button';
          button.textContent = 'Copy';

          // Apply styles
          button.style.backgroundColor = userColor;
          button.style.color = isLight(userColor) ? '#000' : '#fff';
          button.style.color = '#ffffff';
          button.style.border = 'none';
          button.style.borderRadius = '5px';
          button.style.padding = '2px 8px';
          button.style.marginLeft = '10px';
          button.style.marginTop = '-2px';
          button.style.fontSize = '0.85rem';
          button.style.cursor = 'pointer';
          button.style.display = 'inline-block';
          button.style.verticalAlign = 'text-top';
          button.style.position = 'relative';
          button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
          button.style.transition = 'transform 0.1s ease, background-color 0.2s ease';

          // Hover behaviour
          button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = hoverColor;
          });
          button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = userColor;
            button.style.transform = 'scale(1)';
          });

          // Press effect
          button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)';
          });
          button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
          });

          // Click to copy
          button.addEventListener('click', () => {
            const match = ticketEl.innerText.match(/\d+/);
            const ticketNumber = match ? match[0] : '';

            navigator.clipboard.writeText(ticketNumber)
              .then(() => {
            trackCopyClicks();
                console.log(`Ticket number ${ticketNumber} copied to clipboard!`);

                const existingPopup = document.querySelector('.copied-popup');
                if (existingPopup) existingPopup.remove();

                const popup = document.createElement('div');
                popup.className = 'copied-popup';
                popup.textContent = 'Copied!';
                popup.style.position = 'fixed';
                popup.style.backgroundColor = '#333';
                popup.style.color = '#fff';
                popup.style.padding = '4px 8px';
                popup.style.borderRadius = '4px';
                popup.style.fontSize = '12px';
                popup.style.whiteSpace = 'nowrap';
                popup.style.pointerEvents = 'none';
                popup.style.zIndex = '999999';
                popup.style.opacity = '1';
                popup.style.transition = 'opacity 0.4s ease';

                const rect = button.getBoundingClientRect();
                popup.style.top = `${rect.top - 30}px`;
                popup.style.left = `${rect.left + rect.width / 2}px`;
                popup.style.transform = 'translateX(-50%)';

                const arrow = document.createElement('div');
                arrow.style.position = 'absolute';
                arrow.style.bottom = '-6px';
                arrow.style.left = '50%';
                arrow.style.transform = 'translateX(-50%)';
                arrow.style.width = '0';
                arrow.style.height = '0';
                arrow.style.borderLeft = '6px solid transparent';
                arrow.style.borderRight = '6px solid transparent';
               // arrow.style.borderTop = '6px solid #fff';
                popup.appendChild(arrow);
                document.body.appendChild(popup);

                setTimeout(() => {
                  popup.style.opacity = '0';
                }, 1500);

                setTimeout(() => {
                  popup.remove();
                }, 2000);
              })
              .catch((err) => {
                console.error('Failed to copy ticket number', err);
              });
          });

          ticketEl.appendChild(button);
        });
      }
    });
  } else {
    console.log("No ticket elements found.");
  }
}

insertCopyButton();

const observer = new MutationObserver(() => {
  insertCopyButton();
});
observer.observe(document.body, { childList: true, subtree: true });

setInterval(insertCopyButton, 1000);

// ✅ Watch for dynamic colour changes and update all buttons live
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.buttonColor) {
    const newColor = changes.buttonColor.newValue;
    const hoverColor = lightenColor(newColor, 10);
    document.querySelectorAll('.copy-button').forEach(button => {
      button.style.backgroundColor = newColor;
      button.style.color = isLight(newColor) ? '#000' : '#fff';

      // Re-apply hover behaviour
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = hoverColor;
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = newColor;
      button.style.color = isLight(newColor) ? '#000' : '#fff';
      });
    });
  }
});