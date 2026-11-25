const SERVICES = [
  // Cortes & Combos
  { id: 'corte-novo', category: 'Cortes & Combos', name: 'Corte Premium (Clientes Novos)', price: 45, duration: 45, includesCut: true, badge: 'Primeira Visita', desc: 'Corte personalizado + lavagem e finalização para novos clientes.' },
  { id: 'corte-premium', category: 'Cortes & Combos', name: 'Corte Premium', price: 60, duration: 45, includesCut: true, desc: 'Corte clássico ou moderno com acabamento na navalha e lavagem.' },
  { id: 'combo-exp', category: 'Cortes & Combos', name: 'Combo Experiência Completa', price: 150, duration: 90, includesCut: true, badge: 'Mais Completo', desc: 'Corte Premium + Barboterapia completa + Hidratação e acabamento.' },
  { id: 'combo-total', category: 'Cortes & Combos', name: 'Combo Cuidado Total', price: 135, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha e cuidados faciais essenciais.' },
  { id: 'combo-premium', category: 'Cortes & Combos', name: 'Combo Premium', price: 110, duration: 60, includesCut: true, desc: 'Corte Premium + Barboterapia com toalha quente.' },
  { id: 'combo-essencial', category: 'Cortes & Combos', name: 'Combo Essencial', price: 100, duration: 60, includesCut: true, desc: 'Corte + Barba Completa alinhada na navalha.' },
  { id: 'combo-visual', category: 'Cortes & Combos', name: 'Combo Visual Completo', price: 130, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha + Limpeza facial.' },
  { id: 'combo-rapido', category: 'Cortes & Combos', name: 'Combo Rápido e Eficiente', price: 100, duration: 50, includesCut: true, desc: 'Agilidade sem abrir mão do padrão Castellari.' },
  { id: 'combo-pais', category: 'Cortes & Combos', name: 'Combo Pais em Dia', price: 100, duration: 60, includesCut: true, desc: 'Corte adulto + Corte infantil no mesmo atendimento.' },
  { id: 'corte-infantil', category: 'Cortes & Combos', name: 'Corte Infantil', price: 60, duration: 40, includesCut: true, desc: 'Atendimento cuidadoso e estilizado para crianças.' },
  { id: 'corte-feminino', category: 'Cortes & Combos', name: 'Corte Feminino', price: 70, duration: 60, includesCut: true, desc: 'Corte técnico e finalização personalizada.' },

  // Barba & Terapias
  { id: 'barboterapia', category: 'Barba & Terapias', name: 'Barboterapia', price: 60, duration: 45, includesCut: false, badge: 'Clássico Italiano', desc: 'Toalha quente, massagem facial, óleos essenciais e navalha.' },
  { id: 'barba-completa', category: 'Barba & Terapias', name: 'Barba Completa', price: 50, duration: 35, includesCut: false, desc: 'Modelagem, alinhamento e hidratação pós-barba.' },
  { id: 'terapia-capilar', category: 'Barba & Terapias', name: 'Terapia Capilar (Bálsamo + Shampoo Deep Ice)', price: 70, duration: 40, includesCut: false, desc: 'Refrescância profunda e revitalização do couro cabeludo.' },
  { id: 'terapia-facial', category: 'Barba & Terapias', name: 'Terapia Facial com Extração de Cravos', price: 120, duration: 50, includesCut: false, desc: 'Limpeza profunda de poros e revitalização da pele.' },
  { id: 'esfoliacao-facial', category: 'Barba & Terapias', name: 'Esfoliação Facial Anti Oleosidade', price: 50, duration: 30, includesCut: false, desc: 'Controle de oleosidade e renovação celular.' },
  { id: 'lavagem-acidificante', category: 'Barba & Terapias', name: 'Lavagem Hidratante com Acidificante', price: 60, duration: 30, includesCut: false, desc: 'Equilíbrio de pH e brilho intenso aos fios.' },
  { id: 'hidratacao-capilar', category: 'Barba & Terapias', name: 'Hidratação Capilar', price: 50, duration: 30, includesCut: false, desc: 'Nutrição e maciez imediata para cabelos ressecados.' },

  // Acabamento & Estética
  { id: 'sobrancelha', category: 'Acabamento & Estética', name: 'Sobrancelha (Simples)', price: 30, duration: 20, includesCut: false, desc: 'Limpeza e alinhamento natural na pinça ou navalha.' },
  { id: 'pezinho', category: 'Acabamento & Estética', name: 'Pezinho', price: 25, duration: 15, includesCut: false, desc: 'Acabamento preciso nos contornos e nuca.' },
  { id: 'cera-nariz', category: 'Acabamento & Estética', name: 'Depilação na Cera (Nariz)', price: 30, duration: 15, includesCut: false, desc: 'Remoção rápida, higiênica e confortável.' },
  { id: 'cera-ouvido', category: 'Acabamento & Estética', name: 'Depilação na Cera (Ouvido)', price: 30, duration: 15, includesCut: false, desc: 'Acabamento limpo e seguro.' },
  { id: 'combo-facial-cera', category: 'Acabamento & Estética', name: 'Combo Terapia Facial + Depilação na Cera (Nariz e Ouvido)', price: 150, duration: 60, includesCut: false, desc: 'Cuidado estético facial completo.' },
  { id: 'pigmentacao-barba', category: 'Acabamento & Estética', name: 'Pigmentação de Barba', price: 50, duration: 30, includesCut: false, desc: 'Preenchimento visual e definição de contorno.' },
  { id: 'alinhamento-capilar', category: 'Acabamento & Estética', name: 'Alinhamento Capilar', price: 100, duration: 60, includesCut: false, desc: 'Redução de volume e controle de frizz.' },
  { id: 'platinado', category: 'Acabamento & Estética', name: 'Platinado / Descoloração', price: 180, duration: 120, includesCut: false, desc: 'Descoloração global com proteção dos fios.' },
  { id: 'pintura-capilar', category: 'Acabamento & Estética', name: 'Pintura Capilar', price: 100, duration: 60, includesCut: false, pricePrefix: 'A partir de ', desc: 'Tonalização ou cobertura natural dos fios.' },
  { id: 'micropigmentacao', category: 'Acabamento & Estética', name: 'Preenchimento de Barba (Micropigmentação)', price: 400, duration: 90, includesCut: false, pricePrefix: 'A partir de ', desc: 'Técnica de longa duração para falhas na barba.' },
  { id: 'visagismo', category: 'Acabamento & Estética', name: 'Consultoria de Imagem (Visagismo)', price: 150, duration: 60, includesCut: false, desc: 'Estudo de formato de rosto e estilo ideal.' },
  { id: 'desenho', category: 'Acabamento & Estética', name: 'Desenho (Freestyle)', price: 25, duration: 20, includesCut: false, pricePrefix: 'A partir de ', desc: 'Riscos e arte personalizada no corte.' },

  // Adicionais (UP)
  { id: 'up-sobrancelha', category: 'Adicionais (UP)', name: 'UP - Sobrancelha', price: 20, duration: 15, includesCut: false, desc: 'Adicional promocional para incluir no seu atendimento.' },
  { id: 'up-hidratacao', category: 'Adicionais (UP)', name: 'UP - Hidratação', price: 40, duration: 20, includesCut: false, desc: 'Adicional de hidratação rápida no lavatório.' },
  { id: 'up-corte', category: 'Adicionais (UP)', name: 'UP - Corte', price: 50, duration: 40, includesCut: true, desc: 'Upgrade de corte adicionado ao pacote.' },
  { id: 'up-barboterapia', category: 'Adicionais (UP)', name: 'UP - Barboterapia', price: 50, duration: 35, includesCut: false, desc: 'Upgrade de barboterapia com toalha quente.' },
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
  { id: 'raquel', name: 'Raquel', initials: 'RQ', featured: true, role: 'Master Barber' },
  { id: 'lucas', name: 'Lucas', initials: 'LC', featured: false, role: 'Barbeiro Clássico' },
  { id: 'felipe', name: 'Felipe', initials: 'FL', featured: false, role: 'Especialista Barba' },
  { id: 'ana-clara', name: 'Ana Clara', initials: 'AC', featured: false, role: 'Visagismo & Corte' },
  { id: 'lucas-alfaia', name: 'Lucas Alfaia', initials: 'LA', featured: false, role: 'Degradê & Acabamento' },
  { id: 'gabriel', name: 'Gabriel', initials: 'GB', featured: false, role: 'Barbeiro' },
  { id: 'sem-preferencia', name: 'Sem preferência', initials: '★', featured: false, role: 'Primeiro disponível' },
];

window.CastellariData = { SERVICES, PLANS, BARBERS };
