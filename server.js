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

// יצירת טוקן ייחודי
function generateToken() {
  return crypto.randomBytes(12).toString('hex');
}

// יצירת סשן חדש
app.get('/start-session', async (req, res) => {
  const token = generateToken();
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // שעה קדימה

  try {
    await pool.query(
      `INSERT INTO sessions (token, created_at, paid, expires_at, user_agent, ip_address)
       VALUES ($1, $2, false, $3, $4, $5)`,
      [token, createdAt, expiresAt, req.headers['user-agent'], req.ip]
    );
    console.log(`✅ סשן חדש נוצר: ${token}`);
    res.redirect(`/chat.html?token=${token}`);
  } catch (err) {
    console.error('❌ שגיאה ביצירת סשן:', err);
    res.status(500).send('⚠️ שגיאה בשרת');
  }
});

// אימות טוקן בגישה לצ'אט
app.get('/validate-token', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ valid: false });

  try {
    const result = await pool.query(
      `SELECT * FROM sessions WHERE token = $1 AND paid = true AND expires_at > NOW()`,
      [token]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch (err) {
    console.error('❌ שגיאה בבדיקת טוקן:', err);
    res.status(500).json({ valid: false });
  }
});

// סימון תשלום והוספה להיסטוריה
app.post('/mark-paid', async (req, res) => {
  const token = req.body.token;

  try {
    await pool.query(`UPDATE sessions SET paid = true WHERE token = $1`, [token]);

    await pool.query(`
      INSERT INTO history (token, amount, method, status, note)
      VALUES ($1, $2, $3, $4, $5)
    `, [token, 84.90, 'bit', 'success', 'תשלום ידני אושר']);

    res.redirect(`/chat.html?token=${token}`);
  } catch (err) {
    console.error('❌ שגיאה בסימון תשלום:', err);
    res.status(500).send('⚠️ שגיאה בעיבוד התשלום');
  }
});

// דף הבית
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// שליחת טופס צור קשר
app.post('/submit-contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await pool.query(
      'INSERT INTO contacts (name, email, message, date) VALUES ($1, $2, $3, NOW())',
      [name, email, message]
    );
    res.redirect('/thank_you.html');
  } catch (err) {
    console.error('❌ שגיאה בשמירה למסד:', err);
    res.status(500).send('⚠️ שגיאה בשמירת הפנייה.');
  }
});

// עמוד ניהול טפסים
app.get('/admin-contacts', async (req, res) => {
  const pass = req.query.pass;
  if (pass !== '1234admin') return res.status(401).send('⛔ אין גישה');

  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY date DESC');
    const list = result.rows;

    let html = `<h1>📬 הודעות שהתקבלו</h1><ul>`;
    list.forEach((c, i) => {
      html += `<li><strong>#${i + 1}</strong><br>שם: ${c.name}<br>אימייל: ${c.email}<br>הודעה: ${c.message}<br><small>${c.date}</small><hr></li>`;
    });
    html += `</ul><a href="/">חזרה</a>`;

    res.send(html);
  } catch (err) {
    console.error('❌ שגיאה בשליפת נתונים:', err);
    res.status(500).send('⚠️ שגיאה בשרת');
  }
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`✅ שרת פעיל על פורט ${PORT}`);
});
