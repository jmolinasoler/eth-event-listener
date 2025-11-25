export class WebSocketService {
    constructor(wss) {
        this.wss = wss;
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        for (const client of this.wss.clients) {
            if (client.readyState === 1) { // WebSocket.OPEN is 1
                client.send(message);
            }
        }
    }
}
