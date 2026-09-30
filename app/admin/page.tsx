import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f3f8fb] px-4 py-16 text-[#30485f]">
      <div className="mx-auto max-w-md rounded-3xl border border-[#d7e4ec] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">管理後台暫時停用</h1>
        <p className="mt-3 text-sm leading-6 text-[#7891a3]">登入權杖功能移除期間，管理功能暫不開放。</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#5e7891] px-4 py-2.5 text-sm font-bold text-white">回到首頁</Link>
      </div>
    </main>
  );
}
