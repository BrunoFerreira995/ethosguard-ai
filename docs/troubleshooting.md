# Solução de problemas

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

