import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Safety check: allow admin or professor
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "professor")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projeto_id, aluno_id, nota, criterios } = body;

    if (!projeto_id || !aluno_id || nota === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert in Supabase using admin client
    const { data, error } = await supabaseAdmin
      .from("avaliacoes_alunos")
      .upsert(
        {
          projeto_id,
          aluno_id,
          professor_id: session.user.id,
          nota,
          criterios,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "projeto_id,aluno_id,professor_id" }
      )
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
