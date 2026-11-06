export const environment = {
  production: true,
  // Encaminhe /api/umbrella para o Adan-Stella por reverse proxy HTTPS
  // no mesmo domínio do Continuum-Eve, ou informe uma origem HTTPS pública.
  umbrellaApiBaseUrl: '',
  // Encaminhe /robotHub e /api/robot/* pelo mesmo proxy HTTPS,
  // ou informe aqui a origem HTTPS do backend do robô.
  robotApiBaseUrl: '',
};
