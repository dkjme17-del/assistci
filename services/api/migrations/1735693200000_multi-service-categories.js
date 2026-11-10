// Élargit le catalogue de services : ASSISTCI devient une plateforme
// multi-services (services à la maison, artisanat, etc.) tout en conservant
// l'assistance automobile comme une catégorie parmi d'autres.
// Idempotent : réutilisable sur les bases existantes.

const CATEGORIES = [
  ['Assistance Automobile', 'auto', 'Dépannage, remorquage, mécanique d urgence, batterie et crevaison à Abidjan', 'car'],
  ['Plomberie', 'plomberie', 'Réparation de fuites, débouchage et dépannage plomberie', 'droplets'],
  ['Électricité', 'electricite', 'Court-circuit, installation et dépannage électrique', 'zap'],
  ['Climatisation & Froid', 'climatisation', 'Installation, entretien et réparation de climatiseurs et frigos', 'snowflake'],
  ['Ménage & Nettoyage', 'menage', 'Nettoyage de maison, bureaux et remise en état', 'sparkles'],
  ['Jardinage & Espaces verts', 'jardinage', 'Tonte, élagage, entretien de jardins et espaces verts', 'trees'],
  ['Bricolage & Petits travaux', 'bricolage', 'Montage de meubles, fixations, petites réparations', 'hammer'],
  ['Peinture & Rénovation', 'peinture', 'Peinture intérieure/extérieure et travaux de finition', 'paint-roller'],
  ['Menuiserie & Serrurerie', 'menuiserie', 'Portes, fenêtres, serrures et réparations bois', 'door-open'],
  ['Déménagement & Manutention', 'demenagement', 'Transport de meubles, chargement et manutention', 'truck'],
  ['Informatique & Réseaux', 'informatique', 'Réparation d’ordinateurs, installation et dépannage réseau', 'laptop'],
  ['Électroménager', 'electromenager', 'Réparation de machines à laver, réfrigérateurs et appareils', 'washing-machine'],
  ['Sécurité & Gardiennage', 'securite', 'Installation de caméras, alarmes et services de sécurité', 'shield'],
  ['Beauté & Bien-être', 'beaute', 'Coiffure, esthétique et soins à domicile', 'scissors'],
  ['Cours & Soutien scolaire', 'cours', 'Cours particuliers et soutien scolaire à domicile', 'graduation-cap'],
];

exports.up = (pgm) => {
  // Ancien slug 'froid' -> 'climatisation'
  pgm.sql(`UPDATE service_categories SET slug = 'climatisation' WHERE slug = 'froid';`);

  const esc = (s) => s.replace(/'/g, "''");
  for (const [name, slug, description, icon] of CATEGORIES) {
    pgm.sql(
      `INSERT INTO service_categories (name, slug, description, icon_name)
       VALUES ('${esc(name)}', '${esc(slug)}', '${esc(description)}', '${esc(icon)}')
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             icon_name = EXCLUDED.icon_name;`
    );
  }
};

exports.down = (pgm) => {
  const added = CATEGORIES.map((c) => c[1]).filter(
    (slug) => !['auto', 'plomberie', 'electricite'].includes(slug)
  );
  pgm.sql(
    `DELETE FROM service_categories WHERE slug IN (${added
      .map((s) => `'${s}'`)
      .join(', ')});`
  );
};