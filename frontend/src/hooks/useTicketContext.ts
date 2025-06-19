import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/config';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedTo?: string;
  assignedToName?: string;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface InboxMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  type: string;
  status: string;
  createdAt: string;
}

interface TicketContextData {
  recentTickets: Ticket[];
  agentTickets: Ticket[];
  inboxMessages: InboxMessage[];
  loading: boolean;
  error: string | null;
}

export function useTicketContext(businessId: string, userId?: string) {
  const [data, setData] = useState<TicketContextData>({
    recentTickets: [],
    agentTickets: [],
    inboxMessages: [],
    loading: false,
    error: null
  });

  // Fetch recent tickets for context
  const fetchRecentTickets = useCallback(async () => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/tickets?businessId=${businessId}&limit=10&sortBy=updatedAt&order=desc`);
      
      if (response.ok) {
        const result = await response.json();
        return result.tickets || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching recent tickets:', error);
      return [];
    }
  }, [businessId]);

  // Fetch tickets assigned to specific agent
  const fetchAgentTickets = useCallback(async (agentId: string) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/tickets?businessId=${businessId}&assignedToId=${agentId}&limit=5`);
      
      if (response.ok) {
        const result = await response.json();
        return result.tickets || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching agent tickets:', error);
      return [];
    }
  }, [businessId]);

  // Fetch recent inbox messages
  const fetchInboxMessages = useCallback(async () => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/inbox?businessId=${businessId}&limit=5`);
      
      if (response.ok) {
        const result = await response.json();
        return result.messages || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching inbox messages:', error);
      return [];
    }
  }, [businessId]);

  // Fetch ticket by ticket number (for #TK-XXXXXX-XXX references)
  const fetchTicketByNumber = useCallback(async (ticketNumber: string) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/tickets/by-number/${ticketNumber}?businessId=${businessId}`);
      
      if (response.ok) {
        const result = await response.json();
        return result.ticket;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ticket by number:', error);
      return null;
    }
  }, [businessId]);

  // Extract ticket references from message content
  const extractTicketReferences = useCallback((content: string): string[] => {
    const ticketRegex = /#TK-[A-Z0-9]+-[A-Z0-9]{3}/g;
    const matches = content.match(ticketRegex);
    return matches ? matches.map(match => match.replace('#TK-', '')) : [];
  }, []);

  // Load all context data
  const loadContextData = useCallback(async (targetUserId?: string) => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [recentTickets, inboxMessages] = await Promise.all([
        fetchRecentTickets(),
        fetchInboxMessages()
      ]);

      let agentTickets: Ticket[] = [];
      if (targetUserId) {
        agentTickets = await fetchAgentTickets(targetUserId);
      }

      setData({
        recentTickets,
        agentTickets,
        inboxMessages,
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load context data'
      }));
    }
  }, [fetchRecentTickets, fetchInboxMessages, fetchAgentTickets]);

  // Refresh data when business or user changes
  useEffect(() => {
    if (businessId) {
      loadContextData(userId);
    }
  }, [businessId, userId, loadContextData]);

  return {
    ...data,
    fetchTicketByNumber,
    extractTicketReferences,
    refreshData: () => loadContextData(userId),
    loadAgentContext: (agentId: string) => loadContextData(agentId)
  };
}