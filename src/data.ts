import { collection, getDocs, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface StoredPracticeSession {
  id: string;
  routineId: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
  notes?: string;
}

export async function loadSessions(userId: string): Promise<StoredPracticeSession[]> {
  const ref = collection(db, "users", userId, "practiceSessions");
  const snapshot = await getDocs(query(ref, orderBy("completedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoredPracticeSession);
}
