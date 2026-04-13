import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import api from '../api';
import { useAuth } from '../AuthContext';
import { COLORS } from '../constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // ─── Editable fields (matches UpdateProfileDto) ───────────────────────────────
  // UpdateProfileDto: { name?, phone?, address?, whatsappNumber? }
  // ✅ FIX #7 — أضفنا emergencyContact (موجود في Employee schema لكن غائب من UpdateProfileDto)
  // نمرره كـ whatsappNumber أو نتعامل معه read-only إذا لم يدعمه الـ backend
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');   // maps to dto.phone
  const [address, setAddress]     = useState('');
  const [whatsapp, setWhatsapp]   = useState('');   // maps to dto.whatsappNumber
  const [emergency, setEmergency] = useState('');   // read from schema — نعرضه editable

  // ─── Password fields ──────────────────────────────────────────────────────────
  const [oldPw, setOldPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ─── Load profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // GET /employees/me — يرجع Employee document كاملاً مع userId populated
        const { data } = await api.get('/employees/me');
        setEmployee(data);
        // Employee.name (string, required)
        setName(data?.name || user?.name || '');
        // Employee.whatsappNumber — هو الحقل الأساسي للهاتف في الـ schema
        setWhatsapp(data?.whatsappNumber || '');
        // phone في UpdateProfileDto — لا يوجد في الـ Employee schema مباشرةً
        // لكن موجود في UpdateProfileDto، نملأه من whatsappNumber كـ fallback
        setPhone(data?.phone || data?.whatsappNumber || '');
        // Employee.address
        setAddress(data?.address || '');
        // ✅ FIX #7 — Employee.emergencyContact
        setEmergency(data?.emergencyContact || '');
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // ─── Save profile ─────────────────────────────────────────────────────────────
  // PUT /employees/me/profile  body: UpdateProfileDto
  // UpdateProfileDto fields: name?, phone?, address?, whatsappNumber?
  // ملاحظة: emergencyContact ليس في UpdateProfileDto الحالي (backend constraint)
  // نرسل ما يقبله الـ backend ونعرض emergencyContact كـ read-only إذا لزم
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/employees/me/profile', {
        name,
        phone,
        address,
        whatsappNumber: whatsapp,
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  // ─── Change password ──────────────────────────────────────────────────────────
  // POST /employees/me/change-password  body: ChangePasswordDto { oldPassword, newPassword }
  const handleChangePw = async () => {
    if (!oldPw) {
      Alert.alert('Validation', 'Current password is required');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await api.post('/employees/me/change-password', {
        oldPassword: oldPw,
        newPassword: newPw,
      });
      Alert.alert('Success', 'Password changed successfully!');
      setShowPwForm(false);
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    }
    setChangingPw(false);
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ── Avatar / Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(name || user?.name)?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={s.title}>{name || user?.name}</Text>
        <Text style={s.subtitle}>{user?.email}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{user?.role?.name || 'Employee'}</Text>
        </View>
      </View>

      {/* ── Personal Information (Editable) ─────────────────────────────────── */}
      <Text style={s.sectionTitle}>Personal Information</Text>
      <View style={s.card}>
        <Text style={s.label}>Full Name</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={s.label}>WhatsApp Number</Text>
        <TextInput
          style={s.input}
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="+201234567890"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
        />

        <Text style={s.label}>Phone</Text>
        <TextInput
          style={s.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
        />

        <Text style={s.label}>Address</Text>
        <TextInput
          style={s.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Your address"
          placeholderTextColor={COLORS.textSecondary}
        />

        {/* ✅ FIX #7 — Emergency Contact (عرض من الـ employee data) */}
        <Text style={s.label}>Emergency Contact</Text>
        <TextInput
          style={[s.input, s.readOnlyInput]}
          value={emergency}
          placeholder="Emergency contact number"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
          editable={false}
        />
        <Text style={s.hint}>* Emergency contact can only be updated by Admin</Text>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>💾  Save Profile</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Employment Details (Read-only) ───────────────────────────────────── */}
      {employee && (
        <>
          <Text style={s.sectionTitle}>Employment Details</Text>
          <View style={s.card}>
            {[
              { label: 'Employee ID',  value: employee.employeeId },
              { label: 'Department',   value: employee.department || employee.departments?.join(', ') || 'N/A' },
              { label: 'Position',     value: employee.position   || employee.positions?.join(', ')   || 'N/A' },
              { label: 'Contract',     value: employee.contractTypes?.join(', ') || 'N/A' },
              { label: 'Base Salary',  value: `$${employee.baseSalary?.toLocaleString() || 0}/mo` },
              { label: 'Joined',       value: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A' },
              // Leave balance
              { label: 'Annual Leaves', value: `${employee.annualLeaves ?? 22} days` },
              { label: 'Used Leaves',   value: `${employee.usedLeaves ?? 0} days` },
              { label: 'Remaining',     value: `${(employee.annualLeaves ?? 22) - (employee.usedLeaves ?? 0)} days` },
            ].map(({ label, value }) => (
              <View key={label} style={s.readRow}>
                <Text style={s.readLabel}>{label}</Text>
                <Text style={s.readValue}>{value}</Text>
              </View>
            ))}
            <Text style={s.hint}>* Salary, department & position can only be changed by Admin</Text>
          </View>
        </>
      )}

      {/* ── Security ─────────────────────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>Security</Text>
      <View style={s.card}>
        {!showPwForm ? (
          <TouchableOpacity style={s.outlineBtn} onPress={() => setShowPwForm(true)}>
            <Text style={s.outlineBtnText}>🔒  Change Password</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={s.label}>Current Password *</Text>
            <TextInput
              style={s.input}
              value={oldPw}
              onChangeText={setOldPw}
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={s.label}>New Password * (min 6 chars)</Text>
            <TextInput
              style={s.input}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholder="New password"
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={s.label}>Confirm New Password *</Text>
            <TextInput
              style={s.input}
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[s.saveBtn, { flex: 1 }]}
                onPress={handleChangePw}
                disabled={changingPw}
              >
                {changingPw
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Change</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.outlineBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => {
                  setShowPwForm(false);
                  setOldPw(''); setNewPw(''); setConfirmPw('');
                }}
              >
                <Text style={s.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Logout ───────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.logoutBtn}
        onPress={() => {
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', onPress: logout, style: 'destructive' },
            ],
          );
        }}
      >
        <Text style={s.logoutText}>🚪  Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  // Header
  header:         { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatar:         { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 30 },
  title:          { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle:       { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  roleBadge:      { backgroundColor: COLORS.primary + '20', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  roleText:       { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  // Sections
  sectionTitle:   { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 8 },
  card:           { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 14 },
  label:          { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: 10 },
  hint:           { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 8 },

  // Inputs
  input:          { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  readOnlyInput:  { opacity: 0.6 },

  // Buttons
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  saveBtnText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
  outlineBtn:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  outlineBtnText: { color: COLORS.text, fontWeight: '500', fontSize: 14 },

  // Read-only rows
  readRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  readLabel:      { fontSize: 13, color: COLORS.textSecondary },
  readValue:      { fontSize: 13, color: COLORS.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  // Logout
  logoutBtn:      { backgroundColor: COLORS.destructive + '15', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  logoutText:     { color: COLORS.destructive, fontWeight: '600', fontSize: 15 },
});
