// Script para criar o usuário admin padrão no Supabase
// Execute: node scripts/seed-admin.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🌱 Criando usuário admin padrão...');

  const email = 'admin@avalia.proj';
  const password = 'Admin@2024!';
  const nome = 'Administrador';

  // Verifica se já existe
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log('⚠️  Usuário admin já existe. Pulando criação.');
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash, nome, role: 'admin' })
    .select('id, email, nome, role')
    .single();

  if (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin criado com sucesso!');
  console.log('');
  console.log('  📧 E-mail:', email);
  console.log('  🔑 Senha:', password);
  console.log('  🆔 ID:', data.id);
  console.log('');
  console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
}

main();
