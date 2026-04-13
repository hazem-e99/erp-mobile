import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Alert } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';
import { Shield, Plus, Info } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export default function RolesScreen({ navigation }: any) {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('roles:read');
  const canCreate = hasPermission('roles:create');
  const canDelete = hasPermission('roles:delete');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try { const { data } = await api.get('/roles'); setRoles(data || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, [canRead]);

  useEffect(() => { fetch(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Role', 'Delete this role?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/roles/${id}`); fetch(); } },
    ]);
  };

  if (!canRead) return <View style={s.container}><Text style={s.empty}>No permission to access roles</Text></View>;

  const renderRole = ({ item }: any) => (
    <TouchableOpacity style={s.card} onPress={() => navigation.push('RoleDetail', { id: item._id })}>
      <View style={s.row}>
        <View style={s.icon}><Shield size={22} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{item.name}</Text>
          <Text style={s.desc}>{item.description || 'No description'}</Text>
        </View>
        {item.isSystem && <View style={s.badge}><Text style={s.badgeText}>System</Text></View>}
      </View>
      <View style={s.permRow}>
        {item.permissions?.includes('*') ? (
          <View style={[s.perm, { backgroundColor: COLORS.primary }]}><Text style={s.permText}>All Access</Text></View>
        ) : item.permissions?.slice(0, 3).map((p: string) => (
          <View key={p} style={s.perm}><Text style={s.permText}>{p}</Text></View>
        ))}
        {!item.permissions?.includes('*') && item.permissions?.length > 3 && (
          <Text style={s.more}>+{item.permissions.length - 3}</Text>
        )}
      </View>
      {canDelete && !item.isSystem && (
        <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ marginTop: 8 }}>
          <Text style={{ color: COLORS.destructive, fontSize: 12, fontWeight: '600' }}>Delete</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>Roles & Access</Text>
        {canCreate && <TouchableOpacity style={s.addBtn} onPress={() => navigation.push('RoleForm', { onSave: fetch })}>
          <Plus size={16} color="#fff" />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>}
      </View>
      <FlatList data={roles} keyExtractor={i => i._id} renderItem={renderRole}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={!loading ? <Text style={s.empty}>No roles found</Text> : null}
        contentContainerStyle={{ paddingBottom: 80 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  desc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' },
  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 },
  perm: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  permText: { color: COLORS.text, fontSize: 10 },
  more: { color: COLORS.textSecondary, fontSize: 11, alignSelf: 'center', marginLeft: 4 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
