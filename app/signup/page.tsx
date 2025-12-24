"use client";
import { useState } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    try {
      // 🔹 ブラウザ永続化
      await setPersistence(auth, browserLocalPersistence);

      // 🔹 サインアップ
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 🔹 Firestore にユーザー情報を保存
      await setDoc(doc(db, "users", uid), { uid, username, email });

      router.push("/"); // マイリストへ
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-sky-50 p-4">
      <h1 className="text-2xl font-bold mb-4">サインアップ</h1>
      <input
        type="text"
        placeholder="ユーザーネーム"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="mb-2 px-3 py-2 border rounded w-full max-w-xs"
      />
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-2 px-3 py-2 border rounded w-full max-w-xs"
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 px-3 py-2 border rounded w-full max-w-xs"
      />
      <button
        onClick={handleSignUp}
        className="px-6 py-2 bg-green-400 text-white rounded hover:bg-green-500"
      >
        サインアップ
      </button>
    </main>
  );
}
