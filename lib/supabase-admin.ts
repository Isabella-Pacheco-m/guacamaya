// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
