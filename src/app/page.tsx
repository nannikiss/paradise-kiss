'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type PageId =
  | 'inicio' | 'clan' | 'integrantes' | 'staff' | 'actividades'
  | 'noticias' | 'comunidad' | 'galeria' | 'reglamento' | 'contacto' | 'reclutamiento';

const PAGE_NAMES: Record<PageId, string> = {
  inicio: 'Inicio',
  clan: 'El clan',
  integrantes: 'Integrantes',
  staff: 'Equipo del clan',
  actividades: 'Actividades',
  noticias: 'Noticias',
  comunidad: 'Comunidad & Rankings',
  galeria: 'Galería',
  reglamento: 'Reglamento',
  contacto: 'Contacto',
  reclutamiento: 'Solicitar ingreso',
};

export default function HomePage() {
  const supabase = createClient();
  const [page, setPage] = useState<PageId>('inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Datos reales de Supabase
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [rules, setRules] = useState<any>(null);

  // Filtros integrantes
  const [search, setSearch] = useState('');

  // Formularios reales
  const [appForm, setAppForm] = useState({
    nickname: '', free_fire_id: '', age_value: '', country: 'Chile',
    preferred_mode: 'Escuadra Clasificatoria', main_mode: 'Ambos',
    schedule_availability: '', experience: '', motivation: '', rules_accepted: false
  });

  const [staffForm, setStaffForm] = useState({
    nickname: '', free_fire_id: '', target_role: 'Reclutador',
    availability: '', admin_experience: '', skills: ''
  });

  function showToast(text: string) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(''), 3200);
  }

  useEffect(() => {
    document.body.classList.toggle('light-theme', lightTheme);
  }, [lightTheme]);

  useEffect(() => {
    async function loadSupabase() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      const [
        { data: sData }, { data: mData }, { data: eData },
        { data: aData }, { data: gData }, { data: rData }, { data: pData }
      ] = await Promise.all([
        supabase.from('clan_settings').select('*').eq('id', 1).single(),
        supabase.from('profiles').select('*, roles(name, is_staff, hierarchy_level)').neq('member_status', 'pendiente').order('nickname'),
        supabase.from('events').select('*').neq('status', 'cancelado').order('event_date', { ascending: true }),
        supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('gallery_items').select('*').eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('rules_versions').select('*').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('points_ledger').select('points, user_id, profiles(nickname, free_fire_id)')
      ]);

      if (sData) setSettings(sData);
      if (mData) setMembers(mData);
      if (eData) setEvents(eData);
      if (aData) setAnnouncements(aData);
      if (gData) setGallery(gData);
      if (rData) setRules(rData);

      if (pData) {
        const totals: Record<string, { nickname: string; ffid: string; points: number }> = {};
        pData.forEach((row: any) => {
          if (!totals[row.user_id]) {
            totals[row.user_id] = {
              nickname: row.profiles?.nickname || 'Integrante',
              ffid: row.profiles?.free_fire_id || '-',
              points: 0
            };
          }
          totals[row.user_id].points += row.points;
        });
        setRankings(Object.values(totals).sort((a, b) => b.points - a.points));
      }
    }
    loadSupabase();
  }, []);

  function navigate(target: PageId) {
    setPage(target);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appForm.rules_accepted) return showToast('Debes aceptar el reglamento del clan.');
    const minAge = settings?.min_age || 13;
    if (Number(appForm.age_value) < minAge) return showToast(`La edad mínima es de ${minAge} años.`);

    const { error } = await supabase.from('applications_clan').insert({
      user_id: user?.id || null,
      nickname: appForm.nickname,
      free_fire_id: appForm.free_fire_id,
      age_confirmed: true,
      age_value: Number(appForm.age_value),
      region: 'Sudamérica',
      country: appForm.country,
      preferred_mode: appForm.preferred_mode,
      main_mode: appForm.main_mode,
      schedule_availability: appForm.schedule_availability,
      experience: appForm.experience,
      motivation: appForm.motivation,
      rules_accepted: true
    });

    if (error) showToast('Error: ' + error.message);
    else {
      showToast('✦ Solicitud enviada. El equipo Staff la revisará pronto.');
      setAppForm({
        nickname: '', free_fire_id: '', age_value: '', country: 'Chile',
        preferred_mode: 'Escuadra Clasificatoria', main_mode: 'Ambos',
        schedule_availability: '', experience: '', motivation: '', rules_accepted: false
      });
    }
  }

  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return showToast('Inicia sesión primero para postular al Staff.');
    const { error } = await supabase.from('applications_staff').insert({
      user_id: user.id, ...staffForm, age_confirmed: true
    });
    if (error) showToast('Error: ' + error.message);
    else showToast('✦ Postulación al Staff enviada al Líder.');
  }

  const staffMembers = members
    .filter(m => m.roles?.is_staff)
    .sort((a, b) => (b.roles?.hierarchy_level || 0) - (a.roles?.hierarchy_level || 0));

  const filteredMembers = members.filter(m =>
    m.nickname.toLowerCase().includes(search.toLowerCase()) ||
    (m.free_fire_id || '').includes(search)
  );

  return (
    <div className="pk-layout">
      {/* BARRA LATERAL EXACTA A TU DISEÑO */}
      <aside className={`pk-side ${menuOpen ? 'open' : ''}`}>
        <div className="pk-brand">
          <span className="pk-logo">PK</span>
          <span>
            {settings?.clan_name || 'PARADISE KISS'}
            <small className="pk-sub">COMUNIDAD OFICIAL</small>
          </span>
        </div>

        <div className="pk-label">Explorar</div>
        <nav className="pk-nav-group">
          {([
            ['inicio', '⌂', 'Inicio'],
            ['clan', '✦', 'El clan'],
            ['integrantes', '♧', 'Integrantes'],
            ['staff', '⬡', 'Equipo del clan'],
            ['actividades', '▦', 'Actividades'],
            ['noticias', '▤', 'Noticias'],
            ['comunidad', '☏', 'Comunidad'],
            ['galeria', '▧', 'Galería'],
            ['reglamento', '▣', 'Reglamento'],
            ['contacto', '✉', 'Contacto'],
          ] as [PageId, string, string][]).map(([id, icon, label]) => (
            <button key={id} onClick={() => navigate(id)} className={`pk-nav ${page === id ? 'active' : ''}`}>
              {icon} &nbsp; {label}
            </button>
          ))}
        </nav>

        <div className="pk-label">Tu espacio</div>
        <nav className="pk-nav-group">
          <Link href="/panel" className="pk-nav" style={{ textDecoration: 'none' }}>
            ♙ &nbsp; Mi espacio
          </Link>
          <Link href="/admin" className="pk-nav" style={{ textDecoration: 'none' }}>
            ▤ &nbsp; Administración
          </Link>
        </nav>

        <div className="pk-sidefoot">Un mismo equipo, una misma pasión.</div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="pk-main">
        <header className="pk-top">
          <div>
            <button className="pk-btn pk-menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>{' '}
            <span style={{ fontSize: '13px', opacity: 0.85 }}>
              {settings?.clan_name || 'PARADISE KISS'} / {PAGE_NAMES[page]}
            </span>
          </div>

          <div className="pk-actions">
            <button className="pk-btn" onClick={() => setLightTheme(!lightTheme)} title="Cambiar tema">◐</button>
            {user ? (
              <Link href="/panel" className="pk-btn">Mi Panel</Link>
            ) : (
              <Link href="/auth" className="pk-btn">Ingresar</Link>
            )}
            <button className="pk-btn pk-primary" onClick={() => navigate('reclutamiento')}>
              Solicitar ingreso →
            </button>
          </div>
        </header>

        <div className="pk-content">
          <section key={page} className="pk-page">
            {/* 1. INICIO */}
            {page === 'inicio' && (
              <>
                <div className="pk-hero">
                  <div className="pk-hero-copy">
                    <span className="pk-tag">COMUNIDAD · COMPETENCIA · AMISTAD</span>
                    <h1>Juega con<br /><span className="pk-shine">tu gente.</span></h1>
                    <p style={{ color: '#d2cedc', lineHeight: 1.7, marginBottom: '20px' }}>
                      {settings?.short_description || 'Partidas, desafíos y buenos momentos. Conoce el clan y encuentra tu lugar en PARADISE KISS.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="pk-btn pk-primary" onClick={() => navigate('clan')}>Descubrir el clan →</button>
                      <button className="pk-btn" style={{ color: '#fff' }} onClick={() => navigate('reclutamiento')}>Quiero unirme</button>
                    </div>
                  </div>
                </div>

                <div className="pk-stats">
                  <div className="pk-stat">Integrantes<b>{members.length}</b><small>Roster oficial registrado</small></div>
                  <div className="pk-stat">Próximas actividades<b>{events.length}</b><small>Agenda del clan</small></div>
                  <div className="pk-stat">Comunidad<b>PK</b><small>Un equipo, muchas historias</small></div>
                  <div className="pk-stat">Convocatoria<b>{settings?.recruitment_open ? 'Abierta' : 'Cerrada'}</b><small>Edad mínima {settings?.min_age || 13}+</small></div>
                </div>

                <div className="pk-row">
                  <h2 style={{ margin: 0 }}>Un espacio para cada momento</h2>
                  <button className="pk-btn" onClick={() => navigate('actividades')}>Ver actividades →</button>
                </div>
                <div className="pk-grid">
                  <article className="pk-card"><div className="pk-icon">♧</div><h3>Conoce al equipo</h3><p className="pk-muted">Descubre a quienes forman parte del clan y su estructura oficial.</p></article>
                  <article className="pk-card"><div className="pk-icon">▦</div><h3>Juega en comunidad</h3><p className="pk-muted">Encuentra entrenamientos, salas personalizadas y partidas grupales.</p></article>
                  <article className="pk-card"><div className="pk-icon">✦</div><h3>Crece con el clan</h3><p className="pk-muted">Comparte tus logros, suma puntos y crea nuevas historias.</p></article>
                </div>
              </>
            )}

            {/* 2. EL CLAN */}
            {page === 'clan' && (
              <>
                <p className="pk-eyebrow">CONÓCENOS</p>
                <h1 className="pk-title">El clan</h1>
                <p className="pk-muted">{settings?.slogan}</p>
                <div className="pk-hero" style={{ marginTop: '18px' }}>
                  <div className="pk-hero-copy">
                    <span className="pk-tag">UNA COMUNIDAD HECHA EN EQUIPO</span>
                    <h1>Más que una<br /><span className="pk-shine">partida.</span></h1>
                    <p style={{ color: '#d2cedc', lineHeight: 1.7, marginBottom: '18px' }}>{settings?.history}</p>
                    <button className="pk-btn pk-primary" onClick={() => navigate('reclutamiento')}>Conoce cómo postular →</button>
                  </div>
                </div>
                <div className="pk-row"><h2>Nuestra esencia</h2></div>
                <div className="pk-grid">
                  <article className="pk-card"><div className="pk-icon">✦</div><h3>Objetivos</h3><p className="pk-muted">{settings?.objectives}</p></article>
                  <article className="pk-card"><div className="pk-icon">♧</div><h3>Valores</h3><p className="pk-muted">{settings?.clan_values}</p></article>
                  <article className="pk-card"><div className="pk-icon">⬡</div><h3>Requisitos</h3><p className="pk-muted">{settings?.recruitment_requirements}</p></article>
                </div>
              </>
            )}

            {/* 3. INTEGRANTES */}
            {page === 'integrantes' && (
              <>
                <div className="pk-row" style={{ marginTop: 0 }}>
                  <div>
                    <p className="pk-eyebrow">LA COMUNIDAD</p>
                    <h1 className="pk-title">Integrantes ({filteredMembers.length})</h1>
                  </div>
                  <div className="pk-field" style={{ margin: 0, width: '260px' }}>
                    <input placeholder="Buscar nick o ID..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
                {filteredMembers.length === 0 ? (
                  <p className="pk-muted">No hay integrantes oficiales registrados todavía.</p>
                ) : (
                  <div className="pk-grid">
                    {filteredMembers.map(m => (
                      <article key={m.id} className="pk-card">
                        <div className="pk-profile">
                          <div className="pk-avatar">{m.nickname.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <h3 style={{ margin: '0 0 4px' }}>{m.nickname}</h3>
                            <span className="pk-tag">{m.roles?.name}</span>
                            <span className="pk-tag">{m.member_status}</span>
                          </div>
                        </div>
                        <p className="pk-muted" style={{ fontSize: '12px', margin: 0 }}>
                          ID FF: {m.free_fire_id || 'Privado'} • {m.clan_rank}
                        </p>
                        {m.bio && <p className="pk-muted" style={{ fontSize: '13px', marginTop: '8px' }}>{m.bio}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 4. EQUIPO DEL CLAN (STAFF) */}
            {page === 'staff' && (
              <>
                <p className="pk-eyebrow">QUIÉNES NOS ACOMPAÑAN</p>
                <h1 className="pk-title">Equipo del clan</h1>
                <p className="pk-muted">Estructura oficial de liderazgo y administración.</p>
                <div className="pk-grid">
                  {staffMembers.length > 0 ? staffMembers.map(s => (
                    <article key={s.id} className="pk-card">
                      <div className="pk-avatar" style={{ marginBottom: '12px' }}>{s.nickname.slice(0, 2).toUpperCase()}</div>
                      <span className="pk-tag">{s.staff_title || s.roles?.name}</span>
                      <h3>{s.nickname}</h3>
                      <p className="pk-muted">{s.staff_responsibilities || 'Gestión y coordinación de PARADISE KISS.'}</p>
                    </article>
                  )) : (
                    [['L', 'Liderazgo', 'Dirección y decisiones del clan.'],
                     ['C', 'Co-liderazgo', 'Apoyo en la coordinación.'],
                     ['R', 'Reclutamiento', 'Recepción de postulaciones.'],
                     ['M', 'Moderación', 'Convivencia y ayuda.'],
                     ['E', 'Eventos', 'Organización de actividades.'],
                     ['C', 'Comunicaciones', 'Noticias y avisos oficiales.']].map((x, idx) => (
                      <article key={idx} className="pk-card">
                        <div className="pk-avatar" style={{ marginBottom: '12px' }}>{x[0]}</div>
                        <h3>{x[1]}</h3>
                        <p className="pk-muted">{x[2]}</p>
                      </article>
                    ))
                  )}
                </div>
              </>
            )}

            {/* 5. ACTIVIDADES */}
            {page === 'actividades' && (
              <>
                <p className="pk-eyebrow">AGENDA DEL CLAN</p>
                <h1 className="pk-title">Actividades</h1>
                <p className="pk-muted">Entrenamientos, salas personalizadas y encuentros oficiales.</p>
                {events.length === 0 ? (
                  <p className="pk-muted">Aún no hay actividades programadas en el calendario.</p>
                ) : (
                  <div className="pk-grid">
                    {events.map(ev => (
                      <article key={ev.id} className="pk-card pk-event">
                        <span className="pk-tag">{ev.activity_type}</span>
                        <h3>{ev.title}</h3>
                        <p style={{ color: '#d2cedc', fontSize: '13px' }}>{ev.description}</p>
                        <p style={{ color: '#ffb0d0', fontSize: '12px' }}>
                          {new Date(ev.event_date).toLocaleString()} · Modalidad: {ev.mode}
                        </p>
                        <Link href="/panel" className="pk-btn" style={{ color: '#fff' }}>Inscribirme en Mi Panel →</Link>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 6. NOTICIAS */}
            {page === 'noticias' && (
              <>
                <p className="pk-eyebrow">AL DÍA</p>
                <h1 className="pk-title">Noticias y comunicados</h1>
                {announcements.length === 0 ? (
                  <p className="pk-muted">No hay comunicados publicados todavía.</p>
                ) : (
                  <div className="pk-grid">
                    {announcements.map(a => (
                      <article key={a.id} className="pk-card pk-event">
                        <span className="pk-tag">{a.category}</span>
                        <h3>{a.title}</h3>
                        <p style={{ color: '#d2cedc', fontSize: '13px', whiteSpace: 'pre-line' }}>{a.content}</p>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 7. COMUNIDAD & RANKINGS */}
            {page === 'comunidad' && (
              <>
                <p className="pk-eyebrow">COMPETENCIA INTERNA</p>
                <h1 className="pk-title">Comunidad & Ranking</h1>
                <div className="pk-grid pk-two">
                  <article className="pk-card">
                    <span className="pk-tag">TEMPORADA ACTUAL</span>
                    <h3>Tabla de Puntos Oficial</h3>
                    {rankings.length === 0 ? (
                      <p className="pk-muted">Aún no se han asignado puntos en la temporada actual.</p>
                    ) : (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                        {rankings.map((r, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                            <span><b>#{idx + 1}</b> {r.nickname}</span>
                            <span style={{ color: 'var(--pink)', fontWeight: 700 }}>{r.points} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                  <article className="pk-card">
                    <div className="pk-icon">✦</div>
                    <h3>Postulación al Equipo Staff</h3>
                    <p className="pk-muted">¿Quieres ayudar a organizar salas, reclutar o moderar?</p>
                    <form onSubmit={handleStaffSubmit}>
                      <div className="pk-field"><label>Nickname</label><input required value={staffForm.nickname} onChange={e => setStaffForm({ ...staffForm, nickname: e.target.value })} /></div>
                      <div className="pk-field"><label>ID Free Fire</label><input required value={staffForm.free_fire_id} onChange={e => setStaffForm({ ...staffForm, free_fire_id: e.target.value })} /></div>
                      <div className="pk-field">
                        <label>Cargo al que postulas</label>
                        <select value={staffForm.target_role} onChange={e => setStaffForm({ ...staffForm, target_role: e.target.value })}>
                          <option>Reclutador</option><option>Moderador</option><option>Administrador</option><option>Encargado de eventos</option>
                        </select>
                      </div>
                      <div className="pk-field"><label>Experiencia y disponibilidad</label><textarea required value={staffForm.admin_experience} onChange={e => setStaffForm({ ...staffForm, admin_experience: e.target.value })} /></div>
                      <button type="submit" className="pk-btn pk-primary">Enviar postulación Staff</button>
                    </form>
                  </article>
                </div>
              </>
            )}

            {/* 8. GALERÍA */}
            {page === 'galeria' && (
              <>
                <p className="pk-eyebrow">MOMENTOS PK</p>
                <h1 className="pk-title">Galería oficial</h1>
                {gallery.length === 0 ? (
                  <p className="pk-muted">Aún no hay capturas aprobadas en la galería.</p>
                ) : (
                  <div className="pk-grid">
                    {gallery.map(item => (
                      <article key={item.id} className="pk-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <img src={item.media_url} alt={item.title} style={{ width: '100%', height: '190px', objectFit: 'cover' }} />
                        <div style={{ padding: '14px' }}>
                          <span className="pk-tag">{item.category}</span>
                          <h3 style={{ margin: 0 }}>{item.title}</h3>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 9. REGLAMENTO */}
            {page === 'reglamento' && (
              <>
                <p className="pk-eyebrow">CONVIVENCIA · {rules?.version_label}</p>
                <h1 className="pk-title">Reglamento oficial</h1>
                <div className="pk-grid pk-two">
                  {[
                    ['01', 'Reglas Generales', rules?.general_rules],
                    ['02', 'Normas de Convivencia', rules?.coexistence_rules],
                    ['03', 'Reglas de Actividad', rules?.activity_rules],
                    ['04', 'Advertencias y Sanciones', rules?.sanctions_info],
                    ['05', 'Preguntas Frecuentes', rules?.faq],
                  ].map(([num, title, text], i) => (
                    <article key={i} className="pk-card pk-rule">
                      <div className="pk-num">{num}</div>
                      <div>
                        <h3>{title}</h3>
                        <p className="pk-muted" style={{ whiteSpace: 'pre-line' }}>{text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {/* 10. CONTACTO */}
            {page === 'contacto' && (
              <>
                <p className="pk-eyebrow">HABLEMOS</p>
                <h1 className="pk-title">Contacto y soporte</h1>
                <div className="pk-grid pk-two">
                  <article className="pk-card">
                    <div className="pk-icon">✉</div>
                    <h3>Tickets de Ayuda para Integrantes</h3>
                    <p className="pk-muted">Si ya eres parte de PARADISE KISS, abre un ticket privado desde tu panel para justificar ausencias o hacer consultas al Staff.</p>
                    <Link href="/panel" className="pk-btn pk-primary">Ir a Mi Panel →</Link>
                  </article>
                  <article className="pk-card">
                    <div className="pk-icon">✦</div>
                    <h3>Postulación Directa</h3>
                    <p className="pk-muted">¿Quieres unirte al clan? Completa el formulario oficial de ingreso.</p>
                    <button className="pk-btn" onClick={() => navigate('reclutamiento')}>Ir al formulario →</button>
                  </article>
                </div>
              </>
            )}

            {/* 11. SOLICITAR INGRESO (RECLUTAMIENTO REAL) */}
            {page === 'reclutamiento' && (
              <>
                <p className="pk-eyebrow">CRECE CON NOSOTROS</p>
                <h1 className="pk-title">Solicitar ingreso a PARADISE KISS</h1>
                <article className="pk-card" style={{ maxWidth: '680px' }}>
                  <form onSubmit={handleJoinSubmit}>
                    <div className="pk-grid pk-two">
                      <div className="pk-field"><label>Nickname en Free Fire *</label><input required value={appForm.nickname} onChange={e => setAppForm({ ...appForm, nickname: e.target.value })} placeholder="Ej: PK・Cinnangel" /></div>
                      <div className="pk-field"><label>ID de Jugador *</label><input required value={appForm.free_fire_id} onChange={e => setAppForm({ ...appForm, free_fire_id: e.target.value })} placeholder="Ej: 1234567890" /></div>
                    </div>
                    <div className="pk-grid pk-two">
                      <div className="pk-field"><label>Edad *</label><input required type="number" value={appForm.age_value} onChange={e => setAppForm({ ...appForm, age_value: e.target.value })} placeholder="Mínimo 13" /></div>
                      <div className="pk-field"><label>País *</label><input required value={appForm.country} onChange={e => setAppForm({ ...appForm, country: e.target.value })} /></div>
                    </div>
                    <div className="pk-field"><label>Disponibilidad horaria *</label><input required value={appForm.schedule_availability} onChange={e => setAppForm({ ...appForm, schedule_availability: e.target.value })} placeholder="Ej: Tardes y noches" /></div>
                    <div className="pk-field"><label>Experiencia en Free Fire *</label><textarea required value={appForm.experience} onChange={e => setAppForm({ ...appForm, experience: e.target.value })} /></div>
                    <div className="pk-field"><label>¿Por qué quieres unirte? *</label><textarea required value={appForm.motivation} onChange={e => setAppForm({ ...appForm, motivation: e.target.value })} /></div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', margin: '12px 0' }}>
                      <input type="checkbox" checked={appForm.rules_accepted} onChange={e => setAppForm({ ...appForm, rules_accepted: e.target.checked })} />
                      Confirmo cumplir la edad mínima y acepto el reglamento de PARADISE KISS.
                    </label>
                    <button type="submit" className="pk-btn pk-primary">Enviar solicitud oficial</button>
                  </form>
                </article>
              </>
            )}
          </section>

          <div className="pk-foot">{settings?.clan_name || 'PARADISE KISS'} · Comunidad oficial</div>
        </div>
      </main>

      <div className={`pk-toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
