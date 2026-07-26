"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  // Using the SSR Browser Client to seamlessly handle the cookies
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  const handleAuthentication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    // 🟢 AUTO-DOMAIN LOGIC: Append the domain if he just types his name
    const formattedEmail = email.includes('@') 
      ? email 
      : `${email}@earthenminersdesigns.com`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    });

    if (authError) {
      setError("Access denied. Invalid credentials.");
      setIsAuthenticating(false);
    } else {
      router.push('/admin');
      router.refresh(); // Forces the proxy to read the newly minted cookie
    }
  };

  return (
    <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center font-sans relative">
      
      {/* 🟢 TYPOGRAPHY & TEXTURE INJECTION */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600;800&display=swap');
        
        .display-font {
            font-family: 'Oswald', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none;
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;
        }
      `}} />
      
      <div className="noise-bg"></div>

      <div className="w-full max-w-md px-8 relative z-10">
        <h1 className="text-4xl display-font text-white mb-2 text-center tracking-widest">
          MARK <span className="text-[#14B8A6]">JEWELRY</span>
        </h1>
        <p className="text-[#71717A] text-xs tracking-[0.2em] uppercase text-center mb-12 font-bold border-b border-white/5 pb-6">
          Forge Admin Portal
        </p>

        <form onSubmit={handleAuthentication} className="space-y-6">
          <div>
            <label className="block text-[#A1A1AA] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
              Master Handle
            </label>
            <input 
              type="text" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0C10] border border-[#27272A] rounded-sm px-4 py-4 text-white font-light focus:outline-none focus:border-[#14B8A6] transition-colors" 
              placeholder="enter handle" 
            />
          </div>
          <div>
            <label className="block text-[#A1A1AA] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
              Security Key
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0A0C10] border border-[#27272A] rounded-sm px-4 py-4 text-white font-light focus:outline-none focus:border-[#14B8A6] transition-colors tracking-widest" 
              placeholder="enter password" 
            />
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-sm">
                <p className="text-[#EF4444] text-xs tracking-widest uppercase text-center font-semibold">{error}</p>
            </div>
          )}
          
          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isAuthenticating}
              className="bg-[#B59A54] text-black display-font text-lg px-8 py-4 tracking-widest hover:bg-transparent hover:text-[#B59A54] border border-[#B59A54] transition-all disabled:opacity-50 disabled:cursor-wait w-full rounded-sm shadow-lg shadow-[#B59A54]/10"
            >
              {isAuthenticating ? 'Unlocking...' : 'Unlock Workbench'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}