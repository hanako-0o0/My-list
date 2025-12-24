"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  title: string;
  status: "planToWatch" | "watching" | "completed" | "dropped";
  rating: number;
  comment: string;
  currentEpisode: number;
  totalEpisode: number;
  season?: number | null; 
  genre?: "アニメ" | "ドラマ";
  imageUrl?: string;
  userId: string;
};

function StarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className="text-yellow-500 cursor-pointer"
        onClick={() => onChange(i)}
      >
        {rating >= i ? "★" : "☆"}
      </span>
    );
  }
  return <div className="text-sm">{stars}</div>;
}

export default function Home() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | Item["status"]>("all");
  const [genreFilter, setGenreFilter] = useState<"all" | "アニメ" | "ドラマ">("all");
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 ログイン状態チェック
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        if (user) setUserId(user.uid);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  // 🔹 ログインしていなければ /auth にリダイレクト
  useEffect(() => {
    if (!loading && !userId) router.push("/auth");
  }, [loading, userId, router]);

  // Firestore からデータ取得
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    const fetchData = async () => {
      const q = query(collection(db, "items"), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const data: Item[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Item, "id">),
      }));
      if (isMounted) setItems(data);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filteredItems = items
    .filter((item) => filter === "all" || item.status === filter)
    .filter((item) => genreFilter === "all" || item.genre === genreFilter)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));

  const addItem = async () => {
    if (!userId) return;

    const newItem: Item = {
      id: "",
      title: "新しい作品",
      status: "planToWatch",
      rating: 0,
      comment: "",
      currentEpisode: 0,
      totalEpisode: 12,
      season: null,
      genre: "アニメ",
      userId,
      imageUrl: undefined,
    };

    const docRef = await addDoc(collection(db, "items"), newItem);
    setItems((prev) => [...prev, { ...newItem, id: docRef.id }]);
  };

  const updateItem = async (id: string, updated: Partial<Item>) => {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, updated);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const removeItem = async (id: string) => {
    const itemRef = doc(db, "items", id);
    await deleteDoc(itemRef);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await updateItem(id, { imageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  return (
    <main className="min-h-screen bg-sky-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">My List</h1>

      <button
        onClick={handleLogout}
        className="fixed top-6 right-6 px-3 py-1 bg-red-400 text-white rounded hover:bg-red-500"
      >
        ログアウト
      </button>

      <div className="flex gap-2 mb-4">
        {["all", "planToWatch", "watching", "completed", "dropped"].map((f) => {
          const labels: Record<string, string> = {
            all: "すべて",
            planToWatch: "見る予定",
            watching: "見てる",
            completed: "見終わった",
            dropped: "やめた",
          };
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                isActive ? "bg-sky-400 text-white" : "bg-white text-gray-800 shadow"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4 ml-1">
        {["all", "アニメ", "ドラマ"].map((g) => {
          const labels: Record<string, string> = {
            all: "すべて",
            アニメ: "アニメ",
            ドラマ: "ドラマ",
          };
          const isActive = genreFilter === g;
          return (
            <button
              key={g}
              onClick={() => setGenreFilter(g as any)}
              className={`px-3 py-0.5 rounded-full text-xs transition ${
                isActive
                  ? "bg-pink-400 text-white"
                  : "bg-white text-gray-700 shadow"
              }`}
            >
              {labels[g]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition"
          >
            {item.imageUrl ? (
              <div className="w-full aspect-[16/9] rounded-lg mb-2 overflow-hidden bg-gray-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-[16/9] bg-sky-100 rounded-lg mb-2 flex items-center justify-center text-xs text-gray-400">
                No Image
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageUpload(item.id, e.target.files[0]);
              }}
              className="text-xs mb-1"
            />

            <input
              type="text"
              value={item.title}
              onChange={(e) => {
                setItems((prev) =>
                  prev.map((it) => (it.id === item.id ? { ...it, title: e.target.value } : it))
                );
              }}
              onBlur={(e) => updateItem(item.id, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-full text-sm font-semibold text-gray-800 mb-1 border-b border-gray-300"
            />

            <select
              value={item.status}
              onChange={(e) =>
                updateItem(item.id, { status: e.target.value as Item["status"] })
              }
              className="text-xs mb-1 border rounded px-1 py-0.5"
            >
              <option value="planToWatch">見る予定</option>
              <option value="watching">見てる</option>
              <option value="completed">見終わった</option>
              <option value="dropped">やめた</option>
            </select>

            <select
              value={item.genre || "アニメ"}
              onChange={(e) => updateItem(item.id, { genre: e.target.value as Item["genre"] })}
              className="text-xs mb-1 border rounded px-1 py-0.5"
            >
              <option value="アニメ">アニメ</option>
              <option value="ドラマ">ドラマ</option>
            </select>

            <StarRating
              rating={item.rating}
              onChange={(r) => updateItem(item.id, { rating: r })}
            />

            <textarea
              value={item.comment}
              onChange={(e) => {
                setItems((prev) =>
                  prev.map((it) =>
                    it.id === item.id ? { ...it, comment: e.target.value } : it
                  )
                );
              }}
              onBlur={(e) => updateItem(item.id, { comment: e.target.value })}
              className="w-full text-xs text-gray-600 mt-1 border rounded p-1"
              rows={2}
            />

            <div className="flex items-center gap-1 text-xs mt-1">
              <input
                type="number"
                placeholder="期"
                value={item.season ?? ""}
                onChange={(e) =>
                  updateItem(item.id, {
                    season: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-10 border rounded px-1"
              />
              <span>期</span>

              <input
                type="number"
                value={item.currentEpisode}
                onChange={(e) =>
                  updateItem(item.id, { currentEpisode: Number(e.target.value) })
                }
                className="w-12 border rounded px-1"
              />
              <span>/</span>
              <input
                type="number"
                value={item.totalEpisode}
                onChange={(e) =>
                  updateItem(item.id, { totalEpisode: Number(e.target.value) })
                }
                className="w-12 border rounded px-1"
              />
              <span>話</span>
            </div>

            <button
              onClick={() => removeItem(item.id)}
              className="mt-1 text-red-500 text-xs hover:underline"
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-sky-400 text-white text-3xl shadow-lg hover:bg-sky-500"
        aria-label="add"
      >
        +
      </button>
    </main>
  );
}
