document.addEventListener('DOMContentLoaded', () => {
  // Get the blocked site from URL
  const urlParams = new URLSearchParams(window.location.search);
  const site = urlParams.get("site") || "this website";
  const siteNameEl = document.getElementById("siteName");
  if (siteNameEl) {
    siteNameEl.textContent = site;
  }

  // Handle Go Back logic
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // If we have history, try to go back
      if (window.history.length > 1) {
          window.history.back();
          // If we are still here after a short delay (meaning back failed or loop), close the tab
          setTimeout(() => {
              chrome.runtime.sendMessage({ action: 'closeTab' });
          }, 300);
      } else {
          // No history, just close
          chrome.runtime.sendMessage({ action: 'closeTab' });
      }
    });
  }

  // Load Tasks
  function loadTasks() {
    chrome.storage.local.get(['tasks'], function(result) {
        console.log('[BlockedPage] Loaded tasks:', result.tasks);
        const tasks = result.tasks;
        renderTasks(tasks);
    });
  }
  
    function renderTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    const list = document.getElementById('taskList');
    
    // Clear list
    list.innerHTML = '';

    if (tasks && tasks.length > 0) {
        container.style.display = 'block';
        // Reset container style if it was changed for quotes
        container.style.textAlign = 'left';
        document.querySelector('#tasksContainer h2').style.display = 'block';
        
        tasks.slice(0, 5).forEach(task => { // Show top 5
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.style.padding = '8px';
            div.style.background = 'rgba(255,255,255,0.1)';
            div.style.borderRadius = '5px';
            div.style.fontSize = '14px';
            
            let dateStr = '';
            if (task.datetime) {
                const dateObj = new Date(task.datetime);
                dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: 600;">${escapeHtml(task.title)}</div>
                    ${dateStr ? `<div style="font-size: 11px; opacity: 0.6; white-space: nowrap; margin-left: 8px;">${dateStr}</div>` : ''}
                </div>
                ${task.notes ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${escapeHtml(task.notes)}</div>` : ''}
            `;
            list.appendChild(div);
        });
        
        if (tasks.length > 5) {
             const more = document.createElement('div');
             more.textContent = `+ ${tasks.length - 5} more tasks`;
             more.style.textAlign = 'center';
             more.style.fontSize = '12px';
             more.style.opacity = '0.7';
             more.style.marginTop = '10px';
             list.appendChild(more);
        }
    } else {
        // Show motivational quote
        container.style.display = 'block';
        container.style.textAlign = 'center';
        // Hide "Pending Tasks" header
        const header = document.querySelector('#tasksContainer h2');
        if (header) header.style.display = 'none';

        const quotes = [
            "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
            "The secret of getting ahead is getting started. - Mark Twain",
            "It always seems impossible until it's done. - Nelson Mandela",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "The future depends on what you do today. - Mahatma Gandhi",
            "Focus on being productive instead of busy. - Tim Ferriss",
            "Success is the sum of small efforts, repeated day in and day out. - Robert Collier",
            "Your time is limited, so don't waste it living someone else's life. - Steve Jobs",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Believe you can and you're halfway there. - Theodore Roosevelt"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const [text, author] = randomQuote.split(' - ');
        
        list.innerHTML = `
            <div style="padding: 20px 10px;">
                <div style="font-size: 18px; font-style: italic; margin-bottom: 15px;">"${text}"</div>
                <div style="font-size: 14px; opacity: 0.8;">— ${author}</div>
            </div>
        `;
    }
  }

  // Initial load
  loadTasks();

  // Listen for changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.tasks) {
          console.log('[BlockedPage] Tasks changed:', changes.tasks.newValue);
          renderTasks(changes.tasks.newValue);
      }
  });

  function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }
});
