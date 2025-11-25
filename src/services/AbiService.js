export class AbiService {
    constructor(abiRepository, webSocketService) {
        this.abiRepository = abiRepository;
        this.webSocketService = webSocketService;
    }

    async loadAbi(address, abi) {
        await this.abiRepository.save(address, abi);

        this.webSocketService.broadcast({
            type: 'abi_updated',
            address: address,
            timestamp: new Date().toISOString()
        });

        return { success: true, address };
    }

    async deleteAbi(address) {
        await this.abiRepository.delete(address);

        this.webSocketService.broadcast({
            type: 'abi_removed',
            address: address,
            timestamp: new Date().toISOString()
        });

        return { success: true };
    }

    async getAbis() {
        return this.abiRepository.getAll();
    }
}
