# [Continuum-Eve](https://continuum-eve.vercel.app)
[![Version](https://img.shields.io/badge/version-v1.1.0-orange.svg)](https://github.com/User82bit/Continuum-Eve/deployments/Production)

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


## UmbrellA e contexto de telemetria

A Dynamic Island envia ao Adan-Stella, junto com cada mensagem, um resumo do estado já recebido pelo `RobotHub`: estado da conexão, horário do último pacote válido, bateria, distância ultrassônica e total de plantas quando esses valores existem.

O resumo é montado localmente a partir dos mesmos campos que o dashboard já lê. Dados ausentes permanecem `null`; nenhum valor fictício é criado. O payload bruto MQTT, imagens da câmera e comandos de movimento não são encaminhados para a UmbrellA.

O Adan-Stella recebe esse resumo pelo campo `robotContext`, separado de `sensorContext` (usado pelo School Safe). A autenticação do Continuum-Eve não é compartilhada com o chat.

A UmbrellA pode explicar os indicadores, mas não controla o robô. A IA física ESP-CONTROLL, a API de comandos e as proteções de movimento permanecem separadas.
