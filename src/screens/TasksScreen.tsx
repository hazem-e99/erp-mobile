import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Calendar,
  Layers
} from 'lucide-react-native';

const priorityColors: Record<string, string> = {
  low: COLORS.textSecondary, medium: COLORS.primary, high: COLORS.warning, urgent: COLORS.destructive,
};

const statusConfig: Record<string, { label: string, icon: any, color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: COLORS.textSecondary },
  'in-progress': { label: 'Working', icon: Clock, color: COLORS.primary },
  review: { label: 'Review', icon: AlertCircle, color: COLORS.warning },
  completed: { label: 'Done', icon: CheckCircle2, color: COLORS.success },
};


export default function TasksScreen() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('tasks:read');
  const canCreate = hasPermission('tasks:create');
  const canUpdate = hasPermission('tasks:update');
  const canDelete = hasPermission('tasks:delete');
  const canSeeAll = hasPermission('tasks:manage') || (hasPermission('tasks:read') && hasPermission('dashboard:admin'));

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    deadline: '',
    estimatedHours: '',
  });

  const fetchTasks = async () => {
    if (!canRead) return;
    try {
      const endpoint = canSeeAll ? '/tasks' : '/tasks/my';
      const { data } = await api.get(endpoint, { params: { search } });
      setTasks(data.data || []);
      if (canCreate || canUpdate) {
        try {
          const [empRes, projRes] = await Promise.all([
            api.get('/employees', { params: { limit: 100 } }),
            api.get('/projects', { params: { limit: 100 } }),
          ]);
          setEmployees(empRes.data.data || []);
          setProjects(projRes.data.data || []);
        } catch {}
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTasks(); }, [search]);

  const onRefresh = async () => { setRefreshing(true); await fetchTasks(); setRefreshing(false); };

  const resetForm = () => {
    setForm({ title: '', description: '', projectId: '', assignedTo: '', status: 'todo', priority: 'medium', deadline: '', estimatedHours: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.assignedTo) {
      Alert.alert('Error', 'Title and assignee are required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        deadline: form.deadline || undefined,
        projectId: form.projectId || undefined,
      };
      if (editingId) await api.put(`/tasks/${editingId}`, payload);
      else await api.post('/tasks', payload);
      resetForm();
      fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save task');
    }
    setSaving(false);
  };

  const handleEdit = (task: any) => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      projectId: task.projectId?._id || task.projectId || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      deadline: task.deadline?.split('T')[0] || '',
      estimatedHours: String(task.estimatedHours || ''),
    });
    setEditingId(task._id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Delete this task?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/tasks/${id}`); fetchTasks(); } },
    ]);
  };

  const toggleStatus = async (task: any) => {
    if (!canUpdate) return;
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    try { await api.put(`/tasks/${task._id}`, { status: newStatus }); fetchTasks(); } catch (e) { console.error(e); }
  };

  if (!canRead) {
    return <View style={styles.empty}><Text style={styles.emptyText}>No permission to access tasks</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>{tasks.length} task(s)</Text>
        <TextInput
          style={styles.search}
          placeholder="Search tasks..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.createBtnText}>+ New Task</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks assigned</Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = statusConfig[item.status] || statusConfig.todo;
          const StatusIcon = config.icon;
          return (
            <TouchableOpacity style={styles.taskCard} onPress={() => toggleStatus(item)} activeOpacity={0.7}>
              <View style={[styles.indicator, { backgroundColor: priorityColors[item.priority] || COLORS.primary }]} />
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, item.status === 'completed' && styles.completed]}>{item.title}</Text>
                <View style={styles.taskMeta}>
                  <View style={styles.row}>
                    <StatusIcon size={14} color={config.color} />
                    <Text style={[styles.taskStatus, { color: config.color }]}>{config.label}</Text>
                  </View>
                  {item.deadline && (
                    <View style={styles.row}>
                      <Calendar size={14} color={COLORS.textSecondary} />
                      <Text style={styles.taskDate}>{new Date(item.deadline).toLocaleDateString()}</Text>
                    </View>
                  )}
                </View>
                {item.projectId?.name && (
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <Layers size={12} color={COLORS.primary} strokeWidth={2.5} />
                    <Text style={styles.project}>{item.projectId.name}</Text>
                  </View>
                )}
                <View style={styles.actionsRow}>
                  {canUpdate && <TouchableOpacity onPress={() => handleEdit(item)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>}
                  {canDelete && <TouchableOpacity onPress={() => handleDelete(item._id)}><Text style={[styles.actionText, { color: COLORS.destructive }]}>Delete</Text></TouchableOpacity>}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Task' : 'New Task'}</Text>
            <TextInput style={styles.input} placeholder="Title *" placeholderTextColor={COLORS.textSecondary} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Description" placeholderTextColor={COLORS.textSecondary} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {employees.map((e) => (
                <TouchableOpacity key={e._id} style={[styles.selectChip, form.assignedTo === e._id && styles.selectChipActive]} onPress={() => setForm({ ...form, assignedTo: e._id })}>
                  <Text style={[styles.selectChipText, form.assignedTo === e._id && styles.selectChipTextActive]}>{e.userId?.name || e.employeeId}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {projects.map((p) => (
                <TouchableOpacity key={p._id} style={[styles.selectChip, form.projectId === p._id && styles.selectChipActive]} onPress={() => setForm({ ...form, projectId: p._id })}>
                  <Text style={[styles.selectChipText, form.projectId === p._id && styles.selectChipTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput style={styles.input} placeholder="Deadline YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} />
            <TextInput style={styles.input} placeholder="Estimated Hours" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={form.estimatedHours} onChangeText={(v) => setForm({ ...form, estimatedHours: v })} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}><Text style={{ color: COLORS.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>{editingId ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  search: { marginTop: 10, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.text, height: 42 },
  createBtn: { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700' },
  taskCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
  },
  indicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  completed: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskMeta: { flexDirection: 'row', marginTop: 4, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskStatus: { fontSize: 12, color: COLORS.textSecondary },
  taskDate: { fontSize: 12, color: COLORS.textSecondary },
  project: { fontSize: 11, color: COLORS.primary, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
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
