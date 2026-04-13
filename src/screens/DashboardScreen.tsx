import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';
import { 
  CheckCircle, 
  Activity, 
  AlertCircle, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowRight
} from 'lucide-react-native';

function StatCard({ title, value, color, icon: Icon }: { title: string; value: string | number; color: string; icon: any }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statValue}>{value}</Text>
        <Icon size={18} color={color} opacity={0.8} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/dashboard/employee');
      setData(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="My Tasks" value={data?.tasks?.total || 0} color={COLORS.primary} icon={Activity} />
        <StatCard title="In Progress" value={data?.tasks?.inProgress || 0} color="#3b82f6" icon={ArrowRight} />
        <StatCard title="Completed" value={data?.tasks?.completed || 0} color={COLORS.success} icon={CheckCircle} />
        <StatCard title="Overdue" value={data?.tasks?.overdue || 0} color={COLORS.destructive} icon={AlertCircle} />
      </View>

      {/* Attendance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.attendanceCard}>
          <View style={styles.row}>
            {data?.attendance?.checkedIn ? (
              data?.attendance?.checkedOut ? <CheckCircle size={20} color={COLORS.success} /> : <Activity size={20} color={COLORS.primary} />
            ) : <Clock size={20} color={COLORS.textSecondary} />}
            <Text style={styles.attendanceStatus}>
              {data?.attendance?.checkedIn
                ? data?.attendance?.checkedOut ? 'Day Complete' : 'Working Now'
                : 'Not Checked In'}
            </Text>
          </View>
          {data?.attendance?.today?.workingHours > 0 && (
            <Text style={styles.attendanceHours}>{data.attendance.today.workingHours}h worked</Text>
          )}
        </View>
      </View>

      {/* Leave Balance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <View style={styles.leaveCard}>
          <View style={styles.leaveItem}>
            <Text style={styles.leaveValue}>{data?.leaveBalance?.remaining || 0}</Text>
            <Text style={styles.leaveLabel}>Remaining</Text>
          </View>
          <View style={[styles.leaveItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
            <Text style={styles.leaveValue}>{data?.leaveBalance?.used || 0}</Text>
            <Text style={styles.leaveLabel}>Used</Text>
          </View>
          <View style={[styles.leaveItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
            <Text style={styles.leaveValue}>{data?.leaveBalance?.total || 0}</Text>
            <Text style={styles.leaveLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Latest Salary */}
      {data?.latestPayroll && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Salary</Text>
          <View style={styles.salaryCard}>
            <Text style={styles.salaryAmount}>${data.latestPayroll.netSalary?.toLocaleString()}</Text>
            <Text style={styles.salaryPeriod}>{data.latestPayroll.period}</Text>
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  name: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12 },
  statCard: {
    width: '46%', margin: '2%', backgroundColor: COLORS.card, borderRadius: 12,
    padding: 16, borderLeftWidth: 3,
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  statTitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  attendanceCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16 },
  attendanceStatus: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  attendanceHours: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  leaveCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, flexDirection: 'row' },
  leaveItem: { flex: 1, alignItems: 'center' },
  leaveValue: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  leaveLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  salaryCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16 },
  salaryAmount: { fontSize: 28, fontWeight: '700', color: COLORS.success },
  salaryPeriod: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
