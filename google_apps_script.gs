// =========================================================================
// script de google apps script para envío de hasta 3,000 correos al mes
// cuenta emisora oficial: Avisos.MesaCD@gmail.com
// remitente visible: "Mesa de Comunicación y Difusión ITP"
// =========================================================================
// instrucciones de despliegue en script.google.com:
// 1. inicia sesión con la cuenta Avisos.MesaCD@gmail.com en https://script.google.com
// 2. crea un nuevo proyecto y pega este código completo en Código.gs
// 3. haz clic en "Implementar" > "Nueva implementación"
// 4. selecciona tipo: "Aplicación web"
// 5. en "Ejecutar como": selecciona "Yo (Avisos.MesaCD@gmail.com)"
// 6. en "Quién tiene acceso": selecciona "Cualquier persona"
// 7. autoriza los permisos y copia la url de la aplicación web en la constante
//    endpoint_google_script dentro de tu archivo app.js
// id de implementación activo: AKfycby2SE_6wEIYEspg1GO1MOhQFivz9oVjeuFWERLDFcLafzFk00JnTPkX4vNc6AsQNiQliw
// url de app web activa: https://script.google.com/macros/s/AKfycby2SE_6wEIYEspg1GO1MOhQFivz9oVjeuFWERLDFcLafzFk00JnTPkX4vNc6AsQNiQliw/exec
// =========================================================================

function limpiar_entidades_html(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function doPost(e) {
  try {
    const contenido_raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const datos = JSON.parse(contenido_raw);

    const destinatario = limpiar_entidades_html(datos.email || 'andres.0524e@gmail.com');
    const folio = limpiar_entidades_html(datos.folio || 'SRV-000').toUpperCase();
    const servicio = limpiar_entidades_html(datos.servicio || 'Servicio general');
    const solicitante = limpiar_entidades_html(datos.solicitante || 'Departamento del ITP');
    const descripcion = limpiar_entidades_html(datos.descripcion || 'Sin descripción adicional');
    const evento_info = limpiar_entidades_html(datos.evento_info || 'Sin evento presencial asociado');

    const asunto = 'Nueva solicitud registrada [' + folio + '] — Mesa de Comunicación y Difusión ITP';

    const cuerpo_texto =
      'Mesa de Comunicación y Difusión | Instituto Tecnológico de Pachuca (ITP)\n\n' +
      'Se ha registrado una nueva solicitud en plataforma:\n\n' +
      'Folio: ' + folio + '\n' +
      'Servicio: ' + servicio + '\n' +
      'Área solicitante: ' + solicitante + '\n' +
      'Detalles y requerimientos: ' + descripcion + '\n' +
      'Información del evento: ' + evento_info + '\n\n' +
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
              Instituto Tecnológico de Pachuca · Departamento de Comunicación y Difusión<br>
              Cuenta emisora oficial: Avisos.MesaCD@gmail.com
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    GmailApp.sendEmail(destinatario, asunto, cuerpo_texto, {
      name: 'Mesa de Comunicación y Difusión ITP',
      htmlBody: cuerpo_html
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, folio: folio, destinatario: destinatario }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      servicio: 'Endpoint activo — Mesa de Comunicación y Difusión ITP',
      cuenta_oficial: 'Avisos.MesaCD@gmail.com'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

