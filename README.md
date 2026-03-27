# 🎓 AvaliaProj v2 — Sistema de Avaliação de Projetos Acadêmicos (SAPA II)

> Sistema web completo para avaliação **individual por aluno** de projetos acadêmicos.
> Administradores cadastram professores, equipes e projetos. Professores fazem login
> para visualizar cada projeto e avaliar individualmente cada aluno da equipe com
> 5 eixos de critérios e sliders de precisão 0,1.

---

## 🆕 Novidades v2

| Funcionalidade | Descrição |
|---|---|
| 🌙 **Dark Mode** | Tema escuro/claro via `next-themes` com toggle no cabeçalho |
| 📸 **Foto no Header** | Foto do professor logado exibida no cabeçalho |
| 🔄 **Fix: Refresh** | Eliminado o refresh automático indesejado na aba do Professor |
| 👤 **Avaliação Individual** | Professor avalia **cada aluno separadamente** clicando na foto |
| 🎚️ **Slider 0,1** | Sliders com precisão de 0,1 (ex: 7,0 → 7,1 → 7,2...) |
| 📖 **Descrição dos Eixos** | Botão ℹ️ ao lado de cada eixo abre a descrição pedagógica |
| 🗑️ **Admin: Avaliações** | Página `/admin/avaliacoes` para listar e deletar avaliações |

---

## 🚀 Stack Tecnológica

| Tecnologia | Versão | Uso |
|---|---|---|
| **Next.js** | 14 (App Router) | Framework full-stack |
| **TypeScript** | 5 | Tipagem estática |
| **Tailwind CSS** | 3 | Estilização + dark mode (`class`) |
| **next-themes** | 0.3 | Gerenciamento de tema claro/escuro |
| **NextAuth.js** | 4 | Autenticação JWT |
| **Supabase** | 2 | PostgreSQL + Storage |
| **React Hook Form** | 7 | Formulários |
| **Zod** | 3 | Validação |
| **Bcryptjs** | 2 | Hash de senhas |
| **Lucide React** | — | Ícones |
| **React Hot Toast** | 2 | Notificações |

---

## 📐 Estrutura de Arquivos

```
avalia-proj/
├── app/
│   ├── page.tsx                              # Login
│   ├── layout.tsx                            # Root layout (suppressHydrationWarning)
│   ├── globals.css                           # Design system + dark mode
│   ├── providers.tsx                         # SessionProvider + ThemeProvider + Toaster
│   ├── admin/
│   │   ├── layout.tsx                        # Sidebar admin
│   │   ├── page.tsx                          # Dashboard
│   │   ├── professores/page.tsx              # CRUD professores
│   │   ├── equipes/page.tsx                  # CRUD equipes e alunos
│   │   ├── projetos/page.tsx                 # CRUD projetos + upload
│   │   └── avaliacoes/page.tsx               # ★ NOVO: listar e deletar avaliações
│   ├── professor/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          # Grid de projetos (sem refresh automático)
│   │   └── projetos/[id]/page.tsx            # ★ REFATORADO: avaliação individual por aluno
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── dashboard/route.ts
│       ├── professores/route.ts + [id]/
│       ├── equipes/route.ts + [id]/
│       ├── projetos/route.ts + [id]/
│       ├── avaliacoes/route.ts               # Avaliações por projeto (legado)
│       ├── avaliacoes-alunos/route.ts        # ★ NOVO: avaliação individual por aluno
│       ├── avaliacoes-alunos/[id]/route.ts   # ★ NOVO: GET + DELETE por ID
│       ├── arquivos/[id]/route.ts
│       └── upload/route.ts
├── components/
│   ├── Sidebar.tsx       # + dark mode + link Avaliações
│   ├── Header.tsx        # ★ REFATORADO: foto do usuário + toggle dark mode
│   ├── Modal.tsx         # + dark mode
│   ├── FileUpload.tsx
│   ├── AlunoCard.tsx
│   ├── ProjetoCard.tsx   # + dark mode
│   ├── Loading.tsx
│   └── Alert.tsx
├── lib/
│   ├── supabase.ts       # + tipos AvaliacaoAluno, CriteriosAvaliacao
│   ├── auth.ts
│   └── utils.ts
├── supabase/
│   └── schema.sql        # ★ ATUALIZADO: inclui tabela avaliacao_alunos
├── scripts/seed-admin.js
├── middleware.ts
├── vercel.json           # Limpo (sem secrets legados)
├── .env.example
└── package.json          # + next-themes
```

