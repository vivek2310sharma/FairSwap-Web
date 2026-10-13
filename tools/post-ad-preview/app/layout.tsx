import type { ReactNode } from 'react';
import './preview.css';
export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body><header className="border-b border-gray-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"><span className="text-xl font-bold text-emerald-700">FairSwap<span className="text-gray-400">.in</span></span><span className="text-sm text-gray-500">Post Ad · UI preview</span></div></header><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main></body></html>;}
