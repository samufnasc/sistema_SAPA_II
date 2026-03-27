const bcrypt = require('bcryptjs');
async function test() {
  const hash = await bcrypt.hash('Admin@2024!', 12);
  console.log("Copie este hash e cole no seu SQL do Supabase:");
  console.log(hash);
}
test();