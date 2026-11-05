// =========================================================================
// webhook seguro de google apps script para notificaciones institucionales
// remitente visible: "Mesa de Comunicación y Difusión ITP"
// =========================================================================
// configuración de script properties en script.google.com:
// 1. entra a "Configuración del proyecto" (ícono de engrane) > "Propiedades de secuencia de comandos"
// 2. agrega la propiedad: WEBHOOK_SECRET = (tu clave secreta aleatoria)
// 3. agrega la propiedad: DESTINATARIO_ALERTAS = (correo receptor de alertas)
// =========================================================================

// seguridad: escapa caracteres especiales html para impedir inyección en el cuerpo del correo
function escapar_html_correo(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// seguridad: recorta la longitud máxima de un campo antes de procesarlo
function recortar_texto_seguro(texto, max_len) {
  if (!texto) return '';
  return String(texto).trim().slice(0, max_len);
}

function doPost(e) {
  try {
    // 1. validación obligatoria de clave secreta por parámetro (?clave=...)
    const propiedades = PropertiesService.getScriptProperties();
    const secreto_configurado = propiedades.getProperty('WEBHOOK_SECRET');
    const clave_recibida = (e && e.parameter && e.parameter.clave) ? String(e.parameter.clave) : '';

    if (!secreto_configurado || clave_recibida !== secreto_configurado) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. soporte tanto para database webhook de supabase (body.record) como json directo
    const contenido_raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(contenido_raw);
    const registro = (body && typeof body.record === 'object' && body.record !== null) ? body.record : body;

    // 3. validación estricta del formato de folio institucional (^SRV-\d{3,6}$)
    const folio_bruto = recortar_texto_seguro(registro.folio || '', 12).toUpperCase();
    if (!/^SRV-\d{3,6}$/.test(folio_bruto)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Formato de folio inválido' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. destinatario fijo desde propiedades del script (ignora cualquier email del payload)
    const destinatario_fijo = recortar_texto_seguro(
      propiedades.getProperty('DESTINATARIO_ALERTAS') || 'andres.0524e@gmail.com',
      150
    );

    // 5. recorte de longitudes y armado seguro de información de evento
    const servicio_bruto = recortar_texto_seguro(registro.servicio || 'Servicio general', 120);
    const solicitante_bruto = recortar_texto_seguro(registro.solicitante || 'Departamento del ITP', 150);
    const descripcion_bruta = recortar_texto_seguro(registro.descripcion || 'Sin descripción adicional', 600);

    let evento_bruto = '';
    if (registro.evento_info) {
      evento_bruto = recortar_texto_seguro(registro.evento_info, 220);
    } else if (registro.aplica_evento) {
      const f_ev = recortar_texto_seguro(registro.fecha_evento || '', 20);
      const h_ev = recortar_texto_seguro(registro.hora_evento || '', 20);
      const l_ev = recortar_texto_seguro(registro.lugar_evento || '', 150);
      evento_bruto = `${f_ev} a las ${h_ev} hrs en ${l_ev}`;
    } else {
      evento_bruto = 'Sin evento presencial asociado';
    }

    // 6. escape html estricto antes de inyectar en htmlBody
    const folio = escapar_html_correo(folio_bruto);
    const servicio = escapar_html_correo(servicio_bruto);
    const solicitante = escapar_html_correo(solicitante_bruto);
    const descripcion = escapar_html_correo(descripcion_bruta);
    const evento_info = escapar_html_correo(evento_bruto);

    const asunto = 'Nueva solicitud registrada [' + folio_bruto + '] — Mesa de Comunicación y Difusión ITP';

    const cuerpo_texto =
      'Mesa de Comunicación y Difusión | Instituto Tecnológico de Pachuca (ITP)\n\n' +
      'Se ha registrado una nueva solicitud en plataforma:\n\n' +
      'Folio: ' + folio_bruto + '\n' +
      'Servicio: ' + servicio_bruto + '\n' +
      'Área solicitante: ' + solicitante_bruto + '\n' +
      'Detalles y requerimientos: ' + descripcion_bruta + '\n' +
      'Información del evento: ' + evento_bruto + '\n\n' +
      'Ingresa al Panel Interno de la Mesa de Comunicación y Difusión para asignar un responsable.';

    const cuerpo_html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
      </head>
      <body style="margin: 0; padding: 28px 16px; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 12px 32px rgba(27, 57, 106, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #1B396A 0%, #12274b 100%); padding: 26px 30px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 6px;">
                Tecnológico Nacional de México · ITP
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Mesa de Comunicación y Difusión
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.55; text-align: center;">
                Se ha recibido una nueva solicitud oficial en la plataforma. A continuación se presentan los detalles registrados:
              </p>

              <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 24px;">
                <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">
                  Folio Institucional Asignado
                </span>
                <strong style="font-size: 26px; font-weight: 800; color: #1B396A; letter-spacing: 1px; font-family: monospace;">
                  ${folio}
                </strong>
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;">
                    Servicio requerido
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1B396A; font-weight: 700; vertical-align: top;">
                    ${servicio}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; vertical-align: top;">
                    Área solicitante
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; vertical-align: top;">
                    ${solicitante}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600; vertical-align: top;">
                    Requerimientos
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; line-height: 1.5; vertical-align: top;">
                    ${descripcion}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #64748b; font-weight: 600; vertical-align: top;">
                    Evento asociado
                  </td>
                  <td style="padding: 12px 0; color: #0077b6; font-weight: 600; vertical-align: top;">
                    ${evento_info}
                  </td>
                </tr>
              </table>

              <div style="margin-top: 26px; padding: 14px 18px; background-color: #eff6ff; border-left: 4px solid #1B396A; border-radius: 8px; font-size: 13px; color: #1e3a8a; line-height: 1.45;">
                <strong>Acción requerida:</strong> Ingresa al <em>Panel Interno</em> de la Mesa de Comunicación y Difusión para asignar un responsable de seguimiento.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Instituto Tecnológico de Pachuca · Departamento de Comunicación y Difusión
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    GmailApp.sendEmail(destinatario_fijo, asunto, cuerpo_texto, {
      name: 'Mesa de Comunicación y Difusión ITP',
      htmlBody: cuerpo_html
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, folio: folio_bruto }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Error interno al procesar notificación' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      servicio: 'Endpoint activo — Mesa de Comunicación y Difusión ITP'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
