import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_booking_id: string | null;
  related_slot_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50); // Keep it sane for MVP

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotifications();

    if (!profile) return;

    // Set up Realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`,
        },
        () => {
          // Simplest is to just refetch to ensure order and limits are respected, 
          // or we can optimistically update the state. Refetching is safer for MVP.
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      console.error('Error marking as read:', err);
      fetchNotifications(); // Revert on error
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    } catch (err) {
      console.error('Error marking all as read:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      setNotifications(prev => {
        const item = prev.find(n => n.id === id);
        if (item && !item.is_read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n.id !== id);
      });

      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting notification:', err);
      fetchNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
}
