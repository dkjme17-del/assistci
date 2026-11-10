const base = 'http://localhost:4001/api';
const unique = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
let failures = 0;

async function call(path, method = 'GET', body = null, token = null) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(label, cond, extra = '') {
  if (cond) {
    console.log(`  OK  ${label}${extra ? ' — ' + extra : ''}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`);
  }
}

(async () => {
  console.log('1. Inscription prestataire');
  const provReg = await call('/auth/register', 'POST', {
    first_name: 'Presta', last_name: `P{$unique}`,
    email: `presta${unique}@assistci.ci`, phone: `+22505${unique.slice(-8)}`,
    password: 'Password123!', role: 'provider', business_name: 'Garage Espoir',
  });
  check('prestataire 201', provReg.status === 201, `status=${provReg.status}`);

  console.log('2. Inscription client');
  const cliReg = await call('/auth/register', 'POST', {
    first_name: 'Client', last_name: `C{$unique}`,
    email: `client${unique}@assistci.ci`, phone: `+22507${unique.slice(-8)}`,
    password: 'Password123!', role: 'client',
  });
  check('client 201', cliReg.status === 201, `status=${cliReg.status}`);

  const provToken = provReg.data.token;
  const cliToken = cliReg.data.token;

  console.log('3. Catégories');
  const cats = await call('/services/categories');
  const catList = Array.isArray(cats.data) ? cats.data : cats.data.categories;
  const auto = catList && catList.find((c) => c.slug === 'auto');
  check('catégorie auto trouvée', !!auto, auto ? `id=${auto.id}` : JSON.stringify(cats.data).slice(0, 80));

  console.log('4. Création de demande (IA hors-ligne => repli)');
  const reqRes = await call('/requests', 'POST', {
    category_id: auto.id,
    title: 'Panne de batterie Cocody',
    description: 'Ma voiture ne démarre plus, batterie à plat, je suis au bord de la route à Cocody',
    district: 'Cocody',
  }, cliToken);
  const requestId = reqRes.data.request && reqRes.data.request.id;
  check('demande 201', reqRes.status === 201 && requestId, `id=${requestId}`);
  check('urgence par défaut normal', reqRes.data.request && reqRes.data.request.urgency === 'normal');

  console.log('5. Proposition du prestataire');
  const prop = await call(`/requests/${requestId}/proposals`, 'POST', {
    proposed_price: 15000,
    estimated_arrival_minutes: 30,
    message: 'Je peux être là dans 30 minutes',
  }, provToken);
  const proposalId = prop.data.proposal && prop.data.proposal.id;
  check('proposition 201', prop.status === 201 && proposalId, `id=${proposalId}`);

  console.log('6. Acceptation par le client');
  const acc = await call(`/requests/proposals/${proposalId}/accept`, 'POST', {}, cliToken);
  check('acceptation 200', acc.status === 200, `status=${acc.status} ${acc.data.message || ''}`);

  console.log('7. Intervention : in_progress puis completed');
  const prog = await call(`/requests/${requestId}/status`, 'PATCH', { status: 'in_progress' }, provToken);
  const done = await call(`/requests/${requestId}/status`, 'PATCH', { status: 'completed' }, provToken);
  check('in_progress 200', prog.status === 200, `status=${prog.status}`);
  check('completed 200', done.status === 200 && done.data.request.status === 'completed', `status=${done.status}`);

  console.log('8. Notifications client');
  const notif = await call('/notifications', 'GET', null, cliToken);
  const n = Array.isArray(notif.data) ? notif.data : notif.data.notifications;
  check('notifications OK', notif.status === 200 && Array.isArray(n), `count=${Array.isArray(n) ? n.length : '?'}`);

  console.log('9. Transaction (cash)');
  const tx = await call('/transactions', 'POST', {
    request_id: requestId,
    amount: 15000,
    payment_method: 'cash',
    transaction_reference: `REF-${unique}`,
  }, cliToken);
  check('transaction 201', tx.status === 201 || tx.status === 200, `status=${tx.status}`);

  console.log('10. Avis client');
  const rev = await call('/reviews', 'POST', {
    request_id: requestId,
    rating: 5,
    comment: 'Intervention rapide et efficace',
  }, cliToken);
  check('avis 201', rev.status === 201, `status=${rev.status} ${rev.data.message || ''}`);

  console.log('11. Admin stats (admin seed)');
  const adm = await call('/auth/login', 'POST', { login: 'admin@assistci.ci', password: 'Admin123!' });
  const adminToken = adm.data.token;
  check('login admin', adm.status === 200 && adminToken, `status=${adm.status}`);
  const stats = await call('/admin/stats', 'GET', null, adminToken);
  check('stats admin 200', stats.status === 200, `status=${stats.status}`);

  console.log('\nRésultat:', failures === 0 ? 'TOUT EST VERT ✔' : `${failures} ÉCHECS ✘`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Erreur inattendue:', e.message);
  process.exit(1);
});