---

## 🗄️ Schema do Banco de Dados

### Nova tabela: `avaliacao_alunos`

```sql
CREATE TABLE avaliacao_alunos (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id   UUID    NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  aluno_id     UUID    NOT NULL REFERENCES alunos(id)   ON DELETE CASCADE,
  professor_id UUID    NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  nota         DECIMAL(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario   TEXT,
  criterios    JSONB NOT NULL DEFAULT '{}',
  -- criterios: { conteudo, apresentacao, inovacao, metodologia, resultados }
  -- Cada valor: DECIMAL step 0.1, range 0–10
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (projeto_id, aluno_id, professor_id)
);
```

---

## 🎚️ Os 5 Eixos de Avaliação

| Eixo | Critérios agrupados | Síntese |
|---|---|---|
| **📋 Conteúdo** | Originalidade, Relevância científica, Relevância social, Domínio | Essência do projeto e domínio do assunto |
| **🎤 Apresentação** | Material, Domínio na exposição, Design do produto | Qualidade da comunicação e do banner/slides |
| **💡 Inovação** | Originalidade, Tecnologia utilizada | Caráter pioneiro e uso diferenciado de tecnologia |
| **🔬 Metodologia** | Perfil multiprofissional, Estrutura tecnológica | Capacidade de execução e uso estruturado da tecnologia |
| **📈 Resultados** | Impacto científico, Benefício social, Design, Efetividade | Impactos gerados e efetividade dos resultados |

---

## ⚙️ Setup

### 1. Instalar dependências

```bash
npm install
```

> O `next-themes` foi adicionado ao `package.json`. Certifique-se de rodar `npm install` após atualizar o projeto.

### 2. Configurar Supabase

Execute `supabase/schema.sql` no **SQL Editor** do Supabase.

> ⚠️ **Se já tinha o banco criado**, execute apenas o bloco da nova tabela:
> ```sql
> CREATE TABLE IF NOT EXISTS avaliacao_alunos (...)
> -- Ver schema.sql completo
> ```

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# Preencha NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_SUPABASE_URL, etc.
```

### 4. Criar admin e rodar

```bash
node scripts/seed-admin.js
npm run dev
```

---

## 🌐 Deploy no Vercel

1. Commit e push para o GitHub
2. Importe no Vercel
3. Configure as **Environment Variables**:
   - `NEXTAUTH_SECRET` → gere com `openssl rand -base64 32`
   - `NEXTAUTH_URL` → `https://sistema-avali-projetos.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy! 🚀

> **Nota:** O `vercel.json` foi simplificado para evitar erros de "Secrets legados". As variáveis são lidas diretamente do painel da Vercel.

---

## 🔐 Roles e Rotas

| Role | Rotas | Acesso |
|---|---|---|
| `admin` | `/admin/*` | Dashboard, Professores, Equipes, Projetos, **Avaliações** |
| `professor` | `/professor/*` | Lista de projetos, Avaliação individual por aluno |

---

## 📱 Funcionalidades Completas

### 👑 Admin
- ✅ Dashboard com 5 métricas
- ✅ CRUD professores
- ✅ CRUD equipes + alunos (foto 3x4)
- ✅ CRUD projetos + upload de arquivos
- ✅ **Gestão de Avaliações**: listar por projeto, filtrar por professor, deletar

### 👨‍🏫 Professor
- ✅ Lista de projetos com filtros (todos/pendentes/avaliados)
- ✅ **Avaliação Individual**: clica na foto do aluno → modal de avaliação
- ✅ Sliders com step 0,1 (precisão centesimal)
- ✅ Descrições pedagógicas dos 5 eixos (toggle ℹ️)
- ✅ Nota média calculada em tempo real
- ✅ Comentário individual por aluno
- ✅ Progresso visual da equipe (barra + contadores)
- ✅ Edição de avaliações já enviadas

---

## 🐛 Problemas Conhecidos e Soluções

| Problema | Solução |
|---|---|
| Erro "Secrets legados" no Vercel | `vercel.json` foi simplificado sem `env` |
| Refresh automático na aba do Professor | Corrigido com `useRef` flag anti-re-fetch |
| Hydration mismatch no dark mode | `suppressHydrationWarning` no `<html>` |
| bcryptjs no Edge Runtime | `serverComponentsExternalPackages: ['bcryptjs']` no `next.config.js` |
