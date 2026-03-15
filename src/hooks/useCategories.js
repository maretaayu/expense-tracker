import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Tag } from 'lucide-react';

const COLLECTION = 'user_categories';

export function useCategories(user) {
  const [customCategories, setCustomCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, COLLECTION),
      where('uid', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        icon: Tag, // Default icon for custom categories
        color: '#64748B', // Default color
        bg: '#F8FAFC' // Default bg
      }));
      setCustomCategories(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const addCategory = async (label) => {
    if (!user || !label) return;
    try {
      await addDoc(collection(db, COLLECTION), {
        label,
        value: label.toLowerCase().replace(/\s+/g, '_'),
        uid: user.uid,
      });
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };

  const deleteCategory = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  return { customCategories, loading, addCategory, deleteCategory };
}
