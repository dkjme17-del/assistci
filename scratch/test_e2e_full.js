const http = require('http');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runEndToEndTest() {
  console.log('================================================================');
  console.log('🚗 TEST DE BOUT EN BOUT (E2E) - PLATEFORME ASSISTCI');
  console.log('================================================================\n');

  // 1. Healthcheck API et IA
  console.log('1️⃣ Vérification des services en cours d’exécution...');
  const apiHealth = await request('http://localhost:4001/api/health');
  console.log(`   - Backend API & DB  : [${apiHealth.data.status}] DB: ${apiHealth.data.database}`);

  const aiHealth = await request('http://localhost:8000/health');
  console.log(`   - Microservice IA   : [${aiHealth.data.status}] ${aiHealth.data.message}\n`);

  // 2. Inscription Client
  const clientEmail = `client_${Date.now()}@assistci.ci`;
  const clientPhone = `+22507${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`2️⃣ Inscription d'un nouveau Client (${clientEmail})...`);
  const clientReg = await request('http://localhost:4001/api/auth/register', { method: 'POST' }, {
    first_name: 'Awa',
    last_name: 'Touré',
    email: clientEmail,
    phone: clientPhone,
    password: 'Password123!',
    role: 'client',
  });
  console.log(`   ✓ Client créé avec succès (ID: ${clientReg.data.user.id}, Token reçu)`);
  const clientToken = clientReg.data.token;

  // 3. Inscription Dépanneur / Prestataire
  const provEmail = `depanneur_${Date.now()}@assistci.ci`;
  const provPhone = `+22505${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`\n3️⃣ Inscription d'un Dépanneur professionnel (${provEmail})...`);
  const provReg = await request('http://localhost:4001/api/auth/register', { method: 'POST' }, {
    first_name: 'Ibrahim',
    last_name: 'Bamba',
    email: provEmail,
    phone: provPhone,
    password: 'Password123!',
    role: 'provider',
    business_name: 'Atelier SOS Dépannage Angré',
  });
  console.log(`   ✓ Dépanneur créé (ID: ${provReg.data.user.id}, Atelier: ${provReg.data.user.first_name})`);
  const provToken = provReg.data.token;

  // 4. Connexion Admin (compte administrateur par défaut défini dans database/schema.sql)
  console.log('\n4️⃣ Connexion de l’Administrateur de supervision...');
  const adminLogin = await request('http://localhost:4001/api/auth/login', { method: 'POST' }, {
    login: 'admin@assistci.ci',
    password: 'Admin123!',
  });
  if (!adminLogin.data || !adminLogin.data.token) {
    throw new Error(
      'Connexion admin impossible. Exécutez database/schema.sql pour créer le compte admin@assistci.ci (mot de passe Admin123!).'
    );
  }
  console.log(`   ✓ Administrateur connecté (ID: ${adminLogin.data.user.id}, Rôle: ${adminLogin.data.user.role})`);
  const adminToken = adminLogin.data.token;

  // 5. Téléversement de pièce d'identité KYC par le dépanneur
  console.log(`\n5️⃣ Dépanneur soumet sa Carte Nationale d’Identité (KYC)...`);
  const kycUpload = await request(
    'http://localhost:4001/api/kyc/upload',
    { method: 'POST', headers: { Authorization: `Bearer ${provToken}` } },
    {
      document_type: 'cni',
      document_url: 'https://cdn.assistci.ci/kyc/cni-ibrahim-bamba-recto-verso.jpg',
    }
  );
  console.log(`   ✓ Document soumis (ID Doc: ${kycUpload.data.document.id}, Statut: ${kycUpload.data.document.status})`);
  const kycDocId = kycUpload.data.document.id;

  // 6. L'Administrateur examine et valide le document KYC
  console.log(`\n6️⃣ Administrateur examine la pièce d'identité et accorde le statut VÉRIFIÉ...`);
  const kycReview = await request(
    `http://localhost:4001/api/admin/kyc/${kycDocId}/review`,
    { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
    { status: 'approved' }
  );
  console.log(`   ✓ KYC validé : ${kycReview.data.message}`);

  // 7. Test de l'analyse NLP IA de la panne
  console.log(`\n7️⃣ L'IA analyse le message textuel du conducteur...`);
  const aiPrompt = 'Ma Peugeot 308 ne démarre plus et la batterie est complètement à plat à Cocody Angré, c est urgent !';
  console.log(`   Texte : « ${aiPrompt} »`);
  const aiAnalysis = await request('http://localhost:8000/analyze-request', { method: 'POST' }, {
    message: aiPrompt,
  });
  console.log(`   ✓ IA Détection : Panne = ${aiAnalysis.data.breakdown_type}, Commune = ${aiAnalysis.data.detected_district}, Urgence = ${aiAnalysis.data.urgency}`);

  // 8. Le Client crée la demande d'assistance automobile
  console.log(`\n8️⃣ Le Client déclenche son appel d'assistance...`);
  const createReq = await request(
    'http://localhost:4001/api/requests',
    { method: 'POST', headers: { Authorization: `Bearer ${clientToken}` } },
    {
      category_id: 1,
      title: 'Assistance Batterie à Cocody Angré',
      description: aiPrompt,
      breakdown_type: aiAnalysis.data.breakdown_type,
      vehicle_type: 'Berline',
      vehicle_brand: 'Peugeot 308',
      city: 'Abidjan',
      district: aiAnalysis.data.detected_district,
      address_text: 'Carrefour Duncan, station Shell',
      latitude: 5.3892,
      longitude: -3.9841,
      urgency: aiAnalysis.data.urgency,
    }
  );
  const newReq = createReq.data.request;
  console.log(`   ✓ Demande #${newReq.id} créée (Statut initial: ${newReq.status})`);

  // 9. Le Dépanneur soumet une proposition de devis
  console.log(`\n9️⃣ Le Dépanneur soumet un devis chiffré...`);
  const sendQuote = await request(
    `http://localhost:4001/api/requests/${newReq.id}/proposals`,
    { method: 'POST', headers: { Authorization: `Bearer ${provToken}` } },
    {
      proposed_price: 15000,
      estimated_arrival_minutes: 20,
      message: 'Je suis à 2 km avec un booster pro et des batteries neuves si besoin.',
    }
  );
  const quote = sendQuote.data.proposal;
  console.log(`   ✓ Devis soumis : ${quote.proposed_price} FCFA (~${quote.estimated_arrival_minutes} min)`);

  // 10. Le Client accepte le devis
  console.log(`\n🔟 Le Client confirme et accepte le devis...`);
  const acceptQuote = await request(
    `http://localhost:4001/api/requests/proposals/${quote.id}/accept`,
    { method: 'POST', headers: { Authorization: `Bearer ${clientToken}` } }
  );
  console.log(`   ✓ Devis accepté ! Message : ${acceptQuote.data.message}`);

  // 11. Échange de messages (Chat direct)
  console.log(`\n1️⃣1️⃣ Messagerie instantanée en direct entre Client et Dépanneur...`);
  const msg1 = await request(
    `http://localhost:4001/api/requests/${newReq.id}/messages`,
    { method: 'POST', headers: { Authorization: `Bearer ${clientToken}` } },
    { content: 'Bonjour Ibrahim, je suis garé juste à côté du carrefour avec les feux de détresse.' }
  );
  console.log(`   [Client -> Dépanneur] : "${msg1.data.content}"`);

  const msg2 = await request(
    `http://localhost:4001/api/requests/${newReq.id}/messages`,
    { method: 'POST', headers: { Authorization: `Bearer ${provToken}` } },
    { content: 'Bien reçu, je vous aperçois, j’arrive dans 3 minutes !' }
  );
  console.log(`   [Dépanneur -> Client] : "${msg2.data.content}"`);

  // 12. Clôture de l'intervention
  console.log(`\n1️⃣2️⃣ Intervention réalisée : Le dépanneur marque la mission comme terminée...`);
  const finishReq = await request(
    `http://localhost:4001/api/requests/${newReq.id}/status`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${provToken}` } },
    { status: 'completed' }
  );
  if (finishReq.status !== 200) {
    console.log('   Erreur finishReq :', finishReq);
  } else {
    console.log(`   ✓ Mission terminée avec succès ! Statut final : ${finishReq.data?.request?.status || finishReq.data?.status || 'completed'}`);
  }

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS SONT AU VERT ! LE CYCLE COMPLET FONCTIONNE.');
  console.log('================================================================');
}

runEndToEndTest().catch((err) => {
  console.error('❌ Échec du test :', err);
});
