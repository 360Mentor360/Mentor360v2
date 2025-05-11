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

// יצירת סשן חדש (ללא תשלום)
app.get('/start-session', (req, res) => {
  const token = generateToken();
  const createdAt = new Date().toISOString();

  pool.query(
    'INSERT INTO sessions (token, created_at, paid) VALUES ($1, $2, false)',
    [token, createdAt]
  ).then(() => {
    console.log(`✅ סשן חדש נוצר: ${token}`);
    res.redirect(`/chat.html?token=${token}`);
  }).catch(err => {
    console.error('שגיאה ביצירת סשן:', err);
    res.status(500).send('שגיאה בשרת');
  });
});

// דף הבית
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// שליחת טופס צור קשר עם הפניה לדף תודה
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

// עמוד ניהול של טפסים עם סיסמה
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
    console.error('❌ שגיאה בשליפת נתונים מהמסד:', err);
    res.status(500).send('⚠️ שגיאה בשרת');
  }
});

// הרצת השרת
app.listen(PORT, () => {
  console.log(`✅ שרת פעיל על פורט ${PORT}`);
});
