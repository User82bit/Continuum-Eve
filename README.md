# ContinuumEve

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# Continuum-Eve

### v0.61.0


## UmbrellA — chats persistentes

O widget flutuante usa a API anônima do Adan-Stella e permite criar, alternar e excluir conversas sem recarregar a página. O Continuum-Eve envia um identificador estável do navegador em `X-Umbrella-Owner`; o JWT de autenticação do Continuum-Eve não é encaminhado à API da UmbrellA.

### Configuração

- Desenvolvimento local: execute o Adan-Stella com `dotnet run --launch-profile http` e use `http://localhost:5171` em `src/environments/environment.ts`.
- Produção: o build usa origem relativa por padrão. Configure o reverse proxy HTTPS do domínio do Continuum-Eve para encaminhar `/api/umbrella/*` ao Adan-Stella, ou ajuste `src/environments/environment.prod.ts` para uma origem HTTPS pública.
- O Adan-Stella precisa permitir a origem exata do Continuum-Eve em `Cors:AllowedOrigins`.
- O runtime Python precisa estar pronto e o adaptador Core treinado instalado em `IAs/ChatBOT/Adapters/Core`; sem ele, a API pode responder indisponibilidade mesmo quando o servidor ASP.NET está no ar.

A integração usa `GET/POST/DELETE /api/umbrella/chats` e `POST /api/umbrella/chat`. As chamadas são feitas sem o interceptor JWT do Continuum-Eve para manter os limites de autenticação entre os projetos.
