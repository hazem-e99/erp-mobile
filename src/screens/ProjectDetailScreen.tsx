import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';

export default function ProjectDetailScreen({ route }: any) {
  const { id } = route.params;
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get('/tasks', { params: { limit: 200 } }),
        ]);
        setProject(pRes.data);
        setTasks((tRes.data.data || []).filter((t: any) => t.projectId?._id === id || t.projectId === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!project) return <View style={s.center}><Text style={s.empty}>Project not found</Text></View>;

  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const daysLeft = project.deadline ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000) : null;

  const statusColor = project.status === 'completed' ? COLORS.success : project.status === 'in-progress' ? COLORS.primary : COLORS.warning;
  const priorityColor = project.priority === 'critical' ? COLORS.destructive : project.priority === 'high' ? COLORS.warning : COLORS.textSecondary;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.iconBox}><Text style={{ fontSize: 28 }}>📂</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{project.name}</Text>
          <Text style={s.subtitle}>{project.clientId?.name || 'No client'}</Text>
        </View>
      </View>
      <View style={s.badgeRow}>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{project.status}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: priorityColor + '20' }]}>
          <Text style={[s.badgeText, { color: priorityColor }]}>{project.priority}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Tasks', value: `${completed}/${tasks.length}`, color: COLORS.success },
          { label: 'Budget', value: `$${(project.budget || 0).toLocaleString()}`, color: '#3b82f6' },
          { label: 'Days Left', value: daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}` : 'Due!') : '—', color: COLORS.primary },
          { label: 'Progress', value: `${progress}%`, color: '#a855f7' },
        ].map(({ label, value, color }) => (
          <View key={label} style={s.statCard}>
            <Text style={[s.statNum, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Progress Bar */}
      <View style={s.card}>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>Progress</Text>
          <Text style={s.progressValue}>{progress}%</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Details */}
      <Text style={s.sectionTitle}>Details</Text>
      <View style={s.card}>
        {[
          { label: 'Client', val: project.clientId?.name || 'N/A' },
          { label: 'Start Date', val: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A' },
          { label: 'Deadline', val: project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A' },
          { label: 'Budget', val: `$${(project.budget || 0).toLocaleString()}` },
        ].map(({ label, val }) => (
          <View key={label} style={s.detailRow}>
            <Text style={s.detailLabel}>{label}</Text>
            <Text style={s.detailValue}>{val}</Text>
          </View>
        ))}
        {project.description ? (
          <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 }}>
            <Text style={s.detailLabel}>Description</Text>
            <Text style={[s.detailValue, { marginTop: 4 }]}>{project.description}</Text>
          </View>
        ) : null}
      </View>

      {/* Team */}
      {project.teamMembers?.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Team ({project.teamMembers.length})</Text>
          <View style={s.chipRow}>
            {project.teamMembers.map((m: any) => (
              <View key={m._id || m} style={s.teamChip}>
                <View style={s.miniAvatar}><Text style={s.miniAvatarText}>{(m.userId?.name || '?')[0]?.toUpperCase()}</Text></View>
                <Text style={s.teamName}>{m.userId?.name || m.employeeId || 'Member'}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Tasks */}
      <Text style={s.sectionTitle}>Tasks ({tasks.length})</Text>
      {tasks.length === 0 ? (
        <View style={s.card}><Text style={s.empty}>No tasks</Text></View>
      ) : (
        tasks.map(t => (
          <View key={t._id} style={s.taskRow}>
            <View style={[s.dot, {
              backgroundColor: t.status === 'completed' ? COLORS.success : t.status === 'in-progress' ? COLORS.primary : COLORS.textSecondary
            }]} />
            <Text style={s.taskTitle} numberOfLines={1}>{t.title}</Text>
            <View style={[s.badge, {
              backgroundColor: t.status === 'completed' ? COLORS.success + '20' : t.status === 'in-progress' ? COLORS.primary + '20' : COLORS.surface
            }]}>
              <Text style={[s.badgeText, { fontSize: 10, color: t.status === 'completed' ? COLORS.success : t.status === 'in-progress' ? COLORS.primary : COLORS.textSecondary }]}>
                {t.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 10 },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '22%', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  progressValue: { fontSize: 13, color: COLORS.textSecondary },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: COLORS.surface, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 20, paddingRight: 12, paddingLeft: 4, paddingVertical: 4 },
  miniAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  miniAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  teamName: { fontSize: 12, color: COLORS.text },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { flex: 1, fontSize: 13, color: COLORS.text },
  empty: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});
