// credenciales de supabase
const supabase_url = 'https://ijcytjuvgexjzilrbdeg.supabase.co';
const supabase_key = 'sb_publishable_iCtqB1w6QHXS-QJ5Ourc8w_CFBv-DPJ';

// pin de acceso administrativo
const pin_departamento = '2026';
// token de seguridad interno para validar la sesión de forma robusta
const token_sesion_seguro = 'itp_comunicacion_token_autenticado_2026';

// configuración de correos y números de prueba para notificaciones
const correo_notificaciones_prueba = 'andres.0524e@gmail.com';
// pega aquí la url de implementación web de google apps script (Avisos.MesaCD@gmail.com)
const google_script_deployment_id = 'AKfycby2SE_6wEIYEspg1GO1MOhQFivz9oVjeuFWERLDFcLafzFk00JnTPkX4vNc6AsQNiQliw';
const endpoint_google_script = 'https://script.google.com/macros/s/AKfycby2SE_6wEIYEspg1GO1MOhQFivz9oVjeuFWERLDFcLafzFk00JnTPkX4vNc6AsQNiQliw/exec';
const telefono_prueba_general = '5217713908178';
const telefono_prueba_yessica = '5217711622228';

// directorio de responsables del departamento de comunicación y difusión
const catalogo_responsables = {
  'Sin asignar': {
    correo: '',
    telefono: ''
  },
  'Karla': {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_general
  },
  'Juan': {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_general
  },
  'Lina': {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_general
  },
  'Yessica': {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_yessica
  },
  'Chico(a) de servicio': {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_general
  }
};

// credenciales integradas de emailjs
const emailjs_public_key = 'ziihGrLOHnbPKFenK';
const emailjs_service_id = 'service_6yoeb1m';
const emailjs_template_id = 'template_geruv36';

const usar_nube = supabase_url.startsWith('https://') && supabase_key.length > 20;
const cliente_db = usar_nube ? window.supabase.createClient(supabase_url, supabase_key) : null;

let servicio_actual = 'Diseño e impresión de material gráfico';
let aplica_evento = true;
let solicitudes = [];
let filtro_activo = 'todos';

// detecta automáticamente el mes actual (01 al 12) para seleccionarlo por defecto
const mes_actual_sistema = String(new Date().getMonth() + 1).padStart(2, '0');
let mes_filtro_activo = mes_actual_sistema;

let selector_mes_instancia = null;
let selector_solicitante_instancia = null;
let selector_lugar_instancia = null;
const catalogo_departamentos_itp = ['Comunicación y Difusión'];
const catalogo_sitios_itp = ['Gimnasio Olímpico'];
let calendario_evento_instancia = null;
let selectores_responsable_instancias = [];

// estado del reloj circular interactivo
let reloj_input_destino_id = 'hora-evento';
let reloj_modo_actual = 'horas';
let reloj_hora_sel = 12;
let reloj_minuto_sel = 0;
let reloj_ampm_sel = 'PM';
let arrastrando_reloj = false;

// validación de sesión robusta utilizando sessionstorage y token en memoria
let sesion_autorizada = sessionStorage.getItem('itp_sesion_activa_segura') === token_sesion_seguro;

const nombres_meses = {
  'todos': 'Histórico General Acumulado',
  'sem-1': 'Semestre Enero – Junio',
  'sem-2': 'Semestre Julio – Diciembre',
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre'
};

const configuracion_servicios = {
  'Diseño e impresión de material gráfico': {
    label_esp: 'Formato y medidas requeridas',
    placeholder_esp: 'Ej. Cartel impreso tabloide y versión digital para redes',
    label_desc: 'Texto e información clave que debe contener el diseño',
    placeholder_desc: 'Ej. Título del evento, fecha, hora y logotipos oficiales'
  },
  'Difusión en redes sociales': {
    label_esp: 'Redes sociales destino y fecha de publicación',
    placeholder_esp: 'Ej. Facebook e Instagram Oficial — Jueves 10:00 hrs',
    label_desc: 'Copy (texto de la publicación) o enlace al material base',
    placeholder_desc: 'Ej. Invitamos a toda la comunidad tecnológica a...'
  },
  'Cobertura fotográfica/audiovisual': {
    label_esp: 'Tipo de cobertura requerida',
    placeholder_esp: 'Ej. Fotografía general y entrega de reconocimientos',
    label_desc: 'Momentos clave o autoridades a destacar',
    placeholder_desc: 'Ej. Presídium, entrega de menciones honoríficas'
  },
  'Producción de videos': {
    label_esp: 'Duración estimada y formato',
    placeholder_esp: 'Ej. Cápsula de 1 min en formato vertical',
    label_desc: 'Objetivo y guion general o referencias',
    placeholder_desc: 'Ej. Video institucional de invitación al aniversario'
  },
  'Revisión y visto bueno de materiales': {
    label_esp: 'Tipo de material y medio de difusión',
    placeholder_esp: 'Ej. Lona impresa para fachada principal',
    label_desc: 'Enlace al archivo (Drive/Canva) para validación',
    placeholder_desc: 'Ej. https://drive.google.com/... revisar uso del TecNM'
  },
  'Campañas institucionales': {
    label_esp: 'Público objetivo y periodo de difusión',
    placeholder_esp: 'Ej. Estudiantes de nuevo ingreso — Mes en curso',
    label_desc: 'Mensaje central y objetivos de la campaña',
    placeholder_desc: 'Ej. Campaña de difusión de convocatorias de becas'
  },
  'Otro servicio': {
    label_esp: 'Tipo de apoyo o servicio solicitado',
    placeholder_esp: 'Ej. Maestro de ceremonias, préstamo de equipo, protocolo, etc.',
    label_desc: 'Descripción detallada de los requerimientos',
    placeholder_desc: 'Ej. Especifica en qué consiste el apoyo y las necesidades especiales'
  }
};

// puente api global para integración futura con app móvil (ios / android)
window.itp_api_movil = {
  obtener_estado_conexion: () => usar_nube ? 'nube_supabase' : 'local_storage',
  obtener_todas_solicitudes: () => solicitudes,
  obtener_solicitudes_periodo_actual: () => obtener_solicitudes_por_periodo(),
  consultar_por_folio: (folio) => solicitudes.find(s => s.folio.toUpperCase() === String(folio).toUpperCase()),
  crear_solicitud_externa: async (datos_solicitud) => {
    const folio_nuevo = actualizar_folio_preview();
    const fecha_emision = new Date().toLocaleDateString('es-MX');
    const registro = {
      folio: folio_nuevo,
      fecha_solicitud: fecha_emision,
      servicio: sanitizar_texto(datos_solicitud.servicio || 'Diseño e impresión de material gráfico'),
      solicitante: sanitizar_texto(datos_solicitud.solicitante || ''),
      descripcion: sanitizar_texto(datos_solicitud.descripcion || ''),
      aplica_evento: Boolean(datos_solicitud.aplica_evento),
      fecha_evento: datos_solicitud.fecha_evento || '',
      hora_evento: datos_solicitud.hora_evento || '',
      lugar_evento: sanitizar_texto(datos_solicitud.lugar_evento || ''),
      estado: 'Pendiente',
      responsable: 'Sin asignar',
      fecha_limite: '',
      observaciones: `[${fecha_emision}] Solicitud registrada desde App Móvil.`
    };
    if (usar_nube) {
      await cliente_db.from('solicitudes').insert([registro]);
      await cargar_solicitudes();
    } else {
      solicitudes.unshift(registro);
      localStorage.setItem('tickets_itp_v6', JSON.stringify(solicitudes));
      renderizar_tickets();
      actualizar_notificaciones_ios();
    }
    await notificar_nueva_solicitud_correo(registro);
    return registro;
  },
  sincronizar_remoto: async () => { await cargar_solicitudes(); return solicitudes; }
};

