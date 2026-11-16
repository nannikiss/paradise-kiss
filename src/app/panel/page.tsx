'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Award, AlertTriangle, Bell, Ticket, Calendar, LogOut, Shield, Home } from 'lucide-react';

export default function MemberPanel() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<string[]>([]);

  const [bio, setBio] = useState('');
  const [nickname, setNickname] = useState('');
  const [ffid, setFfid] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const [ticketForm, setTicketForm] = useState({ category: 'Consulta', subject: '', description: '' });

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth');

    const { data: prof } = await supabase.from('profiles').select('*, roles(name, is_staff)').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      setBio(prof.bio || '');
      setNickname(prof.nickname || '');
      setFfid(prof.free_fire_id || '');
    }

    const [{ data: w }, { data: b }, { data: n }, { data: t }, { data: ev }, { data: regs }] = await Promise.all([
      supabase.from('warnings').select('*').eq('target_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('member_badges').select('*, badges(*)').eq('user_id', user.id).eq('revoked', false),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('events').select('*').eq('status', 'programado').order('event_date', { ascending: true }),
      supabase.from('event_registrations').select('event_id').eq('user_id', user.id)
    ]);

    setWarnings(w || []);
    setBadges(b || []);
    setNotifications(n || []);
    setTickets(t || []);
    setEvents(ev || []);
    setMyRegistrations((regs || []).map((r: any) => r.event_id));
  }

  useEffect(() => { loadAll(); }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ nickname, free_fire_id: ffid || null, bio }).eq('id', profile.id);
    setSaveMsg(error ? 'Error: ' + error.message : 'Perfil actualizado correctamente.');
    loadAll();
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('tickets').insert({ user_id: profile.id, ...ticketForm });
    setTicketForm({ category: 'Consulta', subject: '', description: '' });
    loadAll();
  }

  async function toggleEventRegistration(eventId: string) {
    if (myRegistrations.includes(eventId)) {
      await supabase.from('event_registrations').delete().eq('event_id', eventId).eq('user_id', profile.id);
    } else {
      await supabase.from('event_registrations').insert({ event_id: eventId, user_id: profile.id });
    }
    loadAll();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (!profile) return <div className="min-h-screen bg-[#101A32] text-white flex items-center justify-center">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-[#101A32] text-[#F5F7FC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
          <div>
            <span className="text-xs text-[#A68ACB] uppercase font-bold">{profile.roles?.name} • Estado: {profile.member_status}</span>
            <h1 className="text-2xl font-bold mt-1">Bienvenido/a, {profile.nickname}</h1>
            <p className="text-xs text-[#B8D4F0]">ID Free Fire: {profile.free_fire_id || 'Sin vincular'} • Ingreso: {profile.join_date}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="px-3.5 py-2 rounded-xl border border-[#263D65] text-xs flex items-center gap-1.5 hover:bg-[#263D65]">
              <Home className="w-4 h-4" /> Inicio
            </Link>
            {profile.roles?.is_staff && (
              <Link href="/admin" className="px-3.5 py-2 rounded-xl bg-[#A68ACB] text-[#101A32] font-bold text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Panel Admin
              </Link>
            )}
            <button onClick={handleLogout} className="px-3.5 py-2 rounded-xl bg-red-950/60 border border-red-500/40 text-xs flex items-center gap-1.5 text-red-200">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* EDICIÓN DE PERFIL */}
          <div className="p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
            <h2 className="font-bold text-base flex items-center gap-2 mb-4"><User className="w-4 h-4 text-[#789CCB]" /> Mi Perfil</h2>
            {saveMsg && <div className="mb-3 p-2.5 rounded-xl bg-[#263D65] text-xs">{saveMsg}</div>}
            <form onSubmit={handleUpdateProfile} className="space-y-3 text-sm">
              <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname"
                className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
              <input value={ffid} onChange={e => setFfid(e.target.value)} placeholder="ID de Free Fire"
                className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Presentación personal / Biografía" rows={3}
                className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#789CCB] text-[#101A32] font-bold text-xs">Guardar Cambios</button>
            </form>
          </div>

          {/* INSIGNIAS Y ADVERTENCIAS PROPIAS */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
              <h2 className="font-bold text-base flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-[#A68ACB]" /> Mis Insignias ({badges.length})</h2>
              {badges.length === 0 ? <p className="text-xs text-[#B8D4F0]">Aún no tienes insignias asignadas.</p> : (
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => (
                    <span key={b.id} className="px-3 py-1 rounded-full bg-[#263D65] text-xs font-medium">{b.badges?.name}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
              <h2 className="font-bold text-base flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-400" /> Mis Advertencias ({warnings.length})</h2>
              {warnings.length === 0 ? <p className="text-xs text-emerald-300">Historial limpio. Sin advertencias activas.</p> : (
                <div className="space-y-2">
                  {warnings.map(w => (
                    <div key={w.id} className="p-3 rounded-xl bg-[#101A32] border border-amber-500/30 text-xs">
                      <span className="font-bold uppercase text-amber-300">{w.severity}</span> • Estado: {w.status}
                      <p className="mt-1">{w.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EVENTOS Y TICKETS */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
            <h2 className="font-bold text-base flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-[#789CCB]" /> Inscripción a Eventos</h2>
            {events.length === 0 ? <p className="text-xs text-[#B8D4F0]">No hay eventos abiertos.</p> : (
              <div className="space-y-3">
                {events.map(ev => {
                  const joined = myRegistrations.includes(ev.id);
                  return (
                    <div key={ev.id} className="p-3 rounded-xl bg-[#101A32] flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{ev.title}</div>
                        <div className="text-xs text-[#B8D4F0]">{new Date(ev.event_date).toLocaleString()}</div>
                      </div>
                      <button onClick={() => toggleEventRegistration(ev.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${joined ? 'bg-emerald-600 text-white' : 'bg-[#263D65] text-[#B8D4F0]'}`}>
                        {joined ? 'Inscrito ✓' : 'Inscribirme'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-[#263D65] bg-[#182647]">
            <h2 className="font-bold text-base flex items-center gap-2 mb-3"><Ticket className="w-4 h-4 text-[#A68ACB]" /> Centro de Ayuda / Tickets</h2>
            <form onSubmit={handleCreateTicket} className="space-y-2 mb-4 text-xs">
              <div className="flex gap-2">
                <select value={ticketForm.category} onChange={e => setTicketForm({...ticketForm, category: e.target.value})}
                  className="p-2 rounded-xl bg-[#101A32] border border-[#263D65]">
                  <option>Consulta</option><option>Justificación de ausencia</option><option>Reporte</option><option>Soporte de cuenta</option>
                </select>
                <input required placeholder="Asunto" value={ticketForm.subject} onChange={e => setTicketForm({...ticketForm, subject: e.target.value})}
                  className="flex-1 p-2 rounded-xl bg-[#101A32] border border-[#263D65]" />
              </div>
              <textarea required placeholder="Describe tu solicitud..." rows={2} value={ticketForm.description}
                onChange={e => setTicketForm({...ticketForm, description: e.target.value})} className="w-full p-2 rounded-xl bg-[#101A32] border border-[#263D65]" />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#A68ACB] text-[#101A32] font-bold">Abrir Ticket</button>
            </form>
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className="p-2.5 rounded-xl bg-[#101A32] text-xs flex justify-between">
                  <span>#{t.ticket_number} - {t.subject}</span>
                  <span className="uppercase text-[#789CCB]">{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
