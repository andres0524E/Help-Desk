-- =========================================================================
-- blindaje de seguridad supabase: rls, secuencias, constraints y funciones rpc
-- proyecto: mesa de comunicación y difusión | ITP
-- instrucciones: copia y ejecuta este script completo en el sql editor de supabase
-- =========================================================================

-- 1. tabla protegida de directorio de responsables (datos personales fuera del frontend)
create table if not exists public.responsables (
  nombre text primary key,
  correo text,
  telefono text
);

alter table public.responsables enable row level security;

drop policy if exists "lectura_responsables_autenticados" on public.responsables;
create policy "lectura_responsables_autenticados"
  on public.responsables
  for select
  to authenticated
  using (true);

revoke all on table public.responsables from public, anon;
grant select on table public.responsables to authenticated;

insert into public.responsables (nombre, correo, telefono)
values
  ('Sin asignar', '', ''),
  ('Karla', 'andres.0524e@gmail.com', '527441337965'),
  ('Lina', 'andres.0524e@gmail.com', '525591645931'),
  ('Juan', 'andres.0524e@gmail.com', '527712052574'),
  ('Karina', 'andres.0524e@gmail.com', '527711464075'),
  ('Arge', 'andres.0524e@gmail.com', '527711395173'),
  ('Yessica', 'andres.0524e@gmail.com', '5217711622228'),
  ('Chico(a) de servicio', '', '')
on conflict (nombre) do update
set
  correo = excluded.correo,
  telefono = excluded.telefono;

-- 2. secuencia atómica de folios sincronizada automáticamente con public.solicitudes
create sequence if not exists public.seq_folio_solicitudes start with 1 increment by 1;

do $$
declare
  v_max_folio integer;
begin
  select coalesce(
    max(nullif(regexp_replace(folio, '[^0-9]', '', 'g'), '')::integer),
    0
  )
  into v_max_folio
  from public.solicitudes;

  if v_max_folio > 0 then
    perform setval('public.seq_folio_solicitudes', v_max_folio, true);
  else
    perform setval('public.seq_folio_solicitudes', 1, false);
  end if;
end $$;

-- 3. constraints de integridad y longitud en public.solicitudes
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'solicitudes_folio_unico'
  ) then
    alter table public.solicitudes
      add constraint solicitudes_folio_unico unique (folio);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'solicitudes_folio_formato_chk'
  ) then
    alter table public.solicitudes
      add constraint solicitudes_folio_formato_chk
      check (folio ~ '^SRV-[0-9]{3,6}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'solicitudes_longitudes_chk'
  ) then
    alter table public.solicitudes
      add constraint solicitudes_longitudes_chk
      check (
        char_length(coalesce(solicitante, '')) <= 150 and
        char_length(coalesce(descripcion, '')) <= 600 and
        char_length(coalesce(lugar_evento, '')) <= 150 and
        char_length(coalesce(observaciones, '')) <= 300
      ) not valid;
  end if;
end $$;

-- 4. activación de rls en public.solicitudes y revocación de permisos directos a anon
alter table public.solicitudes enable row level security;

do $$
declare
  v_pol record;
begin
  for v_pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'solicitudes'
  loop
    execute format('drop policy if exists %I on public.solicitudes', v_pol.policyname);
  end loop;
end $$;

revoke all on table public.solicitudes from public, anon;
grant select, update on table public.solicitudes to authenticated;

create policy "panel_select_autenticados"
  on public.solicitudes
  for select
  to authenticated
  using (true);

create policy "panel_update_autenticados"
  on public.solicitudes
  for update
  to authenticated
  using (true)
  with check (true);

-- 5. funciones rpc con security definer y search_path fijo

-- a) siguiente_folio(): calcula el próximo folio sin avanzar la secuencia para la vista previa
create or replace function public.siguiente_folio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last bigint;
  v_is_called boolean;
  v_max_tabla bigint;
  v_sig bigint;
begin
  select last_value, is_called
  into v_last, v_is_called
  from public.seq_folio_solicitudes;

  select coalesce(
    max(nullif(regexp_replace(folio, '[^0-9]', '', 'g'), '')::bigint),
    0
  )
  into v_max_tabla
  from public.solicitudes;

  if v_is_called then
    v_sig := greatest(v_last, v_max_tabla) + 1;
  else
    v_sig := greatest(v_last, v_max_tabla + 1);
  end if;

  return 'SRV-' || lpad(v_sig::text, 3, '0');
end;
$$;

