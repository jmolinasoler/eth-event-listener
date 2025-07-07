document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('events-container');
    const statusLight = document.getElementById('status-light');
    const statusText = document.getElementById('status-text');
    let placeholder = document.querySelector('.placeholder');

    function connect() {
        // Use wss:// if the page is served over https, otherwise ws://
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const ws = new WebSocket(`${protocol}${window.location.host}`);

        ws.onopen = () => {
            console.log('WebSocket connection established');
            statusLight.className = 'connected';
            statusText.textContent = 'Connected';
        };

        ws.onmessage = (event) => {
            if (placeholder) {
                placeholder.remove();
                placeholder = null; // Ensure it's only removed once
            }
            const log = JSON.parse(event.data);
            createEventCard(log);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed. Reconnecting in 5 seconds...');
            statusLight.className = 'disconnected';
            statusText.textContent = 'Disconnected. Retrying...';
            setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusText.textContent = 'Connection Error';
            ws.close();
        };
    }

    function createEventCard(log) {
        const card = document.createElement('div');
        card.className = 'event-card';

        const topicsHtml = log.topics.map((topic, i) => `
            <div class="detail">
                <div class="detail-label">Topic ${i}:</div>
                <div class="detail-value">${topic || 'N/A'}</div>
            </div>
        `).join('');

        card.innerHTML = `
            <h2>Block: <span class="label">${log.blockNumber}</span></h2>
            <div class="detail">
                <div class="detail-label">Contract Address:</div>
                <div class="detail-value">${log.address}</div>
            </div>
            <div class="detail">
                <div class="detail-label">Transaction Hash:</div>
                <div class="detail-value">${log.transactionHash}</div>
            </div>
            ${topicsHtml}
            <div class="detail">
                <div class="detail-label">Data:</div>
                <div class="detail-value">${log.data.length > 258 ? log.data.slice(0, 258) + '...' : log.data}</div>
            </div>
        `;

        container.prepend(card);
    }

    connect();
});