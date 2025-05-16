const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4242;

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function generateToken() {
  return crypto.randomBytes(12).toString('hex');
}

// 🔍 בדיקת סשן קיים לפני פתיחה מחדש
app.get('/check-active-session', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'Missing uid' });

  try {
    const { rows } = await pool.query(
      `SELECT token FROM sessions
       WHERE user_identifier = $1 AND paid = true AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [uid]
    );

    if (rows.length > 0) {
      return res.json({ token: rows[0].token });
    } else {
      return res.json({ token: null });
    }
  } catch (err) {
    console.error('❌ שגיאה בבדיקת סשן:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// יצירת סשן מטופס פרטים מלא
app.post('/start-session-form', async (req, res) => {
  const { uid, fullName, phone, email } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.ip;

  if (!uid || !fullName || !phone || !email) {
    return res.status(400).json({ error: 'חסר מידע בטופס' });
  }

  try {
    await pool.query(`INSERT INTO clients (user_identifier, full_name, phone, email) VALUES ($1, $2, $3, $4)`, [uid, fullName, phone, email]);
    await pool.query(`DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < NOW()`);

    const existing = await pool.query(
      `SELECT token FROM sessions WHERE user_identifier = $1 AND paid = true AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [uid]
    );

    if (existing.rows.length > 0) {
      return res.json({ token: existing.rows[0].token });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (token, paid, expires_at, user_identifier, user_agent, ip_address) VALUES ($1, true, $2, $3, $4, $5)`,
      [token, expiresAt, uid, userAgent, ip]
    );

    return res.json({ token });
  } catch (err) {
    console.error('❌ שגיאה בטופס פתיחת סשן:', err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});

app.post('/webhook/payment', async (req, res) => {
  const { token, amount = 84.90, method = 'unknown', status = 'success', note = 'תשלום חיצוני' } = req.body;

  if (!token) return res.status(400).send('❌ חסר טוקן');

  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(`UPDATE sessions SET paid = true, expires_at = $2 WHERE token = $1`, [token, expiresAt]);
    await pool.query(`INSERT INTO history (token, amount, method, status, note) VALUES ($1, $2, $3, $4, $5)`, [token, amount, method, status, note]);

    console.log(`💸 תשלום אושר בטוקן: ${token}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ שגיאה ב־Webhook:', err);
    res.status(500).send('⚠️ שגיאה בשרת');
  }
});

app.post('/mark-paid', async (req, res) => {
  const token = req.body.token;

  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(`UPDATE sessions SET paid = true, expires_at = $2 WHERE token = $1`, [token, expiresAt]);
    await pool.query(`INSERT INTO history (token, amount, method, status, note) VALUES ($1, $2, $3, $4, $5)`, [token, 84.90, 'bit', 'success', 'תשלום ידני אושר']);

    res.redirect(`/chat.html?token=${token}`);
  } catch (err) {
    console.error('❌ שגיאה בסימון תשלום:', err);
    res.status(500).send('⚠️ שגיאה בעיבוד התשלום');
  }
});

app.get('/validate-token', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ valid: false, reason: 'missing_token' });

  try {
    const result = await pool.query(`SELECT paid, expires_at FROM sessions WHERE token = $1`, [token]);

    if (result.rows.length === 0) return res.json({ valid: false, reason: 'not_found' });

    const { paid, expires_at } = result.rows[0];
    if (!paid) return res.json({ valid: false, reason: 'not_paid' });
    if (!expires_at || new Date(expires_at) < new Date()) return res.json({ valid: false, reason: 'expired' });

    return res.json({ valid: true, expires_at });
  } catch (err) {
    console.error('❌ שגיאה בבדיקת טוקן:', err);
    res.status(500).json({ valid: false, reason: 'server_error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit-contact', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await pool.query(`INSERT INTO contacts (name, email, message, date) VALUES ($1, $2, $3, NOW())`, [name, email, message]);
    res.redirect('/thank_you.html');
  } catch (err) {
    console.error('❌ שגיאה בשמירת טופס:', err);
    res.status(500).send('⚠️ שגיאה בשמירת הפנייה.');
  }
});

app.get('/admin-contacts', async (req, res) => {
  if (req.query.pass !== '1234admin') return res.status(401).send('⛔ אין גישה');
  try {
    const { rows } = await pool.query('SELECT * FROM contacts ORDER BY date DESC');
    let html = `<h1>📬 הודעות שהתקבלו</h1><ul>`;
    rows.forEach((c, i) => {
      html += `<li><strong>#${i + 1}</strong><br>שם: ${c.name}<br>אימייל: ${c.email}<br>הודעה: ${c.message}<br><small>${c.date}</small><hr></li>`;
    });
    html += `</ul><a href="/">חזרה</a>`;
    res.send(html);
  } catch (err) {
    console.error('❌ שגיאה בשליפת טפסים:', err);
    res.status(500).send('⚠️ שגיאה בשרת');
  }
});

app.listen(PORT, () => {
  console.log(`✅ שרת פעיל על פורט ${PORT}`);
});
