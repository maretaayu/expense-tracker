import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

export function useBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'budgets'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBudgets(budgetData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const saveBudget = async (category, amount) => {
    if (!auth.currentUser) return;
    
    // We use category as document ID to ensure one budget per category per user
    const budgetId = `${auth.currentUser.uid}_${category}`;
    const budgetRef = doc(db, 'budgets', budgetId);
    
    await setDoc(budgetRef, {
      uid: auth.currentUser.uid,
      category,
      limit: Number(amount),
      updatedAt: serverTimestamp()
    });
  };

  const deleteBudget = async (id) => {
    await deleteDoc(doc(db, 'budgets', id));
  };

  return { budgets, loading, saveBudget, deleteBudget };
}
