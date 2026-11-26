# Barbearia Castellari

Site estático multipágina com autenticação e operações de agenda executadas pelo Firebase.

## Páginas

- `index.html` — apresentação e destaques
- `servicos.html` — catálogo com busca e filtros
- `planos.html` — Clube Castellari
- `equipe.html` — profissionais
- `agendar.html` — agendamento e interesse em plano
- `conta.html` — autenticação, histórico e promoções
- `admin.html` — agenda, catálogo, promoções e configurações

## Estrutura

- `castellari.css` — identidade visual, temas e responsividade
- `castellari-data.js` — catálogo local inicial
- `castellari.js` — interface e fluxo de agendamento
- `castellari-firebase.js` / `firebase-config.js` — Firebase Web SDK
- `functions/` — funções servidoras para criar/cancelar reservas, criar pedidos de plano, atualizar solicitações e agenda e migrar registros antigos
- `firestore.rules` / `firestore.indexes.json` — regras e índices do Firestore

## Firebase

As reservas e solicitações de plano são gravadas por Cloud Functions. O servidor calcula preço e duração a partir do catálogo no Firestore, valida expediente e data, escolhe um profissional quando o cliente marca “Sem preferência” e bloqueia todos os intervalos ocupados pela duração do serviço. As callables limitam tentativas por utilizador e mantêm as vagas de planos numa transação ao criar, confirmar ou arquivar pedidos.

Para habilitar os fluxos em um projeto Firebase:

1. Instale as dependências: `cd functions` e `npm install`.
2. Na raiz do projeto, publique funções, regras e índices: `firebase deploy --only functions,firestore:rules,firestore:indexes`.
3. Entre em `admin.html`, importe o catálogo inicial se necessário e confira dias e horários de atendimento.
4. Se já havia dados no Firebase, use no painel “Proteger dados antigos” para remover identificadores dos horários públicos e e-mails indevidos de promoções amplas.

O SDK do navegador precisa de um projeto Firebase configurado em `firebase-config.js`. A implantação das Cloud Functions pode exigir o plano Blaze do Firebase. Sem as funções publicadas, o site informa indisponibilidade e não mostra uma confirmação falsa.

As regras limitam cada cliente às próprias reservas e promoções elegíveis; os documentos públicos de disponibilidade não devem conter identificadores de clientes. O Firebase Web API key é configuração pública do cliente: o controle de acesso depende das regras e das funções.

## Dados a confirmar

Preços, benefícios, vagas, profissionais, telefone, endereço, horários e redes sociais devem ser confirmados pela barbearia antes do uso oficial.
