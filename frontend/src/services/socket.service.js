import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect(token, url = 'http://192.168.29.185:3000') {
        this.socket = io(url, {
            auth: { token },
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket() {
        return this.socket;
    }

    emit(event, data) {
        return new Promise((resolve, reject) => {
            if (!this.socket) return reject('Socket not connected');
            this.socket.emit(event, data, (response) => {
                if (response?.error) reject(response.error);
                else resolve(response);
            });
        });
    }

    on(event, callback) {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    off(event) {
        if (!this.socket) return;
        this.socket.off(event);
    }
}

export const socketService = new SocketService();
