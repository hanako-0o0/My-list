"use client";

import { useEffect, useState, useRef } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";


type Item = {
  id: string;
  title: string;
  status: "planToWatch" | "watching" | "completed" | "dropped";
  rating: number;
  comment: string;
  currentEpisode?: number | null;
  totalEpisode?: number | null;
  season?: number | null; 
  movieOrder?: number | null;
  genre?: "アニメ" | "ドラマ" | "映画";
  imageUrl?: string;
  userId: string;
  favorite?: boolean;
  isNew?: boolean;
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
  const [genreFilter, setGenreFilter] = useState<"all" | "アニメ" | "ドラマ" | "映画">("all");
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const isComposing = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [localTitles, setLocalTitles] = useState<Record<string, string>>({});
  const [panelType, setPanelType] = useState<"grid" | "wide">("grid");



  // ログイン状態チェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ログインしていなければ /auth にリダイレクト
  useEffect(() => {
    if (!loading && !userId) {
      router.push("/auth");
    }
  }, [loading, userId, router]);

  // Firestore からデータ取得
  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const q = query(collection(db, "items"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const data: Item[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Item, "id">),
        }));
        setItems(data);
      } catch (e) {
        console.error("Failed to fetch items:", e);
      }
    };
    fetchData();
  }, [userId]);

  // URL検索クエリ反映
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (search) {
      params.set("q", search);
    } else {
      params.delete("q");
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, router]);

  // 新しいアイテムが追加されたら一番下までスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  if (loading) return <div>Loading...</div>;
  if (!userId) return null;

  const filteredItems =
    items
      .filter((item) => filter === "all" || item.status === filter)
      .filter((item) => genreFilter === "all" || item.genre === genreFilter)
      .filter((item) => !showFavoriteOnly || item.favorite)
      .filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
      .slice()
      .sort((a, b) => {
        if (a.isNew && !b.isNew) return 1;    // 新規は最後
        if (!a.isNew && b.isNew) return -1;
        return a.title.localeCompare(b.title); // それ以外はタイトル順
      });


  const addItem = async () => {
    if (!userId) return;

    try {
      // フィルターされている状態から初期値を取得
      const newStatus = filter === "all" ? "planToWatch" : filter;
      const newGenre = genreFilter === "all" ? "アニメ" : genreFilter;

      const defaultTotal = null;
      const isCompleted = newStatus === "completed";

      const newItem: Omit<Item, "id"> = {
        title: "新しい作品",
        status: newStatus,
        rating: 0,
        comment: "",
        currentEpisode: isCompleted ? defaultTotal : null,
        totalEpisode: defaultTotal,
        season: null,
        movieOrder: newGenre === "映画" ? 1 : null,
        genre: newGenre,
        userId,
        imageUrl: "",
        favorite: false,
        isNew: true,
      };

      const docRef = await addDoc(collection(db, "items"), newItem);

      // 配列の最後に追加
      setItems((prev) => [...prev, { ...newItem, id: docRef.id }]);
    } catch (e) {
      console.error("Failed to add item:", e);
    }
  };

  const updateItem = async (id: string, updated: Partial<Item>) => {
    try {
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, updated);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
    } catch (e) {
      console.error("Failed to update item:", e);
    }
  };

  const removeItem = async (id: string) => {
    try {
      const itemRef = doc(db, "items", id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      await deleteDoc(itemRef);
    } catch (e) {
      console.error("Failed to delete item:", e);
    }
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await updateItem(id, { imageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await updateItem(id, { imageUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  const resultCount = filteredItems.length;

  return (
    <main className="min-h-screen bg-sky-50 p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">My List</h1>

      {/* 外部サイトショートカット */}
      <div className="flex gap-2 mb-4">
        <a
          href="https://hianime.to/home"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-full text-sm bg-indigo-500 text-white hover:bg-indigo-600 transition"
        >
          HiAnime
        </a>

        <a
          href="https://www.iyf.tv/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-full text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition"
        >
          IYF
        </a>
      </div>

      {/* ログアウトボタン */}
      <button
        onClick={handleLogout}
        className="fixed top-6 right-6 px-3 py-1 bg-red-400 text-white rounded hover:bg-red-500"
      >
        ログアウト
      </button>


      {/* 状態タブ */}
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

      {/* ジャンルサブタブ */}
      <div className="flex gap-2 mb-4 ml-1">
        {["all", "アニメ", "ドラマ", "映画"].map((g) => {
          const labels: Record<string, string> = {
            all: "すべて",
            アニメ: "アニメ",
            ドラマ: "ドラマ",
            映画: "映画",
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


      {/* 検索バー */}
      <div className="relative mb-4">
        {/* 件数表示 */}
        <div className="absolute right-2 -top-5 text-xs text-gray-500">
          {filteredItems.length} / {items.length} 件
        </div>

        <input
          type="text"
          placeholder="タイトルで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-full px-3 py-2 pr-10 border rounded shadow-sm text-sm"
        />

        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="clear"
          >
            ✕
          </button>
        )}
      </div>


      {/* お気に入りボタン */}
      <button
        onClick={() => setShowFavoriteOnly((prev) => !prev)}
        className={`px-3 py-1 rounded-full text-sm ${
          showFavoriteOnly ? "bg-pink-400 text-white" : "bg-white shadow"
        }`}
      >
        ❤️ お気に入り
      </button>

      {/* パネル切り替え */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setPanelType("grid")}
          className={`px-3 py-1 rounded-full text-sm ${
            panelType === "grid" ? "bg-sky-400 text-white" : "bg-white shadow"
          }`}
        >
          通常
        </button>

        <button
          onClick={() => setPanelType("wide")}
          className={`px-3 py-1 rounded-full text-sm ${
            panelType === "wide" ? "bg-sky-400 text-white" : "bg-white shadow"
          }`}
        >
          横
        </button>
      </div>

      {/* リスト一覧 */}
      <div
        className={
          panelType === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 gap-4"
            : "grid grid-cols-2 xl:grid-cols-4 gap-4"
        }
      >
        {filteredItems.map((item) =>
          panelType === "grid" ? (
            /* ===== 通常カード（既存） ===== */
            <div
              key={item.id}
              className="relative bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition"
            >
              {/* ❤️ お気に入り */}
              <button
                onClick={() => updateItem(item.id, { favorite: !item.favorite })}
                className="absolute top-2 right-2 text-xl z-10"
              >
                {item.favorite ? "❤️" : "🤍"}
              </button>

              {/* 画像 */}
              <div
                className={`w-full aspect-[16/9] rounded-lg mb-2 overflow-hidden bg-sky-100 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-400`}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "ここに画像"
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    handleImageUpload(item.id, e.target.files[0]);
                }}
                className="text-xs mb-1"
              />

              <input
                type="text"
                value={localTitles[item.id] ?? item.title}
                onChange={(e) =>
                  setLocalTitles((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  updateItem(item.id, { title: e.target.value, isNew: false });
                  setLocalTitles((prev) => {
                    const copy = { ...prev };
                    delete copy[item.id];
                    return copy;
                  });
                }}
                className="w-full text-sm font-semibold mb-1 border-b"
              />

              <select
                value={item.status}
                onChange={(e) => {
                  const newStatus = e.target.value as Item["status"];
                  if (newStatus === "completed") {
                    const v =
                      item.totalEpisode ?? item.currentEpisode ?? 0;
                    updateItem(item.id, {
                      status: newStatus,
                      currentEpisode: v,
                      totalEpisode: v,
                    });
                  } else {
                    updateItem(item.id, { status: newStatus });
                  }
                }}
                className="text-xs mb-1 border rounded px-1"
              >
                <option value="planToWatch">見る予定</option>
                <option value="watching">見てる</option>
                <option value="completed">見終わった</option>
                <option value="dropped">やめた</option>
              </select>

              <select
                value={item.genre || "アニメ"}
                onChange={(e) =>
                  updateItem(item.id, {
                    genre: e.target.value as Item["genre"],
                  })
                }
                className="text-xs mb-1 border rounded px-1"
              >
                <option value="アニメ">アニメ</option>
                <option value="ドラマ">ドラマ</option>
                <option value="映画">映画</option>
              </select>

              <StarRating
                rating={item.rating}
                onChange={(r) => updateItem(item.id, { rating: r })}
              />

              <textarea
                value={item.comment}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === item.id ? { ...it, comment: e.target.value } : it
                    )
                  )
                }
                onBlur={(e) =>
                  updateItem(item.id, { comment: e.target.value })
                }
                className="w-full text-xs mt-1 border rounded p-1"
                rows={2}
              />

              {/* 話数 */}
              {item.genre === "映画" ? (
                <div className="flex items-center gap-1 text-xs mt-1">
                  <input
                    type="number"
                    value={item.movieOrder ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                movieOrder:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : it
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateItem(item.id, {
                        movieOrder:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="w-16 border rounded px-1"
                  />
                  <span>作目</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs mt-1">
                  <input
                    type="number"
                    value={item.season ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                season:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : it
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateItem(item.id, {
                        season:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="w-10 border rounded px-1"
                  />
                  <span>期</span>

                  <input
                    type="number"
                    value={item.currentEpisode ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                currentEpisode:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : it
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateItem(item.id, {
                        currentEpisode:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="w-12 border rounded px-1"
                  />

                  <span>/</span>

                  <input
                    type="number"
                    value={item.totalEpisode ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? {
                                ...it,
                                totalEpisode:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : it
                        )
                      )
                    }
                    onBlur={(e) =>
                      updateItem(item.id, {
                        totalEpisode:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="w-14 border rounded px-1"
                  />
                  <span>話</span>
                </div>
              )}

              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-red-500 mt-1"
              >
                削除
              </button>
            </div>
          ) : (
            /* ===== 横パネル ===== */
            <div
              key={item.id}
              className="
                relative bg-white rounded-xl shadow-md
                p-3 hover:shadow-lg transition
                flex gap-3
              "
            >

              {/* ❤️ お気に入り */}
              <button
                onClick={() => updateItem(item.id, { favorite: !item.favorite })}
                className="absolute top-2 right-2 text-xl z-10"
              >
                {item.favorite ? "❤️" : "🤍"}
              </button>

              {/* 左：画像 */}
              <div
                className="
                  h-32 aspect-[9/16]
                  rounded-lg overflow-hidden
                  bg-sky-100 flex items-center justify-center
                  text-xs text-gray-400
                  border border-dashed border-gray-400
                  flex-shrink-0
                "
              >

                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "ここに画像"
                )}
              </div>

              {/* 右：情報 */}
              <div className="flex-1">
                <input
                  type="text"
                  value={localTitles[item.id] ?? item.title}
                  onChange={(e) =>
                    setLocalTitles((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  onBlur={(e) => {
                    updateItem(item.id, { title: e.target.value, isNew: false });
                    setLocalTitles((prev) => {
                      const copy = { ...prev };
                      delete copy[item.id];
                      return copy;
                    });
                  }}
                  className="w-full text-sm font-semibold mb-1 border-b"
                />

                <div className="flex gap-2 mb-1">
                  <select
                    value={item.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as Item["status"];
                      if (newStatus === "completed") {
                        const v =
                          item.totalEpisode ?? item.currentEpisode ?? 0;
                        updateItem(item.id, {
                          status: newStatus,
                          currentEpisode: v,
                          totalEpisode: v,
                        });
                      } else {
                        updateItem(item.id, { status: newStatus });
                      }
                    }}
                    className="text-xs border rounded px-1"
                  >
                    <option value="planToWatch">見る予定</option>
                    <option value="watching">見てる</option>
                    <option value="completed">見終わった</option>
                    <option value="dropped">やめた</option>
                  </select>

                  <select
                    value={item.genre || "アニメ"}
                    onChange={(e) =>
                      updateItem(item.id, {
                        genre: e.target.value as Item["genre"],
                      })
                    }
                    className="text-xs border rounded px-1"
                  >
                    <option value="アニメ">アニメ</option>
                    <option value="ドラマ">ドラマ</option>
                    <option value="映画">映画</option>
                  </select>
                </div>

                <StarRating
                  rating={item.rating}
                  onChange={(r) => updateItem(item.id, { rating: r })}
                />

                <textarea
                  value={item.comment}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === item.id
                          ? { ...it, comment: e.target.value }
                          : it
                      )
                    )
                  }
                  onBlur={(e) =>
                    updateItem(item.id, { comment: e.target.value })
                  }
                  className="w-full text-xs mt-1 border rounded p-1"
                  rows={2}
                />

                {/* 話数UI（完全一致） */}
                {item.genre === "映画" ? (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <input
                      type="number"
                      value={item.movieOrder ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? {
                                  ...it,
                                  movieOrder:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                }
                              : it
                          )
                        )
                      }
                      onBlur={(e) =>
                        updateItem(item.id, {
                          movieOrder:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-16 border rounded px-1"
                    />
                    <span>作目</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <input
                      type="number"
                      value={item.season ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? {
                                  ...it,
                                  season:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                }
                              : it
                          )
                        )
                      }
                      onBlur={(e) =>
                        updateItem(item.id, {
                          season:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-10 border rounded px-1"
                    />
                    <span>期</span>

                    <input
                      type="number"
                      value={item.currentEpisode ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? {
                                  ...it,
                                  currentEpisode:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                }
                              : it
                          )
                        )
                      }
                      onBlur={(e) =>
                        updateItem(item.id, {
                          currentEpisode:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-12 border rounded px-1"
                    />

                    <span>/</span>

                    <input
                      type="number"
                      value={item.totalEpisode ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id
                              ? {
                                  ...it,
                                  totalEpisode:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                }
                              : it
                          )
                        )
                      }
                      onBlur={(e) =>
                        updateItem(item.id, {
                          totalEpisode:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="w-14 border rounded px-1"
                    />
                    <span>話</span>
                  </div>
                )}

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-xs text-red-500 mt-1"
                >
                  削除
                </button>
              </div>
            </div>
          )
        )}

        <div ref={bottomRef} />
      </div>

      {/* ＋ボタン */}
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




