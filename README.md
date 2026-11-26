# Barbearia Castellari

Site da Barbearia Castellari, em Manaus, para conhecer os serviços e planos mensais, escolher um profissional e agendar um horário. A interface foi pensada para celular, com tema escuro como padrão e opção de tema claro.

**Site publicado:** [castellari-barbearia.netlify.app](https://castellari-barbearia.netlify.app/)

## O que o site oferece

- **Agendamento em quatro etapas:** serviços, profissional, data e horário, e revisão. Os serviços podem ser combinados; seis opções frequentes aparecem primeiro, com acesso ao catálogo completo.
- **Confirmação com conta:** quem ainda não entrou pode usar Google ou e-mail e senha, criar uma conta ou recuperar a senha sem perder a seleção. Depois de informar nome e WhatsApp, volta ao resumo para confirmar a reserva.
- **Clube Castellari:** a página inicial apresenta dois exemplos de assinatura mensal e encaminha para a comparação dos seis planos. O formulário registra uma **solicitação de interesse**; não contrata nem cobra a assinatura automaticamente.
- **Área do cliente:** autenticação, histórico de agendamentos e promoções elegíveis.
- **Painel administrativo:** gestão de agenda, catálogo, promoções e configurações, sujeita às permissões do Firestore.

| Página | Finalidade |
| --- | --- |
| [`index.html`](index.html) | Apresentação, agendamento e destaque dos planos mensais |
| [`servicos.html`](servicos.html) | Catálogo de serviços com busca e filtros |
| [`planos.html`](planos.html) | Planos mensais do Clube Castellari |
| [`equipe.html`](equipe.html) | Profissionais |
| [`agendar.html`](agendar.html) | Agendamento e solicitação de interesse em plano |
| [`conta.html`](conta.html) | Conta, histórico e promoções |
| [`admin.html`](admin.html) | Administração |

## Tecnologias e estrutura

O projeto usa HTML, CSS e JavaScript sem etapa de build. A autenticação e os dados são acessados pelo Firebase Web SDK, com Firebase Authentication e Cloud Firestore. O Netlify publica os arquivos estáticos.

- [`castellari.css`](castellari.css): identidade visual, temas e layouts responsivos.
- [`castellari-data.js`](castellari-data.js): catálogo inicial de serviços, planos e profissionais.
- [`castellari.js`](castellari.js): interface pública e fluxo de agendamento.
- [`castellari-firebase.js`](castellari-firebase.js): integração com Authentication e Firestore.
- [`firebase-config.js`](firebase-config.js): configuração pública do aplicativo Web Firebase.
- [`firestore.rules`](firestore.rules) e [`firestore.indexes.json`](firestore.indexes.json): regras de acesso e índices.
- [`tests/booking-flow.cjs`](tests/booking-flow.cjs): testes de interface com Firebase simulado.

## Executar localmente

Como não há build, basta servir a pasta do projeto por HTTP. Por exemplo, com Python 3:

```powershell
python -m http.server 8000
```

Abra `http://localhost:8000/`. As páginas e o catálogo inicial podem ser explorados localmente. Login, reservas e outras operações persistentes exigem um projeto Firebase configurado e autorizado para o domínio usado.

### Configurar o Firebase

1. Configure o aplicativo Web em [`firebase-config.js`](firebase-config.js) e habilite no Firebase Authentication os provedores usados pelo site: Google e e-mail/senha. Configure também os domínios autorizados para login.
2. Crie o banco Cloud Firestore e confira o projeto selecionado antes de publicar as regras. O arquivo [`.firebaserc`](.firebaserc) contém um projeto padrão; confirme que ele é o destino desejado.
3. Publique as regras e os índices a partir da raiz do repositório:

   ```powershell
   firebase deploy --only firestore:rules,firestore:indexes
   ```

4. Com acesso administrativo autorizado, confira o catálogo, importe os dados iniciais se necessário e ajuste dias e horários de atendimento em [`admin.html`](admin.html).

O aplicativo **não usa Cloud Functions** e estes fluxos não exigem o plano Blaze. A chave Web do Firebase é uma configuração pública do navegador; a proteção dos dados depende das regras do Firestore e das permissões atribuídas aos usuários. Não coloque credenciais administrativas ou contas de serviço no código do cliente.

## Testes

Os testes de interface usam Node.js, Playwright e Chrome em um servidor local com dados fictícios. A integração Firebase é simulada nos testes: **nenhuma reserva é gravada no projeto real**. O conjunto cobre escolha de serviços e horários, navegação no celular e desktop, login, criação de conta, recuperação de senha, contato, confirmação explícita e erros.

No PowerShell, com Node.js e Chrome instalados:

```powershell
npm install --prefix "$env:TEMP\castellari-ui-check" --no-audit --no-fund playwright
$env:NODE_PATH = Join-Path $env:TEMP 'castellari-ui-check\node_modules'
node --test tests/booking-flow.cjs
```

Para usar Edge, defina `$env:BROWSER_CHANNEL = 'msedge'` antes do teste. As capturas geradas pelos testes ficam na pasta temporária do sistema.

## Limites conhecidos

- Disponibilidade e bloqueio de intervalos usam transações no Firestore. As regras controlam identidade, propriedade e campos permitidos, mas a validação de preço e duração da reserva ainda acontece no navegador. Um cliente autenticado que altere a requisição pode forjar esses valores dentro do que as regras aceitam; confirme o valor no atendimento antes de cobrar.
- O projeto não processa pagamentos nem ativa assinaturas automaticamente. A solicitação de plano deve ser tratada pela equipe.
- Não há limite de frequência próprio contra criação de várias contas.
- Documentos antigos de disponibilidade que contenham identificadores de clientes precisam ser sanitizados por um processo administrativo autorizado antes de qualquer leitura pública.
- Preços, benefícios, vagas, profissionais, telefone, endereço, horários e redes sociais devem ser confirmados pela barbearia antes do uso oficial.
