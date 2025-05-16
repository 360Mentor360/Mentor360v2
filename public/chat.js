document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const timerElement = document.getElementById('session-timer');

  const mainMenu = [
    '🔋 בעיית סוללה',
    '🔌 המלגזה לא נדלקת',
    '🔊 צפצוף מוזר',
    '💧 נזילת שמן',
    '🛠️ בעיית בלמים',
    '⚙️ בעיית הילוכים',
    '🛞 בעיה בגלגלים',
    '🔥 התחממות מנוע',
    '💡 בעיית תאורה',
    '🧯 בעיית בטיחות',
    '🔧 רעידות בזמן נסיעה',
    '🛡️ בעיית מערכת חשמלית',
    '🛜 בעיית סנסורים',
    '🚪 בעיה בפתיחת דלתות',
    '🧰 צורך בטיפול תקופתי',
    '🛑 בעיית חיישני קרבה',
    '🛢️ בעיית שמן הידראולי',
    '🔋 בעיית טעינה במטען',
    '💻 בעיית בקר אלקטרוני'
  ];

  const problemSolutions = {
    '🔋 בעיית סוללה': ['בדוק חיבורים 🔌', 'מדוד מתח סוללה 🔋', 'החלף סוללה 🔁'],
    '🔌 המלגזה לא נדלקת': ['בדוק מפתח התנעה 🔑', 'בדוק פיוזים 🔥', 'בדוק סוללה 🔋'],
    '🔊 צפצוף מוזר': ['בדוק מערכת בטיחות 🛡️', 'בדוק אזעקה 🔔', 'פנה לבדיקה מקצועית 🧰'],
    '💧 נזילת שמן': ['אתר מקור נזילה 💧', 'בדוק צינורות הידראוליים 🛠️', 'בדוק מיכל שמן 🔍'],
    '🛠️ בעיית בלמים': ['בדוק רמת שמן בלמים 🛢️', 'בדוק דיסקים ורפידות 🔩', 'פנה למוסך 🔧'],
    '⚙️ בעיית הילוכים': ['בדוק שמן גיר ⚙️', 'אתחל מערכת הילוכים 🔄', 'פנה לבדיקה מעמיקה 🛠️'],
    '🛞 בעיה בגלגלים': ['בדוק לחץ אוויר 🛞', 'בדוק חיבורים לגלגלים 🔩', 'החלף צמיג במקרה הצורך 🔁'],
    '🔥 התחממות מנוע': ['בדוק נוזל קירור ❄️', 'בדוק מאוורר מנוע 🔥', 'עצור מיד להמתנה 🛑'],
    '💡 בעיית תאורה': ['בדוק נורות 🔦', 'בדוק פיוזי תאורה ⚡', 'החלף נורה פגומה 💡'],
    '🧯 בעיית בטיחות': ['בדוק חיישני בטיחות 🧯', 'בדוק בלמים 🛠️', 'עצור לבדיקה מלאה 🛡️'],
    '🔧 רעידות בזמן נסיעה': ['בדוק איזון גלגלים ⚖️', 'בדוק שלמות הצמיגים 🛞', 'פנה לטיפול טכני 🔧'],
    '🛡️ בעיית מערכת חשמלית': ['בדוק פיוזים 🔥', 'בדוק קונקטורים רופפים 🔌', 'פנה לבדיקה מקצועית 🧰'],
    '🛜 בעיית סנסורים': ['בדוק תקשורת עם סנסורים 📡', 'נקה סנסורים 💨', 'פנה לשירות מקצועי 🛠️'],
    '🚪 בעיה בפתיחת דלתות': ['בדוק מנגנון נעילה 🔒', 'בדוק זרם חשמלי לדלתות 🔋', 'שמן את המנעולים 🛢️'],
    '🧰 צורך בטיפול תקופתי': ['בדוק ספר טיפולים 📖', 'פנה לתחזוקה תקופתית 🧰'],
    '🛑 בעיית חיישני קרבה': ['נקה חיישנים 📡', 'בדוק חיבורי חיישנים 🔌', 'פנה לשירות מקצועי 🔧'],
    '🛢️ בעיית שמן הידראולי': ['בדוק רמות שמן 🛢️', 'בדוק דליפות במערכת 🔎', 'פנה לטכנאי 🧰'],
    '🔋 בעיית טעינה במטען': ['בדוק יציאת חשמל 🔌', 'בדוק כבל טעינה 🔋', 'נסה מטען אחר 🔄'],
    '💻 בעיית בקר אלקטרוני': ['אתחל מערכת 💻', 'בדוק חיבורים חשמליים 🔌', 'פנה לבדיקה מקצועית 🛠️']
  };

  function showMenu(options, backTo = null) {
    chatContainer.innerHTML = '';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'chat-button';
      btn.textContent = option;
      btn.onclick = () => handleOption(option);
      chatContainer.appendChild(btn);
    });
    if (backTo) {
      const backBtn = document.createElement('button');
      backBtn.className = 'chat-button back-button';
      backBtn.textContent = '🔙 חזור';
      backBtn.onclick = () => showMenu(backTo);
      chatContainer.appendChild(backBtn);
    }
  }

  function handleOption(option) {
    if (problemSolutions[option]) {
      showMenu(problemSolutions[option], mainMenu);
    } else {
      chatContainer.innerHTML = `<p>🧠 ניתוח הבעיה: ${option}</p>`;
      const backBtn = document.createElement('button');
      backBtn.className = 'chat-button back-button';
      backBtn.textContent = '🔙 חזור';
      backBtn.onclick = () => showMenu(mainMenu);
      chatContainer.appendChild(backBtn);
    }
  }

  showMenu(mainMenu);

  // טיימר סשן
  let remainingTime = 60 * 60; // 60 דקות
  let fiveMinuteWarningShown = false;

  function updateTimer() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerElement.textContent = `⏳ זמן סשן נותר: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    remainingTime--;

    if (remainingTime === 5 * 60 && !fiveMinuteWarningShown) {
      alert("⏰ נותרו רק 5 דקות לסיום הסשן שלך!");
      fiveMinuteWarningShown = true;
    }

    if (remainingTime < 0) {
      window.location.href = "expired.html";
    }
  }

  setInterval(updateTimer, 1000);
});
