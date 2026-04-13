import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';

export default function HrDashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try { const r = await api.get('/hr/dashboard'); setStats(r.data); } catch {}
    try { const r = await api.get('/hr/attendance/trend', { params: { days: 14 } }); setTrend(r.data.trend || []); } catch {}
    try { const r = await api.get('/hr/leave-stats'); setLeaveStats(r.data); } catch {}
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const STAT_CARDS = [
    { key: 'totalEmployees', label: 'Total Employees', icon: '👥', color: '#3b82f6' },
    { key: 'presentToday', label: 'Present Today', icon: '✅', color: COLORS.success },
    { key: 'absentToday', label: 'Absent Today', icon: '❌', color: COLORS.destructive },
    { key: 'lateToday', label: 'Late Today', icon: '⏰', color: COLORS.warning },
    { key: 'pendingLeaves', label: 'Pending Leaves', icon: '📋', color: '#a855f7' },
    { key: 'approvedLeavesThisMonth', label: 'Approved/Month', icon: '🗓️', color: '#14b8a6' },
  ];

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {STAT_CARDS.map(sc => (
          <View key={sc.key} style={[s.statCard, { borderTopColor: sc.color }]}>
            <Text style={{ fontSize: 24 }}>{sc.icon}</Text>
            <Text style={s.statValue}>{stats?.[sc.key] ?? 0}</Text>
            <Text style={s.statLabel}>{sc.label}</Text>
          </View>
        ))}
      </View>

      {/* Attendance Trend */}
      {trend.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Attendance Trend (14 days)</Text>
          <View style={s.chart}>
            {trend.map((d, i) => {
              const pctPresent = (d.present / (d.total || 1)) * 100;
              return (
                <View key={i} style={s.bar}>
                  <View style={[s.barFill, { height: Math.max(pctPresent * 1.2, 3), backgroundColor: COLORS.success }]} />
                  <Text style={s.barLabel}>{d.date.split('-').slice(1).join('/')}</Text>
                </View>
              );
            })}
          </View>
          <View style={s.legend}>
            <View style={[s.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={s.legendText}>Present</Text>
            <View style={[s.legendDot, { backgroundColor: COLORS.warning, marginLeft: 12 }]} />
            <Text style={s.legendText}>Late</Text>
          </View>
        </View>
      )}

      {/* Leave Distribution */}
      {leaveStats && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Leave Requests</Text>
          {[
            { label: 'Pending', value: leaveStats.pending, color: COLORS.warning },
            { label: 'Approved', value: leaveStats.approved, color: COLORS.success },
            { label: 'Rejected', value: leaveStats.rejected, color: COLORS.destructive },
          ].map(item => {
            const pct = leaveStats.total > 0 ? (item.value / leaveStats.total) * 100 : 0;
            return (
              <View key={item.label} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[s.leaveLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={s.leaveLabel}>{item.value} ({pct.toFixed(0)}%)</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: item.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Links */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Access</Text>
        {[
          { label: 'Attendance Management', icon: '✅', desc: 'View & filter attendance', screen: 'HrAttendance' },
          { label: 'Leave Management', icon: '📋', desc: 'Approve & reject leave requests', screen: 'HrLeaves' },
          { label: 'Reports & Analytics', icon: '📊', desc: 'Generate HR reports', screen: 'HrReports' },
        ].map(link => (
          <TouchableOpacity key={link.screen} style={s.quickLink} onPress={() => navigation.push(link.screen)}>
            <Text style={{ fontSize: 22 }}>{link.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.quickLinkTitle}>{link.label}</Text>
              <Text style={s.quickLinkDesc}>{link.desc}</Text>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  statCard: { width: '31%', margin: '1%', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3 },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  section: { margin: 12, backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 3 },
  bar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barFill: { width: '80%', borderRadius: 3 },
  barLabel: { fontSize: 8, color: COLORS.textSecondary, marginTop: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4 },
  leaveLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  progressBg: { height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  quickLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  quickLinkTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  quickLinkDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
