// credenciales de supabase configuradas automáticamente
const supabase_url = 'https://ijcytjuvgexjzilrbdeg.supabase.co';
const supabase_key = 'sb_publishable_iCtqB1w6QHXS-QJ5Ourc8w_CFBv-DPJ';

const usar_nube = supabase_url.startsWith('https://') && supabase_key.length > 20;
const cliente_db = usar_nube ? window.supabase.createClient(supabase_url, supabase_key) : null;

let servicio_actual = 'Diseño de material gráfico';
let aplica_evento = false;
let solicitudes = [];

async function inicializar() {
  const hoy = new Date();
  document.getElementById('fecha-actual').textContent = hoy.toLocaleDateString('es-MX');
  window.addEventListener('scroll', controlar_flecha_flotante);

  const badge = document.getElementById('estado-conexion');
  if (usar_nube) {
    badge.textContent = '● Conectado a Supabase';
    badge.classList.add('online');
  } else {
    badge.textContent = 'Modo Demo Local';
  }

  await cargar_solicitudes();
}

async function cargar_solicitudes() {
  if (usar_nube) {
    const { data, error } = await cliente_db
      .from('solicitudes')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      solicitudes = data;
    }
  } else {
    solicitudes = JSON.parse(localStorage.getItem('tickets_servicio_v2')) || [
      {
        id: 1,
        folio: 'SRV-001',
        fecha_solicitud: '19/10/2026',
        servicio: 'Cobertura fotográfica/audiovisual',
        solicitante: 'Dirección General',
        descripcion: 'Toma de fotografías para ceremonia de bienvenida',
        aplica_evento: true,
        fecha_evento: '2026-10-24',
        hora_evento: '10:00',
        lugar_evento: 'Auditorio Central',
        estado: 'En proceso'
      }
    ];
  }

  actualizar_folio_preview();
  renderizar_tickets();
}

function controlar_flecha_flotante() {
  const btn_subir = document.getElementById('btn-subir');
  if (window.scrollY > 220) {
    btn_subir.classList.add('visible');
  } else {
    btn_subir.classList.remove('visible');
  }
}

function actualizar_folio_preview() {
  const siguiente_numero = solicitudes.length + 1;
  const codigo = 'SRV-' + String(siguiente_numero).padStart(3, '0');
  document.getElementById('folio-preview').textContent = codigo;
  return codigo;
}

function seleccionar_servicio(elemento, nombre_servicio, sugiere_evento) {
  document.querySelectorAll('.tarjeta-servicio').forEach(t => t.classList.remove('seleccionada'));
  elemento.classList.add('seleccionada');
  servicio_actual = nombre_servicio;
  document.getElementById('texto-servicio-elegido').textContent = nombre_servicio;

  if (sugiere_evento && !aplica_evento) {
    alternar_evento(true);
  } else if (!sugiere_evento && aplica_evento) {
    alternar_evento(false);
  }

  const seccion_detalles = document.getElementById('seccion-detalles');
  seccion_detalles.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    document.getElementById('solicitante').focus({ preventScroll: true });
  }, 450);
}

