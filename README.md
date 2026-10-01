# EthosGuard

**Análise de textos com IA e categorias explícitas de ética cristã.**

EthosGuard é um projeto full-stack que transforma relatos de situações cotidianas em uma análise estruturada de virtudes, princípios e possíveis conflitos éticos. As categorias são configuráveis em JSON, e a inferência usa o modelo local Fastino GLiNER 2.5 Multi.

O projeto reúne uma interface em Next.js, uma API em Bun + Elysia e um serviço de inferência em Python + FastAPI. É uma implementação para explorar classificação semântica, integração entre serviços e respostas com evidências extraídas do texto.

## O que o projeto entrega

- Classificação moral com pontuação de confiança retornada pelo modelo.
- Identificação de virtudes, princípios e problemas éticos, com evidências quando disponíveis.
- Resumo e raciocínio construídos a partir das categorias e dos resultados da classificação.
- Categorias e descrições editáveis em [`config/ethics.json`](config/ethics.json).
- API com validação de entrada, timeout, tentativas de recuperação, cache e limite de requisições.
- Execução local, configuração Docker Compose e configuração de múltiplos serviços no Vercel.

## Exemplo de uso

> “Encontrei uma carteira e devolvi ao proprietário.”

Categorias de referência para esse cenário incluem **honestidade**, **justiça** e **virtuoso**. A interface apresenta a classificação, as pontuações e a explicação correspondente. Esse exemplo indica o comportamento esperado; o resultado real depende do checkpoint e dos limiares usados.

## Tecnologias e responsabilidades

| Camada | Tecnologias | Responsabilidade |
| --- | --- | --- |
| Interface | Next.js, React, TypeScript | Entrada de texto e apresentação da análise |
| API | Bun, Elysia, TypeScript | Validação, controle de requisições e integração com a inferência |
| Inferência | Python, FastAPI, GLiNER2 | Extração e classificação com o checkpoint local |
| Configuração | JSON e JSONL | Categorias de ética e corpus inicial para evolução |
| Execução | Docker Compose, Vercel Services | Configuração dos três serviços |

## Estágio atual e limites

O fluxo atual usa GLiNER e regras de explicação configuradas. A integração com um provedor LLM e o fine-tuning são possibilidades futuras; não fazem parte da análise atual. O dataset incluído é um corpus inicial, sem resultados de avaliação quantitativa publicados neste README.

As pontuações do modelo não representam certeza sobre um julgamento moral. A análise descreve correspondências com as categorias escolhidas e serve como apoio à reflexão. O contexto ético adotado é explícito e configurável.

A configuração Vercel está preparada para revisão, mas a execução conjunta pelo CLI e a inicialização do checkpoint real no ambiente Vercel ainda precisam ser verificadas.

## Arquitetura

```text
Next.js (3101)
    │ POST /api/analyze
    ▼
Bun + ElysiaJS (3102)
    │ timeout, retry, cache, rate limit
    ▼
FastAPI + Fastino GLiNER 2.5 Multi (8000)
    │ entidades, classificação moral e evidências
    ▼
config/ethics.json
```

`EthicsAnalysisService` no backend já define uma fronteira para combinar o resultado do GLiNER com um provedor LLM no futuro. Atualmente o fluxo usa somente GLiNER e regras de explicação configuradas.

## Requisitos e instalação local

- Bun 1.x
- Python 3.11 ou 3.12 (3.12 para o deploy no Vercel)
- Docker e Docker Compose, caso use a execução conteinerizada
- Memória suficiente para o checkpoint local; a primeira inicialização baixa o modelo

```bash
cp .env.example .env
bun install
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r services/gliner/requirements.txt
```

No macOS, se `python3` também não estiver instalado, instale-o com `brew install python`. O projeto usa `python3` e `python3 -m pip`; os aliases `python` e `pip` não são necessários.

Inicie o serviço Python, a API e o frontend em terminais separados:

```bash
uvicorn services.gliner.app.main:app --reload --port 8000
bun run dev:api
bun run dev:web
```

Abra <http://localhost:3101>. O modelo é carregado uma única vez durante a inicialização do FastAPI. O dispositivo é escolhido na ordem CUDA, MPS e CPU.

Se o serviço falhar com `protobuf library ... was not found` ou com erro de `extra_special_tokens` no tokenizer, atualize os extras do tokenizer e reinicie o processo:

```bash
python3 -m pip install -r services/gliner/requirements.txt
```

Espere o endpoint <http://localhost:8000/health> responder antes de usar a interface. A API Bun retorna `502` enquanto o processo Python ainda está carregando ou se ele encerrou durante o carregamento.

## Vercel Services

Configure o projeto Vercel com a raiz do repositório. `vercel.json` define
`web` (Next.js, público em `/`), `api` (Elysia, público em `/api/*`) e
`gliner` (FastAPI, interno). O prefixo `/api` é preservado e já faz parte
das rotas da API. `/health` da API continua disponível apenas internamente;
o endpoint público é `/api/health`.

