import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert,
} from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { useAuth } from '../AuthContext';

export default function HrLeavesScreen() {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission('leaves:approve');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (filter) params.status = filter;
      const { data } = await api.get('/leaves', { params });
      setLeaves(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    Alert.alert(
      action === 'approved' ? 'Approve Leave' : 'Reject Leave',
      `Are you sure you want to ${action === 'approved' ? 'approve' : 'reject'} this request?`,
      [
        { text: 'Cancel' },
        {
          text: action === 'approved' ? 'Approve' : 'Reject',
          style: action === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessing(id);
            try {
              await api.post(`/leaves/${id}/approve`, { status: action });
              fetch();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed');
            }
            setProcessing(null);
          },
        },
      ],
    );
  };

  const statusEmoji: Record<string, string> = { pending: '⏳', approved: '✅', rejected: '❌' };
  const typeEmoji: Record<string, string> = { sick: '🤒', annual: '🏖️', emergency: '🚨', personal: '📋', unpaid: '💼' };
  const statusColor: Record<string, string> = { pending: COLORS.warning, approved: COLORS.success, rejected: COLORS.destructive };

  const renderItem = ({ item }: { item: any }) => {
    const emp = item.employeeId;
    const isPending = item.status === 'pending';
    return (
      <View style={[s.card, isPending && { borderLeftColor: COLORS.warning, borderLeftWidth: 3 }]}>
        <View style={s.row}>
          <Text style={s.emoji}>{typeEmoji[item.type] || '📋'}</Text>
          <View style={s.info}>
            <Text style={s.name}>{emp?.name || 'Unknown'}</Text>
            <Text style={s.type}>{item.type} • {item.days} day{item.days > 1 ? 's' : ''}</Text>
            <Text style={s.dates}>📅 {new Date(item.startDate).toLocaleDateString()} → {new Date(item.endDate).toLocaleDateString()}</Text>
            {item.reason ? <Text style={s.reason} numberOfLines={2}>{item.reason}</Text> : null}
          </View>
          <View style={[s.badge, { backgroundColor: statusColor[item.status] + '20' }]}>
            <Text style={[s.badgeText, { color: statusColor[item.status] }]}>{statusEmoji[item.status]} {item.status}</Text>
          </View>
        </View>

        {isPending && canApprove && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: COLORS.success }]}
              onPress={() => handleAction(item._id, 'approved')}
              disabled={processing === item._id}
            >
              <Text style={s.btnText}>{processing === item._id ? '...' : '✓ Approve'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: COLORS.destructive }]}
              onPress={() => handleAction(item._id, 'rejected')}
              disabled={processing === item._id}
            >
              <Text style={s.btnText}>✕ Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {!canApprove ? (
        <View style={s.center}><Text style={s.emptyText}>No permission to approve leaves</Text></View>
      ) : (
      <>
      <View style={s.header}>
        <Text style={s.heading}>📋 Leave Requests</Text>
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {[{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, filter === f.value && s.filterActive]}
            onPress={() => { setFilter(f.value); setLoading(true); }}
          >
            <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
              <Text style={s.emptyText}>No leave requests</Text>
            </View>
          }
        />
      )}
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  emoji: { fontSize: 28, marginTop: 2 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  type: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  dates: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  reason: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border + '40' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});
