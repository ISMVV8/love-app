import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const AUTO_REPLIES = [
  "Hey ! Comment ça va ? 😊",
  "Ravie de te rencontrer ici !",
  "J'ai vu ton profil, on a plein de points communs 💫",
  "Tu fais quoi ce weekend ? 🎉",
  "Haha trop bien ! 😄",
  "On se dit quoi pour un café ? ☕",
  "C'est cool ça, raconte-moi plus !",
  "T'as l'air super intéressant·e 😏",
  "Je suis dispo si tu veux en parler 😊",
  "Oh j'adore ! Moi aussi j'aime ça 🤩",
];

export async function POST(request: Request) {
  try {
    const { match_id, sender_id } = await request.json();

    if (!match_id || !sender_id) {
      return NextResponse.json(
        { error: 'match_id and sender_id required' },
        { status: 400 }
      );
    }

    const content = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];

    const { data, error } = await supabase.from('messages').insert({
      match_id,
      sender_id,
      content,
      type: 'text',
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
