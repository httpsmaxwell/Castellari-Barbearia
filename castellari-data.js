const CATALOG_VERSION = 5;

const SERVICES = [
  // Cabelo
  { id: 'corte-tradicional', category: 'Cortes', name: 'Corte', price: 50, clubPrice: 45, duration: 40, includesCut: true, featured: true, badge: 'Em alta', desc: 'Corte personalizado clássico ou moderno com finalização alinhada.' },
  { id: 'corte-novo', category: 'Cortes', name: 'Corte Premium (Clientes Novos)', price: 45, clubPrice: 45, duration: 45, includesCut: true, featured: true, badge: 'Promoção', desc: 'Corte personalizado + lavagem e finalização especial para clientes novos.' },
  { id: 'corte-infantil', category: 'Cortes', name: 'Corte Infantil', price: 60, clubPrice: 54, duration: 40, includesCut: true, desc: 'Atendimento cuidadoso e estilizado para crianças.' },
  { id: 'corte-feminino', category: 'Cortes', name: 'Corte Feminino', price: 70, clubPrice: 63, duration: 60, includesCut: true, desc: 'Corte técnico e finalização personalizada.' },
  { id: 'terapia-capilar', category: 'Cortes', name: 'Terapia Capilar', price: 70, clubPrice: 63, duration: 40, includesCut: false, desc: 'Tratamento intensivo de revitalização do couro cabeludo e fios.' },
  { id: 'alinhamento-capilar', category: 'Cortes', name: 'Alinhamento Capilar', price: 160, clubPrice: 144, duration: 60, includesCut: false, desc: 'Redução de volume e controle de frizz com alinhamento dos fios.' },
  { id: 'pintura-capilar', category: 'Cortes', name: 'Pintura', price: 130, clubPrice: 117, duration: 50, includesCut: false, desc: 'Cobertura homogênea ou revitalização da cor capilar.' },
  { id: 'luzes', category: 'Cortes', name: 'Luzes', price: 150, clubPrice: 135, duration: 90, includesCut: false, desc: 'Mechas e iluminação com técnica profissional.' },
  { id: 'platinado-descoloracao', category: 'Cortes', name: 'Platinado / Descoloração', price: 170, clubPrice: 153, duration: 120, includesCut: false, desc: 'Descoloração global com proteção e matização dos fios.' },

  // Combos Oficiais
  { id: 'combo-1-experiencia-completa', category: 'Combos', name: 'Combo Experiência Completa', price: 250, originalPrice: 300, clubPrice: 225, duration: 90, includesCut: true, featured: true, badge: 'Mais pedido', desc: 'Corte + Barba + Terapia Capilar + Sobrancelha + Limpeza de Pele + Depilação na Cera.' },
  { id: 'combo-2-premium', category: 'Combos', name: 'Combo Premium', price: 210, originalPrice: 250, clubPrice: 189, duration: 75, includesCut: true, featured: true, desc: 'Corte + Barba + Hidratação + Sobrancelha + Limpeza de Pele.' },
  { id: 'combo-3-cuidado-total', category: 'Combos', name: 'Combo Cuidado Total', price: 210, originalPrice: 240, clubPrice: 189, duration: 75, includesCut: true, desc: 'Corte + Terapia Capilar + Terapia Facial.' },
  { id: 'combo-4-essencial', category: 'Combos', name: 'Combo Essencial', price: 160, originalPrice: 180, clubPrice: 144, duration: 60, includesCut: true, featured: true, desc: 'Corte + Barboterapia + Hidratação.' },
  { id: 'combo-5-pele-em-dia', category: 'Combos', name: 'Combo Pele em Dia', price: 160, originalPrice: 180, clubPrice: 144, duration: 60, includesCut: true, desc: 'Corte + Barboterapia + Limpeza de Pele.' },
  { id: 'combo-6-visual-completo', category: 'Combos', name: 'Combo Visual Completo', price: 130, originalPrice: 150, clubPrice: 117, duration: 60, includesCut: true, desc: 'Corte + Barba + Sobrancelha.' },
  { id: 'combo-7-rapido-eficiente', category: 'Combos', name: 'Combo Rápido e Eficiente', price: 100, originalPrice: 120, clubPrice: 90, duration: 45, includesCut: true, desc: 'Corte + Hidratação + Sobrancelha.' },
  { id: 'combo-corte-hidra-barboterapia', category: 'Combos', name: 'Combo Corte + Hidratação + Barboterapia', price: 160, clubPrice: 144, duration: 75, includesCut: true, desc: 'Corte alinhado, hidratação profunda e barboterapia relaxante.' },
  { id: 'combo-terapia-facial-cera', category: 'Combos', name: 'Combo Terapia Facial + Depilação na Cera', price: 150, clubPrice: 135, duration: 60, includesCut: false, desc: 'Tratamento facial completo com depilação na cera (nariz ou ouvido).' },
  { id: 'combo-corte-barboterapia', category: 'Combos', name: 'Combo Corte + Barboterapia', price: 120, clubPrice: 108, duration: 60, includesCut: true, desc: 'Alinhamento completo do corte com a experiência de barboterapia.' },

  // Barba
  { id: 'barba-tradicional', category: 'Barba & Terapias', name: 'Barba', price: 50, clubPrice: 45, duration: 35, includesCut: false, featured: true, desc: 'Modelagem, toalha morna e finalização com balm hidratante.' },
  { id: 'barboterapia', category: 'Barba & Terapias', name: 'Barboterapia', price: 80, clubPrice: 72, duration: 45, includesCut: false, featured: true, badge: 'Destaque', desc: 'Ritual clássico com toalha quente, ozonioterapia, massagem e navalha.' },
  { id: 'pigmentacao-barba', category: 'Barba & Terapias', name: 'Pigmentação de Barba', price: 50, clubPrice: 45, duration: 30, includesCut: false, desc: 'Preenchimento e definição harmônica dos contornos da barba.' },

  // Pele & Estética
  { id: 'terapia-facial-cravos', category: 'Pele & Estética', name: 'Terapia Facial + Extração de Cravos', price: 120, clubPrice: 108, duration: 50, includesCut: false, desc: 'Limpeza profunda com esfoliação, vapor e extração de impurezas.' },
  { id: 'esfoliacao-mascara-black', category: 'Pele & Estética', name: 'Esfoliação e Máscara Black', price: 50, clubPrice: 45, duration: 30, includesCut: false, desc: 'Remoção de células mortas, renovação e controle de oleosidade.' },
  { id: 'combo-depilacao-cera', category: 'Pele & Estética', name: 'Combo Depilação na Cera (Nariz e Ouvido)', price: 50, clubPrice: 45, duration: 25, includesCut: false, desc: 'Depilação higiênica e rápida nas duas regiões.' },
  { id: 'depilacao-cera-avulsa', category: 'Pele & Estética', name: 'Depilação na Cera (Nariz ou Ouvido)', price: 30, clubPrice: 27, duration: 15, includesCut: false, desc: 'Remoção rápida, segura e confortável.' },
  { id: 'sobrancelha-limpeza', category: 'Pele & Estética', name: 'Limpeza de Sobrancelha', price: 20, clubPrice: 18, duration: 15, includesCut: false, desc: 'Alinhamento preciso e natural na pinça ou lâmina.' },

  // Demais & Serviços Especiais
  { id: 'consultoria-visagismo', category: 'Serviços Especiais', name: 'Consultoria de Imagem (Visagismo)', price: 200, clubPrice: 180, duration: 60, includesCut: true, badge: 'Novo', featured: true, desc: 'Análise morfológica de rosto e estilo para definir corte e barba ideais.' },
  { id: 'dia-noivo-vip', category: 'Serviços Especiais', name: 'Dia do Noivo VIP', price: 500, clubPrice: 450, duration: 150, includesCut: true, badge: 'Exclusivo', desc: 'Atendimento reservado com corte, barboterapia, terapias faciais e relaxamento.' },
  { id: 'padrinho-vip', category: 'Serviços Especiais', name: 'Padrinho VIP', price: 300, clubPrice: 270, duration: 90, includesCut: true, desc: 'Cuidado estético completo para celebrar em grande estilo.' },
  { id: 'nanopigmentacao-barba', category: 'Serviços Especiais', name: 'Nanopigmentação de Barba', price: 600, clubPrice: 540, duration: 90, includesCut: false, desc: 'Preenchimento duradouro com micropigmentação fio a fio.' },
  { id: 'protese-capilar-aplicacao', category: 'Serviços Especiais', name: 'Aplicação de Prótese Capilar', price: 2500, clubPrice: 2250, duration: 180, includesCut: true, desc: 'Fixação, corte, personalização e acabamento natural de prótese.' },
  { id: 'protese-capilar-manutencao', category: 'Serviços Especiais', name: 'Manutenção de Prótese Capilar', price: 150, clubPrice: 135, duration: 60, includesCut: false, desc: 'Higienização, troca de adesivos e alinhamento da peça.' }
];