function volver_catalogo() {
  const seccion_catalogo = document.getElementById('seccion-catalogo');
  seccion_catalogo.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function alternar_evento(forzar_estado) {
  aplica_evento = typeof forzar_estado === 'boolean' ? forzar_estado : !aplica_evento;
  const bloque = document.getElementById('bloque-evento');
  const boton_switch = document.getElementById('switch-evento');

  if (aplica_evento) {
    bloque.classList.add('abierto');
    boton_switch.classList.add('activo');
    document.getElementById('fecha-evento').required = true;
    document.getElementById('hora-evento').required = true;
    document.getElementById('lugar-evento').required = true;
  } else {
    bloque.classList.remove('abierto');
    boton_switch.classList.remove('activo');
    document.getElementById('fecha-evento').required = false;
    document.getElementById('hora-evento').required = false;
    document.getElementById('lugar-evento').required = false;
  }
}

async function guardar_solicitud(e) {
  e.preventDefault();
  const btn_submit = document.getElementById('btn-submit-form');
  const texto_btn = document.getElementById('texto-btn-enviar');
  btn_submit.disabled = true;
  texto_btn.textContent = 'Guardando solicitud...';

  const nuevo_folio = actualizar_folio_preview();
  const fecha_hoy = document.getElementById('fecha-actual').textContent;

  const nueva = {
    folio: nuevo_folio,
    fecha_solicitud: fecha_hoy,
    servicio: servicio_actual,
    solicitante: document.getElementById('solicitante').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    aplica_evento: aplica_evento,
    fecha_evento: aplica_evento ? document.getElementById('fecha-evento').value : '',
    hora_evento: aplica_evento ? document.getElementById('hora-evento').value : '',
    lugar_evento: aplica_evento ? document.getElementById('lugar-evento').value.trim() : '',
    estado: 'Pendiente'
  };

  if (usar_nube) {
    const { error } = await cliente_db.from('solicitudes').insert([nueva]);
    if (error) {
      alert('Error al guardar en Supabase: ' + error.message);
      btn_submit.disabled = false;
      texto_btn.textContent = 'Registrar solicitud de servicio';
      return;
    }
    await cargar_solicitudes();
  } else {
    solicitudes.unshift(nueva);
    localStorage.setItem('tickets_servicio_v2', JSON.stringify(solicitudes));
    actualizar_folio_preview();
    renderizar_tickets();
  }

  document.getElementById('form-solicitud').reset();
  alternar_evento(false);
  btn_submit.disabled = false;
  texto_btn.textContent = 'Registrar solicitud de servicio';

  document.getElementById('modal-folio-texto').textContent = nuevo_folio;
  document.getElementById('modal-exito').classList.remove('oculto');
}

function renderizar_tickets() {
  const contenedor = document.getElementById('contenedor-tickets');
  document.getElementById('contador-tickets').textContent = solicitudes.length;

  contenedor.innerHTML = solicitudes.map((item, index) => {
    const info_evento = item.aplica_evento
      ? `<div class="ticket-detalles">📍 <strong>Evento:</strong> ${item.lugar_evento} · 📅 ${item.fecha_evento} a las ${item.hora_evento} hrs</div>`
      : `<div class="ticket-detalles">Sin evento presencial asociado</div>`;

    const clase_estado = item.estado === 'Pendiente' ? 'estado-pendiente' : 'estado-proceso';

    return `
      <div class="ticket-item">
        <div>
          <span class="ticket-folio">${item.folio} · Solicitado: ${item.fecha_solicitud}</span>
          <div class="ticket-servicio">${item.servicio}</div>
          <div class="ticket-detalles">👤 <strong>${item.solicitante}:</strong> ${item.descripcion}</div>
          ${info_evento}
        </div>
        <button class="estado-badge ${clase_estado}" onclick="cambiar_estado(${index})">
          ● ${item.estado}
        </button>
      </div>
    `;
  }).join('');
}

async function cambiar_estado(index) {
  const item = solicitudes[index];
  const nuevo_estado = item.estado === 'Pendiente' ? 'En proceso' : 'Pendiente';

  if (usar_nube && item.id) {
    await cliente_db
      .from('solicitudes')
      .update({ estado: nuevo_estado })
      .eq('id', item.id);
    await cargar_solicitudes();
  } else {
    solicitudes[index].estado = nuevo_estado;
    localStorage.setItem('tickets_servicio_v2', JSON.stringify(solicitudes));
    renderizar_tickets();
  }
}

function cambiar_vista(vista) {
  const v_form = document.getElementById('vista-formulario');
  const v_panel = document.getElementById('vista-panel');
  const b_nueva = document.getElementById('btn-nueva');
  const b_panel = document.getElementById('btn-panel');

  if (vista === 'formulario') {
    v_form.classList.remove('oculto');
    v_panel.classList.add('oculto');
    b_nueva.classList.add('activo');
    b_panel.classList.remove('activo');
  } else {
    v_form.classList.add('oculto');
    v_panel.classList.remove('oculto');
    b_nueva.classList.remove('activo');
    b_panel.classList.add('activo');
  }
}

function cerrar_modal() {
  document.getElementById('modal-exito').classList.add('oculto');
  volver_catalogo();
}

inicializar();