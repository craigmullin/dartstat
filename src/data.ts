import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { CricketDart } from "./cricket";
import type { JdcDart } from "./jdc";

export type PracticeDart = CricketDart | JdcDart;

export interface StoredPracticeSession {
  id: string;
  routineId: string;
  status: "completed";
  startedAt: Timestamp;
  completedAt: Timestamp;
  darts: PracticeDart[];
  notes?: string;
}

export interface NewPracticeSession {
  routineId: "cricket-mpd" | "jdc-challenge";
  status: "completed";
  startedAt: Date;
  darts: PracticeDart[];
}

export async function saveSession(userId: string, session: NewPracticeSession) {
  const ref = collection(db, "users", userId, "practiceSessions");
  return addDoc(ref, { ...session, completedAt: serverTimestamp() });
}

export async function loadSessions(userId: string): Promise<StoredPracticeSession[]> {
  const ref = collection(db, "users", userId, "practiceSessions");
  const snapshot = await getDocs(query(ref, orderBy("completedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoredPracticeSession);
}
