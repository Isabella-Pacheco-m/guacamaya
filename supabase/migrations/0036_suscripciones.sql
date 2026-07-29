-- 0036_suscripciones.sql — suscripción mensual a la plataforma (Wompi).
--
-- Una fila por intento de pago ($35.000 COP/mes); el webhook de Wompi la
-- activa. Vínculo con el tenant por email (== tenants.admin_email), sin FK.
-- Estados: PENDIENTE → ACTIVA (webhook APPROVED) | RECHAZADA | CANCELADA
-- (desuscripción: bloquea el acceso admin, ver lib/page-auth.ts).
-- El alta del club sigue siendo manual (superadmin contacta al negocio).

create table if not exists suscripciones (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,             -- persona de contacto
  negocio      text not null,             -- nombre del negocio
  email        text not null,             -- vínculo con tenants.admin_email
  telefono     text,
  referencia   text not null unique,      -- reference enviada a Wompi (única, no reusable)
  estado       text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'ACTIVA', 'RECHAZADA', 'CANCELADA')),
  monto_cop    int  not null,
  wompi_transaction_id text,
  pagada_hasta timestamptz,               -- fin del periodo cubierto por este pago
  cancelada_at timestamptz,
  created_at   timestamptz default now()
);

-- Lookup del webhook (por referencia ya lo cubre el unique) y del panel admin.
create index if not exists idx_suscripciones_email_created
  on suscripciones (email, created_at desc);

-- Solo service role, como el resto de tablas (0020 dejó default privileges
-- cerrados para objetos nuevos; RLS sin policies refuerza el cierre).
alter table suscripciones enable row level security;
revoke all on suscripciones from anon, authenticated;
grant  all on suscripciones to service_role;
