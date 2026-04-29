import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyChwoIRuQTTOHeZXEQwodi3gHCx9K-isxw",
  authDomain: "app-do-fut.firebaseapp.com",
  projectId: "app-do-fut",
  storageBucket: "app-do-fut.firebasestorage.app",
  messagingSenderId: "240906268187",
  appId: "1:240906268187:web:d47065247d6f9bb93f12be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let fetchPromise = null;

export function fetchFutData() {
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const docRef = doc(db, "sync_data", "SNC7336");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const root = docSnap.data();
        const rawData = root.data;
        if (!rawData) throw new Error("O formato dos dados no Firestore é inválido.");

        const targetGroupId = "grupo_1773427387405";
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
