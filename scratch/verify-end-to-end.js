const base = 'http://localhost:4001/api';

(async () => {
  const loginRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: 'testuser2@example.com',
      password: 'Secret123!'
    })
  });

  const loginData = await loginRes.json();
  console.log('LOGIN_STATUS', loginRes.status);
  console.log(JSON.stringify(loginData));

  if (!loginData.token) {
    throw new Error('No token returned');
  }

  const token = loginData.token;
  const requestRes = await fetch(base + '/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      category_id: 1,
      title: 'Panne batterie - test app',
      description: 'La voiture ne démarre pas à Cocody. Batterie à plat.',
      breakdown_type: 'battery',
      vehicle_type: 'Berline',
      vehicle_brand: 'Toyota',
      city: 'Abidjan',
      district: 'Cocody',
      urgency: 'high'
    })
  });

  const requestData = await requestRes.json();
  console.log('REQUEST_STATUS', requestRes.status);
  console.log(JSON.stringify(requestData));
})();
