import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { firebaseConfig, targetGroupId, syncDocId } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let fetchPromise = null;

export function fetchFutData() {
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const docRef = doc(db, "sync_data", syncDocId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const root = docSnap.data();
        const rawData = root.data;
        if (!rawData) throw new Error("O formato dos dados no Firestore é inválido.");

        const sessionsKey = `sessions_${targetGroupId}`;
        const filteredData = {};

        if (rawData[sessionsKey]) {
          try {
            const sessions = JSON.parse(rawData[sessionsKey]);
            for (const session of sessions) {
              const historyKey = `match_history_${session.id}`;
              if (rawData[historyKey]) {
                filteredData[historyKey] = rawData[historyKey];
              }
            }
          } catch (e) {
            console.error("Erro ao parsear sessões do grupo:", e);
          }
        }

        const playersKey = `players_${targetGroupId}`;
        if (rawData[playersKey]) {
          try {
            filteredData.players_data = JSON.parse(rawData[playersKey]);
          } catch (e) {
            console.error("Erro ao parsear players do grupo:", e);
          }
        }

        return filteredData;
      } else {
        throw new Error("Documento não encontrado no Firestore!");
      }
    })();
  }
  return fetchPromise;
}
