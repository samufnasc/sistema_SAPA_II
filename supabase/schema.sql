-- ============================================================
-- AvaliaProj — Schema do Banco de Dados (Supabase / PostgreSQL)
-- v2.0 — Inclui avaliação individual por aluno
-- Execute este script no SQL Editor do Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Usuários ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR     UNIQUE NOT NULL,
  password_hash VARCHAR     NOT NULL,
  nome          VARCHAR     NOT NULL,
  role          VARCHAR     NOT NULL CHECK (role IN ('admin', 'professor')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Professores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  nome       VARCHAR     NOT NULL,
  email      VARCHAR     UNIQUE NOT NULL,
  foto_url   VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Equipes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR     NOT NULL,
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Alunos ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alunos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR     NOT NULL,
  equipe_id    UUID        REFERENCES equipes(id) ON DELETE CASCADE,
  foto_3x4_url VARCHAR,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Projetos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projetos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     VARCHAR     NOT NULL,
  descricao  TEXT,
  equipe_id  UUID        REFERENCES equipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Arquivos dos Projetos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projeto_arquivos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id    UUID        REFERENCES projetos(id) ON DELETE CASCADE,
  nome_arquivo  VARCHAR     NOT NULL,
  url           VARCHAR     NOT NULL,
  tipo          VARCHAR     CHECK (tipo IN ('pdf', 'word', 'foto', 'outro')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Avaliações legadas (por projeto) ──────────────────────────────────────
-- Mantida para compatibilidade
CREATE TABLE IF NOT EXISTS avaliacoes (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id   UUID           REFERENCES projetos(id) ON DELETE CASCADE,
  professor_id UUID           REFERENCES professores(id) ON DELETE CASCADE,
  nota         DECIMAL(4, 2)  CHECK (nota >= 0 AND nota <= 10),
  comentario   TEXT,
  criterios    JSONB,
  created_at   TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (projeto_id, professor_id)
);

-- ─── 8. *** NOVA *** Avaliações Individuais por Aluno ─────────────────────────
-- Cada professor avalia cada aluno individualmente em cada projeto.
-- A tripla (projeto_id, aluno_id, professor_id) é única.
CREATE TABLE IF NOT EXISTS avaliacao_alunos (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id   UUID           NOT NULL REFERENCES projetos(id)    ON DELETE CASCADE,
  aluno_id     UUID           NOT NULL REFERENCES alunos(id)      ON DELETE CASCADE,
  professor_id UUID           NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  nota         DECIMAL(4, 2)  NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario   TEXT,
  -- JSONB com os 5 eixos: conteudo, apresentacao, inovacao, metodologia, resultados
  -- Cada valor: DECIMAL(4,2) entre 0 e 10, step 0.1
  criterios    JSONB          NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ    DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (projeto_id, aluno_id, professor_id)
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alunos_equipe          ON alunos(equipe_id);
CREATE INDEX IF NOT EXISTS idx_projetos_equipe        ON projetos(equipe_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_projeto       ON projeto_arquivos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_projeto     ON avaliacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prof        ON avaliacoes(professor_id);
CREATE INDEX IF NOT EXISTS idx_professores_user       ON professores(user_id);
-- Índices para avaliacao_alunos
CREATE INDEX IF NOT EXISTS idx_av_alunos_projeto      ON avaliacao_alunos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_av_alunos_aluno        ON avaliacao_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_av_alunos_professor    ON avaliacao_alunos(professor_id);

-- ─── RLS Desativado (controle via service_role no backend) ───────────────────
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE professores        DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE alunos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE projetos           DISABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_arquivos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_alunos   DISABLE ROW LEVEL SECURITY;

-- ─── Seed: Usuário admin padrão ───────────────────────────────────────────────
-- Senha: admin@123 (bcrypt rounds=12)
-- TROQUE a senha após o primeiro login!
INSERT INTO users (email, password_hash, nome, role)
VALUES (
  'admin@avalia.proj',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCMEzc5jrBWJfuQYNYqaXJG',
  'Administrador',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ─── Buckets do Storage (criar no painel Supabase > Storage > New Bucket) ────
-- 1. Bucket: "projetos"    — Public: true
-- 2. Bucket: "professores" — Public: true
-- 3. Bucket: "alunos"      — Public: true

-- ─── Se já tem a tabela avaliacoes e está migrando ───────────────────────────
-- Execute apenas se necessário:
-- ALTER TABLE avaliacao_alunos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
