'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [freeFireId, setFreeFireId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: 'error', text: error.message });
      else { router.push('/panel'); router.refresh(); }
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname, free_fire_id: freeFireId } },
      });
      if (error) setMessage({ type: 'error', text: error.message });
      else {
        setMessage({ type: 'ok', text: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' });
        setMode('login');
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      });
      if (error) setMessage({ type: 'error', text: error.message });
      else setMessage({ type: 'ok', text: 'Enlace de recuperación enviado a tu correo.' });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#101A32] text-[#F5F7FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#263D65] bg-[#182647]/90 p-8 celestial-glow">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#B8D4F0] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#263D65] text-[#B8D4F0]"><Shield className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-wider">PARADISE KISS</h1>
            <p className="text-xs text-[#789CCB]">Centro de Operaciones & Acceso</p>
          </div>
        </div>

        <div className="flex gap-2 my-6 p-1 rounded-xl bg-[#101A32] border border-[#263D65]">
          <button type="button" onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${mode === 'login' ? 'bg-[#263D65] text-white' : 'text-[#789CCB]'}`}>
            Iniciar Sesión
          </button>
          <button type="button" onClick={() => setMode('register')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${mode === 'register' ? 'bg-[#263D65] text-white' : 'text-[#789CCB]'}`}>
            Crear Cuenta
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type === 'error' ? 'bg-red-950/50 border-red-500/40 text-red-200' : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs text-[#B8D4F0] mb-1">Nickname en Free Fire *</label>
                <input required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ej: PK・Cinnangel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A32] border border-[#263D65] text-sm focus:outline-none focus:border-[#A68ACB]" />
              </div>
              <div>
                <label className="block text-xs text-[#B8D4F0] mb-1">ID de Jugador (Free Fire)</label>
                <input value={freeFireId} onChange={(e) => setFreeFireId(e.target.value)} placeholder="Ej: 1234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A32] border border-[#263D65] text-sm focus:outline-none focus:border-[#A68ACB]" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-[#B8D4F0] mb-1">Correo electrónico *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A32] border border-[#263D65] text-sm focus:outline-none focus:border-[#A68ACB]" />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs text-[#B8D4F0] mb-1">Contraseña *</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A32] border border-[#263D65] text-sm focus:outline-none focus:border-[#A68ACB]" />
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#263D65] via-[#789CCB] to-[#A68ACB] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50">
            <Sparkles className="w-4 h-4" />
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar a Paradise Kiss' : mode === 'register' ? 'Registrar Cuenta' : 'Enviar enlace'}
          </button>
        </form>

        {mode === 'login' && (
          <button type="button" onClick={() => setMode('reset')} className="w-full text-center text-xs text-[#789CCB] hover:text-[#B8D4F0] mt-4">
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </div>
    </div>
  );
}
