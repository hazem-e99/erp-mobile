import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const canSend = user?.role?.permissions?.includes('*') || user?.role?.permissions?.includes('announcements:send');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', message: '', targetType: 'all', targetIds: [] as string[] });

  const TARGET_TYPES = ['all', 'users', 'roles', 'departments', 'projects'];
  const TYPE_COLORS: Record<string, string> = {
    all: '#3b82f6', users: '#8b5cf6', roles: '#f97316', departments: COLORS.success, projects: COLORS.primary,
  };
  const TYPE_ICONS: Record<string, string> = {
    all: '🌐', users: '👥', roles: '🛡️', departments: '🏢', projects: '📁',
  };
  const departments = ['Marketing', 'Development', 'Design', 'HR', 'Finance', 'Sales', 'Operations', 'Management'];

  const fetchData = async () => {
    try { const r = await api.get('/announcements'); setAnnouncements(r.data.data || r.data || []); } catch (e) { console.error(e); }
  };

  const fetchLookups = async () => {
    try { const r = await api.get('/users', { params: { limit: 200 } }); setUsers(r.data.data || []); } catch {}
    try { const r = await api.get('/roles'); setRoles(r.data || []); } catch {}
    try { const r = await api.get('/projects', { params: { limit: 100 } }); setProjects(r.data.data || []); } catch {}
  };

  useEffect(() => {
    Promise.all([fetchData(), fetchLookups()]).finally(() => setLoading(false));
  }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleSave = async () => {
    if (!form.title || !form.message) { Alert.alert('Error', 'Title and message are required'); return; }
    if (form.targetType !== 'all' && form.targetIds.length === 0) { Alert.alert('Error', 'Select at least one target'); return; }
    setSaving(true);
    try {
      await api.post('/announcements', form);
      setShowForm(false);
      setForm({ title: '', message: '', targetType: 'all', targetIds: [] });
      await fetchData();
    } catch { Alert.alert('Error', 'Failed to save announcement'); }
    setSaving(false);
  };

  const toggleTargetId = (id: string) => {
    setForm((prev) => ({
      ...prev,
      targetIds: prev.targetIds.includes(id)
        ? prev.targetIds.filter((v) => v !== id)
        : [...prev.targetIds, id],
    }));
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/announcements/${id}`); fetchData(); } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!canSend) return <View style={s.center}><Text style={s.empty}>No permission to access announcements</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {announcements.length === 0 ? (
          <Text style={s.empty}>No announcements</Text>
        ) : announcements.map(a => (
            <TouchableOpacity key={a._id} style={[s.card, { borderLeftColor: TYPE_COLORS[a.targetType] || COLORS.primary }]} onPress={() => setExpanded(expanded === a._id ? null : a._id)}>
            <View style={s.cardHeader}>
                <Text style={{ fontSize: 22 }}>{TYPE_ICONS[a.targetType] || '🌐'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{a.title}</Text>
                <Text style={s.cardMeta}>{a.createdBy?.name || 'Admin'} • {new Date(a.createdAt).toLocaleDateString()}</Text>
              </View>
                <View style={[s.typeBadge, { backgroundColor: (TYPE_COLORS[a.targetType] || COLORS.primary) + '20' }]}> 
                  <Text style={[s.typeBadgeText, { color: TYPE_COLORS[a.targetType] || COLORS.primary }]}>{a.targetType || 'all'}</Text>
              </View>
            </View>
            {(expanded === a._id) && (
                <Text style={s.cardContent}>{a.message}</Text>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {canSend && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={s.fabText}>+ New</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New Announcement</Text>

            <TextInput style={s.input} placeholder="Title *" placeholderTextColor={COLORS.textSecondary} value={form.title} onChangeText={v => setForm({ ...form, title: v })} />
            <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Message *" placeholderTextColor={COLORS.textSecondary} multiline value={form.message} onChangeText={v => setForm({ ...form, message: v })} />

            <Text style={s.label}>Target Type</Text>
            <View style={s.typeRow}>
              {TARGET_TYPES.map(t => (
                <TouchableOpacity key={t} style={[s.typeChip, form.targetType === t && { backgroundColor: TYPE_COLORS[t] }]} onPress={() => setForm({ ...form, targetType: t, targetIds: [] })}>
                  <Text style={[{ fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }, form.targetType === t ? { color: '#fff' } : { color: COLORS.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.targetType !== 'all' && (
              <View style={{ maxHeight: 150, marginBottom: 12 }}>
                <ScrollView>
                  {form.targetType === 'users' && users.map((u) => (
                    <TouchableOpacity key={u._id} style={[s.typeChip, { marginBottom: 6, backgroundColor: form.targetIds.includes(u._id) ? COLORS.primary + '25' : COLORS.surface }]} onPress={() => toggleTargetId(u._id)}>
                      <Text style={{ color: COLORS.text }}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {form.targetType === 'roles' && roles.map((r) => (
                    <TouchableOpacity key={r._id} style={[s.typeChip, { marginBottom: 6, backgroundColor: form.targetIds.includes(r._id) ? COLORS.primary + '25' : COLORS.surface }]} onPress={() => toggleTargetId(r._id)}>
                      <Text style={{ color: COLORS.text }}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {form.targetType === 'departments' && departments.map((d) => (
                    <TouchableOpacity key={d} style={[s.typeChip, { marginBottom: 6, backgroundColor: form.targetIds.includes(d) ? COLORS.primary + '25' : COLORS.surface }]} onPress={() => toggleTargetId(d)}>
                      <Text style={{ color: COLORS.text }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                  {form.targetType === 'projects' && projects.map((p) => (
                    <TouchableOpacity key={p._id} style={[s.typeChip, { marginBottom: 6, backgroundColor: form.targetIds.includes(p._id) ? COLORS.primary + '25' : COLORS.surface }]} onPress={() => toggleTargetId(p._id)}>
                      <Text style={{ color: COLORS.text }}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setShowForm(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  cardContent: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: COLORS.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, color: COLORS.text, marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  btnSave: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
});