const PLANS = [
  {
    id: 'vip-corte-barboterapia',
    name: 'VIP - Corte + Barboterapia',
    price: 250,
    badge: 'Mais vendido',
    badgeType: 'gold',
    slots: 7,
    days: 'Segunda a Sábado',
    gift: 'Boné Exclusivo da Barbearia',
    discount: '15% OFF em Serviços Extras e Produtos',
    benefits: [
      'Cortes de cabelo à vontade (Seg a Sáb)',
      'Barboterapia completa à vontade',
      'Hidratação capilar inclusa',
      'Limpeza de sobrancelha inclusa',
      '15% OFF em produtos e serviços extras',
      'Boné Exclusivo Castellari de brinde na adesão',
    ],
  },
  {
    id: 'vip-corte',
    name: 'VIP - Corte',
    price: 150,
    badge: 'Destaque VIP',
    badgeType: 'gold',
    slots: 3,
    days: 'Segunda a Sábado',
    gift: 'Boné Exclusivo da Barbearia',
    discount: '15% OFF em Serviços Extras e Produtos',
    benefits: [
      'Cortes de cabelo à vontade (Seg a Sáb)',
      'Hidratação capilar inclusa',
      'Limpeza de sobrancelha inclusa',
      '15% OFF em produtos e serviços extras',
      'Boné Exclusivo Castellari de brinde na adesão',
    ],
  },
  {
    id: 'essencial-corte-barba',
    name: 'ESSENCIAL - Corte + Barba',
    price: 180,
    badge: 'Alta procura',
    badgeType: 'gold',
    slots: 5,
    days: 'Segunda a Sábado',
    discount: '10% OFF em Serviços Extras e Produtos',
    benefits: [
      'Cortes de cabelo de Segunda a Sábado',
      'Barba alinhada de Segunda a Sábado',
      '10% OFF em serviços extras e produtos',
      'Atendimento flexível com a equipe',
    ],
  },
  {
    id: 'essencial-corte',
    name: 'ESSENCIAL - Corte',
    price: 100,
    badge: null,
    slots: 10,
    days: 'Segunda a Sábado',
    discount: '10% OFF em Serviços Extras e Produtos',
    benefits: [
      'Cortes de cabelo de Segunda a Sábado',
      '10% OFF em serviços extras e produtos',
      'Excelente custo-benefício mensal',
      'Atendimento no padrão Castellari',
    ],
  },
  {
    id: 'promocional-corte-barba',
    name: 'PROMOCIONAL - Corte + Barba',
    price: 150,
    badge: 'Economia',
    badgeType: 'promo',
    slots: 6,
    days: 'Segunda a Quinta',
    discount: '10% OFF em Serviços Extras e Produtos',
    benefits: [
      'Corte + Barba de Segunda a Quinta',
      'Ideal para quem cuida do visual na semana',
      '10% OFF em serviços extras e produtos',
      'Sem fidelidade ou carência',
    ],
  },
  {
    id: 'promocional-corte',
    name: 'PROMOCIONAL - Corte',
    price: 70,
    badge: 'Mais acessível',
    badgeType: 'promo',
    slots: 3,
    days: 'Segunda a Quinta',
    discount: '10% OFF em Serviços Extras e Produtos',
    benefits: [
      'Cortes de Segunda a Quinta',
      'O plano mais econômico do Clube Castellari',
      '10% OFF em serviços extras e produtos',
      'Sem taxa de adesão',
    ],
  },
];

