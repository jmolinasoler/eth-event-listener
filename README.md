# Ethereum All-Events Listener

A robust Node.js application that connects to an Ethereum-compatible blockchain via a WebSocket provider and listens for all contract events in real-time.

This project has been refactored to follow **Clean Architecture** principles and uses **TDD** with the native Node.js test runner.

## Features

- **Clean Architecture**: Modular design with Controllers, Services, and Repositories.
- **Dependency Injection**: Components are loosely coupled and testable.
- **Native Testing**: Uses `node:test` and `node:assert` for a lightweight testing experience.
- **Real-time Event Listening**: Captures every event emitted on the network as new blocks are mined.
- **Web UI**: A unique **Steampunk-themed** web interface to visualize events and manage ABIs.
- **ABI Management**: Upload and manage Contract ABIs to automatically decode events.

## Architecture

The project is organized into the following layers:

- **Controllers** (`src/controllers`): Handle HTTP requests (e.g., `AbiController`).
- **Services** (`src/services`): Contain business logic (e.g., `EthereumService`, `AbiService`).
- **Repositories** (`src/repositories`): Handle data access (e.g., `AbiRepository`).
- **Entry Point**: `src/server.js` wires everything together.

## Prerequisites

- Node.js (v18.x or later recommended)
- An Ethereum WebSocket (WSS) RPC URL (e.g., Infura, Alchemy).

## Installation & Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ethereum-event-listener.git
    cd ethereum-event-listener
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Configure Environment:**
    Create a `.env` file in the root directory:

    ```env
    RPC_URL="wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID"
    PORT=3000
    ```

## Usage

### Start the Application

```bash
npm start
```

The server will start at `http://localhost:3000`.

### Run Tests

Run the test suite using the native Node.js test runner:

```bash
npm test
```

## API Endpoints

- `GET /api/abis`: List all loaded ABIs.
- `POST /api/abis/upload`: Upload a new ABI JSON file.
- `DELETE /api/abis/:address`: Delete an ABI by contract address.

## License

MIT License
