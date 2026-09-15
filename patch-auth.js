const fs = require('fs');
const file = 'src/lib/auth.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('useSecureCookies')) {
  code = code.replace(
    'trustHost: true,',
    `trustHost: true,\n    useSecureCookies: true,\n    cookies: {\n      sessionToken: {\n        name: '__Secure-authjs.session-token',\n        options: {\n          httpOnly: true,\n          sameSite: 'lax',\n          path: '/',\n          secure: true,\n          domain: env?.AUTH_URL ? new URL(env.AUTH_URL).hostname : undefined\n        }\n      }\n    },`
  );
  fs.writeFileSync(file, code);
  console.log('Patched auth.ts');
} else {
  console.log('Already patched');
}