A API recebe `GLINER_URL` pelo binding para `gliner`. Não defina essa variável
manualmente. Não configure `NEXT_PUBLIC_API_URL`, `GLINER_SERVICE_URL` nem o
`ETHICS_CONFIG_PATH` local no Vercel. O navegador usa `/api/analyze` no mesmo
domínio, sem binding no frontend. `GLINER_SERVICE_URL` e `NEXT_PUBLIC_API_URL`
continuam disponíveis para execução local separada e Docker.

O build do GLiNER copia `config/ethics.json` para a raiz do serviço. O serviço
carrega esse arquivo antes de recorrer ao caminho usado no desenvolvimento.
O checkpoint e as dependências de inferência precisam caber nos limites de
pacote, memória e tempo do runtime Python do Vercel; valide um preview com
o modelo real antes de usar em produção. Cache e rate limit da API ficam
na memória de cada instância, sem coordenação entre instâncias.

Teste os serviços juntos a partir da raiz, com Vercel CLI instalado:

```bash
vercel dev
# Em outro terminal, usando a porta informada pelo CLI:
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"text":"Encontrei uma carteira e devolvi ao proprietário."}'
```

O CLI injeta o binding em runtime; ele não está disponível no build ou no
middleware. Confira também a interface no endereço informado pelo CLI.

## Docker

```bash
docker compose up --build
```

Endereços: frontend <http://localhost:3101>, API <http://localhost:3102> e GLiNER <http://localhost:8000>.

Para trocar o checkpoint:

```bash
GLINER_MODEL=fastino/gliner2.5-base-v1 docker compose up --build gliner-service
```

O padrão é `fastino/gliner2.5-multi-v1`, apropriado para entradas multilíngues. O modelo alternativo deve ser compatível com `AutoExtractor`.

Para problemas de armazenamento ou inicialização no macOS, consulte o [guia de solução de problemas](docs/troubleshooting.md).

## Categorias

Edite [`config/ethics.json`](config/ethics.json) para adicionar ou alterar categorias. Cada item tem uma chave interna, um `label` apresentado ao usuário e uma `description` enviada como contexto ao modelo:

```json
{
  "virtues": {
    "patience": {
      "label": "paciência",
      "description": "Responder sem impulsividade diante de dificuldades."
    }
  }
}
```

As chaves `virtues`, `principles`, `ethical_issues` e `moral_classification` são lidas dinamicamente pelo serviço Python. Virtudes, princípios e problemas podem coexistir; a classificação moral é um rótulo único configurado.

## Dataset e futuro fine-tuning

O dataset inicial está em [`datasets/christian_ethics.jsonl`](datasets/christian_ethics.jsonl), com um objeto JSON por linha:

```json
{"text":"Devolver uma carteira encontrada","label":"honestidade"}
```

```bash
python3 scripts/validate_dataset.py
python3 scripts/prepare_dataset.py dados.csv datasets/novo.jsonl
python3 scripts/validate_dataset.py --dataset datasets/novo.jsonl
```

O validador verifica JSON, campos obrigatórios, textos vazios, duplicatas, labels conhecidos e balanceamento aproximado. O corpus pode futuramente ser convertido para os exemplos de treinamento do GLiNER2 e usado para fine-tuning ou LoRA.

## API REST

```bash
curl http://localhost:3102/health
curl http://localhost:3102/api/health
curl -X POST http://localhost:3102/api/analyze \
  -H 'content-type: application/json' \
  -d '{"text":"Encontrei uma carteira e devolvi ao proprietário."}'
```

A resposta contém `analysis.moral_classification`, `confidence`, listas de `virtues`, `principles` e `ethical_issues`, além de `explanation.summary` e `explanation.reasoning`. Limites de tamanho, CORS, timeout, tentativas, cache e rate limit podem ser ajustados no `.env`; detalhes internos de exceções não são enviados ao frontend.

## Casos de referência

- `Encontrei uma carteira e devolvi ao proprietário.` → honestidade, justiça, virtuoso.
- `Vou mentir para conseguir dinheiro.` → mentira, conflito com verdade, problemático.
- `Vou ajudar uma pessoa que está passando fome.` → caridade, compaixão, virtuoso.

O checkpoint sem fine-tuning pode produzir variações de confiança. Esses casos orientam a evolução do dataset e dos limiares.

## Testes

```bash
bun install
bun run test:api
python3 -m pytest services/gliner/tests scripts/test_dataset_validation.py
```

Os testes Python usam um modelo falso para não baixar o checkpoint. Com o serviço ativo, teste diretamente:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/classify \
  -H 'content-type: application/json' \
  -d '{"text":"Vou ajudar uma pessoa que está passando fome."}'
```
