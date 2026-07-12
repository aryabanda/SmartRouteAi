import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// npm install @react-native-async-storage/async-storage
// (then `cd android && ./gradlew clean` once, since it has native code)

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string; // E.164 format recommended, e.g. +919876543210
};

const STORAGE_KEY = 'emergency_contacts_v1';
const MAX_CONTACTS = 5;

type ContactsContextValue = {
  contacts: EmergencyContact[];
  loading: boolean;
  addContact: (name: string, phone: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContact: (id: string, name: string, phone: string) => Promise<void>;
};

const ContactsContext = createContext<ContactsContextValue | undefined>(
  undefined,
);

export function ContactsProvider({children}: {children: ReactNode}) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setContacts(JSON.parse(raw));
      } catch (err) {
        console.warn('Failed to load emergency contacts:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next: EmergencyContact[]) => {
    setContacts(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to save emergency contacts:', err);
    }
  };

  const addContact = async (name: string, phone: string) => {
    if (contacts.length >= MAX_CONTACTS) {
      throw new Error(`You can only add up to ${MAX_CONTACTS} contacts.`);
    }
    const next = [
      ...contacts,
      {id: `${Date.now()}`, name: name.trim(), phone: phone.trim()},
    ];
    await persist(next);
  };

  const removeContact = async (id: string) => {
    await persist(contacts.filter(c => c.id !== id));
  };

  const updateContact = async (id: string, name: string, phone: string) => {
    await persist(
      contacts.map(c =>
        c.id === id ? {...c, name: name.trim(), phone: phone.trim()} : c,
      ),
    );
  };

  return (
    <ContactsContext.Provider
      value={{contacts, loading, addContact, removeContact, updateContact}}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return ctx;
}
