import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Switch
} from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { useAuth } from '../AuthContext';

export default function RoleFormScreen({ route, navigation }: any) {
  const { hasPermission } = useAuth();
  const editId = route.params?.id;
  const canCreate = hasPermission('roles:create');
  const canUpdate = hasPermission('roles:update');
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const pRes = await api.get('/roles/permissions');
        setAllPermissions(pRes.data || []);

        if (editId) {
          const rRes = await api.get(`/roles/${editId}`);
          setForm({
            name: rRes.data.name,
            description: rRes.data.description || '',
            permissions: rRes.data.permissions || []
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, [editId]);

  const togglePermission = (perm: string) => {
    setForm(prev => {
      const isSelected = prev.permissions.includes(perm);
      if (isSelected) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
      } else {
        return { ...prev, permissions: [...prev.permissions, perm] };
      }
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, form);
      } else {
        await api.post('/roles', form);
      }
      navigation.goBack();
      route.params?.onSave?.();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save role');
    }
    setSaving(false);
  };

  const permGroups: Record<string, string[]> = {};
  allPermissions.forEach(p => {
    const [resource] = p.split(':');
    if (!permGroups[resource]) permGroups[resource] = [];
    permGroups[resource].push(p);
  });

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if ((!editId && !canCreate) || (editId && !canUpdate)) {
    return <View style={s.center}><Text style={s.label}>No permission to modify roles</Text></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.label}>Role Name *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Sales Manager"
          placeholderTextColor={COLORS.textSecondary}
          value={form.name}
          onChangeText={v => setForm({ ...form, name: v })}
        />

        <Text style={s.label}>Description</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="What can this role do?"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          value={form.description}
          onChangeText={v => setForm({ ...form, description: v })}
        />

        <Text style={[s.label, { marginTop: 10 }]}>Permissions</Text>
        {Object.entries(permGroups).map(([group, perms]) => (
          <View key={group} style={s.groupCard}>
            <Text style={s.groupName}>{group.toUpperCase()}</Text>
            {perms.map(p => (
              <TouchableOpacity
                key={p}
                style={s.permRow}
                onPress={() => togglePermission(p)}
              >
                <Text style={s.permName}>{p.split(':')[1] || p}</Text>
                <Switch
                  value={form.permissions.includes(p)}
                  onValueChange={() => togglePermission(p)}
                  trackColor={{ false: COLORS.surface, true: COLORS.primary + '80' }}
                  thumbColor={form.permissions.includes(p) ? COLORS.primary : '#f4f3f4'}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: COLORS.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{editId ? 'Update Role' : 'Create Role'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '50',
  },
  permName: { fontSize: 14, color: COLORS.text, textTransform: 'capitalize' },
  footer: { padding: 16, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  btn: { height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
