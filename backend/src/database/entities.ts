import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';

export enum UserStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column({ select: false })
    password: string;

    @Column({ default: UserStatus.OFFLINE })
    status: UserStatus;

    @CreateDateColumn()
    createdAt: Date;
}

@Entity('chat_rooms')
export class ChatRoom {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ['one-to-one', 'group'], default: 'one-to-one' })
    type: string;

    @CreateDateColumn()
    createdAt: Date;
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    content: string;

    @ManyToOne(() => User)
    sender: User;

    @Column()
    senderId: string;

    @ManyToOne(() => User, { nullable: true })
    receiver: User;

    @Column({ nullable: true })
    receiverId: string;

    @ManyToOne(() => ChatRoom)
    room: ChatRoom;

    @Column()
    roomId: string;

    @CreateDateColumn()
    createdAt: Date;
}
