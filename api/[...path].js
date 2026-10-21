import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const pool = globalThis.__moviehubPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
globalThis.__moviehubPool = pool;

const json = (res, status, body) => res.status(status).json(body);
const publicMember = (row) => ({ id: row.id, email: row.email, displayName: row.display_name, role: row.role });
const tokenFrom = (req) => {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
};
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};
const checkPassword = (password, stored) => {
  const [salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return expected && crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
};
const movieShape = (row) => ({
  id: Number(row.id), tmdbId: Number(row.id), title: row.title, titleTh: row.title_th,
  genre: row.genre, year: row.year, rating: row.rating == null ? null : Number(row.rating),
  detail: row.detail || 'ยังไม่มีเรื่องย่อภาษาไทย', poster: row.poster,
});

async function requireMember(req, res) {
  const token = tokenFrom(req);
  if (!token) return null;
  const result = await pool.query(
    'SELECT m.* FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.token = $1 AND s.expires_at > now()',
    [token],
  );
  return result.rows[0] || null;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return json(res, 500, { error: 'ยังไม่ได้ตั้งค่า DATABASE_URL ใน Vercel' });
  const path = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  try {
    if (req.method === 'GET' && path[0] === 'movies' && path.length === 1) {
      const q = String(req.query.q || '').trim();
      const result = await pool.query(
        `SELECT * FROM movies ${q ? 'WHERE title ILIKE $1 OR title_th ILIKE $1' : ''} ORDER BY id`,
        q ? [`%${q}%`] : [],
      );
      return json(res, 200, { items: result.rows.map(movieShape) });
    }
    if (req.method === 'GET' && path[0] === 'movies' && path.length === 2) {
      const result = await pool.query('SELECT * FROM movies WHERE id = $1', [path[1]]);
      if (!result.rows[0]) return json(res, 404, { error: 'ไม่พบหนังเรื่องนี้' });
      const stats = await pool.query('SELECT count(*)::int AS count, avg(score)::numeric(4,1) AS rating FROM votes WHERE movie_id = $1', [path[1]]);
      return json(res, 200, { ...movieShape(result.rows[0]), memberVoteCount: stats.rows[0].count, memberRating: stats.rows[0].rating == null ? null : Number(stats.rows[0].rating) });
    }
    if (req.method === 'POST' && path[0] === 'auth' && path[1] === 'register') {
      const { email = '', password = '', displayName = '' } = req.body || {};
      if (!email.includes('@') || password.length < 4 || !displayName.trim()) return json(res, 400, { error: 'กรอกอีเมล รหัสผ่าน (4 ตัวขึ้นไป) และชื่อที่แสดงให้ครบ' });
      const result = await pool.query('INSERT INTO members (email, password_hash, display_name) VALUES (lower($1), $2, $3) RETURNING *', [email, hashPassword(password), displayName.trim()]);
      return json(res, 201, publicMember(result.rows[0]));
    }
    if (req.method === 'POST' && path[0] === 'auth' && path[1] === 'login') {
      const { email = '', password = '' } = req.body || {};
      const result = await pool.query('SELECT * FROM members WHERE email = lower($1)', [email]);
      if (!result.rows[0] || !checkPassword(password, result.rows[0].password_hash)) return json(res, 401, { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('INSERT INTO sessions (token, member_id) VALUES ($1, $2)', [token, result.rows[0].id]);
      return json(res, 200, { token, member: publicMember(result.rows[0]) });
    }
    const member = await requireMember(req, res);
    if (path[0] === 'me' && path.length === 1 && req.method === 'GET') {
      if (!member) return json(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return json(res, 200, publicMember(member));
    }
    if (path[0] === 'movies' && path[2] === 'reviews' && req.method === 'GET') {
      const result = await pool.query('SELECT r.*, m.display_name, v.score FROM reviews r JOIN members m ON m.id = r.member_id LEFT JOIN votes v ON v.member_id = r.member_id AND v.movie_id = r.movie_id WHERE r.movie_id = $1 ORDER BY r.created_at DESC', [path[1]]);
      return json(res, 200, { items: result.rows.map((r) => ({ id: Number(r.id), text: r.text, createdAt: r.created_at, updatedAt: r.updated_at, member: { id: Number(r.member_id), displayName: r.display_name }, score: r.score })) });
    }
    if (path[0] === 'movies' && path[2] === 'reviews' && req.method === 'POST') {
      if (!member) return json(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
      const text = String(req.body?.text || '').trim();
      if (text.length < 10) return json(res, 400, { error: 'รีวิวสั้นเกินไป' });
      const result = await pool.query('INSERT INTO reviews (member_id, movie_id, text) VALUES ($1, $2, $3) RETURNING *', [member.id, path[1], text]);
      return json(res, 201, { id: Number(result.rows[0].id), text, createdAt: result.rows[0].created_at });
    }
    if (path[0] === 'movies' && path[2] === 'vote' && req.method === 'PUT') {
      if (!member) return json(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
      const score = req.body?.score;
      if (!Number.isInteger(score) || score < 1 || score > 10) return json(res, 400, { error: 'score ต้องเป็นจำนวนเต็ม 1 ถึง 10' });
      await pool.query('INSERT INTO votes (member_id, movie_id, score) VALUES ($1, $2, $3) ON CONFLICT (member_id, movie_id) DO UPDATE SET score = EXCLUDED.score, updated_at = now()', [member.id, path[1], score]);
      return json(res, 200, { movieId: Number(path[1]), score });
    }
    if (path[0] === 'me' && path[1] === 'wishlist' && req.method === 'GET') {
      if (!member) return json(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
      const result = await pool.query('SELECT m.*, w.note, w.added_at FROM wishlist_items w JOIN movies m ON m.id = w.movie_id WHERE w.member_id = $1 ORDER BY w.added_at DESC', [member.id]);
      return json(res, 200, { items: result.rows.map(movieShape) });
    }
    if (path[0] === 'me' && path[1] === 'wishlist' && path.length === 3) {
      if (!member) return json(res, 401, { error: 'กรุณาเข้าสู่ระบบก่อน' });
      if (req.method === 'PUT') {
        await pool.query('INSERT INTO wishlist_items (member_id, movie_id, note) VALUES ($1, $2, $3) ON CONFLICT (member_id, movie_id) DO UPDATE SET note = EXCLUDED.note', [member.id, path[2], req.body?.note ?? null]);
        return json(res, 200, { movieId: Number(path[2]), note: req.body?.note ?? null });
      }
      if (req.method === 'DELETE') {
        await pool.query('DELETE FROM wishlist_items WHERE member_id = $1 AND movie_id = $2', [member.id, path[2]]);
        return res.status(204).end();
      }
    }
    return json(res, 404, { error: `ไม่มี endpoint ${req.method} ${path.join('/')}` });
  } catch (error) {
    if (error.code === '23505') return json(res, 409, { error: 'ข้อมูลนี้มีอยู่แล้ว' });
    if (error.code === '23503') return json(res, 404, { error: 'ไม่พบหนังเรื่องนี้' });
    console.error('MovieHub API error', error);
    return json(res, 500, { error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
}
