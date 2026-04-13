import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

const STATUS_FILTERS = ['All', 'pending', 'approved', 'rejected'];
const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  approved: COLORS.success,
  rejected: COLORS.destructive,
};

export default function HrReportsScreen() {
  const { hasPermission } = useAuth();
  const canViewReports = hasPermission('hr:reports');
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const PERIODS: Array<'daily' | 'monthly' | 'yearly'> = ['daily', 'monthly', 'yearly'];

  const fetchData = async () => {
    try {
      const r = await api.get('/hr/analytics', { params: { period, month, year } });
      setReport(r.data.employees || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [period, month, year]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!canViewReports) return <View style={s.center}><Text style={s.empty}>No permission to view HR reports</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Period Filter */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodBtnText, period === p && s.periodBtnTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(period === 'monthly' || period === 'yearly') && (
          <View style={s.periodRow}>
            {period === 'monthly' && (
              <TouchableOpacity style={s.periodBtn} onPress={() => setMonth((m) => (m <= 1 ? 12 : m - 1))}>
                <Text style={s.periodBtnText}>Month: {month}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.periodBtn} onPress={() => setYear((y) => y - 1)}>
              <Text style={s.periodBtnText}>Year: {year}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.periodBtn} onPress={() => setYear((y) => y + 1)}>
              <Text style={s.periodBtnText}>Year +</Text>
            </TouchableOpacity>
          </View>
        )}

        {report.length === 0 ? (
          <Text style={s.empty}>No report data available</Text>
        ) : report.map((row, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.empName}>{row.employeeName || row.name || `Employee ${i + 1}`}</Text>
              <Text style={[s.pct, { color: row.attendancePercentage >= 80 ? COLORS.success : COLORS.destructive }]}>
                {row.attendancePercentage?.toFixed(0) || 0}%
              </Text>
            </View>
            <View style={s.grid}>
              <View style={s.gridItem}>
                <Text style={s.gridValue}>{row.totalWorkingHours || 0}h</Text>
                <Text style={s.gridLabel}>Work Hours</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridValue, { color: COLORS.destructive }]}>{row.lateCount || 0}</Text>
                <Text style={s.gridLabel}>Late</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridValue, { color: COLORS.warning }]}>{row.absenceCount || 0}</Text>
                <Text style={s.gridLabel}>Absent</Text>
              </View>
              <View style={s.gridItem}>
                <Text style={[s.gridValue, { color: COLORS.primary }]}>{row.overtimeHours || 0}h</Text>
                <Text style={s.gridLabel}>Overtime</Text>
              </View>
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
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  periodBtnTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  empName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  pct: { fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 8 },
  gridItem: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, alignItems: 'center' },
  gridValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  gridLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
