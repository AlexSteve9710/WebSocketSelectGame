// =============================================================================
// 快捷创建账号 — 直接写入 Cloudflare KV
// =============================================================================
// 用法:
//   node scripts/create-user.js <username> <password>
//
// 前置条件:
//   1. 已安装 wrangler (npm install)
//   2. 已登录 wrangler (npx wrangler login)
//   3. KV namespace 的 binding 名称为 USERS（与 wrangler.toml 一致）
//
// 示例:
//   node scripts/create-user.js admin mypassword123
// =============================================================================

const { execSync } = require("child_process");
const crypto = require("crypto");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("用法: node scripts/create-user.js <username> <password>");
  console.log('示例: node scripts/create-user.js admin mypassword123');
  process.exit(1);
}

const [username, password] = args;

// 与 Worker 中 hashPassword() 完全一致的 SHA-256 哈希
const hash = crypto
  .createHash("sha256")
  .update(password)
  .digest("hex");

const userData = JSON.stringify({ passwordHash: hash });

console.log(`正在创建用户: ${username}`);
console.log(`密码哈希: ${hash}`);

try {
  // 通过 wrangler CLI 写入 KV
  execSync(
    `npx wrangler kv:key put "user:${username}" --binding USERS --json '${userData}'`,
    { cwd: `${__dirname}/..`, stdio: "inherit" }
  );
  console.log(`✅ 用户 "${username}" 创建成功！`);
  console.log("现在可以通过 Web 面板登录了。");
} catch (err) {
  console.error("❌ 创建失败，请检查：");
  console.error("   1. 是否在 worker/ 目录下运行");
  console.error("   2. wrangler 是否已登录 (npx wrangler login)");
  console.error("   3. KV namespace 配置是否正确");
  console.error(`\n手动执行以下命令：`);
  console.error(`  npx wrangler kv:key put "user:${username}" --binding USERS --json '${userData}'`);
  process.exit(1);
}
