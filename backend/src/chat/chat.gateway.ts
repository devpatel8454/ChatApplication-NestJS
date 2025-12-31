import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, OnModuleInit } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { RedisService } from '../redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Message, ChatRoom, UserStatus } from '../database/entities';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, string>(); // userId -> socketId

    constructor(
        private redisService: RedisService,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Message) private messageRepository: Repository<Message>,
        @InjectRepository(ChatRoom) private roomRepository: Repository<ChatRoom>,
    ) { }

    onModuleInit() {
        // Subscribe to Redis messages for cross-server communication
        this.redisService.subscribe('chat_events');
        this.redisService.getMessageStream().subscribe(({ channel, message }) => {
            if (channel === 'chat_events') {
                try {
                    const { type, data } = JSON.parse(message);
                    this.handleRemoteEvent(type, data);
                } catch (e) {
                    console.error('Failed to parse redis message', e);
                }
            }
        });
    }

    async handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        const userId = [...this.connectedUsers.entries()].find(([_, socketId]) => socketId === client.id)?.[0];
        if (userId) {
            this.connectedUsers.delete(userId);
            await this.userRepository.update(userId, { status: UserStatus.OFFLINE });

            // Notify other servers via Redis
            await this.redisService.publish('chat_events', {
                type: 'user:offline',
                data: userId
            });

            this.server.emit('user:offline', userId);
        }
        console.log(`Client disconnected: ${client.id}`);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('user:init')
    async handleInit(@ConnectedSocket() client: Socket) {
        const user = client['user'];
        const userId = user.sub;
        this.connectedUsers.set(userId, client.id);

        await this.userRepository.update(userId, { status: UserStatus.ONLINE });
        const fullUser = await this.userRepository.findOne({ where: { id: userId } });
        const { password: _, ...userToEmit } = fullUser;

        // Notify other servers via Redis
        await this.redisService.publish('chat_events', {
            type: 'user:online',
            data: userToEmit
        });

        // Notify local clients
        this.server.emit('user:online', userToEmit);

        // Send current online users
        const onlineUsers = await this.userRepository.find({ where: { status: UserStatus.ONLINE } });
        return onlineUsers.map(u => {
            const { password: _, ...result } = u;
            return result;
        });
    }

    private getChatKey(id1: string, id2: string) {
        return `chat:history:${[id1, id2].sort().join(':')}`;
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('message:send')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: SendMessageDto,
    ) {
        const sender = client['user'];
        const senderId = sender.sub;
        const receiverId = data.receiverId;

        const savedMessage = {
            id: Date.now().toString(),
            content: data.content,
            senderId,
            receiverId,
            createdAt: new Date(),
        };

        // 1. Store in Redis for persistence across refreshes
        const chatKey = this.getChatKey(senderId, receiverId);
        await this.redisService.storeMessage(chatKey, savedMessage);

        // 2. Publish to Redis for other servers/instances
        await this.redisService.publish('chat_events', {
            type: 'message:new',
            data: {
                ...savedMessage,
                senderUsername: sender.username,
            }
        });

        // 3. Also save to DB in background (optional, but good for long-term)
        this.messageRepository.save({
            content: data.content,
            senderId,
            receiverId,
        }).catch(err => console.error('Failed to save message to DB', err));

        return savedMessage;
    }

    private handleRemoteEvent(type: string, data: any) {
        switch (type) {
            case 'message:new':
                const targetSocketId = this.connectedUsers.get(data.receiverId);
                const senderSocketId = this.connectedUsers.get(data.senderId);

                // Emit to receiver if on this server
                if (targetSocketId) {
                    this.server.to(targetSocketId).emit('message:new', data);
                }

                // Emit back to sender if on this server
                if (senderSocketId) {
                    this.server.to(senderSocketId).emit('message:new', data);
                }
                break;

            case 'user:online':
                // Broadcast to all local clients except the one who just joined (already handled locally)
                this.server.emit('user:online', data);
                break;

            case 'user:offline':
                // Broadcast to all local clients
                this.server.emit('user:offline', data);
                break;
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('message:history')
    async handleHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { receiverId: string },
    ) {
        const senderId = client['user'].sub;
        const chatKey = this.getChatKey(senderId, data.receiverId);

        // Fetch from Redis
        const history = await this.redisService.getHistory(chatKey);
        return history;
    }
}
