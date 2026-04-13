import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert,
} from 'react-native';
import api from '../api';
import { COLORS } from '../constants';

const typeEmojis: Record<string, string> = {
  announcement: '📢',
  system: 'ℹ️',
  task: '✅',
  leave: '🏖️',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<string>('');

  const fetch = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (filter) params.filter = filter;
      const { data } = await api.get('/notifications', { params });
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  // Poll every 30s
  useEffect(() => {
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [fetch]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotif = (id: string) => {
    Alert.alert('Delete', 'Remove this notification?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/notifications/${id}`);
          setNotifications(prev => prev.filter(n => n._id !== id));
        } catch {}
      }},
    ]);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[s.item, !item.isRead && s.itemUnread]}
      onPress={() => !item.isRead && markRead(item._id)}
      onLongPress={() => deleteNotif(item._id)}
      activeOpacity={0.7}
    >
      <View style={[s.iconWrap, !item.isRead ? s.iconUnread : s.iconRead]}>
        <Text style={{ fontSize: 18 }}>{typeEmojis[item.type] || '🔔'}</Text>
      </View>
      <View style={s.content}>
        <View style={s.titleRow}>
          <Text style={[s.title, !item.isRead && s.titleBold]} numberOfLines={1}>{item.title}</Text>
          {!item.isRead && <View style={s.dot} />}
        </View>
        <Text style={s.msg} numberOfLines={2}>{item.message}</Text>
        <View style={s.meta}>
          <View style={s.badge}><Text style={s.badgeText}>{item.type}</Text></View>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>🔔 Notifications</Text>
          <Text style={s.sub}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
            <Text style={s.markAllText}>✓ Read All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {[{ label: 'All', value: '' }, { label: 'Unread', value: 'unread' }, { label: 'Read', value: 'read' }].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, filter === f.value && s.filterActive]}
            onPress={() => { setFilter(f.value); setLoading(true); }}
          >
            <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
            {f.value === 'unread' && unreadCount > 0 && (
              <View style={s.filterBadge}><Text style={s.filterBadgeText}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔕</Text>
              <Text style={s.emptyText}>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  markAllBtn: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  markAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  filterBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' },
  itemUnread: { backgroundColor: COLORS.primary + '08' },
  iconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  iconUnread: { backgroundColor: COLORS.primary + '20' },
  iconRead: { backgroundColor: COLORS.surface },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 14, color: COLORS.text },
  titleBold: { fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  msg: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  time: { fontSize: 10, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});
