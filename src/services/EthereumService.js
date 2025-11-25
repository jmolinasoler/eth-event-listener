import { ethers } from 'ethers';

export class EthereumService {
    constructor(rpcUrl, abiRepository, webSocketService) {
        this.rpcUrl = rpcUrl;
        this.abiRepository = abiRepository;
        this.webSocketService = webSocketService;
        this.provider = null;
    }

    connect() {
        console.log(`Connecting to Ethereum provider: ${this.rpcUrl}...`);
        this.provider = new ethers.WebSocketProvider(this.rpcUrl);

        this.provider.on("block", (blockNumber) => this.handleBlock(blockNumber));

        this.provider.websocket.on('open', () => {
            console.log('Provider connected. Listening for all new events...');
        });

        this.provider.websocket.on('close', (code) => {
            console.error(`WebSocket disconnected with code ${code}. Reconnecting...`);
            this.provider.removeAllListeners();
            setTimeout(() => this.connect(), 5000);
        });

        this.provider.websocket.on('error', (err) => {
            console.error("WebSocket error:", err.message);
        });
    }

    async handleBlock(blockNumber) {
        try {
            const logs = await this.provider.getLogs({ fromBlock: blockNumber, toBlock: blockNumber });
            for (const log of logs) {
                await this.processLog(log);
            }
        } catch (e) {
            console.error(`Error fetching logs for block ${blockNumber}:`, e);
        }
    }

    async processLog(log) {
        const formattedLog = {
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            address: log.address,
            transactionIndex: log.transactionIndex,
            logIndex: log.logIndex,
            topics: [...log.topics], // Ensure array copy
            data: log.data,
            timestamp: new Date().toISOString(),
            decoded: null,
        };

        const contractAddress = log.address.toLowerCase();
        // Since AbiRepository returns the ABI JSON object, we need to create an Interface
        // We could cache Interfaces in the Service or Repository. 
        // For now, let's create it on the fly or improve Repository to return Interface.
        // Given the requirement for "Clean Architecture", the Repository should return data (ABI).
        // The Service should handle logic (creating Interface).

        const abi = await this.abiRepository.get(contractAddress);
        if (abi) {
            try {
                const iface = new ethers.Interface(abi);
                const parsedLog = iface.parseLog({ topics: [...log.topics], data: log.data });
                if (parsedLog) {
                    const args = {};
                    parsedLog.fragment.inputs.forEach((input, index) => {
                        let value = parsedLog.args[index];
                        if (typeof value === 'bigint') {
                            value = value.toString();
                        }
                        args[input.name] = {
                            value: value,
                            type: input.type
                        };
                    });
                    formattedLog.decoded = { name: parsedLog.name, signature: parsedLog.signature, args: args };
                }
            } catch (e) {
                // Ignore decoding errors
            }
        }

        console.log(`Broadcasting event from block ${log.blockNumber} for contract ${log.address}`);
        this.webSocketService.broadcast(formattedLog);
    }
}
