import { addDoc, collection, deleteField, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { CricketDart } from "./cricket";
import type { JdcDart } from "./jdc";
import type { DartSet, DartSetSnapshot, DartSetValues } from "./dartSets";

export type PracticeDart = CricketDart | JdcDart;

export interface StoredPracticeSession {
  id: string;
  routineId: string;
  status: "completed";
  startedAt: Timestamp;
  completedAt: Timestamp;
  darts: PracticeDart[];
  notes?: string;
  dartSetId?: string;
  dartSetSnapshot?: DartSetSnapshot;
}

export interface NewPracticeSession {
  routineId: "cricket-mpd" | "jdc-challenge";
  status: "completed";
  startedAt: Date;
  darts: PracticeDart[];
  dartSetId?: string;
  dartSetSnapshot?: DartSetSnapshot;
  notes?: string;
}

export async function loadDartSets(userId: string): Promise<DartSet[]> {
  const snapshot = await getDocs(collection(db, "users", userId, "dartSets"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as DartSet)
    .filter((item) => item.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function addDartSet(userId: string, values: DartSetValues) {
  return addDoc(collection(db, "users", userId, "dartSets"), { ...values, status: "active", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateDartSet(userId: string, dartSetId: string, values: DartSetValues) {
  return updateDoc(doc(db, "users", userId, "dartSets", dartSetId), { ...values, updatedAt: serverTimestamp() });
}

export function archiveDartSet(userId: string, dartSetId: string) {
  return updateDoc(doc(db, "users", userId, "dartSets", dartSetId), { status: "archived", updatedAt: serverTimestamp() });
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

export function updateSessionDartSet(userId: string, sessionId: string, dartSet?: DartSet) {
  const ref = doc(db, "users", userId, "practiceSessions", sessionId);
  if (!dartSet) return updateDoc(ref, { dartSetId: deleteField(), dartSetSnapshot: deleteField() });
  const { name, color, weightGrams, tipType } = dartSet;
  return updateDoc(ref, { dartSetId: dartSet.id, dartSetSnapshot: { name, color, weightGrams, tipType } });
}
