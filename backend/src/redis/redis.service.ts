import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Subject } from 'rxjs';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private publisher: Redis;
    private subscriber: Redis;
    private readonly messageSubject = new Subject<{ channel: string; message: string }>();

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const host = this.configService.get('REDIS_HOST', 'localhost');
        const port = this.configService.get('REDIS_PORT', 6379);

        this.publisher = new Redis({ host, port });
        this.subscriber = new Redis({ host, port });

        this.subscriber.on('message', (channel, message) => {
            this.messageSubject.next({ channel, message });
        });
    }

    async publish(channel: string, message: any) {
        await this.publisher.publish(channel, JSON.stringify(message));
    }

    async subscribe(channel: string) {
        await this.subscriber.subscribe(channel);
    }

    async storeMessage(key: string, message: any) {
        // Store the last 100 messages in a Redis list
        await this.publisher.lpush(key, JSON.stringify(message));
        await this.publisher.ltrim(key, 0, 99);
    }

    async getHistory(key: string) {
        const messages = await this.publisher.lrange(key, 0, -1);
        return messages.map(m => JSON.parse(m)).reverse();
    }

    getMessageStream() {
        return this.messageSubject.asObservable();
    }

    onModuleDestroy() {
        this.publisher.quit();
        this.subscriber.quit();
    }
}
