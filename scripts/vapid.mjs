// scripts/vapid.mjs — verificar o generar el par de claves VAPID.
//
//   node scripts/vapid.mjs verificar   # ¿las claves del entorno sirven?
//   node scripts/vapid.mjs generar     # crea un par nuevo y válido
//
// Por qué existe: si la clave pública y la privada no son pareja, el push
// service ACEPTA los envíos (201) y el navegador los descarta al verificar la
// firma. Desde el servidor se ve idéntico a una entrega perfecta, así que es
// el fallo más caro de diagnosticar de todo el sistema. Esto lo resuelve en
// dos segundos y sin desplegar nada.
//
// OJO al generar: cambiar las claves invalida TODAS las suscripciones
// existentes. Los dispositivos se rearreglan solos la próxima vez que su
// dueño abra la app del club (lib/push-client.ts revalida la clave en cada
// apertura), pero hasta entonces no reciben nada.

import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function envDelArchivo() {
  try {
    const txt = readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    const out = {}
    for (const linea of txt.split(/\r?\n/)) {
      const m = linea.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return out
  } catch {
    return {}
  }
}

function generar() {
  // Par P-256 en el formato que espera Web Push: pública = punto sin
  // comprimir (65 bytes), privada = escalar (32 bytes), ambas en base64url.
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    publica: ecdh.getPublicKey().toString('base64url'),
    privada: ecdh.getPrivateKey().toString('base64url'),
  }
}

function verificar(publica, privada) {
  if (!publica || !privada) {
    return { ok: false, motivo: 'Faltan VAPID_PUBLIC_KEY y/o VAPID_PRIVATE_KEY' }
  }
  let pub, priv
  try {
    pub = Buffer.from(publica, 'base64url')
    priv = Buffer.from(privada, 'base64url')
  } catch {
    return { ok: false, motivo: 'Alguna clave no es base64url válido' }
  }
  if (pub.length !== 65) {
    return {
      ok: false,
      motivo: `La pública decodifica a ${pub.length} bytes y deben ser 65 (¿se copió incompleta o con espacios?)`,
    }
  }
  if (priv.length !== 32) {
    return {
      ok: false,
      motivo: `La privada decodifica a ${priv.length} bytes y deben ser 32`,
    }
  }
  try {
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.setPrivateKey(priv)
    if (!ecdh.getPublicKey().equals(pub)) {
      return {
        ok: false,
        motivo:
          'Las claves son válidas por separado pero NO son pareja: vienen de dos generaciones distintas. Los envíos se aceptarán y ningún celular los mostrará.',
      }
    }
  } catch (e) {
    return { ok: false, motivo: `La privada no es una clave P-256 válida: ${e.message}` }
  }
  return { ok: true }
}

const comando = process.argv[2] ?? 'verificar'

if (comando === 'generar') {
  const { publica, privada } = generar()
  console.log('\nPar VAPID nuevo — pégalo en las variables de entorno de Vercel')
  console.log('(Production, Preview y Development: las tres, o solo funcionará en una)\n')
  console.log(`VAPID_PUBLIC_KEY=${publica}`)
  console.log(`VAPID_PRIVATE_KEY=${privada}`)
  console.log(`VAPID_SUBJECT=mailto:hola@guacamaya.net`)
  console.log(
    '\nDespués de cambiarlas hay que REDESPLEGAR: las variables se leen al arrancar.'
  )
  console.log(
    'Las suscripciones actuales quedan invalidadas y se rehacen solas cuando cada miembro vuelva a abrir su club.\n'
  )
  process.exit(0)
}

const env = { ...envDelArchivo(), ...process.env }
const r = verificar(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

if (r.ok) {
  console.log('\n✓ El par VAPID es consistente.\n')
  console.log(`  pública  …${String(env.VAPID_PUBLIC_KEY).slice(-8)} (65 bytes)`)
  console.log(`  privada  …${String(env.VAPID_PRIVATE_KEY).slice(-8)} (32 bytes)\n`)
  console.log(
    'Si aun así no llegan notificaciones, el problema NO son las claves:\n' +
      'mira "confirmadas" en el panel de notificaciones del negocio.\n'
  )
  process.exit(0)
}

console.error(`\n✗ ${r.motivo}\n`)
console.error('Genera un par válido con:  node scripts/vapid.mjs generar\n')
process.exit(1)
