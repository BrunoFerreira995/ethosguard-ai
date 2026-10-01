# EthosGuard

Aplicação full-stack para analisar textos e situações morais usando categorias de ética cristã configuráveis. O sistema retorna uma classificação estruturada baseada no modelo local Fastino GLiNER 2.5 Multi e nas definições de [`config/ethics.json`](config/ethics.json).

A análise é uma ferramenta de apoio. Ela descreve correspondências com as categorias configuradas e não se apresenta como autoridade religiosa absoluta.

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
- Python 3.10 ou superior
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

### Recuperação do Docker Desktop no macOS

Se o Compose mostrar `metadata.v1.bolt/meta.db: input/output error` ou `blob ... expected ... input/output error`, verifique primeiro o espaço livre no macOS. O Docker Desktop precisa gravar no disco do host para atualizar o armazenamento de imagens:

```bash
df -h /
bun pm cache
du -sh "$(bun pm cache)"
```

Se houver menos de alguns gigabytes livres, limpe o cache global do Bun, que pode ser baixado novamente quando necessário:

```bash
bun pm cache rm
df -h /
```

Preserve o cache do Hugging Face se já tiver baixado o checkpoint GLiNER: apagá-lo obriga a baixar o modelo novamente. Reinicie o Docker Desktop após liberar espaço e confirme que `docker info` funciona. Depois reconstrua:

```bash
docker pull oven/bun:1
docker pull python:3.11-slim
docker compose build --pull --no-cache
docker compose up
```

Se o erro continuar mesmo com espaço livre, abra Docker Desktop → **Troubleshoot** → **Restart Docker Desktop**. Use **Clean / Purge data** apenas como último recurso: essa opção remove todos os containers e imagens locais do Docker Desktop. Faça backup de volumes de outros projetos antes dessa operação.

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
