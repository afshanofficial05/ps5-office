import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (context) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          if (context && context.req && context.req.cookies) {
            return Object.entries(context.req.cookies).map(([name, value]) => ({ name, value }));
          }
          return [];
        },
        setAll(cookiesToSet) {
          if (context && context.res) {
            cookiesToSet.forEach(({ name, value, options }) => {
              context.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly`);
            });
          }
        },
      },
    },
  );
};
