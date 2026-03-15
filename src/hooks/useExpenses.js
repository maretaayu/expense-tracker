import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'expenses';

export function useExpenses(user) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, COLLECTION),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExpenses(data);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore loading error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const addExpense = async (expense) => {
    if (!user) return;
    try {
      setError(null);
      await addDoc(collection(db, COLLECTION), {
        ...expense,
        amount: Number(expense.amount),
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding document: ", err);
      setError(err.message);
      throw err;
    }
  };

  const updateExpense = async (id, expense) => {
    try {
      setError(null);
      await updateDoc(doc(db, COLLECTION, id), {
        ...expense,
        amount: Number(expense.amount),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating document: ", err);
      setError(err.message);
      throw err;
    }
  };

  const deleteExpense = async (id) => {
    try {
      setError(null);
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (err) {
      console.error("Error deleting document: ", err);
      setError(err.message);
      throw err;
    }
  };

  return { expenses, loading, error, addExpense, updateExpense, deleteExpense };
}
