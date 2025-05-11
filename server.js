const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4242;

const DB_FILE = path.join(__dirname, 'db.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// קריאה מהדאטאבייס
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ sessions: {}, history: {}, contacts: [] }, null, 2));
  }
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

// כתיבה לדאטאבייס
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// יצירת טוקן ייחודי
function generateToken() {
  return crypto.randomBytes(12).toString('hex');
}

// יצירת סשן חדש (ללא תשלום)
app.get('/start-session', (req, res) => {
  const db = readDB();
  const token = generateToken();
  const createdAt = new Date().toISOString();

  db.sessions[token] = { createdAt };
  db.history[token] = { createdAt, paid: false };
  writeDB(db);

  console.log(`✅ סשן חדש נוצר: ${token}`);
  res.redirect(`/chat.html?token=${token}`);
});

// דף הבית
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// שליחת טופס צור קשר עם הפניה לדף תודה
app.post('/submit-contact', (req, res) => {
  const { name, email, message } = req.body;
  const db = readDB();

  if (!db.contacts) db.contacts = [];

  db.contacts.push({
    name,
    email,
    message,
    date: new Date().toISOString()
  });

  writeDB(db);

  // הפנייה לדף תודה
  res.redirect('/thank_you.html');
});

// עמוד ניהול של טפסים עם סיסמה
app.get('/admin-contacts', (req, res) => {
  const pass = req.query.pass;
  if (pass !== '1234admin') return res.status(401).send('⛔ אין גישה');

  const db = readDB();
  const list = db.contacts || [];

  let html = `<h1>📬 הודעות שהתקבלו</h1><ul>`;
  list.forEach((c, i) => {
    html += `<li><strong>#${i + 1}</strong><br>שם: ${c.name}<br>אימייל: ${c.email}<br>הודעה: ${c.message}<br><small>${c.date}</small><hr></li>`;
  });
  html += `</ul><a href="/">חזרה</a>`;

  res.send(html);
});

// הרצת השרת
app.listen(PORT, () => {
  console.log(`✅ שרת פעיל על פורט ${PORT}`);
});
