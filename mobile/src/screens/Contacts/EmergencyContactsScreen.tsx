import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import {useContacts} from '../../context/ContactsContext';

// Very light phone-format check. Doesn't validate real-world validity,
// just catches obviously wrong input before it's saved.
function isPlausiblePhone(phone: string) {
  return /^\+?[0-9]{7,15}$/.test(phone.trim());
}

export default function EmergencyContactsScreen() {
  const {contacts, loading, addContact, removeContact} = useContacts();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Enter both a name and a phone number.');
      return;
    }
    if (!isPlausiblePhone(phone)) {
      Alert.alert(
        'Invalid phone number',
        'Use digits only, optionally starting with + and country code, e.g. +919876543210.',
      );
      return;
    }
    try {
      await addContact(name, phone);
      setName('');
      setPhone('');
    } catch (err: any) {
      Alert.alert('Could not add contact', err.message ?? 'Unknown error');
    }
  };

  const handleRemove = (id: string, contactName: string) => {
    Alert.alert(
      'Remove contact',
      `Remove ${contactName} from your emergency contacts?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeContact(id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Emergency Contacts</Text>
      <Text style={styles.subheading}>
        These contacts get an SMS with your live location if you deviate from
        your route, miss a checkpoint, or press Emergency SOS.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Add Contact</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        contentContainerStyle={{paddingBottom: 20}}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No emergency contacts yet. Add at least one before starting a
              journey.
            </Text>
          ) : null
        }
        renderItem={({item}) => (
          <View style={styles.contactRow}>
            <View>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemove(item.id, item.name)}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subheading: {
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  contactRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactPhone: {
    color: '#6B7280',
    marginTop: 2,
  },
  removeText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 30,
  },
});
