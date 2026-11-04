# Tests SQL des tags de serveur

Verifient `upsert_server_tag`, `set_my_server_tag`, `clear_my_server_tag` et le declencheur de depart sur un vrai
PostgreSQL (les fonctions d'aide de Supabase sont simulees par `server_tags_stubs.sql`).

```bash
docker run -d --name pgtest -e POSTGRES_PASSWORD=x postgres:16-alpine && sleep 6
docker cp supabase/tests/server_tags_stubs.sql pgtest:/stubs.sql
docker cp supabase/migrations/20261030100000_server_tags.sql pgtest:/mig.sql
docker cp supabase/tests/server_tags_scenarios.sql pgtest:/scen.sql
docker exec pgtest psql -U postgres -v ON_ERROR_STOP=1 -q -f /stubs.sql
docker exec pgtest psql -U postgres -v ON_ERROR_STOP=1 -q -f /mig.sql
docker exec pgtest psql -U postgres -f /scen.sql
docker rm -f pgtest
```
