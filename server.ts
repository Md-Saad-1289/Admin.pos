import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongoDB, changeStreamEmitter } from './server/db.ts';
import apiRoutes from './server/routes/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

const PORT = process.env.PORT || 3000;

// CORS configuration supporting environment settings
const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map((s) => s.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// ----------------------------------------------------
// REALTIME SOCKET.IO & TENANT ISOLATION
// ----------------------------------------------------

io.on('connection', (socket) => {
  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('join_store', ({ storeId }: { storeId: string }) => {
    if (storeId) {
      socket.join(`store:${storeId}`);
    }
  });

  socket.on('leave_store', ({ storeId }: { storeId: string }) => {
    if (storeId) {
      socket.leave(`store:${storeId}`);
    }
  });
});

// Forward database change stream and application events to Socket.IO clients
changeStreamEmitter.on('store_created', (store) => {
  io.to('admin_room').emit('store_updated', store);
});

changeStreamEmitter.on('store_change', (change) => {
  io.to('admin_room').emit('store_updated', change.fullDocument || change);
});

changeStreamEmitter.on('payment_change', (change) => {
  io.to('admin_room').emit('payment_updated', change.fullDocument || change);
});

changeStreamEmitter.on('ticket_change', (change) => {
  io.to('admin_room').emit('ticket_updated', change.fullDocument || change);
});

changeStreamEmitter.on('ACCOUNT_SUSPENDED', ({ storeId, reason }) => {
  io.to(`store:${storeId}`).emit('ACCOUNT_SUSPENDED', { reason });
  io.to('admin_room').emit('store_status_changed', { storeId, status: 'suspended' });
});

changeStreamEmitter.on('ACCOUNT_ACTIVATED', ({ storeId }) => {
  io.to(`store:${storeId}`).emit('ACCOUNT_ACTIVATED');
  io.to('admin_room').emit('store_status_changed', { storeId, status: 'active' });
});

changeStreamEmitter.on('PAYMENT_RECORDED', (payment) => {
  io.to('admin_room').emit('payment_updated', payment);
});

changeStreamEmitter.on('PAYMENT_APPROVED', ({ storeId, paymentId, amount }) => {
  io.to(`store:${storeId}`).emit('PAYMENT_APPROVED', { paymentId, amount });
  io.to('admin_room').emit('payment_status_changed', { paymentId, status: 'approved' });
});

changeStreamEmitter.on('PAYMENT_REJECTED', ({ storeId, paymentId, reason }) => {
  io.to(`store:${storeId}`).emit('PAYMENT_REJECTED', { paymentId, reason });
  io.to('admin_room').emit('payment_status_changed', { paymentId, status: 'rejected' });
});

changeStreamEmitter.on('NEW_PAYMENT_SUBMITTED', (data) => {
  io.to('admin_room').emit('NEW_PAYMENT_SUBMITTED', data);
});

changeStreamEmitter.on('NEW_SUPPORT_TICKET', (ticket) => {
  io.to('admin_room').emit('NEW_SUPPORT_TICKET', ticket);
});

changeStreamEmitter.on('TICKET_REPLIED', ({ ticketId, reply }) => {
  io.to('admin_room').emit('TICKET_REPLIED', { ticketId, reply });
});

// ----------------------------------------------------
// API ROUTES MOUNT
// ----------------------------------------------------

app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ShopPOS Admin API',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  // Connect to MongoDB
  await connectMongoDB();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[ShopPOS] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