function sanitizar_texto(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function capitalizar_inicial(texto) {
  if (!texto) return '';
  const limpio = String(texto).trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function formatear_descripcion_color(texto_desc) {
  if (!texto_desc) return '';
  const regex = /^\[(.*?)\]\s*—\s*(.*)$/;
  const coincidencia = texto_desc.match(regex);
  if (coincidencia) {
    return `<span class="tag-especificacion-color">[${capitalizar_inicial(coincidencia[1])}]</span> <span class="texto-descripcion-color">— ${capitalizar_inicial(coincidencia[2])}</span>`;
  }
  return `<span class="texto-descripcion-color">${capitalizar_inicial(texto_desc)}</span>`;
}

function refrescar_iconos() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function mostrar_toast() {
  return;
}

// =========================================================================
// centro de notificaciones estilo ios (solicitudes sin responsable asignado)
// =========================================================================
function obtener_solicitudes_sin_responsable() {
  return solicitudes.filter(item => {
    const resp = (item.responsable || '').trim().toLowerCase();
    return resp === '' || resp === 'sin asignar';
  });
}

function actualizar_notificaciones_ios() {
  const badge = document.getElementById('badge-notificaciones-ios');
  const pildora = document.getElementById('pildora-conteo-ios');
  const lista = document.getElementById('lista-notificaciones-ios');
  if (!badge || !lista) return;

  const pendientes_asignar = obtener_solicitudes_sin_responsable();
  const total = pendientes_asignar.length;

  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove('oculto');
    if (pildora) pildora.textContent = total === 1 ? '1 nueva' : `${total} nuevas`;
  } else {
    badge.textContent = '0';
    badge.classList.add('oculto');
    if (pildora) pildora.textContent = '0 nuevas';
  }

  if (total === 0) {
    lista.innerHTML = `
      <div class="notif-ios-vacio">
        <i data-lucide="check-circle-2"></i>
        <div>Todo al día. No hay solicitudes pendientes por asignar responsable.</div>
      </div>
    `;
    refrescar_iconos();
    return;
  }

  lista.innerHTML = pendientes_asignar.map(item => {
    const folio_sup = String(item.folio || '').toUpperCase();
    const servicio_cap = capitalizar_inicial(item.servicio);
    return `
      <div class="tarjeta-notif-ios" onclick="ir_a_solicitud_notificacion('${item.folio}')">
        <div class="notif-ios-top">
          <span class="notif-ios-folio">${folio_sup}</span>
          <span class="notif-ios-fecha">${item.fecha_solicitud}</span>
        </div>
        <div class="notif-ios-servicio">${servicio_cap}</div>
        <div class="notif-ios-depto">Solicita: ${item.solicitante}</div>
        <span class="notif-ios-accion">
          Asignar responsable <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
        </span>
      </div>
    `;
  }).join('');

  refrescar_iconos();
}

function alternar_notificaciones_ios(e) {
  if (e) e.stopPropagation();
  const popover = document.getElementById('popover-notificaciones-ios');
  if (!popover) return;
  popover.classList.toggle('oculto');
  if (!popover.classList.contains('oculto')) {
    actualizar_notificaciones_ios();
  }
}

function ir_a_solicitud_notificacion(folio_destino) {
  const popover = document.getElementById('popover-notificaciones-ios');
  if (popover) popover.classList.add('oculto');

  if (!sesion_autorizada || sessionStorage.getItem('itp_sesion_activa_segura') !== token_sesion_seguro) {
    intentar_abrir_panel();
    return;
  }

  cambiar_vista('panel');

  filtro_activo = 'todos';
  document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
  const primer_filtro = document.querySelector('.btn-filtro');
  if (primer_filtro) primer_filtro.classList.add('activo');

  const lista_periodo = obtener_solicitudes_por_periodo();
  const existe_en_periodo = lista_periodo.some(s => String(s.folio).toUpperCase() === String(folio_destino).toUpperCase());
  if (!existe_en_periodo) {
    mes_filtro_activo = 'todos';
    if (selector_mes_instancia) {
      selector_mes_instancia.setValue('todos', true);
    }
  }

  const input_busqueda = document.getElementById('buscador-tickets');
  if (input_busqueda) input_busqueda.value = '';

  renderizar_tickets();

  setTimeout(() => {
    const id_limpio = 'ticket-' + String(folio_destino).toUpperCase();
    const tarjeta = document.getElementById(id_limpio);
    if (tarjeta) {
      tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tarjeta.classList.remove('ticket-resaltado-notif');
      void tarjeta.offsetWidth;
      tarjeta.classList.add('ticket-resaltado-notif');
    }
  }, 120);
}

document.addEventListener('click', (e) => {
  const contenedor = document.getElementById('contenedor-notificaciones-ios');
  const popover = document.getElementById('popover-notificaciones-ios');
  if (contenedor && popover && !contenedor.contains(e.target)) {
    popover.classList.add('oculto');
  }
});

// =========================================================================
// sistema de notificación por correo mediante emailjs con limpieza de diagonal
// =========================================================================
function obtener_contacto_responsable(nombre_responsable) {
  if (!nombre_responsable || nombre_responsable.toLowerCase() === 'sin asignar') {
    return { correo: correo_notificaciones_prueba, telefono: telefono_prueba_general };
  }
  if (nombre_responsable.toLowerCase().startsWith('chico(a) de servicio')) {
    return catalogo_responsables['Chico(a) de servicio'];
  }
  const clave_exacta = Object.keys(catalogo_responsables).find(
    k => k.toLowerCase() === nombre_responsable.toLowerCase()
  );
  return catalogo_responsables[clave_exacta] || {
    correo: correo_notificaciones_prueba,
    telefono: telefono_prueba_general
  };
}

async function notificar_nueva_solicitud_correo(solicitud) {
  const info_evento_texto = solicitud.aplica_evento
    ? `${solicitud.fecha_evento} a las ${solicitud.hora_evento} hrs en ${solicitud.lugar_evento}`
    : 'Sin evento presencial asociado';

  const servicio_limpio = String(solicitud.servicio || '')
    .replace(/&#x2F;/gi, '/')
    .replace(/\//g, '/');

  const parametros_correo = {
    email: correo_notificaciones_prueba,
    folio: String(solicitud.folio || '').toUpperCase(),
    servicio: capitalizar_inicial(servicio_limpio),
    solicitante: solicitud.solicitante,
    descripcion: solicitud.descripcion,
    evento_info: info_evento_texto
  };

  parametros_correo.solicitante = String(parametros_correo.solicitante || '').replace(/&#x2F;/gi, '/');
  parametros_correo.descripcion = String(parametros_correo.descripcion || '').replace(/&#x2F;/gi, '/');
  parametros_correo.evento_info = String(parametros_correo.evento_info || '').replace(/&#x2F;/gi, '/');

  // 1. envío primario mediante google apps script (Avisos.MesaCD@gmail.com - hasta 3,000 correos/mes)
  if (endpoint_google_script && endpoint_google_script.trim().startsWith('https://script.google.com/')) {
    try {
      await fetch(endpoint_google_script.trim(), {
        method: 'post',
        mode: 'no-cors',
        headers: {
          'content-type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(parametros_correo)
      });
      return;
    } catch (err_gs) {
      console.warn('Respaldo activado tras fallo en Google Apps Script:', err_gs);
    }
  }

  // 2. respaldo automático (fallback) mediante emailjs si la url no está configurada o falla la petición
  if (window.emailjs && emailjs_public_key && emailjs_service_id && emailjs_template_id) {
    try {
      await window.emailjs.send(
        emailjs_service_id,
        emailjs_template_id,
        parametros_correo,
        { publicKey: emailjs_public_key }
      );
    } catch (err) {
      try {
        await window.emailjs.send(
          emailjs_service_id,
          emailjs_template_id,
          parametros_correo,
          emailjs_public_key
        );
      } catch (err2) {
        console.warn('Error al enviar correo con EmailJS:', err2);
      }
    }
  }
}

function construir_url_whatsapp_asignacion(solicitud) {
  const contacto = obtener_contacto_responsable(solicitud.responsable);
  const numero_wa = contacto.telefono || telefono_prueba_general;

  const mensaje =
    `Hola *${solicitud.responsable}*, te ha asignado el seguimiento de una solicitud:\n\n` +
    `*Folio:* ${String(solicitud.folio || '').toUpperCase()}\n` +
    `*Servicio:* ${capitalizar_inicial(solicitud.servicio)}\n` +
    `*Departamento solicitante:* ${solicitud.solicitante}\n` +
    `*Fecha del evento:* ${solicitud.aplica_evento ? solicitud.fecha_evento : 'N/A'}\n` +
    `- *Hora:* ${solicitud.aplica_evento ? solicitud.hora_evento + ' hrs' : 'N/A'}\n` +
    `*Sitio:* ${solicitud.aplica_evento ? solicitud.lugar_evento : 'N/A'}\n` +
    `*Información clave :* ${solicitud.descripcion}\n\n` +
    `Por favor verifica los detalles o dudas en la *Mesa de Comunicación y Difusión.* Gracias.`;

  return `https://wa.me/${numero_wa}?text=${encodeURIComponent(mensaje)}`;
}

function enviar_whatsapp_responsable(index_real) {
  const item = solicitudes[index_real];
  if (!item || !item.responsable || item.responsable.toLowerCase() === 'sin asignar') return;
  const url = construir_url_whatsapp_asignacion(item);
  window.open(url, '_blank');
}

async function notificar_asignacion_responsable(index_real) {
  const item = solicitudes[index_real];
  if (!item || !item.responsable || item.responsable.toLowerCase() === 'sin asignar') return;

  const icono_notificacion = `
    <div class="alerta-icono-minimal verde">
      <svg viewBox="0 0 24 24" fill="currentColor" style="width: 38px; height: 38px; color: #16a34a;">
        <path d="M12.031 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 0 0 1.333 4.993L2 22l5.233-1.237a9.994 9.994 0 0 0 4.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.935 9.935 0 0 0 12.031 2zm5.829 14.144c-.245.693-1.43 1.326-1.981 1.408-.507.075-1.148.107-1.855-.117-.428-.135-.978-.316-1.682-.62-2.961-1.278-4.896-4.261-5.044-4.459-.148-.197-1.204-1.601-1.204-3.054 0-1.453.763-2.167 1.034-2.463.271-.296.591-.37.788-.37.197 0 .394.002.566.01.182.009.426-.069.666.508.246.591.838 2.045.912 2.193.074.148.123.32.025.517-.098.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.148-.302.308-.13.604.172.296.766 1.264 1.645 2.047 1.13 1.007 2.083 1.319 2.379 1.467.296.148.468.123.641-.074.172-.197.739-.862.936-1.158.197-.296.394-.246.665-.148.271.098 1.725.813 2.02.961.296.148.493.222.567.345.074.123.074.714-.171 1.407z"></path>
      </svg>
    </div>
  `;

  const respuesta = await Swal.fire({
    html: `
      ${icono_notificacion}
      <span class="alerta-tag-sup" style="color: #15803d; background: #ecfdf5;">Responsable Asignado</span>
      <h3 class="alerta-titulo-custom">Notificar a ${item.responsable}</h3>
      <p class="alerta-cuerpo-custom">
        Has asignado esta solicitud a <strong>${item.responsable}</strong>.
        <span class="alerta-pregunta-resaltada">¿Deseas abrir WhatsApp para enviarle el recordatorio con los datos del servicio?</span>
      </p>
    `,
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Abrir WhatsApp',
    cancelButtonText: 'Cancelar',
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    hideClass: {
      popup: ''
    }
  });

  if (respuesta.isConfirmed) {
    enviar_whatsapp_responsable(index_real);
  }
}

// =========================================================================
// manejo del selector desplegable de responsable y campo manual de servicio social
// =========================================================================
async function cambiar_responsable_select(index_real, opcion_seleccionada) {
  const bloque_ss = document.getElementById(`bloque-ss-${index_real}`);
  const input_ss = document.getElementById(`input-ss-${index_real}`);

  if (opcion_seleccionada === 'Chico(a) de servicio') {
    if (bloque_ss) {
      bloque_ss.classList.remove('oculto');
    }
    if (input_ss) {
      input_ss.focus();
    }
    return;
  }

  if (bloque_ss) {
    bloque_ss.classList.add('oculto');
  }

  await actualizar_campo(index_real, 'responsable', sanitizar_texto(opcion_seleccionada));
  if (opcion_seleccionada !== 'Sin asignar') {
    await notificar_asignacion_responsable(index_real);
  }
}

async function guardar_nombre_servicio_social(index_real) {
  const input_ss = document.getElementById(`input-ss-${index_real}`);
  const nombre_manual = input_ss ? sanitizar_texto(input_ss.value.trim()) : '';

  if (!nombre_manual) {
    Swal.fire({
      icon: 'warning',
      title: 'Nombre requerido',
      text: 'Escribe el nombre del chico(a) de servicio social para asignarlo.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }

  const etiqueta_final = `Chico(a) de servicio: ${nombre_manual}`;
  await actualizar_campo(index_real, 'responsable', etiqueta_final);
  await notificar_asignacion_responsable(index_real);
}

function inicializar_selectores_responsable_tarjetas() {
  if (!window.TomSelect) return;

  selectores_responsable_instancias.forEach(inst => {
    try { inst.destroy(); } catch (e) {}
  });
  selectores_responsable_instancias = [];

  document.querySelectorAll('.select-responsable-tom').forEach(el => {
    const idx = parseInt(el.getAttribute('data-index'), 10);
    const inst = new TomSelect(el, {
      create: false,
      allowEmptyOption: false,
      controlInput: null,
      onDelete: () => false,
      onChange: (valor) => {
        if (!isNaN(idx) && valor) {
          cambiar_responsable_select(idx, valor);
        }
      }
    });
    selectores_responsable_instancias.push(inst);
  });
}

// =========================================================================
// funciones del selector de hora circular interactivo
// =========================================================================
function inicializar_eventos_reloj_circular() {
  const esfera = document.getElementById('reloj-esfera-interactiva');
  if (!esfera) return;

  const procesar_interaccion = (e, finalizar) => {
    const rect = esfera.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const client_x = e.touches ? e.touches[0].clientX : e.clientX;
    const client_y = e.touches ? e.touches[0].clientY : e.clientY;

    let grados = Math.atan2(client_y - cy, client_x - cx) * (180 / Math.PI) + 90;
    if (grados < 0) grados += 360;

    if (reloj_modo_actual === 'horas') {
      let h = Math.round(grados / 30);
      if (h === 0) h = 12;
      reloj_hora_sel = h;
      renderizar_cara_reloj();
      if (finalizar) {
        setTimeout(() => cambiar_modo_reloj('minutos'), 220);
      }
    } else {
      let m = Math.round(grados / 6) % 60;
      m = Math.round(m / 5) * 5;
      if (m === 60) m = 0;
      reloj_minuto_sel = m;
      renderizar_cara_reloj();
    }
  };

  esfera.addEventListener('mousedown', (e) => {
    arrastrando_reloj = true;
    procesar_interaccion(e, false);
  });
  window.addEventListener('mousemove', (e) => {
    if (arrastrando_reloj) procesar_interaccion(e, false);
  });
  window.addEventListener('mouseup', (e) => {
    if (arrastrando_reloj) {
      arrastrando_reloj = false;
      procesar_interaccion(e, true);
    }
  });

  esfera.addEventListener('touchstart', (e) => {
    arrastrando_reloj = true;
    procesar_interaccion(e, false);
    e.preventDefault();
  }, { passive: false });
  esfera.addEventListener('touchmove', (e) => {
    if (arrastrando_reloj) procesar_interaccion(e, false);
    e.preventDefault();
  }, { passive: false });
  esfera.addEventListener('touchend', (e) => {
    if (arrastrando_reloj) {
      arrastrando_reloj = false;
      if (reloj_modo_actual === 'horas') {
        setTimeout(() => cambiar_modo_reloj('minutos'), 220);
      }
    }
  });
}

function abrir_reloj_circular(id_input) {
  reloj_input_destino_id = id_input || 'hora-evento';
  const input = document.getElementById(reloj_input_destino_id);
  const valor_previo = input ? (input.getAttribute('data-hora-24') || input.value) : '';

  if (valor_previo && valor_previo.includes(':')) {
    const partes = valor_previo.split(':');
    let h24 = parseInt(partes[0], 10);
    let m = parseInt(partes[1], 10) || 0;
    if (!isNaN(h24)) {
      reloj_ampm_sel = h24 >= 12 ? 'PM' : 'AM';
      reloj_hora_sel = h24 % 12 || 12;
      reloj_minuto_sel = Math.round(m / 5) * 5;
      if (reloj_minuto_sel === 60) reloj_minuto_sel = 0;
    }
  } else {
    const sugerencia = new Date(Date.now() + 60 * 60 * 1000);
    const h_sug = sugerencia.getHours();
    let m_sug = Math.ceil(sugerencia.getMinutes() / 5) * 5;
    if (m_sug === 60) m_sug = 0;
    reloj_ampm_sel = h_sug >= 12 ? 'PM' : 'AM';
    reloj_hora_sel = h_sug % 12 || 12;
    reloj_minuto_sel = m_sug;
  }
  if (false) {
    reloj_hora_sel = 12;
    reloj_minuto_sel = 0;
    reloj_ampm_sel = 'PM';
  }

  reloj_modo_actual = 'horas';
  renderizar_cara_reloj();
  document.getElementById('modal-reloj-circular').classList.remove('oculto');
}

function cambiar_modo_reloj(nuevo_modo) {
  reloj_modo_actual = nuevo_modo;
  renderizar_cara_reloj();
}

function seleccionar_ampm_reloj(periodo) {
  reloj_ampm_sel = periodo;
  renderizar_cara_reloj();
}

function renderizar_cara_reloj() {
  const btn_h = document.getElementById('reloj-btn-hora');
  const btn_m = document.getElementById('reloj-btn-minuto');
  const btn_am = document.getElementById('reloj-btn-am');
  const btn_pm = document.getElementById('reloj-btn-pm');
  const capa_numeros = document.getElementById('reloj-capa-numeros');
  const aguja = document.getElementById('reloj-aguja-linea');

  if (!btn_h || !capa_numeros || !aguja) return;

  btn_h.textContent = String(reloj_hora_sel).padStart(2, '0');
  btn_m.textContent = String(reloj_minuto_sel).padStart(2, '0');

  btn_h.classList.toggle('activo', reloj_modo_actual === 'horas');
  btn_m.classList.toggle('activo', reloj_modo_actual === 'minutos');
  btn_am.classList.toggle('activo', reloj_ampm_sel === 'AM');
  btn_pm.classList.toggle('activo', reloj_ampm_sel === 'PM');

  const radio = 86;
  const centro = 118;
  let html = '';

  if (reloj_modo_actual === 'horas') {
    const angulo_aguja = (reloj_hora_sel % 12) * 30;
    aguja.style.transform = `rotate(${angulo_aguja}deg)`;

    for (let i = 1; i <= 12; i++) {
      const rad = ((i * 30) - 90) * (Math.PI / 180);
      const x = centro + radio * Math.cos(rad);
      const y = centro + radio * Math.sin(rad);
      const sel = i === reloj_hora_sel ? 'seleccionado' : '';
      html += `<div class="reloj-num-item ${sel}" style="left: ${x}px; top: ${y}px;">${i}</div>`;
    }
  } else {
    const angulo_aguja = reloj_minuto_sel * 6;
    aguja.style.transform = `rotate(${angulo_aguja}deg)`;

    for (let i = 0; i < 60; i += 5) {
      const rad = ((i * 6) - 90) * (Math.PI / 180);
      const x = centro + radio * Math.cos(rad);
      const y = centro + radio * Math.sin(rad);
      const sel = i === reloj_minuto_sel ? 'seleccionado' : '';
      const etiqueta = String(i).padStart(2, '0');
      html += `<div class="reloj-num-item ${sel}" style="left: ${x}px; top: ${y}px;">${etiqueta}</div>`;
    }
  }

  capa_numeros.innerHTML = html;
}

function cerrar_reloj_circular() {
  document.getElementById('modal-reloj-circular').classList.add('oculto');
}

function obtener_fecha_iso_hoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function es_fecha_hora_futura(fecha_iso, hora_24) {
  if (!fecha_iso || !hora_24) return false;
  const hora_limpia = String(hora_24).slice(0, 5);
  const fecha_hora_ev = new Date(`${fecha_iso}T${hora_limpia}:00`);
  if (isNaN(fecha_hora_ev.getTime())) return false;
  return fecha_hora_ev.getTime() > new Date().getTime();
}

function confirmar_reloj_circular() {
  let h24 = reloj_hora_sel;
  if (reloj_ampm_sel === 'PM' && h24 < 12) h24 += 12;
  if (reloj_ampm_sel === 'AM' && h24 === 12) h24 = 0;

  const cadena_24 = `${String(h24).padStart(2, '0')}:${String(reloj_minuto_sel).padStart(2, '0')}`;
  const cadena_vista = `${String(reloj_hora_sel).padStart(2, '0')}:${String(reloj_minuto_sel).padStart(2, '0')} ${reloj_ampm_sel === 'AM' ? 'A.M.' : 'P.M.'}`;

  const input_fecha_ev = document.getElementById('fecha-evento');
  const fecha_seleccionada = input_fecha_ev ? input_fecha_ev.value : '';

  if (fecha_seleccionada && !es_fecha_hora_futura(fecha_seleccionada, cadena_24)) {
    Swal.fire({
      icon: 'warning',
      title: 'Hora ya transcurrida',
      text: 'No puedes asignar un evento en una hora que ya pasó. Selecciona una hora posterior a la actual.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }

  const input = document.getElementById(reloj_input_destino_id);
  if (input) {
    input.setAttribute('data-hora-24', cadena_24);
    input.value = cadena_vista;
  }

  cerrar_reloj_circular();
}

function inicializar_controles_visuales() {
  const select_el = document.getElementById('selector-mes-reporte');
  if (select_el && window.TomSelect) {
    select_el.value = mes_filtro_activo;
    if (selector_mes_instancia) {
      selector_mes_instancia.destroy();
    }
    selector_mes_instancia = new TomSelect(select_el, {
      create: false,
      allowEmptyOption: false,
      controlInput: null,
      onDelete: () => false,
      onChange: (valor) => {
        if (!valor) {
          selector_mes_instancia.setValue(mes_actual_sistema, true);
          mes_filtro_activo = mes_actual_sistema;
        } else {
          mes_filtro_activo = valor;
        }
        renderizar_tickets();
      }
    });
    selector_mes_instancia.setValue(mes_filtro_activo, true);
  }

  configurar_calendario_evento();
  inicializar_selectores_formulario();
  inicializar_eventos_reloj_circular();
}

function inicializar_selectores_formulario() {
  if (!window.TomSelect) return;

  const select_depto = document.getElementById('solicitante');
  if (select_depto) {
    select_depto.required = false;
    select_depto.innerHTML = catalogo_departamentos_itp
      .map((d, i) => `<option value="${d}" ${i === 0 ? 'selected' : ''}>${d}</option>`)
      .join('');
    if (selector_solicitante_instancia) {
      try { selector_solicitante_instancia.destroy(); } catch (e) {}
    }
    selector_solicitante_instancia = new TomSelect(select_depto, {
      create: false,
      allowEmptyOption: false,
      controlInput: null,
      onDelete: () => false
    });
    selector_solicitante_instancia.setValue(catalogo_departamentos_itp[0], true);
  }

  const select_lugar = document.getElementById('lugar-evento');
  if (select_lugar) {
    select_lugar.required = false;
    select_lugar.innerHTML = catalogo_sitios_itp
      .map((s, i) => `<option value="${s}" ${i === 0 ? 'selected' : ''}>${s}</option>`)
      .join('');
    if (selector_lugar_instancia) {
      try { selector_lugar_instancia.destroy(); } catch (e) {}
    }
    selector_lugar_instancia = new TomSelect(select_lugar, {
      create: false,
      allowEmptyOption: false,
      controlInput: null,
      onDelete: () => false
    });
    selector_lugar_instancia.setValue(catalogo_sitios_itp[0], true);
  }
}

function configurar_calendario_evento() {
  const fecha_input = document.getElementById('fecha-evento');
  if (fecha_input && window.flatpickr) {
    fecha_input.required = false;
    if (calendario_evento_instancia) {
      calendario_evento_instancia.destroy();
    }
    calendario_evento_instancia = flatpickr(fecha_input, {
      locale: 'es',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      altInputClass: 'input-fecha-con-icono',
      minDate: 'today',
      onChange: function(selectedDates, dateStr) {
        const input_h = document.getElementById('hora-evento');
        const hora_guardada = input_h ? (input_h.getAttribute('data-hora-24') || input_h.value) : '';
        if (dateStr && hora_guardada && !es_fecha_hora_futura(dateStr, hora_guardada)) {
          input_h.value = '';
          input_h.removeAttribute('data-hora-24');
          Swal.fire({
            icon: 'warning',
            title: 'Ajusta la hora del evento',
            text: 'La hora seleccionada previamente ya transcurrió el día de hoy. Por favor elige una hora futura.',
            confirmButtonColor: '#1B396A'
          });
        }
      },
      allowInput: false,
      disableMobile: true,
      onReady: function(selectedDates, dateStr, instance) {
        if (instance.altInput) {
          instance.altInput.placeholder = 'dd/mm/aaaa';
          instance.altInput.required = false;
        }
      }
    });
  }

  const hora_input = document.getElementById('hora-evento');
  if (hora_input) {
    hora_input.placeholder = '--:--';
    hora_input.required = false;
  }

  refrescar_iconos();
}

function inicializar_calendarios_panel_interno() {
  if (!window.flatpickr) return;
  document.querySelectorAll('.input-fecha-limite-panel').forEach(el => {
    const fecha_min_panel = obtener_fecha_iso_hoy();
    flatpickr(el, {
      minDate: fecha_min_panel,
      locale: 'es',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      allowInput: false,
      disableMobile: true,
      onChange: function(selectedDates, dateStr) {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          actualizar_campo(idx, 'fecha_limite', dateStr);
        }
      }
    });
  });
}

function extraer_mes_solicitud(item) {
  if (item.fecha_solicitud && item.fecha_solicitud.includes('/')) {
    const partes = item.fecha_solicitud.split('/');
    if (partes.length >= 2) {
      return partes[1].padStart(2, '0');
    }
  }
  if (item.fecha_evento && item.fecha_evento.includes('-')) {
    const partes_ev = item.fecha_evento.split('-');
    if (partes_ev.length >= 2) {
      return partes_ev[1].padStart(2, '0');
    }
  }
  return '';
}

function obtener_solicitudes_por_periodo() {
  if (!mes_filtro_activo || mes_filtro_activo === 'todos') {
    return solicitudes;
  }
  if (mes_filtro_activo === 'sem-1') {
    return solicitudes.filter(item => {
      const mes = parseInt(extraer_mes_solicitud(item), 10);
      return mes >= 1 && mes <= 6;
    });
  }
  if (mes_filtro_activo === 'sem-2') {
    return solicitudes.filter(item => {
      const mes = parseInt(extraer_mes_solicitud(item), 10);
      return mes >= 7 && mes <= 12;
    });
  }
  return solicitudes.filter(item => extraer_mes_solicitud(item) === mes_filtro_activo);
}

function cambiar_mes_filtro() {
  const select = document.getElementById('selector-mes-reporte');
  const valor_elegido = select && select.value ? select.value : mes_actual_sistema;
  mes_filtro_activo = nombres_meses[valor_elegido] ? valor_elegido : mes_actual_sistema;
  renderizar_tickets();
}

function animar_contador(id_elemento, valor_final) {
  const el = document.getElementById(id_elemento);
  if (!el) return;
  const valor_inicial = parseInt(el.textContent, 10) || 0;
  const duracion = 550;
  const inicio = performance.now();

  function paso(tiempo_actual) {
    const progreso = Math.min((tiempo_actual - inicio) / duracion, 1);
    const curva = 1 - Math.pow(1 - progreso, 3);
    el.textContent = Math.round(valor_inicial + (valor_final - valor_inicial) * curva);
    if (progreso < 1) {
      requestAnimationFrame(paso);
    }
  }
  requestAnimationFrame(paso);
}

function actualizar_metricas_panel() {
  const lista_base = obtener_solicitudes_por_periodo();
  let pendientes = 0;
  let en_proceso = 0;
  let terminados = 0;

  lista_base.forEach(item => {
    const est = calcular_estado_automatico(item);
    if (est === 'Pendiente') pendientes++;
    else if (est === 'En proceso') en_proceso++;
    else if (est === 'Terminado') terminados++;
  });

  animar_contador('stat-total', lista_base.length);
  animar_contador('stat-pendientes', pendientes);
  animar_contador('stat-proceso', en_proceso);
  animar_contador('stat-terminados', terminados);
}

let liquid_morph_listener_activo = false;

function inicializar_brillo_liquid_morph() {
  if (liquid_morph_listener_activo) return;
  liquid_morph_listener_activo = true;

  document.addEventListener('mousemove', (e) => {
    const tarjeta = e.target.closest('.tarjeta-servicio, .ticket-item, .item-metrica-unificada');
    if (!tarjeta) return;
    const rect = tarjeta.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    tarjeta.style.setProperty('--mouse-x', `${x}px`);
    tarjeta.style.setProperty('--mouse-y', `${y}px`);
  }, { passive: true });
}

function aplicar_tema_visual(tema) {
  const es_oscuro = tema === 'oscuro';
  if (es_oscuro) {
    document.documentElement.setAttribute('data-tema', 'oscuro');
  } else {
    document.documentElement.removeAttribute('data-tema');
  }

  const meta_theme = document.querySelector('meta[name="theme-color"]');
  if (meta_theme) {
    meta_theme.setAttribute('content', es_oscuro ? '#070d19' : '#1B396A');
  }

  const btn_tema = document.getElementById('btn-tema-ios');
  if (btn_tema) {
    btn_tema.innerHTML = `<i data-lucide="${es_oscuro ? 'sun' : 'moon'}" id="icono-tema-ios"></i>`;
    btn_tema.setAttribute('title', es_oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    refrescar_iconos();
  }
}

function inicializar_tema_preferido() {
  let tema_actual = 'claro';
  try {
    const guardado = localStorage.getItem('itp_tema_preferido');
    if (guardado === 'oscuro' || guardado === 'claro') {
      tema_actual = guardado;
    }
  } catch (e) {}
  aplicar_tema_visual(tema_actual);
}

function alternar_modo_oscuro() {
  const es_oscuro_actual = document.documentElement.getAttribute('data-tema') === 'oscuro';
  const nuevo_tema = es_oscuro_actual ? 'claro' : 'oscuro';
  try {
    localStorage.setItem('itp_tema_preferido', nuevo_tema);
  } catch (e) {}
  aplicar_tema_visual(nuevo_tema);
}

async function inicializar() {
  inicializar_tema_preferido();
  const hoy = new Date();
  document.getElementById('fecha-actual').textContent = hoy.toLocaleDateString('es-MX');
  window.addEventListener('scroll', controlar_flecha_flotante);
  inicializar_brillo_liquid_morph();

  if (window.emailjs && emailjs_public_key) {
    try {
      window.emailjs.init({ publicKey: emailjs_public_key });
    } catch (e) {
      try { window.emailjs.init(emailjs_public_key); } catch (e2) {}
    }
  }

  const badge = document.getElementById('estado-conexion');
  if (usar_nube) {
    badge.textContent = '● Conectado';
    badge.classList.add('online');
  } else {
    badge.textContent = 'Desconectado';
    badge.classList.remove('online');
  }

  inicializar_controles_visuales();
  actualizar_icono_candado();
  await cargar_solicitudes();

  setInterval(() => {
    renderizar_tickets();
    actualizar_notificaciones_ios();
  }, 60000);
}

function actualizar_icono_candado() {
  const icono = document.getElementById('icono-candado');
  if (icono) {
    icono.setAttribute('data-lucide', sesion_autorizada ? 'unlock' : 'lock');
    refrescar_iconos();
  }
}

function intentar_abrir_panel() {
  if (sesion_autorizada && sessionStorage.getItem('itp_sesion_activa_segura') === token_sesion_seguro) {
    cambiar_vista('panel');
  } else {
    sesion_autorizada = false;
    sessionStorage.removeItem('itp_sesion_activa_segura');
    document.getElementById('input-pin').value = '';
    document.getElementById('modal-pin').classList.remove('oculto');
    setTimeout(() => document.getElementById('input-pin').focus(), 100);
  }
}

function verificar_pin(e) {
  e.preventDefault();
  const pin_ingresado = document.getElementById('input-pin').value.trim();

  if (pin_ingresado === pin_departamento) {
    sesion_autorizada = true;
    sessionStorage.setItem('itp_sesion_activa_segura', token_sesion_seguro);
    actualizar_icono_candado();
    cerrar_modal_pin();
    cambiar_vista('panel');
  } else {
    sesion_autorizada = false;
    sessionStorage.removeItem('itp_sesion_activa_segura');
    const tarjeta = document.getElementById('tarjeta-pin');
    tarjeta.classList.remove('sacudir');
    void tarjeta.offsetWidth;
    tarjeta.classList.add('sacudir');
    Swal.fire({
      icon: 'error',
      title: 'Acceso Denegado',
      text: 'PIN institucional incorrecto.',
      confirmButtonColor: '#1B396A'
    });
  }
}

function cerrar_modal_pin() {
  document.getElementById('modal-pin').classList.add('oculto');
}

async function cerrar_sesion_admin() {
  const resultado = await Swal.fire({
    title: '¿Estás seguro?',
    text: '¿Deseas cerrar sesión del panel administrativo?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1B396A',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, cerrar sesión',
    cancelButtonText: 'Cancelar',
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    hideClass: {
      popup: ''
    }
  });

  if (resultado.isConfirmed) {
    sesion_autorizada = false;
    sessionStorage.removeItem('itp_sesion_activa_segura');
    actualizar_icono_candado();
    cambiar_vista('formulario');
  }
}

async function consultar_folio_publico(e) {
  e.preventDefault();
  await cargar_solicitudes();

  const codigo_buscado = sanitizar_texto(document.getElementById('input-rastreo-folio').value.trim().toUpperCase());
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

  const info_evento_publico = encontrado.aplica_evento
    ? `<span class="badge-lugar-evento"><i data-lucide="map-pin"></i> Lugar: ${encontrado.lugar_evento}</span>
       <span class="badge-fecha-evento"><i data-lucide="calendar"></i> ${encontrado.fecha_evento} <em>(${encontrado.hora_evento} hrs)</em></span>`
    : `<span class="badge-sin-evento"><i data-lucide="info"></i> Sin evento presencial asociado</span>`;

  contenedor_res.innerHTML = `
    <div class="tarjeta-rastreo-publico">
      <div class="ticket-header-line">
        <div>
          <span class="ticket-folio">${String(encontrado.folio).toUpperCase()} · Solicitado el ${encontrado.fecha_solicitud}</span>
          <div class="ticket-servicio">${capitalizar_inicial(encontrado.servicio)}</div>
          <div class="ticket-detalles">
            <i data-lucide="user"></i>
            <span class="tag-solicitante-color">${encontrado.solicitante}:</span>
            ${formatear_descripcion_color(encontrado.descripcion)}
            ${info_evento_publico}
          </div>
        </div>
        <span class="badge-estado-actual ${clase_estado}">
          <span class="punto-estado"></span>
          <span>${estado_calculado}</span>
        </span>
      </div>

      <div class="rastreo-grid-meta">
        <div><strong>Responsable asignado:</strong> ${capitalizar_inicial(encontrado.responsable || 'Por asignar')}</div>
        <div><strong>Fecha límite estimada:</strong> ${encontrado.fecha_limite || 'Sin asignar'}</div>
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

function calcular_estado_automatico(item) {
  const ahora = new Date();

  if (item.aplica_evento && item.fecha_evento) {
    const hora_ev = (item.hora_evento || '23:59').slice(0, 5);
    const fecha_evento_completa = new Date(`${item.fecha_evento}T${hora_ev}:00`);
    if (ahora >= fecha_evento_completa) {
      return 'Terminado';
    }
  }

  if (item.fecha_limite) {
    const fecha_limite_completa = new Date(`${item.fecha_limite}T23:59:00`);
    if (ahora >= fecha_limite_completa) {
      return 'Terminado';
    }
  }

  const tiene_responsable = item.responsable && item.responsable.trim() !== '' && item.responsable.trim().toLowerCase() !== 'sin asignar';
  const tiene_limite = item.fecha_limite && item.fecha_limite.trim() !== '';

  if (tiene_responsable || tiene_limite) {
    return 'En proceso';
  }

  return 'Pendiente';
}

async function sincronizar_estados_nube() {
  if (!usar_nube) return;
  for (const item of solicitudes) {
    const estado_real = calcular_estado_automatico(item);
    if (item.estado !== estado_real && item.id) {
      item.estado = estado_real;
      await cliente_db.from('solicitudes').update({ estado: estado_real }).eq('id', item.id);
    }
  }
}

async function cargar_solicitudes() {
  if (usar_nube) {
    const { data, error } = await cliente_db
      .from('solicitudes')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      solicitudes = data;
      await sincronizar_estados_nube();
    }
  } else {
    solicitudes = JSON.parse(localStorage.getItem('tickets_itp_v6')) || [
      {
        id: 1,
        folio: 'SRV-001',
        fecha_solicitud: '22/10/2026',
        servicio: 'Cobertura fotográfica/audiovisual',
        solicitante: 'Dpto. Comunicación y Difusión',
        descripcion: '[Fotografía general] — Ceremonia de entrega de títulos',
        aplica_evento: true,
        fecha_evento: '2026-10-28',
        hora_evento: '11:00',
        lugar_evento: 'Auditorio Principal',
        estado: 'En proceso',
        responsable: 'Karla',
        fecha_limite: '',
        observaciones: '[22/10/2026] Solicitud recibida y en proceso de asignación.'
      }
    ];
  }

  actualizar_folio_preview();
  renderizar_tickets();
  actualizar_notificaciones_ios();
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
  let max_num = 0;
  solicitudes.forEach(s => {
    const num = parseInt(String(s.folio || '').replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > max_num) {
      max_num = num;
    }
  });
  const siguiente_numero = Math.max(solicitudes.length, max_num) + 1;
  const codigo = 'SRV-' + String(siguiente_numero).padStart(3, '0');
  document.getElementById('folio-preview').textContent = codigo;
  return codigo;
}

function seleccionar_servicio(elemento, nombre_servicio) {
  document.querySelectorAll('.tarjeta-servicio').forEach(t => t.classList.remove('seleccionada'));
  elemento.classList.add('seleccionada');
  servicio_actual = nombre_servicio;
  document.getElementById('texto-servicio-elegido').textContent = nombre_servicio;

  const clave_conf = Object.keys(configuracion_servicios).find(
    k => k.toLowerCase() === nombre_servicio.toLowerCase()
  );
  const conf = configuracion_servicios[clave_conf];
  if (conf) {
    document.getElementById('label-especifico').textContent = conf.label_esp;
    document.getElementById('detalle-especifico').placeholder = conf.placeholder_esp;
    document.getElementById('label-descripcion').textContent = conf.label_desc;
    document.getElementById('descripcion').placeholder = conf.placeholder_desc;
  }

  alternar_evento(true);

  if (calendario_evento_instancia && calendario_evento_instancia.altInput) {
    calendario_evento_instancia.altInput.placeholder = 'dd/mm/aaaa';
  }
  const input_hora = document.getElementById('hora-evento');
  if (input_hora) {
    input_hora.placeholder = '--:--';
  }
  refrescar_iconos();

  const seccion_detalles = document.getElementById('seccion-detalles');
  seccion_detalles.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    document.getElementById('detalle-especifico').focus({ preventScroll: true });
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
  const input_fecha_orig = document.getElementById('fecha-evento');
  const input_visible_fecha = calendario_evento_instancia && calendario_evento_instancia.altInput
    ? calendario_evento_instancia.altInput
    : input_fecha_orig;
  const input_visible_hora = document.getElementById('hora-evento');
  const input_lugar = document.getElementById('lugar-evento');

  // nunca dejamos required en el input oculto de flatpickr para evitar bloqueo del navegador
  if (input_fecha_orig) input_fecha_orig.required = false;
  if (input_visible_fecha) input_visible_fecha.required = false;
  if (input_visible_hora) input_visible_hora.required = false;

  if (aplica_evento) {
    bloque.classList.add('abierto');
    boton_switch.classList.add('activo');
    if (input_visible_fecha) {
      input_visible_fecha.placeholder = 'dd/mm/aaaa';
    }
    if (input_visible_hora) {
      input_visible_hora.placeholder = '--:--';
    }
    if (input_lugar) input_lugar.required = false;
  } else {
    bloque.classList.remove('abierto');
    boton_switch.classList.remove('activo');
    if (input_lugar) input_lugar.required = false;
  }
}

async function guardar_solicitud(e) {
  e.preventDefault();

  if (aplica_evento && !document.getElementById('fecha-evento').value) {
    Swal.fire({
      icon: 'warning',
      title: 'Fecha requerida',
      text: 'Por favor selecciona la fecha del evento en el calendario.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }

  const input_hora_el = document.getElementById('hora-evento');
  const valor_hora_24 = input_hora_el.getAttribute('data-hora-24') || input_hora_el.value;

  if (aplica_evento && !valor_hora_24) {
    Swal.fire({
      icon: 'warning',
      title: 'Hora requerida',
      text: 'Por favor selecciona la hora del evento en el reloj.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }

  const input_lugar_el = document.getElementById('lugar-evento');
  if (aplica_evento && (!input_lugar_el || !input_lugar_el.value.trim())) {
    Swal.fire({
      icon: 'warning',
      title: 'Sitio requerido',
      text: 'Por favor escribe el sitio o lugar del evento.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }

  const btn_submit = document.getElementById('btn-submit-form');
  const valor_fecha_ev = document.getElementById('fecha-evento').value;
  if (aplica_evento && !es_fecha_hora_futura(valor_fecha_ev, valor_hora_24)) {
    Swal.fire({
      icon: 'warning',
      title: 'Fecha u hora no válida',
      text: 'No se permite programar un evento en una fecha u hora que ya transcurrió. Selecciona un horario futuro.',
      confirmButtonColor: '#1B396A'
    });
    return;
  }
  const texto_btn = document.getElementById('texto-btn-enviar');
  btn_submit.disabled = true;
  texto_btn.textContent = 'Enviando solicitud...';

  const nuevo_folio = actualizar_folio_preview();
  const fecha_hoy = document.getElementById('fecha-actual').textContent;
  
  const esp_valor = sanitizar_texto(document.getElementById('detalle-especifico').value.trim());
  const desc_valor = sanitizar_texto(document.getElementById('descripcion').value.trim());

  const nueva = {
    folio: nuevo_folio,
    fecha_solicitud: fecha_hoy,
    servicio: capitalizar_inicial(servicio_actual),
    solicitante: sanitizar_texto(document.getElementById('solicitante').value.trim()),
    descripcion: `[${esp_valor}] — ${desc_valor}`,
    aplica_evento: aplica_evento,
    fecha_evento: aplica_evento ? document.getElementById('fecha-evento').value : '',
    hora_evento: aplica_evento ? valor_hora_24 : '',
    lugar_evento: aplica_evento ? sanitizar_texto(input_lugar_el.value.trim()) : '',
    estado: 'Pendiente',
    responsable: 'Sin asignar',
    fecha_limite: '',
    observaciones: sanitizar_texto(`[${fecha_hoy}] Solicitud registrada en plataforma.`)
  };

  nueva.estado = calcular_estado_automatico(nueva);

  if (usar_nube) {
    const { error } = await cliente_db.from('solicitudes').insert([nueva]);
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al Guardar',
        text: error.message,
        confirmButtonColor: '#1B396A'
      });
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
    actualizar_notificaciones_ios();
  }

  await notificar_nueva_solicitud_correo(nueva);

  document.getElementById('form-solicitud').reset();
  if (selector_solicitante_instancia) {
    selector_solicitante_instancia.setValue(catalogo_departamentos_itp[0], true);
  }
  if (selector_lugar_instancia) {
    selector_lugar_instancia.setValue(catalogo_sitios_itp[0], true);
  }
  if (calendario_evento_instancia) {
    calendario_evento_instancia.clear();
    if (calendario_evento_instancia.altInput) {
      calendario_evento_instancia.altInput.placeholder = 'dd/mm/aaaa';
    }
  }
  if (input_hora_el) {
    input_hora_el.value = '';
    input_hora_el.removeAttribute('data-hora-24');
    input_hora_el.placeholder = '--:--';
  }
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
  const input_busqueda = document.getElementById('buscador-tickets');
  const texto_busqueda = input_busqueda ? input_busqueda.value.toLowerCase() : '';
  
  const lista_periodo = obtener_solicitudes_por_periodo();

  const filtrados = lista_periodo.filter(item => {
    const estado_calculado = calcular_estado_automatico(item);
    const cumple_estado = filtro_activo === 'todos' || estado_calculado.toLowerCase() === filtro_activo.toLowerCase();
    const cumple_busqueda = item.solicitante.toLowerCase().includes(texto_busqueda) || 
                            item.folio.toLowerCase().includes(texto_busqueda) ||
                            item.servicio.toLowerCase().includes(texto_busqueda);
    return cumple_estado && cumple_busqueda;
  });

  document.getElementById('contador-tickets').textContent = solicitudes.length;
  actualizar_metricas_panel();

  if (filtrados.length === 0) {
    contenedor.innerHTML = `<div style="text-align: center; padding: 2.5rem; color: var(--ink-muted);">No se encontraron solicitudes en este periodo o criterio.</div>`;
    return;
  }

  contenedor.innerHTML = filtrados.map((item, idx_vista) => {
    const index_real = solicitudes.findIndex(s => s.folio === item.folio);
    const tiene_fecha_limite = Boolean(item.fecha_limite && item.fecha_limite.trim() !== '');
    
    const estado_actual = calcular_estado_automatico(item);
    const sufijo_estado = estado_actual.replace(' ', '-');
    const clase_estado = 'estado-' + sufijo_estado;
    const lista_notas = obtener_arreglo_notas(item.observaciones);
    const delay_anim = Math.min(idx_vista * 0.05, 0.35);

    const resp_guardado = (item.responsable || 'Sin asignar').trim();
    const mapa_nombres_fijos = {
      'sin asignar': 'Sin asignar',
      'karla': 'Karla',
      'juan': 'Juan',
      'lina': 'Lina',
      'yessica': 'Yessica'
    };

    let valor_select = 'Sin asignar';
    let es_chico_servicio = false;
    let nombre_manual_ss = '';

    if (mapa_nombres_fijos[resp_guardado.toLowerCase()]) {
      valor_select = mapa_nombres_fijos[resp_guardado.toLowerCase()];
    } else if (resp_guardado.toLowerCase().startsWith('chico(a) de servicio')) {
      valor_select = 'Chico(a) de servicio';
      es_chico_servicio = true;
      const partes_ss = resp_guardado.split(':');
      nombre_manual_ss = partes_ss.length > 1 ? partes_ss.slice(1).join(':').trim() : '';
    } else if (resp_guardado !== '') {
      valor_select = 'Chico(a) de servicio';
      es_chico_servicio = true;
      nombre_manual_ss = resp_guardado;
    }

    const tiene_responsable_activo = resp_guardado !== '' && resp_guardado.toLowerCase() !== 'sin asignar';
    const folio_mayus = String(item.folio || '').toUpperCase();
    const servicio_titulo = capitalizar_inicial(item.servicio);

    const info_evento_inline = item.aplica_evento
      ? `<span class="badge-lugar-evento"><i data-lucide="map-pin"></i> Lugar: ${item.lugar_evento}</span>
         <span class="badge-fecha-evento"><i data-lucide="calendar"></i> ${item.fecha_evento} <em>(${item.hora_evento} hrs)</em></span>`
      : `<span class="badge-sin-evento"><i data-lucide="info"></i> Sin evento presencial asociado</span>`;

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
      <div class="ticket-item borde-${sufijo_estado}" id="ticket-${folio_mayus}" style="--t-delay: ${delay_anim}s">
        <div class="ticket-header-line">
          <div>
            <span class="ticket-folio">${folio_mayus} · Solicitado: ${item.fecha_solicitud}</span>
            <div class="ticket-servicio">${servicio_titulo}</div>
            <div class="ticket-detalles">
              <i data-lucide="user"></i>
              <span class="tag-solicitante-color">${item.solicitante}:</span>
              ${formatear_descripcion_color(item.descripcion)}
              ${info_evento_inline}
            </div>
          </div>

          <div class="selector-estado-contenedor">
            <span class="selector-estado-label">Estatus automático</span>
            <span class="badge-estado-actual ${clase_estado}">
              <span class="punto-estado"></span>
              <span>${estado_actual}</span>
            </span>
          </div>
        </div>

        <div class="panel-gestion-interno">
          <div class="campo-interno">
            <label>Responsable asignado</label>
            <div class="fila-responsable-acciones">
              <select class="select-responsable-tom" data-index="${index_real}">
                <option value="Sin asignar" ${valor_select === 'Sin asignar' ? 'selected' : ''}>Sin asignar</option>
                <option value="Karla" ${valor_select === 'Karla' ? 'selected' : ''}>Karla</option>
                <option value="Juan" ${valor_select === 'Juan' ? 'selected' : ''}>Juan</option>
                <option value="Lina" ${valor_select === 'Lina' ? 'selected' : ''}>Lina</option>
                <option value="Yessica" ${valor_select === 'Yessica' ? 'selected' : ''}>Yessica</option>
                <option value="Chico(a) de servicio" ${valor_select === 'Chico(a) de servicio' ? 'selected' : ''}>Chico(a) de servicio</option>
              </select>
              ${tiene_responsable_activo
                ? `<button type="button" class="btn-notificar-wa" onclick="enviar_whatsapp_responsable(${index_real})" title="Enviar recordatorio por WhatsApp a ${resp_guardado}">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 15px; height: 15px;"><path d="M12.031 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 0 0 1.333 4.993L2 22l5.233-1.237a9.994 9.994 0 0 0 4.779 1.217h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.935 9.935 0 0 0 12.031 2zm5.829 14.144c-.245.693-1.43 1.326-1.981 1.408-.507.075-1.148.107-1.855-.117-.428-.135-.978-.316-1.682-.62-2.961-1.278-4.896-4.261-5.044-4.459-.148-.197-1.204-1.601-1.204-3.054 0-1.453.763-2.167 1.034-2.463.271-.296.591-.37.788-.37.197 0 .394.002.566.01.182.009.426-.069.666.508.246.591.838 2.045.912 2.193.074.148.123.32.025.517-.098.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.148-.302.308-.13.604.172.296.766 1.264 1.645 2.047 1.13 1.007 2.083 1.319 2.379 1.467.296.148.468.123.641-.074.172-.197.739-.862.936-1.158.197-.296.394-.246.665-.148.271.098 1.725.813 2.02.961.296.148.493.222.567.345.074.123.074.714-.171 1.407z"></path></svg> WhatsApp
                  </button>`
                : ''
              }
            </div>
            <div id="bloque-ss-${index_real}" class="caja-servicio-social-manual ${es_chico_servicio ? '' : 'oculto'}">
              <input type="text" id="input-ss-${index_real}" value="${nombre_manual_ss}" placeholder="Escribe el nombre del prestador(a) de servicio..." onkeydown="if(event.key==='Enter'){event.preventDefault();guardar_nombre_servicio_social(${index_real});}">
              <button type="button" class="btn-confirmar-ss" onclick="guardar_nombre_servicio_social(${index_real})">
                <i data-lucide="check"></i> Asignar
              </button>
            </div>
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
              ? `<div class="contenedor-input-calendario">
                  <input type="text" class="input-fecha-limite-panel input-fecha-con-icono" data-index="${index_real}" value="${item.fecha_limite}" placeholder="dd/mm/aaaa">
                  <i data-lucide="calendar" class="icono-calendario-fijo"></i>
                </div>`
              : `<div class="sin-fecha-aviso">Sin fecha límite asignada</div>`
            }
          </div>
        </div>

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
  inicializar_calendarios_panel_interno();
  inicializar_selectores_responsable_tarjetas();
}

function contar_frecuencias(lista, propiedad) {
  const mapa = {};
  lista.forEach(item => {
    const clave = capitalizar_inicial((item[propiedad] || 'Sin especificar').trim());
    mapa[clave] = (mapa[clave] || 0) + 1;
  });
  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function generar_filas_frecuencia(arreglo, total) {
  if (arreglo.length === 0) {
    return `<tr><td colspan="3" class="num-centro">Sin registros en este periodo</td></tr>`;
  }
  return arreglo.map(([concepto, cant]) => {
    const porc = total > 0 ? ((cant / total) * 100).toFixed(1) : '0.0';
    return `
      <tr>
        <td>${concepto}</td>
        <td class="num-centro"><strong>${cant}</strong></td>
        <td class="num-centro">${porc}%</td>
      </tr>
    `;
  }).join('');
}

function abrir_modal_reporte() {
  if (!sesion_autorizada || sessionStorage.getItem('itp_sesion_activa_segura') !== token_sesion_seguro) {
    return;
  }

  const lista_periodo = obtener_solicitudes_por_periodo();
  const total = lista_periodo.length;
  let pendientes = 0;
  let en_proceso = 0;
  let terminados = 0;
  let con_evento = 0;

  lista_periodo.forEach(item => {
    const est = calcular_estado_automatico(item);
    if (est === 'Pendiente') pendientes++;
    else if (est === 'En proceso') en_proceso++;
    else if (est === 'Terminado') terminados++;
    if (item.aplica_evento) con_evento++;
  });

  const tasa_cumplimiento = total > 0 ? ((terminados / total) * 100).toFixed(1) : '0.0';
  const por_servicio = contar_frecuencias(lista_periodo, 'servicio');
  const por_departamento = contar_frecuencias(lista_periodo, 'solicitante');
  const por_responsable = contar_frecuencias(lista_periodo, 'responsable');

  const nombre_periodo = nombres_meses[mes_filtro_activo] || nombres_meses[mes_actual_sistema];
  const fecha_emision = new Date().toLocaleDateString('es-MX');
  document.getElementById('titulo-mes-reporte').textContent = `Reporte Oficial — ${nombre_periodo}`;

  const filas_padron = lista_periodo.length > 0
    ? lista_periodo.map((item, idx) => {
        const est = calcular_estado_automatico(item);
        const ev_texto = item.aplica_evento
          ? `${item.fecha_evento} (${item.hora_evento} hrs) — ${item.lugar_evento}`
          : 'No aplica';
        const acuerdos = obtener_arreglo_notas(item.observaciones).join('; ');
        return `
          <tr>
            <td class="num-centro">${idx + 1}</td>
            <td class="num-centro"><strong>${String(item.folio).toUpperCase()}</strong></td>
            <td class="num-centro">${item.fecha_solicitud}</td>
            <td>${item.solicitante}</td>
            <td><strong>${capitalizar_inicial(item.servicio)}</strong><br><span style="font-size: 7.5pt; color: #333;">${item.descripcion}</span></td>
            <td>${ev_texto}</td>
            <td>${capitalizar_inicial(item.responsable || 'Sin asignar')}</td>
            <td class="num-centro"><strong>${est.toUpperCase()}</strong></td>
            <td style="font-size: 7.5pt;">${acuerdos || 'Sin observaciones'}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="9" class="num-centro">No existen solicitudes registradas durante el periodo seleccionado.</td></tr>`;

  const contenedor_rep = document.getElementById('contenido-imprimible-reporte');
  contenedor_rep.innerHTML = `
    <div class="hoja-oficio-itp">
      <img src="img/TecPachuca.png" alt="Marca de agua ITP" class="marca-agua-oficio" onerror="this.style.display='none'">

      <div class="contenido-sobre-marca">
        <table class="tabla-membrete-sgc">
          <tr>
            <td class="celda-logos-membrete">
              <div class="contenedor-logos-sgc">
                <img src="img/SEP.png" alt="SEP" class="logo-doc-sep" onerror="this.style.display='none'">
                <img src="img/TECNM.png" alt="TecNM" class="logo-doc-tecnm" onerror="this.style.display='none'">
                <img src="img/TecPachuca.png" alt="ITP" class="logo-doc-itp" onerror="this.style.display='none'">
              </div>
            </td>
            <td class="celda-titulo-membrete">
              <span class="doc-inst">Tecnológico Nacional de México</span>
              <span class="doc-plantel">Instituto Tecnológico de Pachuca</span>
              <span class="doc-depto">Departamento de Comunicación y Difusión</span>
            </td>
            <td class="celda-control-membrete">
              <div><strong>Código:</strong> ITP-CYD-REP-2026</div>
              <div><strong>Revisión:</strong> 01</div>
              <div><strong>Emisión:</strong> ${fecha_emision}</div>
              <div><strong>Periodo:</strong> ${nombre_periodo}</div>
            </td>
          </tr>
        </table>

        <div class="bloque-asunto-oficio">
          <div>
            <strong>DOCUMENTO:</strong> REPORTE OFICIAL DE SOLICITUDES Y PRODUCTIVIDAD
          </div>
          <div>
            <strong>LUGAR:</strong> Pachuca de Soto, Hgo.
          </div>
        </div>

        <p class="parrafo-introductorio-oficio">
          Por medio del presente documento se hace constar el concentrado estadístico y padrón operativo de las solicitudes de diseño e impresión de material gráfico, difusión institucional, cobertura audiovisual y validación de materiales recibidas y gestionadas por el <strong>Departamento de Comunicación y Difusión</strong> del Instituto Tecnológico de Pachuca correspondiente al periodo <strong>${nombre_periodo}</strong>.
        </p>

        <div class="titulo-seccion-oficio">I. Resumen Ejecutivo de Indicadores Operativos</div>
        <table class="tabla-oficio-formal">
          <thead>
            <tr>
              <th class="num-centro">Total de Solicitudes Recibidas</th>
              <th class="num-centro">Solicitudes Concluidas (Terminadas)</th>
              <th class="num-centro">Solicitudes en Proceso</th>
              <th class="num-centro">Solicitudes Pendientes</th>
              <th class="num-centro">Eventos Institucionales Cubiertos</th>
              <th class="num-centro">Índice de Eficiencia Operativa</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num-centro" style="font-size: 11pt;"><strong>${total}</strong></td>
              <td class="num-centro" style="font-size: 11pt;"><strong>${terminados}</strong></td>
              <td class="num-centro" style="font-size: 11pt;"><strong>${en_proceso}</strong></td>
              <td class="num-centro" style="font-size: 11pt;"><strong>${pendientes}</strong></td>
              <td class="num-centro" style="font-size: 11pt;"><strong>${con_evento}</strong></td>
              <td class="num-centro" style="font-size: 11pt;"><strong>${tasa_cumplimiento}%</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="titulo-seccion-oficio">II. Desglose Estadístico por Rubro y Asignación</div>
        <div class="grid-tablas-estadisticas">
          <div>
            <div class="subtitulo-tabla-interna">A) Demanda por Tipo de Servicio</div>
            <table class="tabla-oficio-formal">
              <thead>
                <tr>
                  <th>Catálogo de Servicio</th>
                  <th class="num-centro" style="width: 65px;">Cant.</th>
                  <th class="num-centro" style="width: 65px;">%</th>
                </tr>
              </thead>
              <tbody>
                ${generar_filas_frecuencia(por_servicio, total)}
              </tbody>
            </table>
          </div>

          <div>
            <div class="subtitulo-tabla-interna">B) Departamentos o Áreas Solicitantes</div>
            <table class="tabla-oficio-formal">
              <thead>
                <tr>
                  <th>Departamento / Área Académica</th>
                  <th class="num-centro" style="width: 65px;">Cant.</th>
                  <th class="num-centro" style="width: 65px;">%</th>
                </tr>
              </thead>
              <tbody>
                ${generar_filas_frecuencia(por_departamento, total)}
              </tbody>
            </table>

            <div class="subtitulo-tabla-interna" style="margin-top: 8px;">C) Carga Operativa por Personal Asignado</div>
            <table class="tabla-oficio-formal">
              <thead>
                <tr>
                  <th>Responsable en Comunicación</th>
                  <th class="num-centro" style="width: 65px;">Cant.</th>
                  <th class="num-centro" style="width: 65px;">%</th>
                </tr>
              </thead>
              <tbody>
                ${generar_filas_frecuencia(por_responsable, total)}
              </tbody>
            </table>
          </div>
        </div>

        <div class="titulo-seccion-oficio">III. Padrón Detallado y Bitácora de Solicitudes del Periodo</div>
        <table class="tabla-oficio-formal">
          <thead>
            <tr>
              <th class="num-centro" style="width: 28px;">No.</th>
              <th class="num-centro" style="width: 62px;">Folio</th>
              <th class="num-centro" style="width: 68px;">Fecha</th>
              <th style="width: 120px;">Área Solicitante</th>
              <th>Servicio y Especificación Técnica</th>
              <th style="width: 115px;">Datos del Evento</th>
              <th style="width: 85px;">Responsable</th>
              <th class="num-centro" style="width: 72px;">Estatus</th>
              <th style="width: 130px;">Acuerdos / Bitácora</th>
            </tr>
          </thead>
          <tbody>
            ${filas_padron}
          </tbody>
        </table>

        <div class="bloque-firmas-oficio">
          <div class="caja-firma-oficio">
            <div class="linea-firma-formal">
              <strong>ELABORÓ Y REVISÓ</strong><br>
              <span>Coordinación Operativa de Mesa de Servicio<br>Departamento de Comunicación y Difusión</span>
            </div>
          </div>
          <div class="caja-firma-oficio">
            <div class="linea-firma-formal">
              <strong>AUTORIZÓ Y SELLO DE CONFORMIDAD</strong><br>
              <span>Jefatura del Departamento de Comunicación y Difusión<br>Instituto Tecnológico de Pachuca</span>
            </div>
          </div>
        </div>

        <div class="pie-pagina-oficio">
          <span>Carretera México - Pachuca Km. 87.5, Col. Venta Prieta, C.P. 42080, Pachuca de Soto, Hidalgo.</span>
          <span>Documento generado por Sistema Oficial ITP · ajcr</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-reporte').classList.remove('oculto');
}

function cerrar_modal_reporte() {
  document.getElementById('modal-reporte').classList.add('oculto');
}

async function imprimir_reporte_pdf() {
  window.print();

  if (mes_filtro_activo === 'sem-1' || mes_filtro_activo === 'sem-2') {
    setTimeout(() => {
      confirmar_purga_post_reporte_semestral();
    }, 500);
  }
}

async function confirmar_purga_post_reporte_semestral() {
  if (!sesion_autorizada || sessionStorage.getItem('itp_sesion_activa_segura') !== token_sesion_seguro) {
    return;
  }

  const icono_advertencia_gordito = `
    <div class="alerta-icono-minimal ambar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17.2" x2="12.01" y2="17.2"></line>
      </svg>
    </div>
  `;

  const aviso_1 = await Swal.fire({
    html: `
      ${icono_advertencia_gordito}
      <span class="alerta-tag-sup">Aviso de Cierre Semestral</span>
      <h3 class="alerta-titulo-custom">Corte Semestral de Base de Datos</h3>
      <p class="alerta-cuerpo-custom">
        Al concluir el reporte semestral se eliminarán todos los registros.
        <span class="alerta-pregunta-resaltada">¿Ya guardaste o imprimiste con éxito el PDF del reporte?</span>
      </p>
    `,
    showCancelButton: true,
    confirmButtonColor: '#1B396A',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, ya guardé con éxito el PDF',
    cancelButtonText: 'No, aún no lo guardo'
  });

  if (!aviso_1.isConfirmed) return;

  const icono_seguridad_gordito = `
    <div class="alerta-icono-minimal rojo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
  `;

  const aviso_2 = await Swal.fire({
    html: `
      ${icono_seguridad_gordito}
      <span class="alerta-tag-sup" style="color: #dc2626; background: #fef2f2;">Verificación de Seguridad</span>
      <h3 class="alerta-titulo-custom">Confirmación Definitiva</h3>
      <p class="alerta-cuerpo-custom">
        Esta acción vaciará toda la base de datos y reiniciará el contador de folios a <strong>1</strong>. Escribe la palabra <strong style="color: #dc2626;">ELIMINAR</strong> para confirmar:
      </p>
    `,
    input: 'text',
    inputPlaceholder: 'Escribe ELIMINAR',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Vaciar Base de Datos',
    cancelButtonText: 'Cancelar',
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    hideClass: {
      popup: ''
    },
    inputValidator: (value) => {
      if (value !== 'ELIMINAR') {
        return 'Debes escribir exactamente la palabra ELIMINAR';
      }
    }
  });

  if (!aviso_2.isConfirmed) return;

  if (usar_nube) {
    const { error: error_rpc } = await cliente_db.rpc('reiniciar_tabla_solicitudes');

    if (error_rpc) {
      const { error: error_del } = await cliente_db.from('solicitudes').delete().neq('id', 0);
      if (error_del) {
        Swal.fire({
          icon: 'error',
          title: 'Error de Supabase',
          text: error_del.message,
          confirmButtonColor: '#1B396A'
        });
        return;
      }
    }
  } else {
    localStorage.removeItem('tickets_itp_v6');
  }

  solicitudes = [];
  cerrar_modal_reporte();
  actualizar_folio_preview();
  renderizar_tickets();
  actualizar_notificaciones_ios();

  Swal.fire({
    icon: 'success',
    title: 'Base de Datos Reiniciada',
    text: 'Se eliminaron todas las solicitudes y el contador volverá a iniciar desde el folio e ID 1.',
    confirmButtonColor: '#1B396A'
  });
}

async function alternar_fecha_limite_manual(index, habilitado) {
  if (habilitado) {
    const hoy_iso = new Date().toISOString().split('T')[0];
    await actualizar_campo(index, 'fecha_limite', hoy_iso);
  } else {
    await actualizar_campo(index, 'fecha_limite', '');
  }
}

async function actualizar_campo(index, campo, valor) {
  if (!sesion_autorizada || sessionStorage.getItem('itp_sesion_activa_segura') !== token_sesion_seguro) {
    intentar_abrir_panel();
    return;
  }

  solicitudes[index][campo] = valor;
  const item = solicitudes[index];
  const nuevo_estado = calcular_estado_automatico(item);
  item.estado = nuevo_estado;

  if (usar_nube && item.id) {
    const datos_update = {};
    datos_update[campo] = valor;
    datos_update['estado'] = nuevo_estado;
    await cliente_db.from('solicitudes').update(datos_update).eq('id', item.id);
  } else {
    localStorage.setItem('tickets_itp_v6', JSON.stringify(solicitudes));
  }

  renderizar_tickets();
  actualizar_notificaciones_ios();
}

async function agregar_nota(index) {
  const input = document.getElementById(`nota-input-${index}`);
  const texto = sanitizar_texto(input.value.trim());
  if (!texto) return;

  const item = solicitudes[index];
  const lista = obtener_arreglo_notas(item.observaciones);
  lista.push(`[${new Date().toLocaleDateString('es-MX')}] ${texto}`);
  const nueva_cadena = lista.join(' | ');

  await actualizar_campo(index, 'observaciones', nueva_cadena);
}

async function editar_nota(index_ticket, index_nota) {
  const item = solicitudes[index_ticket];
  const lista = obtener_arreglo_notas(item.observaciones);
  const texto_actual = lista[index_nota];

  const { value: nuevo_texto } = await Swal.fire({
    title: 'Editar nota de seguimiento',
    input: 'text',
    inputValue: texto_actual,
    showCancelButton: true,
    confirmButtonColor: '#1B396A',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    hideClass: {
      popup: ''
    }
  });

  if (nuevo_texto !== undefined && nuevo_texto.trim() !== '') {
    lista[index_nota] = sanitizar_texto(nuevo_texto.trim());
    await actualizar_campo(index_ticket, 'observaciones', lista.join(' | '));
  }
}

async function eliminar_nota(index_ticket, index_nota) {
  const item = solicitudes[index_ticket];
  const lista = obtener_arreglo_notas(item.observaciones);

  const resultado = await Swal.fire({
    title: '¿Eliminar nota?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    hideClass: {
      popup: ''
    }
  });

  if (resultado.isConfirmed) {
    lista.splice(index_nota, 1);
    await actualizar_campo(index_ticket, 'observaciones', lista.join(' | '));
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
    if (!sesion_autorizada || sessionStorage.getItem('itp_sesion_activa_segura') !== token_sesion_seguro) {
      intentar_abrir_panel();
      return;
    }
    v_form.classList.add('oculto');
    v_panel.classList.remove('oculto');
    b_nueva.classList.remove('activo');
    b_panel.classList.add('activo');
    actualizar_metricas_panel();
    actualizar_notificaciones_ios();
  }
}

function cerrar_modal() {
  document.getElementById('modal-exito').classList.add('oculto');
  volver_catalogo();
}

inicializar();