# Continuum-Eve + Adan-Stella (Tailscale Funnel)

The frontend uses one API origin for authentication, profile operations, persistent UmbrellA conversations, robot commands and SignalR.

## Local development

Keep `src/environments/environment.ts` pointed at the local Adan-Stella HTTP profile:

```ts
apiBaseUrl: 'http://localhost:5171',
```

Start the backend with the profile that listens on loopback when using Funnel, or use the documented development profile for local-only work.

## Production

1. Start the Adan-Stella backend with `dotnet run --launch-profile tailscale`.
2. Run `tailscale funnel status` and copy the HTTPS origin (without a path).
3. Replace the placeholder `apiBaseUrl` in `src/environments/environment.prod.ts` with that origin.
4. Build and deploy the frontend again.
5. Confirm the Adan-Stella CORS configuration permits `https://continuum-eve.vercel.app`.

The Funnel origin must remain stable for the deployed frontend. The machine running Adan-Stella and the backend process must remain online.

## Authentication behavior

- The Angular HTTP interceptor sends the Adan-Stella JWT only to the configured API origin.
- Persistent UmbrellA conversation CRUD requires the authenticated Adan-Stella account. The API derives the conversation owner from JWT claims; the client must not send `X-Umbrella-Owner`.
- Robot commands and `/robotHub` require an administrator session. SignalR receives the JWT using `accessTokenFactory`.
- Do not place `Robot__DeviceApiKey`, MQTT credentials or server secrets in frontend environment files. They belong only on the backend or the physical device as appropriate.

## Validation checklist

- `GET https://<funnel-origin>/health` returns `status: ok`.
- Login works through the same HTTPS origin.
- A normal authenticated user can create, list, open and delete their own UmbrellA chats.
- An admin can connect to `/robotHub` and issue commands.
- A non-admin cannot connect to the protected robot hub or send robot commands.
