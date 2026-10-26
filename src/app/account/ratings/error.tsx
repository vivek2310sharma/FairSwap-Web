"use client";
export default function RatingsError({ reset }: { reset: () => void }) { return <div role="alert" className="p-6"><p>Ratings unavailable / रेटिंग उपलब्ध नहीं है</p><button className="min-h-11 underline" onClick={reset}>Try again / फिर कोशिश करें</button></div>; }
