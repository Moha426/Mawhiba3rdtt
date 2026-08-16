const fs = require('fs');
let content = fs.readFileSync('src/lib/api-client-react.ts', 'utf8');

content = content.replace(
  `safeFirestoreWrite(async () => {
      const docRef = doc(db, "app_data", key);
      const cleanValue = JSON.parse(JSON.stringify(value));
      await setDoc(docRef, { value: cleanValue, updatedAt: serverTimestamp() }, { merge: true });
    });`,
  `try {
      const docRef = doc(db, "app_data", key);
      const cleanValue = JSON.parse(JSON.stringify(value));
      await setDoc(docRef, { value: cleanValue, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error("FIRESTORE WRITE ERROR:", err);
    }`
);
fs.writeFileSync('src/lib/api-client-react.ts', content);
