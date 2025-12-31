# Real-Time Scalable Chat Application

A high-performance, scalable real-time chat application built with **NestJS** (Backend) and **React + Vite** (Frontend). This project demonstrates a multi-server architecture where chat instances are synchronized using **Redis Pub/Sub**, allowing users connected to different server instances to communicate seamlessly.

## 🚀 Features

- **Real-Time Messaging**: Instant message delivery using WebSockets (Socket.io).
- **Scalable Architecture**: Supports horizontal scaling. Multiple backend instances communicate via Redis.
- **User Status**: Real-time Online/Offline status tracking.
- **Message Persistence**:
  - **Hot Data**: Recent chat history stored in Redis for fast access.
  - **Cold Data**: Permanent storage in PostgreSQL.
- **Authentication**: Secure JWT-based authentication for WebSocket connections.
- **Modern Frontend**: Built with React 19, Vite, and Framer Motion for smooth animations.

## 🛠️ Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Real-time Engine**: Socket.io
- **Database**: PostgreSQL (with TypeORM)
- **Caching & Pub/Sub**: Redis (ioredis)
- **Authentication**: Passport & JWT

### Frontend
- **Framework**: React 19 (via Vite)
- **Styling**: CSS / Lucide React (Icons)
- **Animations**: Framer Motion
- **State Management**: React Hooks

## 📋 Prerequisites

Ensure you have the following installed:
- **Node.js** (v18+)
- **PostgreSQL**
- **Redis**

## ⚙️ Installation & Setup

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Configure Environment Variables:
Create a `.env` file in the `backend` directory with the following (adjust values as needed):
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=chat_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_key
```

Run the backend:
```bash
# Development mode
npm run start:dev

# OR Run multiple instances (Windows PowerShell)
./start-multi.ps1
```

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run the frontend:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## 🏗️ Architecture Highlights

### Multi-Server Synchronization
The application uses Redis Pub/Sub to broadcast events across multiple backend instances.
1. **User A** connects to **Server 1**.
2. **User B** connects to **Server 2**.
3. When User A sends a message, Server 1 publishes it to the `chat_events` Redis channel.
4. Server 2 subscribes to `chat_events`, receives the message, and delivers it to User B.

### Data Flow
1. **WebSocket Connection**: Client establishes a persistent connection with JWT auth.
2. **Message Handling**:
   - Incoming messages are validated.
   - Stored in Redis (for history) and PostgreSQL (for persistence).
   - Published to Redis channel.
3. **Event Broadcasting**: Other server instances pick up the event and emit it to relevant connected clients.

## 📜 Scripts

- **`start-multi.ps1`**: A PowerShell script to spawn 3 backend instances on ports `3000`, `3001`, and `3002` for testing scalability locally.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
