const CATALOG_VERSION = 3;

const SERVICES = [
  // Cortes
  { id: 'corte-novo', category: 'Cortes', name: 'Corte Premium (Clientes Novos)', price: 45, duration: 45, includesCut: true, featured: true, badge: 'Em alta', desc: 'Corte personalizado + lavagem e finalização para novos clientes.' },
  { id: 'corte-premium', category: 'Cortes', name: 'Corte Premium', price: 50, duration: 45, includesCut: true, featured: true, desc: 'Corte clássico ou moderno com acabamento na navalha e lavagem.' },
  { id: 'corte-infantil', category: 'Cortes', name: 'Corte Infantil', price: 60, duration: 40, includesCut: true, desc: 'Atendimento cuidadoso e estilizado para crianças.' },
  { id: 'corte-feminino', category: 'Cortes', name: 'Corte Feminino', price: 70, duration: 60, includesCut: true, desc: 'Corte técnico e finalização personalizada.' },
  { id: 'pezinho', category: 'Cortes', name: 'Pezinho', price: 25, duration: 15, includesCut: false, desc: 'Acabamento preciso nos contornos e nuca.' },

  // Combos
  { id: 'combo-exp', category: 'Combos', name: 'COMBO Experiência Completa', price: 250, duration: 90, includesCut: true, featured: true, badge: 'Em alta', desc: 'Corte Premium + Barboterapia completa + Hidratação e cuidados faciais.' },
  { id: 'combo-premium', category: 'Combos', name: 'COMBO Premium', price: 210, duration: 75, includesCut: true, featured: true, desc: 'Corte Premium + Barboterapia com toalha quente e finalização.' },
  { id: 'combo-total', category: 'Combos', name: 'Combo Cuidado Total', price: 210, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha e cuidados faciais essenciais.' },
  { id: 'combo-essencial', category: 'Combos', name: 'Combo Essencial', price: 160, duration: 60, includesCut: true, featured: true, desc: 'Corte + Barba Completa alinhada na navalha.' },
  { id: 'combo-corte-hidra-barba', category: 'Combos', name: 'COMBO Corte + Hidratação + Barboterapia', price: 160, duration: 75, includesCut: true, desc: 'Corte Premium combinado com hidratação capilar e barboterapia.' },
  { id: 'combo-pele', category: 'Combos', name: 'Combo Pele em Dia', price: 160, duration: 60, includesCut: true, desc: 'Corte + cuidados faciais para limpeza e renovação da pele.' },
  { id: 'combo-facial-cera', category: 'Combos', name: 'COMBO Terapia Facial + Depilação na Cera (Nariz e Ouvido)', price: 150, duration: 60, includesCut: false, desc: 'Cuidado estético facial completo com extração e depilação.' },
  { id: 'combo-visual', category: 'Combos', name: 'Combo Visual Completo', price: 130, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha + Limpeza facial.' },
  { id: 'combo-rapido', category: 'Combos', name: 'Combo Rápido e Eficiente', price: 100, duration: 50, includesCut: true, desc: 'Agilidade sem abrir mão do padrão Castellari.' },

  // Barba & Terapias
  { id: 'barboterapia', category: 'Barba & Terapias', name: 'Barboterapia', price: 80, duration: 45, includesCut: false, featured: true, desc: 'Toalha quente, massagem facial, óleos essenciais e navalha.' },
  { id: 'barba-completa', category: 'Barba & Terapias', name: 'Barba Completa', price: 50, duration: 35, includesCut: false, featured: true, desc: 'Modelagem, alinhamento e hidratação pós-barba.' },
  { id: 'terapia-capilar', category: 'Barba & Terapias', name: 'Terapia Capilar (Bálsamo + Shampoo Deep Ice)', price: 70, duration: 40, includesCut: false, desc: 'Refrescância profunda e revitalização do couro cabeludo.' },
  { id: 'terapia-facial', category: 'Barba & Terapias', name: 'Terapia Facial com Extração de Cravos', price: 120, duration: 50, includesCut: false, desc: 'Limpeza profunda de poros e revitalização da pele.' },
  { id: 'hidratacao-capilar', category: 'Barba & Terapias', name: 'Hidratação Capilar', price: 50, duration: 30, includesCut: false, desc: 'Nutrição e maciez imediata para cabelos ressecados.' },
  { id: 'esfoliacao-facial', category: 'Barba & Terapias', name: 'Esfoliação Facial Anti Oleosidade', price: 50, duration: 30, includesCut: false, desc: 'Controle de oleosidade e renovação celular.' },
  { id: 'pigmentacao-barba', category: 'Barba & Terapias', name: 'Pigmentação de Barba', price: 50, duration: 30, includesCut: false, desc: 'Preenchimento visual e definição de contorno.' },
  { id: 'micropigmentacao', category: 'Barba & Terapias', name: 'Preenchimento de Barba (Micro Pigmentação)', price: 450, duration: 90, includesCut: false, pricePrefix: 'A partir de ', desc: 'Técnica de longa duração para falhas na barba.' },

  // Estética & Química
  { id: 'sobrancelha', category: 'Estética & Química', name: 'Sobrancelha (limpeza)', price: 20, duration: 20, includesCut: false, featured: true, desc: 'Limpeza e alinhamento natural na pinça ou navalha.' },
  { id: 'cera-nariz', category: 'Estética & Química', name: 'Depilação na Cera (Nariz)', price: 30, duration: 15, includesCut: false, desc: 'Remoção rápida, higiênica e confortável.' },
  { id: 'cera-ouvido', category: 'Estética & Química', name: 'Depilação na Cera (Ouvido)', price: 30, duration: 15, includesCut: false, desc: 'Acabamento limpo e seguro.' },
  { id: 'desenho', category: 'Estética & Química', name: 'Desenho', price: 25, duration: 20, includesCut: false, pricePrefix: 'A partir de ', desc: 'Riscos e arte personalizada no corte.' },
  { id: 'pintura-capilar', category: 'Estética & Química', name: 'Pintura Capilar', price: 150, duration: 60, includesCut: false, pricePrefix: 'A partir de ', desc: 'Tonalização ou cobertura natural dos fios.' },
  { id: 'alinhamento-capilar', category: 'Estética & Química', name: 'Alinhamento Capilar', price: 160, duration: 60, includesCut: false, desc: 'Redução de volume e controle de frizz.' },
  { id: 'platinado', category: 'Estética & Química', name: 'Platinado/Descoloração', price: 180, duration: 120, includesCut: false, desc: 'Descoloração global com proteção dos fios.' },

  // Clube VIP
  { id: 'vip-corte', category: 'Clube VIP', name: 'VIP - CORTE', price: 70, duration: 45, includesCut: true, desc: 'Serviço exclusivo para assinantes ou atendimento VIP.' },
  { id: 'vip-barboterapia', category: 'Clube VIP', name: 'VIP - BARBOTERAPIA', price: 80, duration: 45, includesCut: false, desc: 'Barboterapia completa no padrão VIP Castellari.' },
  { id: 'vip-hidratacao', category: 'Clube VIP', name: 'VIP - HIDRATAÇÃO', price: 50, duration: 30, includesCut: false, desc: 'Hidratação capilar no lavatório.' },
  { id: 'vip-sobrancelha', category: 'Clube VIP', name: 'VIP - SOBRANCELHA', price: 20, duration: 15, includesCut: false, desc: 'Limpeza e alinhamento de sobrancelha.' },
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
    benefits: ['Cortes ilimitados de Seg a Sáb', 'Barboterapia completa ilimitada', 'Prioridade na agenda Planalto', 'Vigência indeterminada sem fidelidade'],
  },
  {
    id: 'vip-corte',
    name: 'VIP - Corte',
    price: 150,
    badge: 'Mais vendido',
    badgeType: 'gold',
    slots: 3,
    days: 'Segunda a Sábado',
    benefits: ['Cortes ilimitados de Seg a Sáb', 'Acabamento e lavagem inclusos', 'Agendamento flexível', 'Vigência indeterminada'],
  },
  {
    id: 'essencial-corte-barba',
    name: 'ESSENCIAL - Corte + Barba',
    price: 180,
    badge: 'Esgotado',
    badgeType: 'soldout',
    slots: 0,
    days: 'Segunda a Sábado',
    benefits: ['Cortes e barba de Seg a Sáb', 'Alinhamento clássico na navalha', 'Vagas temporariamente preenchidas', 'Entre na lista de espera'],
  },
  {
    id: 'essencial-corte',
    name: 'ESSENCIAL - Corte',
    price: 100,
    badge: null,
    slots: 10,
    days: 'Segunda a Sábado',
    benefits: ['Cortes mensais de Seg a Sáb', 'Atendimento com toda a equipe', 'Excelente custo-benefício', '10 vagas disponíveis'],
  },
  {
    id: 'promocional-corte-barba',
    name: 'PROMOCIONAL - Corte + Barba',
    price: 150,
    badge: null,
    slots: 6,
    days: 'Segunda a Quinta',
    benefits: ['Corte + Barba de Seg a Qui', 'Ideal para agenda no início da semana', 'Economia garantida no mês', '6 vagas disponíveis'],
  },
  {
    id: 'promocional-corte',
    name: 'PROMOCIONAL - Corte',
    price: 70,
    badge: null,
    slots: 3,
    days: 'Segunda a Quinta',
    benefits: ['Cortes de Segunda a Quinta', 'O plano mais acessível do Clube', 'Sem taxa de adesão', '3 vagas disponíveis'],
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

window.CastellariData = { SERVICES, PLANS, BARBERS, CATALOG_VERSION };
