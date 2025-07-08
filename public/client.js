document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('events-container');
    const statusLight = document.getElementById('status-light');
    const statusText = document.getElementById('status-text');
    const filterInput = document.getElementById('filter-address');
    const clearButton = document.getElementById('clear-filter-btn');
    let placeholder = document.querySelector('.placeholder');

    function createEtherscanLink(type, value) {
        const shortValue = `${value.slice(0, 6)}...${value.slice(-4)}`;
        return `<a href="https://etherscan.io/${type}/${value}" target="_blank" rel="noopener noreferrer" class="etherscan-link" title="${value}">${shortValue}</a>`;
    }

    /**
     * Formats a raw uint256 string as a decimal string, assuming 18 decimals.
     * This is a heuristic for making token amounts human-readable.
     */
    function formatTokenAmount(value, decimals = 18) {
        if (!/^\d+$/.test(value)) return value; // Not a valid integer string

        let s = value.toString();

        // Pad with leading zeros if necessary
        if (s.length <= decimals) {
            s = '0'.repeat(decimals - s.length + 1) + s;
        }

        const wholePart = s.slice(0, -decimals);
        let fractionalPart = s.slice(-decimals).replace(/0+$/, ''); // Remove trailing zeros

        const formattedWhole = BigInt(wholePart).toLocaleString('en-US');

        if (fractionalPart === '') {
            return formattedWhole;
        }

        return `${formattedWhole}.${fractionalPart.slice(0, 6)}`; // Show up to 6 decimal places for readability
    }

    function formatValue(value) {
        if (typeof value === 'string') {
            // Check if it's an address
            if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
                return createEtherscanLink('address', value);
            }
            // Check if it's a long number string (likely a token amount)
            if (/^\d{10,}$/.test(value)) {
                try {
                    return BigInt(value).toLocaleString('en-US');
                } catch (e) { /* fall-through */ }
            }
        }
        if (typeof value === 'object' && value !== null) {
            return `<pre class="json-value">${JSON.stringify(value, null, 2)}</pre>`;
        }
        return value;
    }

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
        const contractLink = createEtherscanLink('address', log.address);
        const txLink = createEtherscanLink('tx', log.transactionHash);

        if (log.decoded) {
            // Render decoded event
            const argsHtml = Object.entries(log.decoded.args).map(([key, arg]) => {
                // For tuple-like results that are array-like, ethers gives both indexed and named keys.
                // We only want to show the named keys to avoid duplication.
                if (String(parseInt(key, 10)) === key) return '';

                let displayValue;
                // Heuristic for formatting token amounts based on type and name
                if (arg.type === 'uint256' && ['wad', 'amount', 'value'].includes(key.toLowerCase())) {
                    displayValue = formatTokenAmount(arg.value, 18);
                } else {
                    displayValue = formatValue(arg.value);
                }

                return `
                <div class="detail">
                    <div class="detail-label">${key}:</div>
                    <div class="detail-value">${displayValue}</div>
                </div>
            `}).join('');

            contentHtml = `
                <h2>Event: <span class="label">${log.decoded.name}</span></h2>
                <div class="detail">
                    <div class="detail-label">Contract:</div>
                    <div class="detail-value">${contractLink}</div>
                </div>
                <div class="detail">
                    <div class="detail-label">Signature:</div>
                    <div class="detail-value">${log.decoded.signature}</div>
                </div>
                <hr class="divider">
                <h3>Arguments:</h3>
                ${argsHtml}
                <hr class="divider">
                 <div class="detail">
                    <div class="detail-label">Tx Hash:</div>
                    <div class="detail-value">${txLink}</div>
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
                <h2>Block: <span class="label">${log.blockNumber.toLocaleString('en-US')}</span></h2>
                <div class="detail"><div class="detail-label">Contract:</div><div class="detail-value">${contractLink}</div></div>
                <div class="detail"><div class="detail-label">Tx Hash:</div><div class="detail-value">${txLink}</div></div>
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