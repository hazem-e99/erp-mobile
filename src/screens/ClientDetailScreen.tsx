import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';

export default function ClientDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get(`/clients/${id}`),
          api.get('/projects', { params: { limit: 100 } }),
        ]);
        setClient(cRes.data);
        setProjects((pRes.data.data || []).filter((p: any) => p.clientId?._id === id || p.clientId === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!client) return <View style={s.center}><Text style={s.empty}>Client not found</Text></View>;

  const statusColor = client.status === 'active' ? COLORS.success : client.status === 'lead' ? COLORS.warning : COLORS.textSecondary;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.iconBox}><Text style={{ fontSize: 28 }}>🏢</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{client.name}</Text>
          <Text style={s.subtitle}>{client.company || 'Independent Client'}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{client.status}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{projects.length}</Text>
          <Text style={s.statLabel}>Projects</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { fontSize: 14 }]}>{client.industry || '—'}</Text>
          <Text style={s.statLabel}>Industry</Text>
        </View>
      </View>

      {/* Contact Info */}
      <Text style={s.sectionTitle}>Contact Information</Text>
      <View style={s.card}>
        {[
          { icon: '📧', label: 'Email', val: client.email },
          { icon: '📱', label: 'Phone', val: client.phone },
          { icon: '👤', label: 'Contact Person', val: client.contactPerson },
          { icon: '🌐', label: 'Website', val: client.website },
          { icon: '📍', label: 'Address', val: client.address },
        ].map(({ icon, label, val }) => (
          <View key={label} style={s.infoRow}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{val || 'N/A'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Notes */}
      {client.notes ? (
        <>
          <Text style={s.sectionTitle}>Notes</Text>
          <View style={s.card}><Text style={s.notesText}>{client.notes}</Text></View>
        </>
      ) : null}

      {/* Projects */}
      <Text style={s.sectionTitle}>Projects ({projects.length})</Text>
      {projects.length === 0 ? (
        <View style={s.card}><Text style={s.empty}>No projects</Text></View>
      ) : (
        projects.map(p => (
          <TouchableOpacity key={p._id} style={s.projectRow}
            onPress={() => navigation.push('ProjectDetail', { id: p._id })}>
            <View style={{ flex: 1 }}>
              <Text style={s.projectName}>{p.name}</Text>
              <Text style={s.projectDate}>{p.deadline ? `Due: ${new Date(p.deadline).toLocaleDateString()}` : 'No deadline'}</Text>
            </View>
            <View style={[s.badge, {
              backgroundColor: p.status === 'completed' ? COLORS.success + '20' : p.status === 'in-progress' ? COLORS.primary + '20' : COLORS.surface
            }]}>
              <Text style={[s.badgeText, {
                color: p.status === 'completed' ? COLORS.success : p.status === 'in-progress' ? COLORS.primary : COLORS.textSecondary
              }]}>{p.status}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 8 },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  notesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  projectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8 },
  projectName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  projectDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  empty: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});
