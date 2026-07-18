import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Lo invoca Vercel Cron una vez al día (ver vercel.json).
// Vercel envía Authorization: Bearer ${CRON_SECRET} automáticamente.
// Si CRON_SECRET no está configurado, rechaza todo (fail-closed).
//
// caducar_puntos() es idempotente (ver 0032_caducidad_puntos.sql): si el cron
// corre dos veces el mismo día, la segunda pasada no descuenta nada.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 500 }
    )
  }

  const auth = req.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.rpc('caducar_puntos')
  if (error) {
    console.error('caducar_puntos fallo', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...data })
}
