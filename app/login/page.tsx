"use client";
import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); // マイリストへ
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-sky-50 p-4">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>
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
        onClick={handleLogin}
        className="px-6 py-2 bg-sky-400 text-white rounded hover:bg-sky-500"
      >
        ログイン
      </button>
    </main>
  );
}
