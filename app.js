const express = require('express');
const db = require('./db');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static('public'));

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

app.get('/api/roles', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Role_a ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения ролей' });
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});