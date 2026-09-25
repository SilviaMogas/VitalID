import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Vital ID</h1>
      <p className="text-lg text-gray-600">
        Share a secure, temporary snapshot of your health information.
      </p>
      <div className="flex gap-4">
        <Link
          href="/share"
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Share (EN)
        </Link>
        <Link
          href="/share?lang=ar"
          className="rounded-lg border border-blue-600 px-5 py-2.5 font-medium text-blue-600 hover:bg-blue-50"
        >
          مشاركة (AR)
        </Link>
      </div>
      <p className="text-sm text-gray-400">
        Dashboard / Trends / Vital ID coming from core app.
      </p>
    </main>
  );
}
