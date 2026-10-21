import fs from 'node:fs';
import path from 'node:path';
const movies = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'mock/movies.json'), 'utf8'));
const quote = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const rows = movies.map((m) => `INSERT INTO movies (id,title,title_th,genre,year,rating,detail,poster) VALUES (${m.id},${quote(m.title)},${quote(m.titleTh)},${quote(m.genre)},${m.year ?? 'NULL'},${m.rating ?? 'NULL'},${quote(m.detail)},${quote(m.poster)}) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,title_th=EXCLUDED.title_th,genre=EXCLUDED.genre,year=EXCLUDED.year,rating=EXCLUDED.rating,detail=EXCLUDED.detail,poster=EXCLUDED.poster,updated_at=now();`);
fs.writeFileSync(path.join(process.cwd(), 'db/seed.sql'), `-- Generated from mock/movies.json\n${rows.join('\n')}\n`);
