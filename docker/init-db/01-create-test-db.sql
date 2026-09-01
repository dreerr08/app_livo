-- Roda automaticamente na primeira vez que o container do Postgres sobe
-- (volume vazio). Cria o banco de teste além do banco de dev, para o
-- `npm test` do server funcionar sem passo manual extra.
CREATE DATABASE app_livo_test;
