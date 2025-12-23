"use client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-sky-50">
      <h1 className="text-3xl font-bold mb-6">My List</h1>
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-sky-400 text-white rounded-lg hover:bg-sky-500"
        >
          ログイン
        </button>
        <button
          onClick={() => router.push("/signup")}
          className="px-6 py-3 bg-green-400 text-white rounded-lg hover:bg-green-500"
        >
          サインアップ
        </button>
      </div>
    </main>
  );
}