const BARBERS = [
  { id: 'raquel', name: 'Raquel', initials: 'RQ', featured: true, role: 'Master Barber', photo: 'img/equipe/raquel.jpg' },
  { id: 'lucas', name: 'Lucas', initials: 'LC', featured: false, role: 'Barbeiro Clássico', photo: 'img/equipe/lucas.jpg' },
  { id: 'felipe', name: 'Felipe', initials: 'FL', featured: false, role: 'Especialista Barba', photo: 'img/equipe/felipe.jpg' },
  { id: 'ana-clara', name: 'Ana Clara', initials: 'AC', featured: false, role: 'Visagismo & Corte', photo: 'img/equipe/ana-clara.jpg' },
  { id: 'lucas-alfaia', name: 'Lucas Alfaia', initials: 'LA', featured: false, role: 'Degradê & Acabamento', photo: 'img/equipe/lucas-alfaia.jpg' },
  { id: 'gabriel', name: 'Gabriel', initials: 'GB', featured: false, role: 'Barbeiro', photo: 'img/equipe/gabriel.jpg' },
  { id: 'sem-preferencia', name: 'Sem preferência', initials: '★', featured: false, role: 'Primeiro disponível', photo: null },
];

const SHOP_INFO = {
  name: 'Barbearia Castellari',
  tagline: 'Classic Italian',
  phone: '+55 92 8580-3578',
  phoneRaw: '559285803578',
  phoneDisplay: '(92) 8580-3578',
  email: 'barbeariacastellari@gmail.com',
  address: 'Avenida Desembargador João Machado, 15B',
  neighborhood: 'Planalto',
  city: 'Manaus',
  state: 'AM',
  zip: '69044-000',
  fullAddress: 'Avenida Desembargador João Machado, 15B - Planalto, Manaus - AM, 69044-000',
  hours: 'Segunda a Sábado, das 09:00 às 20:00',
  hoursShort: 'Seg. a sáb. · 09h às 20h',
  instagram: 'castellaribarbearia',
  instagramUrl: 'https://instagram.com/castellaribarbearia',
  facebook: 'castellaribarbearia',
  whatsappUrl: 'https://wa.me/559285803578',
};

window.CastellariData = { SERVICES, PLANS, BARBERS, SHOP_INFO, CATALOG_VERSION };
