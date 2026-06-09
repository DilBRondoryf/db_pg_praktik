const express = require('express');
const db = require('./db');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// Регистрация (роль всегда 22)
app.post('/api/register', async (req, res) => {
  const { login, password, fio, email, phone, date_of_birth } = req.body;
  
  try {
    const checkUser = await db.query(
      'SELECT * FROM User_a WHERE login = $1 OR email = $2',
      [login, email]
    );
    
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    const result = await db.query(
      `INSERT INTO User_a (login, password, fio, email, phone, role_id, date_of_birth) 
       VALUES ($1, $2, $3, $4, $5, 22, $6) 
       RETURNING id, login, fio, email, phone, date_of_birth`,
      [login, password, fio, email, phone, date_of_birth || null]
    );
    
    res.status(201).json({ message: 'Регистрация успешна' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход для пользователей
app.post('/api/login', async (req, res) => {
  const { login, password } = req.body;
  
  try {
    const result = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM User_a u 
       JOIN Role_a r ON u.role_id = r.id 
       WHERE u.login = $1 AND u.password = $2`,
      [login, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    const user = result.rows[0];
    delete user.password;
    
    res.json({ message: 'Вход успешен', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход для администратора
app.post('/api/admin/login', async (req, res) => {
  const { login, password } = req.body;
  
  if (login === 'Admin26' && password === 'Demo20') {
    res.json({ 
      message: 'Вход в админ-панель успешен', 
      admin: { login: 'Admin26', role: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль администратора' });
  }
});

// Получение списка транспорта
app.get('/api/transport', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Transport ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения транспорта' });
  }
});

// Создание заявки (статус "Ожидает подтверждения")
app.post('/api/applications', async (req, res) => {
  const { user_id, transport_id, methods_of_payment, start_time } = req.body;
  
  try {
    const result = await db.query(
      `INSERT INTO applications (status, user_id, methods_of_payment, start_time, torasport_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      ['Ожидает подтверждения', user_id, methods_of_payment, start_time, transport_id]
    );
    
    res.status(201).json({ message: 'Заявка успешно создана', application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания заявки' });
  }
});

// Получение всех заявок (для администратора)
app.get('/api/admin/applications', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, t.name as transport_name, u.fio as user_name, u.login as user_login
       FROM applications a 
       JOIN Transport t ON a.torasport_id = t.id
       JOIN User_a u ON a.user_id = u.id
       ORDER BY a.start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// Получение заявок пользователя
app.get('/api/applications/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.query(
      `SELECT a.*, t.name as transport_name 
       FROM applications a 
       JOIN Transport t ON a.torasport_id = t.id 
       WHERE a.user_id = $1 
       ORDER BY a.start_time DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// Обновление статуса заявки (для администратора)
app.put('/api/admin/applications/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Проверка допустимых статусов
  const validStatuses = ['Ожидает подтверждения', 'Выполняется', 'Завершена'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }
  
  try {
    const result = await db.query(
      `UPDATE applications SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    
    res.json({ message: 'Статус обновлен', application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// Получение ролей
app.get('/api/roles', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Role_a ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения ролей' });
  }
});

// Страницы
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/applications', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'applications.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Доступные страницы:');
  console.log('  - Пользователь: http://localhost:3000/login');
  console.log('  - Админ панель: http://localhost:3000/admin/login');
});