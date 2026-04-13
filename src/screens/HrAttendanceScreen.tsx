import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

const FILTERS = ['All', 'Present', 'Absent', 'Late'];

export default function HrAttendanceScreen() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('hr:attendance');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    try {
      const params: any = { date };
      if (filter === 'Present') params.status = 'present';
      if (filter === 'Absent') params.status = 'absent';
      if (filter === 'Late') params.status = 'late';
      const r = await api.get('/hr/attendance', { params });
      setRecords(r.data.data || r.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [filter, date]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const statusColor = (r: any) => {
    if (!r.checkIn) return COLORS.destructive;
    if (r.isLate) return COLORS.warning;
    return COLORS.success;
  };

  const statusLabel = (r: any) => {
    if (!r.checkIn) return 'Absent';
    if (r.isLate) return 'Late';
    return 'Present';
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!canView) return <View style={s.center}><Text style={s.empty}>No permission to view HR attendance</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Date & Filter */}
        <View style={s.dateRow}>
          <Text style={s.dateLabel}>📅 {date}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {records.length === 0 ? (
          <Text style={s.empty}>No attendance records for {date}</Text>
        ) : records.map((r, i) => (
          <View key={r._id || i} style={s.card}>
            <View style={[s.avatar, { backgroundColor: statusColor(r) + '20' }]}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.empName}>{r.employee?.name || r.employeeId?.userId?.name || r.employeeName || 'Employee'}</Text>
              <Text style={s.empSub}>
                {r.checkIn ? `In: ${new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No check-in'}
                {r.checkOut ? ` • Out: ${new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
              {r.workingHours > 0 && <Text style={s.empSub}>{r.workingHours}h worked</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: statusColor(r) + '20' }]}>
              <Text style={[s.badgeText, { color: statusColor(r) }]}>{statusLabel(r)}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  dateRow: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 10 },
  dateLabel: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  filterRow: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  empName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  empSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
