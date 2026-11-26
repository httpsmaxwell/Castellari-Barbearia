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

No agendamento, a escolha de serviços começa com Corte, Barba e Corte + barba. A opção “Ver todos os serviços” abre a busca e o catálogo completo para outros atendimentos e combinações. Os preços e durações dessas escolhas rápidas são calculados a partir dos mesmos serviços do catálogo.

## Estrutura

- `castellari.css` — identidade visual, temas e responsividade
- `castellari-data.js` — catálogo local inicial
- `castellari.js` — interface e fluxo de agendamento
- `castellari-firebase.js` / `firebase-config.js` — Firebase Web SDK
- `firestore.rules` / `firestore.indexes.json` — regras e índices do Firestore

## Firebase

Reservas, cancelamentos e solicitações de plano usam o SDK Web e as regras do Firestore. O cliente valida expediente, preço e duração a partir do catálogo, e uma transação bloqueia os intervalos selecionados. As regras confirmam identidade, propriedade, campos permitidos e dados canónicos do plano. Como a validação de reservas corre no navegador, não trate o preço gravado como confirmação de pagamento ou valor inviolável.

Para habilitar os fluxos em um projeto Firebase:

1. Na raiz do projeto, publique regras e índices: `firebase deploy --only firestore:rules,firestore:indexes`.
2. Entre em `admin.html`, importe o catálogo inicial se necessário e confira dias e horários de atendimento.
3. Dados antigos de disponibilidade que contenham identificadores de clientes devem ser sanitizados antes da consulta pública; esta operação precisa ser feita por um processo administrativo com credenciais autorizadas.

O SDK do navegador precisa de um projeto Firebase configurado em `firebase-config.js`. A aplicação não utiliza Cloud Functions e não exige o plano Blaze para estes fluxos. Sem validação de servidor, um cliente autenticado adulterado ainda pode forjar preço/duração dentro das regras; confirme o valor no atendimento antes de cobrar. Também não há limite de frequência contra criação de várias contas.

As regras limitam cada cliente às próprias reservas e promoções elegíveis; os documentos públicos de disponibilidade não devem conter identificadores de clientes. O Firebase Web API key é configuração pública do cliente: o controle de acesso depende das regras do Firestore.

## Testes do fluxo de agendamento

Os testes de interface usam Chrome e Playwright com Firebase simulado, dados fictícios e servidor local. Nenhuma reserva é enviada ao Firebase. Cobrem login, criação de conta, recuperação de senha, contato, confirmação explícita, seleção de horário, controles durante a rolagem, erros e proteção contra cliques repetidos em telas de celular e desktop.

No PowerShell, com Node.js e Chrome instalados:

```powershell
npm install --prefix "$env:TEMP\castellari-ui-check" --no-audit --no-fund playwright
$env:NODE_PATH = Join-Path $env:TEMP 'castellari-ui-check\node_modules'
node --test tests/booking-flow.cjs
```

Para usar Edge, defina `$env:BROWSER_CHANNEL = 'msedge'` antes de executar. As capturas de tela são salvas na pasta temporária do sistema.

## Dados a confirmar

Preços, benefícios, vagas, profissionais, telefone, endereço, horários e redes sociais devem ser confirmados pela barbearia antes do uso oficial.
