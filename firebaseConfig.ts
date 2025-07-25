// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQnmP10rkVJmNY9CBjr4_TaVPhT74D_j0",
  authDomain: "open-numeric.firebaseapp.com",
  projectId: "open-numeric",
  appId: "1:329212134656:android:fc7feb44c7dde0045a5fe5",
  messagingSenderId: "329212134656"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
