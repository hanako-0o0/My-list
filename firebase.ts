// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOJwei_mC1Y0V6rCUfY07sdOVOC3GzTvs",
  authDomain: "my-list-app-7eb36.firebaseapp.com",
  projectId: "my-list-app-7eb36",
  storageBucket: "my-list-app-7eb36.firebasestorage.app",
  messagingSenderId: "214320098868",
  appId: "1:214320098868:web:562a9a96b13e49cc3f2461"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);

// 各サービスのエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
