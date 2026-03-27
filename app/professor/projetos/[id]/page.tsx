"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Save, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AvaliacaoProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [projeto, setProjeto] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, { nota: number; criterios: string }>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProjetoData();
    }
  }, [status, params.id]);

  const fetchProjetoData = async () => {
    try {
      setLoading(true);
      // Fetch projeto and alunos (assuming these endpoints exist)
      const res = await fetch(`/api/projetos/${params.id}`);
      const data = await res.json();
      setProjeto(data.projeto);
      setAlunos(data.alunos);

      // Initialize avaliacoes state
      const initialAvaliacoes: Record<string, { nota: number; criterios: string }> = {};
      data.alunos.forEach((aluno: any) => {
        initialAvaliacoes[aluno.id] = {
          nota: aluno.avaliacao?.nota || 0,
          criterios: aluno.avaliacao?.criterios || "",
        };
      });
      setAvaliacoes(initialAvaliacoes);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Falha ao carregar dados do projeto." });
    } finally {
      setLoading(false);
    }
  };

  const handleNotaChange = (alunoId: string, nota: number) => {
    setAvaliacoes((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], nota },
    }));
  };

  const handleCriteriosChange = (alunoId: string, criterios: string) => {
    setAvaliacoes((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], criterios },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // Prepare data for submission
      const submissionData = Object.entries(avaliacoes).map(([aluno_id, data]) => ({
        projeto_id: params.id,
        aluno_id,
        nota: data.nota,
        criterios: data.criterios,
      }));

      // Log data before fetch as requested
      console.log("Submitting evaluation data:", submissionData);

      // Submit each evaluation (or batch if API supports it)
      // For simplicity, we'll submit them sequentially or use a batch endpoint if available
      // Here we assume the API handles one at a time or we can loop
      for (const item of submissionData) {
        const res = await fetch("/api/avaliacoes-alunos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao salvar avaliação.");
        }
      }

      setMessage({ type: "success", text: "Avaliações salvas com sucesso!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Submission error:", error);
      setMessage({ type: "error", text: error.message || "Ocorreu um erro ao salvar as avaliações." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </button>
          <h1 className="text-3xl font-bold tracking-tight">{projeto?.nome || "Avaliação de Projeto"}</h1>
          <p className="text-muted-foreground">Avalie os alunos participantes deste projeto.</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Avaliações
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-6 flex items-center ${
            message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {message.text}
        </motion.div>
      )}

      <div className="space-y-6">
        {alunos.map((aluno) => (
          <div key={aluno.id} className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{aluno.nome}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Nota:</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={avaliacoes[aluno.id]?.nota || 0}
                  onChange={(e) => handleNotaChange(aluno.id, parseFloat(e.target.value))}
                  className="w-20 px-2 py-1 border rounded bg-background"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Critérios / Observações:</label>
              <textarea
                value={avaliacoes[aluno.id]?.criterios || ""}
                onChange={(e) => handleCriteriosChange(aluno.id, e.target.value)}
                placeholder="Descreva os critérios de avaliação..."
                className="w-full h-24 px-3 py-2 border rounded bg-background resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
