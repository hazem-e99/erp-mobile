import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { Shield, Edit2, Users, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export default function RoleDetailScreen({ route, navigation }: any) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('roles:update');
  const { id } = route.params;
  const [role, setRole] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [rRes, uRes] = await Promise.all([
          api.get(`/roles/${id}`),
          api.get('/users', { params: { limit: 200 } }),
        ]);
        setRole(rRes.data);
        setUsers((uRes.data.data || []).filter((u: any) => u.role?._id === id || u.role === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!role) return <View style={s.center}><Text style={s.empty}>Role not found</Text></View>;

  // Group permissions
  const groups: Record<string, string[]> = {};
  (role.permissions || []).forEach((p: string) => {
    if (p === '*') { groups['ALL'] = ['Full Access']; return; }
    const [res] = p.split(':');
    if (!groups[res]) groups[res] = [];
    groups[res].push(p.split(':')[1]);
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.iconBox}><Shield size={32} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{role.name}</Text>
          <Text style={s.subtitle}>{role.description || 'No description'}</Text>
        </View>
        {canUpdate && (
          <TouchableOpacity style={s.editBtn} onPress={() => navigation.push('RoleForm', { id: role._id, onSave: () => navigation.goBack() })}>
            <Edit2 size={14} color={COLORS.primary} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
        {role.isSystem && <View style={s.badge}><Text style={s.badgeText}>System</Text></View>}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{role.permissions?.length || 0}</Text>
          <Text style={s.statLabel}>Permissions</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{users.length}</Text>
          <Text style={s.statLabel}>Users</Text>
        </View>
      </View>

      {/* Permissions */}
      <Text style={s.sectionTitle}>Permissions</Text>
      {Object.entries(groups).map(([group, perms]) => (
        <View key={group} style={s.card}>
          <Text style={s.groupLabel}>{group.toUpperCase()}</Text>
          <View style={s.chipRow}>
            {perms.map(p => (
              <View key={p} style={s.chip}><Text style={s.chipText}>✓ {p}</Text></View>
            ))}
          </View>
        </View>
      ))}

      {/* Users */}
      <Text style={s.sectionTitle}>Assigned Users ({users.length})</Text>
      {users.length === 0 ? (
        <View style={s.card}><Text style={s.empty}>No users assigned</Text></View>
      ) : (
        users.map(u => (
          <View key={u._id} style={s.userRow}>
            <View style={s.avatar}><Text style={s.avatarText}>{u.name?.[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{u.name}</Text>
              <Text style={s.userEmail}>{u.email}</Text>
            </View>
          </View>
        ))
      )}

      {/* Meta */}
      <View style={[s.card, { marginTop: 16 }]}>
        <Text style={s.meta}>Created: {new Date(role.createdAt).toLocaleDateString()}</Text>
        <Text style={s.meta}>Updated: {new Date(role.updatedAt).toLocaleDateString()}</Text>
      </View>
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
  editBtn: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userName: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  userEmail: { color: COLORS.textSecondary, fontSize: 12 },
  empty: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
});
