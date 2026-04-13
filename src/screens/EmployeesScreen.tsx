import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { useAuth } from '../AuthContext';

export default function EmployeesScreen({ navigation }: any) {
  const { hasPermission } = useAuth();
  const canRead   = hasPermission('employees:read');
  const canCreate = hasPermission('employees:create');
  const canUpdate = hasPermission('employees:update');
  const canDelete = hasPermission('employees:delete');

  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  // ✅ FIX #5 — baseSalary يبدأ بـ '0' (number) لا '' — يطابق CreateEmployeeDto
  const emptyForm = {
    name: '', employeeId: '', emailAddress: '', password: '',
    age: '',
    baseSalary: '0',     // ← كان '' — الـ backend يتوقع number required
    dateOfJoining: '',
    address: '', emergencyContact: '', whatsappNumber: '',
    positions: '', departments: '', contractTypes: '',
    department: '', position: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const { data } = await api.get('/employees', { params: { search } });
      setEmployees(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, canRead]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ─── Reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  // ─── Save (Create / Update) ───────────────────────────────────────────────────
  // Payload يطابق CreateEmployeeDto / UpdateEmployeeDto من الـ backend
  const handleSave = async () => {
    // Validation يطابق required fields في CreateEmployeeDto
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }
    if (!editingId) {
      if (!form.employeeId.trim()) {
        Alert.alert('Validation Error', 'Employee ID is required');
        return;
      }
      if (!form.emailAddress.trim()) {
        Alert.alert('Validation Error', 'Email address is required');
        return;
      }
      if (!form.password || form.password.length < 6) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters');
        return;
      }
      if (!form.dateOfJoining) {
        Alert.alert('Validation Error', 'Joining date is required');
        return;
      }
    }
    const salary = Number(form.baseSalary);
    if (isNaN(salary) || salary < 0) {
      Alert.alert('Validation Error', 'Base salary must be a valid number');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // UpdateEmployeeDto — لا يشمل emailAddress/password/employeeId
        const payload: any = {
          name:             form.name.trim(),
          address:          form.address.trim() || undefined,
          emergencyContact: form.emergencyContact.trim() || undefined,
          whatsappNumber:   form.whatsappNumber.trim() || undefined,
          department:       form.department.trim() || undefined,
          position:         form.position.trim() || undefined,
          baseSalary:       salary,
          age:              form.age ? Number(form.age) : undefined,
          positions:     form.positions ? form.positions.split(',').map(s => s.trim()).filter(Boolean) : [],
          departments:   form.departments ? form.departments.split(',').map(s => s.trim()).filter(Boolean) : [],
          contractTypes: form.contractTypes ? form.contractTypes.split(',').map(s => s.trim()).filter(Boolean) : [],
        };
        await api.put(`/employees/${editingId}`, payload);
      } else {
        // CreateEmployeeDto
        const payload: any = {
          name:          form.name.trim(),
          employeeId:    form.employeeId.trim(),
          emailAddress:  form.emailAddress.trim(),
          password:      form.password,
          baseSalary:    salary,
          dateOfJoining: form.dateOfJoining,
          age:              form.age ? Number(form.age) : undefined,
          address:          form.address.trim() || undefined,
          emergencyContact: form.emergencyContact.trim() || undefined,
          whatsappNumber:   form.whatsappNumber.trim() || undefined,
          department:       form.department.trim() || undefined,
          position:         form.position.trim() || undefined,
          positions:     form.positions ? form.positions.split(',').map(s => s.trim()).filter(Boolean) : [],
          departments:   form.departments ? form.departments.split(',').map(s => s.trim()).filter(Boolean) : [],
          contractTypes: form.contractTypes ? form.contractTypes.split(',').map(s => s.trim()).filter(Boolean) : [],
        };
        await api.post('/employees', payload);
      }
      resetForm();
      fetchEmployees();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save employee');
    }
    setSaving(false);
  };

  // ─── Populate form for edit ───────────────────────────────────────────────────
  const handleEdit = (item: any) => {
    setForm({
      name:             item.name || item.userId?.name || '',
      employeeId:       item.employeeId || '',
      emailAddress:     '',         // لا يُعرض/يُعدّل في edit
      password:         '',         // لا يُعدّل هنا — يستخدم reset-password
      age:              String(item.age || ''),
      baseSalary:       String(item.baseSalary ?? 0),  // ✅ FIX #5
      dateOfJoining:    item.dateOfJoining?.split('T')[0] || '',
      address:          item.address || '',
      emergencyContact: item.emergencyContact || '',
      whatsappNumber:   item.whatsappNumber || '',
      positions:        (item.positions || []).join(', '),
      departments:      (item.departments || []).join(', '),
      contractTypes:    (item.contractTypes || []).join(', '),
      department:       item.department || '',
      position:         item.position  || '',
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  // ─── Terminate ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert(
      'Terminate Employee',
      'This will deactivate the employee account. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/employees/${id}`);
              fetchEmployees();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to terminate');
            }
          },
        },
      ],
    );
  };

  if (!canRead) {
    return (
      <View style={s.container}>
        <Text style={s.empty}>No permission to access employees</Text>
      </View>
    );
  }

  // ─── Card ─────────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const user  = item.userId || {};
    const statusColor = item.status === 'active' ? COLORS.success : COLORS.destructive;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.push('EmployeeDetail', { id: item._id })}
      >
        <View style={s.row}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user.name || item.name)?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user.name || item.name || 'Unknown'}</Text>
            <Text style={s.roleText}>
              {item.position || item.positions?.[0] || '—'}
              {(item.department || item.departments?.[0]) ? `  ·  ${item.department || item.departments?.[0]}` : ''}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <Text style={s.info}>💰 ${item.baseSalary?.toLocaleString()}/mo</Text>
          <Text style={s.info}>📅 {new Date(item.dateOfJoining).toLocaleDateString()}</Text>
        </View>

        {/* ✅ FIX #12 — email من userId */}
        {(user.email || item.emailAddress) && (
          <Text style={[s.info, { marginTop: 4 }]}>
            ✉️ {user.email || item.emailAddress}
          </Text>
        )}

        {item.whatsappNumber && (
          <Text style={[s.info, { marginTop: 2 }]}>📱 {item.whatsappNumber}</Text>
        )}

        <View style={[s.infoRow, { marginTop: 8 }]}>
          {canUpdate && (
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Text style={[s.info, { color: COLORS.primary, fontWeight: '600' }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={() => handleDelete(item._id)}>
              <Text style={[s.info, { color: COLORS.destructive, fontWeight: '600' }]}>Terminate</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Employees</Text>

      <TextInput
        style={s.search}
        placeholder="Search employees..."
        placeholderTextColor={COLORS.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      {canCreate && (
        <TouchableOpacity style={s.createBtn} onPress={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}>
          <Text style={s.createBtnText}>+ New Employee</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={employees}
        keyExtractor={i => i._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchEmployees} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading ? <Text style={s.empty}>No employees found</Text> : null
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>
                {editingId ? 'Edit Employee' : 'New Employee'}
              </Text>

              {/* Basic Info */}
              <Text style={s.groupLabel}>Basic Information</Text>
              <TextInput style={s.input} placeholder="Full Name *" placeholderTextColor={COLORS.textSecondary}
                value={form.name} onChangeText={v => setForm({ ...form, name: v })} />
              {!editingId && (
                <TextInput style={s.input} placeholder="Employee ID *" placeholderTextColor={COLORS.textSecondary}
                  value={form.employeeId} onChangeText={v => setForm({ ...form, employeeId: v })} autoCapitalize="characters" />
              )}
              <TextInput style={s.input} placeholder="Age" placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric" value={form.age} onChangeText={v => setForm({ ...form, age: v })} />

              {/* Login Credentials (create only) */}
              {!editingId && (
                <>
                  <Text style={s.groupLabel}>Login Credentials</Text>
                  <TextInput style={s.input} placeholder="Email Address *" placeholderTextColor={COLORS.textSecondary}
                    value={form.emailAddress} onChangeText={v => setForm({ ...form, emailAddress: v })}
                    autoCapitalize="none" keyboardType="email-address" />
                  <TextInput style={s.input} placeholder="Password * (min 6 chars)" placeholderTextColor={COLORS.textSecondary}
                    value={form.password} onChangeText={v => setForm({ ...form, password: v })} secureTextEntry />
                </>
              )}

              {/* Contact */}
              <Text style={s.groupLabel}>Contact</Text>
              <TextInput style={s.input} placeholder="WhatsApp Number" placeholderTextColor={COLORS.textSecondary}
                value={form.whatsappNumber} onChangeText={v => setForm({ ...form, whatsappNumber: v })} keyboardType="phone-pad" />
              <TextInput style={s.input} placeholder="Emergency Contact" placeholderTextColor={COLORS.textSecondary}
                value={form.emergencyContact} onChangeText={v => setForm({ ...form, emergencyContact: v })} keyboardType="phone-pad" />
              <TextInput style={s.input} placeholder="Address" placeholderTextColor={COLORS.textSecondary}
                value={form.address} onChangeText={v => setForm({ ...form, address: v })} />

              {/* Employment */}
              <Text style={s.groupLabel}>Employment Details</Text>
              <TextInput style={s.input} placeholder="Base Salary *" placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric" value={form.baseSalary} onChangeText={v => setForm({ ...form, baseSalary: v })} />
              {!editingId && (
                <TextInput style={s.input} placeholder="Joining Date (YYYY-MM-DD) *" placeholderTextColor={COLORS.textSecondary}
                  value={form.dateOfJoining} onChangeText={v => setForm({ ...form, dateOfJoining: v })}
                  keyboardType="numbers-and-punctuation" maxLength={10} />
              )}
              <TextInput style={s.input} placeholder="Position (single)" placeholderTextColor={COLORS.textSecondary}
                value={form.position} onChangeText={v => setForm({ ...form, position: v })} />
              <TextInput style={s.input} placeholder="Department (single)" placeholderTextColor={COLORS.textSecondary}
                value={form.department} onChangeText={v => setForm({ ...form, department: v })} />

              {/* Multi-values */}
              <Text style={s.groupLabel}>Multi-Select (comma-separated)</Text>
              <TextInput style={s.input} placeholder="Positions  e.g. Developer, Lead" placeholderTextColor={COLORS.textSecondary}
                value={form.positions} onChangeText={v => setForm({ ...form, positions: v })} />
              <TextInput style={s.input} placeholder="Departments  e.g. Engineering, QA" placeholderTextColor={COLORS.textSecondary}
                value={form.departments} onChangeText={v => setForm({ ...form, departments: v })} />
              <TextInput style={s.input} placeholder="Contract Types  e.g. Full-time" placeholderTextColor={COLORS.textSecondary}
                value={form.contractTypes} onChangeText={v => setForm({ ...form, contractTypes: v })} />

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={resetForm}>
                  <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '600' }}>
                        {editingId ? 'Update' : 'Create'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title:          { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16, marginTop: 8 },
  search:         { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.text, height: 42, marginBottom: 8 },
  createBtn:      { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  createBtnText:  { color: '#fff', fontWeight: '700' },
  card:           { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  row:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:         { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 18 },
  name:           { fontSize: 15, fontWeight: '600', color: COLORS.text },
  roleText:       { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:      { fontSize: 10, fontWeight: '600' },
  infoRow:        { flexDirection: 'row', gap: 16, marginTop: 10 },
  info:           { fontSize: 12, color: COLORS.textSecondary },
  empty:          { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
  modalOverlay:   { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal:          { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '92%' },
  modalTitle:     { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 14 },
  groupLabel:     { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  input:          { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, padding: 10, marginBottom: 8, fontSize: 14 },
  modalBtns:      { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 8 },
  cancelBtn:      { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtn:        { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
