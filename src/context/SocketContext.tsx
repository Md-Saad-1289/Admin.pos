import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface RealtimeAlert {
  id: string;
  type: 'payment' | 'shop' | 'subscription' | 'support' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  alerts: RealtimeAlert[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAlerts: () => void;
  toast: RealtimeAlert | null;
  dismissToast: () => void;
  refreshKey: number; // Increment to trigger refetches in components
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [toast, setToast] = useState<RealtimeAlert | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const addAlert = useCallback((type: RealtimeAlert['type'], title: string, message: string) => {
    const newAlert: RealtimeAlert = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setToast(newAlert);
    setRefreshKey((prev) => prev + 1);

    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      setToast((current) => (current?.id === newAlert.id ? null : current));
    }, 6000);
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const s = io(window.location.origin, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join_admin');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Realtime events
    s.on('NEW_PAYMENT_SUBMITTED', (data: any) => {
      addAlert(
        'payment',
        'New Payment Submitted',
        `Store "${data?.payment?.storeName || 'Shop'}" submitted ৳${data?.payment?.amount} via ${data?.payment?.method}.`
      );
    });

    s.on('payment_updated', (payment: any) => {
      setRefreshKey((prev) => prev + 1);
    });

    s.on('payment_status_changed', (data: any) => {
      addAlert(
        'payment',
        `Payment ${data?.status === 'approved' ? 'Approved' : 'Updated'}`,
        `Payment status changed to ${data?.status}.`
      );
    });

    s.on('admin_payment_approved', (data: any) => {
      addAlert(
        'payment',
        'Payment Approved',
        `Payment of ৳${data.amount} for store was approved.`
      );
    });

    s.on('store_updated', () => {
      setRefreshKey((prev) => prev + 1);
    });

    s.on('store_status_changed', (data: any) => {
      addAlert(
        'shop',
        `Shop ${data?.status === 'suspended' ? 'Suspended' : 'Activated'}`,
        `Shop status updated to ${data?.status}.`
      );
    });

    s.on('NEW_SUPPORT_TICKET', (ticket: any) => {
      addAlert(
        'support',
        'New Support Ticket',
        `Ticket #${ticket?._id ? ticket._id.slice(-4) : 'New'}: ${ticket?.subject || 'Support Request'}`
      );
    });

    s.on('ticket_updated', () => {
      setRefreshKey((prev) => prev + 1);
    });

    s.on('TICKET_REPLIED', (data: any) => {
      addAlert(
        'support',
        'Ticket Reply Added',
        `New reply sent on Ticket #${data?.ticketId ? data.ticketId.slice(-4) : ''}.`
      );
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [addAlert]);

  const markAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, read: true } : alert))
    );
  };

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const dismissToast = () => {
    setToast(null);
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        alerts,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAlerts,
        toast,
        dismissToast,
        refreshKey,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
