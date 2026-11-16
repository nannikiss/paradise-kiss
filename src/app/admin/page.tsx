'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Shield, Users, UserCheck, Calendar, Megaphone, AlertTriangle, Settings, ArrowLeft, Check, X } from 'lucide-react';

export default function AdminDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<'reclutamiento' | 'integrantes' | 'eventos' | 'comunicados' | 'sanciones' | 'config'>('reclutamiento');
  const [me, setMe] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [feedback, setFeedback] = useState('');

  // Nuevos registros
  const [newEvent, setNewEvent] = useState({ title: '', description: '', activity_type: 'Sala Personalizada', event_date: '', mode: 'Escuadra', max_slots: 20 });
  const [newAnn, setNewAnn] = useState({ title: '', content: '', category: 'Anuncios', is_pinned: true });
  const [newWarn, setNewWarn] = useState({ target_user_id: '', severity: 'aviso_1', reason: '', administrative_measure: '' });

  async function loadAdminData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: myProf } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setMe(myProf);
    }

    const [{ data: a }, { data: m }, { data: r }, { data: s }] = await Promise.all([
      supabase.from('applications_clan').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, roles(name)').order('nickname'),
      supabase.from('roles').select('*').order('hierarchy_level', { ascending: false }),
      supabase.from('clan_settings').select('*').eq('id', 1).single()
    ]);

    setApps(a || []);
    setMembers(m || []);
    setRoles(r || []);
    if (s) setSettings(s);
  }

  useEffect(() => { loadAdminData(); }, []);

  async function handleApplicationDecision(app: any, newStatus: 'aceptada' | 'rechazada' | 'en_revision') {
    await supabase.from('applications_clan').update({ status: newStatus, reviewed_by: me?.id }).eq('id', app.id);

    // Si es aceptada y tiene user_id vinculado, convertir automáticamente en integrante oficial
    if (newStatus === 'aceptada' && app.user_id) {
      await supabase.from('profiles').update({
        role_id: 'integrante',
        member_status: 'en_prueba',
        clan_rank: 'Recluta en Prueba',
        free_fire_id: app.free_fire_id
      }).eq('id', app.user_id);
    }

    await supabase.from('audit_logs').insert({
      actor_id: me?.id, action: `Postulación ${newStatus}`, target_table: 'applications_clan', target_id: app.id
    });
    setFeedback(`Postulación de ${app.nickname} marcada como ${newStatus}.`);
    loadAdminData();
  }

  async function updateMemberRoleOrStatus(memberId: string, field: 'role_id' | 'member_status', value: string) {
    await supabase.from('profiles').update({ [field]: value }).eq('id', memberId);
    await supabase.from('audit_logs').insert({
      actor_id: me?.id, action: `Cambio ${field} -> ${value}`, target_table: 'profiles', target_id: memberId
    });
    setFeedback('Datos de integrante actualizados y auditados.');
    loadAdminData();
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('events').insert({ ...newEvent, organizer_id: me?.id });
    setNewEvent({ title: '', description: '', activity_type: 'Sala Personalizada', event_date: '', mode: 'Escuadra', max_slots: 20 });
    setFeedback('Evento publicado en el calendario.');
  }

  async function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('announcements').insert({ ...newAnn, author_id: me?.id });
    setNewAnn({ title: '', content: '', category: 'Anuncios', is_pinned: true });
    setFeedback('Comunicado oficial publicado.');
  }

  async function issueWarning(e: React.FormEvent) {
    e.preventDefault();
    if (!newWarn.target_user_id) return;
    await supabase.from('warnings').insert({ ...newWarn, issued_by: me?.id });
    await supabase.from('audit_logs').insert({
      actor_id: me?.id, action: 'Advertencia emitida', target_table: 'warnings', target_id: newWarn.target_user_id
    });
    setNewWarn({ target_user_id: '', severity: 'aviso_1', reason: '', administrative_measure: '' });
    setFeedback('Advertencia registrada en el historial disciplinario.');
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('clan_settings').update(settings).eq('id', 1);
    setFeedback('Configuración oficial del clan guardada.');
  }

  return (
    <div className="min-h-screen bg-[#101A32] text-[#F5F7FC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border border-[#A68ACB]/40 bg-[#182647]">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-[#A68ACB]" />
            <div>
              <h1 className="text-xl font-bold">Panel Administrativo Central — PARADISE KISS</h1>
              <p className="text-xs text-[#B8D4F0]">Conectado como: {me?.nickname} ({me?.role_id})</p>
            </div>
          </div>
          <Link href="/panel" className="px-4 py-2 rounded-xl border border-[#263D65] text-xs flex items-center gap-1.5 hover:bg-[#263D65]">
            <ArrowLeft className="w-4 h-4" /> Volver a Mi Panel
          </Link>
        </div>

        {feedback && <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200">{feedback}</div>}

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'reclutamiento', label: `Reclutamiento (${apps.filter(a => a.status === 'pendiente').length})`, icon: UserCheck },
            { id: 'integrantes', label: `Integrantes (${members.length})`, icon: Users },
            { id: 'eventos', label: 'Crear Evento', icon: Calendar },
            { id: 'comunicados', label: 'Comunicados', icon: Megaphone },
            { id: 'sanciones', label: 'Advertencias', icon: AlertTriangle },
            { id: 'config', label: 'Configuración Clan', icon: Settings }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${tab === t.id ? 'bg-[#A68ACB] text-[#101A32]' : 'bg-[#182647] border border-[#263D65] text-[#B8D4F0]'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: RECLUTAMIENTO */}
        {tab === 'reclutamiento' && (
          <div className="space-y-3">
            {apps.length === 0 ? <p className="text-xs text-[#B8D4F0]">No hay postulaciones recibidas.</p> : apps.map(app => (
              <div key={app.id} className="p-5 rounded-2xl border border-[#263D65] bg-[#182647] flex flex-wrap justify-between gap-4">
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-base text-white">{app.nickname} <span className="text-xs font-normal text-[#789CCB]">(ID: {app.free_fire_id})</span></div>
                  <div className="text-[#B8D4F0]">Edad: {app.age_value} años • {app.experience || app.preferred_mode}</div>
                  <div>Contacto (WA/IG): <span className="font-semibold text-white">{app.country}</span> • Horario: {app.schedule_availability}</div>
                  <div className="text-[#D9E4F2] whitespace-pre-line bg-[#101A32]/60 p-2.5 rounded-xl border border-[#263D65]/60">{app.motivation}</div>
                  <div className="uppercase font-bold text-[#A68ACB]">Estado actual: {app.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApplicationDecision(app, 'aceptada')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Aceptar
                  </button>
                  <button onClick={() => handleApplicationDecision(app, 'rechazada')} className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: GESTIÓN DE INTEGRANTES Y ROLES */}
        {tab === 'integrantes' && (
          <div className="rounded-2xl border border-[#263D65] bg-[#182647] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#263D65] text-white">
                <tr><th className="p-3">Nickname</th><th className="p-3">ID FF</th><th className="p-3">Rol / Cargo</th><th className="p-3">Estado</th></tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="border-t border-[#263D65]/40">
                    <td className="p-3 font-bold">{m.nickname}</td>
                    <td className="p-3">{m.free_fire_id || '-'}</td>
                    <td className="p-3">
                      <select value={m.role_id} onChange={e => updateMemberRoleOrStatus(m.id, 'role_id', e.target.value)}
                        className="p-1.5 rounded-lg bg-[#101A32] border border-[#263D65]">
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <select value={m.member_status} onChange={e => updateMemberRoleOrStatus(m.id, 'member_status', e.target.value)}
                        className="p-1.5 rounded-lg bg-[#101A32] border border-[#263D65]">
                        <option value="pendiente">Pendiente</option>
                        <option value="en_prueba">En prueba (5 días)</option>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                        <option value="ausente">Ausente</option>
                        <option value="suspendido">Suspendido</option>
                        <option value="retirado">Retirado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CREAR EVENTOS */}
        {tab === 'eventos' && (
          <form onSubmit={createEvent} className="max-w-xl p-6 rounded-2xl border border-[#263D65] bg-[#182647] space-y-3 text-sm">
            <h2 className="font-bold text-base">Programar Nuevo Evento</h2>
            <input required placeholder="Título del evento" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            <div className="grid grid-cols-2 gap-3">
              <select value={newEvent.activity_type} onChange={e => setNewEvent({...newEvent, activity_type: e.target.value})}
                className="p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]">
                <option>Sala Personalizada</option><option>Entrenamiento</option><option>Torneo Interno</option><option>Reto Amistoso</option><option>Reunión</option>
              </select>
              <input required type="datetime-local" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})}
                className="p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            </div>
            <textarea required placeholder="Descripción y requisitos" rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#A68ACB] text-[#101A32] font-bold text-xs">Publicar Evento</button>
          </form>
        )}

        {/* TAB 4: COMUNICADOS */}
        {tab === 'comunicados' && (
          <form onSubmit={createAnnouncement} className="max-w-xl p-6 rounded-2xl border border-[#263D65] bg-[#182647] space-y-3 text-sm">
            <h2 className="font-bold text-base">Publicar Comunicado Oficial</h2>
            <input required placeholder="Título del comunicado" value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            <select value={newAnn.category} onChange={e => setNewAnn({...newAnn, category: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]">
              <option>Anuncios</option><option>Reclutamiento</option><option>Eventos</option><option>Comunicados importantes</option>
            </select>
            <textarea required placeholder="Contenido del mensaje..." rows={4} value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#789CCB] text-[#101A32] font-bold text-xs">Publicar Comunicado</button>
          </form>
        )}

        {/* TAB 5: ADVERTENCIAS */}
        {tab === 'sanciones' && (
          <form onSubmit={issueWarning} className="max-w-xl p-6 rounded-2xl border border-[#263D65] bg-[#182647] space-y-3 text-sm">
            <h2 className="font-bold text-base">Emitir Advertencia Disciplinaria</h2>
            <select required value={newWarn.target_user_id} onChange={e => setNewWarn({...newWarn, target_user_id: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]">
              <option value="">Selecciona al integrante...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
            </select>
            <select value={newWarn.severity} onChange={e => setNewWarn({...newWarn, severity: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]">
              <option value="aviso_1">Primer Aviso</option><option value="aviso_2">Segundo Aviso</option><option value="aviso_3">Tercer Aviso</option><option value="grave">Falta Grave</option>
            </select>
            <textarea required placeholder="Motivo detallado" rows={3} value={newWarn.reason} onChange={e => setNewWarn({...newWarn, reason: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-amber-500 text-[#101A32] font-bold text-xs">Registrar Advertencia</button>
          </form>
        )}

        {/* TAB 6: CONFIGURACIÓN EDITABLE DEL CLAN */}
        {tab === 'config' && settings && (
          <form onSubmit={saveSettings} className="max-w-2xl p-6 rounded-2xl border border-[#263D65] bg-[#182647] space-y-3 text-sm">
            <h2 className="font-bold text-base">Identidad y Textos Oficiales del Clan</h2>
            <input value={settings.clan_name} onChange={e => setSettings({...settings, clan_name: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Nombre del Clan" />
            <input value={settings.slogan} onChange={e => setSettings({...settings, slogan: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Eslogan" />
            <textarea rows={2} value={settings.short_description} onChange={e => setSettings({...settings, short_description: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Descripción breve" />
            <textarea rows={3} value={settings.history} onChange={e => setSettings({...settings, history: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Historia del clan" />
            <textarea rows={2} value={settings.objectives} onChange={e => setSettings({...settings, objectives: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Objetivos" />
            <textarea rows={3} value={settings.recruitment_requirements} onChange={e => setSettings({...settings, recruitment_requirements: e.target.value})}
              className="w-full p-2.5 rounded-xl bg-[#101A32] border border-[#263D65]" placeholder="Requisitos de ingreso" />
            <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#789CCB] to-[#A68ACB] text-[#101A32] font-bold text-xs">
              Guardar Configuración Oficial
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
