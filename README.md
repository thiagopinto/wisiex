## Manual de Acesso aos Serviços Docker

Este manual fornece instruções sobre como acessar os serviços definidos no seu `docker-compose.yml`.

### Pré-requisitos

* **Docker e Docker Compose:** Certifique-se de que o Docker e o Docker Compose estejam instalados e em execução no seu sistema.
* **Terminal/Prompt de Comando:** Você precisará de um terminal ou prompt de comando para executar os comandos do Docker Compose.
* **Navegador Web:** A maioria dos serviços (backend, frontend, Grafana) será acessada através de um navegador web.
* **.env Arquivo:** Um arquivo `.env` contendo as variáveis de ambiente conforme especificado.

### Iniciando os Serviços

1.  **Navegue até o diretório:** Abra um terminal e navegue até o diretório onde o seu arquivo `docker-compose.yml` e o arquivo `.env` estão localizados.

2.  **Inicie os serviços:** Execute o seguinte comando para iniciar todos os serviços definidos no arquivo:

    ````bash
    docker-compose up -d
    ````

    O flag `-d` faz com que os serviços sejam executados em segundo plano (detached mode).

### Acessando os Serviços

Após a inicialização dos serviços, você pode acessá-los através do seu navegador web ou outras ferramentas, conforme descrito abaixo:

#### Backend (app)

* **URL:** `http://localhost:3000`
* O backend é a sua aplicação NestJS. Você pode acessar a API através desta URL. As rotas da API dependerão da configuração da sua aplicação NestJS. Por exemplo, se você tiver um controlador chamado `users` com uma rota `GET /users`, você poderá acessá-lo em `http://localhost:3000/users`.
* **Swagger:** Se o Swagger estiver implementado na sua aplicação NestJS, ele estará disponível na mesma URL, geralmente em um caminho como `/api/docs` ou `/swagger`. Consulte a documentação da sua aplicação NestJS para o caminho correto. Por exemplo: `http://localhost:3000/api/docs`.
    * A configuração atual do Docker e do Nginx permite que o Swagger seja acessado externamente, pois todo o tráfego para a porta 3000 é encaminhado para o contêiner do backend.

#### Frontend

* **URL:** `http://localhost:8000`
* O frontend é a sua aplicação React/Vite. Você pode acessar a interface da sua aplicação através desta URL.

#### Grafana

* **URL:** `http://localhost:3001`
* Grafana é a ferramenta de visualização de métricas.
* **Credenciais:**
    * **Usuário:** `grafana` (definido em `GRAFANA_USER` no `.env`)
    * **Senha:** `grafana` (definido em `GRAFANA_PASSWORD` no `.env`)
* Ao acessar o Grafana, você precisará fazer login com as credenciais acima. Depois de fazer login, você pode configurar fontes de dados (como o Prometheus) e criar dashboards para visualizar suas métricas.

#### Prometheus

* **URL:** `http://localhost:9091`
* Prometheus é o sistema de monitoramento.
* **Autenticação:** O acesso ao Prometheus é protegido por autenticação básica. Você precisará fornecer um nome de usuário e senha.
    * **Usuário/Senha:** Os que você configurou no arquivo `.htpasswd_prometheus`.
* Você pode usar o Prometheus para consultar métricas, configurar alertas e monitorar a saúde da sua aplicação.

#### RabbitMQ

* **URL (Interface de Gerenciamento):** `http://localhost:15672`
* RabbitMQ é o message broker.
* **Credenciais:**
    * **Usuário:** `exchange` (definido em `RABBITMQ_USER` no `.env`)
    * **Senha:** `secret` (definido em `RABBITMQ_PASSWORD` no `.env`)
* Você pode acessar a interface de gerenciamento do RabbitMQ para monitorar filas, mensagens e outras informações relacionadas ao broker.
* **Porta para Clientes AMQP:** 5672. Esta porta é usada por aplicações para se conectar ao RabbitMQ e enviar/receber mensagens. Você não acessa esta porta diretamente em um navegador.

#### Banco de Dados (PostgreSQL)

* O banco de dados PostgreSQL não é acessível diretamente através de um navegador web. Ele é acessado pela sua aplicação backend (NestJS).
* **Porta:** 5432 (dentro do contêiner). A porta 5432 do contêiner não está exposta para o host por razões de segurança. Apenas outros contêineres na mesma rede Docker podem acessar o banco de dados.
* Para acessar o banco de dados, você precisa usar um cliente PostgreSQL (como `psql`, DBeaver, etc.) e se conectar a partir de dentro de um contêiner na mesma rede do Docker, ou a partir da sua aplicação backend.
    * **Host:** `localhost` (definido em `DATABASE_HOST` no `.env`, mas lembre-se que para outros containers, use o nome do serviço e a porta padrão.)
    * **Porta:** `5432` (definido em `DATABASE_PORT` no `.env`, mas esta porta não é exposta para acesso externo)
    * **Usuário:** `exchange` (definido em `DATABASE_USERNAME` no `.env`)
    * **Senha:** `secret` (definido em `DATABASE_PASSWORD` no `.env`)
    * **Nome do Banco de Dados**: `exchange` (definido em `DATABASE_NAME` no `.env`)

### Observações Importantes

* **Portas:** As portas listadas acima são as portas do *host* (sua máquina). Os serviços estão rodando em portas diferentes dentro de seus contêineres Docker. O Docker Compose mapeia as portas do contêiner para as portas do host.
* **Rede Docker:** Todos os serviços estão na mesma rede Docker (`app-network`). Isso permite que eles se comuniquem entre si usando os nomes dos serviços como hostname (por exemplo, o backend pode acessar o banco de dados em `db:5432`).
* **Variáveis de Ambiente:** As credenciais e configurações para os serviços são obtidas do arquivo `.env`.
* **Segurança:** O banco de dados PostgreSQL não está exposto para acesso externo. Isso é uma prática recomendada de segurança. O acesso ao Prometheus é protegido por autenticação básica via Nginx.
* **Porta do Grafana:** A porta do Grafana foi alterada para 3001 no arquivo `docker-compose.yml`. A URL de acesso foi atualizada para refletir essa mudança.

