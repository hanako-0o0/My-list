import { Suspense } from "react";
import PageClient from "./pageClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <PageClient />
    </Suspense>
  );
}
