document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('events-container');
    const statusLight = document.getElementById('status-light');
    const statusText = document.getElementById('status-text');
    const filterInput = document.getElementById('filter-address');
    const clearButton = document.getElementById('clear-filter-btn');
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
            const card = createEventCard(log);

            // Hide card immediately if it doesn't match the current filter
            const filterValue = filterInput.value.trim().toLowerCase();
            if (filterValue && !log.address.toLowerCase().includes(filterValue)) {
                card.classList.add('hidden');
            }
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
        card.dataset.address = log.address.toLowerCase();

        let contentHtml = '';

        if (log.decoded) {
            // Render decoded event
            const argsHtml = Object.entries(log.decoded.args).map(([key, value]) => `
                <div class="detail">
                    <div class="detail-label">${key}:</div>
                    <div class="detail-value">${value}</div>
                </div>
            `).join('');

            contentHtml = `
                <h2>Event: <span class="label">${log.decoded.name}</span></h2>
                <div class="detail">
                    <div class="detail-label">Contract:</div>
                    <div class="detail-value">${log.address}</div>
                </div>
                <div class="detail">
                    <div class="detail-label">Signature:</div>
                    <div class="detail-value">${log.decoded.signature}</div>
                </div>
                <hr class="divider">
                <h3>Arguments</h3>
                ${argsHtml}
                <hr class="divider">
                 <div class="detail">
                    <div class="detail-label">Tx Hash:</div>
                    <div class="detail-value">${log.transactionHash}</div>
                </div>
            `;
        } else {
            // Render raw event (existing logic)
            const topicsHtml = log.topics.map((topic, i) => `
                <div class="detail">
                    <div class="detail-label">Topic ${i}:</div>
                    <div class="detail-value">${topic || 'N/A'}</div>
                </div>
            `).join('');

            contentHtml = `
                <h2>Block: <span class="label">${log.blockNumber}</span></h2>
                <div class="detail"><div class="detail-label">Contract:</div><div class="detail-value">${log.address}</div></div>
                <div class="detail"><div class="detail-label">Tx Hash:</div><div class="detail-value">${log.transactionHash}</div></div>
                ${topicsHtml}
                <div class="detail"><div class="detail-label">Data:</div><div class="detail-value">${log.data.length > 258 ? log.data.slice(0, 258) + '...' : log.data}</div></div>
            `;
        }

        card.innerHTML = contentHtml;

        container.prepend(card);
        return card;
    }

    function applyFilter() {
        const filterValue = filterInput.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.event-card');

        cards.forEach(card => {
            const cardAddress = card.dataset.address;
            if (!filterValue || cardAddress.includes(filterValue)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    filterInput.addEventListener('input', applyFilter);
    clearButton.addEventListener('click', () => {
        filterInput.value = '';
        applyFilter();
    });

    connect();
});