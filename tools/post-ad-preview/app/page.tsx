import { Suspense } from 'react';
import Preview from './Preview';
export default function Page(){return <Suspense fallback={<p>Loading preview…</p>}><Preview /></Suspense>;}
