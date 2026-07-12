interface CloudflareEnv {
  DB: D1Database;
  [key: string]: any;
}

interface Env extends CloudflareEnv {}
