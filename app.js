// Credenciales de Supabase
const supabase_url = 'https://ijcytjuvgexjzilrbdeg.supabase.co';
const supabase_key = 'sb_publishable_iCtqB1w6QHXS-QJ5Ourc8w_CFBv-DPJ';

// PIN de acceso administrativo al panel interno
const pin_departamento = '2026';

const usar_nube = supabase_url.startsWith('https://') && supabase_key.length > 20;
const cliente_db = usar_nube ? window.supabase.createClient(supabase_url, supabase_key) : null;

let servicio_actual = 'Diseño de material gráfico';
let aplica_evento = true;
let solicitudes = [];
let filtro_activo = 'todos';
let sesion_autorizada = localStorage.getItem('equipo_comunicacion_autorizado') === 'true';

const configuracion_servicios = {
  'Diseño de material gráfico': {
    label_esp: 'Formato y medidas requeridas',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Texto e información clave que debe contener el diseño',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  },
  'Difusión en redes sociales': {
    label_esp: 'Redes sociales destino y fecha de publicación',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Copy (texto de la publicación) o enlace al material base',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  },
  'Cobertura fotográfica/audiovisual': {
    label_esp: 'Tipo de cobertura requerida',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Momentos clave o autoridades a destacar',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  },
  'Producción de videos': {
    label_esp: 'Duración estimada y formato',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Objetivo y guion general o referencias',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  },
  'Revisión y visto bueno de materiales': {
    label_esp: 'Tipo de material y medio de difusión',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Enlace al archivo (Drive/Canva) para validación',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  },
  'Campañas institucionales': {
    label_esp: 'Público objetivo y periodo de difusión',
    placeholder_esp: 'Ej. Dpto. Comunicación y Difusión',
    label_desc: 'Mensaje central y objetivos de la campaña',
    placeholder_desc: 'Ej. Dpto. Comunicación y Difusión'
  }
};

function refrescar_iconos() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function inicializar() {
  const hoy = new Date();
  document.getElementById('fecha-actual').textContent = hoy.toLocaleDateString('es-MX');
  window.addEventListener('scroll', controlar_flecha_flotante);

  const badge = document.getElementById('estado-conexion');
  if (usar_nube) {
    badge.textContent = '● Conectado';
    badge.classList.add('online');
  } else {
    badge.textContent = 'Desconectado';
    badge.classList.remove('online');
  }

  actualizar_icono_candado();
  await cargar_solicitudes();
}

function actualizar_icono_candado() {
  const icono = document.getElementById('icono-candado');
  if (icono) {
    icono.setAttribute('data-lucide', sesion_autorizada ? 'unlock' : 'lock');
    refrescar_iconos();
  }
}

function intentar_abrir_panel() {
  if (sesion_autorizada) {
    cambiar_vista('panel');
  } else {
    document.getElementById('input-pin').value = '';
    document.getElementById('modal-pin').classList.remove('oculto');
    setTimeout(() => document.getElementById('input-pin').focus(), 100);
  }
}

function verificar_pin(e) {
  e.preventDefault();
  const pin_ingresado = document.getElementById('input-pin').value.trim();
  const recordar = document.getElementById('check-recordar-pin').checked;

  if (pin_ingresado === pin_departamento) {
    sesion_autorizada = true;
    if (recordar) {
      localStorage.setItem('equipo_comunicacion_autorizado', 'true');
    }
    actualizar_icono_candado();
    cerrar_modal_pin();
    cambiar_vista('panel');
  } else {
    alert('PIN institucional incorrecto.');
  }
}

function cerrar_modal_pin() {
  document.getElementById('modal-pin').classList.add('oculto');
}

function cerrar_sesion_admin() {
  sesion_autorizada = false;
  localStorage.removeItem('equipo_comunicacion_autorizado');
  actualizar_icono_candado();
  cambiar_vista('formulario');
}

async function consultar_folio_publico(e) {
  e.preventDefault();
  await cargar_solicitudes();

  const codigo_buscado = document.getElementById('input-rastreo-folio').value.trim().toUpperCase();
  const contenedor_res = document.getElementById('resultado-rastreo');
  const encontrado = solicitudes.find(s => s.folio.toUpperCase() === codigo_buscado);

  contenedor_res.classList.remove('oculto');

  if (!encontrado) {
    contenedor_res.innerHTML = `
      <div class="tarjeta-rastreo-publico">
        <p style="color: #991b1b; font-size: 0.88rem; font-weight: 600;">
          No se encontró ninguna solicitud con el folio institucional "${codigo_buscado}".
        </p>
      </div>
    `;
    return;
  }

  const estado_calculado = calcular_estado_automatico(encontrado);
  const clase_estado = 'estado-' + estado_calculado.replace(' ', '-');
  const lista_notas = obtener_arreglo_notas(encontrado.observaciones);
  const notas_publicas = lista_notas.length > 0
    ? lista_notas.map(n => `<div class="nota-individual"><span>${n}</span></div>`).join('')
    : `<div class="sin-fecha-aviso">Sin notas registradas por el departamento.</div>`;

  contenedor_res.innerHTML = `
    <div class="tarjeta-rastreo-publico">
      <div class="ticket-header-line">
        <div>
          <span class="ticket-folio">${encontrado.folio} · Solicitado el ${encontrado.fecha_solicitud}</span>
          <div class="ticket-servicio">${encontrado.servicio}</div>
          <div class="ticket-detalles"><i data-lucide="user"></i> <strong>Área:</strong> ${encontrado.solicitante}</div>
        </div>
        <span class="badge-estado-actual ${clase_estado}">
          <span class="punto-estado"></span>
          <span>${estado_calculado}</span>
        </span>
      </div>

      <div class="rastreo-grid-meta">
        <div><strong>Responsable asignado:</strong> ${encontrado.responsable || 'Por asignar'}</div>
        <div><strong>Fecha límite estimada:</strong> ${encontrado.fecha_limite || 'En valoración'}</div>
      </div>

      <div class="caja-notas" style="border-top: none; padding-top: 0;">
        <span class="titulo-notas"><i data-lucide="message-square"></i> Bitácora de seguimiento:</span>
        <div class="lista-notas-items">${notas_publicas}</div>
      </div>

      <div style="margin-top: 0.85rem; text-align: right;">
        <button type="button" class="btn-cerrar-rastreo" onclick="cerrar_rastreo_publico()">Cerrar consulta</button>
      </div>
    </div>
  `;

  refrescar_iconos();
}

function cerrar_rastreo_publico() {
  document.getElementById('resultado-rastreo').classList.add('oculto');
  document.getElementById('input-rastreo-folio').value = '';
}

// Lógica para calcular estatus automáticamente
function calcular_estado_automatico(item) {
  const ahora = new Date();

  // 1. Si hay fecha de evento y ya pasó la fecha y hora, se marca como Terminado automáticamente
  if (item.aplica_evento && item.fecha_evento) {
    const hora_ev = item.hora_evento || '23:59';
    const fecha_evento_completa = new Date(`${item.fecha_evento}T${hora_ev}:00`);
    if (ahora >= fecha_evento_completa) {
      return 'Terminado';
    }
  }

  // 2. Si hay fecha límite establecida y ya pasó, se marca como Terminado
  if (item.fecha_limite) {
    const fecha_limite_completa = new Date(`${item.fecha_limite}T23:59:00`);
    if (ahora >= fecha_limite_completa) {
      return 'Terminado';
    }
  }

  // 3. Si se asignó un responsable (que no sea "Sin asignar") o tiene fecha límite, cambia a En proceso
  const tiene_responsable = item.responsable && item.responsable.trim() !== '' && item.responsable.trim().toLowerCase() !== 'sin asignar';
  const tiene_limite = item.fecha_limite && item.fecha_limite.trim() !== '';

  if (tiene_responsable || tiene_limite) {
    return 'En proceso';
  }

  // 4. Por defecto se queda en Pendiente
  return 'Pendiente';
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
    solicitudes = JSON.parse(localStorage.getItem('tickets_itp_v6')) || [
      {
        id: 1,
        folio: 'SRV-001',
        fecha_solicitud: '22/10/2026',
        servicio: 'Cobertura fotográfica/audiovisual',
        solicitante: 'Depto. de Sistemas y Computación',
        descripcion: '[Fotografía general] — Ceremonia de entrega de títulos',
        aplica_evento: true,
        fecha_evento: '2026-10-28',
        hora_evento: '11:00',
        lugar_evento: 'Auditorio Principal',
        responsable: 'Equipo Audiovisual ITP',
        fecha_limite: '',
        observaciones: '[22/10/2026] Solicitud recibida y en proceso de asignación.'
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

function seleccionar_servicio(elemento, nombre_servicio) {
  document.querySelectorAll('.tarjeta-servicio').forEach(t => t.classList.remove('seleccionada'));
  elemento.classList.add('seleccionada');
  servicio_actual = nombre_servicio;
  document.getElementById('texto-servicio-elegido').textContent = nombre_servicio;

  const conf = configuracion_servicios[nombre_servicio];
  if (conf) {
    document.getElementById('label-especifico').textContent = conf.label_esp;
    document.getElementById('detalle-especifico').placeholder = conf.placeholder_esp;
    document.getElementById('label-descripcion').textContent = conf.label_desc;
    document.getElementById('descripcion').placeholder = conf.placeholder_desc;
  }

  alternar_evento(true);

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
  texto_btn.textContent = 'Enviando solicitud...';

  const nuevo_folio = actualizar_folio_preview();
  const fecha_hoy = document.getElementById('fecha-actual').textContent;
  const esp_valor = document.getElementById('detalle-especifico').value.trim();
  const desc_valor = document.getElementById('descripcion').value.trim();

  const nueva = {
    folio: nuevo_folio,
    fecha_solicitud: fecha_hoy,
    servicio: servicio_actual,
    solicitante: document.getElementById('solicitante').value.trim(),
    descripcion: `[${esp_valor}] — ${desc_valor}`,
    aplica_evento: aplica_evento,
    fecha_evento: aplica_evento ? document.getElementById('fecha-evento').value : '',
    hora_evento: aplica_evento ? document.getElementById('hora-evento').value : '',
    lugar_evento: aplica_evento ? document.getElementById('lugar-evento').value.trim() : '',
    estado: 'Pendiente',
    responsable: 'Sin asignar',
    fecha_limite: '',
    observaciones: `[${fecha_hoy}] Solicitud registrada en plataforma.`
  };

  if (usar_nube) {
    const { error } = await cliente_db.from('solicitudes').insert([nueva]);
    if (error) {
      alert('Error al guardar: ' + error.message);
      btn_submit.disabled = false;
      texto_btn.textContent = 'Enviar solicitud oficial';
      return;
    }
    await cargar_solicitudes();
  } else {
    solicitudes.unshift(nueva);
    localStorage.setItem('tickets_itp_v6', JSON.stringify(solicitudes));
    actualizar_folio_preview();
    renderizar_tickets();
  }

  document.getElementById('form-solicitud').reset();
  alternar_evento(true);
  btn_submit.disabled = false;
  texto_btn.textContent = 'Enviar solicitud oficial';

  document.getElementById('modal-folio-texto').textContent = nuevo_folio;
  document.getElementById('modal-exito').classList.remove('oculto');
}

function filtrar_estado(estado, btn) {
  filtro_activo = estado;
  document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  renderizar_tickets();
}

function obtener_arreglo_notas(cadena_observaciones) {
  if (!cadena_observaciones || !cadena_observaciones.trim()) return [];
  return cadena_observaciones.split(' | ').map(n => n.trim()).filter(Boolean);
}

function renderizar_tickets() {
  const contenedor = document.getElementById('contenedor-tickets');
  const texto_busqueda = document.getElementById('buscador-tickets').value.toLowerCase();
  
  const filtrados = solicitudes.filter(item => {
    const estado_calculado = calcular_estado_automatico(item);
    const cumple_estado = filtro_activo === 'todos' || estado_calculado === filtro_activo;
    const cumple_busqueda = item.solicitante.toLowerCase().includes(texto_busqueda) || 
                            item.folio.toLowerCase().includes(texto_busqueda) ||
                            item.servicio.toLowerCase().includes(texto_busqueda);
    return cumple_estado && cumple_busqueda;
  });

  document.getElementById('contador-tickets').textContent = solicitudes.length;

  if (filtrados.length === 0) {
    contenedor.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--ink-muted);">No se encontraron solicitudes con esos criterios.</div>`;
    return;
  }

  contenedor.innerHTML = filtrados.map((item) => {
    const index_real = solicitudes.findIndex(s => s.folio === item.folio);
    const tiene_fecha_limite = Boolean(item.fecha_limite && item.fecha_limite.trim() !== '');
    
    // Estado calculado automáticamente
    const estado_actual = calcular_estado_automatico(item);
    const clase_estado = 'estado-' + estado_actual.replace(' ', '-');
    const lista_notas = obtener_arreglo_notas(item.observaciones);

    const info_evento = item.aplica_evento
      ? `<div class="ticket-detalles"><i data-lucide="map-pin"></i> <strong>Lugar:</strong> ${item.lugar_evento} · <i data-lucide="calendar"></i> ${item.fecha_evento} (${item.hora_evento} hrs)</div>`
      : `<div class="ticket-detalles"><i data-lucide="info"></i> Sin evento presencial asociado</div>`;

    const html_notas = lista_notas.length > 0
      ? lista_notas.map((nota_texto, idx_nota) => `
          <div class="nota-individual">
            <span>${nota_texto}</span>
            <div class="acciones-nota">
              <button type="button" class="btn-icono-nota" onclick="editar_nota(${index_real}, ${idx_nota})" title="Editar nota">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="btn-icono-nota borrar" onclick="eliminar_nota(${index_real}, ${idx_nota})" title="Eliminar nota">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        `).join('')
      : `<div class="sin-fecha-aviso">Sin notas registradas.</div>`;

    return `
      <div class="ticket-item">
        <div class="ticket-header-line">
          <div>
            <span class="ticket-folio">${item.folio} · Solicitado: ${item.fecha_solicitud}</span>
            <div class="ticket-servicio">${item.servicio}</div>
            <div class="ticket-detalles"><i data-lucide="user"></i> <strong>${item.solicitante}:</strong> ${item.descripcion}</div>
            ${info_evento}
          </div>

          <!-- Badge de Estado Automático (Sin Menú Desplegable) -->
          <div class="selector-estado-contenedor">
            <span class="selector-estado-label">Estatus automático</span>
            <span class="badge-estado-actual ${clase_estado}">
              <span class="punto-estado"></span>
              <span>${estado_actual}</span>
            </span>
          </div>
        </div>

        <!-- Panel de Gestión Interna -->
        <div class="panel-gestion-interno">
          <div class="campo-interno">
            <label>Responsable asignado</label>
            <input type="text" value="${item.responsable || 'Sin asignar'}" placeholder="Personal de comunicación" onchange="actualizar_campo(${index_real}, 'responsable', this.value)">
          </div>

          <div class="campo-interno">
            <div class="cabecera-fecha-opcional">
              <label style="margin-bottom: 0;">Fecha límite de entrega</label>
              <label class="toggle-fecha-manual">
                <input type="checkbox" ${tiene_fecha_limite ? 'checked' : ''} onchange="alternar_fecha_limite_manual(${index_real}, this.checked)">
                <span>Habilitar</span>
              </label>
            </div>
            ${tiene_fecha_limite 
              ? `<input type="date" value="${item.fecha_limite}" onchange="actualizar_campo(${index_real}, 'fecha_limite', this.value)">`
              : `<div class="sin-fecha-aviso">Sin fecha límite asignada</div>`
            }
          </div>
        </div>

        <!-- Bitácora de Notas -->
        <div class="caja-notas">
          <div class="encabezado-notas">
            <span class="titulo-notas"><i data-lucide="message-square"></i> Bitácora de seguimiento interno</span>
            <span class="ayuda-notas">Comentarios y acuerdos de la solicitud</span>
          </div>
          <div class="lista-notas-items">
            ${html_notas}
          </div>
          <div class="input-nota-grupo">
            <input type="text" id="nota-input-${index_real}" placeholder="Escribe un avance o acuerdo...">
            <button type="button" class="btn-agregar-nota" onclick="agregar_nota(${index_real})">
              <i data-lucide="plus"></i> Agregar
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  refrescar_iconos();
}

async function alternar_fecha_limite_manual(index, habilitado) {
  if (habilitado) {
    const hoy_iso = new Date().toISOString().split('T')[0];
    await actualizar_campo(index, 'fecha_limite', hoy_iso);
  } else {
    await actualizar_campo(index, 'fecha_limite', '');
  }
  renderizar_tickets();
}

async function actualizar_campo(index, campo, valor) {
  solicitudes[index][campo] = valor;
  const item = solicitudes[index];

  if (usar_nube && item.id) {
    const datos_update = {};
    datos_update[campo] = valor;
    await cliente_db.from('solicitudes').update(datos_update).eq('id', item.id);
  } else {
    localStorage.setItem('tickets_itp_v6', JSON.stringify(solicitudes));
  }
  renderizar_tickets();
}

async function agregar_nota(index) {
  const input = document.getElementById(`nota-input-${index}`);
  const texto = input.value.trim();
  if (!texto) return;

  const item = solicitudes[index];
  const lista = obtener_arreglo_notas(item.observaciones);
  lista.push(`[${new Date().toLocaleDateString('es-MX')}] ${texto}`);
  const nueva_cadena = lista.join(' | ');

  await actualizar_campo(index, 'observaciones', nueva_cadena);
  renderizar_tickets();
}

async function editar_nota(index_ticket, index_nota) {
  const item = solicitudes[index_ticket];
  const lista = obtener_arreglo_notas(item.observaciones);
  const texto_actual = lista[index_nota];

  const nuevo_texto = prompt('Editar nota de seguimiento:', texto_actual);
  if (nuevo_texto !== null && nuevo_texto.trim() !== '') {
    lista[index_nota] = nuevo_texto.trim();
    await actualizar_campo(index_ticket, 'observaciones', lista.join(' | '));
    renderizar_tickets();
  }
}

async function eliminar_nota(index_ticket, index_nota) {
  const item = solicitudes[index_ticket];
  const lista = obtener_arreglo_notas(item.observaciones);
  lista.splice(index_nota, 1);

  await actualizar_campo(index_ticket, 'observaciones', lista.join(' | '));
  renderizar_tickets();
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