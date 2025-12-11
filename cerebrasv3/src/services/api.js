/**
 * Simulates fetching window content from an API.
 * @param {string} windowId
 * @returns {Promise<{html: string}>}
 */
export const fetchWindowContent = async (windowId) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockContent = {
    'window-1': `
      <style>
        body { font-family: sans-serif; padding: 20px; color: #333; }
        h1 { color: #646cff; }
        button { padding: 10px 20px; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #535bf2; }
      </style>
      <h1>Welcome to Window 1</h1>
      <p>This content is loaded from a mock API.</p>
      <button id="btn">Click Me</button>
      <script>
        document.getElementById('btn').addEventListener('click', () => {
          alert('Hello from Window 1 script!');
        });
      </script>
    `,
    'window-2': `
      <style>
        body { background: #f0f0f0; padding: 20px; text-align: center; }
        .clock { font-size: 48px; font-weight: bold; color: #333; margin-top: 20px; }
      </style>
      <h2>Digital Clock</h2>
      <div class="clock" id="clock">Loading...</div>
      <script>
        function updateClock() {
          const now = new Date();
          document.getElementById('clock').innerText = now.toLocaleTimeString();
        }
        setInterval(updateClock, 1000);
        updateClock();
      </script>
    `,
    'default': `
      <div style="padding: 20px; text-align: center;">
        <h3>Content Not Found</h3>
      </div>
    `
  };

  return {
    html: mockContent[windowId] || mockContent['default']
  };
};
