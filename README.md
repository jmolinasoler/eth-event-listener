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
    Create a `.env` file in the root directory (see `.env.example` for all options):

    ```env
    # Required for Ethereum features
    RPC_URL="wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID"
    
    # Server configuration
    PORT=3000
    NODE_ENV=development
    
    # Security configuration (optional, defaults shown)
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    CORS_ORIGIN=*
    ```

## Security Features

This application implements comprehensive security measures:

- **Environment Validation**: All environment variables are validated at startup
- **Input Validation**: Ethereum addresses validated with checksums, ABIs validated before saving
- **Rate Limiting**: 
  - General API: 100 requests/minute per IP
  - Upload endpoints: 20 requests/minute per IP
  - Delete endpoints: 10 requests/minute per IP
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, HSTS (production), etc.
- **CORS Protection**: Configurable origin validation
- **Request Sanitization**: Prevents XSS, clickjacking, and MIME sniffing attacks
- **Secure Logging**: Sensitive information (API keys) masked in logs

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

All API endpoints are protected with rate limiting and security headers.

- `GET /api/health`: Health check endpoint (not rate limited)
- `GET /api/abis`: List all loaded ABIs
- `POST /api/abis/upload`: Upload a new ABI JSON file (must be named `{address}.json`)
- `DELETE /api/abis/:address`: Delete an ABI by contract address

### Rate Limits

- General API endpoints: 100 requests per minute per IP
- Upload endpoint: 20 requests per minute per IP
- Delete endpoint: 10 requests per minute per IP

## Deployment

### Render.com

1. Fork this repository to your GitHub account.
2. Create a new **Web Service** on Render.com.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file (if you use Blueprints) or you can configure it manually:
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
5. **Important**: Add the `RPC_URL` environment variable in the Render dashboard with your Ethereum WebSocket URL.

## License

MIT License
