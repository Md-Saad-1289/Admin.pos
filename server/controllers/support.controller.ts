import { Response } from 'express';
import { SupportTicketModel, StoreModel, AuditLogModel } from '../models/index.ts';
import { isDbConnected, fallbackStore, changeStreamEmitter } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';

export async function getSupportTickets(req: AdminAuthRequest, res: Response) {
  const { search = '', status = '', priority = '' } = req.query;

  try {
    if (isDbConnected()) {
      const query: any = {};
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (search) {
        query.$or = [
          { subject: new RegExp(search as string, 'i') },
          { message: new RegExp(search as string, 'i') },
        ];
      }

      const tickets = await SupportTicketModel.find(query).sort({ updatedAt: -1 });
      const stores = await StoreModel.find();

      const enhanced = tickets.map((t) => {
        const store = stores.find((s) => s._id.toString() === t.storeId);
        return {
          _id: t._id.toString(),
          storeId: t.storeId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          subject: t.subject,
          message: t.message,
          priority: t.priority,
          status: t.status,
          replies: t.replies,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });

      return res.json({ success: true, tickets: enhanced });
    } else {
      let filtered = [...fallbackStore.supportTickets];
      if (status) filtered = filtered.filter((t) => t.status === status);
      if (priority) filtered = filtered.filter((t) => t.priority === priority);
      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          (t) => t.subject.toLowerCase().includes(q) || t.message.toLowerCase().includes(q)
        );
      }

      const enhanced = filtered.map((t) => {
        const store = fallbackStore.stores.find((s) => s._id === t.storeId);
        return {
          ...t,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        };
      });

      return res.json({ success: true, tickets: enhanced });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch tickets' });
  }
}

export async function getSupportTicketDetails(req: AdminAuthRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isDbConnected()) {
      const ticket = await SupportTicketModel.findById(id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const store = await StoreModel.findById(ticket.storeId);
      return res.json({
        success: true,
        ticket: {
          _id: ticket._id.toString(),
          storeId: ticket.storeId,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
          subject: ticket.subject,
          message: ticket.message,
          priority: ticket.priority,
          status: ticket.status,
          replies: ticket.replies,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
      });
    } else {
      const ticket = fallbackStore.supportTickets.find((t) => t._id === id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const store = fallbackStore.stores.find((s) => s._id === ticket.storeId);
      return res.json({
        success: true,
        ticket: {
          ...ticket,
          storeName: store?.name || 'Shop',
          ownerName: store?.ownerName || 'Owner',
        },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch ticket' });
  }
}

export async function createSupportTicket(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const { storeId, subject, message, priority = 'Medium' } = req.body;

  if (!storeId || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Store, subject, and message are required' });
  }

  try {
    if (isDbConnected()) {
      const ticket = await SupportTicketModel.create({
        storeId,
        subject,
        message,
        priority,
        status: 'Open',
        replies: [],
      });

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Create ticket',
        targetId: ticket._id.toString(),
        details: { subject, storeId },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('NEW_SUPPORT_TICKET', ticket);
      return res.status(201).json({ success: true, ticket });
    } else {
      const ticket = {
        _id: 'ticket_' + Date.now(),
        storeId,
        subject,
        message,
        priority: priority as any,
        status: 'Open' as const,
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fallbackStore.supportTickets.unshift(ticket);

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Create ticket',
        targetId: ticket._id,
        details: { subject, storeId },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('NEW_SUPPORT_TICKET', ticket);
      return res.status(201).json({ success: true, ticket });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create ticket' });
  }
}

export async function replySupportTicket(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message cannot be empty' });
  }

  try {
    const replyItem = {
      id: 'rep_' + Date.now(),
      senderRole: 'admin' as const,
      senderName: admin.name,
      message: message.trim(),
      createdAt: new Date(),
    };

    if (isDbConnected()) {
      const ticket = await SupportTicketModel.findById(id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      ticket.replies.push(replyItem);
      ticket.updatedAt = new Date();
      await ticket.save();

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Reply to support ticket',
        targetId: id,
        details: { replyPreview: message.slice(0, 50) },
        timestamp: new Date(),
      });

      changeStreamEmitter.emit('TICKET_REPLIED', { ticketId: id, reply: replyItem });
      return res.json({ success: true, ticket, reply: replyItem });
    } else {
      const ticket = fallbackStore.supportTickets.find((t) => t._id === id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      ticket.replies.push({
        ...replyItem,
        createdAt: replyItem.createdAt.toISOString() as any,
      });
      ticket.updatedAt = new Date().toISOString();

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Reply to support ticket',
        targetId: id,
        details: { replyPreview: message.slice(0, 50) },
        timestamp: new Date().toISOString(),
      });

      changeStreamEmitter.emit('TICKET_REPLIED', { ticketId: id, reply: replyItem });
      return res.json({ success: true, ticket, reply: replyItem });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to reply to ticket' });
  }
}

export async function updateTicketStatus(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const id = req.params.id as string;
  const { status, priority } = req.body;

  try {
    if (isDbConnected()) {
      const ticket = await SupportTicketModel.findById(id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      if (status) ticket.status = status;
      if (priority) ticket.priority = priority;
      ticket.updatedAt = new Date();
      await ticket.save();

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update ticket status',
        targetId: id,
        details: { status, priority },
        timestamp: new Date(),
      });

      return res.json({ success: true, ticket });
    } else {
      const ticket = fallbackStore.supportTickets.find((t) => t._id === id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      if (status) ticket.status = status;
      if (priority) ticket.priority = priority;
      ticket.updatedAt = new Date().toISOString();

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update ticket status',
        targetId: id,
        details: { status, priority },
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true, ticket });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update ticket' });
  }
}
