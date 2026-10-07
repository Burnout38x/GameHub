// Starts a separate copy of this app against only the isolated local audit database.
import { cpSync, mkdirSync, readFileSync, symlinkSync, existsSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const dir = process.env.QA_RESPONSIVE === '1' ? '/private/tmp/gamehub-codex-audit-20261006/app-responsive' : '/private/tmp/gamehub-codex-audit-20261006/app';
const port = process.env.QA_RESPONSIVE === '1' ? '3202' : '3199';
const vars = Object.fromEntries(readFileSync('/private/tmp/gamehub-codex-audit-20261006/local.env', 'utf8').split('\n').flatMap((line) => { const match = line.match(/^([A-Z_]+)="(.*)"$/); return match ? [[match[1], match[2]]] : []; }));
if (vars.API_URL !== 'http://127.0.0.1:58321') throw new Error('Refusing non-isolated backend');
mkdirSync(dir, { recursive: true });
for (const file of ['src','public','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.mjs','postcss.config.mjs']) {
  if (existsSync(file)) cpSync(file,path.join(dir,file),{recursive:true});
}
// Remove the obsolete copied convention after the Next 16 proxy migration.
if (!existsSync('src/middleware.ts') && existsSync(path.join(dir, 'src/middleware.ts'))) unlinkSync(path.join(dir, 'src/middleware.ts'));
if (!existsSync(path.join(dir,'node_modules'))) symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
const auditEnv = {...process.env,NEXT_PUBLIC_SUPABASE_URL:vars.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:vars.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:vars.SERVICE_ROLE_KEY,NEXT_PUBLIC_REGISTRATION_AVAILABLE:'true'};
const nextBin = path.join(root,'node_modules/next/dist/bin/next');
const production = process.env.QA_PRODUCTION === '1';
if (production) {
  await new Promise((resolve, reject) => {
    const build = spawn(process.execPath, [nextBin, 'build', '--webpack'], {cwd:dir,stdio:'inherit',env:auditEnv});
    build.on('error', reject);
    build.on('exit', code => code === 0 ? resolve() : reject(new Error(`Isolated build exited ${code}`)));
  });
}
const child=spawn(process.execPath,[nextBin,...(production ? ['start'] : ['dev','--webpack']),'-p',port],{
 cwd:dir,stdio:'inherit',env:auditEnv,
});
process.on('SIGTERM',()=>child.kill('SIGTERM')); process.on('SIGINT',()=>child.kill('SIGINT'));
child.on('exit',(code)=>process.exit(code??1));
