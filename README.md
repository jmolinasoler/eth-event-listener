# Ethereum All-Events Listener

A simple yet robust Node.js application that connects to an Ethereum-compatible blockchain via a WebSocket provider and listens for all contract events in real-time.

This project uses `ethers.js` v6 and demonstrates the modern, recommended pattern for subscribing to all logs by listening for new blocks and then fetching the logs for each block.

## Features

-   **Real-time Event Listening**: Captures every event emitted on the network as new blocks are mined.
-   **Web UI**: A clean, modern web interface to visualize events as they happen in real-time.
-   **Ethers v6 Pattern**: Implements the `provider.on('block', ...)` and `provider.getLogs(...)` pattern, which is compatible with major RPC providers like Infura and Alchemy.
-   **Detailed Log Output**: Prints comprehensive details for each event, including block number, transaction hash, contract address, topics, and data.
-   **Robust Connection Handling**: Automatically attempts to reconnect if the WebSocket connection is dropped.
-   **Easy Configuration**: Uses a `.env` file to manage the RPC URL.

## Prerequisites

-   Node.js (v18.x or later recommended)
-   An Ethereum WebSocket (WSS) RPC URL. You can get one for free from services like:
    -   Infura
    -   Alchemy

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ethereum-event-listener.git
    cd ethereum-event-listener
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a new file named `.env` in the root of the project.

4.  **Configure your RPC URL:**
    Add your WebSocket RPC URL to the `.env` file. It should look like this:

    ```env
    # .env
    RPC_URL="wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID"
    ```
    > **Note:** Using a WebSocket (wss://) endpoint is crucial for the real-time functionality of this script. HTTP endpoints will not work for event subscriptions.

## Usage

Once the setup is complete, you can start the listener with the following command:

```bash
npm start
```

The application will connect to the provider and begin printing event data to the console as new blocks are finalized.

### Example Output

You will see detailed output for each event found in a new block, formatted like this:

```
==================== New Event Received ====================
Block Number:         18350000
Transaction Hash:     0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Contract Address:     0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
Transaction Index:    42
Log Index in Block:   137
Topics (indexed data):
  - Signature Hash:   0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  - Topic 1:          0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  - Topic 2:          0x000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
  - Topic 3:          N/A
Data (non-indexed):   0x000000000000000000000000000000000000000000000000000000000de0b6b3
------------------------------------------------------------
```

## How It Works

In `ethers.js` v5, it was common to listen for all events using `provider.on({}, listener)`. This functionality was removed in v6 because most public RPC providers do not support the underlying `eth_newFilter` JSON-RPC call with empty parameters for performance and stability reasons.

This script uses the modern, recommended approach:
1.  **`provider.on('block', ...)`**: A listener is attached to the provider to execute a callback every time a new block is mined.
2.  **`provider.getLogs({ fromBlock, toBlock })`**: Inside the callback, we use the new block's number to fetch all event logs that were included in that specific block.
3.  **Process Logs**: The script then iterates over the returned logs and prints the details for each one.

This method is more reliable and is fully supported by all major node providers.

## License

This project is licensed under the ISC License.