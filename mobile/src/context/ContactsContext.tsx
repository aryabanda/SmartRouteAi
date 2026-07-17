import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {useAuth} from './AuthContext';

// Same LAN-IP caveat as the other services - keep in sync with route.ts/search.ts/auth.ts.
const BACKEND_URL = 'http://localhost:4000';

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
};

type ContactsContextValue = {
  contacts: EmergencyContact[];
  loading: boolean;
  addContact: (name: string, phone: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ContactsContext = createContext<ContactsContextValue | undefined>(
  undefined,
);

export function ContactsProvider({children}: {children: ReactNode}) {
  const {token} = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const refresh = async () => {
    if (!token) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/contacts`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load contacts (${res.status})`);
      const data = await res.json();
      setContacts(data.contacts);
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reload contacts whenever the logged-in user changes (login, logout,
  // or session restored on app launch).
  useEffect(() => {
    refresh();
  }, [token]);

  const addContact = async (name: string, phone: string) => {
    if (!token) throw new Error('You must be logged in to add contacts.');

    const res = await fetch(`${BACKEND_URL}/api/contacts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({name, phone}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? 'Failed to add contact.');

    setContacts(prev => [...prev, body.contact]);
  };

  const removeContact = async (id: string) => {
    if (!token) throw new Error('You must be logged in to remove contacts.');

    const res = await fetch(`${BACKEND_URL}/api/contacts/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to remove contact.');
    }

    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <ContactsContext.Provider
      value={{contacts, loading, addContact, removeContact, refresh}}
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
