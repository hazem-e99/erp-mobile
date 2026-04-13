import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Modal, ActivityIndicator, ScrollView, Alert } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { useAuth } from '../AuthContext';

export default function ProjectsScreen({ navigation }: any) {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('projects:read');
  const canCreate = hasPermission('projects:create');
  const canUpdate = hasPermission('projects:update');
  const canDelete = hasPermission('projects:delete');

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'planning', priority: 'medium', startDate: '', deadline: '', budget: '' });

  const fetch = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [projRes, clientRes] = await Promise.all([
        api.get('/projects', { params: { search } }),
        api.get('/clients', { params: { limit: 100 } }),
      ]);
      setProjects(projRes.data.data || []);
      setClients(clientRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, canRead]);

  useEffect(() => { fetch(); }, [fetch]);

  const resetForm = () => {
    setForm({ name: '', description: '', clientId: '', status: 'planning', priority: 'medium', startDate: '', deadline: '', budget: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.clientId || !form.startDate || !form.deadline) {
      Alert.alert('Error', 'Name, client, start date and deadline are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, budget: form.budget ? Number(form.budget) : 0 };
      if (editingId) await api.put(`/projects/${editingId}`, payload);
      else await api.post('/projects', payload);
      resetForm();
      fetch();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save project');
    }
    setSaving(false);
  };

  const handleEdit = (item: any) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      clientId: item.clientId?._id || item.clientId || '',
      status: item.status || 'planning',
      priority: item.priority || 'medium',
      startDate: item.startDate?.split('T')[0] || '',
      deadline: item.deadline?.split('T')[0] || '',
      budget: String(item.budget || ''),
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Project', 'Delete this project?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/projects/${id}`); fetch(); } },
    ]);
  };

  if (!canRead) {
    return <View style={s.container}><Text style={s.empty}>No permission to access projects</Text></View>;
  }

  const renderItem = ({ item }: any) => {
    const color = item.status === 'completed' ? COLORS.success : item.status === 'in-progress' ? COLORS.primary : COLORS.warning;
    return (
      <TouchableOpacity style={s.card} onPress={() => navigation.push('ProjectDetail', { id: item._id })}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.client}>{item.clientId?.name || 'No client'}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: color + '20' }]}>
            <Text style={[s.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.infoRow}>
          <Text style={s.info}>📅 {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'No deadline'}</Text>
          <Text style={s.info}>💰 ${(item.budget || 0).toLocaleString()}</Text>
        </View>
        <View style={[s.infoRow, { marginTop: 8 }]}> 
          {canUpdate && <TouchableOpacity onPress={() => handleEdit(item)}><Text style={[s.info, { color: COLORS.primary, fontWeight: '600' }]}>Edit</Text></TouchableOpacity>}
          {canDelete && <TouchableOpacity onPress={() => handleDelete(item._id)}><Text style={[s.info, { color: COLORS.destructive, fontWeight: '600' }]}>Delete</Text></TouchableOpacity>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Projects</Text>
      <TextInput style={s.search} placeholder="Search projects..." placeholderTextColor={COLORS.textSecondary} value={search} onChangeText={setSearch} />
      {canCreate && (
        <TouchableOpacity style={s.createBtn} onPress={() => setShowForm(true)}>
          <Text style={s.createBtnText}>+ New Project</Text>
        </TouchableOpacity>
      )}
      <FlatList data={projects} keyExtractor={i => i._id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={!loading ? <Text style={s.empty}>No projects found</Text> : null}
        contentContainerStyle={{ paddingBottom: 20 }} />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editingId ? 'Edit Project' : 'New Project'}</Text>
            <TextInput style={s.input} placeholder="Project Name *" placeholderTextColor={COLORS.textSecondary} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Description" placeholderTextColor={COLORS.textSecondary} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {clients.map((c) => (
                <TouchableOpacity key={c._id} style={[s.selectChip, form.clientId === c._id && s.selectChipActive]} onPress={() => setForm({ ...form, clientId: c._id })}>
                  <Text style={[s.selectChipText, form.clientId === c._id && s.selectChipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput style={s.input} placeholder="Start Date YYYY-MM-DD *" placeholderTextColor={COLORS.textSecondary} value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} />
            <TextInput style={s.input} placeholder="Deadline YYYY-MM-DD *" placeholderTextColor={COLORS.textSecondary} value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} />
            <TextInput style={s.input} placeholder="Budget" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={form.budget} onChangeText={(v) => setForm({ ...form, budget: v })} />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={resetForm}><Text style={{ color: COLORS.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>{editingId ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16, marginTop: 8 },
  search: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.text, height: 42, marginBottom: 8 },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  client: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  info: { fontSize: 12, color: COLORS.textSecondary },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '85%' },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, padding: 10, marginBottom: 8 },
  selectChip: { backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  selectChipActive: { backgroundColor: COLORS.primary + '25', borderWidth: 1, borderColor: COLORS.primary },
  selectChipText: { color: COLORS.textSecondary, fontSize: 12 },
  selectChipTextActive: { color: COLORS.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