-- b) consultar_folio(p_folio): devuelve únicamente campos públicos de un folio específico
create or replace function public.consultar_folio(p_folio text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio_limpio text;
  v_resultado json;
begin
  v_folio_limpio := upper(trim(coalesce(p_folio, '')));

  if v_folio_limpio !~ '^SRV-[0-9]{3,6}$' then
    return null;
  end if;

  select json_build_object(
    'folio', s.folio,
    'fecha_solicitud', s.fecha_solicitud,
    'servicio', s.servicio,
    'solicitante', s.solicitante,
    'descripcion', s.descripcion,
    'aplica_evento', s.aplica_evento,
    'fecha_evento', s.fecha_evento,
    'hora_evento', s.hora_evento,
    'lugar_evento', s.lugar_evento,
    'estado', s.estado,
    'responsable', s.responsable,
    'fecha_limite', s.fecha_limite,
    'observaciones', s.observaciones
  )
  into v_resultado
  from public.solicitudes s
  where upper(s.folio) = v_folio_limpio
  limit 1;

  return v_resultado;
end;
$$;

-- c) crear_solicitud(p_datos): inserta con límite anti-abuso, valida longitudes y asigna folio en servidor
create or replace function public.crear_solicitud(p_datos json)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.solicitudes;
  v_recientes integer;
  v_num_folio bigint;
  v_folio_generado text;
  v_fecha_hoy text;
begin
  -- tope anti-abuso: máximo 12 solicitudes en el último minuto (si existe created_at) o validación de ráfaga
  begin
    execute 'select count(*) from public.solicitudes where created_at > (now() - interval ''1 minute'')'
    into v_recientes;
  exception when undefined_column then
    v_recientes := 0;
  end;

  if coalesce(v_recientes, 0) >= 12 then
    raise exception 'Límite de solicitudes por minuto alcanzado. Intenta nuevamente en unos segundos.';
  end if;

  v_rec := json_populate_record(null::public.solicitudes, p_datos);

  v_rec.servicio := left(trim(coalesce(v_rec.servicio, 'Diseño e impresión de material gráfico')), 120);
  v_rec.solicitante := left(trim(coalesce(v_rec.solicitante, '')), 150);
  v_rec.descripcion := left(trim(coalesce(v_rec.descripcion, '')), 600);
  v_rec.aplica_evento := coalesce(v_rec.aplica_evento, false);
  v_rec.fecha_evento := case when v_rec.aplica_evento then left(trim(coalesce(v_rec.fecha_evento, '')), 20) else '' end;
  v_rec.hora_evento := case when v_rec.aplica_evento then left(trim(coalesce(v_rec.hora_evento, '')), 20) else '' end;
  v_rec.lugar_evento := case when v_rec.aplica_evento then left(trim(coalesce(v_rec.lugar_evento, '')), 150) else '' end;
  v_fecha_hoy := left(trim(coalesce(v_rec.fecha_solicitud, to_char(now(), 'DD/MM/YYYY'))), 20);

  if v_rec.solicitante = '' or v_rec.descripcion = '' then
    raise exception 'Los datos del solicitante y la descripción son obligatorios.';
  end if;

  -- sincroniza secuencia si la tabla tuviera un folio mayor e incrementa de forma atómica
  perform setval(
    'public.seq_folio_solicitudes',
    greatest(
      coalesce((select max(nullif(regexp_replace(folio, '[^0-9]', '', 'g'), '')::bigint) from public.solicitudes), 0),
      coalesce((select case when is_called then last_value else 0 end from public.seq_folio_solicitudes), 0)
    ),
    true
  );

  v_num_folio := nextval('public.seq_folio_solicitudes');
  v_folio_generado := 'SRV-' || lpad(v_num_folio::text, 3, '0');

  -- ignora estado, responsable, fecha_limite y folio enviados por el cliente
  insert into public.solicitudes (
    folio,
    fecha_solicitud,
    servicio,
    solicitante,
    descripcion,
    aplica_evento,
    fecha_evento,
    hora_evento,
    lugar_evento,
    estado,
    responsable,
    fecha_limite,
    observaciones
  ) values (
    v_folio_generado,
    v_fecha_hoy,
    v_rec.servicio,
    v_rec.solicitante,
    v_rec.descripcion,
    v_rec.aplica_evento,
    v_rec.fecha_evento,
    v_rec.hora_evento,
    v_rec.lugar_evento,
    'Pendiente',
    'Sin asignar',
    '',
    left('[' || v_fecha_hoy || '] Solicitud registrada en plataforma.', 300)
  );

  return v_folio_generado;
end;
$$;

-- d) reiniciar_tabla_solicitudes(): vacía la tabla y reinicia identidad y secuencia en 1 (solo autenticados)
create or replace function public.reiniciar_tabla_solicitudes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'No autorizado para reiniciar la base de datos.';
  end if;

  truncate table public.solicitudes restart identity;
  perform setval('public.seq_folio_solicitudes', 1, false);
end;
$$;

-- 6. permisos estrictos de ejecución en funciones rpc
revoke execute on function public.siguiente_folio() from public;
revoke execute on function public.consultar_folio(text) from public;
revoke execute on function public.crear_solicitud(json) from public;
revoke execute on function public.reiniciar_tabla_solicitudes() from public, anon;

grant execute on function public.siguiente_folio() to anon, authenticated;
grant execute on function public.consultar_folio(text) to anon, authenticated;
grant execute on function public.crear_solicitud(json) to anon, authenticated;
grant execute on function public.reiniciar_tabla_solicitudes() to authenticated;

